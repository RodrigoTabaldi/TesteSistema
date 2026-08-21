import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home, Lightbulb } from "lucide-react";
import { cn } from "@/lib/format";
import { brl } from "@/lib/format";
import type { Recomendacao, Dificuldade, StatusMetrica } from "@/lib/types";
import { AnimatedNumber } from "@/components/motion";

type Tone = "blue" | "gold" | "pos" | "crit" | "violet";
const toneBg: Record<Tone, string> = {
  blue: "bg-[color-mix(in_srgb,var(--blue)_18%,transparent)] text-blue-lift",
  gold: "bg-[color-mix(in_srgb,var(--gold)_20%,transparent)] text-gold",
  pos: "bg-[color-mix(in_srgb,var(--pos)_18%,transparent)] text-pos",
  crit: "bg-[color-mix(in_srgb,var(--crit)_16%,transparent)] text-crit",
  violet: "bg-[color-mix(in_srgb,#8b5cf6_20%,transparent)] text-[#a78bfa]",
};

// ---------------- Cabeçalho + breadcrumb ----------------
export function AnaliseHeader({
  icon,
  titulo,
  descricao,
  tone = "blue",
  action,
}: {
  icon: ReactNode;
  titulo: string;
  descricao: string;
  tone?: Tone;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5">
      <nav className="mb-3 flex items-center gap-1.5 text-[12px] text-fg-dim" aria-label="Trilha">
        <Link to="/dashboard" className="flex items-center gap-1 transition hover:text-fg">
          <Home size={13} /> Dashboard
        </Link>
        <ChevronRight size={13} />
        <span className="text-fg-muted">Análises</span>
        <ChevronRight size={13} />
        <span className="font-medium text-fg">{titulo}</span>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("grid h-11 w-11 flex-none place-items-center rounded-xl", toneBg[tone])}>{icon}</span>
          <div>
            <h1 className="font-serif-display text-[24px] font-bold leading-tight">{titulo}</h1>
            <p className="text-[13px] text-fg-muted">{descricao}</p>
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}

// ---------------- Stat tile (KPI compacto animado) ----------------
export function StatTile({
  label,
  value,
  format,
  hint,
  tone = "blue",
  icon,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  hint?: string;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-kronos">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-fg-muted">{label}</span>
        {icon && <span className={cn("grid h-8 w-8 place-items-center rounded-[9px]", toneBg[tone])}>{icon}</span>}
      </div>
      <div className="mt-2 font-serif-display text-[23px] font-bold tnum">
        <AnimatedNumber value={value} format={format} />
      </div>
      {hint && <div className="mt-1 text-[11.5px] text-fg-dim">{hint}</div>}
    </div>
  );
}

// ---------------- Badge de dificuldade ----------------
export function DificuldadeBadge({ nivel }: { nivel: Dificuldade }) {
  const map: Record<Dificuldade, { label: string; cls: string }> = {
    facil: { label: "Fácil", cls: "text-pos bg-[color-mix(in_srgb,var(--pos)_15%,transparent)]" },
    medio: { label: "Médio", cls: "text-warn bg-[color-mix(in_srgb,var(--warn)_20%,transparent)]" },
    dificil: { label: "Difícil", cls: "text-crit bg-[color-mix(in_srgb,var(--crit)_15%,transparent)]" },
  };
  const m = map[nivel];
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", m.cls)}>{m.label}</span>;
}

// ---------------- Status de métrica (benchmark) ----------------
export function StatusBadge({ status }: { status: StatusMetrica }) {
  const map: Record<StatusMetrica, { label: string; cls: string }> = {
    acima: { label: "Acima", cls: "text-pos bg-[color-mix(in_srgb,var(--pos)_15%,transparent)]" },
    igual: { label: "Na média", cls: "text-fg-muted bg-surface-2" },
    abaixo: { label: "Abaixo", cls: "text-crit bg-[color-mix(in_srgb,var(--crit)_15%,transparent)]" },
  };
  const m = map[status];
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", m.cls)}>{m.label}</span>;
}

// ---------------- Lista de recomendações ----------------
export function Recomendacoes({ itens, titulo = "Recomendações" }: { itens: Recomendacao[]; titulo?: string }) {
  if (!itens.length) return null;
  return (
    <div>
      <h3 className="mb-2.5 flex items-center gap-2 text-[14px] font-semibold">
        <Lightbulb size={16} className="text-gold" /> {titulo}
      </h3>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {itens.map((r, i) => (
          <div key={i} className="rounded-lg border border-line bg-surface-2 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold">{r.titulo}</span>
              {r.dificuldade && <DificuldadeBadge nivel={r.dificuldade} />}
            </div>
            <p className="mt-1 text-[12.5px] text-fg-muted">{r.detalhe}</p>
            {typeof r.impacto_reais === "number" && r.impacto_reais > 0 && (
              <div className="mt-1.5 text-[12px] font-semibold text-pos">Impacto ~ {brl(r.impacto_reais)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
