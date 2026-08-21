import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ArrowUpRight, ArrowDownRight, Plus, Minus, Pencil, Trash2, Search, Check, ArrowUpDown } from "lucide-react";
import { useStore, useMinhasTransacoes } from "@/lib/store";
import type { Transacao, TransacaoTipo } from "@/lib/types";
import { Card, Button, Field, Input, Select, Pill, Modal, EmptyState } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { brl, dataBR, hoje, parseReaisToCentavos, uid } from "@/lib/format";

interface TxForm {
  descricao: string;
  valor: string;
  data: string;
  categoria: string;
  status: "pago" | "pendente";
  recorrencia: "unico" | "mensal";
}

type SortKey = "data" | "valor";

export default function Transacoes() {
  const { state, dispatch } = useStore();
  const txs = useMinhasTransacoes();
  const [params, setParams] = useSearchParams();
  const user = state.user!;

  const [modalTipo, setModalTipo] = useState<TransacaoTipo | null>(null);
  const [editing, setEditing] = useState<Transacao | null>(null);
  const [fTipo, setFTipo] = useState<"todos" | TransacaoTipo>("todos");
  const [fCat, setFCat] = useState("todas");
  const [fBusca, setFBusca] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "data", dir: "desc" });

  useEffect(() => {
    const novo = params.get("novo");
    if (novo === "receita" || novo === "despesa") setModalTipo(novo);
    else if (novo === "1") setModalTipo("receita");
    if (novo) {
      params.delete("novo");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categorias = useMemo(() => state.categorias.filter((c) => c.user_id === user.id), [state.categorias, user.id]);

  const filtradas = useMemo(() => {
    const arr = txs
      .filter((t) => (fTipo === "todos" ? true : t.tipo === fTipo))
      .filter((t) => (fCat === "todas" ? true : t.categoria === fCat))
      .filter((t) => (fBusca ? t.descricao.toLowerCase().includes(fBusca.toLowerCase()) : true));
    arr.sort((a, b) => {
      let cmp = 0;
      if (sort.key === "data") cmp = a.data < b.data ? -1 : a.data > b.data ? 1 : 0;
      else cmp = a.valor_centavos - b.valor_centavos;
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [txs, fTipo, fCat, fBusca, sort]);

  const totalReceita = filtradas.filter((t) => t.tipo === "receita").reduce((a, b) => a + b.valor_centavos, 0);
  const totalDespesa = filtradas.filter((t) => t.tipo === "despesa").reduce((a, b) => a + b.valor_centavos, 0);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }
  function abrirEdicao(t: Transacao) {
    setEditing(t);
    setModalTipo(t.tipo);
  }
  function fechar() {
    setModalTipo(null);
    setEditing(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-[24px] font-bold">Transações</h1>
          <p className="text-[13px] text-fg-muted">Lance, filtre e acompanhe cada entrada e saída.</p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="ghost" onClick={() => { setEditing(null); setModalTipo("despesa"); }}>
            <Minus size={16} /> Despesa
          </Button>
          <Button onClick={() => { setEditing(null); setModalTipo("receita"); }}>
            <Plus size={16} /> Receita
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-[12px] text-fg-muted">Receitas (filtro)</div>
          <div className="mt-1 font-serif-display text-[20px] font-bold text-pos tnum">{brl(totalReceita)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[12px] text-fg-muted">Despesas (filtro)</div>
          <div className="mt-1 font-serif-display text-[20px] font-bold text-crit tnum">{brl(totalDespesa)}</div>
        </Card>
        <Card className="col-span-2 p-4 sm:col-span-1">
          <div className="text-[12px] text-fg-muted">Resultado</div>
          <div className={`mt-1 font-serif-display text-[20px] font-bold tnum ${totalReceita - totalDespesa >= 0 ? "text-pos" : "text-crit"}`}>
            {brl(totalReceita - totalDespesa)}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
            <Input placeholder="Buscar descrição..." value={fBusca} onChange={(e) => setFBusca(e.target.value)} className="pl-9" />
          </div>
          <Select value={fTipo} onChange={(e) => setFTipo(e.target.value as typeof fTipo)}>
            <option value="todos">Todos os tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </Select>
          <Select value={fCat} onChange={(e) => setFCat(e.target.value)}>
            <option value="todas">Todas categorias</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.nome}>
                {c.nome}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Reveal delay={0.05}>
        <Card className="mt-4">
          {filtradas.length === 0 ? (
            <EmptyState
              title="Nenhuma transação encontrada"
              desc="Ajuste os filtros ou registre uma nova receita/despesa."
              action={<Button onClick={() => setModalTipo("receita")}><Plus size={16} /> Nova receita</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" style={{ minWidth: 620 }}>
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wide text-fg-dim">
                    <th className="px-4 py-3 text-left font-semibold">Descrição</th>
                    <th className="px-4 py-3 text-left font-semibold">
                      <button onClick={() => toggleSort("data")} className="inline-flex items-center gap-1 hover:text-fg">
                        Data <ArrowUpDown size={12} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">Categoria</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      <button onClick={() => toggleSort("valor")} className="inline-flex items-center gap-1 hover:text-fg">
                        Valor <ArrowUpDown size={12} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((t) => (
                    <tr key={t.id} className="border-b border-line-soft transition hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`grid h-7 w-7 place-items-center rounded-md ${t.tipo === "receita" ? "bg-[color-mix(in_srgb,var(--pos)_14%,transparent)] text-pos" : "bg-[color-mix(in_srgb,var(--crit)_12%,transparent)] text-crit"}`}>
                            {t.tipo === "receita" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          </span>
                          <div>
                            <div className="font-medium">{t.descricao}</div>
                            {t.recorrencia === "mensal" && <div className="text-[11px] text-fg-dim">Recorrente · mensal</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 tnum text-fg-muted">{dataBR(t.data)}</td>
                      <td className="px-4 py-3 text-fg-muted">{t.categoria}</td>
                      <td className={`px-4 py-3 text-right font-semibold tnum ${t.tipo === "receita" ? "text-pos" : "text-crit"}`}>
                        {t.tipo === "receita" ? "+" : "−"} {brl(t.valor_centavos, false)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => dispatch({ type: "UPDATE_TX", id: t.id, patch: { status: t.status === "pago" ? "pendente" : "pago" } })} title="Alternar status">
                          <Pill tone={t.status === "pago" ? "pos" : "warn"}>{t.status}</Pill>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => abrirEdicao(t)} className="grid h-8 w-8 place-items-center rounded-md text-fg-dim transition hover:bg-surface hover:text-blue-lift" aria-label="Editar">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => { if (confirm("Excluir esta transação?")) dispatch({ type: "DELETE_TX", id: t.id }); }} className="grid h-8 w-8 place-items-center rounded-md text-fg-dim transition hover:bg-surface hover:text-crit" aria-label="Excluir">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Reveal>

      {modalTipo && (
        <TxModal
          tipo={modalTipo}
          editing={editing}
          categorias={categorias.filter((c) => c.tipo === modalTipo).map((c) => c.nome)}
          onClose={fechar}
          onSave={(data) => {
            if (editing) {
              dispatch({
                type: "UPDATE_TX",
                id: editing.id,
                patch: {
                  descricao: data.descricao,
                  valor_centavos: parseReaisToCentavos(data.valor),
                  data: data.data,
                  categoria: data.categoria,
                  status: data.status,
                  recorrencia: data.recorrencia,
                },
              });
            } else {
              const tx: Transacao = {
                id: uid(),
                user_id: user.id,
                tipo: modalTipo,
                descricao: data.descricao,
                valor_centavos: parseReaisToCentavos(data.valor),
                data: data.data,
                categoria: data.categoria,
                cliente_id: null,
                recorrencia: data.recorrencia,
                comprovante_url: null,
                status: data.status,
                tags: [],
                created_at: new Date().toISOString(),
              };
              dispatch({ type: "ADD_TX", tx });
            }
            fechar();
          }}
        />
      )}
    </div>
  );
}

function TxModal({
  tipo,
  editing,
  categorias,
  onClose,
  onSave,
}: {
  tipo: TransacaoTipo;
  editing: Transacao | null;
  categorias: string[];
  onClose: () => void;
  onSave: (d: TxForm) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TxForm>({
    defaultValues: editing
      ? {
          descricao: editing.descricao,
          valor: (editing.valor_centavos / 100).toFixed(2).replace(".", ","),
          data: editing.data,
          categoria: editing.categoria,
          status: editing.status,
          recorrencia: editing.recorrencia,
        }
      : { data: hoje(), status: "pago", recorrencia: "unico", categoria: categorias[0] },
  });

  const titulo = `${editing ? "Editar" : "Nova"} ${tipo === "receita" ? "receita" : "despesa"}`;

  return (
    <Modal open onClose={onClose} title={titulo}>
      <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-4" noValidate>
        <Field label="Descrição" required error={errors.descricao?.message}>
          <Input placeholder={tipo === "receita" ? "Corte + barba" : "Compra de insumos"} {...register("descricao", { required: "Informe a descrição" })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor (R$)" required error={errors.valor?.message}>
            <Input inputMode="decimal" placeholder="0,00" {...register("valor", { required: "Informe o valor" })} />
          </Field>
          <Field label="Data" required>
            <Input type="date" {...register("data", { required: true })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoria" required>
            <Select {...register("categoria", { required: true })}>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Recorrência">
            <Select {...register("recorrencia")}>
              <option value="unico">Único</option>
              <option value="mensal">Mensal</option>
            </Select>
          </Field>
        </div>
        <Field label="Status">
          <Select {...register("status")}>
            <option value="pago">Pago</option>
            <option value="pendente">Pendente</option>
          </Select>
        </Field>
        <div className="mt-2 flex justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            <Check size={16} /> {editing ? "Salvar" : "Adicionar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
