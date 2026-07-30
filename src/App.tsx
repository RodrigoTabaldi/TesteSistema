import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { AuthLayout } from "@/components/AuthLayout";
import { Emblem } from "@/components/ui";

import Login from "@/src/pages/Login";
import Cadastro from "@/src/pages/Cadastro";
import Dashboard from "@/src/pages/Dashboard";
import Copiloto from "@/src/pages/Copiloto";
import Dividas from "@/src/pages/Dividas";
import Transacoes from "@/src/pages/Transacoes";
import NotasFiscais from "@/src/pages/NotasFiscais";
import Viabilidade from "@/src/pages/Viabilidade";
import Impostos from "@/src/pages/Impostos";
import Investimentos from "@/src/pages/Investimentos";
import Relatorios from "@/src/pages/Relatorios";
import Settings from "@/src/pages/Settings";

// Análises avançadas — carregadas sob demanda (code-splitting).
const Previsao = lazy(() => import("@/src/pages/analises/Previsao"));
const Benchmarking = lazy(() => import("@/src/pages/analises/Benchmarking"));
const EstiloVida = lazy(() => import("@/src/pages/analises/EstiloVida"));
const CapitalGiro = lazy(() => import("@/src/pages/analises/CapitalGiro"));
const DetectarFuga = lazy(() => import("@/src/pages/analises/DetectarFuga"));
const OtimizarPreco = lazy(() => import("@/src/pages/analises/OtimizarPreco"));
const MixServicos = lazy(() => import("@/src/pages/analises/MixServicos"));
const ROI = lazy(() => import("@/src/pages/analises/ROI"));
const Variance = lazy(() => import("@/src/pages/analises/Variance"));
const Decisao = lazy(() => import("@/src/pages/analises/Decisao"));
const Vieses = lazy(() => import("@/src/pages/analises/Vieses"));
const Simulador = lazy(() => import("@/src/pages/analises/Simulador"));

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg">
      <div className="animate-spin-slow">
        <Emblem size={52} />
      </div>
    </div>
  );
}

/** Fallback enquanto o chunk da análise carrega. */
function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="grid place-items-center py-24"><div className="animate-spin-slow"><Emblem size={40} /></div></div>}>
      {children}
    </Suspense>
  );
}

export function App() {
  const { state } = useStore();
  const location = useLocation();

  if (!state.hydrated) return <Splash />;

  const authed = !!state.user;

  return (
    <Routes>
      {/* Auth */}
      <Route
        path="/login"
        element={authed ? <Navigate to="/dashboard" replace /> : <AuthLayout><Login /></AuthLayout>}
      />
      <Route
        path="/cadastro"
        element={authed ? <Navigate to="/dashboard" replace /> : <AuthLayout><Cadastro /></AuthLayout>}
      />

      {/* App (protegido) */}
      {authed ? (
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/copiloto" element={<Copiloto />} />
          <Route path="/dividas" element={<Dividas />} />
          <Route path="/transacoes" element={<Transacoes />} />
          <Route path="/notas-fiscais" element={<NotasFiscais />} />
          <Route path="/viabilidade" element={<Viabilidade />} />
          <Route path="/impostos" element={<Impostos />} />
          <Route path="/investimentos" element={<Investimentos />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/settings" element={<Settings />} />
          {/* Análises avançadas */}
          <Route path="/analises/previsao" element={<Lazy><Previsao /></Lazy>} />
          <Route path="/analises/benchmarking" element={<Lazy><Benchmarking /></Lazy>} />
          <Route path="/analises/estilo-vida" element={<Lazy><EstiloVida /></Lazy>} />
          <Route path="/analises/capital-giro" element={<Lazy><CapitalGiro /></Lazy>} />
          <Route path="/analises/detectar-fuga" element={<Lazy><DetectarFuga /></Lazy>} />
          <Route path="/analises/otimizar-preco" element={<Lazy><OtimizarPreco /></Lazy>} />
          <Route path="/analises/mix-servicos" element={<Lazy><MixServicos /></Lazy>} />
          <Route path="/analises/roi" element={<Lazy><ROI /></Lazy>} />
          <Route path="/analises/variance" element={<Lazy><Variance /></Lazy>} />
          <Route path="/analises/decisao" element={<Lazy><Decisao /></Lazy>} />
          <Route path="/analises/vieses" element={<Lazy><Vieses /></Lazy>} />
          <Route path="/analises/simulador" element={<Lazy><Simulador /></Lazy>} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace state={{ from: location.pathname }} />} />
      )}

      <Route path="/" element={<Navigate to={authed ? "/dashboard" : "/login"} replace />} />
      <Route path="*" element={<Navigate to={authed ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}
