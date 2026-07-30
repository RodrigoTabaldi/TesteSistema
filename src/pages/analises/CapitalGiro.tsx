import { useMemo } from "react";
import { Wallet, ArrowRightLeft, Clock } from "lucide-react";
import { useMinhasTransacoes } from "@/lib/store";
import { calcularCapitalGiro } from "@/lib/utils";
import { brl } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { AnaliseHeader, StatTile, DificuldadeBadge } from "@/components/analytics";

export default function CapitalGiro() {
  const txs = useMinhasTransacoes();
  const res = useMemo(() => calcularCapitalGiro(txs), [txs]);

  if (txs.length === 0) {
    return (
      <div>
        <AnaliseHeader tone="blue" icon={<Wallet size={22} />} titulo="Capital de Giro" descricao="Ciclo de caixa e quanto de reserva o negócio precisa para girar." />
        <EmptyState icon={<Wallet size={30} />} title="Sem dados de fluxo" desc="Cadastre receitas e despesas (com status pago/pendente) para o sistema detectar seu ciclo de caixa." />
      </div>
    );
  }

  return (
    <div>
      <AnaliseHeader tone="blue" icon={<Wallet size={22} />} titulo="Capital de Giro" descricao="Ciclo de caixa detectado e reserva necessária para girar sem apertos." />

      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StaggerItem><StatTile label="Ciclo de caixa" value={res.ciclo_caixa_dias} format={(n) => `${Math.round(n)} dias`} tone="violet" icon={<Clock size={16} />} /></StaggerItem>
        <StaggerItem><StatTile label="Giro necessário" value={res.giro_necessario} format={brl} tone="gold" /></StaggerItem>
        <StaggerItem><StatTile label="Giro atual (caixa)" value={res.giro_atual} format={brl} tone="blue" /></StaggerItem>
        <StaggerItem><StatTile label="Déficit" value={res.deficit} format={brl} tone={res.deficit > 0 ? "crit" : "pos"} /></StaggerItem>
      </Stagger>

      <Reveal delay={0.05}>
        <Card className="mt-4 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold"><ArrowRightLeft size={16} className="text-blue-lift" /> Ciclo de caixa</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-line bg-surface-2 p-4 text-center">
              <div className="text-[12px] text-fg-muted">Prazo de recebimento</div>
              <div className="mt-1 font-serif-display text-[22px] font-bold tnum text-pos">{res.prazo_recebimento}d</div>
              <div className="text-[11px] text-fg-dim">dinheiro entra</div>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 p-4 text-center">
              <div className="text-[12px] text-fg-muted">Prazo de pagamento</div>
              <div className="mt-1 font-serif-display text-[22px] font-bold tnum text-crit">{res.prazo_pagamento}d</div>
              <div className="text-[11px] text-fg-dim">dinheiro sai</div>
            </div>
            <div className="rounded-lg border border-blue bg-[color-mix(in_srgb,var(--blue)_10%,transparent)] p-4 text-center">
              <div className="text-[12px] text-fg-muted">Ciclo (gap)</div>
              <div className="mt-1 font-serif-display text-[22px] font-bold tnum text-blue-lift">{res.ciclo_caixa_dias}d</div>
              <div className="text-[11px] text-fg-dim">precisa financiar</div>
            </div>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={0.1}>
        <Card className="mt-4 p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Soluções para reduzir a necessidade</h3>
          <div className="flex flex-col gap-2.5">
            {res.solucoes.map((s) => (
              <div key={s.nome} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 p-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-medium">{s.nome}</span>
                  <DificuldadeBadge nivel={s.dificuldade} />
                </div>
                <div className="flex items-center gap-4 text-[13px]">
                  {s.impacto_dias !== 0 && <span className="tnum font-semibold text-pos">{s.impacto_dias}d ciclo</span>}
                  <span className="tnum font-semibold text-gold">{brl(s.impacto_reais)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
