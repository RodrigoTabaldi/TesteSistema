import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/format";

/** Entrada suave (fade-up) via CSS */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <div className={cn("kx-reveal", className)} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

/** Container que escalona a entrada dos filhos (CSS nth-child) */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("kx-stagger", className)}>{children}</div>;
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

/** Hover que levanta levemente */
export function Lift({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("kx-lift", className)}>{children}</div>;
}

/** Número que "conta" até o valor (requestAnimationFrame — leve) */
export function AnimatedNumber({
  value,
  format,
  className,
  duration = 900,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [display, setDisplay] = useState(reduce ? value : 0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className={className}>{format(display)}</span>;
}

/** Barra de progresso animada via transição CSS */
export function ProgressBar({ pct, color = "var(--blue-lift)" }: { pct: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--line-soft)]">
      <div
        className="h-full rounded-full"
        style={{ background: color, width: `${w}%`, transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)" }}
      />
    </div>
  );
}
