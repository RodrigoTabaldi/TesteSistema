import type { ReactNode, CSSProperties } from "react";
import { Emblem } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import FlowFieldBackground from "@/components/ui/flow-field-background";
import { KronosVector } from "@/components/KronosVector";
import { KronosGlobe } from "@/components/ui/kronos-globe";

// O herói é sempre escuro (imagem/animação), independente do tema do app —
// por isso fixamos os tokens escuros aqui. Sem isso, no modo claro o texto
// ficava escuro sobre o fundo escuro (invisível).
const heroDark = {
  "--bg": "#080c18",
  "--bg-2": "#0b1122",
  "--surface": "#0f1730",
  "--surface-2": "#141f3c",
  "--line": "#232f4e",
  "--line-soft": "#19233f",
  "--fg": "#edf1fb",
  "--fg-muted": "#98a5c4",
  "--fg-dim": "#7a86a6",
} as unknown as CSSProperties;

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Painel de marca — sempre escuro */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-bg-2 to-bg text-fg lg:block" style={heroDark}>
        {/* Fundo animado — campo de fluxo dourado do Kronos */}
        <FlowFieldBackground
          className="absolute inset-0 z-0"
          color="#C9A24B"
          trailColor="8, 12, 24"
          trailOpacity={0.1}
          particleCount={520}
          speed={0.8}
        />

        {/* Ampulheta/meandro do vetor Kronos — moldura sutil ao fundo */}
        <KronosVector className="kx-float pointer-events-none absolute right-[-90px] top-1/2 z-[1] h-[660px] w-auto -translate-y-1/2 opacity-25" />

        {/* GLOBO — elemento principal: o tempo girando ao redor do mundo */}
        <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-end pr-[2%]">
          <div className="relative w-[min(66%,470px)] translate-x-[12%] translate-y-[-8%]">
            {/* Anéis orbitais girando ao redor do globo */}
            <svg
              className="animate-spin-slow absolute left-1/2 top-1/2 h-[132%] w-[132%] -translate-x-1/2 -translate-y-1/2 opacity-40"
              viewBox="0 0 300 300"
              aria-hidden="true"
            >
              <g fill="none" stroke="#C9A24B" opacity=".55">
                <ellipse cx="150" cy="150" rx="145" ry="54" strokeWidth="1" />
                <ellipse cx="150" cy="150" rx="145" ry="54" strokeWidth="1" transform="rotate(60 150 150)" />
                <ellipse cx="150" cy="150" rx="145" ry="54" strokeWidth="1" transform="rotate(-60 150 150)" />
              </g>
              <circle cx="295" cy="150" r="3.5" fill="#C9A24B" />
              <circle cx="150" cy="96" r="2.5" fill="#4d8bf5" />
            </svg>
            {/* pointer-events-auto: dá para arrastar o globo */}
            <div className="pointer-events-auto drop-shadow-[0_0_70px_rgba(201,162,75,.3)]">
              <KronosGlobe speed={0.0035} />
            </div>
          </div>
        </div>

        {/* Vinheta — escurece só as bordas, sem cobrir o globo */}
        <div className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(110%_95%_at_78%_42%,transparent_30%,rgba(8,12,24,.8)_100%)]" />
        <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-[#080c18] via-transparent to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <Emblem size={40} />
            <span className="font-serif-display text-[22px] font-bold uppercase tracking-[4px] text-fg">
              Kro<span className="text-gold">nos</span>
            </span>
          </div>

          <div className="kx-reveal max-w-md">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[2.5px] text-gold-soft">
              O deus do tempo, a serviço do seu dinheiro
            </p>
            <h2 className="font-serif-display text-[34px] font-bold leading-tight text-fg" style={{ textShadow: "0 2px 24px rgba(8,12,24,.9)" }}>
              Saia do vermelho <br /> e domine cada centavo <br /> do seu futuro.
            </h2>
            <p className="mt-4 max-w-[47ch] text-[15px] text-fg-muted">
              ~80% das famílias estão endividadas. O Kronos organiza suas dívidas, calcula o
              caminho mais rápido para quitar e cuida do seu dinheiro — seja você
              <b className="text-fg-muted"> pessoa física, autônomo, pequena empresa ou empresa</b>.
            </p>
          </div>

          <div className="flex gap-8 text-[13px] text-fg-dim">
            <div>
              <div className="font-serif-display text-[24px] font-bold text-fg">4</div>
              perfis atendidos
            </div>
            <div>
              <div className="font-serif-display text-[24px] font-bold text-fg">100%</div>
              seus dados, privados
            </div>
            <div>
              <div className="font-serif-display text-[24px] font-bold text-fg">20</div>
              módulos financeiros
            </div>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>
        <div className="kx-reveal w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
