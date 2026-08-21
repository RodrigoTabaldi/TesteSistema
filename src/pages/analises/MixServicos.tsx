import { useMemo, useState } from "react";
import { PieChart, Plus, Trash2, Trophy } from "lucide-react";
import { analiseParetoMix, type ServicoInput } from "@/lib/utils";
import { brl, parseReaisToCentavos, uid } from "@/lib/format";
import { Card, Field, Input, Button, EmptyState } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { AnaliseHeader } from "@/components/analytics";
import type { ServicoMix } from "@/lib/types";

interface Row extends ServicoInput { id: string }

const classeCor: Record<ServicoMix["classe"], string> = {
  A: "text-pos bg-[color-mix(in_srgb,var(--pos)_15%,transparent)]",
  B: "text-warn bg-[color-mix(in_srgb,var(--warn)_20%,transparent)]",
  C: "text-fg-muted bg-surface-2",
};

export default function MixServicos() {
  const [rows, setRows] = useState<Row[]>([]);
  const [nome, setNome] = useState("");
  const [freq, setFreq] = useState("");
  const [preco, setPreco] = useState("");
  const [margem, setMargem] = useState("");

  const res = useMemo(() => analiseParetoMix(rows), [rows]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const f = Number(freq) || 0;
    const p = parseReaisToCentavos(preco);
    const m = Number(margem) || 0;
    if (!nome.trim() || f <= 0 || p <= 0) return;
    setRows((r) => [...r, { id: uid(), nome: nome.trim(), frequencia: f, preco: p, margem_pct: m }]);
    setNome(""); setFreq(""); setPreco(""); setMargem("");
  }

  // Pareto chart
  const W = 660, H = 240, pl = 46, pr = 40, pt = 14, pb = 46;
  const maxContrib = Math.max(...res.servicos.map((s) => s.contribuicao_lucro), 1);
  const bw = res.servicos.length ? (W - pl - pr) / res.servicos.length : 0;
  const yBar = (v: number) => pt + (1 - v / maxContrib) * (H - pt - pb);
  const yCum = (pctVal: number) => pt + (1 - pctVal / 100) * (H - pt - pb);
  const cumPath = res.servicos.map((s, i) => `${i ? "L" : "M"}${(pl + i * bw + bw / 2).toFixed(1)} ${yCum(s.contribuicao_acumulada_pct).toFixed(1)}`).join(" ");

  return (
    <div>
      <AnaliseHeader tone="violet" icon={<PieChart size={22} />} titulo="Mix de Serviços" descricao="Regra 80/20: descubra quais serviços realmente sustentam o lucro." />

      <Reveal>
        <Card className="p-5">
          <form onSubmit={add} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Serviço"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Coloração" /></Field>
            <Field label="Freq./mês"><Input type="number" value={freq} onChange={(e) => setFreq(e.target.value)} placeholder="15" /></Field>
            <Field label="Preço (R$)"><Input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="180,00" /></Field>
            <Field label="Margem (%)"><Input type="number" value={margem} onChange={(e) => setMargem(e.target.value)} placeholder="60" /></Field>
            <Button type="submit"><Plus size={16} /> Adicionar</Button>
          </form>
        </Card>
      </Reveal>

      {rows.length === 0 ? (
        <div className="mt-4"><EmptyState icon={<PieChart size={30} />} title="Cadastre seus serviços" desc="Adicione cada serviço com frequência, preço e margem. O Kronos monta a curva de Pareto e mostra onde está o seu lucro." /></div>
      ) : (
        <>
          <Reveal delay={0.05}>
            <Card className="mt-4 p-5">
              <div className="mb-3 flex items-center gap-2 rounded-md border border-gold bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] px-3.5 py-2.5 text-[13px]">
                <Trophy size={16} className="text-gold" /> <span><b className="text-gold-soft">{Math.round(res.top20_lucro_pct)}%</b> do lucro — {res.insight}</span>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 240 }} role="img" aria-label="Curva de Pareto dos serviços">
                {[0, 25, 50, 75, 100].map((g) => (
                  <g key={g}>
                    <line x1={pl} y1={yCum(g)} x2={W - pr} y2={yCum(g)} stroke="var(--grid)" />
                    <text x={W - pr + 6} y={yCum(g) + 4} fontSize="9.5" fill="var(--fg-dim)">{g}%</text>
                  </g>
                ))}
                {res.servicos.map((s, i) => (
                  <g key={s.nome}>
                    <rect x={pl + i * bw + bw * 0.18} y={yBar(s.contribuicao_lucro)} width={bw * 0.64} height={H - pb - yBar(s.contribuicao_lucro)} rx="3" fill={s.classe === "A" ? "var(--pos)" : s.classe === "B" ? "var(--warn)" : "var(--fg-dim)"} className="kx-grow" style={{ transformOrigin: `center ${H - pb}px` }} />
                    <text x={pl + i * bw + bw / 2} y={H - pb + 15} textAnchor="middle" fontSize="9.5" fill="var(--fg-dim)">{s.nome.length > 8 ? s.nome.slice(0, 7) + "…" : s.nome}</text>
                  </g>
                ))}
                <path d={cumPath} fill="none" stroke="var(--blue-lift)" strokeWidth="2.2" />
                {res.servicos.map((s, i) => (
                  <circle key={s.nome} cx={pl + i * bw + bw / 2} cy={yCum(s.contribuicao_acumulada_pct)} r="3.5" fill="var(--blue-lift)" />
                ))}
              </svg>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card className="mt-4 p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]" style={{ minWidth: 620 }}>
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wide text-fg-dim">
                      <th className="px-2 py-2.5 text-left font-semibold">Serviço</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Freq.</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Preço</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Margem</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Contrib. lucro</th>
                      <th className="px-2 py-2.5 text-center font-semibold">Classe</th>
                      <th className="px-2 py-2.5 text-left font-semibold">Ação</th>
                      <th className="px-2 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {res.servicos.map((s) => {
                      const row = rows.find((r) => r.nome === s.nome);
                      return (
                        <tr key={s.nome} className="border-b border-line-soft">
                          <td className="px-2 py-2.5 font-medium">{s.nome}</td>
                          <td className="px-2 py-2.5 text-right tnum text-fg-muted">{s.frequencia}</td>
                          <td className="px-2 py-2.5 text-right tnum text-fg-muted">{brl(s.preco, false)}</td>
                          <td className="px-2 py-2.5 text-right tnum text-fg-muted">{s.margem_pct}%</td>
                          <td className="px-2 py-2.5 text-right tnum font-semibold text-pos">{brl(s.contribuicao_lucro)}</td>
                          <td className="px-2 py-2.5 text-center"><span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${classeCor[s.classe]}`}>{s.classe}</span></td>
                          <td className="px-2 py-2.5 text-[12px] text-fg-muted">{s.acao}</td>
                          <td className="px-2 py-2.5 text-right">
                            {row && <button onClick={() => setRows((r) => r.filter((x) => x.id !== row.id))} aria-label="Remover" className="text-fg-dim transition hover:text-crit"><Trash2 size={14} /></button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </Reveal>
        </>
      )}
    </div>
  );
}
