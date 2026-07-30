// Vetor autoral do Kronos — deus do tempo.
// Relógio com algarismos romanos, ampulheta, louros, meandro e arco clássico.
// Linhas em ouro sobre fundo escuro; animações sutis (flutua, areia cai, brilho pulsa).

const ROMANOS: { n: string; x: number; y: number }[] = [
  { n: "XII", x: 170, y: 138 },
  { n: "I", x: 207, y: 148 },
  { n: "II", x: 234, y: 174 },
  { n: "III", x: 244, y: 212 },
  { n: "IV", x: 234, y: 249 },
  { n: "V", x: 207, y: 275 },
  { n: "VI", x: 170, y: 286 },
  { n: "VII", x: 133, y: 275 },
  { n: "VIII", x: 106, y: 249 },
  { n: "IX", x: 96, y: 212 },
  { n: "X", x: 106, y: 174 },
  { n: "XI", x: 133, y: 148 },
];

export function KronosVector({ className }: { className?: string }) {
  const cx = 170;
  const cy = 212;
  return (
    <svg
      className={className}
      viewBox="0 0 340 640"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="kv-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E4C87F" />
          <stop offset="1" stopColor="#C9A24B" />
        </linearGradient>
        <radialGradient id="kv-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#C9A24B" stopOpacity="0.35" />
          <stop offset="1" stopColor="#C9A24B" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Brilho central pulsante */}
      <circle cx={cx} cy={cy} r="150" fill="url(#kv-glow)" className="kx-pulse" />

      {/* Raios de tempo irradiando do topo */}
      <g stroke="url(#kv-gold)" strokeWidth="1" opacity="0.28" className="kx-pulse">
        {Array.from({ length: 11 }).map((_, i) => {
          const a = (-Math.PI / 2) + ((i - 5) * Math.PI) / 18;
          return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * 300} y2={cy + Math.sin(a) * 300} />;
        })}
      </g>

      {/* Arco clássico (moldura) */}
      <path d="M44 616 L44 168 Q44 44 170 44 Q296 44 296 168 L296 616" stroke="url(#kv-gold)" strokeWidth="1.4" opacity="0.4" />
      <path d="M60 616 L60 172 Q60 62 170 62 Q280 62 280 172 L280 616" stroke="url(#kv-gold)" strokeWidth="0.8" opacity="0.25" />

      {/* Louros laterais */}
      {[-1, 1].map((s) => (
        <g key={s} stroke="url(#kv-gold)" strokeWidth="1.2" opacity="0.55" fill="none">
          <path d={`M${cx + s * 118} 300 Q${cx + s * 150} 250 ${cx + s * 128} 150`} />
          {Array.from({ length: 6 }).map((_, i) => {
            const t = i / 5;
            const px = cx + s * (118 + (128 - 118) * t) + s * (Math.sin(t * Math.PI) * 18);
            const py = 300 - t * 150;
            return <ellipse key={i} cx={px} cy={py} rx="9" ry="4" transform={`rotate(${s * (35 - t * 20)} ${px} ${py})`} />;
          })}
        </g>
      ))}

      {/* Mostrador do relógio — véu translúcido para o globo aparecer por trás */}
      <circle cx={cx} cy={cy} r="97" fill="#080c18" opacity="0.22" />
      <circle cx={cx} cy={cy} r="98" stroke="url(#kv-gold)" strokeWidth="2" opacity="0.85" />
      <circle cx={cx} cy={cy} r="92" stroke="url(#kv-gold)" strokeWidth="0.8" opacity="0.4" />
      {/* Marcas de hora */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * Math.PI) / 6;
        const r1 = 84;
        const r2 = 91;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * r1}
            y1={cy + Math.sin(a) * r1}
            x2={cx + Math.cos(a) * r2}
            y2={cy + Math.sin(a) * r2}
            stroke="url(#kv-gold)"
            strokeWidth="2"
            opacity="0.7"
          />
        );
      })}
      {/* Algarismos romanos */}
      {ROMANOS.map((r) => (
        <text key={r.n} x={r.x} y={r.y} fill="#E4C87F" fontSize="12" fontFamily="Spectral, Georgia, serif" textAnchor="middle" dominantBaseline="central" opacity="0.85">
          {r.n}
        </text>
      ))}
      {/* Ponteiros (10:10, clássico) + pino central */}
      <line x1={cx} y1={cy} x2={127} y2={185} stroke="url(#kv-gold)" strokeWidth="3" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={230} y2={176} stroke="url(#kv-gold)" strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill="url(#kv-gold)" />

      {/* Ampulheta */}
      <g stroke="url(#kv-gold)" strokeWidth="1.8" opacity="0.8">
        <line x1="132" y1="360" x2="208" y2="360" strokeLinecap="round" />
        <line x1="132" y1="470" x2="208" y2="470" strokeLinecap="round" />
        <path d="M138 360 L202 360 L172 415 Z" fill="none" />
        <path d="M172 415 L202 470 L138 470 Z" fill="none" />
        <path d="M138 360 Q120 415 138 470" fill="none" strokeWidth="1" opacity="0.5" />
        <path d="M202 360 Q220 415 202 470" fill="none" strokeWidth="1" opacity="0.5" />
      </g>
      {/* Areia caindo (anima) */}
      <g fill="#E4C87F">
        <circle cx="170" cy="420" r="1.6" className="kx-fall" style={{ animationDelay: "0s" }} />
        <circle cx="170" cy="435" r="1.4" className="kx-fall" style={{ animationDelay: "0.7s" }} />
        <circle cx="170" cy="450" r="1.5" className="kx-fall" style={{ animationDelay: "1.4s" }} />
        <path d="M150 470 Q170 452 190 470 Z" opacity="0.6" />
      </g>

      {/* Meandro grego (base) */}
      <g stroke="url(#kv-gold)" strokeWidth="1.4" opacity="0.5" fill="none">
        {Array.from({ length: 6 }).map((_, i) => {
          const x = 90 + i * 27;
          return <path key={i} d={`M${x} 520 h18 v-14 h-12 v8 h6`} />;
        })}
        <line x1="88" y1="522" x2="252" y2="522" strokeWidth="1" opacity="0.6" />
      </g>

      {/* Estrelas/pontos de tempo */}
      <g fill="#E4C87F" className="kx-pulse">
        <circle cx="70" cy="120" r="1.6" />
        <circle cx="272" cy="150" r="2" />
        <circle cx="250" cy="330" r="1.4" />
        <circle cx="92" cy="360" r="1.6" />
      </g>
    </svg>
  );
}
