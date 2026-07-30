// ============================================================
// KRONOS — Camada de nuvem (Supabase)
// Estratégia MVP: um "snapshot" JSON por usuário na tabela
// `kronos_snapshots` (protegida por RLS). Simples e robusto — sincroniza
// TODO o estado entre máquinas com o mínimo de código. O schema normalizado
// (transacoes, dividas, …) continua em schema.sql para evolução futura.
// ============================================================

import { supabase } from "./supabase";
import type { KronosState, User } from "./types";

/** Dados de um usuário na nuvem (tudo, menos flags locais e o registro de contas). */
export type CloudData = Omit<KronosState, "hydrated" | "users">;

const TABELA = "kronos_snapshots";

export interface CloudSession {
  userId: string;
  email: string;
}

export async function cloudGetSession(): Promise<CloudSession | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const s = data.session;
  return s ? { userId: s.user.id, email: s.user.email ?? "" } : null;
}

export async function cloudSignIn(email: string, senha: string): Promise<{ ok: boolean; error?: string; userId?: string }> {
  if (!supabase) return { ok: false, error: "Nuvem não configurada." };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { ok: false, error: traduzErro(error.message) };
  return { ok: true, userId: data.user?.id };
}

export async function cloudSignUp(email: string, senha: string): Promise<{ ok: boolean; error?: string; userId?: string; precisaConfirmar?: boolean }> {
  if (!supabase) return { ok: false, error: "Nuvem não configurada." };
  const { data, error } = await supabase.auth.signUp({ email, password: senha });
  if (error) return { ok: false, error: traduzErro(error.message) };
  // Se a confirmação de e-mail estiver ligada, não há sessão até confirmar.
  return { ok: true, userId: data.user?.id, precisaConfirmar: !data.session };
}

export async function cloudSignOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** Carrega o snapshot do usuário (null se ainda não existe). */
export async function cloudLoad(userId: string): Promise<CloudData | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABELA).select("data").eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  return data.data as CloudData;
}

/** Salva (upsert) o snapshot do usuário. */
export async function cloudSave(userId: string, data: CloudData): Promise<void> {
  if (!supabase) return;
  await supabase.from(TABELA).upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
}

/** Observa login/logout em outras abas/janelas. */
export function cloudOnAuthChange(cb: (session: CloudSession | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_e, s) => {
    cb(s ? { userId: s.user.id, email: s.user.email ?? "" } : null);
  });
  return () => data.subscription.unsubscribe();
}

/** Estado inicial de um usuário novo na nuvem. */
export function cloudEstadoInicial(user: User): CloudData {
  return {
    user,
    transacoes: [],
    clientes: [],
    categorias: [],
    notas: [],
    impostos: [],
    simulacoes: [],
    analises: [],
    cenarios: [],
    despesasPessoais: [],
    dividas: [],
  };
}

function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered") || m.includes("already been registered")) return "E-mail já cadastrado.";
  if (m.includes("password")) return "Senha inválida (mínimo 6 caracteres).";
  if (m.includes("email")) return "E-mail inválido.";
  return msg;
}
