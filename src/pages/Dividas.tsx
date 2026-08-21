import { useMemo, useState } from "react";
import {
  Landmark,
  Plus,
  Trash2,
  Pencil,
  Flame,
  Snowflake,
  TrendingDown,
  ShieldCheck,
  CalendarClock,
  Percent,
  Wallet,
  AlertTriangle,
  ArrowRight,
  Handshake,
  Trophy,
  Flag,
  ScanLine,
  Crown,
  Wallet as WalletIcon,
  Repeat,
  Star,
  Sparkles,
} from "lucide-react";
import { useStore, useMinhasDividas } from "@/lib/store";
import type { Divida, DividaTipo, DividaStatus } from "@/lib/types";
import {
  DIVIDA_TIPOS,
  PERFIS,
  resumoDividas,
  saudeDivida,
  compararEstrategias,
  simularRenegociacao,
  recomendacoesPorPerfil,
  melhoresTrocas,
  jurosMensal,
  pagamentoMinimo,
  type Metodo,
  type TrocaCredito,
} from "@/lib/divida";
import { calcularJornada, type Conquista } from "@/lib/jornada";
import { brl, brlReais, parseReaisToCentavos, uid } from "@/lib/format";
import { Card, Button, Field, Input, Select, Modal, Pill, EmptyState } from "@/components/ui";
import { AnaliseHeader, StatTile, Recomendacoes } from "@/components/analytics";
import { Reveal, Stagger, StaggerItem, ProgressBar } from "@/components/motion";
import { SerieChart } from "@/components/Charts";
import type { Recomendacao } from "@/lib/types";

// ---------- Gauge de saúde (semicírculo) ----------
function ScoreGauge({ score, cor }: { score: number; cor: string }) {
  const r = 62, cx = 80, cy = 80, C = Math.PI * r; // meia-volta
  const frac = Math.max(0, Math.min(100, score)) / 100;
  return (
    <svg viewBox="0 0 160 96" className="w-full" style={{ maxWidth: 220 }} role="img" aria-label={`Índice de saúde ${score} de 100`}>
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--line-soft)" strokeWidth="13" strokeLinecap="round" />
      <path
        d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={cor}
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray={`${(C * frac).toFixed(1)} ${C.toFixed(1)}`}
        style={{ transition: "stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <text x={cx} y={cy - 12} textAnchor="middle" className="tnum" fontSize="30" fontWeight="700" fill="var(--fg)">{score}</text>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="10" fill="var(--fg-dim)">de 100</text>
    </svg>
  );
}

const STATUS_LABEL: Record<DividaStatus, { label: string; tone: "pos" | "warn" | "crit" | "info" }> = {
  em_dia: { label: "Em dia", tone: "pos" },
  atrasada: { label: "Atrasada", tone: "crit" },
  renegociada: { label: "Renegociada", tone: "info" },
  quitada: { label: "Quitada", tone: "neutral" as "info" },
};

function mesesParaTexto(m: number): string {
  if (!Number.isFinite(m)) return "—";
  const anos = Math.floor(m / 12);
  const meses = m % 12;
  if (anos === 0) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  if (meses === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
  return `${anos}a ${meses}m`;
}

function dataLiberdade(meses: number): string {
  if (!Number.isFinite(meses)) return "—";
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

// ---------- Formulário de dívida ----------
interface FormState {
  credor: string;
  tipo: DividaTipo;
  saldo: string;
  taxa: string;
  parcela: string;
  parcelas_total: string;
  parcelas_pagas: string;
  vencimento_dia: string;
  garantia: string;
  status: DividaStatus;
}

const emptyForm: FormState = {
  credor: "", tipo: "cartao", saldo: "", taxa: "", parcela: "", parcelas_total: "",
  parcelas_pagas: "0", vencimento_dia: "10", garantia: "", status: "em_dia",
};

export default function Dividas() {
  const { state, dispatch } = useStore();
  const user = state.user!;
  const dividas = useMinhasDividas();
  const perfil = user.perfil ?? "pf";
  const perfilMeta = PERFIS[perfil];
  const renda = user.renda_mensal_centavos ?? 0;

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [metodo, setMetodo] = useState<Metodo>("avalanche");
  const [extra, setExtra] = useState<number>(0); // reais/mês

  const resumo = useMemo(() => resumoDividas(dividas, renda, perfil), [dividas, renda, perfil]);
  const saude = useMemo(() => saudeDivida(resumo), [resumo]);
  const comparacao = useMemo(() => compararEstrategias(dividas, extra * 100), [dividas, extra]);
  const recs = useMemo(() => recomendacoesPorPerfil(perfil, dividas, resumo), [perfil, dividas, resumo]);
  const escolhida = metodo === "avalanche" ? comparacao.avalanche : comparacao.neve;
  const jornada = useMemo(() => calcularJornada(dividas, extra * 100, resumo, metodo), [dividas, extra, resumo, metodo]);
  const trocas = useMemo(() => (resumo.maisCara ? melhoresTrocas(resumo.maisCara, perfil) : []), [resumo.maisCara, perfil]);

  // Série do gráfico — saldo restante mês a mês, amostrado (~24 pontos).
  const serie = useMemo(() => {
    const a = comparacao.avalanche.cronograma;
    const n = comparacao.neve.cronograma;
    const len = Math.max(a.length, n.length);
    if (len === 0) return [];
    const step = Math.max(1, Math.ceil(len / 24));
    const pts: Record<string, number | string>[] = [{ x: "hoje", avalanche: resumo.totalSaldo / 100, neve: resumo.totalSaldo / 100 }];
    for (let i = 0; i < len; i += step) {
      pts.push({
        x: `M${i + 1}`,
        avalanche: (a[Math.min(i, a.length - 1)]?.saldo ?? 0) / 100,
        neve: (n[Math.min(i, n.length - 1)]?.saldo ?? 0) / 100,
      });
    }
    return pts;
  }, [comparacao, resumo.totalSaldo]);

  function abrirNovo() {
    setEditId(null);
    setForm({ ...emptyForm, tipo: perfilMeta.tiposComuns[0] });
    setModalOpen(true);
  }
  function abrirEdicao(d: Divida) {
    setEditId(d.id);
    setForm({
      credor: d.credor, tipo: d.tipo,
      saldo: (d.saldo_devedor_centavos / 100).toString(),
      taxa: d.taxa_am.toString(),
      parcela: d.parcela_centavos ? (d.parcela_centavos / 100).toString() : "",
      parcelas_total: d.parcelas_total ? d.parcelas_total.toString() : "",
      parcelas_pagas: d.parcelas_pagas.toString(),
      vencimento_dia: d.vencimento_dia.toString(),
      garantia: d.garantia ?? "",
      status: d.status,
    });
    setModalOpen(true);
  }

  function salvar() {
    const saldo = parseReaisToCentavos(form.saldo);
    if (!form.credor.trim() || saldo <= 0) return;
    const base: Omit<Divida, "id" | "created_at"> = {
      user_id: user.id,
      credor: form.credor.trim(),
      tipo: form.tipo,
      saldo_devedor_centavos: saldo,
      taxa_am: Math.max(0, parseFloat(form.taxa.replace(",", ".")) || 0),
      parcela_centavos: form.parcela ? parseReaisToCentavos(form.parcela) : 0,
      parcelas_total: parseInt(form.parcelas_total) || 0,
      parcelas_pagas: parseInt(form.parcelas_pagas) || 0,
      vencimento_dia: Math.max(1, Math.min(28, parseInt(form.vencimento_dia) || 10)),
      garantia: form.garantia.trim() || null,
      status: form.status,
    };
    if (editId) {
      dispatch({ type: "UPDATE_DIVIDA", id: editId, patch: base });
    } else {
      dispatch({ type: "ADD_DIVIDA", divida: { ...base, id: uid(), created_at: new Date().toISOString() } });
    }
    setModalOpen(false);
  }

  const semRenda = renda <= 0;

  return (
    <div>
      <AnaliseHeader
        tone="crit"
        icon={<Landmark size={22} />}
        titulo="Central de Dívidas"
        descricao={`${perfilMeta.label} · ${perfilMeta.tagline}`}
        action={<Button variant="primary" onClick={abrirNovo}><Plus size={16} /> Nova dívida</Button>}
      />

      {dividas.length === 0 ? (
        <>
          <ContextoEndividamento />
          <EmptyState
            icon={<Landmark size={30} />}
            title="Nenhuma dívida cadastrada"
            desc="Cadastre cartão, cheque especial, empréstimos, financiamentos ou dívidas da empresa. O Kronos calcula juros, comprometimento de renda e o melhor caminho para quitar."
            action={<Button variant="primary" onClick={abrirNovo}><Plus size={16} /> Cadastrar primeira dívida</Button>}
          />
        </>
      ) : (
        <>
          {/* KPIs */}
          <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StaggerItem><StatTile label="Total devedor" value={resumo.totalSaldo} format={brl} tone="crit" icon={<TrendingDown size={16} />} /></StaggerItem>
            <StaggerItem><StatTile label="Parcelas / mês" value={resumo.parcelaMensal} format={brl} tone="gold" icon={<Wallet size={16} />} hint={`Juros ~ ${brl(resumo.jurosMensal)}/mês`} /></StaggerItem>
            <StaggerItem><StatTile label="Comprometimento" value={resumo.comprometimentoPct} format={(n) => `${n.toFixed(0)}%`} tone={resumo.comprometimentoPct > resumo.tetoPct ? "crit" : "pos"} icon={<Percent size={16} />} hint={`Teto saudável ${resumo.tetoPct}%`} /></StaggerItem>
            <StaggerItem><StatTile label="Livre de dívidas em" value={Number.isFinite(escolhida.meses) ? escolhida.meses : 0} format={(n) => (n > 0 ? mesesParaTexto(Math.round(n)) : "—")} tone="blue" icon={<CalendarClock size={16} />} hint={Number.isFinite(escolhida.meses) ? dataLiberdade(escolhida.meses) : "revise o orçamento"} /></StaggerItem>
          </Stagger>

          {/* Saúde + comprometimento */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
            <Reveal delay={0.05}>
              <Card className="flex flex-col items-center p-5">
                <h3 className="mb-1 flex items-center gap-2 self-start text-[15px] font-semibold"><ShieldCheck size={16} className="text-blue-lift" /> Saúde financeira</h3>
                <ScoreGauge score={saude.score} cor={saude.cor} />
                <Pill tone={saude.faixa === "critico" ? "crit" : saude.faixa === "atencao" ? "warn" : saude.faixa === "saudavel" ? "pos" : "info"}>{saude.label}</Pill>
                <div className="mt-4 w-full space-y-2.5">
                  {saude.fatores.map((f) => (
                    <div key={f.nome}>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-fg-muted">{f.nome}</span>
                        <span className="tnum text-fg-dim">{f.detalhe}</span>
                      </div>
                      <div className="mt-1"><ProgressBar pct={f.nota} color={f.nota >= 60 ? "var(--pos)" : f.nota >= 35 ? "var(--warn)" : "var(--crit)"} /></div>
                    </div>
                  ))}
                </div>
              </Card>
            </Reveal>

            <Reveal delay={0.1}>
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold">Comprometimento · {perfilMeta.rendaLabel}</h3>
                  {semRenda && <Pill tone="warn">Informe sua renda</Pill>}
                </div>
                {semRenda ? (
                  <p className="mt-3 text-[13px] text-fg-muted">
                    Cadastre sua {perfilMeta.rendaLabel.toLowerCase()} em <b>Configurações</b> para ver quanto das suas parcelas cabe no orçamento.
                  </p>
                ) : (
                  <>
                    <div className="mt-4 flex items-end gap-3">
                      <span className="font-serif-display text-[40px] font-bold leading-none tnum" style={{ color: resumo.comprometimentoPct > resumo.tetoPct ? "var(--crit)" : "var(--pos)" }}>
                        {resumo.comprometimentoPct.toFixed(0)}%
                      </span>
                      <span className="pb-1 text-[13px] text-fg-muted">das parcelas na renda · teto {resumo.tetoPct}%</span>
                    </div>
                    <div className="relative mt-4 h-3 w-full overflow-hidden rounded-full bg-[var(--line-soft)]">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, resumo.comprometimentoPct)}%`, background: resumo.comprometimentoPct > resumo.tetoPct ? "var(--crit)" : "var(--pos)" }} />
                      <div className="absolute top-0 h-full w-[2px] bg-fg" style={{ left: `${Math.min(100, resumo.tetoPct)}%` }} title={`Teto ${resumo.tetoPct}%`} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <MiniStat label={perfilMeta.rendaLabel} v={brl(renda)} />
                      <MiniStat label="Parcelas/mês" v={brl(resumo.parcelaMensal)} tone="crit" />
                      <MiniStat label="Folga de caixa" v={brl(resumo.sobra)} tone={resumo.sobra >= 0 ? "pos" : "crit"} />
                      <MiniStat label="Juros/mês" v={brl(resumo.jurosMensal)} tone="gold" />
                    </div>
                    {resumo.maisCara && (
                      <div className="mt-4 flex items-start gap-2.5 rounded-md border border-[color-mix(in_srgb,var(--crit)_40%,var(--line))] bg-[color-mix(in_srgb,var(--crit)_8%,transparent)] p-3">
                        <Flame size={17} className="mt-0.5 flex-none text-crit" />
                        <p className="text-[12.5px] text-fg-muted">
                          Dívida mais cara: <b className="text-fg">{resumo.maisCara.credor}</b> a <b className="text-crit">{resumo.maisCara.taxa_am.toFixed(1)}% a.m.</b>
                          {" "}({(Math.pow(1 + resumo.maisCara.taxa_am / 100, 12) - 1) * 100 >= 0 && <>~{((Math.pow(1 + resumo.maisCara.taxa_am / 100, 12) - 1) * 100).toFixed(0)}% ao ano</>}). É por ela que você deve começar.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </Card>
            </Reveal>
          </div>

          {/* Jornada de Liberdade (gamificação) */}
          <h2 className="mb-3 mt-7 flex items-center gap-3 font-serif-display text-[19px]">Jornada de Liberdade <span className="meander flex-1" /></h2>
          <Reveal>
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-fg-muted">{jornada.frase}</p>
                <Pill tone={jornada.progressoPct >= 100 ? "pos" : "info"}>{jornada.dividasQuitadas}/{jornada.dividasTotal} quitadas</Pill>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="text-fg-muted">Progresso — dívida amortizada</span>
                  <b className="tnum">{jornada.progressoPct.toFixed(0)}%</b>
                </div>
                <ProgressBar pct={jornada.progressoPct} color="var(--pos)" />
              </div>

              {/* Linha do tempo de marcos */}
              {jornada.marcos.filter((m) => !m.feito).length > 0 && (
                <div className="mt-5 overflow-x-auto">
                  <div className="flex items-stretch gap-2" style={{ minWidth: 480 }}>
                    {jornada.marcos.filter((m) => !m.feito).slice(0, 6).map((m, i, arr) => (
                      <div key={m.credor + m.mes} className="flex flex-1 items-center gap-2">
                        <div className={`flex-1 rounded-lg border p-3 text-center ${i === 0 ? "border-blue bg-[color-mix(in_srgb,var(--blue)_10%,transparent)]" : "border-line bg-surface-2"}`}>
                          <div className="grid place-items-center"><span className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold ${i === 0 ? "bg-blue text-white" : "bg-surface text-fg-muted"}`}>{m.ordem}</span></div>
                          <div className="mt-1.5 truncate text-[12px] font-semibold" title={m.credor}>{m.credor}</div>
                          <div className="text-[11px] text-fg-dim">{m.data}</div>
                        </div>
                        {i < arr.length - 1 && <ArrowRight size={14} className="flex-none text-fg-dim" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conquistas */}
              <div className="mt-5">
                <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-fg-dim">Conquistas · {jornada.conquistas.filter((c) => c.desbloqueada).length}/{jornada.conquistas.length}</div>
                <div className="flex flex-wrap gap-2.5">
                  {jornada.conquistas.map((c) => <ConquistaBadge key={c.id} c={c} />)}
                </div>
              </div>
            </Card>
          </Reveal>

          {/* Lista de dívidas */}
          <h2 className="mb-3 mt-7 flex items-center gap-3 font-serif-display text-[19px]">Suas dívidas <span className="meander flex-1" /></h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" style={{ minWidth: 720 }}>
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wide text-fg-dim">
                    <th className="px-3 py-2.5 text-left font-semibold">Credor</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Tipo</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Saldo</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Juros a.m.</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Parcela</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Status</th>
                    <th className="px-3 py-2.5 text-right font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...dividas].sort((a, b) => b.taxa_am - a.taxa_am).map((d) => {
                    const meta = DIVIDA_TIPOS[d.tipo];
                    const st = STATUS_LABEL[d.status];
                    return (
                      <tr key={d.id} className="border-b border-line-soft transition hover:bg-surface-2">
                        <td className="px-3 py-3">
                          <div className="font-medium">{d.credor}</div>
                          {d.garantia && <div className="text-[11px] text-fg-dim">garantia: {d.garantia}</div>}
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1.5">
                            {meta.toxicidade === 5 && <Flame size={13} className="text-crit" />}
                            <span className="text-fg-muted">{meta.label}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tnum">{brl(d.saldo_devedor_centavos, false)}</td>
                        <td className={`px-3 py-3 text-right tnum font-semibold ${meta.toxicidade >= 4 ? "text-crit" : "text-fg-muted"}`}>{d.taxa_am.toFixed(1)}%</td>
                        <td className="px-3 py-3 text-right tnum text-fg-muted">{d.parcela_centavos ? brl(d.parcela_centavos, false) : "rotativo"}</td>
                        <td className="px-3 py-3 text-center"><Pill tone={st.tone}>{st.label}</Pill></td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => abrirEdicao(d)} aria-label="Editar" className="grid h-8 w-8 place-items-center rounded-md text-fg-dim transition hover:bg-surface hover:text-blue-lift"><Pencil size={15} /></button>
                            <button onClick={() => { if (confirm(`Remover a dívida "${d.credor}"?`)) dispatch({ type: "DELETE_DIVIDA", id: d.id }); }} aria-label="Remover" className="grid h-8 w-8 place-items-center rounded-md text-fg-dim transition hover:bg-surface hover:text-crit"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Estratégia de quitação */}
          <h2 className="mb-3 mt-7 flex items-center gap-3 font-serif-display text-[19px]">Plano de quitação <span className="meander flex-1" /></h2>
          <Reveal>
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button onClick={() => setMetodo("avalanche")} className={`inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-[13px] font-semibold transition ${metodo === "avalanche" ? "border-crit bg-[color-mix(in_srgb,var(--crit)_12%,transparent)] text-crit" : "border-line text-fg-muted hover:bg-surface-2"}`}><Flame size={15} /> Avalanche</button>
                  <button onClick={() => setMetodo("neve")} className={`inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-[13px] font-semibold transition ${metodo === "neve" ? "border-blue bg-[color-mix(in_srgb,var(--blue)_12%,transparent)] text-blue-lift" : "border-line text-fg-muted hover:bg-surface-2"}`}><Snowflake size={15} /> Bola de neve</button>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[12.5px] text-fg-muted">Pagar a mais / mês</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={Math.max(500, Math.round(resumo.parcelaMensal / 100))} step={50} value={extra} onChange={(e) => setExtra(Number(e.target.value))} className="w-32 accent-[var(--blue)]" />
                    <span className="tnum w-24 text-right text-[13px] font-semibold">{brlReais(extra)}</span>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[12.5px] text-fg-muted">
                {metodo === "avalanche"
                  ? "Avalanche: ataca a dívida de maior juro primeiro. Paga menos juros no total — matematicamente ótimo."
                  : "Bola de neve: quita a menor dívida primeiro. Vitórias rápidas que mantêm a motivação."}
              </p>

              {escolhida.viavel ? (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MiniStat label="Tempo até quitar" v={mesesParaTexto(escolhida.meses)} tone="pos" big />
                    <MiniStat label="Livre em" v={dataLiberdade(escolhida.meses)} big />
                    <MiniStat label="Juros totais" v={brl(escolhida.totalJuros)} tone="crit" big />
                    <MiniStat label="Total pago" v={brl(escolhida.totalPago)} tone="gold" big />
                  </div>

                  <div className="mt-5">
                    <SerieChart
                      data={serie}
                      keys={[
                        { key: "avalanche", nome: "Avalanche", cor: "#E5484D" },
                        { key: "neve", nome: "Bola de neve", cor: "#4d8bf5" },
                      ]}
                    />
                  </div>

                  {/* Comparação */}
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface-2 p-3.5">
                    <ShieldCheck size={18} className="flex-none text-gold" />
                    <p className="flex-1 text-[12.5px] text-fg-muted">
                      Recomendado: <b className="text-fg">{comparacao.recomendado === "avalanche" ? "Avalanche" : "Bola de neve"}</b>. {comparacao.motivo}
                      {comparacao.economiaJuros > 0 && <> A Avalanche paga <b className="text-pos">{brl(comparacao.economiaJuros)}</b> menos em juros que a Bola de neve.</>}
                    </p>
                  </div>

                  {escolhida.ordem.length > 0 && (
                    <div className="mt-4">
                      <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-fg-dim">Ordem de quitação</div>
                      <div className="flex flex-wrap items-center gap-2">
                        {escolhida.ordem.map((o, i) => (
                          <span key={o.credor} className="inline-flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[12px]">
                              <b className="text-blue-lift">{i + 1}º</b> {o.credor} <span className="text-fg-dim">· mês {o.mesQuitacao}</span>
                            </span>
                            {i < escolhida.ordem.length - 1 && <ArrowRight size={13} className="text-fg-dim" />}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-4 flex items-start gap-3 rounded-md border border-[color-mix(in_srgb,var(--crit)_45%,var(--line))] bg-[color-mix(in_srgb,var(--crit)_8%,transparent)] p-4">
                  <AlertTriangle size={20} className="mt-0.5 flex-none text-crit" />
                  <div>
                    <h4 className="text-[14px] font-semibold text-crit">Orçamento não cobre os juros</h4>
                    <p className="mt-1 text-[12.5px] text-fg-muted">Com o pagamento atual, os juros crescem mais rápido que a amortização — a dívida nunca zera. É preciso <b>renegociar a taxa/prazo</b> (abaixo) ou aumentar o pagamento mensal antes de traçar o plano.</p>
                  </div>
                </div>
              )}
            </Card>
          </Reveal>

          {/* Trocas inteligentes de crédito */}
          {trocas.length > 0 && resumo.maisCara && (
            <>
              <h2 className="mb-3 mt-7 flex items-center gap-3 font-serif-display text-[19px]">Trocas inteligentes <span className="meander flex-1" /></h2>
              <Reveal>
                <Card className="p-5">
                  <div className="flex items-center gap-2 text-[13px] text-fg-muted">
                    <Repeat size={16} className="text-gold" /> Alternativas mais baratas que a sua dívida mais cara — <b className="text-fg">{resumo.maisCara.credor}</b> ({resumo.maisCara.taxa_am.toFixed(1)}% a.m.).
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {trocas.map((t) => <TrocaCard key={t.nome} t={t} />)}
                  </div>
                  <p className="mt-3 text-[11.5px] text-fg-dim">Estimativas educativas com base em taxas típicas de mercado. CET = custo efetivo total ao ano. Compare sempre a proposta real do credor.</p>
                </Card>
              </Reveal>
            </>
          )}

          <Renegociacao dividaMaisCara={resumo.maisCara} />

          {recs.length > 0 && (
            <div className="mt-7">
              <Recomendacoes
                titulo={`Recomendações para ${perfilMeta.label.toLowerCase()}`}
                itens={recs.map<Recomendacao>((r) => ({ titulo: r.titulo, detalhe: r.detalhe, impacto_reais: r.impacto, dificuldade: r.prioridade === "alta" ? "dificil" : r.prioridade === "media" ? "medio" : "facil" }))}
              />
            </div>
          )}
        </>
      )}

      {/* Modal de dívida */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Editar dívida" : "Nova dívida"} wide>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Credor / instituição" required>
            <Input value={form.credor} onChange={(e) => setForm({ ...form, credor: e.target.value })} placeholder="Ex.: Nubank, Caixa, Fornecedor X" />
          </Field>
          <Field label="Tipo de dívida" required>
            <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as DividaTipo })}>
              {perfilMeta.tiposComuns.map((t) => <option key={t} value={t}>{DIVIDA_TIPOS[t].label}</option>)}
              <optgroup label="Outros tipos">
                {(Object.keys(DIVIDA_TIPOS) as DividaTipo[]).filter((t) => !perfilMeta.tiposComuns.includes(t)).map((t) => <option key={t} value={t}>{DIVIDA_TIPOS[t].label}</option>)}
              </optgroup>
            </Select>
          </Field>
          <Field label="Saldo devedor (R$)" required hint="Quanto ainda falta pagar">
            <Input value={form.saldo} onChange={(e) => setForm({ ...form, saldo: e.target.value })} inputMode="decimal" placeholder="0,00" />
          </Field>
          <Field label="Juros ao mês (%)" required hint={`Típico p/ ${DIVIDA_TIPOS[form.tipo].label.toLowerCase()}: ~${DIVIDA_TIPOS[form.tipo].taxaTipicaAm}% a.m.`}>
            <Input value={form.taxa} onChange={(e) => setForm({ ...form, taxa: e.target.value })} inputMode="decimal" placeholder={String(DIVIDA_TIPOS[form.tipo].taxaTipicaAm)} />
          </Field>
          <Field label="Parcela mensal (R$)" hint="Deixe vazio se for rotativo (cartão/cheque especial)">
            <Input value={form.parcela} onChange={(e) => setForm({ ...form, parcela: e.target.value })} inputMode="decimal" placeholder="0,00" />
          </Field>
          <Field label="Dia do vencimento" hint="1 a 28">
            <Input value={form.vencimento_dia} onChange={(e) => setForm({ ...form, vencimento_dia: e.target.value })} inputMode="numeric" placeholder="10" />
          </Field>
          <Field label="Parcelas totais" hint="0 = sem prazo definido">
            <Input value={form.parcelas_total} onChange={(e) => setForm({ ...form, parcelas_total: e.target.value })} inputMode="numeric" placeholder="0" />
          </Field>
          <Field label="Parcelas já pagas">
            <Input value={form.parcelas_pagas} onChange={(e) => setForm({ ...form, parcelas_pagas: e.target.value })} inputMode="numeric" placeholder="0" />
          </Field>
          <Field label="Garantia (opcional)" hint="Veículo, imóvel, folha (consignado)…">
            <Input value={form.garantia} onChange={(e) => setForm({ ...form, garantia: e.target.value })} placeholder="—" />
          </Field>
          <Field label="Situação">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DividaStatus })}>
              <option value="em_dia">Em dia</option>
              <option value="atrasada">Atrasada</option>
              <option value="renegociada">Renegociada</option>
              <option value="quitada">Quitada</option>
            </Select>
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button variant="primary" onClick={salvar}>{editId ? "Salvar" : "Adicionar dívida"}</Button>
        </div>
      </Modal>
    </div>
  );
}

// ---------- Sub-componentes ----------

const CONQUISTA_ICONE = { flag: Flag, scan: ScanLine, flame: Flame, trophy: Trophy, half: Star, budget: WalletIcon, crown: Crown, shield: ShieldCheck } as const;
function ConquistaBadge({ c }: { c: Conquista }) {
  const Icon = CONQUISTA_ICONE[c.icone];
  return (
    <div
      title={c.descricao}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
        c.desbloqueada ? "border-gold bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] text-gold" : "border-line bg-surface-2 text-fg-dim opacity-70"
      }`}
    >
      <Icon size={14} className={c.desbloqueada ? "" : "opacity-60"} />
      {c.titulo}
    </div>
  );
}

function TrocaCard({ t }: { t: TrocaCredito }) {
  return (
    <div className={`rounded-lg border p-4 ${t.destaque ? "border-pos bg-[color-mix(in_srgb,var(--pos)_8%,transparent)]" : "border-line bg-surface-2"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold">{t.nome}</span>
          {t.destaque && <Pill tone="pos"><Sparkles size={11} /> Melhor troca</Pill>}
        </div>
        <span className="tnum text-[13px] font-bold text-pos">{t.taxaAm.toFixed(1)}% a.m.</span>
      </div>
      <p className="mt-1 text-[12px] text-fg-muted">{t.descricao}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-surface p-2"><div className="text-[10.5px] text-fg-dim">Parcela</div><div className="tnum text-[12.5px] font-semibold">{brl(t.parcela)}</div></div>
        <div className="rounded-md bg-surface p-2"><div className="text-[10.5px] text-fg-dim">CET a.a.</div><div className="tnum text-[12.5px] font-semibold">{t.cetAnual.toFixed(0)}%</div></div>
        <div className="rounded-md bg-surface p-2"><div className="text-[10.5px] text-fg-dim">Economia</div><div className="tnum text-[12.5px] font-semibold text-pos">{brl(t.economia)}</div></div>
      </div>
      <div className="mt-2 text-[11px] text-fg-dim">Requisito: {t.requisito}</div>
    </div>
  );
}

function MiniStat({ label, v, tone, big }: { label: string; v: string; tone?: "pos" | "crit" | "gold"; big?: boolean }) {
  const cor = tone === "pos" ? "text-pos" : tone === "crit" ? "text-crit" : tone === "gold" ? "text-gold" : "text-fg";
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3">
      <div className="text-[11px] text-fg-dim">{label}</div>
      <div className={`mt-0.5 font-semibold tnum ${cor} ${big ? "text-[16px] font-serif-display" : "text-[14px]"}`}>{v}</div>
    </div>
  );
}

function ContextoEndividamento() {
  return (
    <Reveal>
      <div className="mb-5 overflow-hidden rounded-lg border border-line p-6" style={{ background: "radial-gradient(120% 140% at 90% -20%, var(--sky-1), transparent 55%), linear-gradient(180deg, var(--surface), var(--bg-2))" }}>
        <div className="text-[11px] font-semibold uppercase tracking-[2.5px] text-gold-soft">Você não está sozinho</div>
        <h2 className="mt-1.5 max-w-[60ch] font-serif-display text-[22px] font-bold" style={{ textWrap: "balance" }}>
          ~80% das famílias brasileiras estão endividadas. Sair do vermelho é um plano, não sorte.
        </h2>
        <p className="mt-2 max-w-[62ch] text-[13.5px] text-fg-muted">
          O Kronos organiza todas as suas dívidas num lugar, mostra quanto os juros comem por mês e calcula — com Avalanche e Bola de Neve — o caminho mais rápido e barato até a liberdade financeira.
        </p>
      </div>
    </Reveal>
  );
}

function Renegociacao({ dividaMaisCara }: { dividaMaisCara: Divida | null }) {
  const [saldo, setSaldo] = useState<string>(dividaMaisCara ? (dividaMaisCara.saldo_devedor_centavos / 100).toFixed(0) : "10000");
  const [taxaAtual, setTaxaAtual] = useState<string>(dividaMaisCara ? dividaMaisCara.taxa_am.toString() : "12");
  const [taxaNova, setTaxaNova] = useState<string>("1.8");
  const [mesesAtual, setMesesAtual] = useState<string>("18");
  const [mesesNovo, setMesesNovo] = useState<string>("24");

  const res = useMemo(
    () => simularRenegociacao(parseReaisToCentavos(saldo), parseFloat(taxaAtual.replace(",", ".")) || 0, parseFloat(taxaNova.replace(",", ".")) || 0, parseInt(mesesAtual) || 1, parseInt(mesesNovo) || 1),
    [saldo, taxaAtual, taxaNova, mesesAtual, mesesNovo]
  );

  return (
    <>
      <h2 className="mb-3 mt-7 flex items-center gap-3 font-serif-display text-[19px]">Simulador de renegociação <span className="meander flex-1" /></h2>
      <Reveal>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[13px] text-fg-muted"><Handshake size={16} className="text-gold" /> Compare a dívida atual com uma proposta de portabilidade/renegociação.</div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Saldo (R$)"><Input value={saldo} onChange={(e) => setSaldo(e.target.value)} inputMode="decimal" /></Field>
              <Field label="Juros atual (% a.m.)"><Input value={taxaAtual} onChange={(e) => setTaxaAtual(e.target.value)} inputMode="decimal" /></Field>
              <Field label="Parcelas restantes"><Input value={mesesAtual} onChange={(e) => setMesesAtual(e.target.value)} inputMode="numeric" /></Field>
              <div />
              <Field label="Novo juros (% a.m.)"><Input value={taxaNova} onChange={(e) => setTaxaNova(e.target.value)} inputMode="decimal" /></Field>
              <Field label="Novo prazo (parcelas)"><Input value={mesesNovo} onChange={(e) => setMesesNovo(e.target.value)} inputMode="numeric" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-line bg-surface-2 p-4">
                <div className="text-[11px] uppercase tracking-wide text-fg-dim">Hoje</div>
                <div className="mt-1 text-[12px] text-fg-muted">Parcela</div>
                <div className="font-serif-display text-[20px] font-bold tnum text-crit">{brl(res.parcelaAntes)}</div>
                <div className="mt-2 text-[12px] text-fg-muted">Total a pagar</div>
                <div className="tnum font-semibold">{brl(res.totalAntes)}</div>
              </div>
              <div className="rounded-lg border border-blue bg-[color-mix(in_srgb,var(--blue)_8%,transparent)] p-4">
                <div className="text-[11px] uppercase tracking-wide text-blue-lift">Proposta</div>
                <div className="mt-1 text-[12px] text-fg-muted">Parcela</div>
                <div className="font-serif-display text-[20px] font-bold tnum text-pos">{brl(res.parcelaDepois)}</div>
                <div className="mt-2 text-[12px] text-fg-muted">Total a pagar</div>
                <div className="tnum font-semibold">{brl(res.totalDepois)}</div>
              </div>
              <div className="col-span-2 flex items-center justify-between rounded-lg border border-line bg-surface p-3.5">
                <span className="text-[13px] text-fg-muted">{res.economia >= 0 ? "Economia total" : "Custo adicional"}</span>
                <span className={`font-serif-display text-[20px] font-bold tnum ${res.economia >= 0 ? "text-pos" : "text-crit"}`}>{brl(Math.abs(res.economia))}</span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11.5px] text-fg-dim">
            Alongar o prazo reduz a parcela mas pode aumentar o total pago. O ganho real vem de <b>reduzir a taxa</b> (portabilidade, consignado, garantia).
          </p>
        </Card>
      </Reveal>
    </>
  );
}
