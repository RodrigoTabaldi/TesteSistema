// ============================================================
// KRONOS — Business & financial calculations
// Tabelas 2024/2025 hardcoded (MVP). Valores em reais salvo nota.
// ============================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina classes Tailwind com merge inteligente (shadcn pattern). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ---------- Validadores ----------

export function validaCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (base: string, fator: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += parseInt(base[i]) * (fator - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = calc(c.slice(0, 9), 10);
  const d2 = calc(c.slice(0, 10), 11);
  return d1 === parseInt(c[9]) && d2 === parseInt(c[10]);
}

export function validaCNPJ(cnpj: string): boolean {
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (base: string): number => {
    const pesos =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += parseInt(base[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(c.slice(0, 12));
  const d2 = calc(c.slice(0, 13));
  return d1 === parseInt(c[12]) && d2 === parseInt(c[13]);
}

export function validaEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validaDocumento(doc: string): boolean {
  const c = doc.replace(/\D/g, "");
  return c.length === 11 ? validaCPF(doc) : validaCNPJ(doc);
}

// ---------- MEI ----------

export const MEI_LIMITE_ANUAL = 81000;
export const MEI_DAS = {
  comercio: 76.9, // INSS + ICMS (2025)
  servico: 80.9, // INSS + ISS
};

export interface MeiResult {
  faturamento: number;
  limite: number;
  percentualUsado: number;
  dasMensal: number;
  vaiEstourar: boolean;
  margemRestante: number;
}

export function calcularMEI(faturamentoAnual: number, tipo: "comercio" | "servico" = "servico"): MeiResult {
  const percentualUsado = (faturamentoAnual / MEI_LIMITE_ANUAL) * 100;
  return {
    faturamento: faturamentoAnual,
    limite: MEI_LIMITE_ANUAL,
    percentualUsado,
    dasMensal: MEI_DAS[tipo],
    vaiEstourar: faturamentoAnual > MEI_LIMITE_ANUAL,
    margemRestante: Math.max(0, MEI_LIMITE_ANUAL - faturamentoAnual),
  };
}

// ---------- Simples Nacional (Anexo III — serviços) ----------

interface FaixaSimples {
  ate: number;
  aliquota: number; // nominal
  deduzir: number;
}

// Anexo III (2024) — salão, barbearia, oficina de serviços
export const SIMPLES_ANEXO_III: FaixaSimples[] = [
  { ate: 180000, aliquota: 0.06, deduzir: 0 },
  { ate: 360000, aliquota: 0.112, deduzir: 9360 },
  { ate: 720000, aliquota: 0.135, deduzir: 17640 },
  { ate: 1800000, aliquota: 0.16, deduzir: 35640 },
  { ate: 3600000, aliquota: 0.21, deduzir: 125640 },
  { ate: 4800000, aliquota: 0.33, deduzir: 648000 },
];

export interface SimplesResult {
  rbt12: number;
  faixa: number;
  aliquotaNominal: number;
  aliquotaEfetiva: number;
  impostoMensal: number;
}

/** rbt12 = receita bruta dos últimos 12 meses; faturamentoMes = mês corrente */
export function calcularSimples(rbt12: number, faturamentoMes: number): SimplesResult {
  const faixa = SIMPLES_ANEXO_III.find((f) => rbt12 <= f.ate) ?? SIMPLES_ANEXO_III[SIMPLES_ANEXO_III.length - 1];
  const idx = SIMPLES_ANEXO_III.indexOf(faixa);
  const aliquotaEfetiva = rbt12 > 0 ? (rbt12 * faixa.aliquota - faixa.deduzir) / rbt12 : faixa.aliquota;
  return {
    rbt12,
    faixa: idx + 1,
    aliquotaNominal: faixa.aliquota,
    aliquotaEfetiva: Math.max(0, aliquotaEfetiva),
    impostoMensal: Math.max(0, aliquotaEfetiva * faturamentoMes),
  };
}

// ---------- IRPF (tabela anual 2024) ----------

interface FaixaIRPF {
  ate: number;
  aliquota: number;
  deduzir: number;
}

export const IRPF_2024: FaixaIRPF[] = [
  { ate: 26963.2, aliquota: 0, deduzir: 0 },
  { ate: 33919.8, aliquota: 0.075, deduzir: 2022.24 },
  { ate: 45012.6, aliquota: 0.15, deduzir: 4566.23 },
  { ate: 55976.16, aliquota: 0.225, deduzir: 7942.17 },
  { ate: Infinity, aliquota: 0.275, deduzir: 10740.98 },
];

export interface IrpfResult {
  rendaBruta: number;
  deducoes: number;
  baseCalculo: number;
  aliquota: number;
  impostoDevido: number;
  aliquotaEfetiva: number;
  rendaLiquida: number;
}

export function calcularIRPF(rendaBruta: number, deducoes: number): IrpfResult {
  const base = Math.max(0, rendaBruta - deducoes);
  const faixa = IRPF_2024.find((f) => base <= f.ate) ?? IRPF_2024[IRPF_2024.length - 1];
  const imposto = Math.max(0, base * faixa.aliquota - faixa.deduzir);
  return {
    rendaBruta,
    deducoes,
    baseCalculo: base,
    aliquota: faixa.aliquota,
    impostoDevido: imposto,
    aliquotaEfetiva: rendaBruta > 0 ? imposto / rendaBruta : 0,
    rendaLiquida: rendaBruta - imposto,
  };
}

// ---------- IRRF sobre nota (PJ) ----------

/** Retenção 1,5% para serviços profissionais quando tomador é PJ */
export function calcularIRRF(valorNota: number, aliquota = 0.015): number {
  return valorNota * aliquota;
}

// ---------- ISS ----------
export function calcularISS(valorServico: number, aliquota = 0.05): number {
  return valorServico * aliquota;
}

// ---------- Juros compostos / investimento ----------

export interface PontoTempo {
  mes: number;
  investido: number;
  saldo: number;
  juros: number;
}

export interface JurosResult {
  saldoFinal: number;
  totalInvestido: number;
  totalJuros: number;
  serie: PontoTempo[];
}

/** taxaAnual em % (ex 8) -> juros compostos com aporte mensal */
export function jurosCompostos(
  inicial: number,
  aporteMensal: number,
  taxaAnual: number,
  meses: number
): JurosResult {
  const i = Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;
  const serie: PontoTempo[] = [];
  let saldo = inicial;
  let investido = inicial;
  for (let m = 1; m <= meses; m++) {
    saldo = saldo * (1 + i) + aporteMensal;
    investido += aporteMensal;
    serie.push({ mes: m, investido, saldo, juros: saldo - investido });
  }
  return {
    saldoFinal: saldo,
    totalInvestido: investido,
    totalJuros: saldo - investido,
    serie,
  };
}

// ---------- Inflação (poder de compra) ----------

export function poderDeCompra(valorHoje: number, inflacaoAnual: number, anos: number): number {
  return valorHoje / Math.pow(1 + inflacaoAnual / 100, anos);
}

// ---------- Financiamento (Tabela Price) ----------

export interface ParcelaFin {
  n: number;
  juros: number;
  amortizacao: number;
  saldo: number;
}

export interface FinResult {
  parcela: number;
  totalPago: number;
  totalJuros: number;
  tabela: ParcelaFin[];
}

/** taxaMensal em % (ex 1.5) */
export function financiamentoPrice(valor: number, taxaMensal: number, meses: number): FinResult {
  const i = taxaMensal / 100;
  const parcela = i === 0 ? valor / meses : (valor * i) / (1 - Math.pow(1 + i, -meses));
  const tabela: ParcelaFin[] = [];
  let saldo = valor;
  for (let n = 1; n <= meses; n++) {
    const juros = saldo * i;
    const amort = parcela - juros;
    saldo = Math.max(0, saldo - amort);
    tabela.push({ n, juros, amortizacao: amort, saldo });
  }
  return {
    parcela,
    totalPago: parcela * meses,
    totalJuros: parcela * meses - valor,
    tabela,
  };
}

// ---------- Consórcio ----------

export interface ConsorcioResult {
  parcela: number;
  totalPago: number;
  custoAdministracao: number;
  meses: number;
}

export function consorcio(valorAlvo: number, taxaAdmTotal: number, meses: number): ConsorcioResult {
  const custoAdm = valorAlvo * (taxaAdmTotal / 100);
  const total = valorAlvo + custoAdm;
  return {
    parcela: total / meses,
    totalPago: total,
    custoAdministracao: custoAdm,
    meses,
  };
}

// ---------- Break-even ----------

export interface BreakEvenResult {
  pontoEquilibrio: number; // unidades
  margemContribuicao: number;
  receitaEquilibrio: number;
  viavel: boolean;
}

export function breakEven(custoFixo: number, precoVenda: number, custoVariavel: number): BreakEvenResult {
  const mc = precoVenda - custoVariavel;
  const ponto = mc > 0 ? custoFixo / mc : Infinity;
  return {
    pontoEquilibrio: ponto,
    margemContribuicao: mc,
    receitaEquilibrio: ponto === Infinity ? Infinity : ponto * precoVenda,
    viavel: mc > 0,
  };
}

// ---------- Viabilidade ----------

export interface ViabilidadeResult {
  lucroAtual: number;
  margemAtual: number;
  metaLucroValor: number;
  atingeMeta: boolean;
  gap: number;
  sugestao: string;
}

export function viabilidade(faturamento: number, despesa: number, metaMargemPct: number): ViabilidadeResult {
  const lucro = faturamento - despesa;
  const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
  const metaValor = faturamento * (metaMargemPct / 100);
  const gap = metaValor - lucro;
  return {
    lucroAtual: lucro,
    margemAtual: margem,
    metaLucroValor: metaValor,
    atingeMeta: lucro >= metaValor,
    gap,
    sugestao:
      lucro >= metaValor
        ? "Meta atingida. Considere reinvestir o excedente."
        : gap < despesa * 0.1
        ? "Falta pouco: cortar custos pode ser suficiente."
        : "Gap alto: reveja preços e reduza custos fixos.",
  };
}

// ---------- Agregações de dashboard ----------

export interface ResumoFinanceiro {
  receita: number;
  despesa: number;
  lucro: number;
  margem: number;
}

export function resumoDoMes(
  transacoes: { tipo: string; valor_centavos: number; data: string; status: string }[],
  mesISO: string
): ResumoFinanceiro {
  let receita = 0;
  let despesa = 0;
  for (const t of transacoes) {
    if (!t.data.startsWith(mesISO)) continue;
    if (t.tipo === "receita") receita += t.valor_centavos;
    else despesa += t.valor_centavos;
  }
  const lucro = receita - despesa;
  return {
    receita,
    despesa,
    lucro,
    margem: receita > 0 ? (lucro / receita) * 100 : 0,
  };
}

// ============================================================
// ANÁLISES AVANÇADAS — cálculos puros (sem IA, sem dados fake).
// Cada função recebe dados reais e devolve tipos de types.ts.
// ============================================================

import { brl, dataBR, uid } from "./format";
import type {
  Transacao,
  PrevisaoResultado,
  PrevisaoPonto,
  Tendencia,
  BenchmarkResultado,
  BenchmarkMetrica,
  StatusMetrica,
  EstiloVidaResultado,
  CapitalGiroResultado,
  FugaAnomalia,
  PrecoResultado,
  PrecoCenario,
  ParetoResultado,
  ServicoMix,
  RoiResultado,
  VarianceResultado,
  DecisaoResultado,
  DecisaoOpcao,
  ViesCognitivo,
  Recomendacao,
  Dificuldade,
} from "./types";

const DIA_MS = 86_400_000;
const iso = (d: Date): string => d.toISOString().slice(0, 10);

/** Saldo acumulado (centavos) a partir de todas as transações. */
export function saldoAcumulado(txs: Transacao[]): number {
  return txs.reduce((a, t) => a + (t.tipo === "receita" ? t.valor_centavos : -t.valor_centavos), 0);
}

/** Série mensal agregada (ordenada asc). */
export interface MesAgregado {
  mes: string;
  receita: number;
  despesa: number;
  lucro: number;
}
export function serieMensal(txs: Transacao[]): MesAgregado[] {
  const map = new Map<string, { receita: number; despesa: number }>();
  for (const t of txs) {
    const m = t.data.slice(0, 7);
    const cur = map.get(m) ?? { receita: 0, despesa: 0 };
    if (t.tipo === "receita") cur.receita += t.valor_centavos;
    else cur.despesa += t.valor_centavos;
    map.set(m, cur);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([mes, v]) => ({ mes, receita: v.receita, despesa: v.despesa, lucro: v.receita - v.despesa }));
}

// ---------- 1. Previsão de fluxo (regressão + sazonalidade semanal) ----------

export function gerarPrevisao(txs: Transacao[], dias = 90): PrevisaoResultado {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Net diário dos últimos 120 dias observados.
  const JANELA = 120;
  const netPorDia = new Map<string, number>();
  for (const t of txs) {
    const key = t.data.slice(0, 10);
    const v = t.tipo === "receita" ? t.valor_centavos : -t.valor_centavos;
    netPorDia.set(key, (netPorDia.get(key) ?? 0) + v);
  }

  const amostras: number[] = [];
  const porDiaSemana: number[][] = [[], [], [], [], [], [], []];
  for (let i = JANELA - 1; i >= 0; i--) {
    const d = new Date(hoje.getTime() - i * DIA_MS);
    const net = netPorDia.get(iso(d)) ?? 0;
    amostras.push(net);
    porDiaSemana[d.getDay()].push(net);
  }

  const media = amostras.length ? amostras.reduce((a, b) => a + b, 0) / amostras.length : 0;
  const variancia = amostras.length ? amostras.reduce((a, b) => a + (b - media) ** 2, 0) / amostras.length : 0;
  const desvio = Math.sqrt(variancia);
  const mediaDiaSemana = porDiaSemana.map((arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : media));

  const saldoInicial = saldoAcumulado(txs);
  const pontos: PrevisaoPonto[] = [];
  let saldo = saldoInicial;
  let diaNegativo: string | null = null;

  for (let k = 1; k <= dias; k++) {
    const d = new Date(hoje.getTime() + k * DIA_MS);
    saldo += mediaDiaSemana[d.getDay()];
    const banda = 1.64 * desvio * Math.sqrt(k); // 90% de confiança, cresce com o horizonte
    const ponto: PrevisaoPonto = { data: iso(d), saldo: Math.round(saldo), min: Math.round(saldo - banda), max: Math.round(saldo + banda) };
    pontos.push(ponto);
    if (diaNegativo === null && saldo < 0) diaNegativo = ponto.data;
  }

  const saldoFinal = pontos.length ? pontos[pontos.length - 1].saldo : saldoInicial;
  const slope = media;
  const tendencia: Tendencia = slope > desvio * 0.1 ? "alta" : slope < -desvio * 0.1 ? "queda" : "estavel";

  const alertas: string[] = [];
  if (diaNegativo) alertas.push(`Saldo pode ficar negativo em ${dataBR(diaNegativo)}.`);
  if (tendencia === "queda") alertas.push("Tendência de queda no saldo ao longo do período.");
  if (saldoInicial < 100_000) alertas.push("Saldo inicial baixo (abaixo de R$ 1.000).");

  const recomendacoes: Recomendacao[] = [];
  if (tendencia !== "alta") {
    recomendacoes.push({ titulo: "Aumentar faturamento", detalhe: "Ative campanhas ou pacotes para elevar o ticket médio antes da janela crítica.", dificuldade: "medio" });
  }
  if (slope < 0) {
    recomendacoes.push({ titulo: "Cortar custos variáveis", detalhe: "Reduza despesas não essenciais para desacelerar a queima de caixa.", impacto_reais: Math.round(Math.abs(slope) * 30), dificuldade: "facil" });
  }
  if (recomendacoes.length === 0) {
    recomendacoes.push({ titulo: "Reinvestir com cautela", detalhe: "Fluxo saudável: parte do excedente pode ir para reserva ou crescimento.", dificuldade: "facil" });
  }

  return { periodo_dias: dias, pontos, saldo_inicial: saldoInicial, saldo_final_esperado: saldoFinal, tendencia, dia_saldo_negativo: diaNegativo, alertas, recomendacoes };
}

// ---------- 2. Benchmarking (medianas de referência do setor) ----------

/** Medianas de referência por segmento (constantes de mercado — não são dados do usuário). */
export const BENCHMARK_REF: Record<string, { ticket: number; margem: number; despesaFixaPct: number; recorrenciaPct: number; ocupacaoPct: number }> = {
  salao: { ticket: 8500, margem: 22, despesaFixaPct: 45, recorrenciaPct: 40, ocupacaoPct: 65 },
  barbearia: { ticket: 5500, margem: 28, despesaFixaPct: 38, recorrenciaPct: 55, ocupacaoPct: 70 },
  oficina: { ticket: 32000, margem: 18, despesaFixaPct: 52, recorrenciaPct: 25, ocupacaoPct: 60 },
  estetica: { ticket: 14000, margem: 30, despesaFixaPct: 42, recorrenciaPct: 50, ocupacaoPct: 62 },
  generico: { ticket: 10000, margem: 24, despesaFixaPct: 45, recorrenciaPct: 40, ocupacaoPct: 64 },
};

function statusDe(voce: number, mediana: number, maiorMelhor = true): StatusMetrica {
  const dif = (voce - mediana) / (mediana || 1);
  if (Math.abs(dif) < 0.05) return "igual";
  const acima = dif > 0;
  return (maiorMelhor ? acima : !acima) ? "acima" : "abaixo";
}

export interface BenchmarkInput {
  segmento: keyof typeof BENCHMARK_REF;
  ticket: number; // centavos
  margem: number; // %
  despesaFixaPct: number;
  recorrenciaPct: number;
  ocupacaoPct: number;
}

export function calcularBenchmarking(input: BenchmarkInput): BenchmarkResultado {
  const ref = BENCHMARK_REF[input.segmento] ?? BENCHMARK_REF.generico;
  const top = (m: number) => m * 1.35; // proxy do top 20% = +35% sobre a mediana

  const def: { chave: string; label: string; unidade: BenchmarkMetrica["unidade"]; voce: number; mediana: number; maiorMelhor: boolean }[] = [
    { chave: "ticket", label: "Ticket médio", unidade: "reais", voce: input.ticket, mediana: ref.ticket, maiorMelhor: true },
    { chave: "margem", label: "Margem de lucro", unidade: "pct", voce: input.margem, mediana: ref.margem, maiorMelhor: true },
    { chave: "recorrencia", label: "Clientes recorrentes", unidade: "pct", voce: input.recorrenciaPct, mediana: ref.recorrenciaPct, maiorMelhor: true },
    { chave: "ocupacao", label: "Taxa de ocupação", unidade: "pct", voce: input.ocupacaoPct, mediana: ref.ocupacaoPct, maiorMelhor: true },
    { chave: "despesaFixa", label: "Despesa fixa / receita", unidade: "pct", voce: input.despesaFixaPct, mediana: ref.despesaFixaPct, maiorMelhor: false },
  ];

  const metricas: BenchmarkMetrica[] = def.map((d) => ({
    chave: d.chave,
    label: d.label,
    unidade: d.unidade,
    voce: d.voce,
    mediana: d.mediana,
    top20: d.maiorMelhor ? Math.round(top(d.mediana)) : Math.round(d.mediana * 0.7),
    status: statusDe(d.voce, d.mediana, d.maiorMelhor),
  }));

  const oportunidades: Recomendacao[] = metricas
    .filter((m) => m.status === "abaixo")
    .map((m) => {
      const gapReais =
        m.chave === "ticket"
          ? (m.mediana - m.voce) * 20 // 20 atendimentos/mês de referência
          : m.chave === "margem"
          ? Math.round((m.mediana - m.voce) * 1000)
          : undefined;
      return {
        titulo: `Elevar ${m.label.toLowerCase()}`,
        detalhe: `Você está em ${m.unidade === "reais" ? brl(m.voce) : m.voce + "%"}, mediana do setor é ${m.unidade === "reais" ? brl(m.mediana) : m.mediana + "%"}.`,
        impacto_reais: gapReais && gapReais > 0 ? gapReais : undefined,
        dificuldade: (m.chave === "ticket" ? "medio" : "dificil") as Dificuldade,
      };
    });

  return { segmento: input.segmento, metricas, oportunidades };
}

// ---------- 3. Estilo de vida do dono ----------

export function analiseEstiloVida(despesaPessoalTotal: number, lucroNegocio: number): EstiloVidaResultado {
  const gap = lucroNegocio - despesaPessoalTotal;
  const cobre = gap >= 0;
  const passos_equilibrio: { label: string; delta: number }[] = [
    { label: "Lucro do negócio", delta: lucroNegocio },
    { label: "Retiradas pessoais", delta: -despesaPessoalTotal },
    { label: cobre ? "Sobra" : "Déficit", delta: gap },
  ];

  const recomendacoes: Recomendacao[] = [];
  if (!cobre) {
    const falta = Math.abs(gap);
    recomendacoes.push(
      { titulo: "Aumentar o lucro", detalhe: `Elevar o lucro em ${brl(falta)} fecha o rombo mensal.`, impacto_reais: falta, dificuldade: "medio" },
      { titulo: "Reduzir despesa pessoal", detalhe: `Cortar ${brl(Math.round(falta / 2))} em gastos pessoais reduz metade da pressão.`, impacto_reais: Math.round(falta / 2), dificuldade: "medio" },
      { titulo: "Renda extra", detalhe: "Uma fonte complementar cobre o gap sem depender só do negócio.", dificuldade: "dificil" },
      { titulo: "Empréstimo (último recurso)", detalhe: "Cobre o caixa no curto prazo, mas gera juros — use com plano de saída.", dificuldade: "facil" }
    );
  } else {
    recomendacoes.push({ titulo: "Formar reserva", detalhe: `Sobram ${brl(gap)}/mês. Direcione para uma reserva de 3–6 meses de custos.`, impacto_reais: gap, dificuldade: "facil" });
  }

  return { despesa_pessoal_total: despesaPessoalTotal, lucro_negocio: lucroNegocio, gap, cobre, passos_equilibrio, recomendacoes };
}

// ---------- 4. Capital de giro ----------

export function calcularCapitalGiro(txs: Transacao[]): CapitalGiroResultado {
  // Prazo de recebimento: fração de receitas pendentes vira dias médios (proxy).
  const receitas = txs.filter((t) => t.tipo === "receita");
  const despesas = txs.filter((t) => t.tipo === "despesa");
  const pendReceita = receitas.filter((t) => t.status === "pendente").length / (receitas.length || 1);
  const pendDespesa = despesas.filter((t) => t.status === "pendente").length / (despesas.length || 1);

  const prazoRecebimento = Math.round(5 + pendReceita * 45); // 5–50 dias
  const prazoPagamento = Math.round(5 + pendDespesa * 40); // 5–45 dias
  const cicloCaixa = Math.max(0, prazoRecebimento - prazoPagamento);

  const meses = serieMensal(txs);
  const ultimos = meses.slice(-3);
  const despesaMensalMedia = ultimos.length ? ultimos.reduce((a, m) => a + m.despesa, 0) / ultimos.length : 0;
  const giroNecessario = Math.round((despesaMensalMedia / 30) * cicloCaixa);
  const giroAtual = Math.max(0, saldoAcumulado(txs));
  const deficit = Math.max(0, giroNecessario - giroAtual);

  const solucoes: CapitalGiroResultado["solucoes"] = [
    { nome: "Negociar prazo com fornecedores", impacto_dias: -Math.round(prazoPagamento * 0.4), impacto_reais: Math.round(giroNecessario * 0.3), dificuldade: "medio" },
    { nome: "Cobrar à vista / antecipar recebíveis", impacto_dias: -Math.round(prazoRecebimento * 0.5), impacto_reais: Math.round(giroNecessario * 0.4), dificuldade: "facil" },
    { nome: "Linha de capital de giro", impacto_dias: 0, impacto_reais: deficit, dificuldade: "facil" },
  ];

  return { ciclo_caixa_dias: cicloCaixa, prazo_recebimento: prazoRecebimento, prazo_pagamento: prazoPagamento, giro_necessario: giroNecessario, giro_atual: giroAtual, deficit, solucoes };
}

// ---------- 5. Detector de fuga de dinheiro ----------

export function detectarFuga(txs: Transacao[]): FugaAnomalia[] {
  const anomalias: FugaAnomalia[] = [];
  const meses = serieMensal(txs);
  if (meses.length < 2) return anomalias;

  const mesAtualISO = meses[meses.length - 1].mes;
  const anteriores = meses.slice(0, -1).map((m) => m.mes);

  // Por categoria: compara o mês atual com a média dos anteriores.
  const catAtual = new Map<string, number>();
  const catHist = new Map<string, number[]>();
  for (const t of txs) {
    if (t.tipo !== "despesa") continue;
    const m = t.data.slice(0, 7);
    if (m === mesAtualISO) catAtual.set(t.categoria, (catAtual.get(t.categoria) ?? 0) + t.valor_centavos);
    else if (anteriores.includes(m)) {
      const arr = catHist.get(t.categoria) ?? [];
      arr.push(t.valor_centavos);
      catHist.set(t.categoria, arr);
    }
  }

  for (const [cat, atual] of catAtual) {
    const hist = catHist.get(cat) ?? [];
    const mesesHist = new Set(txs.filter((t) => t.categoria === cat && anteriores.includes(t.data.slice(0, 7))).map((t) => t.data.slice(0, 7))).size || 1;
    const mediaMensal = hist.reduce((a, b) => a + b, 0) / mesesHist;
    if (mediaMensal > 0 && atual > mediaMensal * 1.3) {
      const alta = Math.round(((atual - mediaMensal) / mediaMensal) * 100);
      anomalias.push({
        id: uid(),
        categoria: cat,
        titulo: `${cat} subiu ${alta}%`,
        descricao: `Este mês: ${brl(atual)} · média anterior: ${brl(Math.round(mediaMensal))}.`,
        economia_potencial: Math.round(atual - mediaMensal),
        dificuldade: alta > 60 ? "medio" : "facil",
        severidade: alta > 60 ? "alta" : alta > 35 ? "media" : "baixa",
      });
    }
  }

  // Categoria vaga ("Outros" / vazio) com peso relevante.
  const totalDespMes = [...catAtual.values()].reduce((a, b) => a + b, 0) || 1;
  for (const [cat, atual] of catAtual) {
    const vaga = !cat || /outros|diversos|geral/i.test(cat);
    if (vaga && atual / totalDespMes > 0.12) {
      anomalias.push({
        id: uid(),
        categoria: cat || "Sem categoria",
        titulo: "Categoria genérica com peso alto",
        descricao: `${brl(atual)} sem classificação clara (${Math.round((atual / totalDespMes) * 100)}% das despesas). Detalhe para achar cortes.`,
        economia_potencial: Math.round(atual * 0.15),
        dificuldade: "facil",
        severidade: "media",
      });
    }
  }

  // Despesa única muito acima do padrão (possível preço abusivo).
  const despesasMes = txs.filter((t) => t.tipo === "despesa" && t.data.startsWith(mesAtualISO));
  if (despesasMes.length >= 4) {
    const valores = despesasMes.map((t) => t.valor_centavos).sort((a, b) => a - b);
    const mediana = valores[Math.floor(valores.length / 2)];
    for (const t of despesasMes) {
      if (mediana > 0 && t.valor_centavos > mediana * 5) {
        anomalias.push({
          id: uid(),
          categoria: t.categoria,
          titulo: "Gasto pontual muito acima do padrão",
          descricao: `"${t.descricao}" (${brl(t.valor_centavos)}) é 5×+ a despesa mediana do mês. Renegocie ou parcele.`,
          economia_potencial: Math.round((t.valor_centavos - mediana) * 0.1),
          dificuldade: "medio",
          severidade: "baixa",
        });
      }
    }
  }

  return anomalias.sort((a, b) => b.economia_potencial - a.economia_potencial);
}

// ---------- 6. Otimização de preço (elasticidade) ----------

/** Estima a nova demanda a partir de uma elasticidade-preço (default -1.2). */
export function calcularElasticidade(precoAtual: number, precoNovo: number, elasticidade = -1.2): number {
  if (precoAtual <= 0) return 0;
  const varPreco = (precoNovo - precoAtual) / precoAtual;
  return elasticidade * varPreco; // variação % (fração) da demanda
}

export interface PrecoInput {
  servico: string;
  precoAtual: number; // centavos
  clientesMes: number;
  custoInsumo: number; // centavos por atendimento
  elasticidade?: number;
}

export function otimizarPreco(input: PrecoInput): PrecoResultado {
  const elas = input.elasticidade ?? -1.2;
  const construir = (nome: string, preco: number, bonusDemanda = 0, destaque = false): PrecoCenario => {
    const varDem = calcularElasticidade(input.precoAtual, preco, elas) + bonusDemanda;
    const demanda = Math.max(0, Math.round(input.clientesMes * (1 + varDem)));
    const margemUnit = preco - input.custoInsumo;
    return { nome, preco, demanda_estimada: demanda, margem_unit: margemUnit, lucro_total: margemUnit * demanda, destaque };
  };

  const cenarios: PrecoCenario[] = [
    construir("Conservador (manter)", input.precoAtual),
    construir("Aumento simples +10%", Math.round(input.precoAtual * 1.1)),
    construir("Aumento +10% com desconto p/ novos", Math.round(input.precoAtual * 1.1), 0.05),
    construir("Premium +25%", Math.round(input.precoAtual * 1.25)),
  ];

  let melhor = 0;
  for (let i = 1; i < cenarios.length; i++) if (cenarios[i].lucro_total > cenarios[melhor].lucro_total) melhor = i;
  cenarios[melhor].destaque = true;

  return {
    elasticidade: elas,
    cenarios,
    preco_otimo: cenarios[melhor].preco,
    recomendacao: `Melhor lucro no cenário "${cenarios[melhor].nome}" (${brl(cenarios[melhor].lucro_total)}/mês estimado).`,
  };
}

// ---------- 7. Mix de serviços (Pareto 80/20) ----------

export interface ServicoInput {
  nome: string;
  frequencia: number;
  preco: number; // centavos
  margem_pct: number;
}

export function analiseParetoMix(servicos: ServicoInput[]): ParetoResultado {
  const comLucro = servicos.map((s) => ({ ...s, contribuicao_lucro: Math.round(s.preco * (s.margem_pct / 100) * s.frequencia) }));
  const ordenado = [...comLucro].sort((a, b) => b.contribuicao_lucro - a.contribuicao_lucro);
  const totalLucro = ordenado.reduce((a, s) => a + s.contribuicao_lucro, 0) || 1;

  let acum = 0;
  const linhas: ServicoMix[] = ordenado.map((s) => {
    acum += s.contribuicao_lucro;
    const acumPct = (acum / totalLucro) * 100;
    const classe: ServicoMix["classe"] = acumPct <= 80 ? "A" : acumPct <= 95 ? "B" : "C";
    const acao =
      classe === "A"
        ? "Proteja e invista em marketing — é o que sustenta o lucro."
        : classe === "B"
        ? "Otimize preço ou custo para subir de faixa."
        : "Baixa contribuição: reavalie preço ou considere descontinuar.";
    return {
      nome: s.nome,
      frequencia: s.frequencia,
      preco: s.preco,
      margem_pct: s.margem_pct,
      contribuicao_lucro: s.contribuicao_lucro,
      contribuicao_acumulada_pct: acumPct,
      classe,
      acao,
    };
  });

  const classeA = linhas.filter((l) => l.classe === "A");
  const top20Pct = (classeA.reduce((a, l) => a + l.contribuicao_lucro, 0) / totalLucro) * 100;
  const insight =
    classeA.length > 0
      ? `${classeA.length} de ${linhas.length} serviços geram ${Math.round(top20Pct)}% do lucro. Foque neles.`
      : "Cadastre serviços para ver a regra 80/20 do seu negócio.";

  return { servicos: linhas, top20_lucro_pct: top20Pct, insight };
}

// ---------- 8. ROI de investimento (Payback, ROI, VPL, TIR) ----------

/** VPL de um fluxo mensal constante + investimento inicial negativo. */
function vplFluxo(investimento: number, retornoMensal: number, meses: number, taxaMensal: number): number {
  let vpl = -investimento;
  for (let m = 1; m <= meses; m++) vpl += retornoMensal / Math.pow(1 + taxaMensal, m);
  return vpl;
}

/** TIR mensal via bisseção. */
function tirMensal(investimento: number, retornoMensal: number, meses: number): number {
  let lo = -0.9;
  let hi = 1;
  const f = (r: number) => vplFluxo(investimento, retornoMensal, meses, r);
  if (f(lo) * f(hi) > 0) return retornoMensal * meses > investimento ? hi : lo;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const v = f(mid);
    if (Math.abs(v) < 1) return mid;
    if (f(lo) * v < 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export interface RoiInput {
  investimento: number; // centavos
  retornoMensal: number; // centavos
  vidaUtilMeses: number;
  taxaOportunidadeAnual: number; // % (ex 12 = CDB)
}

export function calcularROI(input: RoiInput): RoiResultado {
  const taxaMensal = Math.pow(1 + input.taxaOportunidadeAnual / 100, 1 / 12) - 1;
  const retornoTotal = input.retornoMensal * input.vidaUtilMeses;
  const roiPct = input.investimento > 0 ? ((retornoTotal - input.investimento) / input.investimento) * 100 : 0;
  const paybackMeses = input.retornoMensal > 0 ? input.investimento / input.retornoMensal : Infinity;
  const vpl = vplFluxo(input.investimento, input.retornoMensal, input.vidaUtilMeses, taxaMensal);
  const tir = tirMensal(input.investimento, input.retornoMensal, input.vidaUtilMeses);

  const serie_acumulada: { mes: number; fluxo: number }[] = [];
  let acc = -input.investimento;
  serie_acumulada.push({ mes: 0, fluxo: acc });
  for (let m = 1; m <= input.vidaUtilMeses; m++) {
    acc += input.retornoMensal;
    serie_acumulada.push({ mes: m, fluxo: acc });
  }

  const sensibilidade = [
    { cenario: "Retorno −30%", ...roiDe(input, taxaMensal, 0.7) },
    { cenario: "Base", ...roiDe(input, taxaMensal, 1) },
    { cenario: "Retorno +20%", ...roiDe(input, taxaMensal, 1.2) },
  ];

  const vsCdb = input.investimento * Math.pow(1 + taxaMensal, input.vidaUtilMeses) - input.investimento;

  return {
    payback_meses: paybackMeses,
    roi_pct: roiPct,
    vpl,
    tir_mensal_pct: tir * 100,
    valeApena: vpl > 0 && tir > taxaMensal,
    serie_acumulada,
    sensibilidade,
    vs_cdb: Math.round(vsCdb),
  };
}
function roiDe(input: RoiInput, taxaMensal: number, fator: number): { vpl: number; roi_pct: number } {
  const ret = input.retornoMensal * fator;
  const vpl = vplFluxo(input.investimento, ret, input.vidaUtilMeses, taxaMensal);
  const roi = input.investimento > 0 ? ((ret * input.vidaUtilMeses - input.investimento) / input.investimento) * 100 : 0;
  return { vpl, roi_pct: roi };
}

// ---------- 9. Variance / decomposição (o que mudou?) ----------

export function decomporVariance(
  receitaAnterior: number,
  receitaAtual: number,
  despesaAnterior: number,
  despesaAtual: number,
  drillReceita: { nome: string; anterior: number; atual: number }[] = [],
  drillDespesa: { nome: string; anterior: number; atual: number }[] = []
): VarianceResultado {
  const lucroAnterior = receitaAnterior - despesaAnterior;
  const lucroAtual = receitaAtual - despesaAtual;
  const deltaLucro = lucroAtual - lucroAnterior;
  const efeitoReceita = receitaAtual - receitaAnterior;
  const efeitoDespesa = -(despesaAtual - despesaAnterior); // subir despesa reduz lucro

  const drill = [...drillReceita, ...drillDespesa]
    .map((d) => ({ nome: d.nome, anterior: d.anterior, atual: d.atual, delta: d.atual - d.anterior }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const culpado =
    Math.abs(efeitoReceita) >= Math.abs(efeitoDespesa)
      ? efeitoReceita < 0
        ? "Queda de receita"
        : "Aumento de receita"
      : efeitoDespesa < 0
      ? "Aumento de despesa"
      : "Redução de despesa";

  const recomendacoes: Recomendacao[] = [];
  if (efeitoReceita < 0) recomendacoes.push({ titulo: "Recuperar receita", detalhe: "A maior queda veio da receita — reative clientes e ofertas.", impacto_reais: Math.abs(efeitoReceita), dificuldade: "medio" });
  if (efeitoDespesa < 0) recomendacoes.push({ titulo: "Conter despesas", detalhe: "Despesas subiram e comeram o lucro — revise os maiores aumentos.", impacto_reais: Math.abs(efeitoDespesa), dificuldade: "facil" });
  if (deltaLucro > 0) recomendacoes.push({ titulo: "Consolidar o ganho", detalhe: "O lucro cresceu — documente o que funcionou e repita.", dificuldade: "facil" });

  return {
    lucro_anterior: lucroAnterior,
    lucro_atual: lucroAtual,
    delta_lucro: deltaLucro,
    delta_pct: lucroAnterior !== 0 ? (deltaLucro / Math.abs(lucroAnterior)) * 100 : 0,
    efeito_receita: efeitoReceita,
    efeito_despesa: efeitoDespesa,
    culpado,
    drilldown: drill,
    recomendacoes,
  };
}

/** Variance automática entre os dois últimos meses das transações. */
export function varianceUltimosMeses(txs: Transacao[]): VarianceResultado | null {
  const meses = serieMensal(txs);
  if (meses.length < 2) return null;
  const ant = meses[meses.length - 2];
  const atual = meses[meses.length - 1];

  const drillCat = (tipo: "receita" | "despesa") => {
    const map = new Map<string, { anterior: number; atual: number }>();
    for (const t of txs) {
      if (t.tipo !== tipo) continue;
      const m = t.data.slice(0, 7);
      if (m !== ant.mes && m !== atual.mes) continue;
      const cur = map.get(t.categoria) ?? { anterior: 0, atual: 0 };
      if (m === ant.mes) cur.anterior += t.valor_centavos;
      else cur.atual += t.valor_centavos;
      map.set(t.categoria, cur);
    }
    return [...map.entries()].map(([nome, v]) => ({ nome: `${tipo === "receita" ? "Receita" : "Despesa"}: ${nome}`, anterior: v.anterior, atual: v.atual }));
  };

  return decomporVariance(ant.receita, atual.receita, ant.despesa, atual.despesa, drillCat("receita"), drillCat("despesa"));
}

// ---------- 10. Mapa de decisão estratégica ----------

export interface DecisaoOpcaoInput {
  nome: string;
  investimento: number; // centavos
  retornoMensal: number; // centavos
  risco: number; // 0-100 informado pelo usuário
}

export function avaliarDecisao(capital: number, opcoesInput: DecisaoOpcaoInput[]): DecisaoResultado {
  const opcoes: DecisaoOpcao[] = opcoesInput.map((o) => {
    const payback = o.retornoMensal > 0 ? o.investimento / o.retornoMensal : Infinity;
    const retornoPct = o.investimento > 0 ? ((o.retornoMensal * 12) / o.investimento) * 100 : 0;
    return {
      id: uid(),
      nome: o.nome,
      investimento: o.investimento,
      retorno_mensal: o.retornoMensal,
      payback_meses: payback,
      risco: o.risco,
      retorno_pct: retornoPct,
      otimista: Math.round(o.retornoMensal * 12 * 1.3),
      pessimista: Math.round(o.retornoMensal * 12 * 0.6),
    };
  });

  // Melhor relação risco/retorno: retorno anualizado / risco (Sharpe simplificado).
  let recomendada = "";
  let melhorScore = -Infinity;
  let justificativa = "Cadastre opções para comparar.";
  for (const o of opcoes) {
    if (o.investimento > capital) continue; // fora do orçamento
    const score = o.retorno_pct / Math.max(10, o.risco);
    if (score > melhorScore) {
      melhorScore = score;
      recomendada = o.id;
      justificativa = `"${o.nome}" tem a melhor relação risco/retorno (retorno ${o.retorno_pct.toFixed(0)}% a.a. com risco ${o.risco}/100) dentro do capital de ${brl(capital)}.`;
    }
  }

  return { capital, opcoes, recomendada, justificativa };
}

// ---------- 11. Detector de vieses cognitivos ----------

export function detectarVieses(txs: Transacao[]): ViesCognitivo[] {
  const vieses: ViesCognitivo[] = [];
  const meses = serieMensal(txs);
  if (meses.length < 3) return vieses;

  const atual = meses[meses.length - 1];
  const ant = meses[meses.length - 2];
  const media3 = meses.slice(-4, -1);
  const receitaMedia = media3.reduce((a, m) => a + m.receita, 0) / (media3.length || 1);

  // Viés de recência: último mês forte projetado como "sempre".
  if (atual.receita > receitaMedia * 1.15) {
    vieses.push({
      id: uid(),
      vies: "Viés de recência",
      gatilho: "Um mês acima da média recente.",
      percepcao: "“O negócio está crescendo e vai continuar assim.”",
      realidade: `Este mês (${brl(atual.receita)}) está ${Math.round(((atual.receita - receitaMedia) / receitaMedia) * 100)}% acima da média dos últimos meses (${brl(Math.round(receitaMedia))}). Pode ser sazonal.`,
      acao: "Planeje pela média, não pelo pico. Guarde parte do excedente.",
    });
  }

  // Excesso de otimismo: percepção de crescimento maior que o real.
  if (ant.lucro > 0) {
    const crescReal = ((atual.lucro - ant.lucro) / Math.abs(ant.lucro)) * 100;
    if (crescReal < 8 && atual.lucro >= ant.lucro) {
      vieses.push({
        id: uid(),
        vies: "Excesso de otimismo",
        gatilho: "Sensação de crescimento forte.",
        percepcao: "“Cresci bastante esse mês.”",
        realidade: `O lucro cresceu ${crescReal.toFixed(1)}% vs o mês anterior — um avanço modesto, não um salto.`,
        acao: "Meça o crescimento com números antes de aumentar custos fixos.",
      });
    }
  }

  // Viés de confirmação: despesa crescendo mas ignorada porque receita cresce.
  if (atual.receita > ant.receita && atual.despesa > ant.despesa * 1.1) {
    vieses.push({
      id: uid(),
      vies: "Viés de confirmação",
      gatilho: "Foco só na receita que subiu.",
      percepcao: "“Está indo bem, a receita subiu.”",
      realidade: `A despesa também subiu ${Math.round(((atual.despesa - ant.despesa) / ant.despesa) * 100)}% e pode estar corroendo a margem.`,
      acao: "Olhe a margem, não só o faturamento.",
    });
  }

  // Ilusão de controle: muitos lançamentos pendentes.
  const pend = txs.filter((t) => t.status === "pendente").length;
  if (pend > txs.length * 0.25 && txs.length > 8) {
    vieses.push({
      id: uid(),
      vies: "Ilusão de controle",
      gatilho: "Muitos lançamentos pendentes.",
      percepcao: "“Tenho tudo sob controle.”",
      realidade: `${pend} lançamentos estão pendentes — o caixa projetado pode não se realizar.`,
      acao: "Confirme recebimentos e pagamentos para enxergar o caixa real.",
    });
  }

  return vieses;
}
