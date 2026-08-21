import { useMemo, useState } from "react";
import { Landmark, Calculator, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useStore, useMinhasTransacoes } from "@/lib/store";
import { Card, Field, Input, Pill } from "@/components/ui";
import { Tabs } from "@/components/Tabs";
import { ProgressBar, AnimatedNumber, Reveal } from "@/components/motion";
import { calcularMEI, calcularSimples, calcularIRPF, calcularIRRF, MEI_LIMITE_ANUAL } from "@/lib/utils";
import { brlReais, pct, dataBR } from "@/lib/format";

export default function Impostos() {
  const { state, dispatch } = useStore();
  const txs = useMinhasTransacoes();
  const user = state.user!;

  const faturamentoAno = useMemo(() => {
    const ano = new Date().getFullYear().toString();
    return txs.filter((t) => t.tipo === "receita" && t.data.startsWith(ano)).reduce((a, b) => a + b.valor_centavos, 0) / 100;
  }, [txs]);

  const impostos = state.impostos.filter((i) => i.user_id === user.id);

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] text-gold">
          <Landmark size={22} />
        </span>
        <div>
          <h1 className="font-serif-display text-[24px] font-bold">Impostos</h1>
          <p className="text-[13px] text-fg-muted">Calculadoras fiscais com tabelas 2024/2025.</p>
        </div>
      </div>

      <div className="mt-6">
        <Tabs
          tabs={[
            { id: "mei", label: "MEI", content: <MeiCalc faturamento={faturamentoAno} /> },
            { id: "simples", label: "Simples Nacional", content: <SimplesCalc /> },
            { id: "irpf", label: "IRPF", content: <IrpfCalc /> },
            { id: "irrf", label: "Retenção IRRF", content: <IrrfCalc /> },
            {
              id: "hist",
              label: "Histórico",
              content: (
                <Card className="p-5">
                  <h3 className="mb-3 text-[15px] font-semibold">Próximos vencimentos &amp; pagamentos</h3>
                  {impostos.length === 0 ? (
                    <p className="text-[13px] text-fg-muted">Nenhum imposto registrado ainda.</p>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {impostos.map((i) => (
                        <div key={i.id} className="flex items-center gap-3 rounded-md border border-line bg-surface-2 p-3.5">
                          <span className={`grid h-9 w-9 place-items-center rounded-[9px] ${i.status === "pago" ? "bg-[color-mix(in_srgb,var(--pos)_16%,transparent)] text-pos" : "bg-[color-mix(in_srgb,var(--warn)_18%,transparent)] text-warn"}`}>
                            {i.status === "pago" ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                          </span>
                          <div className="flex-1">
                            <div className="text-[13px] font-semibold uppercase">{i.tipo} · {i.periodo}</div>
                            <div className="text-[12px] text-fg-dim">Vence em {dataBR(i.vencimento)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold tnum">{brlReais(i.valor_centavos / 100)}</div>
                            {i.status === "pendente" ? (
                              <button onClick={() => dispatch({ type: "PAY_IMPOSTO", id: i.id })} className="text-[12px] font-semibold text-blue-lift hover:underline">
                                Marcar pago
                              </button>
                            ) : (
                              <Pill tone="pos">pago</Pill>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

function ResultRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "pos" | "crit" }) {
  return (
    <div className="flex items-center justify-between border-b border-line-soft py-2.5 last:border-0">
      <span className="text-[13px] text-fg-muted">{label}</span>
      <span className={`tnum ${strong ? "font-serif-display text-[18px] font-bold" : "text-[14px] font-semibold"} ${tone === "pos" ? "text-pos" : tone === "crit" ? "text-crit" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function MeiCalc({ faturamento }: { faturamento: number }) {
  const [valor, setValor] = useState(faturamento ? faturamento.toFixed(0) : "48000");
  const [tipo, setTipo] = useState<"servico" | "comercio">("servico");
  const r = calcularMEI(parseFloat(valor) || 0, tipo);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-4 text-[15px] font-semibold">Faturamento anual</h3>
        <Field label="Receita bruta acumulada no ano (R$)" hint={`Detectamos ${brlReais(faturamento)} nas suas transações deste ano.`}>
          <Input inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} />
        </Field>
        <div className="mt-4 flex gap-2">
          {(["servico", "comercio"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`flex-1 rounded-md border px-3 py-2 text-[13px] font-semibold transition ${tipo === t ? "border-blue bg-[color-mix(in_srgb,var(--blue)_12%,transparent)] text-blue-lift" : "border-line text-fg-muted"}`}
            >
              {t === "servico" ? "Serviço (ISS)" : "Comércio (ICMS)"}
            </button>
          ))}
        </div>
      </Card>

      <Reveal delay={0.05}>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Limite MEI</h3>
            {r.vaiEstourar ? <Pill tone="crit"><AlertTriangle size={12} /> Estourou</Pill> : <Pill tone="pos">Dentro do limite</Pill>}
          </div>
          <div className="mb-1 flex justify-between text-[12px] text-fg-muted">
            <span>{pct(r.percentualUsado)} usado</span>
            <span>Teto {brlReais(MEI_LIMITE_ANUAL)}</span>
          </div>
          <ProgressBar pct={r.percentualUsado} color={r.percentualUsado > 90 ? "var(--crit)" : r.percentualUsado > 70 ? "var(--warn)" : "var(--pos)"} />
          <div className="mt-5">
            <ResultRow label="DAS mensal" value={brlReais(r.dasMensal)} strong />
            <ResultRow label="Margem restante no ano" value={brlReais(r.margemRestante)} tone={r.margemRestante > 0 ? "pos" : "crit"} />
            <ResultRow label="DAS anual (12x)" value={brlReais(r.dasMensal * 12)} />
          </div>
          {r.vaiEstourar && (
            <div className="mt-4 rounded-md border border-crit/40 bg-[color-mix(in_srgb,var(--crit)_10%,transparent)] p-3 text-[12.5px] text-crit">
              Faturamento acima de {brlReais(MEI_LIMITE_ANUAL)}. Considere migrar para o Simples Nacional.
            </div>
          )}
        </Card>
      </Reveal>
    </div>
  );
}

function SimplesCalc() {
  const [rbt12, setRbt12] = useState("240000");
  const [mes, setMes] = useState("22000");
  const r = calcularSimples(parseFloat(rbt12) || 0, parseFloat(mes) || 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-4 text-[15px] font-semibold">Anexo III · Serviços</h3>
        <div className="flex flex-col gap-4">
          <Field label="Receita bruta últimos 12 meses (RBT12)">
            <Input inputMode="numeric" value={rbt12} onChange={(e) => setRbt12(e.target.value)} />
          </Field>
          <Field label="Faturamento do mês atual">
            <Input inputMode="numeric" value={mes} onChange={(e) => setMes(e.target.value)} />
          </Field>
        </div>
      </Card>
      <Reveal delay={0.05}>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Resultado</h3>
            <Pill tone="info">Faixa {r.faixa}</Pill>
          </div>
          <ResultRow label="Alíquota nominal" value={pct(r.aliquotaNominal * 100)} />
          <ResultRow label="Alíquota efetiva" value={pct(r.aliquotaEfetiva * 100, 2)} strong />
          <ResultRow label="Imposto do mês (DAS)" value={brlReais(r.impostoMensal)} tone="crit" />
          <div className="mt-4 rounded-md border border-line bg-surface-2 p-3 text-[12.5px] text-fg-muted">
            A alíquota efetiva é menor que a nominal por causa da parcela a deduzir da faixa — é ela que vale no cálculo do DAS.
          </div>
        </Card>
      </Reveal>
    </div>
  );
}

function IrpfCalc() {
  const [renda, setRenda] = useState("60000");
  const [ded, setDed] = useState("18000");
  const r = calcularIRPF(parseFloat(renda) || 0, parseFloat(ded) || 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-4 text-[15px] font-semibold">Tabela IRPF 2024 (anual)</h3>
        <div className="flex flex-col gap-4">
          <Field label="Renda bruta do período (R$)">
            <Input inputMode="numeric" value={renda} onChange={(e) => setRenda(e.target.value)} />
          </Field>
          <Field label="Deduções (insumo, aluguel, funcionário)" hint="Despesas dedutíveis reduzem a base de cálculo.">
            <Input inputMode="numeric" value={ded} onChange={(e) => setDed(e.target.value)} />
          </Field>
        </div>
      </Card>
      <Reveal delay={0.05}>
        <Card className="p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Imposto devido</h3>
          <div className="mb-4 text-center">
            <div className="text-[12px] text-fg-muted">Valor a pagar</div>
            <div className="font-serif-display text-[30px] font-bold text-crit tnum">
              <AnimatedNumber value={r.impostoDevido} format={(n) => brlReais(n)} />
            </div>
          </div>
          <ResultRow label="Base de cálculo" value={brlReais(r.baseCalculo)} />
          <ResultRow label="Alíquota marginal" value={pct(r.aliquota * 100)} />
          <ResultRow label="Alíquota efetiva" value={pct(r.aliquotaEfetiva * 100, 2)} />
          <ResultRow label="Renda líquida" value={brlReais(r.rendaLiquida)} tone="pos" strong />
        </Card>
      </Reveal>
    </div>
  );
}

function IrrfCalc() {
  const [valor, setValor] = useState("5000");
  const [aliq, setAliq] = useState("1.5");
  const retido = calcularIRRF(parseFloat(valor) || 0, (parseFloat(aliq) || 0) / 100);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-4 text-[15px] font-semibold">Retenção na nota (tomador PJ)</h3>
        <div className="flex flex-col gap-4">
          <Field label="Valor da nota fiscal (R$)">
            <Input inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} />
          </Field>
          <Field label="Alíquota IRRF (%)" hint="Serviços profissionais: 1,5%">
            <Input inputMode="decimal" value={aliq} onChange={(e) => setAliq(e.target.value)} />
          </Field>
        </div>
      </Card>
      <Reveal delay={0.05}>
        <Card className="p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Resultado</h3>
          <ResultRow label="Valor bruto da nota" value={brlReais(parseFloat(valor) || 0)} />
          <ResultRow label="IRRF retido" value={brlReais(retido)} tone="crit" strong />
          <ResultRow label="Líquido a receber" value={brlReais((parseFloat(valor) || 0) - retido)} tone="pos" />
          <Calculator size={18} className="mt-4 text-fg-dim" />
          <p className="mt-1 text-[12.5px] text-fg-muted">O tomador retém e recolhe o IRRF; você recebe o líquido e compensa na declaração.</p>
        </Card>
      </Reveal>
    </div>
  );
}
