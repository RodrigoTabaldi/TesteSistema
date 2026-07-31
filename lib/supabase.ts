// ============================================================
// KRONOS — Cliente Firebase (sempre habilitado)
// Firebase está hardcoded em lib/firebase.ts com credenciais do projeto.
// O app sempre roda em modo NUVEM com sincronização entre dispositivos.
// ============================================================

/** Firebase está sempre habilitado. */
export const supabaseEnabled: boolean = true;

/** Cliente Supabase (null — usando Firebase agora). */
export const supabase: null = null;
