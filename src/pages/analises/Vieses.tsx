import { useMemo } from "react";
import { Brain, Quote, Eye } from "lucide-react";
import { useMinhasTransacoes } from "@/lib/store";
import { detectarVieses } from "@/lib/utils";
import { Card, EmptyState } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { AnaliseHeader } from "@/components/analytics";

export default function Vieses() {
  const txs = useMinhasTransacoes();
  const vieses = useMemo(() => detectarVieses(txs), [txs]);

  return (
    <div>
      <AnaliseHeader tone="violet" icon={<Brain size={22} />} titulo="Vieses Cognitivos" descricao="Erros comuns de percepção que os números revelam — para decidir com a cabeça fria." />

      {vieses.length === 0 ? (
        <EmptyState
          icon={<Brain size={30} />}
          title="Nenhum viés detectado agora"
          desc="Com mais alguns meses de dados, o Kronos identifica padrões de pensamento (recência, otimismo, confirmação) que costumam distorcer decisões."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {vieses.map((v, i) => (
            <Reveal key={v.id} delay={0.05 * i}>
              <Card className="p-5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[color-mix(in_srgb,#8b5cf6_20%,transparent)] text-[#a78bfa]"><Brain size={18} /></span>
                  <h4 className="font-serif-display text-[17px] font-bold">{v.vies}</h4>
                </div>
                <p className="mt-2 text-[12px] text-fg-dim">Gatilho: {v.gatilho}</p>

                <div className="mt-3 flex gap-2.5 rounded-lg border border-line-soft bg-surface-2 p-3">
                  <Quote size={15} className="mt-0.5 flex-none text-fg-dim" />
                  <p className="text-[13px] italic text-fg-muted">{v.percepcao}</p>
                </div>

                <div className="mt-2.5 flex gap-2.5 rounded-lg border border-[color-mix(in_srgb,var(--blue)_35%,var(--line))] bg-[color-mix(in_srgb,var(--blue)_8%,transparent)] p-3">
                  <Eye size={15} className="mt-0.5 flex-none text-blue-lift" />
                  <p className="text-[13px]"><b className="text-blue-lift">Realidade:</b> {v.realidade}</p>
                </div>

                <div className="mt-3 rounded-md border border-gold bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] px-3.5 py-2.5 text-[13px]">
                  <b className="text-gold-soft">Ação:</b> {v.acao}
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
