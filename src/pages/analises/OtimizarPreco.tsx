import { useMemo, useState } from "react";
import { Tag, Sparkles } from "lucide-react";
import { otimizarPreco, calcularElasticidade, type PrecoInput } from "@/lib/utils";
import { brl, parseReaisToCentavos } from "@/lib/format";
import { Card, Field, Input, EmptyState } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { AnaliseHeader } from "@/components/analytics";

export default function OtimizarPreco() {
  const [servico, setServico] = useState("");
  const [precoAtual, setPrecoAtual] = useState("");
  const [clientes, setClientes] = useState("");
  const [custo, setCusto] = useState("");
  const [elas, setElas] = useState(-1.2);

  const precoC = parseReaisToCentavos(precoAtual);
  const clientesN = Number(clientes) || 0;
  const custoC = parseReaisToCentavos(custo);
  const pronto = precoC > 0 && clientesN > 0;

  const input: PrecoInput = { servico: servico || "Serviço", precoAtual: precoC, clientesMes: clientesN, custoInsumo: custoC, elasticidade: elas };
  const res = useMemo(() => otimizarPreco(input), [precoC, clientesN, custoC, elas, servico]);

  // Curva lucro × preço (0.7x a 1.4x), destacando o ótimo.
  const curva = useMemo(() => {
    if (!pronto) return [] as { preco: number; lucro: number }[];
    const pts: { preco: number; lucro: number }[] = [];
    for (let f = 0.7; f <= 1.401; f += 0.05) {
      const preco = Math.round(precoC * f);
      const varDem = calcularElasticidade(precoC, preco, elas);
      const demanda = Math.max(0, clientesN * (1 + varDem));
      pts.push({ preco, lucro: (preco - custoC) * demanda });
    }
    return pts;
  }, [pronto, precoC, clientesN, custoC, elas]);

  const maxLucro = Math.max(...curva.map((p) => p.lucro), 1);
  const minPreco = curva.length ? curva[0].preco : 0;
  const maxPreco = curva.length ? curva[curva.length - 1].preco : 1;
  const otimoIdx = curva.reduce((best, p, i, arr) => (p.lucro > arr[best].lucro ? i : best), 0);

  const W = 640, H = 220, pl = 48, pr = 12, pt = 12, pb = 26;
  const x = (preco: number) => pl + ((preco - minPreco) / (maxPreco - minPreco || 1)) * (W - pl - pr);
  const y = (lucro: number) => pt + (1 - lucro / maxLucro) * (H - pt - pb);
  const path = curva.map((p, i) => `${i ? "L" : "M"}${x(p.preco).toFixed(1)} ${y(p.lucro).toFixed(1)}`).join(" ");

  return (
    <div>
      <AnaliseHeader tone="gold" icon={<Tag size={22} />} titulo="Otimizar Preço" descricao="Teste cenários de preço e veja onde o lucro é máximo (curva de demanda)." />

      <Reveal>
        <Card className="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Serviço"><Input value={servico} onChange={(e) => setServico(e.target.value)} placeholder="Corte + barba" /></Field>
            <Field label="Preço atual (R$)"><Input inputMode="decimal" value={precoAtual} onChange={(e) => setPrecoAtual(e.target.value)} placeholder="50,00" /></Field>
            <Field label="Clientes / mês"><Input type="number" value={clientes} onChange={(e) => setClientes(e.target.value)} placeholder="120" /></Field>
            <Field label="Custo do insumo (R$)"><Input inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="8,00" /></Field>
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-fg-muted">
              Sensibilidade ao preço (elasticidade): <b className="text-fg">{elas.toFixed(1)}</b>
              <span className="ml-2 text-[11.5px] text-fg-dim">mais negativo = clientes fogem mais com aumento</span>
            </label>
            <input type="range" min={-2.5} max={-0.3} step={0.1} value={elas} onChange={(e) => setElas(Number(e.target.value))} className="w-full accent-[color:var(--blue-lift)]" />
          </div>
        </Card>
      </Reveal>

      {!pronto ? (
        <div className="mt-4"><EmptyState icon={<Tag size={30} />} title="Preencha preço e clientes" desc="Informe o preço atual e quantos clientes você atende por mês para simular os cenários de preço." /></div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {res.cenarios.map((c) => (
              <Reveal key={c.nome} delay={0.04}>
                <Card className={`p-4 ${c.destaque ? "border-blue bg-[color-mix(in_srgb,var(--blue)_8%,transparent)]" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[12.5px] font-semibold leading-tight">{c.nome}</span>
                    {c.destaque && <span className="inline-flex items-center gap-1 rounded-full bg-blue px-2 py-0.5 text-[10.5px] font-bold text-white"><Sparkles size={11} /> Melhor</span>}
                  </div>
                  <div className="mt-2 font-serif-display text-[22px] font-bold tnum">{brl(c.preco)}</div>
                  <div className="mt-2 space-y-1 text-[12px] text-fg-muted">
                    <div className="flex justify-between"><span>Demanda</span><b className="tnum text-fg">{c.demanda_estimada}/mês</b></div>
                    <div className="flex justify-between"><span>Margem unit.</span><b className="tnum text-fg">{brl(c.margem_unit)}</b></div>
                    <div className="flex justify-between"><span>Lucro total</span><b className="tnum text-pos">{brl(c.lucro_total)}</b></div>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.08}>
            <Card className="mt-4 p-5">
              <h3 className="mb-2 text-[15px] font-semibold">Curva de lucro × preço</h3>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 220 }} role="img" aria-label="Curva de lucro por preço">
                {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                  <g key={f}>
                    <line x1={pl} y1={y(maxLucro * f)} x2={W - pr} y2={y(maxLucro * f)} stroke="var(--grid)" />
                    <text x={pl - 6} y={y(maxLucro * f) + 4} textAnchor="end" fontSize="10" fill="var(--fg-dim)">{((maxLucro * f) / 100000).toFixed(0)}k</text>
                  </g>
                ))}
                <path d={path} fill="none" stroke="var(--blue-lift)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                <line x1={x(curva[otimoIdx].preco)} y1={pt} x2={x(curva[otimoIdx].preco)} y2={H - pb} stroke="var(--gold)" strokeDasharray="4 3" />
                <circle cx={x(curva[otimoIdx].preco)} cy={y(curva[otimoIdx].lucro)} r="6" fill="var(--gold)" stroke="var(--surface)" strokeWidth="2" />
                <text x={x(curva[otimoIdx].preco)} y={y(curva[otimoIdx].lucro) - 12} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--gold)">ótimo {brl(curva[otimoIdx].preco, false)}</text>
                <text x={(W + pl) / 2} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--fg-muted)">Preço →</text>
              </svg>
              <div className="mt-2 rounded-md border border-gold bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] px-3.5 py-2.5 text-[13px]">
                <b className="text-gold-soft">Recomendação:</b> {res.recomendacao}
              </div>
            </Card>
          </Reveal>
        </>
      )}
    </div>
  );
}
