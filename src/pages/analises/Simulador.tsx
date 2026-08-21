import { useMemo, useState } from "react";
import { FlaskConical, Save, Trash2, Printer, Layers } from "lucide-react";
import { useStore, useMinhasTransacoes, useMeusCenarios } from "@/lib/store";
import { serieMensal } from "@/lib/utils";
import { brl, uid, hoje } from "@/lib/format";
import { Card, Field, Input, Button, EmptyState } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { AnaliseHeader, StatTile } from "@/components/analytics";
import type { AjusteCenario } from "@/lib/types";

function Slider({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div>
      <label className="mb-1 flex items-center justify-between text-[12.5px] font-medium text-fg-muted">
        <span>{label}</span>
        <b className={value === 0 ? "text-fg-dim" : value > 0 ? "text-pos" : "text-crit"}>{value > 0 ? "+" : ""}{value}%</b>
      </label>
      <input type="range" min={-50} max={50} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[color:var(--blue-lift)]" />
      {hint && <p className="mt-0.5 text-[11px] text-fg-dim">{hint}</p>}
    </div>
  );
}

export default function Simulador() {
  const { state, dispatch } = useStore();
  const txs = useMinhasTransacoes();
  const cenarios = useMeusCenarios();
  const user = state.user!;

  const base = useMemo(() => {
    const meses = serieMensal(txs);
    const ult = meses[meses.length - 1];
    return { receita: ult?.receita ?? 0, despesa: ult?.despesa ?? 0 };
  }, [txs]);

  const [preco, setPreco] = useState(0);
  const [volume, setVolume] = useState(0);
  const [custoFixo, setCustoFixo] = useState(0);
  const [custoVar, setCustoVar] = useState(0);
  const [varShare, setVarShare] = useState(60); // % da despesa que é variável
  const [nome, setNome] = useState("");

  const proj = useMemo(() => {
    const receita = base.receita * (1 + preco / 100) * (1 + volume / 100);
    const despVar = base.despesa * (varShare / 100) * (1 + volume / 100) * (1 + custoVar / 100);
    const despFixa = base.despesa * (1 - varShare / 100) * (1 + custoFixo / 100);
    const despesa = despVar + despFixa;
    return { receita: Math.round(receita), despesa: Math.round(despesa), lucro: Math.round(receita - despesa) };
  }, [base, preco, volume, custoFixo, custoVar, varShare]);

  const lucroBase = base.receita - base.despesa;
  const deltaLucro = proj.lucro - lucroBase;

  function salvar() {
    if (base.receita === 0 && base.despesa === 0) return;
    const todos: AjusteCenario[] = [
      { tipo: "preco", label: "Preço", delta_pct: preco },
      { tipo: "volume", label: "Volume", delta_pct: volume },
      { tipo: "custo_fixo", label: "Custo fixo", delta_pct: custoFixo },
      { tipo: "custo_variavel", label: "Custo variável", delta_pct: custoVar },
    ];
    const ajustes = todos.filter((a) => a.delta_pct !== 0);
    dispatch({
      type: "ADD_CENARIO",
      cenario: {
        id: uid(), user_id: user.id, nome: nome.trim() || `Cenário ${cenarios.length + 1}`, ajustes,
        receita_base: base.receita, despesa_base: base.despesa,
        receita_projetada: proj.receita, despesa_projetada: proj.despesa, lucro_projetado: proj.lucro,
        created_at: hoje(),
      },
    });
    setNome("");
  }

  return (
    <div>
      <AnaliseHeader
        tone="blue"
        icon={<FlaskConical size={22} />}
        titulo="Simulador Estratégico"
        descricao="Componha cenários sobre o seu último mês real e compare lado a lado."
        action={cenarios.length > 0 ? <Button variant="ghost" onClick={() => window.print()}><Printer size={16} /> PDF</Button> : undefined}
      />

      {base.receita === 0 && base.despesa === 0 ? (
        <EmptyState icon={<FlaskConical size={30} />} title="Sem base para simular" desc="Cadastre transações do mês para o simulador usar seus números reais como ponto de partida." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
            <Reveal>
              <Card className="p-5">
                <h3 className="mb-4 text-[15px] font-semibold">Ajustes</h3>
                <div className="flex flex-col gap-4">
                  <Slider label="Preço" value={preco} onChange={setPreco} hint="Aumenta receita por atendimento" />
                  <Slider label="Volume (nº de clientes)" value={volume} onChange={setVolume} hint="Afeta receita e custo variável" />
                  <Slider label="Custo fixo" value={custoFixo} onChange={setCustoFixo} />
                  <Slider label="Custo variável" value={custoVar} onChange={setCustoVar} />
                  <div>
                    <label className="mb-1 flex items-center justify-between text-[12.5px] font-medium text-fg-muted"><span>Parcela variável da despesa</span><b className="text-fg">{varShare}%</b></label>
                    <input type="range" min={0} max={100} step={5} value={varShare} onChange={(e) => setVarShare(Number(e.target.value))} className="w-full accent-[color:var(--gold)]" />
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do cenário" />
                  <Button onClick={salvar} className="flex-none"><Save size={16} /> Salvar</Button>
                </div>
              </Card>
            </Reveal>

            <div>
              <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StaggerItem><StatTile label="Receita projetada" value={proj.receita} format={brl} tone="pos" hint={`Base ${brl(base.receita)}`} /></StaggerItem>
                <StaggerItem><StatTile label="Despesa projetada" value={proj.despesa} format={brl} tone="crit" hint={`Base ${brl(base.despesa)}`} /></StaggerItem>
                <StaggerItem><StatTile label="Lucro projetado" value={proj.lucro} format={brl} tone={proj.lucro >= 0 ? "gold" : "crit"} hint={`${deltaLucro >= 0 ? "+" : ""}${brl(deltaLucro)} vs base`} /></StaggerItem>
              </Stagger>

              <Reveal delay={0.08}>
                <Card className="mt-4 p-5">
                  <h3 className="mb-3 text-[15px] font-semibold">Base (último mês) → Projeção</h3>
                  <div className="space-y-2.5">
                    {[
                      { l: "Receita", base: base.receita, proj: proj.receita, tone: "pos" as const },
                      { l: "Despesa", base: base.despesa, proj: proj.despesa, tone: "crit" as const },
                      { l: "Lucro", base: lucroBase, proj: proj.lucro, tone: "gold" as const },
                    ].map((r) => {
                      const max = Math.max(Math.abs(r.base), Math.abs(r.proj), 1);
                      return (
                        <div key={r.l}>
                          <div className="mb-1 flex justify-between text-[12.5px]"><span className="text-fg-muted">{r.l}</span><span className="tnum font-semibold">{brl(r.base)} → <b className={`text-${r.tone}`}>{brl(r.proj)}</b></span></div>
                          <div className="flex h-2 gap-1">
                            <div className="h-full rounded-full bg-line" style={{ width: `${(Math.abs(r.base) / max) * 100}%` }} />
                            <div className={`h-full rounded-full bg-${r.tone}`} style={{ width: `${(Math.abs(r.proj) / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </Reveal>
            </div>
          </div>

          {cenarios.length > 0 && (
            <Reveal delay={0.1}>
              <Card className="mt-4 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold"><Layers size={16} className="text-blue-lift" /> Cenários salvos · comparação</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]" style={{ minWidth: 560 }}>
                    <thead>
                      <tr className="border-b border-line text-[11px] uppercase tracking-wide text-fg-dim">
                        <th className="px-2 py-2.5 text-left font-semibold">Cenário</th>
                        <th className="px-2 py-2.5 text-left font-semibold">Ajustes</th>
                        <th className="px-2 py-2.5 text-right font-semibold">Receita</th>
                        <th className="px-2 py-2.5 text-right font-semibold">Despesa</th>
                        <th className="px-2 py-2.5 text-right font-semibold">Lucro</th>
                        <th className="px-2 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-line-soft bg-surface-2/40">
                        <td className="px-2 py-2.5 font-semibold">Base atual</td>
                        <td className="px-2 py-2.5 text-fg-dim">—</td>
                        <td className="px-2 py-2.5 text-right tnum">{brl(base.receita)}</td>
                        <td className="px-2 py-2.5 text-right tnum">{brl(base.despesa)}</td>
                        <td className="px-2 py-2.5 text-right tnum font-semibold">{brl(lucroBase)}</td>
                        <td></td>
                      </tr>
                      {cenarios.map((c) => (
                        <tr key={c.id} className="border-b border-line-soft">
                          <td className="px-2 py-2.5 font-medium">{c.nome}</td>
                          <td className="px-2 py-2.5 text-[12px] text-fg-muted">{c.ajustes.length ? c.ajustes.map((a) => `${a.label} ${a.delta_pct > 0 ? "+" : ""}${a.delta_pct}%`).join(", ") : "sem ajustes"}</td>
                          <td className="px-2 py-2.5 text-right tnum text-pos">{brl(c.receita_projetada)}</td>
                          <td className="px-2 py-2.5 text-right tnum text-crit">{brl(c.despesa_projetada)}</td>
                          <td className={`px-2 py-2.5 text-right tnum font-semibold ${c.lucro_projetado >= lucroBase ? "text-pos" : "text-crit"}`}>{brl(c.lucro_projetado)}</td>
                          <td className="px-2 py-2.5 text-right"><button onClick={() => dispatch({ type: "DELETE_CENARIO", id: c.id })} aria-label="Remover" className="text-fg-dim transition hover:text-crit"><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </Reveal>
          )}
        </>
      )}
    </div>
  );
}
