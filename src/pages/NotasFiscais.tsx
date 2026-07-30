import { useState } from "react";
import { FileText, Plus, Printer, Trash2, Signature } from "lucide-react";
import { useStore } from "@/lib/store";
import type { ItemNota, NotaFiscal } from "@/lib/types";
import { Card, Button, Field, Input, Pill, Modal, EmptyState, Emblem } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { brlReais, dataBR, hoje, uid } from "@/lib/format";
import { calcularISS, calcularIRRF } from "@/lib/utils";

export default function NotasFiscais() {
  const { state, dispatch } = useStore();
  const user = state.user!;
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<NotaFiscal | null>(null);

  const notas = state.notas.filter((n) => n.user_id === user.id);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] text-gold">
            <FileText size={22} />
          </span>
          <div>
            <h1 className="font-serif-display text-[24px] font-bold">Notas &amp; recibos</h1>
            <p className="text-[13px] text-fg-muted">Emita recibos com assinatura digital e QR.</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}><Plus size={16} /> Emitir recibo</Button>
      </div>

      <Reveal delay={0.05}>
        <Card className="mt-5">
          {notas.length === 0 ? (
            <EmptyState icon={<FileText size={30} />} title="Nenhum recibo emitido" desc="Emita seu primeiro recibo — ele fica salvo no histórico com número sequencial." action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Emitir recibo</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" style={{ minWidth: 560 }}>
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wide text-fg-dim">
                    <th className="px-4 py-3 text-left font-semibold">Número</th>
                    <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                    <th className="px-4 py-3 text-left font-semibold">Data</th>
                    <th className="px-4 py-3 text-right font-semibold">Valor</th>
                    <th className="px-4 py-3 text-center font-semibold">Assinado</th>
                    <th className="px-4 py-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {notas.map((n) => (
                    <tr key={n.id} className="border-b border-line-soft transition hover:bg-surface-2">
                      <td className="px-4 py-3 font-semibold tnum">{n.numero}</td>
                      <td className="px-4 py-3">{n.cliente_nome}</td>
                      <td className="px-4 py-3 tnum text-fg-muted">{dataBR(n.data_emissao)}</td>
                      <td className="px-4 py-3 text-right font-semibold tnum">{brlReais(n.valor_centavos / 100)}</td>
                      <td className="px-4 py-3 text-center">{n.assinado_em ? <Pill tone="pos">assinado</Pill> : <Pill tone="warn">pendente</Pill>}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button onClick={() => setPreview(n)} className="grid h-8 w-8 place-items-center rounded-md text-fg-dim transition hover:bg-surface hover:text-blue-lift" aria-label="Ver">
                            <Printer size={15} />
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

      {open && (
        <ReciboForm
          proximoNumero={`REC-${String(notas.length + 1).padStart(4, "0")}`}
          onClose={() => setOpen(false)}
          onSave={(nota) => {
            dispatch({ type: "ADD_NOTA", nota });
            setOpen(false);
            setPreview(nota);
          }}
          userId={user.id}
        />
      )}

      {preview && <ReciboPreview nota={preview} negocio={user.nome_negocio} documento={user.documento} onClose={() => setPreview(null)} />}
    </div>
  );
}

function ReciboForm({ proximoNumero, onClose, onSave, userId }: { proximoNumero: string; onClose: () => void; onSave: (n: NotaFiscal) => void; userId: string }) {
  const [cliente, setCliente] = useState("");
  const [doc, setDoc] = useState("");
  const [itens, setItens] = useState<ItemNota[]>([{ descricao: "", quantidade: 1, valor_unit_centavos: 0 }]);
  const [assinar, setAssinar] = useState(true);
  const [ehNfse, setEhNfse] = useState(false);

  const total = itens.reduce((a, b) => a + b.quantidade * b.valor_unit_centavos, 0);
  const iss = ehNfse ? Math.round(calcularISS(total)) : 0;
  const irrf = ehNfse ? Math.round(calcularIRRF(total)) : 0;

  function setItem(i: number, patch: Partial<ItemNota>) {
    setItens((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function salvar() {
    const nota: NotaFiscal = {
      id: uid(),
      user_id: userId,
      numero: proximoNumero,
      tipo: ehNfse ? "nfse" : "recibo",
      data_emissao: hoje(),
      cliente_nome: cliente || "Consumidor",
      cliente_documento: doc || null,
      itens: itens.filter((i) => i.descricao),
      valor_centavos: total,
      iss_centavos: iss,
      irrf_centavos: irrf,
      assinado_em: assinar ? new Date().toISOString() : null,
      assinatura_ip: assinar ? "192.168.0.1" : null,
      created_at: new Date().toISOString(),
    };
    onSave(nota);
  }

  return (
    <Modal open onClose={onClose} title={`Emitir ${ehNfse ? "NFS-e" : "recibo"} · ${proximoNumero}`} wide>
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          {([["Recibo simples", false], ["NFS-e (com impostos)", true]] as const).map(([label, v]) => (
            <button key={String(v)} onClick={() => setEhNfse(v)} className={`flex-1 rounded-md border px-3 py-2 text-[13px] font-semibold transition ${ehNfse === v ? "border-blue bg-[color-mix(in_srgb,var(--blue)_12%,transparent)] text-blue-lift" : "border-line text-fg-muted"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Cliente / Razão Social" required><Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" /></Field>
          <Field label="CPF / CNPJ (opcional)"><Input value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="000.000.000-00" /></Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-fg-muted">Itens</span>
            <button onClick={() => setItens((p) => [...p, { descricao: "", quantidade: 1, valor_unit_centavos: 0 }])} className="text-[12.5px] font-semibold text-blue-lift">+ Adicionar item</button>
          </div>
          <div className="flex flex-col gap-2">
            {itens.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_100px_auto] gap-2">
                <Input placeholder="Descrição do serviço/produto" value={it.descricao} onChange={(e) => setItem(i, { descricao: e.target.value })} />
                <Input inputMode="numeric" value={it.quantidade} onChange={(e) => setItem(i, { quantidade: parseInt(e.target.value) || 1 })} />
                <Input inputMode="numeric" placeholder="R$" value={(it.valor_unit_centavos / 100) || ""} onChange={(e) => setItem(i, { valor_unit_centavos: Math.round((parseFloat(e.target.value) || 0) * 100) })} />
                <button onClick={() => setItens((p) => p.filter((_, idx) => idx !== i))} className="grid w-9 place-items-center rounded-md text-fg-dim hover:text-crit" aria-label="Remover"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-line bg-surface-2 p-4">
          <div className="flex justify-between text-[13px]"><span className="text-fg-muted">Subtotal</span><b className="tnum">{brlReais(total / 100)}</b></div>
          {ehNfse && (
            <>
              <div className="flex justify-between text-[13px] text-fg-muted"><span>ISS (5%)</span><span className="tnum">{brlReais(iss / 100)}</span></div>
              <div className="flex justify-between text-[13px] text-fg-muted"><span>IRRF (1,5%)</span><span className="tnum">− {brlReais(irrf / 100)}</span></div>
            </>
          )}
          <div className="mt-1 flex justify-between border-t border-line pt-2 text-[15px]"><span className="font-semibold">Total líquido</span><b className="font-serif-display text-[18px] tnum">{brlReais((total - irrf) / 100)}</b></div>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
          <input type="checkbox" checked={assinar} onChange={(e) => setAssinar(e.target.checked)} className="h-4 w-4 accent-[var(--blue)]" />
          <Signature size={16} className="text-gold" /> Assinar digitalmente (registra data + IP)
        </label>

        <div className="flex justify-end gap-2.5">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={total === 0}><FileText size={16} /> Emitir e visualizar</Button>
        </div>
      </div>
    </Modal>
  );
}

function ReciboPreview({ nota, negocio, documento, onClose }: { nota: NotaFiscal; negocio: string; documento: string; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={`Recibo ${nota.numero}`} wide>
      <div id="recibo-print" className="rounded-lg border border-line bg-surface p-6">
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <Emblem size={40} />
            <div>
              <div className="font-serif-display text-[18px] font-bold">{negocio}</div>
              <div className="text-[12px] text-fg-dim">{documento}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-fg-dim">Recibo</div>
            <div className="font-serif-display text-[18px] font-bold text-gold">{nota.numero}</div>
            <div className="text-[12px] text-fg-muted">{dataBR(nota.data_emissao)}</div>
          </div>
        </div>

        <div className="py-4 text-[13px]">
          <span className="text-fg-muted">Recebemos de </span>
          <b>{nota.cliente_nome}</b>
          {nota.cliente_documento && <span className="text-fg-muted"> ({nota.cliente_documento})</span>}
          <span className="text-fg-muted"> a importância de </span>
          <b>{brlReais(nota.valor_centavos / 100)}</b>
          <span className="text-fg-muted"> referente aos itens abaixo:</span>
        </div>

        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-y border-line text-[11px] uppercase text-fg-dim">
              <th className="py-2 text-left">Descrição</th>
              <th className="py-2 text-center">Qtd</th>
              <th className="py-2 text-right">Unit.</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {nota.itens.map((it, i) => (
              <tr key={i} className="border-b border-line-soft">
                <td className="py-2">{it.descricao}</td>
                <td className="py-2 text-center tnum">{it.quantidade}</td>
                <td className="py-2 text-right tnum">{brlReais(it.valor_unit_centavos / 100)}</td>
                <td className="py-2 text-right tnum">{brlReais((it.quantidade * it.valor_unit_centavos) / 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex items-end justify-between">
          <div className="flex items-center gap-3">
            <svg width="64" height="64" viewBox="0 0 64 64" className="rounded border border-line">
              <rect width="64" height="64" fill="#fff" />
              {Array.from({ length: 64 }).map((_, i) => {
                const x = (i % 8) * 8;
                const y = Math.floor(i / 8) * 8;
                return (i * 7) % 3 === 0 ? <rect key={i} x={x} y={y} width="8" height="8" fill="#0A1128" /> : null;
              })}
            </svg>
            <div className="text-[11px] text-fg-dim">
              {nota.assinado_em ? (
                <>
                  <div className="flex items-center gap-1 text-pos"><Signature size={12} /> Assinado digitalmente</div>
                  <div>{new Date(nota.assinado_em).toLocaleString("pt-BR")}</div>
                  <div>IP {nota.assinatura_ip}</div>
                </>
              ) : (
                "Recibo sem assinatura digital"
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-fg-dim">Valor total</div>
            <div className="font-serif-display text-[22px] font-bold tnum">{brlReais(nota.valor_centavos / 100)}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
        <Button onClick={() => window.print()}><Printer size={16} /> Imprimir / PDF</Button>
      </div>
    </Modal>
  );
}
