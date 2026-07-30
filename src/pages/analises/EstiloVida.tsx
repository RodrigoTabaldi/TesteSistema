import { useMemo, useState } from "react";
import { UserRound, Plus, Trash2, Scale } from "lucide-react";
import { useStore, useMinhasTransacoes, useMinhasDespesasPessoais } from "@/lib/store";
import { analiseEstiloVida, serieMensal } from "@/lib/utils";
import { brl, parseReaisToCentavos, uid, hoje } from "@/lib/format";
import { Card, Field, Input, Button, EmptyState } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { AnaliseHeader, StatTile, Recomendacoes } from "@/components/analytics";
import { WaterfallChart } from "@/components/AnalyticsCharts";

export default function EstiloVida() {
  const { state, dispatch } = useStore();
  const txs = useMinhasTransacoes();
  const despesas = useMinhasDespesasPessoais();
  const user = state.user!;

  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");

  const lucroNegocio = useMemo(() => {
    const meses = serieMensal(txs);
    return meses.length ? meses[meses.length - 1].lucro : 0;
  }, [txs]);

  const totalPessoal = despesas.reduce((a, d) => a + d.valor_centavos, 0);
  const res = useMemo(() => analiseEstiloVida(totalPessoal, lucroNegocio), [totalPessoal, lucroNegocio]);

  function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const centavos = parseReaisToCentavos(valor);
    if (!categoria.trim() || centavos <= 0) return;
    dispatch({
      type: "ADD_DESPESA_PESSOAL",
      despesa: { id: uid(), user_id: user.id, categoria: categoria.trim(), valor_centavos: centavos, created_at: hoje() },
    });
    setCategoria("");
    setValor("");
  }

  return (
    <div>
      <AnaliseHeader tone="violet" icon={<UserRound size={22} />} titulo="Meu Estilo de Vida" descricao="Quanto você retira para viver vs. quanto o negócio realmente gera." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <Reveal>
          <Card className="p-5">
            <h3 className="mb-3 text-[15px] font-semibold">Despesas pessoais (mês)</h3>
            <form onSubmit={adicionar} className="flex flex-col gap-3">
              <Field label="Categoria" hint="Ex: aluguel, comida, carro, escola">
                <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Aluguel" />
              </Field>
              <Field label="Valor mensal (R$)">
                <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="1.500,00" />
              </Field>
              <Button type="submit"><Plus size={16} /> Adicionar</Button>
            </form>

            {despesas.length > 0 && (
              <div className="mt-4 flex flex-col gap-1.5">
                {despesas.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border border-line-soft bg-surface-2 px-3 py-2 text-[13px]">
                    <span>{d.categoria}</span>
                    <span className="flex items-center gap-2">
                      <b className="tnum">{brl(d.valor_centavos)}</b>
                      <button onClick={() => dispatch({ type: "DELETE_DESPESA_PESSOAL", id: d.id })} aria-label="Remover" className="text-fg-dim transition hover:text-crit">
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </div>
                ))}
                <div className="mt-1 flex items-center justify-between px-3 text-[13px] font-semibold">
                  <span>Total pessoal</span>
                  <span className="tnum text-crit">{brl(totalPessoal)}</span>
                </div>
              </div>
            )}
          </Card>
        </Reveal>

        <div>
          {despesas.length === 0 ? (
            <EmptyState icon={<Scale size={30} />} title="Adicione suas despesas pessoais" desc="Lance o que você gasta por mês (aluguel, comida, transporte…) para ver se o lucro do negócio cobre seu estilo de vida." />
          ) : (
            <>
              <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StaggerItem><StatTile label="Lucro do negócio" value={res.lucro_negocio} format={brl} tone="pos" /></StaggerItem>
                <StaggerItem><StatTile label="Retiradas pessoais" value={res.despesa_pessoal_total} format={brl} tone="crit" /></StaggerItem>
                <StaggerItem><StatTile label={res.cobre ? "Sobra" : "Déficit"} value={res.gap} format={brl} tone={res.cobre ? "pos" : "crit"} /></StaggerItem>
              </Stagger>

              <Reveal delay={0.05}>
                <Card className="mt-4 p-5">
                  <h3 className="mb-2 text-[15px] font-semibold">Do lucro ao equilíbrio</h3>
                  <WaterfallChart passos={res.passos_equilibrio.map((p, i) => ({ label: p.label, delta: p.delta, total: i === res.passos_equilibrio.length - 1 }))} />
                </Card>
              </Reveal>

              <Reveal delay={0.1}>
                <Card className="mt-4 p-5">
                  <Recomendacoes itens={res.recomendacoes} titulo={res.cobre ? "Próximos passos" : "Como fechar o gap"} />
                </Card>
              </Reveal>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
