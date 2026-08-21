import { useMemo, useState } from "react";
import { Map, Plus, Trash2, Target } from "lucide-react";
import { avaliarDecisao, type DecisaoOpcaoInput } from "@/lib/utils";
import { brl, parseReaisToCentavos, uid } from "@/lib/format";
import { Card, Field, Input, Button, EmptyState } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { AnaliseHeader } from "@/components/analytics";
import { ScatterChart, type ScatterPonto } from "@/components/AnalyticsCharts";

interface Row extends DecisaoOpcaoInput { id: string }

export default function Decisao() {
  const [capitalStr, setCapitalStr] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [nome, setNome] = useState("");
  const [inv, setInv] = useState("");
  const [ret, setRet] = useState("");
  const [risco, setRisco] = useState(40);
  const [sel, setSel] = useState<string | undefined>();

  const capital = parseReaisToCentavos(capitalStr);
  const res = useMemo(() => avaliarDecisao(capital, rows.map(({ id, ...r }) => (void id, r))), [capital, rows]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const investimento = parseReaisToCentavos(inv);
    const retornoMensal = parseReaisToCentavos(ret);
    if (!nome.trim() || investimento <= 0) return;
    setRows((r) => [...r, { id: uid(), nome: nome.trim(), investimento, retornoMensal, risco }]);
    setNome(""); setInv(""); setRet(""); setRisco(40);
  }

  const pontos: ScatterPonto[] = res.opcoes.map((o) => ({ id: o.id, nome: o.nome, x: o.risco, y: o.retorno_pct, destaque: o.id === res.recomendada }));
  const selecionada = res.opcoes.find((o) => o.id === (sel ?? res.recomendada));

  return (
    <div>
      <AnaliseHeader tone="blue" icon={<Map size={22} />} titulo="Mapa de Decisão" descricao="Compare onde investir por risco × retorno e simule o resultado em 12 meses." />

      <Reveal>
        <Card className="p-5">
          <div className="mb-4 max-w-xs">
            <Field label="Capital disponível (R$)"><Input inputMode="decimal" value={capitalStr} onChange={(e) => setCapitalStr(e.target.value)} placeholder="50.000,00" /></Field>
          </div>
          <form onSubmit={add} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Opção"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Abrir filial" /></Field>
            <Field label="Investimento (R$)"><Input inputMode="decimal" value={inv} onChange={(e) => setInv(e.target.value)} placeholder="40.000,00" /></Field>
            <Field label="Retorno mensal (R$)"><Input inputMode="decimal" value={ret} onChange={(e) => setRet(e.target.value)} placeholder="3.000,00" /></Field>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-fg-muted">Risco: <b className="text-fg">{risco}</b></label>
              <input type="range" min={5} max={95} step={5} value={risco} onChange={(e) => setRisco(Number(e.target.value))} className="w-full accent-[color:var(--blue-lift)]" />
            </div>
            <Button type="submit"><Plus size={16} /> Adicionar</Button>
          </form>
        </Card>
      </Reveal>

      {rows.length === 0 ? (
        <div className="mt-4"><EmptyState icon={<Map size={30} />} title="Adicione opções de investimento" desc="Cadastre as alternativas (contratar, abrir filial, comprar máquina, marketing…) com investimento, retorno e risco para comparar." /></div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Reveal delay={0.05}>
            <Card className="p-5">
              <h3 className="mb-2 text-[15px] font-semibold">Risco × Retorno</h3>
              <ScatterChart pontos={pontos} selecionado={sel ?? res.recomendada} onSelect={setSel} />
              <p className="mt-1 text-[11.5px] text-fg-dim">Clique num ponto para simular. Dourado = melhor relação risco/retorno.</p>
            </Card>
          </Reveal>

          <div className="flex flex-col gap-4">
            <Reveal delay={0.08}>
              <Card className="border-gold bg-[color-mix(in_srgb,var(--gold)_7%,transparent)] p-5">
                <h3 className="mb-1 flex items-center gap-2 text-[14px] font-semibold"><Target size={16} className="text-gold" /> Recomendação</h3>
                <p className="text-[13px] text-fg-muted">{res.justificativa}</p>
              </Card>
            </Reveal>

            {selecionada && (
              <Reveal delay={0.1}>
                <Card className="p-5">
                  <h3 className="mb-3 text-[15px] font-semibold">Simulação · {selecionada.nome} (12 meses)</h3>
                  <div className="grid grid-cols-2 gap-3 text-[13px]">
                    <Info label="Investimento" value={brl(selecionada.investimento)} />
                    <Info label="Payback" value={isFinite(selecionada.payback_meses) ? `${selecionada.payback_meses.toFixed(1)} meses` : "—"} />
                    <Info label="Retorno anual" value={`${selecionada.retorno_pct.toFixed(0)}%`} tone="pos" />
                    <Info label="Risco" value={`${selecionada.risco}/100`} tone="crit" />
                    <Info label="Cenário otimista" value={brl(selecionada.otimista)} tone="pos" />
                    <Info label="Cenário pessimista" value={brl(selecionada.pessimista)} tone="crit" />
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-md bg-surface-2 px-3 py-2.5 text-[13px]">
                    <span className="text-fg-muted">Resultado esperado em 12m</span>
                    <b className={`tnum ${selecionada.retorno_mensal * 12 - selecionada.investimento >= 0 ? "text-pos" : "text-crit"}`}>{brl(selecionada.retorno_mensal * 12 - selecionada.investimento)}</b>
                  </div>
                  <button onClick={() => setRows((r) => r.filter((x) => x.id !== selecionada.id))} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-fg-dim transition hover:text-crit">
                    <Trash2 size={13} /> Remover esta opção
                  </button>
                </Card>
              </Reveal>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, tone }: { label: string; value: string; tone?: "pos" | "crit" }) {
  return (
    <div className="rounded-md border border-line-soft bg-surface-2 p-2.5">
      <div className="text-[11.5px] text-fg-dim">{label}</div>
      <div className={`mt-0.5 font-semibold tnum ${tone === "pos" ? "text-pos" : tone === "crit" ? "text-crit" : "text-fg"}`}>{value}</div>
    </div>
  );
}
