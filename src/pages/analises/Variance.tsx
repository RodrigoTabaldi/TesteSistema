import { useMemo } from "react";
import { SearchCheck, ArrowUp, ArrowDown } from "lucide-react";
import { useMinhasTransacoes } from "@/lib/store";
import { varianceUltimosMeses } from "@/lib/utils";
import { brl } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { AnaliseHeader, StatTile, Recomendacoes } from "@/components/analytics";
import { WaterfallChart } from "@/components/AnalyticsCharts";

export default function Variance() {
  const txs = useMinhasTransacoes();
  const res = useMemo(() => varianceUltimosMeses(txs), [txs]);

  if (!res) {
    return (
      <div>
        <AnaliseHeader tone="gold" icon={<SearchCheck size={22} />} titulo="Análise de Variance" descricao="O que fez o lucro mudar entre um mês e outro." />
        <EmptyState icon={<SearchCheck size={30} />} title="Precisa de pelo menos 2 meses" desc="Assim que houver lançamentos em dois meses diferentes, mostramos exatamente o que puxou o lucro para cima ou para baixo." />
      </div>
    );
  }

  const subiu = res.delta_lucro >= 0;
  return (
    <div>
      <AnaliseHeader tone="gold" icon={<SearchCheck size={22} />} titulo="Análise de Variance" descricao="Decomposição do que fez o lucro mudar mês a mês." />

      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StaggerItem><StatTile label="Lucro anterior" value={res.lucro_anterior} format={brl} tone="blue" /></StaggerItem>
        <StaggerItem><StatTile label="Lucro atual" value={res.lucro_atual} format={brl} tone={res.lucro_atual >= 0 ? "pos" : "crit"} /></StaggerItem>
        <StaggerItem>
          <div className="rounded-lg border border-line bg-surface p-4 shadow-kronos">
            <span className="text-[12px] text-fg-muted">Variação</span>
            <div className={`mt-2 flex items-center gap-1.5 font-serif-display text-[21px] font-bold ${subiu ? "text-pos" : "text-crit"}`}>
              {subiu ? <ArrowUp size={19} /> : <ArrowDown size={19} />} {res.delta_pct.toFixed(1)}%
            </div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="rounded-lg border border-line bg-surface p-4 shadow-kronos">
            <span className="text-[12px] text-fg-muted">Principal causa</span>
            <div className="mt-2 font-serif-display text-[16px] font-bold leading-tight">{res.culpado}</div>
          </div>
        </StaggerItem>
      </Stagger>

      <Reveal delay={0.05}>
        <Card className="mt-4 p-5">
          <h3 className="mb-2 text-[15px] font-semibold">Ponte do lucro (anterior → atual)</h3>
          <WaterfallChart
            passos={[
              { label: "Lucro anterior", delta: res.lucro_anterior },
              { label: "Efeito receita", delta: res.efeito_receita },
              { label: "Efeito despesa", delta: res.efeito_despesa },
              { label: "Lucro atual", delta: res.lucro_atual, total: true },
            ]}
          />
        </Card>
      </Reveal>

      <Reveal delay={0.1}>
        <Card className="mt-4 p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Drilldown por categoria</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]" style={{ minWidth: 440 }}>
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-fg-dim">
                  <th className="px-2 py-2.5 text-left font-semibold">Item</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Anterior</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Atual</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Δ</th>
                </tr>
              </thead>
              <tbody>
                {res.drilldown.slice(0, 12).map((d) => (
                  <tr key={d.nome} className="border-b border-line-soft">
                    <td className="px-2 py-2.5 font-medium">{d.nome}</td>
                    <td className="px-2 py-2.5 text-right tnum text-fg-muted">{brl(d.anterior)}</td>
                    <td className="px-2 py-2.5 text-right tnum text-fg-muted">{brl(d.atual)}</td>
                    <td className={`px-2 py-2.5 text-right tnum font-semibold ${d.delta >= 0 ? "text-pos" : "text-crit"}`}>{d.delta >= 0 ? "+" : ""}{brl(d.delta, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={0.12}>
        <Card className="mt-4 p-5">
          <Recomendacoes itens={res.recomendacoes} />
        </Card>
      </Reveal>
    </div>
  );
}
