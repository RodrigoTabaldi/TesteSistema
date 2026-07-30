import { useMemo, useState } from "react";
import { BarChart3, Users } from "lucide-react";
import { useMinhasTransacoes } from "@/lib/store";
import { calcularBenchmarking, serieMensal, type BenchmarkInput, BENCHMARK_REF } from "@/lib/utils";
import { brl, brlReais } from "@/lib/format";
import { Card, Field, Input, Select } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { AnaliseHeader, StatusBadge, Recomendacoes } from "@/components/analytics";
import { RadarChart } from "@/components/AnalyticsCharts";

const SEGMENTOS: { id: keyof typeof BENCHMARK_REF; label: string }[] = [
  { id: "salao", label: "Salão de beleza" },
  { id: "barbearia", label: "Barbearia" },
  { id: "oficina", label: "Oficina / auto" },
  { id: "estetica", label: "Clínica de estética" },
  { id: "generico", label: "Outro serviço" },
];

export default function Benchmarking() {
  const txs = useMinhasTransacoes();

  // Deriva ticket e margem dos SEUS dados reais (o resto o usuário informa).
  const derivado = useMemo(() => {
    const receitas = txs.filter((t) => t.tipo === "receita");
    const ticket = receitas.length ? Math.round(receitas.reduce((a, t) => a + t.valor_centavos, 0) / receitas.length) : 0;
    const meses = serieMensal(txs);
    const ult = meses[meses.length - 1];
    const margem = ult && ult.receita > 0 ? Math.round(((ult.receita - ult.despesa) / ult.receita) * 100) : 0;
    return { ticket, margem };
  }, [txs]);

  const [segmento, setSegmento] = useState<keyof typeof BENCHMARK_REF>("salao");
  const [ticket, setTicket] = useState<number>(derivado.ticket);
  const [margem, setMargem] = useState<number>(derivado.margem);
  const [recorrencia, setRecorrencia] = useState<number>(0);
  const [ocupacao, setOcupacao] = useState<number>(0);
  const [despesaFixa, setDespesaFixa] = useState<number>(0);

  const input: BenchmarkInput = { segmento, ticket, margem, recorrenciaPct: recorrencia, ocupacaoPct: ocupacao, despesaFixaPct: despesaFixa };
  const res = useMemo(() => calcularBenchmarking(input), [segmento, ticket, margem, recorrencia, ocupacao, despesaFixa]);

  // Normaliza p/ radar (0-100). Ticket relativo à mediana; despesa fixa invertida.
  const norm = (m: (typeof res.metricas)[number], base: number) =>
    m.unidade === "pct" ? Math.min(100, base) : Math.min(100, (base / (m.mediana * 1.6)) * 100);
  const eixos = res.metricas.map((m) => m.label);
  const serieVoce = res.metricas.map((m) => norm(m, m.voce));
  const serieMed = res.metricas.map((m) => norm(m, m.mediana));

  const fmt = (m: (typeof res.metricas)[number], v: number) => (m.unidade === "reais" ? brl(v) : m.unidade === "pct" ? `${v}%` : String(v));

  return (
    <div>
      <AnaliseHeader tone="gold" icon={<BarChart3 size={22} />} titulo="Benchmarking" descricao="Como seus números se comparam a negócios parecidos (dados de referência do setor)." />

      <Reveal>
        <Card className="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Segmento">
              <Select value={segmento} onChange={(e) => setSegmento(e.target.value as keyof typeof BENCHMARK_REF)}>
                {SEGMENTOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="Ticket médio (R$)" hint="Puxado das suas receitas — ajuste se quiser">
              <Input type="number" value={ticket / 100 || ""} onChange={(e) => setTicket(Math.round(Number(e.target.value) * 100))} />
            </Field>
            <Field label="Margem de lucro (%)">
              <Input type="number" value={margem || ""} onChange={(e) => setMargem(Number(e.target.value))} />
            </Field>
            <Field label="Clientes recorrentes (%)">
              <Input type="number" value={recorrencia || ""} onChange={(e) => setRecorrencia(Number(e.target.value))} />
            </Field>
            <Field label="Taxa de ocupação (%)">
              <Input type="number" value={ocupacao || ""} onChange={(e) => setOcupacao(Number(e.target.value))} />
            </Field>
            <Field label="Despesa fixa / receita (%)">
              <Input type="number" value={despesaFixa || ""} onChange={(e) => setDespesaFixa(Number(e.target.value))} />
            </Field>
          </div>
        </Card>
      </Reveal>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Reveal delay={0.05}>
          <Card className="flex flex-col items-center p-5">
            <h3 className="mb-2 self-start text-[15px] font-semibold">Seu perfil vs mediana</h3>
            <RadarChart
              eixos={eixos}
              series={[
                { nome: "Você", cor: "var(--gold)", valores: serieVoce },
                { nome: "Mediana", cor: "var(--blue-lift)", valores: serieMed },
              ]}
            />
            <div className="mt-2 flex gap-4 text-[12px] text-fg-muted">
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-gold" /> Você</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-blue-lift" /> Mediana do setor</span>
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.1}>
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold"><Users size={16} className="text-blue-lift" /> Comparativo detalhado</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" style={{ minWidth: 420 }}>
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wide text-fg-dim">
                    <th className="px-2 py-2.5 text-left font-semibold">Métrica</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Você</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Mediana</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Top 20%</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {res.metricas.map((m) => (
                    <tr key={m.chave} className="border-b border-line-soft">
                      <td className="px-2 py-2.5 font-medium">{m.label}</td>
                      <td className="px-2 py-2.5 text-right tnum font-semibold">{fmt(m, m.voce)}</td>
                      <td className="px-2 py-2.5 text-right tnum text-fg-muted">{fmt(m, m.mediana)}</td>
                      <td className="px-2 py-2.5 text-right tnum text-fg-muted">{fmt(m, m.top20)}</td>
                      <td className="px-2 py-2.5 text-right"><StatusBadge status={m.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </Reveal>
      </div>

      {res.oportunidades.length > 0 && (
        <Reveal delay={0.12}>
          <Card className="mt-4 p-5">
            <Recomendacoes itens={res.oportunidades} titulo="Oportunidades (onde você está abaixo)" />
          </Card>
        </Reveal>
      )}

      <p className="mt-4 text-center text-[11.5px] text-fg-dim">
        Medianas de referência do setor · {brlReais(BENCHMARK_REF[segmento].ticket / 100)} ticket típico. Benchmarking anônimo com base de usuários virá com o Supabase.
      </p>
    </div>
  );
}
