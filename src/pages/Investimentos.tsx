import { useState } from "react";
import { LineChart as LineIcon } from "lucide-react";
import { Card, Field, Input, Pill } from "@/components/ui";
import { Tabs } from "@/components/Tabs";
import { AnimatedNumber, Reveal } from "@/components/motion";
import { SerieChart } from "@/components/Charts";
import { jurosCompostos, financiamentoPrice, poderDeCompra, consorcio } from "@/lib/utils";
import { brlReais, pct } from "@/lib/format";

export default function Investimentos() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--blue)_18%,transparent)] text-blue-lift">
          <LineIcon size={22} />
        </span>
        <div>
          <h1 className="font-serif-display text-[24px] font-bold">Investimentos</h1>
          <p className="text-[13px] text-fg-muted">Simule juros, financiamento, inflação, consórcio e onde render mais.</p>
        </div>
      </div>

      <div className="mt-6">
        <Tabs
          tabs={[
            { id: "juros", label: "Juros compostos", content: <JurosCalc /> },
            { id: "onde", label: "Poupança × CDB × Tesouro", content: <OndeRender /> },
            { id: "fin", label: "Financiamento", content: <FinCalc /> },
            { id: "infla", label: "Inflação", content: <InflaCalc /> },
            { id: "cons", label: "Consórcio × Financiamento", content: <ConsorcioCalc /> },
          ]}
        />
      </div>
    </div>
  );
}

function num(v: string): number {
  return parseFloat(v.replace(",", ".")) || 0;
}

function ResultRow({ label, value, tone, strong }: { label: string; value: string; tone?: "pos" | "crit"; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line-soft py-2.5 last:border-0">
      <span className="text-[13px] text-fg-muted">{label}</span>
      <span className={`tnum ${strong ? "font-serif-display text-[18px] font-bold" : "text-[14px] font-semibold"} ${tone === "pos" ? "text-pos" : tone === "crit" ? "text-crit" : ""}`}>{value}</span>
    </div>
  );
}

function JurosCalc() {
  const [inicial, setInicial] = useState("5000");
  const [aporte, setAporte] = useState("500");
  const [taxa, setTaxa] = useState("8");
  const [meses, setMeses] = useState("60");
  const r = jurosCompostos(num(inicial), num(aporte), num(taxa), Math.round(num(meses)));
  const passo = Math.max(1, Math.floor(r.serie.length / 24));
  const serie = r.serie.filter((_, i) => i % passo === 0).map((p) => ({ x: `${p.mes}m`, Investido: Math.round(p.investido), Saldo: Math.round(p.saldo) }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
      <Card className="p-5">
        <h3 className="mb-4 text-[15px] font-semibold">Parâmetros</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor inicial (R$)"><Input inputMode="numeric" value={inicial} onChange={(e) => setInicial(e.target.value)} /></Field>
          <Field label="Aporte mensal (R$)"><Input inputMode="numeric" value={aporte} onChange={(e) => setAporte(e.target.value)} /></Field>
          <Field label="Taxa anual (%)"><Input inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value)} /></Field>
          <Field label="Período (meses)"><Input inputMode="numeric" value={meses} onChange={(e) => setMeses(e.target.value)} /></Field>
        </div>
        <div className="mt-5">
          <ResultRow label="Total investido" value={brlReais(r.totalInvestido)} />
          <ResultRow label="Juros rendidos" value={brlReais(r.totalJuros)} tone="pos" />
          <ResultRow label="Saldo final" value={brlReais(r.saldoFinal)} strong tone="pos" />
        </div>
      </Card>
      <Reveal delay={0.05}>
        <Card className="p-5">
          <h3 className="mb-1 text-[15px] font-semibold">Crescimento no tempo</h3>
          <p className="mb-3 text-[12px] text-fg-dim">Aporte vs saldo com juros compostos</p>
          <SerieChart data={serie} keys={[{ key: "Investido", nome: "Investido", cor: "#C9A24B" }, { key: "Saldo", nome: "Saldo", cor: "#2E86E6" }]} />
        </Card>
      </Reveal>
    </div>
  );
}

// NOVO: comparador de onde render mais
function OndeRender() {
  const [aporte, setAporte] = useState("800");
  const [meses, setMeses] = useState("120");
  const n = Math.round(num(meses));
  const opcoes = [
    { nome: "Poupança", taxa: 6.17, cor: "#64748B" },
    { nome: "CDB 100% CDI", taxa: 10.5, cor: "#2E86E6" },
    { nome: "Tesouro Selic", taxa: 10.75, cor: "#22C55E" },
  ];
  const results = opcoes.map((o) => ({ ...o, r: jurosCompostos(0, num(aporte), o.taxa, n) }));
  const passo = Math.max(1, Math.floor(n / 24));
  const serie = Array.from({ length: n }).map((_, i) => i).filter((i) => i % passo === 0 || i === n - 1).map((i) => {
    const row: Record<string, number | string> = { x: `${i + 1}m` };
    results.forEach((o) => (row[o.nome] = Math.round(o.r.serie[i]?.saldo ?? 0)));
    return row;
  });
  const melhor = results.reduce((a, b) => (b.r.saldoFinal > a.r.saldoFinal ? b : a));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <h3 className="mb-4 text-[15px] font-semibold">Quanto sobra por mês?</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Aporte mensal (R$)"><Input inputMode="numeric" value={aporte} onChange={(e) => setAporte(e.target.value)} /></Field>
            <Field label="Período (meses)"><Input inputMode="numeric" value={meses} onChange={(e) => setMeses(e.target.value)} /></Field>
          </div>
        </Card>
        <div className="grid gap-3">
          {results.map((o) => (
            <Card key={o.nome} className={`p-4 ${o.nome === melhor.nome ? "ring-2 ring-pos" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="h-3 w-3 rounded-sm" style={{ background: o.cor }} />
                  <span className="text-[13.5px] font-semibold">{o.nome}</span>
                  <span className="text-[11px] text-fg-dim">{pct(o.taxa)} a.a.</span>
                </div>
                {o.nome === melhor.nome && <Pill tone="pos">Rende mais</Pill>}
              </div>
              <div className="mt-1 font-serif-display text-[20px] font-bold tnum">{brlReais(o.r.saldoFinal)}</div>
            </Card>
          ))}
        </div>
      </div>
      <Reveal delay={0.05}>
        <Card className="p-5">
          <h3 className="mb-1 text-[15px] font-semibold">Onde seu dinheiro rende mais</h3>
          <p className="mb-3 text-[12px] text-fg-dim">Saldo acumulado em {n} meses ({(n / 12).toFixed(0)} anos)</p>
          <SerieChart data={serie} keys={opcoes.map((o) => ({ key: o.nome, nome: o.nome, cor: o.cor }))} />
        </Card>
      </Reveal>
    </div>
  );
}

function FinCalc() {
  const [valor, setValor] = useState("40000");
  const [taxa, setTaxa] = useState("1.49");
  const [meses, setMeses] = useState("48");
  const r = financiamentoPrice(num(valor), num(taxa), Math.round(num(meses)));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <h3 className="mb-4 text-[15px] font-semibold">Tabela Price</h3>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Valor (R$)"><Input inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
            <Field label="Taxa (% a.m.)"><Input inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value)} /></Field>
            <Field label="Meses"><Input inputMode="numeric" value={meses} onChange={(e) => setMeses(e.target.value)} /></Field>
          </div>
          <div className="mt-4 text-center">
            <div className="text-[12px] text-fg-muted">Parcela mensal</div>
            <div className="font-serif-display text-[30px] font-bold text-blue-lift tnum">
              <AnimatedNumber value={r.parcela} format={(n) => brlReais(n)} />
            </div>
          </div>
          <ResultRow label="Total pago" value={brlReais(r.totalPago)} />
          <ResultRow label="Total de juros" value={brlReais(r.totalJuros)} tone="crit" strong />
        </Card>
      </div>
      <Reveal delay={0.05}>
        <Card className="p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Evolução da dívida</h3>
          <div className="max-h-[340px] overflow-y-auto">
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-line text-[11px] uppercase text-fg-dim">
                  <th className="py-2 text-left">#</th>
                  <th className="py-2 text-right">Juros</th>
                  <th className="py-2 text-right">Amortização</th>
                  <th className="py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {r.tabela.filter((_, i) => i % Math.max(1, Math.floor(r.tabela.length / 16)) === 0).map((p) => (
                  <tr key={p.n} className="border-b border-line-soft">
                    <td className="py-2 tnum text-fg-muted">{p.n}</td>
                    <td className="py-2 text-right tnum text-crit">{brlReais(p.juros)}</td>
                    <td className="py-2 text-right tnum">{brlReais(p.amortizacao)}</td>
                    <td className="py-2 text-right tnum font-semibold">{brlReais(p.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Reveal>
    </div>
  );
}

function InflaCalc() {
  const [valor, setValor] = useState("1000");
  const [infla, setInfla] = useState("4.5");
  const [anos, setAnos] = useState("10");
  const poder = poderDeCompra(num(valor), num(infla), num(anos));
  const perda = num(valor) - poder;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-4 text-[15px] font-semibold">Poder de compra</h3>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Valor hoje"><Input inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
          <Field label="Inflação (% a.a.)"><Input inputMode="decimal" value={infla} onChange={(e) => setInfla(e.target.value)} /></Field>
          <Field label="Anos"><Input inputMode="numeric" value={anos} onChange={(e) => setAnos(e.target.value)} /></Field>
        </div>
      </Card>
      <Reveal delay={0.05}>
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-[13px] text-fg-muted">{brlReais(num(valor))} hoje valerão, em {anos} anos, o equivalente a</p>
          <div className="my-2 font-serif-display text-[38px] font-bold text-gold tnum">
            <AnimatedNumber value={poder} format={(n) => brlReais(n)} />
          </div>
          <Pill tone="crit">Perda de {brlReais(perda)} · {pct((perda / (num(valor) || 1)) * 100)}</Pill>
        </Card>
      </Reveal>
    </div>
  );
}

function ConsorcioCalc() {
  const [valor, setValor] = useState("40000");
  const [taxaAdm, setTaxaAdm] = useState("18");
  const [meses, setMeses] = useState("60");
  const [taxaFin, setTaxaFin] = useState("1.49");
  const c = consorcio(num(valor), num(taxaAdm), Math.round(num(meses)));
  const f = financiamentoPrice(num(valor), num(taxaFin), Math.round(num(meses)));
  const consMelhor = c.totalPago < f.totalPago;

  return (
    <div>
      <Card className="mb-4 p-5">
        <h3 className="mb-4 text-[15px] font-semibold">Parâmetros</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Valor alvo (R$)"><Input inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
          <Field label="Taxa adm. total (%)"><Input inputMode="decimal" value={taxaAdm} onChange={(e) => setTaxaAdm(e.target.value)} /></Field>
          <Field label="Meses"><Input inputMode="numeric" value={meses} onChange={(e) => setMeses(e.target.value)} /></Field>
          <Field label="Taxa fin. (% a.m.)"><Input inputMode="decimal" value={taxaFin} onChange={(e) => setTaxaFin(e.target.value)} /></Field>
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className={`p-5 ${consMelhor ? "ring-2 ring-pos" : ""}`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Consórcio</h3>
            {consMelhor && <Pill tone="pos">Mais barato</Pill>}
          </div>
          <ResultRow label="Parcela mensal" value={brlReais(c.parcela)} strong />
          <ResultRow label="Custo de administração" value={brlReais(c.custoAdministracao)} tone="crit" />
          <ResultRow label="Total pago" value={brlReais(c.totalPago)} />
        </Card>
        <Card className={`p-5 ${!consMelhor ? "ring-2 ring-pos" : ""}`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Financiamento</h3>
            {!consMelhor && <Pill tone="pos">Mais barato</Pill>}
          </div>
          <ResultRow label="Parcela mensal" value={brlReais(f.parcela)} strong />
          <ResultRow label="Total de juros" value={brlReais(f.totalJuros)} tone="crit" />
          <ResultRow label="Total pago" value={brlReais(f.totalPago)} />
        </Card>
      </div>
      <Card className="mt-4 p-4 text-center text-[13px] text-fg-muted">
        Diferença: <b className={consMelhor ? "text-pos" : "text-crit"}>{brlReais(Math.abs(c.totalPago - f.totalPago))}</b>{" "}
        {consMelhor ? "a favor do consórcio" : "a favor do financiamento"} — sem considerar o tempo de espera da contemplação.
      </Card>
    </div>
  );
}
