import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  TrendingUp,
  Landmark,
  LineChart,
  FileBarChart,
  Settings,
  Bell,
  Menu,
  Plus,
  LogOut,
  Sparkles,
  BarChart3,
  UserRound,
  Wallet,
  Siren,
  Tag,
  PieChart,
  Lightbulb,
  SearchCheck,
  Map as MapIcon,
  Brain,
  FlaskConical,
  Landmark as LandmarkIcon,
  Compass,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { PERFIS } from "@/lib/divida";
import { Emblem } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; group?: string }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/copiloto", label: "Copiloto Kairós", icon: Compass },
  { href: "/dividas", label: "Central de Dívidas", icon: LandmarkIcon },
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/notas-fiscais", label: "Notas Fiscais", icon: FileText },
  { href: "/viabilidade", label: "Viabilidade", icon: TrendingUp },
  { href: "/impostos", label: "Impostos", icon: Landmark, group: "Fiscal & Capital" },
  { href: "/investimentos", label: "Investimentos", icon: LineChart },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
  // Análises avançadas
  { href: "/analises/previsao", label: "Previsão", icon: Sparkles, group: "Análises Avançadas" },
  { href: "/analises/benchmarking", label: "Benchmarking", icon: BarChart3 },
  { href: "/analises/estilo-vida", label: "Meu Estilo de Vida", icon: UserRound },
  { href: "/analises/capital-giro", label: "Capital de Giro", icon: Wallet },
  { href: "/analises/detectar-fuga", label: "Detectar Fuga", icon: Siren },
  { href: "/analises/otimizar-preco", label: "Otimizar Preço", icon: Tag },
  { href: "/analises/mix-servicos", label: "Mix de Serviços", icon: PieChart },
  { href: "/analises/roi", label: "ROI de Investimento", icon: Lightbulb },
  { href: "/analises/variance", label: "Análise de Variance", icon: SearchCheck },
  { href: "/analises/decisao", label: "Mapa de Decisão", icon: MapIcon },
  { href: "/analises/vieses", label: "Vieses Cognitivos", icon: Brain },
  { href: "/analises/simulador", label: "Simulador Estratégico", icon: FlaskConical },
  { href: "/settings", label: "Configurações", icon: Settings, group: "Conta" },
];

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  const dias = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="ml-2 hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] text-fg-muted lg:flex">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-pos" />
      </span>
      <span>
        {dias[now.getDay()]}, {p(now.getDate())} {meses[now.getMonth()]} ·{" "}
      </span>
      <b className="tnum tracking-wide text-fg">
        {p(now.getHours())}:{p(now.getMinutes())}:{p(now.getSeconds())}
      </b>
    </div>
  );
}

export function AppShell() {
  const { state, logout } = useStore();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  const user = state.user!;
  const initials = user.nome_negocio.slice(0, 2).toUpperCase();
  const alertCount =
    state.impostos.filter((i) => i.user_id === user.id && i.status === "pendente").length +
    state.transacoes.filter((t) => t.user_id === user.id && t.status === "pendente").length;

  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[256px_1fr]">
      {open && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed z-50 flex h-dvh w-64 flex-col border-r border-line bg-gradient-to-b from-bg-2 to-bg transition-transform md:sticky md:top-0 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <Emblem />
          <div>
            <div className="font-serif-display text-[22px] font-bold uppercase leading-none tracking-[4px]">
              Kro<span className="text-gold">nos</span>
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[2.5px] text-fg-dim">Tempo &amp; Dinheiro</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.href}>
                {item.group && (
                  <div className="px-3 pb-1.5 pt-3.5 text-[10px] uppercase tracking-[1.6px] text-fg-dim">{item.group}</div>
                )}
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-[14px] font-medium transition ${
                      isActive
                        ? "bg-gradient-to-r from-[var(--sky-1)] to-transparent text-fg"
                        : "text-fg-muted hover:bg-surface hover:text-fg"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-gold" />}
                      <Icon size={18} strokeWidth={1.9} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 border-t border-line-soft px-4 py-3.5">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-blue to-gold text-[13px] font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1 text-[12px] leading-tight">
            <b className="block truncate font-semibold">{user.nome_negocio}</b>
            <span className="text-fg-dim">
              {user.perfil ? PERFIS[user.perfil].label : `Plano ${user.plano}`} · {user.regime.toUpperCase()}
            </span>
          </div>
          <button onClick={logout} aria-label="Sair" className="text-fg-dim transition hover:text-crit">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] px-4 py-3 backdrop-blur-md md:px-7">
          <button
            onClick={() => setOpen(true)}
            aria-label="Menu"
            className="grid h-10 w-10 place-items-center rounded-full border border-line text-fg-muted md:hidden"
          >
            <Menu size={19} />
          </button>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-[10px] border border-line bg-gradient-to-br from-[#1a2650] to-[#0c1330] font-serif-display text-[17px] font-bold text-gold">
              {initials.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <h1 className="text-[15px] font-semibold">{user.nome_negocio}</h1>
              <p className="text-[11.5px] text-fg-dim">
                {user.documento} · {user.regime.toUpperCase()}
              </p>
            </div>
          </div>
          <Clock />
          <div className="flex-1" />
          <ThemeToggle />
          <button
            className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-fg-muted transition hover:text-fg"
            aria-label="Alertas"
          >
            <Bell size={19} />
            {alertCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-bg bg-crit px-1 text-[10px] font-bold text-white">
                {alertCount}
              </span>
            )}
          </button>
          <Link
            to="/transacoes?novo=1"
            className="hidden items-center gap-2 rounded-md bg-blue px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--blue)] transition hover:bg-blue-lift sm:inline-flex"
          >
            <Plus size={16} /> Novo lançamento
          </Link>
        </header>

        <main className="px-4 pb-12 pt-5 md:px-7">
          <div key={location.pathname} className="kx-page">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
