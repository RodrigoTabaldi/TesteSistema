// ============================================================
// KRONOS — Motor de desendividamento
// Cálculos 100% em TypeScript, sem dependências. Valores em centavos
// salvo indicação. Estratégias Avalanche (maior juro) × Bola de Neve
// (menor saldo), comprometimento de renda, custo do rotativo e
// simulação de renegociação/portabilidade.
// ============================================================

import type { Divida, DividaTipo, Perfil } from "./types";

// ---------- Metadados por tipo de dívida ----------

export interface DividaTipoMeta {
  label: string;
  /** Ordem de "toxicidade" — 5 = rotativo (fuja), 1 = estruturado/barato. */
  toxicidade: 1 | 2 | 3 | 4 | 5;
  /** Faixa típica de juro ao mês no Brasil (referência para alertas). */
  taxaTipicaAm: number;
  rotativo: boolean;
}

export const DIVIDA_TIPOS: Record<DividaTipo, DividaTipoMeta> = {
  cartao: { label: "Cartão de crédito", toxicidade: 5, taxaTipicaAm: 14, rotativo: true },
  cheque_especial: { label: "Cheque especial", toxicidade: 5, taxaTipicaAm: 8, rotativo: true },
  emprestimo: { label: "Empréstimo pessoal", toxicidade: 4, taxaTipicaAm: 6, rotativo: false },
  crediario: { label: "Crediário / carnê", toxicidade: 4, taxaTipicaAm: 7, rotativo: false },
  antecipacao: { label: "Antecipação de recebíveis", toxicidade: 3, taxaTipicaAm: 4, rotativo: false },
  capital_giro: { label: "Capital de giro", toxicidade: 3, taxaTipicaAm: 3.2, rotativo: false },
  fornecedor: { label: "Fornecedores", toxicidade: 3, taxaTipicaAm: 2, rotativo: false },
  imposto: { label: "Impostos atrasados", toxicidade: 3, taxaTipicaAm: 1.5, rotativo: false },
  financiamento: { label: "Financiamento (veículo/imóvel)", toxicidade: 2, taxaTipicaAm: 1.5, rotativo: false },
  consignado: { label: "Consignado", toxicidade: 2, taxaTipicaAm: 1.8, rotativo: false },
  estruturada: { label: "Dívida estruturada", toxicidade: 1, taxaTipicaAm: 1.2, rotativo: false },
  outro: { label: "Outra dívida", toxicidade: 3, taxaTipicaAm: 3, rotativo: false },
};

// ---------- Perfis (públicos) ----------

export interface PerfilMeta {
  label: string;
  tagline: string;
  /** Rótulo da "renda" — muda entre PF (renda) e PJ (faturamento). */
  rendaLabel: string;
  /** Documento esperado. */
  doc: "cpf" | "cnpj" | "ambos";
  /** Teto saudável de comprometimento da renda com parcelas (%). */
  tetoComprometimento: number;
  /** Tipos de dívida mais comuns deste público (sugeridos no formulário). */
  tiposComuns: DividaTipo[];
}

export const PERFIS: Record<Perfil, PerfilMeta> = {
  pf: {
    label: "Pessoa física",
    tagline: "Organize a vida, saia do vermelho e volte a sobrar dinheiro.",
    rendaLabel: "Renda mensal líquida",
    doc: "cpf",
    tetoComprometimento: 30,
    tiposComuns: ["cartao", "cheque_especial", "emprestimo", "consignado", "financiamento", "crediario"],
  },
  pj: {
    label: "Autônomo / MEI",
    tagline: "Separe o que é seu do que é da empresa e pare de rodar no crédito caro.",
    rendaLabel: "Faturamento mensal",
    doc: "ambos",
    tetoComprometimento: 25,
    tiposComuns: ["cartao", "cheque_especial", "capital_giro", "antecipacao", "emprestimo", "imposto"],
  },
  pequena: {
    label: "Pequena empresa",
    tagline: "Alongue o passivo, renegocie fornecedores e proteja o caixa da operação.",
    rendaLabel: "Faturamento mensal",
    doc: "cnpj",
    tetoComprometimento: 20,
    tiposComuns: ["capital_giro", "fornecedor", "imposto", "antecipacao", "emprestimo", "financiamento"],
  },
  empresa: {
    label: "Empresa",
    tagline: "Gerencie o perfil da dívida, a alavancagem e o cronograma de amortização.",
    rendaLabel: "Faturamento mensal",
    doc: "cnpj",
    tetoComprometimento: 15,
    tiposComuns: ["estruturada", "capital_giro", "financiamento", "fornecedor", "imposto", "antecipacao"],
  },
};

// ---------- Helpers ----------

const ativa = (d: Divida): boolean => d.status !== "quitada" && d.saldo_devedor_centavos > 0;

/** Juros que a dívida gera em 1 mês (centavos), sobre o saldo atual. */
export function jurosMensal(d: Divida): number {
  return Math.round(d.saldo_devedor_centavos * (d.taxa_am / 100));
}

/**
 * Pagamento mínimo mensal de uma dívida. Se houver parcela fixa, é ela.
 * Para rotativo (parcela 0), assume-se pagar os juros + 5% do principal —
 * o mínimo para a dívida de fato cair, e não só rolar.
 */
export function pagamentoMinimo(d: Divida): number {
  if (d.parcela_centavos > 0) return Math.min(d.parcela_centavos, d.saldo_devedor_centavos + jurosMensal(d));
  const min = jurosMensal(d) + Math.round(d.saldo_devedor_centavos * 0.05);
  return Math.min(min, d.saldo_devedor_centavos + jurosMensal(d));
}

// ---------- Resumo / diagnóstico ----------

export interface DividaResumo {
  totalSaldo: number;
  parcelaMensal: number; // soma dos pagamentos mínimos
  jurosMensal: number; // quanto os juros comem por mês
  jurosAnualEstimado: number;
  taxaMediaAm: number; // média ponderada pelo saldo
  comprometimentoPct: number; // parcela / renda
  tetoPct: number; // teto saudável do perfil
  qtdAtivas: number;
  qtdAtrasadas: number;
  qtdToxicas: number; // rotativo / toxicidade 5
  maisCara: Divida | null;
  rendaMensal: number;
  sobra: number; // renda - parcela mensal (folga de caixa)
}

export function resumoDividas(dividas: Divida[], rendaMensal: number, perfil: Perfil): DividaResumo {
  const at = dividas.filter(ativa);
  const totalSaldo = at.reduce((a, d) => a + d.saldo_devedor_centavos, 0);
  const parcelaMensal = at.reduce((a, d) => a + pagamentoMinimo(d), 0);
  const juros = at.reduce((a, d) => a + jurosMensal(d), 0);
  const taxaMediaAm = totalSaldo > 0 ? at.reduce((a, d) => a + d.taxa_am * d.saldo_devedor_centavos, 0) / totalSaldo : 0;
  const maisCara = at.reduce<Divida | null>((max, d) => (!max || d.taxa_am > max.taxa_am ? d : max), null);
  return {
    totalSaldo,
    parcelaMensal,
    jurosMensal: juros,
    jurosAnualEstimado: totalSaldo > 0 ? Math.round(totalSaldo * (Math.pow(1 + taxaMediaAm / 100, 12) - 1)) : 0,
    taxaMediaAm,
    comprometimentoPct: rendaMensal > 0 ? (parcelaMensal / rendaMensal) * 100 : 0,
    tetoPct: PERFIS[perfil].tetoComprometimento,
    qtdAtivas: at.length,
    qtdAtrasadas: at.filter((d) => d.status === "atrasada").length,
    qtdToxicas: at.filter((d) => DIVIDA_TIPOS[d.tipo].toxicidade === 5).length,
    maisCara,
    rendaMensal,
    sobra: rendaMensal - parcelaMensal,
  };
}

// ---------- Índice de saúde financeira (0–100) ----------

export interface SaudeDivida {
  score: number;
  faixa: "critico" | "atencao" | "estavel" | "saudavel";
  label: string;
  cor: string;
  fatores: { nome: string; nota: number; peso: number; detalhe: string }[];
}

export function saudeDivida(r: DividaResumo): SaudeDivida {
  // Comprometimento (35%): 0% → 100 pts; teto → 60; 2×teto+ → 0.
  const comp = r.tetoPct > 0 ? clamp(100 - (r.comprometimentoPct / (r.tetoPct * 2)) * 100, 0, 100) : 100;
  // Custo do dinheiro (30%): taxa média 0 → 100; 8%am+ → 0.
  const custo = clamp(100 - (r.taxaMediaAm / 8) * 100, 0, 100);
  // Dívida tóxica (20%): nenhuma → 100; cada rotativo ativo tira 40.
  const toxica = clamp(100 - r.qtdToxicas * 40, 0, 100);
  // Atraso (15%): nenhum → 100; cada atrasada tira 50.
  const atraso = clamp(100 - r.qtdAtrasadas * 50, 0, 100);

  const fatores = [
    { nome: "Comprometimento da renda", nota: comp, peso: 0.35, detalhe: `${r.comprometimentoPct.toFixed(0)}% da renda (teto ${r.tetoPct}%)` },
    { nome: "Custo dos juros", nota: custo, peso: 0.3, detalhe: `${r.taxaMediaAm.toFixed(1)}% a.m. médio` },
    { nome: "Exposição a dívida tóxica", nota: toxica, peso: 0.2, detalhe: r.qtdToxicas ? `${r.qtdToxicas} no rotativo` : "sem rotativo" },
    { nome: "Pagamentos em dia", nota: atraso, peso: 0.15, detalhe: r.qtdAtrasadas ? `${r.qtdAtrasadas} atrasada(s)` : "tudo em dia" },
  ];
  const score = Math.round(fatores.reduce((a, f) => a + f.nota * f.peso, 0));

  const faixa: SaudeDivida["faixa"] = score >= 75 ? "saudavel" : score >= 55 ? "estavel" : score >= 35 ? "atencao" : "critico";
  const meta: Record<SaudeDivida["faixa"], { label: string; cor: string }> = {
    saudavel: { label: "Saudável", cor: "var(--pos)" },
    estavel: { label: "Estável", cor: "var(--blue-lift)" },
    atencao: { label: "Atenção", cor: "var(--warn)" },
    critico: { label: "Crítico", cor: "var(--crit)" },
  };
  return { score, faixa, ...meta[faixa], fatores };
}

// ---------- Estratégias de quitação ----------

export type Metodo = "avalanche" | "neve";

export interface PassoQuitacao {
  mes: number;
  saldo: number; // saldo total restante ao fim do mês (centavos)
  jurosPago: number; // juros pagos no mês
}
export interface EstrategiaResultado {
  metodo: Metodo;
  meses: number;
  totalJuros: number;
  totalPago: number;
  cronograma: PassoQuitacao[];
  ordem: { credor: string; mesQuitacao: number }[];
  viavel: boolean; // false = orçamento não cobre nem os juros
}

interface SimDivida {
  credor: string;
  saldo: number;
  taxa: number; // decimal ao mês
  minimo: number;
  quitadaMes: number;
}

/**
 * Simula a quitação mês a mês com o "método bola de neve" de rolagem:
 * paga o mínimo de todas e joga TODA a folga extra na dívida-alvo
 * (maior juro = avalanche; menor saldo = bola de neve). Quando uma quita,
 * a parcela dela rola para a próxima — acelerando o processo.
 */
export function simularEstrategia(dividas: Divida[], extraMensal: number, metodo: Metodo): EstrategiaResultado {
  const sims: SimDivida[] = dividas
    .filter(ativa)
    .map((d) => ({ credor: d.credor, saldo: d.saldo_devedor_centavos, taxa: d.taxa_am / 100, minimo: pagamentoMinimo(d), quitadaMes: 0 }));

  const cronograma: PassoQuitacao[] = [];
  const totalInicial = sims.reduce((a, s) => a + s.saldo, 0);
  const orcamentoBase = sims.reduce((a, s) => a + s.minimo, 0) + Math.max(0, extraMensal);
  let totalJuros = 0;
  let totalPago = 0;
  let mes = 0;
  const LIMITE = 600; // 50 anos — evita loop infinito quando inviável

  while (sims.some((s) => s.saldo > 0) && mes < LIMITE) {
    mes++;
    let jurosMes = 0;
    // 1. Juros do mês
    for (const s of sims) {
      if (s.saldo <= 0) continue;
      const j = s.saldo * s.taxa;
      s.saldo += j;
      jurosMes += j;
    }
    // 2. Ordena as ativas pelo método
    const ativas = sims.filter((s) => s.saldo > 0);
    ativas.sort((a, b) => (metodo === "avalanche" ? b.taxa - a.taxa : a.saldo - b.saldo));

    // 3. Distribui o orçamento: mínimos primeiro, sobra cascateia no alvo
    let pool = orcamentoBase;
    for (const s of ativas) {
      const pay = Math.min(s.minimo, s.saldo, pool);
      s.saldo -= pay;
      pool -= pay;
    }
    for (const s of ativas) {
      if (pool <= 0) break;
      const pay = Math.min(s.saldo, pool);
      s.saldo -= pay;
      pool -= pay;
    }
    // 4. Marca quitações
    for (const s of ativas) if (s.saldo <= 0.5 && s.quitadaMes === 0) { s.saldo = 0; s.quitadaMes = mes; }

    totalJuros += jurosMes;
    const saldoRestante = sims.reduce((a, s) => a + Math.max(0, s.saldo), 0);
    totalPago += orcamentoBase - Math.max(0, pool);
    cronograma.push({ mes, saldo: Math.round(saldoRestante), jurosPago: Math.round(jurosMes) });

    // Inviável: o saldo não cai (orçamento < juros) — aborta.
    if (mes > 2 && saldoRestante >= totalInicial) {
      return {
        metodo, meses: Infinity, totalJuros: Math.round(totalJuros), totalPago: Math.round(totalPago),
        cronograma, ordem: [], viavel: false,
      };
    }
  }

  return {
    metodo,
    meses: mes >= LIMITE ? Infinity : mes,
    totalJuros: Math.round(totalJuros),
    totalPago: Math.round(totalInicial + totalJuros),
    cronograma,
    ordem: sims.filter((s) => s.quitadaMes > 0).sort((a, b) => a.quitadaMes - b.quitadaMes).map((s) => ({ credor: s.credor, mesQuitacao: s.quitadaMes })),
    viavel: mes < LIMITE,
  };
}

export interface ComparacaoEstrategias {
  avalanche: EstrategiaResultado;
  neve: EstrategiaResultado;
  economiaJuros: number; // quanto a avalanche economiza vs bola de neve
  mesesEconomizados: number;
  recomendado: Metodo;
  motivo: string;
}

export function compararEstrategias(dividas: Divida[], extraMensal: number): ComparacaoEstrategias {
  const avalanche = simularEstrategia(dividas, extraMensal, "avalanche");
  const neve = simularEstrategia(dividas, extraMensal, "neve");
  const economiaJuros = neve.totalJuros - avalanche.totalJuros;
  const mesesEconomizados = (Number.isFinite(neve.meses) ? neve.meses : 0) - (Number.isFinite(avalanche.meses) ? avalanche.meses : 0);
  // Avalanche sempre paga menos juros; bola de neve dá vitórias rápidas (motivação).
  const recomendado: Metodo = economiaJuros > avalanche.totalJuros * 0.03 ? "avalanche" : "neve";
  const motivo =
    recomendado === "avalanche"
      ? `A Avalanche economiza ${(economiaJuros / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} em juros — atacar o maior juro primeiro compensa.`
      : "A diferença de juros é pequena; a Bola de Neve quita contas rápido e mantém a motivação.";
  return { avalanche, neve, economiaJuros, mesesEconomizados, recomendado, motivo };
}

// ---------- Renegociação / portabilidade ----------

export interface RenegociacaoResultado {
  parcelaAntes: number;
  parcelaDepois: number;
  totalAntes: number;
  totalDepois: number;
  economia: number;
  reducaoParcelaPct: number;
}

/** Parcela pelo sistema Price (juro composto). taxaAm em %, valor/centavos. */
export function parcelaPrice(saldo: number, taxaAm: number, meses: number): number {
  if (meses <= 0) return saldo;
  const i = taxaAm / 100;
  if (i === 0) return Math.round(saldo / meses);
  return Math.round((saldo * i) / (1 - Math.pow(1 + i, -meses)));
}

export function simularRenegociacao(saldo: number, taxaAtualAm: number, taxaNovaAm: number, mesesAtual: number, mesesNovo: number): RenegociacaoResultado {
  const parcelaAntes = parcelaPrice(saldo, taxaAtualAm, mesesAtual);
  const parcelaDepois = parcelaPrice(saldo, taxaNovaAm, mesesNovo);
  const totalAntes = parcelaAntes * mesesAtual;
  const totalDepois = parcelaDepois * mesesNovo;
  return {
    parcelaAntes,
    parcelaDepois,
    totalAntes,
    totalDepois,
    economia: totalAntes - totalDepois,
    reducaoParcelaPct: parcelaAntes > 0 ? ((parcelaAntes - parcelaDepois) / parcelaAntes) * 100 : 0,
  };
}

// ---------- Recomendações por perfil ----------

export interface DividaRecomendacao {
  titulo: string;
  detalhe: string;
  impacto?: number; // centavos/mês
  prioridade: "alta" | "media" | "baixa";
}

export function recomendacoesPorPerfil(perfil: Perfil, dividas: Divida[], r: DividaResumo): DividaRecomendacao[] {
  const out: DividaRecomendacao[] = [];
  const at = dividas.filter(ativa);
  const toxicas = at.filter((d) => DIVIDA_TIPOS[d.tipo].toxicidade === 5);
  const temConsignado = at.some((d) => d.tipo === "consignado");
  const temCartaoOuChe = at.some((d) => d.tipo === "cartao" || d.tipo === "cheque_especial");

  // Universal — juro tóxico é o inimigo nº 1 de todos.
  if (toxicas.length) {
    const economia = toxicas.reduce((a, d) => a + jurosMensal(d), 0);
    out.push({
      titulo: "Mate o rotativo primeiro",
      detalhe: `Você tem ${toxicas.length} dívida(s) no cartão/cheque especial a ${r.maisCara?.taxa_am.toFixed(1)}% a.m. — o juro mais caro do mercado. Trocá-las por crédito mais barato é a maior alavanca.`,
      impacto: economia,
      prioridade: "alta",
    });
  }
  if (r.comprometimentoPct > r.tetoPct) {
    out.push({
      titulo: "Renda comprometida acima do saudável",
      detalhe: `As parcelas consomem ${r.comprometimentoPct.toFixed(0)}% do seu orçamento mensal (teto ${r.tetoPct}%). Alongue prazos para caber no orçamento antes de acelerar a quitação.`,
      prioridade: "alta",
    });
  }

  if (perfil === "pf") {
    if (temCartaoOuChe && !temConsignado) {
      out.push({ titulo: "Troque cartão por consignado/portabilidade", detalhe: "Consignado (garantido em folha) costuma custar 1,5–2% a.m. contra 12–15% do rotativo. A portabilidade de crédito também força o banco a reduzir o juro.", prioridade: "alta" });
    }
    out.push({ titulo: "Monte a reserva anti-recaída", detalhe: "Guarde ~1 mês de despesas antes de quitar tudo. Sem colchão, qualquer imprevisto joga você de volta ao cartão.", prioridade: "media" });
  } else if (perfil === "pj") {
    out.push({ titulo: "Separe a conta PF da conta PJ", detalhe: "Misturar caixa pessoal e da empresa é o erro que mais afunda o autônomo. Defina um pró-labore fixo e não financie a empresa no seu cartão pessoal.", prioridade: "alta" });
    if (at.some((d) => d.tipo === "antecipacao")) {
      out.push({ titulo: "Reduza a dependência de antecipação", detalhe: "Antecipar recebível todo mês é juro recorrente disfarçado. Um capital de giro estruturado costuma sair mais barato que antecipar direto.", prioridade: "media" });
    }
  } else if (perfil === "pequena") {
    if (at.some((d) => d.tipo === "imposto")) {
      out.push({ titulo: "Parcele tributos (REFIS/Simples)", detalhe: "Dívida tributária tem parcelamentos oficiais com juro Selic — bem mais barato que empréstimo. Regularize para não perder crédito e certidões.", prioridade: "alta" });
    }
    out.push({ titulo: "Renegocie prazo com fornecedores", detalhe: "Alongar o prazo médio de pagamento em 15–30 dias alivia o capital de giro sem custo de juros bancários.", prioridade: "media" });
  } else if (perfil === "empresa") {
    out.push({ titulo: "Alongue e barateie o perfil da dívida", detalhe: `Custo médio de ${r.taxaMediaAm.toFixed(1)}% a.m. Troque dívida curta e cara por linhas longas (debênture, BNDES) e monitore o índice Dívida/EBITDA.`, prioridade: "alta" });
    out.push({ titulo: "Case o cronograma de amortização ao caixa", detalhe: "Evite concentração de vencimentos. Distribua a amortização conforme a geração de caixa para não estressar a liquidez.", prioridade: "media" });
  }

  if (r.sobra > 0 && at.length > 1) {
    out.push({ titulo: "Direcione a folga com método", detalhe: `Você tem ${(r.sobra / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de folga por mês. Jogue tudo numa dívida-alvo (Avalanche) em vez de diluir em todas.`, prioridade: "media" });
  }

  return out;
}

// ---------- Trocas inteligentes de crédito (refinanciamento) ----------

export interface TrocaCredito {
  nome: string;
  descricao: string;
  taxaAm: number; // nova taxa
  meses: number;
  parcela: number; // centavos
  totalNovo: number; // total pago na troca
  economia: number; // vs manter a dívida atual
  cetAnual: number; // custo efetivo total ao ano (%)
  requisito: string;
  destaque: boolean;
}

/**
 * Dado a dívida mais cara, monta um "marketplace" de alternativas de crédito
 * mais baratas conforme o perfil, com CET e economia — o que um consultor
 * financeiro sugeriria, automatizado.
 */
export function melhoresTrocas(d: Divida, perfil: Perfil): TrocaCredito[] {
  const saldo = d.saldo_devedor_centavos;
  const meses = d.parcelas_total > d.parcelas_pagas ? Math.max(6, d.parcelas_total - d.parcelas_pagas) : 18;
  const totalAtual = parcelaPrice(saldo, d.taxa_am, meses) * meses;

  const cet = (taxaAm: number) => (Math.pow(1 + taxaAm / 100, 12) - 1) * 100;
  const monta = (nome: string, descricao: string, taxaAm: number, m: number, requisito: string): TrocaCredito => {
    const parcela = parcelaPrice(saldo, taxaAm, m);
    const totalNovo = parcela * m;
    return { nome, descricao, taxaAm, meses: m, parcela, totalNovo, economia: totalAtual - totalNovo, cetAnual: cet(taxaAm), requisito, destaque: false };
  };

  const cat: TrocaCredito[] = [];
  // Universais
  cat.push(monta("Portabilidade de crédito", "Leve a dívida para outro banco por juro menor — o banco atual costuma cobrir a proposta.", d.taxa_am * 0.7, meses, "Score de crédito ok"));
  cat.push(monta("Renegociação (Desenrola/mutirão)", "Acordo direto com o credor, geralmente com corte de juros e às vezes do saldo.", Math.max(1.2, d.taxa_am * 0.45), Math.max(6, Math.round(meses * 0.8)), "Negociar com o credor"));

  if (perfil === "pf" || perfil === "pj") {
    cat.push(monta("Crédito consignado", "Garantido em folha/benefício — um dos juros mais baixos do mercado.", 1.8, Math.min(84, meses + 12), "Vínculo CLT/INSS ou margem"));
    cat.push(monta("Antecipação saque-aniversário FGTS", "Antecipe o saque-aniversário para quitar dívida cara.", 1.75, meses, "Saldo no FGTS + opção saque-aniversário"));
  }
  if (perfil === "pj" || perfil === "pequena" || perfil === "empresa") {
    cat.push(monta("Capital de giro com garantia", "Linha garantida (recebíveis/imóvel) sai bem mais barata que a sem garantia.", 2.2, meses, "Garantia/recebíveis"));
  }
  if (perfil === "empresa") {
    cat.push(monta("Alongamento estruturado (debênture/BNDES)", "Troca dívida curta e cara por prazo longo e taxa baixa.", 1.3, Math.max(24, meses + 24), "Porte e rating"));
  }

  const elegiveis = cat.filter((t) => t.taxaAm < d.taxa_am && t.economia > 0).sort((a, b) => b.economia - a.economia).slice(0, 4);
  if (elegiveis[0]) elegiveis[0].destaque = true;
  return elegiveis;
}

// ---------- util ----------
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
