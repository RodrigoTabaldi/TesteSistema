import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Centavos (int) -> "R$ 1.234,56" */
export function brl(centavos: number, comSimbolo = true): string {
  const v = (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return comSimbolo ? `R$ ${v}` : v;
}

/** Reais (float) -> "R$ 1.234,56" */
export function brlReais(reais: number, comSimbolo = true): string {
  return brl(Math.round(reais * 100), comSimbolo);
}

export function pct(n: number, casas = 1): string {
  return `${n.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

/** "2026-07-23" -> "23/07/2026" */
export function dataBR(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function mesAtual(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Parse "1.234,56" (pt-BR input) -> centavos int */
export function parseReaisToCentavos(input: string): number {
  const clean = input.replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}
