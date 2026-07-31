"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useMemo,
  useRef,
  type ReactNode,
  type Dispatch,
} from "react";
import type {
  KronosState,
  User,
  Transacao,
  NotaFiscal,
  Imposto,
  Simulacao,
  Analise,
  Cenario,
  DespesaPessoal,
  Divida,
  RegimeTributario,
  Perfil,
} from "./types";
import { loadState, saveState, fakeHash } from "./storage";
import { seedCategorias } from "./seed";
import { uid } from "./format";
import { supabaseEnabled } from "./supabase";
import {
  cloudGetSession,
  cloudLoad,
  cloudSave,
  cloudSignIn,
  cloudSignUp,
  cloudSignOut,
  cloudSubscribe,
  cloudEstadoInicial,
  type CloudData,
} from "./cloud";

// ---------------- Actions ----------------

type Action =
  | { type: "HYDRATE"; payload: Omit<KronosState, "hydrated"> }
  | { type: "LOGIN"; user: User }
  | { type: "LOGOUT" }
  | { type: "REGISTER"; user: User; seed: Pick<KronosState, "categorias" | "clientes" | "transacoes" | "impostos"> }
  | { type: "UPDATE_USER"; patch: Partial<User> }
  | { type: "ADD_TX"; tx: Transacao }
  | { type: "UPDATE_TX"; id: string; patch: Partial<Transacao> }
  | { type: "DELETE_TX"; id: string }
  | { type: "ADD_NOTA"; nota: NotaFiscal }
  | { type: "ADD_IMPOSTO"; imposto: Imposto }
  | { type: "PAY_IMPOSTO"; id: string }
  | { type: "ADD_SIM"; sim: Simulacao }
  | { type: "DELETE_SIM"; id: string }
  | { type: "ADD_ANALISE"; analise: Analise }
  | { type: "DELETE_ANALISE"; id: string }
  | { type: "ADD_CENARIO"; cenario: Cenario }
  | { type: "DELETE_CENARIO"; id: string }
  | { type: "ADD_DESPESA_PESSOAL"; despesa: DespesaPessoal }
  | { type: "DELETE_DESPESA_PESSOAL"; id: string }
  | { type: "ADD_DIVIDA"; divida: Divida }
  | { type: "UPDATE_DIVIDA"; id: string; patch: Partial<Divida> }
  | { type: "DELETE_DIVIDA"; id: string };

const emptyState: KronosState = {
  user: null,
  users: [],
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
  hydrated: false,
};

function reducer(state: KronosState, action: Action): KronosState {
  switch (action.type) {
    case "HYDRATE":
      // emptyState primeiro garante defaults p/ chaves novas ausentes no localStorage antigo.
      return { ...emptyState, ...action.payload, hydrated: true };
    case "LOGIN":
      return { ...state, user: action.user };
    case "LOGOUT":
      return { ...state, user: null };
    case "REGISTER":
      return {
        ...state,
        user: action.user,
        users: [...state.users, action.user],
        categorias: [...state.categorias, ...action.seed.categorias],
        clientes: [...state.clientes, ...action.seed.clientes],
        transacoes: [...state.transacoes, ...action.seed.transacoes],
        impostos: [...state.impostos, ...action.seed.impostos],
      };
    case "UPDATE_USER": {
      if (!state.user) return state;
      const updated = { ...state.user, ...action.patch };
      return {
        ...state,
        user: updated,
        users: state.users.map((u) => (u.id === updated.id ? updated : u)),
      };
    }
    case "ADD_TX":
      return { ...state, transacoes: [action.tx, ...state.transacoes] };
    case "UPDATE_TX":
      return {
        ...state,
        transacoes: state.transacoes.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)),
      };
    case "DELETE_TX":
      return { ...state, transacoes: state.transacoes.filter((t) => t.id !== action.id) };
    case "ADD_NOTA":
      return { ...state, notas: [action.nota, ...state.notas] };
    case "ADD_IMPOSTO":
      return { ...state, impostos: [action.imposto, ...state.impostos] };
    case "PAY_IMPOSTO":
      return {
        ...state,
        impostos: state.impostos.map((i) =>
          i.id === action.id ? { ...i, status: "pago", data_pagamento: new Date().toISOString().slice(0, 10) } : i
        ),
      };
    case "ADD_SIM":
      return { ...state, simulacoes: [action.sim, ...state.simulacoes] };
    case "DELETE_SIM":
      return { ...state, simulacoes: state.simulacoes.filter((s) => s.id !== action.id) };
    case "ADD_ANALISE":
      return { ...state, analises: [action.analise, ...state.analises] };
    case "DELETE_ANALISE":
      return { ...state, analises: state.analises.filter((a) => a.id !== action.id) };
    case "ADD_CENARIO":
      return { ...state, cenarios: [action.cenario, ...state.cenarios] };
    case "DELETE_CENARIO":
      return { ...state, cenarios: state.cenarios.filter((c) => c.id !== action.id) };
    case "ADD_DESPESA_PESSOAL":
      return { ...state, despesasPessoais: [action.despesa, ...state.despesasPessoais] };
    case "DELETE_DESPESA_PESSOAL":
      return { ...state, despesasPessoais: state.despesasPessoais.filter((d) => d.id !== action.id) };
    case "ADD_DIVIDA":
      return { ...state, dividas: [action.divida, ...state.dividas] };
    case "UPDATE_DIVIDA":
      return { ...state, dividas: state.dividas.map((d) => (d.id === action.id ? { ...d, ...action.patch } : d)) };
    case "DELETE_DIVIDA":
      return { ...state, dividas: state.dividas.filter((d) => d.id !== action.id) };
    default:
      return state;
  }
}

// ---------------- Context ----------------

export type AuthResult = { ok: boolean; error?: string; aviso?: string };

interface StoreCtx {
  state: KronosState;
  dispatch: Dispatch<Action>;
  /** true quando conectado ao Supabase (dados na nuvem). */
  nuvem: boolean;
  // auth helpers (assíncronos — funcionam em modo local e nuvem)
  login: (email: string, senha: string) => Promise<AuthResult>;
  register: (data: RegisterData) => Promise<AuthResult>;
  logout: () => void;
}

export interface RegisterData {
  email: string;
  senha: string;
  nome_negocio: string;
  documento: string;
  perfil: Perfil;
  regime: RegimeTributario;
  renda_mensal_centavos: number;
}

const Ctx = createContext<StoreCtx | null>(null);

/** Usuário de contingência quando há sessão na nuvem mas ainda não há snapshot salvo. */
function usuarioMinimo(id: string, email: string): User {
  return {
    id,
    email,
    senha_hash: "",
    nome_negocio: email.split("@")[0] ?? "Minha conta",
    documento: "",
    perfil: "pf",
    regime: "simples",
    renda_mensal_centavos: 0,
    plano: "free",
    logo_url: null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Serializa com as chaves ordenadas, para que o snapshot escrito e o devolvido
 * pelo Firestore produzam a mesma string e a comparação não gere idas e voltas.
 */
function assinatura(valor: unknown): string {
  return JSON.stringify(valor, (_chave, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.keys(v as object)
          .sort()
          .reduce<Record<string, unknown>>((acc, k) => {
            acc[k] = (v as Record<string, unknown>)[k];
            return acc;
          }, {})
      : v
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, emptyState);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Assinatura do último snapshot escrito ou recebido — corta o eco entre save e listener. */
  const ultimoSnapshot = useRef<string | null>(null);

  // Hidratação inicial: nuvem (se configurada e houver sessão) ou localStorage.
  useEffect(() => {
    let cancel = false;
    async function boot() {
      if (supabaseEnabled) {
        const sess = await cloudGetSession();
        if (sess) {
          const data = await cloudLoad(sess.userId);
          // Sessão válida sem snapshot ainda: mantém o usuário logado com estado
          // vazio em vez de jogá-lo de volta para a tela de login.
          const base = data ?? { ...cloudEstadoInicial(usuarioMinimo(sess.userId, sess.email)), categorias: seedCategorias(sess.userId) };
          if (!cancel) dispatch({ type: "HYDRATE", payload: { ...emptyState, ...base, users: [] } });
          return;
        }
        if (!cancel) dispatch({ type: "HYDRATE", payload: { ...emptyState } });
        return;
      }
      const saved = loadState();
      if (!cancel) dispatch({ type: "HYDRATE", payload: saved ?? { ...emptyState } });
    }
    void boot();
    return () => {
      cancel = true;
    };
  }, []);

  // Persistência ao mudar (após hidratar). Nuvem: upsert com debounce. Local: síncrono.
  useEffect(() => {
    if (!state.hydrated) return;
    const { hydrated, users, ...rest } = state;
    void hydrated;
    if (supabaseEnabled) {
      if (!state.user) return;
      const userId = state.user.id;
      const payload = { ...rest, user: state.user } as CloudData;
      const marca = assinatura(payload);
      // Estado idêntico ao que já está na nuvem (inclusive o que acabou de chegar
      // pelo listener): não reescreve, senão vira um ciclo entre os aparelhos.
      if (marca === ultimoSnapshot.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        ultimoSnapshot.current = marca;
        void cloudSave(userId, payload);
      }, 800);
      return;
    }
    void users;
    saveState({ ...rest, users });
  }, [state]);

  // Sincronização ao vivo: alterações feitas em outro aparelho chegam sozinhas,
  // sem precisar recarregar a página.
  const userId = state.user?.id ?? null;
  useEffect(() => {
    if (!supabaseEnabled || !userId) return;
    return cloudSubscribe(userId, (data) => {
      const marca = assinatura(data);
      if (marca === ultimoSnapshot.current) return;
      ultimoSnapshot.current = marca;
      dispatch({ type: "HYDRATE", payload: { ...emptyState, ...data, users: [] } });
    });
  }, [userId]);

  const api = useMemo<StoreCtx>(() => {
    return {
      state,
      dispatch,
      nuvem: supabaseEnabled,

      async login(email, senha) {
        if (supabaseEnabled) {
          const res = await cloudSignIn(email, senha);
          if (!res.ok || !res.userId) return { ok: false, error: res.error };
          const data = await cloudLoad(res.userId);
          const base = data ?? { ...cloudEstadoInicial(usuarioMinimo(res.userId, email)), categorias: seedCategorias(res.userId) };
          dispatch({ type: "HYDRATE", payload: { ...emptyState, ...base, users: [] } });
          return { ok: true };
        }
        const u = state.users.find((x) => x.email.toLowerCase() === email.toLowerCase());
        if (!u) return { ok: false, error: "E-mail não cadastrado." };
        if (u.senha_hash !== fakeHash(senha)) return { ok: false, error: "Senha incorreta." };
        dispatch({ type: "LOGIN", user: u });
        return { ok: true };
      },

      async register(data) {
        if (supabaseEnabled) {
          const res = await cloudSignUp(data.email, data.senha);
          if (!res.ok || !res.userId) return { ok: false, error: res.error };
          const user: User = {
            id: res.userId,
            email: data.email,
            senha_hash: "", // Auth do Supabase cuida da senha
            nome_negocio: data.nome_negocio,
            documento: data.documento,
            perfil: data.perfil,
            regime: data.regime,
            renda_mensal_centavos: data.renda_mensal_centavos,
            plano: "free",
            logo_url: null,
            created_at: new Date().toISOString(),
          };
          const inicial = { ...cloudEstadoInicial(user), categorias: seedCategorias(user.id) };
          await cloudSave(user.id, inicial);
          if (res.precisaConfirmar) {
            // Confirmação de e-mail ligada: não há sessão ainda.
            return { ok: true, aviso: "Confirme seu e-mail para acessar de qualquer máquina." };
          }
          dispatch({ type: "HYDRATE", payload: { ...emptyState, ...inicial, users: [] } });
          return { ok: true };
        }
        if (state.users.some((x) => x.email.toLowerCase() === data.email.toLowerCase()))
          return { ok: false, error: "E-mail já cadastrado." };
        const id = uid();
        const user: User = {
          id,
          email: data.email,
          senha_hash: fakeHash(data.senha),
          nome_negocio: data.nome_negocio,
          documento: data.documento,
          perfil: data.perfil,
          regime: data.regime,
          renda_mensal_centavos: data.renda_mensal_centavos,
          plano: "free",
          logo_url: null,
          created_at: new Date().toISOString(),
        };
        // Conta nova começa VAZIA — sem dados de demonstração.
        // Apenas categorias genéricas como estrutura para os formulários.
        dispatch({
          type: "REGISTER",
          user,
          seed: {
            categorias: seedCategorias(id),
            clientes: [],
            transacoes: [],
            impostos: [],
          },
        });
        return { ok: true };
      },

      logout() {
        if (supabaseEnabled) {
          void cloudSignOut();
          dispatch({ type: "HYDRATE", payload: { ...emptyState } });
          return;
        }
        dispatch({ type: "LOGOUT" });
      },
    };
  }, [state]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore deve ser usado dentro de <StoreProvider>");
  return ctx;
}

/** Transações do usuário logado */
export function useMinhasTransacoes(): Transacao[] {
  const { state } = useStore();
  return useMemo(
    () => (state.user ? state.transacoes.filter((t) => t.user_id === state.user!.id) : []),
    [state.transacoes, state.user]
  );
}

/** Despesas pessoais do dono logado */
export function useMinhasDespesasPessoais(): DespesaPessoal[] {
  const { state } = useStore();
  return useMemo(
    () => (state.user ? state.despesasPessoais.filter((d) => d.user_id === state.user!.id) : []),
    [state.despesasPessoais, state.user]
  );
}

/** Cenários salvos do usuário logado */
export function useMeusCenarios(): Cenario[] {
  const { state } = useStore();
  return useMemo(
    () => (state.user ? state.cenarios.filter((c) => c.user_id === state.user!.id) : []),
    [state.cenarios, state.user]
  );
}

/** Dívidas do usuário logado */
export function useMinhasDividas(): Divida[] {
  const { state } = useStore();
  return useMemo(
    () => (state.user ? state.dividas.filter((d) => d.user_id === state.user!.id) : []),
    [state.dividas, state.user]
  );
}
