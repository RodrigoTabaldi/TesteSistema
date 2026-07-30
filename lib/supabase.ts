// ============================================================
// KRONOS — Cliente Supabase (opcional, ativado por env)
// Se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY existirem, o app roda em
// modo NUVEM (dados acessíveis de qualquer máquina). Caso contrário, cai
// automaticamente no localStorage — nada quebra sem configurar.
// ============================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** true quando as credenciais do Supabase estão configuradas. */
export const supabaseEnabled: boolean = Boolean(url && anonKey);

/** Cliente único (null no modo local). */
export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;
