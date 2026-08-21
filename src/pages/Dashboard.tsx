import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Coins,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  FileText,
  Download,
  AlertTriangle,
  Clock,
  Info,
} from "lucide-react";
import { Sparkles, SearchCheck, Brain, Siren, ArrowRight, Landmark, ShieldCheck, Compass } from "lucide-react";
import { useStore, useMinhasTransacoes, useMinhasDividas } from "@/lib/store";
import { brl, brlReais, dataBR, pct } from "@/lib/format";
import { gerarPrevisao, varianceUltimosMeses, detectarVieses, detectarFuga } from "@/lib/utils";
import { resumoDividas, saudeDivida } from "@/lib/divida";
import { rodarCopiloto } from "@/lib/copiloto";
import { Card, Pill, SectionTitle } from "@/components/ui";
import { Reveal, Stagger, StaggerItem, AnimatedNumber, Lift } from "@/components/motion";
import { FluxoChart, ReceitaDespesaChart, CategoriaDonut } from "@/components/Charts";

const CAT_COR: Record<string, string> = {
  Aluguel: "#8B5CF6",
  Salários: "#2F6FED",
  Insumos: "#10B981",
  Energia: "#E5A50A",
  Marketing: "#E5484D",
  Impostos: "#64748B",
  Outros: "#64748B",
};

type Periodo = "dia" | "semana" | "mes" | "ano";
const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "dia", label: "Dia" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "ano", label: "Ano" },
];

function inicioPeriodo(p: Periodo): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === "dia") return d;
  if (p === "semana") {
    d.setDate(d.getDate() - d.getDay());
    return d;
  }
  if (p === "mes") return new Date(d.getFullYear(), d.getMonth(), 1);
  return new Date(d.getFullYear(), 0, 1);
}

/** Início do período imediatamente anterior (para calcular variação real). */
function inicioPeriodoAnterior(p: Periodo): Date {
  const d = inicioPeriodo(p);
  if (p === "dia") d.setDate(d.getDate() - 1);
  else if (p === "semana") d.setDate(d.getDate() - 7);
  else if (p === "mes") d.setMonth(d.getMonth() - 1);
  else d.setFullYear(d.getFullYear() - 1);
  return d;
}

/** Variação percentual honesta entre dois valores (null quando não há base). */
function delta(atual: number, anterior: number): { pct: number; up: boolean } | null {
  if (anterior === 0) return atual === 0 ? null : { pct: 100, up: atual > 0 };
  const v = ((atual - anterior) / Math.abs(anterior)) * 100;
  return { pct: v, up: v >= 0 };
}

export default function Dashboard() {
  const { state } = useStore();
  const txs = useMinhasTransacoes();
  const dividas = useMinhasDividas();
  const user = state.user!;
  const [periodo, setPeriodo] = useState<Periodo>("mes");

  const dividaResumo = useMemo(() => resumoDividas(dividas, user.renda_mensal_centavos ?? 0, user.perfil ?? "pf"), [dividas, user]);
  const dividaSaude = useMemo(() => saudeDivida(dividaResumo), [dividaResumo]);
  const copiloto = useMemo(() => rodarCopiloto(txs, dividas, user.perfil ?? "pf", user.renda_mensal_centavos ?? 0), [txs, dividas, user]);
  const proximaAcao = copiloto.proximaAcao && copiloto.proximaAcao.gravidade !== "positivo" ? copiloto.proximaAcao : null;

  const resumo = useMemo(() => {
    const inicio = inicioPeriodo(periodo);
    const anteriorInicio = inicioPeriodoAnterior(periodo);
    const soma = (de: Date, ate: Date) => {
      let receita = 0,
        despesa = 0;
      for (const t of txs) {
        const d = new Date(t.data);
        if (d < de || d >= ate) continue;
        if (t.tipo === "receita") receita += t.valor_centavos;
        else despesa += t.valor_centavos;
      }
      const lucro = receita - despesa;
      return { receita, despesa, lucro, margem: receita > 0 ? (lucro / receita) * 100 : 0 };
    };
    const atual = soma(inicio, new Date(8640000000000000));
    const anterior = soma(anteriorInicio, inicio);
    return { ...atual, anterior };
  }, [txs, periodo]);

  const fluxo = useMemo(() => {
    const hoje = new Date();
    const dias: { dia: string; saldo: number }[] = [];
    let acumulado = 0;
    const janelaInicio = new Date(hoje);
    janelaInicio.setDate(hoje.getDate() - 29);
    for (const t of txs) if (new Date(t.data) < janelaInicio) acumulado += t.tipo === "receita" ? t.valor_centavos : -t.valor_centavos;
    for (let d = 29; d >= 0; d--) {
      const dia = new Date(hoje);
      dia.setDate(hoje.getDate() - d);
      const iso = dia.toISOString().slice(0, 10);
      for (const t of txs) if (t.data === iso) acumulado += t.tipo === "receita" ? t.valor_centavos : -t.valor_centavos;
      dias.push({ dia: `${String(dia.getDate()).padStart(2, "0")}/${String(dia.getMonth() + 1).padStart(2, "0")}`, saldo: acumulado / 100 });
    }
    return dias;
  }, [txs]);

  const mes = new Date().toISOString().slice(0, 7);
  const porSemana = useMemo(() => {
    const buckets = [0, 1, 2, 3, 4].map(() => ({ receita: 0, despesa: 0 }));
    for (const t of txs) {
      if (!t.data.startsWith(mes)) continue;
      const dia = parseInt(t.data.slice(8, 10));
      const w = Math.min(4, Math.floor((dia - 1) / 7));
      if (t.tipo === "receita") buckets[w].receita += t.valor_centavos;
      else buckets[w].despesa += t.valor_centavos;
    }
    return buckets.map((b, i) => ({ semana: `Sem ${i + 1}`, receita: b.receita / 100, despesa: b.despesa / 100 }));
  }, [txs, mes]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txs) {
      if (t.tipo !== "despesa" || !t.data.startsWith(mes)) continue;
      map.set(t.categoria, (map.get(t.categoria) ?? 0) + t.valor_centavos);
    }
    return [...map.entries()].map(([nome, v]) => ({ nome, valor: v / 100, cor: CAT_COR[nome] ?? "#64748B" })).sort((a, b) => b.valor - a.valor);
  }, [txs, mes]);

  const totalDespCat = porCategoria.reduce((a, b) => a + b.valor, 0) || 1;
  const saldoAtual = useMemo(() => txs.reduce((acc, t) => acc + (t.tipo === "receita" ? t.valor_centavos : -t.valor_centavos), 0), [txs]);
  const impostoPend = state.impostos.find((i) => i.user_id === user.id && i.status === "pendente");
  const razaoDespReceita = resumo.receita > 0 ? (resumo.despesa / resumo.receita) * 100 : 0;
  const recentes = useMemo(() => [...txs].sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 6), [txs]);

  // ---- Análises inteligentes (apenas leitura para os cards do dashboard) ----
  const previsao = useMemo(() => gerarPrevisao(txs, 30), [txs]);
  const variance = useMemo(() => varianceUltimosMeses(txs), [txs]);
  const vieses = useMemo(() => detectarVieses(txs), [txs]);
  const fugas = useMemo(() => detectarFuga(txs).slice(0, 3), [txs]);
  const varianceRelevante = variance && Math.abs(variance.delta_pct) >= 10 ? variance : null;
  const temInsights = previsao.dia_saldo_negativo || varianceRelevante || vieses.length > 0 || fugas.length > 0;

  const a = resumo.anterior;
  const kpis = [
    { label: "Receita acumulada", value: resumo.receita, fmt: (n: number) => brl(n), icon: TrendingUp, tone: "pos" as const, delta: delta(resumo.receita, a.receita), goodUp: true },
    { label: "Despesa acumulada", value: resumo.despesa, fmt: (n: number) => brl(n), icon: TrendingDown, tone: "crit" as const, delta: delta(resumo.despesa, a.despesa), goodUp: false },
    { label: "Lucro líquido", value: resumo.lucro, fmt: (n: number) => brl(n), icon: Coins, tone: "info" as const, delta: delta(resumo.lucro, a.lucro), goodUp: true },
    { label: "Margem operacional", value: resumo.margem, fmt: (n: number) => pct(n), icon: Percent, tone: "gold" as const, delta: delta(resumo.margem, a.margem), goodUp: true },
  ];

  const iconTone: Record<string, string> = {
    pos: "bg-[color-mix(in_srgb,var(--pos)_18%,transparent)] text-pos",
    crit: "bg-[color-mix(in_srgb,var(--crit)_16%,transparent)] text-crit",
    info: "bg-[color-mix(in_srgb,var(--blue)_18%,transparent)] text-blue-lift",
    gold: "bg-[color-mix(in_srgb,var(--gold)_20%,transparent)] text-gold",
  };

  return (
    <div>
      <Reveal>
        <div
          className="relative mb-5 overflow-hidden rounded-lg border border-line p-6"
          style={{
            background:
              "radial-gradient(120% 140% at 88% -20%, var(--sky-1), transparent 55%), radial-gradient(90% 120% at 100% 120%, var(--sky-2), transparent 60%), linear-gradient(180deg, var(--surface), var(--bg-2))",
          }}
        >
          <svg className="animate-spin-slow pointer-events-none absolute -right-10 -top-20 h-80 w-80 opacity-50" viewBox="0 0 300 300" aria-hidden="true">
            <g fill="none" stroke="#2E86E6" opacity=".5">
              <circle cx="150" cy="150" r="120" strokeWidth="1" />
              <circle cx="150" cy="150" r="88" strokeWidth="1" />
              <ellipse cx="150" cy="150" rx="140" ry="52" strokeWidth="1" stroke="#C9A24B" opacity=".5" />
              <ellipse cx="150" cy="150" rx="140" ry="52" strokeWidth="1" transform="rotate(60 150 150)" />
            </g>
          </svg>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[2.5px] text-gold-soft">
                Dashboard Executivo · {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </div>
              <h1 className="mt-1.5 font-serif-display text-[26px] font-bold" style={{ textWrap: "balance" }}>
                Olá, {user.nome_negocio}. O tempo está a seu favor.
              </h1>
              <p className="mt-1 max-w-[60ch] text-fg-muted">
                Lucro de <b className="text-fg">{brl(resumo.lucro)}</b> no período.
                {impostoPend && (
                  <>
                    {" "}Faltam <b className="text-gold-soft">{diasPara(impostoPend.vencimento)} dias</b> para o vencimento do DAS.
                  </>
                )}
              </p>
            </div>
            {/* Seletor de período (melhoria: filtra os KPIs) */}
            <div className="flex rounded-full border border-line bg-surface p-1">
              {PERIODOS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriodo(p.id)}
                  className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    periodo === p.id ? "bg-blue text-white" : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link to="/transacoes?novo=receita" className="inline-flex items-center gap-2 rounded-md bg-blue px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--blue)] transition hover:bg-blue-lift">
              <Plus size={16} /> Receita
            </Link>
            <Link to="/transacoes?novo=despesa" className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-[13px] font-semibold transition hover:border-[color:var(--ring)] hover:bg-surface-2">
              <Minus size={16} /> Despesa
            </Link>
            <Link to="/dividas" className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-[13px] font-semibold transition hover:border-[color:var(--ring)] hover:bg-surface-2">
              <Landmark size={16} /> Dívidas
            </Link>
            <Link to="/notas-fiscais" className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-[13px] font-semibold transition hover:border-[color:var(--ring)] hover:bg-surface-2">
              <FileText size={16} /> Emitir recibo
            </Link>
            <Link to="/relatorios" className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-[13px] font-semibold transition hover:border-[color:var(--ring)] hover:bg-surface-2">
              <Download size={16} /> Exportar
            </Link>
          </div>
        </div>
      </Reveal>

      {proximaAcao && (
        <Reveal>
          <Link to="/copiloto" className="mb-4 block">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[color-mix(in_srgb,#8b5cf6_35%,var(--line))] bg-[color-mix(in_srgb,#8b5cf6_8%,var(--surface))] p-4 transition hover:border-[#a78bfa]">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[color-mix(in_srgb,#8b5cf6_20%,transparent)] text-[#a78bfa]"><Compass size={20} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[10.5px] font-semibold uppercase tracking-[2px] text-[#a78bfa]">Kairós · próxima melhor ação</div>
                <div className="truncate text-[14px] font-semibold">{proximaAcao.titulo}</div>
              </div>
              {proximaAcao.impactoReais > 0 && <span className="hidden text-[12.5px] text-fg-muted sm:inline">~<b className="text-pos">{brl(proximaAcao.impactoReais)}{proximaAcao.periodo === "mes" ? "/mês" : ""}</b></span>}
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12.5px] font-semibold text-blue-lift">{proximaAcao.acao} <ArrowRight size={14} /></span>
            </div>
          </Link>
        </Reveal>
      )}

      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <StaggerItem key={k.label}>
              <Lift>
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-fg-muted">{k.label}</span>
                    <span className={`grid h-9 w-9 place-items-center rounded-[10px] ${iconTone[k.tone]}`}>
                      <Icon size={18} />
                    </span>
                  </div>
                  <div className="mt-3 font-serif-display text-[26px] font-bold tracking-[-0.4px] tnum">
                    <AnimatedNumber value={k.value} format={k.fmt} />
                  </div>
                  {k.delta ? (
                    (() => {
                      const bom = k.delta.up === k.goodUp;
                      return (
                        <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold ${bom ? "bg-[color-mix(in_srgb,var(--pos)_15%,transparent)] text-pos" : "bg-[color-mix(in_srgb,var(--crit)_15%,transparent)] text-crit"}`}>
                          {k.delta.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {k.delta.pct >= 0 ? "+" : ""}{k.delta.pct.toFixed(1)}%
                          <span className="font-normal text-fg-dim">vs período anterior</span>
                        </span>
                      );
                    })()
                  ) : (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[12px] font-medium text-fg-dim">
                      sem histórico para comparar
                    </span>
                  )}
                </Card>
              </Lift>
            </StaggerItem>
          );
        })}
      </Stagger>

      {dividas.length > 0 && (
        <Reveal delay={0.05}>
          <Link to="/dividas" className="mt-4 block">
            <Card className="p-5 transition hover:border-[color:var(--ring)]">
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-[color-mix(in_srgb,var(--crit)_16%,transparent)] text-crit"><Landmark size={22} /></span>
                  <div>
                    <div className="flex items-center gap-2"><h3 className="text-[15px] font-semibold">Central de Dívidas</h3><Pill tone={dividaSaude.faixa === "critico" ? "crit" : dividaSaude.faixa === "atencao" ? "warn" : dividaSaude.faixa === "saudavel" ? "pos" : "info"}>{dividaSaude.label}</Pill></div>
                    <p className="text-[12px] text-fg-dim">Plano de quitação e comprometimento de renda</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-wrap items-center justify-end gap-x-7 gap-y-2 text-right">
                  <div><div className="text-[11px] text-fg-dim">Total devedor</div><div className="font-serif-display text-[18px] font-bold tnum text-crit">{brl(dividaResumo.totalSaldo)}</div></div>
                  <div><div className="text-[11px] text-fg-dim">Comprometimento</div><div className={`font-serif-display text-[18px] font-bold tnum ${dividaResumo.comprometimentoPct > dividaResumo.tetoPct ? "text-crit" : "text-pos"}`}>{dividaResumo.comprometimentoPct.toFixed(0)}%</div></div>
                  <div className="flex items-center gap-2"><ShieldCheck size={16} style={{ color: dividaSaude.cor }} /><div><div className="text-[11px] text-fg-dim">Saúde</div><div className="font-serif-display text-[18px] font-bold tnum" style={{ color: dividaSaude.cor }}>{dividaSaude.score}</div></div></div>
                  <ArrowRight size={18} className="text-fg-dim" />
                </div>
              </div>
            </Card>
          </Link>
        </Reveal>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Reveal delay={0.05}>
          <Card className="p-5">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h3 className="text-[15px] font-semibold">Fluxo de caixa</h3>
                <p className="text-[12px] text-fg-dim">Saldo diário · últimos 30 dias</p>
              </div>
              <Pill tone="info">Saldo {brl(saldoAtual)}</Pill>
            </div>
            <FluxoChart data={fluxo} />
          </Card>
        </Reveal>
        <Reveal delay={0.1}>
          <Card className="p-5">
            <div className="mb-2">
              <h3 className="text-[15px] font-semibold">Receita × Despesa</h3>
              <p className="text-[12px] text-fg-dim">Por semana · mês atual</p>
            </div>
            <ReceitaDespesaChart data={porSemana} />
            <div className="mt-2 flex gap-4 text-[12px] text-fg-muted">
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-blue-lift" /> Receita</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-gold" /> Despesa</span>
            </div>
          </Card>
        </Reveal>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Reveal delay={0.05}>
          <Card className="p-5">
            <div className="mb-2">
              <h3 className="text-[15px] font-semibold">Despesa por categoria</h3>
              <p className="text-[12px] text-fg-dim">{brlReais(totalDespCat)} no mês</p>
            </div>
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="w-full max-w-[200px]">
                <CategoriaDonut data={porCategoria} />
              </div>
              <div className="flex w-full flex-1 flex-col gap-2">
                {porCategoria.map((c) => (
                  <div key={c.nome} className="flex items-center gap-2.5 text-[12.5px]">
                    <i className="h-2.5 w-2.5 flex-none rounded-sm" style={{ background: c.cor }} />
                    <span className="text-fg-muted">{c.nome}</span>
                    <b className="ml-auto tnum">{Math.round((c.valor / totalDespCat) * 100)}%</b>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.1}>
          <Card className="p-5">
            <div className="mb-3">
              <h3 className="text-[15px] font-semibold">Alertas do Kronos</h3>
              <p className="text-[12px] text-fg-dim">O que exige sua atenção</p>
            </div>
            <div className="flex flex-col gap-2.5">
              {saldoAtual < 100000 && (
                <AlertRow tone="crit" icon={<AlertTriangle size={17} />} title="Saldo em caixa baixo" pill={<Pill tone="crit">Crítico</Pill>}>
                  Saldo de <b className="text-fg">{brl(saldoAtual)}</b> abaixo do mínimo de R$ 1.000.
                </AlertRow>
              )}
              {impostoPend && (
                <AlertRow tone="warn" icon={<Clock size={17} />} title={`DAS vence em ${diasPara(impostoPend.vencimento)} dias`} pill={<Pill tone="warn">Vencimento</Pill>}>
                  Guia de <b className="text-fg">{brl(impostoPend.valor_centavos)}</b> vence em <b>{dataBR(impostoPend.vencimento)}</b>.
                </AlertRow>
              )}
              <AlertRow
                tone={razaoDespReceita > 70 ? "warn" : "info"}
                icon={<Info size={17} />}
                title={`Despesa em ${pct(razaoDespReceita)} da receita`}
                pill={<Pill tone={razaoDespReceita > 70 ? "warn" : "info"}>{razaoDespReceita > 70 ? "Atenção" : "Saudável"}</Pill>}
              >
                {razaoDespReceita > 70 ? "Acima do limite de 70%. Reveja custos." : "Abaixo do limite de 70%. Boa margem — mantenha o ritmo."}
              </AlertRow>
            </div>
          </Card>
        </Reveal>
      </div>

      {temInsights && (
        <>
          <SectionTitle action={<Link to="/analises/previsao" className="whitespace-nowrap text-[12.5px] font-semibold text-blue-lift">Ver análises →</Link>}>
            Análises inteligentes
          </SectionTitle>
          <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {previsao.dia_saldo_negativo && (
              <StaggerItem>
                <Link to="/analises/previsao" className="block">
                  <Card className="border-[color-mix(in_srgb,var(--warn)_40%,var(--line))] p-4 transition hover:border-[color:var(--warn)]">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[color-mix(in_srgb,var(--warn)_18%,transparent)] text-warn"><Sparkles size={18} /></span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between"><h4 className="text-[13.5px] font-semibold">Previsão de caixa</h4><Pill tone="warn">Atenção</Pill></div>
                        <p className="mt-0.5 text-[12.5px] text-fg-muted">O saldo pode ficar <b className="text-crit">negativo em {dataBR(previsao.dia_saldo_negativo)}</b>. Antecipe recebimentos ou segure despesas.</p>
                      </div>
                      <ArrowRight size={16} className="mt-1 flex-none text-fg-dim" />
                    </div>
                  </Card>
                </Link>
              </StaggerItem>
            )}
            {varianceRelevante && (
              <StaggerItem>
                <Link to="/analises/variance" className="block">
                  <Card className="p-4 transition hover:border-[color:var(--ring)]">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[color-mix(in_srgb,var(--gold)_20%,transparent)] text-gold"><SearchCheck size={18} /></span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between"><h4 className="text-[13.5px] font-semibold">O que mudou?</h4><Pill tone={varianceRelevante.delta_lucro >= 0 ? "pos" : "crit"}>{varianceRelevante.delta_pct >= 0 ? "+" : ""}{varianceRelevante.delta_pct.toFixed(0)}%</Pill></div>
                        <p className="mt-0.5 text-[12.5px] text-fg-muted">Lucro {varianceRelevante.delta_lucro >= 0 ? "subiu" : "caiu"} vs mês anterior. Causa principal: <b className="text-fg">{varianceRelevante.culpado}</b>.</p>
                      </div>
                      <ArrowRight size={16} className="mt-1 flex-none text-fg-dim" />
                    </div>
                  </Card>
                </Link>
              </StaggerItem>
            )}
            {vieses.length > 0 && (
              <StaggerItem>
                <Link to="/analises/vieses" className="block">
                  <Card className="p-4 transition hover:border-[color:var(--ring)]">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[color-mix(in_srgb,#8b5cf6_20%,transparent)] text-[#a78bfa]"><Brain size={18} /></span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between"><h4 className="text-[13.5px] font-semibold">{vieses[0].vies}</h4><Pill tone="info">Insight</Pill></div>
                        <p className="mt-0.5 text-[12.5px] text-fg-muted">{vieses[0].realidade}</p>
                      </div>
                      <ArrowRight size={16} className="mt-1 flex-none text-fg-dim" />
                    </div>
                  </Card>
                </Link>
              </StaggerItem>
            )}
            {fugas.length > 0 && (
              <StaggerItem>
                <Link to="/analises/detectar-fuga" className="block">
                  <Card className="p-4 transition hover:border-[color:var(--ring)]">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[color-mix(in_srgb,var(--crit)_16%,transparent)] text-crit"><Siren size={18} /></span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between"><h4 className="text-[13.5px] font-semibold">Próximas ações sugeridas</h4><Pill tone="crit">{fugas.length}</Pill></div>
                        <ul className="mt-1 space-y-0.5 text-[12.5px] text-fg-muted">
                          {fugas.map((f) => (
                            <li key={f.id} className="flex items-center justify-between gap-2"><span className="truncate">{f.titulo}</span><b className="flex-none text-pos">{brl(f.economia_potencial)}</b></li>
                          ))}
                        </ul>
                      </div>
                      <ArrowRight size={16} className="mt-1 flex-none text-fg-dim" />
                    </div>
                  </Card>
                </Link>
              </StaggerItem>
            )}
          </Stagger>
        </>
      )}

      <SectionTitle action={<Link to="/transacoes" className="whitespace-nowrap text-[12.5px] font-semibold text-blue-lift">Ver todos →</Link>}>
        Últimos lançamentos
      </SectionTitle>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ minWidth: 520 }}>
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wide text-fg-dim">
                <th className="px-3 py-2.5 text-left font-semibold">Descrição</th>
                <th className="px-3 py-2.5 text-left font-semibold">Data</th>
                <th className="px-3 py-2.5 text-left font-semibold">Categoria</th>
                <th className="px-3 py-2.5 text-right font-semibold">Valor</th>
                <th className="px-3 py-2.5 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentes.map((t) => (
                <tr key={t.id} className="border-b border-line-soft transition hover:bg-surface-2">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`grid h-7 w-7 place-items-center rounded-md ${t.tipo === "receita" ? "bg-[color-mix(in_srgb,var(--pos)_14%,transparent)] text-pos" : "bg-[color-mix(in_srgb,var(--crit)_12%,transparent)] text-crit"}`}>
                        {t.tipo === "receita" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </span>
                      <span className="font-medium">{t.descricao}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 tnum text-fg-muted">{dataBR(t.data)}</td>
                  <td className="px-3 py-3 text-fg-muted">{t.categoria}</td>
                  <td className={`px-3 py-3 text-right font-semibold tnum ${t.tipo === "receita" ? "text-pos" : "text-crit"}`}>
                    {t.tipo === "receita" ? "+" : "−"} {brl(t.valor_centavos, false)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Pill tone={t.status === "pago" ? "pos" : "warn"}>{t.status}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AlertRow({ tone, icon, title, pill, children }: { tone: "crit" | "warn" | "info"; icon: React.ReactNode; title: string; pill: React.ReactNode; children: React.ReactNode }) {
  const bg: Record<string, string> = {
    crit: "bg-[color-mix(in_srgb,var(--crit)_16%,transparent)] text-crit",
    warn: "bg-[color-mix(in_srgb,var(--warn)_18%,transparent)] text-warn",
    info: "bg-[color-mix(in_srgb,var(--blue)_16%,transparent)] text-blue-lift",
  };
  const border = tone === "crit" ? "border-[color-mix(in_srgb,var(--crit)_45%,var(--line))]" : "border-line";
  return (
    <div className={`flex items-start gap-3 rounded-md border ${border} bg-surface-2 p-3.5`}>
      <span className={`grid h-8 w-8 flex-none place-items-center rounded-[9px] ${bg[tone]}`}>{icon}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-[13px] font-semibold">{title}</h4>
          <span className="ml-auto">{pill}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-fg-muted">{children}</p>
      </div>
    </div>
  );
}

function diasPara(iso: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((new Date(iso).getTime() - hoje.getTime()) / 86400000));
}
