import { useMemo, useState } from "react";
import { Sparkles, TrendingUp, TrendingDown, Minus, CalendarClock, AlertTriangle } from "lucide-react";
import { useMinhasTransacoes } from "@/lib/store";
import { gerarPrevisao } from "@/lib/utils";
import { brl, dataBR } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { AnaliseHeader, StatTile, Recomendacoes } from "@/components/analytics";
import { ForecastChart } from "@/components/AnalyticsCharts";

const PERIODOS = [30, 60, 90] as const;

export default function Previsao() {
  const txs = useMinhasTransacoes();
  const [dias, setDias] = useState<number>(90);
  const previsao = useMemo(() => gerarPrevisao(txs, dias), [txs, dias]);

  const TendIcon = previsao.tendencia === "alta" ? TrendingUp : previsao.tendencia === "queda" ? TrendingDown : Minus;
  const tendTone = previsao.tendencia === "alta" ? "pos" : previsao.tendencia === "queda" ? "crit" : "blue";

  return (
    <div>
      <AnaliseHeader
        tone="blue"
        icon={<Sparkles size={22} />}
        titulo="Previsão de Fluxo"
        descricao="Projeção de saldo com intervalo de confiança, a partir do seu histórico."
        action={
          <div className="flex rounded-full border border-line bg-surface p-1">
            {PERIODOS.map((p) => (
              <button
                key={p}
                onClick={() => setDias(p)}
                className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${dias === p ? "bg-blue text-white" : "text-fg-muted hover:text-fg"}`}
              >
                {p} dias
              </button>
            ))}
          </div>
        }
      />

      {txs.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={30} />}
          title="Sem histórico para projetar"
          desc="Lance suas primeiras receitas e despesas em Transações. Com alguns dias de dados, a previsão aparece aqui."
        />
      ) : (
        <>
          <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StaggerItem><StatTile label="Saldo hoje" value={previsao.saldo_inicial} format={brl} tone="blue" /></StaggerItem>
            <StaggerItem><StatTile label={`Saldo em ${dias}d (esperado)`} value={previsao.saldo_final_esperado} format={brl} tone={previsao.saldo_final_esperado >= previsao.saldo_inicial ? "pos" : "crit"} /></StaggerItem>
            <StaggerItem>
              <div className="rounded-lg border border-line bg-surface p-4 shadow-kronos">
                <span className="text-[12px] text-fg-muted">Tendência</span>
                <div className={`mt-2 flex items-center gap-2 font-serif-display text-[21px] font-bold capitalize text-${tendTone === "blue" ? "fg" : tendTone}`}>
                  <TendIcon size={20} /> {previsao.tendencia}
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="rounded-lg border border-line bg-surface p-4 shadow-kronos">
                <span className="text-[12px] text-fg-muted">Alerta de saldo negativo</span>
                <div className="mt-2 font-serif-display text-[18px] font-bold">
                  {previsao.dia_saldo_negativo ? <span className="text-crit">{dataBR(previsao.dia_saldo_negativo)}</span> : <span className="text-pos">Sem risco</span>}
                </div>
              </div>
            </StaggerItem>
          </Stagger>

          <Reveal delay={0.05}>
            <Card className="mt-4 p-5">
              <div className="mb-2 flex items-center gap-2">
                <CalendarClock size={17} className="text-blue-lift" />
                <h3 className="text-[15px] font-semibold">Saldo projetado · próximos {dias} dias</h3>
              </div>
              <ForecastChart pontos={previsao.pontos} saldoInicial={previsao.saldo_inicial} />
            </Card>
          </Reveal>

          {previsao.alertas.length > 0 && (
            <Reveal delay={0.08}>
              <div className="mt-4 flex flex-col gap-2">
                {previsao.alertas.map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-md border border-[color-mix(in_srgb,var(--warn)_40%,var(--line))] bg-[color-mix(in_srgb,var(--warn)_10%,transparent)] px-3.5 py-2.5 text-[13px]">
                    <AlertTriangle size={16} className="flex-none text-warn" /> {a}
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          <Reveal delay={0.1}>
            <Card className="mt-4 p-5">
              <Recomendacoes itens={previsao.recomendacoes} />
            </Card>
          </Reveal>

          <p className="mt-4 text-center text-[11.5px] text-fg-dim">
            Projeção estatística (regressão + sazonalidade semanal). Integração com IA (Claude) prevista para refinar o cenário.
          </p>
        </>
      )}
    </div>
  );
}
