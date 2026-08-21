import { useMemo } from "react";
import { Siren, ShieldAlert, TrendingDown } from "lucide-react";
import { useMinhasTransacoes } from "@/lib/store";
import { detectarFuga } from "@/lib/utils";
import { brl } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { AnaliseHeader, StatTile, DificuldadeBadge } from "@/components/analytics";
import type { FugaAnomalia } from "@/lib/types";

const sevTone: Record<FugaAnomalia["severidade"], { cls: string; label: string }> = {
  alta: { cls: "border-[color-mix(in_srgb,var(--crit)_45%,var(--line))] bg-[color-mix(in_srgb,var(--crit)_8%,transparent)]", label: "Alta" },
  media: { cls: "border-[color-mix(in_srgb,var(--warn)_40%,var(--line))] bg-[color-mix(in_srgb,var(--warn)_8%,transparent)]", label: "Média" },
  baixa: { cls: "border-line bg-surface-2", label: "Baixa" },
};

export default function DetectarFuga() {
  const txs = useMinhasTransacoes();
  const anomalias = useMemo(() => detectarFuga(txs), [txs]);
  const economiaTotal = anomalias.reduce((a, x) => a + x.economia_potencial, 0);

  return (
    <div>
      <AnaliseHeader tone="crit" icon={<Siren size={22} />} titulo="Detector de Fuga de Dinheiro" descricao="Anomalias nas despesas: aumentos fora do padrão, categorias vagas e gastos abusivos." />

      {txs.length === 0 ? (
        <EmptyState icon={<ShieldAlert size={30} />} title="Nada para analisar ainda" desc="Cadastre suas despesas ao longo de alguns meses para o detector comparar padrões e achar fugas de dinheiro." />
      ) : anomalias.length === 0 ? (
        <EmptyState icon={<ShieldAlert size={30} />} title="Nenhuma fuga detectada 🎉" desc="Suas despesas estão dentro do padrão histórico. Volte após novos lançamentos para uma nova varredura." />
      ) : (
        <>
          <Stagger className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StaggerItem><StatTile label="Anomalias encontradas" value={anomalias.length} format={(n) => String(Math.round(n))} tone="crit" icon={<ShieldAlert size={16} />} /></StaggerItem>
            <StaggerItem><StatTile label="Economia potencial / mês" value={economiaTotal} format={brl} tone="pos" icon={<TrendingDown size={16} />} /></StaggerItem>
            <StaggerItem><StatTile label="Economia potencial / ano" value={economiaTotal * 12} format={brl} tone="gold" /></StaggerItem>
          </Stagger>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {anomalias.map((a, i) => {
              const sev = sevTone[a.severidade];
              return (
                <Reveal key={a.id} delay={0.04 * i}>
                  <Card className={`border p-4 ${sev.cls}`}>
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[color-mix(in_srgb,var(--crit)_16%,transparent)] text-crit">
                        <Siren size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-[14px] font-semibold">{a.titulo}</h4>
                          <DificuldadeBadge nivel={a.dificuldade} />
                        </div>
                        <p className="mt-1 text-[12.5px] text-fg-muted">{a.descricao}</p>
                        <div className="mt-2.5 flex items-center justify-between border-t border-line-soft pt-2.5">
                          <span className="text-[11.5px] text-fg-dim">Severidade {sev.label} · {a.categoria}</span>
                          <span className="text-[13px] font-semibold text-pos">Economize {brl(a.economia_potencial)}/mês</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Reveal>
              );
            })}
          </div>

          <p className="mt-4 text-center text-[11.5px] text-fg-dim">
            Varredura automática das transações. Com IA (Claude), a detecção fica mais fina (preço abusivo por fornecedor, padrões sazonais).
          </p>
        </>
      )}
    </div>
  );
}
