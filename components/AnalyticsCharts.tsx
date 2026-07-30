import { useState } from "react";
import { brlReais } from "@/lib/format";
import type { PrevisaoPonto } from "@/lib/types";

// ------------------------------------------------------------------
// 1. Previsão — linha + banda de confiança (área entre min e max)
// ------------------------------------------------------------------
export function ForecastChart({ pontos, saldoInicial }: { pontos: PrevisaoPonto[]; saldoInicial: number }) {
  const W = 680,
    H = 260,
    pl = 52,
    pr = 14,
    pt = 14,
    pb = 26;
  const serie = [{ data: "hoje", saldo: saldoInicial, min: saldoInicial, max: saldoInicial }, ...pontos];
  const reais = (c: number) => c / 100;
  const vals = serie.flatMap((p) => [reais(p.min), reais(p.max)]);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 1);
  const span = max - min || 1;
  const x = (i: number) => pl + (i / (serie.length - 1 || 1)) * (W - pl - pr);
  const y = (v: number) => pt + (1 - (v - min) / span) * (H - pt - pb);
  const [hover, setHover] = useState<number | null>(null);

  const lineTop = serie.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(reais(p.max)).toFixed(1)}`).join(" ");
  const lineBot = serie.map((p, i) => `L${x(i).toFixed(1)} ${y(reais(p.min)).toFixed(1)}`).reverse().join(" ");
  const band = `${lineTop} ${lineBot} Z`;
  const linha = serie.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(reais(p.saldo)).toFixed(1)}`).join(" ");
  const zeroY = y(0);

  return (
    <div className="relative">
      {hover !== null && serie[hover] && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11.5px] shadow-kronos"
          style={{ left: `${Math.max(14, Math.min(86, (x(hover) / W) * 100))}%` }}
        >
          <div className="text-fg-dim">{serie[hover].data === "hoje" ? "Hoje" : serie[hover].data.split("-").reverse().join("/")}</div>
          <div className="tnum font-semibold text-fg">{brlReais(reais(serie[hover].saldo))}</div>
          <div className="tnum text-fg-dim">
            {brlReais(reais(serie[hover].min))} – {brlReais(reais(serie[hover].max))}
          </div>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 260 }}
        role="img"
        aria-label="Previsão de saldo com intervalo de confiança"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const frac = (e.clientX - r.left) / r.width;
          setHover(Math.max(0, Math.min(serie.length - 1, Math.round(frac * (serie.length - 1)))));
        }}
      >
        <defs>
          <linearGradient id="fc-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E86E6" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#2E86E6" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        {Array.from({ length: 5 }).map((_, i) => {
          const v = min + (span * i) / 4;
          return (
            <g key={i}>
              <line x1={pl} y1={y(v)} x2={W - pr} y2={y(v)} stroke="var(--grid)" />
              <text x={pl - 8} y={y(v) + 4} textAnchor="end" fontSize="10.5" fill="var(--fg-dim)">
                {(v / 1000).toFixed(0)}k
              </text>
            </g>
          );
        })}
        {min < 0 && max > 0 && (
          <line x1={pl} y1={zeroY} x2={W - pr} y2={zeroY} stroke="var(--crit)" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
        )}
        <path d={band} fill="url(#fc-band)" className="kx-draw" />
        <path d={linha} fill="none" stroke="#2E86E6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {hover !== null && (
          <g>
            <line x1={x(hover)} y1={pt} x2={x(hover)} y2={H - pb} stroke="var(--blue-lift)" strokeDasharray="3 3" opacity="0.5" />
            <circle cx={x(hover)} cy={y(reais(serie[hover].saldo))} r="4.5" fill="#2E86E6" stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
      </svg>
      <div className="mt-1 flex flex-wrap gap-4 text-[12px] text-fg-muted">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-blue-lift" /> Saldo projetado</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-3 rounded-sm" style={{ background: "color-mix(in srgb, var(--blue) 25%, transparent)" }} /> Intervalo de confiança (90%)</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// 2. Radar / spider — comparação multi-métrica
// ------------------------------------------------------------------
export interface RadarSerie {
  nome: string;
  cor: string;
  valores: number[]; // já normalizados 0-100
}
export function RadarChart({ eixos, series }: { eixos: string[]; series: RadarSerie[] }) {
  const size = 300;
  const c = size / 2;
  const r = c - 54;
  const n = eixos.length;
  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, val: number) => {
    const rr = (Math.max(0, Math.min(100, val)) / 100) * r;
    return [c + rr * Math.cos(ang(i)), c + rr * Math.sin(ang(i))];
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full" style={{ maxWidth: 340 }} role="img" aria-label="Comparação por métrica em radar">
      {[0.25, 0.5, 0.75, 1].map((f, gi) => (
        <polygon
          key={gi}
          points={eixos.map((_, i) => { const [px, py] = pt(i, f * 100); return `${px},${py}`; }).join(" ")}
          fill="none"
          stroke="var(--grid)"
        />
      ))}
      {eixos.map((_, i) => {
        const [px, py] = pt(i, 100);
        return <line key={i} x1={c} y1={c} x2={px} y2={py} stroke="var(--grid)" />;
      })}
      {series.map((s) => (
        <polygon
          key={s.nome}
          points={s.valores.map((v, i) => { const [px, py] = pt(i, v); return `${px},${py}`; }).join(" ")}
          fill={s.cor}
          fillOpacity={0.16}
          stroke={s.cor}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ))}
      {eixos.map((label, i) => {
        const [px, py] = pt(i, 118);
        return (
          <text key={label} x={px} y={py} textAnchor="middle" dominantBaseline="middle" fontSize="10.5" fill="var(--fg-muted)">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ------------------------------------------------------------------
// 3. Waterfall — passos que somam/subtraem até um total
// ------------------------------------------------------------------
export function WaterfallChart({ passos }: { passos: { label: string; delta: number; total?: boolean }[] }) {
  const W = 520,
    H = 240,
    pl = 8,
    pr = 8,
    pt = 16,
    pb = 42;
  const reais = (c: number) => c / 100;
  let running = 0;
  const barras = passos.map((p, i) => {
    const isTotal = p.total ?? i === passos.length - 1;
    const start = isTotal ? 0 : running;
    const end = isTotal ? reais(p.delta) : running + reais(p.delta);
    if (!isTotal) running += reais(p.delta);
    else running = reais(p.delta);
    return { ...p, start, end, isTotal };
  });
  const vals = barras.flatMap((b) => [b.start, b.end, 0]);
  const min = Math.min(...vals);
  const max = Math.max(...vals, 1);
  const span = max - min || 1;
  const y = (v: number) => pt + (1 - (v - min) / span) * (H - pt - pb);
  const bw = (W - pl - pr) / barras.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 240 }} role="img" aria-label="Composição em cascata">
      <line x1={pl} y1={y(0)} x2={W - pr} y2={y(0)} stroke="var(--line)" />
      {barras.map((b, i) => {
        const x = pl + i * bw + bw * 0.16;
        const w = bw * 0.68;
        const top = Math.min(y(b.start), y(b.end));
        const h = Math.max(3, Math.abs(y(b.start) - y(b.end)));
        const cor = b.isTotal ? "var(--blue-lift)" : b.delta >= 0 ? "var(--pos)" : "var(--crit)";
        return (
          <g key={b.label + i}>
            <rect x={x} y={top} width={w} height={h} rx="3" fill={cor} className="kx-grow" style={{ transformOrigin: `center ${y(0)}px` }} />
            <text x={x + w / 2} y={top - 5} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="var(--fg)">
              {b.delta >= 0 && !b.isTotal ? "+" : ""}{brlReais(reais(b.delta), false)}
            </text>
            <text x={x + w / 2} y={H - pb + 16} textAnchor="middle" fontSize="10" fill="var(--fg-dim)">
              {b.label.length > 16 ? b.label.slice(0, 15) + "…" : b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ------------------------------------------------------------------
// 4. Scatter — risco (x) vs retorno (y), com destaque
// ------------------------------------------------------------------
export interface ScatterPonto {
  id: string;
  nome: string;
  x: number; // risco 0-100
  y: number; // retorno %
  destaque?: boolean;
}
export function ScatterChart({ pontos, onSelect, selecionado }: { pontos: ScatterPonto[]; onSelect?: (id: string) => void; selecionado?: string }) {
  const W = 520,
    H = 300,
    pl = 46,
    pr = 16,
    pt = 16,
    pb = 40;
  const maxY = Math.max(...pontos.map((p) => p.y), 10) * 1.15;
  const x = (v: number) => pl + (v / 100) * (W - pl - pr);
  const y = (v: number) => pt + (1 - v / maxY) * (H - pt - pb);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 300 }} role="img" aria-label="Risco versus retorno">
      {[0, 25, 50, 75, 100].map((gx) => (
        <g key={gx}>
          <line x1={x(gx)} y1={pt} x2={x(gx)} y2={H - pb} stroke="var(--grid)" />
          <text x={x(gx)} y={H - pb + 16} textAnchor="middle" fontSize="10" fill="var(--fg-dim)">{gx}</text>
        </g>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const v = maxY * f;
        return (
          <g key={f}>
            <line x1={pl} y1={y(v)} x2={W - pr} y2={y(v)} stroke="var(--grid)" />
            <text x={pl - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--fg-dim)">{v.toFixed(0)}%</text>
          </g>
        );
      })}
      <text x={(W + pl) / 2} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--fg-muted)">Risco →</text>
      <text x={14} y={pt + 4} fontSize="10.5" fill="var(--fg-muted)">Retorno ↑</text>
      {pontos.map((p) => {
        const sel = p.id === selecionado || p.destaque;
        return (
          <g key={p.id} onClick={() => onSelect?.(p.id)} style={{ cursor: onSelect ? "pointer" : "default" }}>
            <circle cx={x(p.x)} cy={y(p.y)} r={sel ? 9 : 6.5} fill={sel ? "var(--gold)" : "var(--blue-lift)"} stroke="var(--surface)" strokeWidth="2" className="kx-pop-dot" />
            <text x={x(p.x)} y={y(p.y) - 12} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="var(--fg)">
              {p.nome.length > 14 ? p.nome.slice(0, 13) + "…" : p.nome}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
