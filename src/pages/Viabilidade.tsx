import { useMemo, useState } from "react";
import { TrendingUp, Target, CheckCircle2, XCircle } from "lucide-react";
import { Card, Field, Input, Pill } from "@/components/ui";
import { Tabs } from "@/components/Tabs";
import { AnimatedNumber, Reveal } from "@/components/motion";
import { SerieChart } from "@/components/Charts";
import { breakEven, viabilidade } from "@/lib/utils";
import { brlReais, pct } from "@/lib/format";

export default function Viabilidade() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--pos)_18%,transparent)] text-pos">
          <TrendingUp size={22} />
        </span>
        <div>
          <h1 className="font-serif-display text-[24px] font-bold">Viabilidade de negócio</h1>
          <p className="text-[13px] text-fg-muted">Ponto de equilíbrio, cenários e análise de metas.</p>
        </div>
      </div>
      <div className="mt-6">
        <Tabs
          tabs={[
            { id: "be", label: "Break-even", content: <BreakEvenCalc /> },
            { id: "cen", label: "Cenários", content: <CenariosCalc /> },
            { id: "via", label: "Análise de meta", content: <ViabCalc /> },
          ]}
        />
      </div>
    </div>
  );
}

function num(v: string): number {
  return parseFloat(v.replace(",", ".")) || 0;
}
function Row({ label, value, tone, strong }: { label: string; value: string; tone?: "pos" | "crit"; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line-soft py-2.5 last:border-0">
      <span className="text-[13px] text-fg-muted">{label}</span>
      <span className={`tnum ${strong ? "font-serif-display text-[18px] font-bold" : "text-[14px] font-semibold"} ${tone === "pos" ? "text-pos" : tone === "crit" ? "text-crit" : ""}`}>{value}</span>
    </div>
  );
}

function BreakEvenCalc() {
  const [fixo, setFixo] = useState("6000");
  const [preco, setPreco] = useState("50");
  const [variavel, setVariavel] = useState("15");
  const r = breakEven(num(fixo), num(preco), num(variavel));

  const serie = useMemo(() => {
    const pontos: Record<string, number | string>[] = [];
    const max = isFinite(r.pontoEquilibrio) ? Math.ceil(r.pontoEquilibrio * 2) : 200;
    const step = Math.max(1, Math.floor(max / 20));
    for (let q = 0; q <= max; q += step) {
      pontos.push({ x: `${q}`, Receita: q * num(preco), Custo: num(fixo) + q * num(variavel) });
    }
    return pontos;
  }, [fixo, preco, variavel, r.pontoEquilibrio]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
      <Card className="p-5">
        <h3 className="mb-4 text-[15px] font-semibold">Parâmetros</h3>
        <div className="flex flex-col gap-4">
          <Field label="Custo fixo mensal (R$)" hint="Aluguel, salários, etc."><Input inputMode="numeric" value={fixo} onChange={(e) => setFixo(e.target.value)} /></Field>
          <Field label="Preço de venda por serviço (R$)"><Input inputMode="numeric" value={preco} onChange={(e) => setPreco(e.target.value)} /></Field>
          <Field label="Custo variável por serviço (R$)" hint="Insumos consumidos por atendimento."><Input inputMode="numeric" value={variavel} onChange={(e) => setVariavel(e.target.value)} /></Field>
        </div>
        <div className="mt-5">
          <Row label="Margem de contribuição" value={brlReais(r.margemContribuicao)} tone={r.viavel ? "pos" : "crit"} />
          <Row label="Ponto de equilíbrio" value={isFinite(r.pontoEquilibrio) ? `${Math.ceil(r.pontoEquilibrio)} serviços/mês` : "—"} strong />
          <Row label="Receita no equilíbrio" value={isFinite(r.receitaEquilibrio) ? brlReais(r.receitaEquilibrio) : "—"} />
        </div>
        {!r.viavel && <div className="mt-3 rounded-md border border-crit/40 bg-[color-mix(in_srgb,var(--crit)_10%,transparent)] p-3 text-[12.5px] text-crit">O preço não cobre o custo variável — reveja preço ou custos.</div>}
      </Card>
      <Reveal delay={0.05}>
        <Card className="p-5">
          <h3 className="mb-1 text-[15px] font-semibold">Gráfico de break-even</h3>
          <p className="mb-3 text-[12px] text-fg-dim">Onde a receita cruza o custo total, você empata</p>
          <SerieChart data={serie} keys={[{ key: "Receita", nome: "Receita", cor: "#22C55E" }, { key: "Custo", nome: "Custo total", cor: "#EF4444" }]} />
        </Card>
      </Reveal>
    </div>
  );
}

function CenariosCalc() {
  const [fat, setFat] = useState("48000");
  const [desp, setDesp] = useState("31000");

  const base = { fat: num(fat), desp: num(desp) };
  const lucroBase = base.fat - base.desp;

  const cenarios = [
    { nome: "Aumentar preço +10%", fat: base.fat * 1.1, desp: base.desp },
    { nome: "Abrir 2ª unidade", fat: base.fat * 1.8, desp: base.desp * 1.7 + 4000 },
    { nome: "Contratar +1 funcionário", fat: base.fat * 1.25, desp: base.desp + 2200 },
  ].map((c) => ({ ...c, lucro: c.fat - c.desp, delta: c.fat - c.desp - lucroBase }));

  return (
    <div>
      <Card className="mb-4 p-5">
        <h3 className="mb-4 text-[15px] font-semibold">Cenário atual</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Faturamento mensal (R$)"><Input inputMode="numeric" value={fat} onChange={(e) => setFat(e.target.value)} /></Field>
          <Field label="Despesa mensal (R$)"><Input inputMode="numeric" value={desp} onChange={(e) => setDesp(e.target.value)} /></Field>
        </div>
        <div className="mt-3 text-[13px] text-fg-muted">Lucro atual: <b className="text-fg tnum">{brlReais(lucroBase)}</b></div>
      </Card>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cenarios.map((c, i) => (
          <Reveal key={c.nome} delay={i * 0.06}>
            <Card className="p-5">
              <h4 className="text-[14px] font-semibold">{c.nome}</h4>
              <div className="my-3 font-serif-display text-[24px] font-bold tnum">
                <AnimatedNumber value={c.lucro} format={(n) => brlReais(n)} />
              </div>
              <Pill tone={c.delta >= 0 ? "pos" : "crit"}>
                {c.delta >= 0 ? "+" : ""}{brlReais(c.delta)} vs atual
              </Pill>
              <div className="mt-3 text-[12px] text-fg-dim">
                Faturamento {brlReais(c.fat)} · Despesa {brlReais(c.desp)}
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function ViabCalc() {
  const [fat, setFat] = useState("48000");
  const [desp, setDesp] = useState("31000");
  const [meta, setMeta] = useState("40");
  const r = viabilidade(num(fat), num(desp), num(meta));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-4 text-[15px] font-semibold">Sua meta</h3>
        <div className="flex flex-col gap-4">
          <Field label="Faturamento atual (R$)"><Input inputMode="numeric" value={fat} onChange={(e) => setFat(e.target.value)} /></Field>
          <Field label="Despesa atual (R$)"><Input inputMode="numeric" value={desp} onChange={(e) => setDesp(e.target.value)} /></Field>
          <Field label="Meta de margem de lucro (%)"><Input inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value)} /></Field>
        </div>
      </Card>
      <Reveal delay={0.05}>
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className={`grid h-11 w-11 place-items-center rounded-xl ${r.atingeMeta ? "bg-[color-mix(in_srgb,var(--pos)_18%,transparent)] text-pos" : "bg-[color-mix(in_srgb,var(--warn)_18%,transparent)] text-warn"}`}>
              {r.atingeMeta ? <CheckCircle2 size={24} /> : <Target size={24} />}
            </span>
            <div>
              <div className="font-serif-display text-[18px] font-bold">{r.atingeMeta ? "Meta viável!" : "Ainda não atinge a meta"}</div>
              <div className="text-[12.5px] text-fg-muted">Margem atual: {pct(r.margemAtual)}</div>
            </div>
          </div>
          <Row label="Lucro atual" value={brlReais(r.lucroAtual)} tone={r.lucroAtual >= 0 ? "pos" : "crit"} />
          <Row label="Lucro necessário (meta)" value={brlReais(r.metaLucroValor)} strong />
          <Row label={r.atingeMeta ? "Excedente" : "Falta"} value={brlReais(Math.abs(r.gap))} tone={r.atingeMeta ? "pos" : "crit"} />
          <div className="mt-4 flex items-start gap-2 rounded-md border border-line bg-surface-2 p-3 text-[12.5px] text-fg-muted">
            {r.atingeMeta ? <CheckCircle2 size={16} className="mt-0.5 flex-none text-pos" /> : <XCircle size={16} className="mt-0.5 flex-none text-warn" />}
            {r.sugestao}
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
