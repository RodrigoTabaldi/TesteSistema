import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, Flame, AlertTriangle, TrendingDown, Wallet, ShieldCheck,
  Target, PiggyBank, Handshake, ArrowRight, Compass,
} from "lucide-react";
import { useStore, useMinhasTransacoes, useMinhasDividas } from "@/lib/store";
import { rodarCopiloto, type Insight, type Gravidade, type IconeInsight } from "@/lib/copiloto";
import { brl } from "@/lib/format";
import { Card, EmptyState, Pill, Button } from "@/components/ui";
import { AnaliseHeader, StatTile } from "@/components/analytics";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";

const ICONES: Record<IconeInsight, typeof Flame> = {
  flame: Flame, alert: AlertTriangle, trend: TrendingDown, wallet: Wallet,
  shield: ShieldCheck, sparkles: Sparkles, target: Target, piggy: PiggyBank, handshake: Handshake,
};

const GRAV: Record<Gravidade, { label: string; tone: "crit" | "warn" | "info" | "pos"; cls: string }> = {
  urgente: { label: "Urgente", tone: "crit", cls: "text-crit bg-[color-mix(in_srgb,var(--crit)_16%,transparent)]" },
  importante: { label: "Importante", tone: "warn", cls: "text-warn bg-[color-mix(in_srgb,var(--warn)_20%,transparent)]" },
  oportunidade: { label: "Oportunidade", tone: "info", cls: "text-blue-lift bg-[color-mix(in_srgb,var(--blue)_15%,transparent)]" },
  positivo: { label: "No rumo", tone: "pos", cls: "text-pos bg-[color-mix(in_srgb,var(--pos)_15%,transparent)]" },
};

export default function Copiloto() {
  const { state } = useStore();
  const user = state.user!;
  const txs = useMinhasTransacoes();
  const dividas = useMinhasDividas();
  const res = useMemo(
    () => rodarCopiloto(txs, dividas, user.perfil ?? "pf", user.renda_mensal_centavos ?? 0),
    [txs, dividas, user]
  );

  const vazio = txs.length === 0 && dividas.length === 0;

  return (
    <div>
      <AnaliseHeader
        tone="violet"
        icon={<Compass size={22} />}
        titulo="Kairós · Copiloto Financeiro"
        descricao="Cruzo suas dívidas, seu caixa e seu perfil para dizer a próxima melhor ação — priorizada por impacto."
      />

      {vazio ? (
        <EmptyState
          icon={<Compass size={30} />}
          title="O Kairós está pronto para te guiar"
          desc="Cadastre suas dívidas e alguns lançamentos. A partir daí, monto um plano priorizado com a próxima melhor ação e o impacto em reais."
          action={<Link to="/dividas"><Button variant="primary">Começar pelas dívidas</Button></Link>}
        />
      ) : (
        <>
          {/* Próxima melhor ação */}
          {res.proximaAcao && (
            <Reveal>
              <NextAction insight={res.proximaAcao} />
            </Reveal>
          )}

          <Stagger className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StaggerItem><StatTile label="Índice de saúde" value={res.saudeScore} format={(n) => `${Math.round(n)}`} tone="blue" hint={res.saudeLabel} icon={<ShieldCheck size={16} />} /></StaggerItem>
            <StaggerItem><StatTile label="Economia potencial" value={res.economiaMensalPotencial} format={brl} tone="pos" hint="por mês, se agir nas oportunidades" icon={<PiggyBank size={16} />} /></StaggerItem>
            <StaggerItem><StatTile label="Ações no radar" value={res.insights.length} format={(n) => `${Math.round(n)}`} tone="gold" hint="priorizadas por impacto" icon={<Target size={16} />} /></StaggerItem>
          </Stagger>

          <h2 className="mb-3 mt-7 flex items-center gap-3 font-serif-display text-[19px]">Seu plano priorizado <span className="meander flex-1" /></h2>
          <Stagger className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {res.insights.map((i) => (
              <StaggerItem key={i.id}><InsightCard insight={i} /></StaggerItem>
            ))}
          </Stagger>

          <p className="mt-6 text-center text-[11.5px] text-fg-dim">
            Kairós usa regras financeiras locais sobre os seus dados. Integração com IA (Claude) prevista para refinar as recomendações.
          </p>
        </>
      )}
    </div>
  );
}

function NextAction({ insight }: { insight: Insight }) {
  const Icon = ICONES[insight.icone];
  const g = GRAV[insight.gravidade];
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-line p-6"
      style={{ background: "radial-gradient(120% 140% at 90% -10%, color-mix(in_srgb,#8b5cf6 22%, transparent), transparent 55%), linear-gradient(180deg, var(--surface), var(--bg-2))" }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#a78bfa]">Próxima melhor ação</div>
      <div className="mt-3 flex flex-wrap items-start gap-4">
        <span className={`grid h-12 w-12 flex-none place-items-center rounded-xl ${g.cls}`}><Icon size={24} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif-display text-[22px] font-bold leading-tight" style={{ textWrap: "balance" }}>{insight.titulo}</h2>
            <Pill tone={g.tone}>{g.label}</Pill>
          </div>
          <p className="mt-1.5 max-w-[68ch] text-[13.5px] text-fg-muted">{insight.descricao}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link to={insight.rota}>
              <Button variant="primary">{insight.acao} <ArrowRight size={16} /></Button>
            </Link>
            {insight.impactoReais > 0 && (
              <span className="text-[13px] text-fg-muted">Impacto ~ <b className="text-pos">{brl(insight.impactoReais)}{insight.periodo === "mes" ? "/mês" : ""}</b></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const Icon = ICONES[insight.icone];
  const g = GRAV[insight.gravidade];
  return (
    <Link to={insight.rota} className="block h-full">
      <Card className="flex h-full flex-col p-4 transition hover:border-[color:var(--ring)]">
        <div className="flex items-start gap-3">
          <span className={`grid h-9 w-9 flex-none place-items-center rounded-[10px] ${g.cls}`}><Icon size={18} /></span>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-[13.5px] font-semibold">{insight.titulo}</h4>
              <Pill tone={g.tone}>{g.label}</Pill>
            </div>
            <p className="mt-1 text-[12.5px] text-fg-muted">{insight.descricao}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-2.5">
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-blue-lift">{insight.acao} <ArrowRight size={13} /></span>
          {insight.impactoReais > 0 && <b className="text-[12.5px] text-pos">{brl(insight.impactoReais)}{insight.periodo === "mes" ? "/mês" : ""}</b>}
        </div>
      </Card>
    </Link>
  );
}
