import type { KronosState } from "./types";

// v3 — módulo de desendividamento (perfil + renda + dívidas). Subir a versão
// descarta caches antigos cujo User não tinha `perfil`/`renda_mensal_centavos`.
const KEY = "kronos:v3";

export type PersistedState = Omit<KronosState, "hydrated">;

export function loadState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — silencioso no MVP */
  }
}

/** MVP "hash" — NÃO é seguro. Supabase Auth substitui no futuro. */
export function fakeHash(senha: string): string {
  let h = 0;
  for (let i = 0; i < senha.length; i++) {
    h = (h << 5) - h + senha.charCodeAt(i);
    h |= 0;
  }
  return `mvp$${h.toString(36)}`;
}
