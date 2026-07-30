// ============================================================
// KRONOS — Jornada de Liberdade (gamificação do desendividamento)
// Motivação é o fator nº 1 na quitação de dívidas (por isso a Bola de
// Neve funciona). Transforma o plano em marcos, progresso e conquistas.
// ============================================================

import type { Divida } from "./types";
import { DIVIDA_TIPOS, compararEstrategias, type DividaResumo, type Metodo } from "./divida";

export interface Marco {
  ordem: number;
  credor: string;
  mes: number; // mês previsto de quitação (relativo a hoje)
  data: string; // rótulo mês/ano
  feito: boolean;
}

export interface Conquista {
  id: string;
  titulo: string;
  descricao: string;
  icone: "flag" | "scan" | "flame" | "trophy" | "half" | "budget" | "crown" | "shield";
  desbloqueada: boolean;
}

export interface Jornada {
  progressoPct: number;
  totalQuitado: number; // centavos amortizados (estimativa)
  totalOriginal: number;
  dividasQuitadas: number;
  dividasTotal: number;
  marcos: Marco[];
  proximoMarco: Marco | null;
  conquistas: Conquista[];
  frase: string;
}

/** Estima o valor original de uma dívida a partir do saldo + parcelas já pagas. */
function original(d: Divida): number {
  if (d.status === "quitada") return d.parcela_centavos * Math.max(1, d.parcelas_total || d.parcelas_pagas);
  if (d.parcela_centavos > 0 && d.parcelas_pagas > 0) return d.saldo_devedor_centavos + d.parcela_centavos * d.parcelas_pagas;
  return d.saldo_devedor_centavos;
}

export function calcularJornada(dividas: Divida[], extraMensal: number, resumo: DividaResumo, metodo: Metodo): Jornada {
  const ativas = dividas.filter((d) => d.status !== "quitada" && d.saldo_devedor_centavos > 0);
  const quitadas = dividas.filter((d) => d.status === "quitada");

  const totalOriginal = dividas.reduce((a, d) => a + original(d), 0);
  const saldoAtivo = ativas.reduce((a, d) => a + d.saldo_devedor_centavos, 0);
  const totalQuitado = Math.max(0, totalOriginal - saldoAtivo);
  const progressoPct = totalOriginal > 0 ? (totalQuitado / totalOriginal) * 100 : quitadas.length ? 100 : 0;

  // Marcos futuros vindos do plano recomendado
  const plano = compararEstrategias(dividas, extraMensal);
  const escolha = metodo === "avalanche" ? plano.avalanche : plano.neve;
  const hoje = new Date();
  const marcosFuturos: Marco[] = escolha.ordem.map((o, i) => {
    const d = new Date(hoje);
    d.setMonth(d.getMonth() + o.mesQuitacao);
    return { ordem: i + 1, credor: o.credor, mes: o.mesQuitacao, data: d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }), feito: false };
  });
  const marcosFeitos: Marco[] = quitadas.map((d, i) => ({ ordem: -quitadas.length + i, credor: d.credor, mes: 0, data: "quitada", feito: true }));
  const marcos = [...marcosFeitos, ...marcosFuturos];
  const proximoMarco = marcosFuturos[0] ?? null;

  const semToxica = ativas.every((d) => DIVIDA_TIPOS[d.tipo].toxicidade < 5);
  const raioXCompleto = dividas.length > 0 && dividas.every((d) => d.taxa_am > 0);
  const conquistas: Conquista[] = [
    { id: "primeiro-passo", titulo: "Primeiro passo", descricao: "Cadastrou a primeira dívida — encarar já é meio caminho.", icone: "flag", desbloqueada: dividas.length >= 1 },
    { id: "raio-x", titulo: "Raio-X completo", descricao: "Todas as dívidas com juros preenchidos: visão total do custo.", icone: "scan", desbloqueada: raioXCompleto },
    { id: "orcamento", titulo: "Dentro do orçamento", descricao: "Comprometimento de renda no teto saudável.", icone: "budget", desbloqueada: resumo.qtdAtivas > 0 && resumo.comprometimentoPct <= resumo.tetoPct && resumo.rendaMensal > 0 },
    { id: "fim-rotativo", titulo: "Fim do rotativo", descricao: "Zerou cartão e cheque especial — matou o juro mais caro.", icone: "flame", desbloqueada: dividas.length > 0 && semToxica },
    { id: "primeira-quitada", titulo: "Primeira quitação", descricao: "Uma dívida a menos na lista.", icone: "trophy", desbloqueada: quitadas.length >= 1 },
    { id: "meia-jornada", titulo: "Meia jornada", descricao: "Passou de 50% da dívida amortizada.", icone: "half", desbloqueada: progressoPct >= 50 },
    { id: "livre", titulo: "Liberdade", descricao: "Sem dívidas ativas. Agora é construir patrimônio.", icone: "crown", desbloqueada: dividas.length > 0 && ativas.length === 0 },
  ];

  const desbloqueadas = conquistas.filter((c) => c.desbloqueada).length;
  const frase =
    ativas.length === 0 && dividas.length > 0
      ? "Você está livre de dívidas. Hora de investir o que ia para os juros."
      : progressoPct >= 50
        ? `Mais da metade do caminho: ${progressoPct.toFixed(0)}% já amortizado. Mantenha o ritmo.`
        : proximoMarco
          ? `Próxima vitória: quitar ${proximoMarco.credor} em ${proximoMarco.data}.`
          : "Cadastre suas dívidas e o Kronos traça sua jornada até a liberdade.";

  void desbloqueadas;
  return { progressoPct, totalQuitado, totalOriginal, dividasQuitadas: quitadas.length, dividasTotal: dividas.length, marcos, proximoMarco, conquistas, frase };
}
