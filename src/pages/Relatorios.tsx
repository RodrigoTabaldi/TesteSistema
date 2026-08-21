import { useMemo, useState } from "react";
import { FileBarChart, Download, Printer } from "lucide-react";
import { useStore, useMinhasTransacoes } from "@/lib/store";
import { Card, Button, Field, Select, SectionTitle } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { resumoDoMes } from "@/lib/utils";
import { brl, dataBR, mesAtual } from "@/lib/format";

export default function Relatorios() {
  const { state } = useStore();
  const txs = useMinhasTransacoes();
  const user = state.user!;

  const meses = useMemo(() => {
    const set = new Set(txs.map((t) => t.data.slice(0, 7)));
    const arr = [...set].sort().reverse();
    return arr.length ? arr : [mesAtual()];
  }, [txs]);

  const [mes, setMes] = useState(meses[0]);
  const resumo = useMemo(() => resumoDoMes(txs, mes), [txs, mes]);

  const impostosEstimados = Math.round(resumo.receita * 0.06);
  const ebit = resumo.lucro;
  const lucroLiquido = ebit - impostosEstimados;

  function exportarCSV() {
    const linhas = txs
      .filter((t) => t.data.startsWith(mes))
      .sort((a, b) => (a.data < b.data ? -1 : 1))
      .map((t) => [t.data, t.tipo, `"${t.descricao}"`, t.categoria, (t.valor_centavos / 100).toFixed(2).replace(".", ","), t.status].join(";"));
    const csv = ["Data;Tipo;Descrição;Categoria;Valor;Status", ...linhas].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronos-transacoes-${mes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const linhasDRE: { label: string; valor: number; bold?: boolean; tone?: "pos" | "crit" }[] = [
    { label: "Receita bruta", valor: resumo.receita },
    { label: "(−) Despesas operacionais", valor: -resumo.despesa, tone: "crit" },
    { label: "(=) EBIT (resultado operacional)", valor: ebit, bold: true },
    { label: "(−) Impostos estimados (Simples ~6%)", valor: -impostosEstimados, tone: "crit" },
    { label: "(=) Lucro líquido", valor: lucroLiquido, bold: true, tone: lucroLiquido >= 0 ? "pos" : "crit" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--pos)_18%,transparent)] text-pos">
            <FileBarChart size={22} />
          </span>
          <div>
            <h1 className="font-serif-display text-[24px] font-bold">Relatórios</h1>
            <p className="text-[13px] text-fg-muted">DRE, fluxo e exportação para o contador.</p>
          </div>
        </div>
        <div className="flex items-end gap-2.5">
          <Field label="Período">
            <Select value={mes} onChange={(e) => setMes(e.target.value)}>
              {meses.map((m) => (
                <option key={m} value={m}>
                  {new Date(m + "-02").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </option>
              ))}
            </Select>
          </Field>
          <Button variant="ghost" onClick={exportarCSV}><Download size={16} /> CSV</Button>
          <Button variant="ghost" onClick={() => window.print()}><Printer size={16} /> PDF</Button>
        </div>
      </div>

      <SectionTitle>DRE — Demonstração de Resultado</SectionTitle>
      <Reveal>
        <Card className="p-6">
          <div className="mb-4 text-center">
            <div className="font-serif-display text-[16px] font-bold">{user.nome_negocio}</div>
            <div className="text-[12px] text-fg-dim">Competência: {new Date(mes + "-02").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</div>
          </div>
          <div className="mx-auto max-w-2xl">
            {linhasDRE.map((l) => (
              <div key={l.label} className={`flex items-center justify-between border-b border-line-soft py-3 last:border-0 ${l.bold ? "-mx-3 rounded bg-surface-2/50 px-3" : ""}`}>
                <span className={`text-[13.5px] ${l.bold ? "font-semibold" : "text-fg-muted"}`}>{l.label}</span>
                <span className={`tnum ${l.bold ? "font-serif-display text-[18px] font-bold" : "text-[14px] font-semibold"} ${l.tone === "pos" ? "text-pos" : l.tone === "crit" ? "text-crit" : ""}`}>
                  {brl(l.valor)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 text-center text-[12px] text-fg-dim">
            Margem líquida: {resumo.receita > 0 ? ((lucroLiquido / resumo.receita) * 100).toFixed(1) : "0"}%
          </div>
        </Card>
      </Reveal>

      <SectionTitle>Fluxo de caixa resumido</SectionTitle>
      <Reveal delay={0.05}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <div className="text-[12px] text-fg-muted">Total de entradas</div>
            <div className="mt-1 font-serif-display text-[22px] font-bold text-pos tnum">{brl(resumo.receita)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-[12px] text-fg-muted">Total de saídas</div>
            <div className="mt-1 font-serif-display text-[22px] font-bold text-crit tnum">{brl(resumo.despesa)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-[12px] text-fg-muted">Resultado do período</div>
            <div className={`mt-1 font-serif-display text-[22px] font-bold tnum ${resumo.lucro >= 0 ? "text-pos" : "text-crit"}`}>{brl(resumo.lucro)}</div>
          </Card>
        </div>
      </Reveal>

      <SectionTitle action={<span className="text-[12px] text-fg-dim">{txs.filter((t) => t.data.startsWith(mes)).length} lançamentos</span>}>
        Detalhamento
      </SectionTitle>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ minWidth: 560 }}>
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wide text-fg-dim">
                <th className="px-4 py-3 text-left font-semibold">Data</th>
                <th className="px-4 py-3 text-left font-semibold">Descrição</th>
                <th className="px-4 py-3 text-left font-semibold">Categoria</th>
                <th className="px-4 py-3 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {txs.filter((t) => t.data.startsWith(mes)).sort((a, b) => (a.data < b.data ? 1 : -1)).map((t) => (
                <tr key={t.id} className="border-b border-line-soft">
                  <td className="px-4 py-2.5 tnum text-fg-muted">{dataBR(t.data)}</td>
                  <td className="px-4 py-2.5">{t.descricao}</td>
                  <td className="px-4 py-2.5 text-fg-muted">{t.categoria}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold tnum ${t.tipo === "receita" ? "text-pos" : "text-crit"}`}>
                    {t.tipo === "receita" ? "+" : "−"} {brl(t.valor_centavos, false)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
