// ============================================================
// KRONOS — Kairós, o Copiloto Financeiro
// Kairós = o momento oportuno. Cruza transações + dívidas + perfil e
// devolve a PRÓXIMA MELHOR AÇÃO priorizada por impacto em R$. Motor de
// regras 100% local (pronto para refino via Claude API no futuro).
// ============================================================

import type { Transacao, Divida, Perfil } from "./types";
import { gerarPrevisao, detectarFuga } from "./utils";
import { resumoDividas, saudeDivida, melhoresTrocas, jurosMensal, DIVIDA_TIPOS, PERFIS } from "./divida";

export type Gravidade = "urgente" | "importante" | "oportunidade" | "positivo";
export type IconeInsight = "flame" | "alert" | "trend" | "wallet" | "shield" | "sparkles" | "target" | "piggy" | "handshake";

export interface Insight {
  id: string;
  gravidade: Gravidade;
  titulo: string;
  descricao: string;
  acao: string;
  rota: string;
  impactoReais: number; // ganho/economia estimado (centavos); 0 se não quantificável
  periodo: "mes" | "unico";
  score: number; // prioridade (maior = mais no topo)
  icone: IconeInsight;
}

export interface CopilotoResultado {
  proximaAcao: Insight | null;
  insights: Insight[];
  economiaMensalPotencial: number;
  saudeScore: number;
  saudeLabel: string;
  resumoTexto: string;
}

const PESO: Record<Gravidade, number> = { urgente: 1000, importante: 600, oportunidade: 300, positivo: 50 };

export function rodarCopiloto(txs: Transacao[], dividas: Divida[], perfil: Perfil, rendaMensal: number): CopilotoResultado {
  const insights: Insight[] = [];
  const resumo = resumoDividas(dividas, rendaMensal, perfil);
  const saude = saudeDivida(resumo);
  const ativas = dividas.filter((d) => d.status !== "quitada" && d.saldo_devedor_centavos > 0);
  const rendaLabel = PERFIS[perfil].rendaLabel.toLowerCase();

  const add = (i: Omit<Insight, "score">) => insights.push({ ...i, score: PESO[i.gravidade] + Math.min(399, Math.round(i.impactoReais / 1000)) });

  // 1. Dívidas atrasadas — urgente
  const atrasadas = ativas.filter((d) => d.status === "atrasada");
  if (atrasadas.length) {
    add({
      id: "atrasadas", gravidade: "urgente", icone: "alert",
      titulo: `${atrasadas.length} dívida(s) atrasada(s)`,
      descricao: "Atraso vira juros de mora, multa e negativação (Serasa/SPC). Regularizar ou renegociar isso vem antes de qualquer outra coisa.",
      acao: "Renegociar agora", rota: "/dividas", impactoReais: 0, periodo: "unico",
    });
  }

  // 2. Rotativo / dívida tóxica — urgente, impacto = juros/mês evitáveis
  const toxicas = ativas.filter((d) => DIVIDA_TIPOS[d.tipo].toxicidade === 5);
  if (toxicas.length && resumo.maisCara) {
    const trocas = melhoresTrocas(resumo.maisCara, perfil);
    const economia = toxicas.reduce((a, d) => a + jurosMensal(d), 0) - Math.round(toxicas.reduce((a, d) => a + d.saldo_devedor_centavos, 0) * 0.02);
    add({
      id: "rotativo", gravidade: "urgente", icone: "flame",
      titulo: "Corte o rotativo do cartão/cheque especial",
      descricao: `${resumo.maisCara.credor} cobra ${resumo.maisCara.taxa_am.toFixed(1)}% a.m. ${trocas[0] ? `Trocar por ${trocas[0].nome} (${trocas[0].taxaAm.toFixed(1)}% a.m.) economiza no total.` : "Troque por crédito mais barato."}`,
      acao: "Ver trocas inteligentes", rota: "/dividas", impactoReais: Math.max(0, economia), periodo: "mes",
    });
  }

  // 3. Comprometimento acima do teto — importante
  if (rendaMensal > 0 && resumo.comprometimentoPct > resumo.tetoPct && ativas.length) {
    add({
      id: "comprometimento", gravidade: "importante", icone: "wallet",
      titulo: "Renda muito comprometida",
      descricao: `As parcelas somam ${resumo.comprometimentoPct.toFixed(0)}% da sua ${rendaLabel} (teto ${resumo.tetoPct}%). Alongar prazos reduz a parcela e desafoga o mês.`,
      acao: "Simular renegociação", rota: "/dividas", impactoReais: 0, periodo: "mes",
    });
  }

  // 4. Previsão de caixa negativo — urgente
  if (txs.length >= 5) {
    const prev = gerarPrevisao(txs, 60);
    if (prev.dia_saldo_negativo) {
      add({
        id: "caixa-negativo", gravidade: "urgente", icone: "trend",
        titulo: "Seu caixa pode ficar negativo",
        descricao: `Pela tendência, o saldo fura o zero por volta de ${new Date(prev.dia_saldo_negativo).toLocaleDateString("pt-BR")}. Antecipe recebimentos ou segure despesas não essenciais.`,
        acao: "Ver previsão", rota: "/analises/previsao", impactoReais: 0, periodo: "unico",
      });
    }
  }

  // 5. Fuga de dinheiro (vazamentos) — oportunidade
  if (txs.length >= 8) {
    const fugas = detectarFuga(txs);
    const economia = fugas.reduce((a, f) => a + f.economia_potencial, 0);
    if (fugas.length) {
      add({
        id: "fuga", gravidade: "oportunidade", icone: "piggy",
        titulo: `${fugas.length} vazamento(s) de dinheiro`,
        descricao: `Gastos que dá para cortar sem doer — ex.: ${fugas[0].titulo}. O dinheiro liberado acelera a quitação.`,
        acao: "Detectar fuga", rota: "/analises/detectar-fuga", impactoReais: economia, periodo: "mes",
      });
    }
  }

  // 6. Folga de caixa ociosa — oportunidade (direcionar para dívida-alvo)
  if (resumo.sobra > 0 && ativas.length > 1) {
    add({
      id: "folga", gravidade: "oportunidade", icone: "target",
      titulo: "Direcione sua folga com método",
      descricao: `Sobram ${(resumo.sobra / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por mês. Jogue tudo numa única dívida-alvo (Avalanche) — quita mais rápido do que diluir em todas.`,
      acao: "Montar plano", rota: "/dividas", impactoReais: 0, periodo: "mes",
    });
  }

  // 7. Sem renda cadastrada — importante (destrava o diagnóstico)
  if (rendaMensal <= 0 && ativas.length) {
    add({
      id: "sem-renda", gravidade: "importante", icone: "wallet",
      titulo: `Informe sua ${rendaLabel}`,
      descricao: "Sem esse número o Kronos não calcula o comprometimento de renda — a métrica que separa dívida saudável de bola de neve.",
      acao: "Abrir configurações", rota: "/settings", impactoReais: 0, periodo: "unico",
    });
  }

  // Reforço positivo — quando está no caminho certo
  if (!toxicas.length && !atrasadas.length && ativas.length) {
    add({
      id: "positivo", gravidade: "positivo", icone: "shield",
      titulo: "Sem juros tóxicos ativos",
      descricao: "Você não tem cartão nem cheque especial rolando — o pior inimigo está fora. Foco agora em amortizar mais rápido.",
      acao: "Ver jornada", rota: "/dividas", impactoReais: 0, periodo: "unico",
    });
  }
  if (dividas.length > 0 && ativas.length === 0) {
    add({
      id: "livre", gravidade: "positivo", icone: "sparkles",
      titulo: "Livre de dívidas 🎉",
      descricao: "Redirecione o valor que ia para juros: reserva de emergência e depois investimentos.",
      acao: "Ver investimentos", rota: "/investimentos", impactoReais: 0, periodo: "unico",
    });
  }

  insights.sort((a, b) => b.score - a.score);
  const economiaMensalPotencial = insights.filter((i) => i.periodo === "mes").reduce((a, i) => a + i.impactoReais, 0);
  const proximaAcao = insights[0] ?? null;

  const resumoTexto =
    proximaAcao == null
      ? "Cadastre dívidas e lançamentos para o Kairós montar seu plano."
      : proximaAcao.gravidade === "urgente"
        ? "Há algo urgente exigindo sua atenção agora."
        : economiaMensalPotencial > 0
          ? `Identifiquei até ${(economiaMensalPotencial / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês em oportunidades.`
          : "Seu plano está no rumo — siga os próximos passos.";

  return { proximaAcao, insights, economiaMensalPotencial, saudeScore: saude.score, saudeLabel: saude.label, resumoTexto };
}
