import { useRef, useState, type ReactNode } from "react";
import { brlReais } from "@/lib/format";

// ------------------------------------------------------------------
// Tooltip flutuante compartilhado (posicionado em % sobre o wrapper)
// ------------------------------------------------------------------
function Tooltip({ x, children }: { x: number; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11.5px] shadow-kronos"
      style={{ left: `${Math.max(12, Math.min(88, x))}%` }}
    >
      {children}
    </div>
  );
}

function useHoverIndex(count: number) {
  const [idx, setIdx] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const frac = (e.clientX - r.left) / r.width;
    setIdx(Math.max(0, Math.min(count - 1, Math.round(frac * (count - 1)))));
  }
  return { idx, setIdx, ref, onMove };
}

// ------------------------------------------------------------------
// Fluxo de caixa — área + linha
// ------------------------------------------------------------------
export function FluxoChart({ data }: { data: { dia: string; saldo: number }[] }) {
  const W = 640, H = 230, pl = 46, pr = 12, pt = 12, pb = 24;
  const vals = data.map((d) => d.saldo);
  const min = Math.min(...vals, 0), max = Math.max(...vals, 1);
  const span = max - min || 1;
  const x = (i: number) => pl + (i / (data.length - 1 || 1)) * (W - pl - pr);
  const y = (v: number) => pt + (1 - (v - min) / span) * (H - pt - pb);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.saldo).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1)} ${H - pb} L${pl} ${H - pb} Z`;
  const ticks = 4;
  const { idx, setIdx, ref, onMove } = useHoverIndex(data.length);

  return (
    <div className="relative" ref={ref} onMouseMove={onMove} onMouseLeave={() => setIdx(null)}>
      {idx !== null && data[idx] && (
        <Tooltip x={((idx / (data.length - 1 || 1)) * (W - pl - pr) + pl) / W * 100}>
          <span className="text-fg-dim">{data[idx].dia}</span> · <b className="tnum text-fg">{brlReais(data[idx].saldo)}</b>
        </Tooltip>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 230 }} role="img" aria-label="Fluxo de caixa dos últimos 30 dias">
        <defs>
          <linearGradient id="flx" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E86E6" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#2E86E6" stopOpacity={0} />
          </linearGradient>
        </defs>
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const v = min + (span * i) / ticks;
          return (
            <g key={i}>
              <line x1={pl} y1={y(v)} x2={W - pr} y2={y(v)} stroke="var(--grid)" />
              <text x={pl - 8} y={y(v) + 4} textAnchor="end" fontSize="10.5" fill="var(--fg-dim)">
                {(v / 1000).toFixed(0)}k
              </text>
            </g>
          );
        })}
        <path d={area} fill="url(#flx)" />
        <path d={line} fill="none" stroke="#2E86E6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {idx !== null && (
          <g>
            <line x1={x(idx)} y1={pt} x2={x(idx)} y2={H - pb} stroke="var(--blue-lift)" strokeDasharray="3 3" opacity="0.5" />
            <circle cx={x(idx)} cy={y(data[idx].saldo)} r="4.5" fill="#2E86E6" stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
        <circle cx={x(data.length - 1)} cy={y(vals[vals.length - 1])} r="4" fill="#2E86E6" />
      </svg>
    </div>
  );
}

// ------------------------------------------------------------------
// Receita × Despesa — barras agrupadas
// ------------------------------------------------------------------
export function ReceitaDespesaChart({ data }: { data: { semana: string; receita: number; despesa: number }[] }) {
  const W = 360, H = 210, pl = 40, pr = 8, pt = 12, pb = 26;
  const max = Math.max(...data.flatMap((d) => [d.receita, d.despesa]), 1);
  const y = (v: number) => pt + (1 - v / max) * (H - pt - pb);
  const bw = (W - pl - pr) / data.length;
  const half = (bw * 0.62) / 2;
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="relative">
      {hover !== null && data[hover] && (
        <Tooltip x={((pl + hover * bw + bw / 2) / W) * 100}>
          <div className="text-fg-dim">{data[hover].semana}</div>
          <div className="text-blue-lift">R {brlReais(data[hover].receita)}</div>
          <div className="text-gold">D {brlReais(data[hover].despesa)}</div>
        </Tooltip>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }} role="img" aria-label="Receita versus despesa por semana">
        {Array.from({ length: 5 }).map((_, i) => {
          const v = (max * i) / 4;
          return (
            <g key={i}>
              <line x1={pl} y1={y(v)} x2={W - pr} y2={y(v)} stroke="var(--grid)" />
              <text x={pl - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--fg-dim)">
                {(v / 1000).toFixed(0)}k
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const cx = pl + i * bw + bw / 2;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pl + i * bw} y={pt} width={bw} height={H - pt - pb} fill={hover === i ? "var(--surface-2)" : "transparent"} />
              <rect x={cx - half - 2} y={y(d.receita)} width={half} height={y(0) - y(d.receita)} rx="3" fill="#2E86E6" />
              <rect x={cx + 2} y={y(d.despesa)} width={half} height={y(0) - y(d.despesa)} rx="3" fill="#C9A24B" />
              <text x={cx} y={H - 9} textAnchor="middle" fontSize="10.5" fill="var(--fg-dim)">
                {d.semana}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ------------------------------------------------------------------
// Despesa por categoria — rosca
// ------------------------------------------------------------------
export function CategoriaDonut({ data }: { data: { nome: string; valor: number; cor: string }[] }) {
  const cx = 80, cy = 80, r = 58, sw = 22;
  const C = 2 * Math.PI * r;
  const total = data.reduce((a, b) => a + b.valor, 0) || 1;
  let off = 0;
  const [hover, setHover] = useState<number | null>(null);

  return (
    <svg viewBox="0 0 160 160" className="w-full" style={{ maxWidth: 200 }} role="img" aria-label="Despesa por categoria">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line-soft)" strokeWidth={sw} />
      {data.map((d, i) => {
        const len = (d.valor / total) * C;
        const seg = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={d.cor}
            strokeWidth={hover === i ? sw + 4 : sw}
            strokeDasharray={`${len.toFixed(2)} ${(C - len).toFixed(2)}`}
            strokeDashoffset={(-off).toFixed(2)}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-width 0.15s" }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        );
        off += len;
        return seg;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="10.5" fill="var(--fg-dim)">
        {hover !== null ? data[hover].nome : "Total"}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--fg)">
        {hover !== null ? `${Math.round((data[hover].valor / total) * 100)}%` : brlReais(total, false)}
      </text>
    </svg>
  );
}

// ------------------------------------------------------------------
// Série multi-linha (investimentos, break-even)
// ------------------------------------------------------------------
export function SerieChart({
  data,
  keys,
}: {
  data: Record<string, number | string>[];
  keys: { key: string; nome: string; cor: string }[];
}) {
  const W = 640, H = 260, pl = 52, pr = 12, pt = 12, pb = 26;
  const allVals = data.flatMap((d) => keys.map((k) => Number(d[k.key]) || 0));
  const max = Math.max(...allVals, 1);
  const min = Math.min(...allVals, 0);
  const span = max - min || 1;
  const x = (i: number) => pl + (i / (data.length - 1 || 1)) * (W - pl - pr);
  const y = (v: number) => pt + (1 - (v - min) / span) * (H - pt - pb);
  const { idx, setIdx, ref, onMove } = useHoverIndex(data.length);

  return (
    <div className="relative" ref={ref} onMouseMove={onMove} onMouseLeave={() => setIdx(null)}>
      {idx !== null && data[idx] && (
        <Tooltip x={((x(idx)) / W) * 100}>
          <div className="text-fg-dim">{String(data[idx].x)}</div>
          {keys.map((k) => (
            <div key={k.key} style={{ color: k.cor }}>
              {k.nome}: <b className="tnum">{brlReais(Number(data[idx][k.key]) || 0)}</b>
            </div>
          ))}
        </Tooltip>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 260 }}>
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
        {keys.map((k) => {
          const path = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(Number(d[k.key]) || 0).toFixed(1)}`).join(" ");
          return <path key={k.key} d={path} fill="none" stroke={k.cor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />;
        })}
        {idx !== null && (
          <>
            <line x1={x(idx)} y1={pt} x2={x(idx)} y2={H - pb} stroke="var(--fg-dim)" strokeDasharray="3 3" opacity="0.5" />
            {keys.map((k) => (
              <circle key={k.key} cx={x(idx)} cy={y(Number(data[idx][k.key]) || 0)} r="4" fill={k.cor} stroke="var(--surface)" strokeWidth="2" />
            ))}
          </>
        )}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-fg-muted">
        {keys.map((k) => (
          <span key={k.key} className="flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-sm" style={{ background: k.cor }} /> {k.nome}
          </span>
        ))}
      </div>
    </div>
  );
}
