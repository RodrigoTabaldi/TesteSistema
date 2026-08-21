import { useMemo, useState } from "react";
import { Lightbulb, CheckCircle2, XCircle } from "lucide-react";
import { calcularROI, type RoiInput } from "@/lib/utils";
import { brl, parseReaisToCentavos } from "@/lib/format";
import { Card, Field, Input, EmptyState } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { AnaliseHeader, StatTile } from "@/components/analytics";

export default function ROI() {
  const [inv, setInv] = useState("");
  const [ret, setRet] = useState("");
  const [meses, setMeses] = useState("24");
  const [taxa, setTaxa] = useState("12");

  const investimento = parseReaisToCentavos(inv);
  const retornoMensal = parseReaisToCentavos(ret);
  const vidaUtil = Number(meses) || 0;
  const taxaOp = Number(taxa) || 0;
  const pronto = investimento > 0 && retornoMensal > 0 && vidaUtil > 0;

  const input: RoiInput = { investimento, retornoMensal, vidaUtilMeses: vidaUtil, taxaOportunidadeAnual: taxaOp };
  const res = useMemo(() => calcularROI(input), [investimento, retornoMensal, vidaUtil, taxaOp]);

  // Fluxo acumulado (payback = cruzamento do zero)
  const W = 660, H = 220, pl = 52, pr = 14, pt = 14, pb = 26;
  const reais = (c: number) => c / 100;
  const vals = res.serie_acumulada.map((p) => reais(p.fluxo));
  const min = Math.min(...vals, 0), max = Math.max(...vals, 1), span = max - min || 1;
  const x = (m: number) => pl + (m / (vidaUtil || 1)) * (W - pl - pr);
  const y = (v: number) => pt + (1 - (v - min) / span) * (H - pt - pb);
  const path = res.serie_acumulada.map((p, i) => `${i ? "L" : "M"}${x(p.mes).toFixed(1)} ${y(reais(p.fluxo)).toFixed(1)}`).join(" ");

  return (
    <div>
      <AnaliseHeader tone="gold" icon={<Lightbulb size={22} />} titulo="ROI de Investimento" descricao="Vale a pena? Payback, ROI, VPL, TIR e comparação com deixar no CDB." />

      <Reveal>
        <Card className="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Investimento (R$)"><Input inputMode="decimal" value={inv} onChange={(e) => setInv(e.target.value)} placeholder="30.000,00" /></Field>
            <Field label="Retorno mensal (R$)" hint="Lucro extra que ele gera"><Input inputMode="decimal" value={ret} onChange={(e) => setRet(e.target.value)} placeholder="2.500,00" /></Field>
            <Field label="Vida útil (meses)"><Input type="number" value={meses} onChange={(e) => setMeses(e.target.value)} /></Field>
            <Field label="Taxa de oportunidade (% a.a.)" hint="Ex: CDB ~12%"><Input type="number" value={taxa} onChange={(e) => setTaxa(e.target.value)} /></Field>
          </div>
        </Card>
      </Reveal>

      {!pronto ? (
        <div className="mt-4"><EmptyState icon={<Lightbulb size={30} />} title="Informe o investimento" desc="Preencha o valor do investimento, o retorno mensal esperado e a vida útil para calcular se vale a pena." /></div>
      ) : (
        <>
          <Stagger className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StaggerItem><StatTile label="Payback" value={res.payback_meses} format={(n) => (isFinite(n) ? `${n.toFixed(1)} meses` : "—")} tone="blue" /></StaggerItem>
            <StaggerItem><StatTile label="ROI total" value={res.roi_pct} format={(n) => `${n.toFixed(0)}%`} tone={res.roi_pct >= 0 ? "pos" : "crit"} /></StaggerItem>
            <StaggerItem><StatTile label="VPL" value={res.vpl} format={brl} tone={res.vpl >= 0 ? "pos" : "crit"} /></StaggerItem>
            <StaggerItem><StatTile label="TIR (mensal)" value={res.tir_mensal_pct} format={(n) => `${n.toFixed(1)}%`} tone="gold" /></StaggerItem>
          </Stagger>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
            <Reveal delay={0.05}>
              <Card className="p-5">
                <h3 className="mb-2 text-[15px] font-semibold">Fluxo de caixa acumulado</h3>
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 220 }} role="img" aria-label="Fluxo acumulado do investimento">
                  {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                    const v = min + span * f;
                    return <g key={f}><line x1={pl} y1={y(v)} x2={W - pr} y2={y(v)} stroke="var(--grid)" /><text x={pl - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--fg-dim)">{(v / 1000).toFixed(0)}k</text></g>;
                  })}
                  {min < 0 && max > 0 && <line x1={pl} y1={y(0)} x2={W - pr} y2={y(0)} stroke="var(--pos)" strokeDasharray="4 3" opacity="0.7" />}
                  <path d={path} fill="none" stroke="var(--blue-lift)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  <text x={(W + pl) / 2} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--fg-muted)">Meses →</text>
                </svg>
              </Card>
            </Reveal>

            <Reveal delay={0.1}>
              <Card className={`flex flex-col justify-center p-5 ${res.valeApena ? "border-pos" : "border-crit"}`}>
                <div className={`flex items-center gap-2 ${res.valeApena ? "text-pos" : "text-crit"}`}>
                  {res.valeApena ? <CheckCircle2 size={26} /> : <XCircle size={26} />}
                  <span className="font-serif-display text-[20px] font-bold">{res.valeApena ? "Vale a pena" : "Pense bem"}</span>
                </div>
                <p className="mt-2 text-[13px] text-fg-muted">
                  {res.valeApena
                    ? "VPL positivo e TIR acima da taxa de oportunidade: o investimento supera deixar o dinheiro rendendo no CDB."
                    : "O retorno não supera com folga a taxa de oportunidade. Renegocie o custo, aumente o retorno ou reconsidere."}
                </p>
                <div className="mt-3 rounded-md bg-surface-2 p-3 text-[12.5px]">
                  <div className="flex justify-between"><span className="text-fg-muted">No CDB, o mesmo valor renderia</span><b className="tnum">{brl(res.vs_cdb)}</b></div>
                  <div className="mt-1 flex justify-between"><span className="text-fg-muted">Este investimento gera (líq.)</span><b className="tnum text-pos">{brl(retornoMensal * vidaUtil - investimento)}</b></div>
                </div>
              </Card>
            </Reveal>
          </div>

          <Reveal delay={0.12}>
            <Card className="mt-4 p-5">
              <h3 className="mb-3 text-[15px] font-semibold">Análise de sensibilidade</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {res.sensibilidade.map((s) => (
                  <div key={s.cenario} className="rounded-lg border border-line bg-surface-2 p-4 text-center">
                    <div className="text-[12.5px] text-fg-muted">{s.cenario}</div>
                    <div className={`mt-1 font-serif-display text-[19px] font-bold tnum ${s.vpl >= 0 ? "text-pos" : "text-crit"}`}>{brl(s.vpl)}</div>
                    <div className="text-[11.5px] text-fg-dim">VPL · ROI {s.roi_pct.toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        </>
      )}
    </div>
  );
}
