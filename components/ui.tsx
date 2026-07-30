"use client";

import { cn } from "@/lib/format";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

// ---------------- Card ----------------
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-gradient-to-b from-surface to-[color-mix(in_srgb,var(--surface)_88%,var(--bg))] shadow-kronos",
        className
      )}
    >
      {children}
    </div>
  );
}

// ---------------- Button ----------------
type BtnVariant = "primary" | "ghost" | "gold" | "danger" | "subtle";
export function Button({
  children,
  variant = "primary",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const base =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-semibold tracking-[-0.01em] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed select-none";
  const styles: Record<BtnVariant, string> = {
    primary: "bg-blue text-white shadow-[0_6px_16px_-8px_var(--blue)] hover:bg-blue-lift hover:shadow-[0_10px_24px_-10px_var(--blue)] active:translate-y-px",
    ghost: "border border-line text-fg hover:border-[color:var(--ring)] hover:bg-surface-2 active:translate-y-px",
    gold: "bg-gradient-to-b from-gold-soft to-gold text-[#231803] shadow-[0_6px_16px_-9px_var(--gold)] hover:brightness-[1.06] active:translate-y-px",
    danger: "bg-crit text-white hover:brightness-110 active:translate-y-px",
    subtle: "bg-surface-2 text-fg-muted hover:text-fg",
  };
  return (
    <button className={cn(base, styles[variant], className)} {...rest}>
      {children}
    </button>
  );
}

// ---------------- Field / Input / Select ----------------
export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-fg-muted">
        {label} {required && <span className="text-crit">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[12px] font-medium text-crit" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-[11.5px] text-fg-dim">{hint}</span>
      ) : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-md border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] text-fg placeholder:text-fg-dim outline-none transition focus:border-[color:var(--ring)] focus:ring-2 focus:ring-[color:var(--ring)]";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, "cursor-pointer appearance-none", className)} {...rest}>
      {children}
    </select>
  );
}

// ---------------- Pill / Stat ----------------
type Tone = "pos" | "warn" | "crit" | "info" | "neutral";
const toneMap: Record<Tone, string> = {
  pos: "text-pos bg-[color-mix(in_srgb,var(--pos)_15%,transparent)]",
  warn: "text-[#8a6400] dark:text-warn bg-[color-mix(in_srgb,var(--warn)_22%,transparent)]",
  crit: "text-crit bg-[color-mix(in_srgb,var(--crit)_15%,transparent)]",
  info: "text-blue-lift bg-[color-mix(in_srgb,var(--blue)_15%,transparent)]",
  neutral: "text-fg-muted bg-surface-2",
};
export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", toneMap[tone])}>
      {children}
    </span>
  );
}

// ---------------- Section title with meander ----------------
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 mt-7 flex items-center gap-3">
      <h2 className="font-serif-display text-[19px] tracking-[0.3px]">{children}</h2>
      <div className="meander flex-1" />
      {action}
    </div>
  );
}

// ---------------- Empty state ----------------
export function EmptyState({ icon, title, desc, action }: { icon?: ReactNode; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-surface-2/40 px-6 py-14 text-center">
      {icon && <div className="text-fg-dim">{icon}</div>}
      <div>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {desc && <p className="mx-auto mt-1 max-w-[42ch] text-[13px] text-fg-muted">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------------- Modal ----------------
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="kx-backdrop absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "kx-modal relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface p-6 shadow-kronos sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg"
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif-display text-[18px]">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-fg-muted transition hover:text-fg"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------- Kronos emblem ----------------
export function Emblem({ size = 42 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ filter: "drop-shadow(0 3px 10px rgba(201,162,75,.35))" }}>
      <defs>
        <linearGradient id="kg-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E4C87F" />
          <stop offset="1" stopColor="#C9A24B" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="none" stroke="#2E86E6" strokeWidth="1.4" opacity=".45" />
      <ellipse cx="24" cy="24" rx="21" ry="8" fill="none" stroke="#2E86E6" strokeWidth="1.1" opacity=".35" />
      <path
        d="M16 12 h16 M16 36 h16 M17 12 C17 22 31 26 31 36 M31 12 C31 22 17 26 17 36"
        fill="none"
        stroke="url(#kg-gold)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M20 15 h8 l-4 6 z" fill="url(#kg-gold)" opacity=".9" />
      <path d="M22 33 h4 l-2 -5 z" fill="url(#kg-gold)" />
      <circle cx="24" cy="24" r="1.6" fill="#E4C87F" />
    </svg>
  );
}
