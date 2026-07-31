// ============================================================
// KRONOS — Camada de nuvem (Firebase)
// Estratégia: snapshot JSON por usuário em Firestore.
// Sincroniza estado entre máquinas com autenticação do Firebase.
// ============================================================

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { KronosState, User } from "./types";

export type CloudData = Omit<KronosState, "hydrated" | "users">;

export interface CloudSession {
  userId: string;
  email: string;
}

export async function cloudGetSession(): Promise<CloudSession | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribe();
      if (firebaseUser) {
        resolve({ userId: firebaseUser.uid, email: firebaseUser.email ?? "" });
      } else {
        resolve(null);
      }
    });
  });
}

export async function cloudSignIn(email: string, senha: string): Promise<{ ok: boolean; error?: string; userId?: string }> {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, senha);
    return { ok: true, userId: user.uid };
  } catch (error: any) {
    return { ok: false, error: traduzErro(error.message) };
  }
}

export async function cloudSignUp(email: string, senha: string): Promise<{ ok: boolean; error?: string; userId?: string; precisaConfirmar?: boolean }> {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, senha);
    return { ok: true, userId: user.uid };
  } catch (error: any) {
    return { ok: false, error: traduzErro(error.message) };
  }
}

export async function cloudSignOut(): Promise<void> {
  await signOut(auth);
}

export async function cloudLoad(userId: string): Promise<CloudData | null> {
  try {
    const snap = await getDoc(doc(db, "kronos_snapshots", userId));
    return snap.exists() ? (snap.data() as CloudData) : null;
  } catch (error) {
    console.error("[Kronos] falha ao carregar da nuvem:", error);
    return null;
  }
}

export async function cloudSave(userId: string, data: CloudData): Promise<void> {
  try {
    await setDoc(doc(db, "kronos_snapshots", userId), semUndefined(data));
  } catch (error) {
    console.error("[Kronos] falha ao salvar na nuvem:", error);
  }
}

/**
 * Firestore rejeita documentos com campos `undefined`. O round-trip por JSON
 * remove essas chaves e mantém o restante do snapshot intacto.
 */
function semUndefined<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

/**
 * Escuta o snapshot do usuário e reporta alterações vindas de outro aparelho.
 * Escritas locais são ignoradas (`hasPendingWrites`) para não ecoarem de volta.
 * Devolve a função de cancelamento.
 */
export function cloudSubscribe(userId: string, cb: (data: CloudData) => void): () => void {
  return onSnapshot(
    doc(db, "kronos_snapshots", userId),
    (snap) => {
      if (!snap.exists() || snap.metadata.hasPendingWrites) return;
      cb(snap.data() as CloudData);
    },
    (error) => console.error("[Kronos] falha na sincronização em tempo real:", error)
  );
}

export function cloudOnAuthChange(cb: (session: CloudSession | null) => void): () => void {
  return onAuthStateChanged(auth, (firebaseUser) => {
    cb(firebaseUser ? { userId: firebaseUser.uid, email: firebaseUser.email ?? "" } : null);
  });
}

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
  if (m.includes("wrong-password") || m.includes("user-not-found")) return "E-mail ou senha incorretos.";
  if (m.includes("email-already-in-use")) return "E-mail já cadastrado.";
  if (m.includes("weak-password")) return "Senha inválida (mínimo 6 caracteres).";
  if (m.includes("invalid-email")) return "E-mail inválido.";
  return msg;
}
