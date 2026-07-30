// ============================================================
// KRONOS — Domain types (strict, no `any`)
// Mirrors the Postgres schema in /supabase/schema.sql so the
// localStorage MVP can migrate to Supabase without shape changes.
// ============================================================

export type Plano = "free" | "pro" | "business";

/**
 * Perfil do usuário — define a "voz" e as necessidades do produto.
 * O Brasil tem ~80% das famílias endividadas (CNC/Peic); cada público
 * enfrenta o endividamento de um jeito diferente:
 *  - pf       → Pessoa física: cartão, cheque especial, crediário, consignado.
 *  - pj       → Autônomo/MEI: mistura contas PF e PJ, capital de giro caro.
 *  - pequena  → Pequena empresa: fornecedores, folha, impostos atrasados.
 *  - empresa  → Empresa: dívida estruturada, alavancagem, dívida/EBITDA.
 */
export type Perfil = "pf" | "pj" | "pequena" | "empresa";

export interface User {
  id: string;
  email: string;
  senha_hash: string; // MVP: fake hash. Supabase Auth replaces this.
  nome_negocio: string;
  documento: string; // CPF ou CNPJ
  perfil: Perfil;
  regime: RegimeTributario;
  /** Renda (PF) ou faturamento (PJ) mensal em centavos — base do comprometimento. */
  renda_mensal_centavos: number;
  plano: Plano;
  logo_url: string | null;
  created_at: string;
}

export type RegimeTributario = "mei" | "simples" | "presumido" | "real";

export type TransacaoTipo = "receita" | "despesa";
export type TransacaoStatus = "pago" | "pendente";
export type Recorrencia = "unico" | "mensal";

export interface Transacao {
  id: string;
  user_id: string;
  tipo: TransacaoTipo;
  descricao: string;
  valor_centavos: number;
  data: string; // ISO yyyy-mm-dd
  categoria: string;
  cliente_id: string | null;
  recorrencia: Recorrencia;
  comprovante_url: string | null;
  status: TransacaoStatus;
  tags: string[];
  created_at: string;
}

export interface Cliente {
  id: string;
  user_id: string;
  nome: string;
  cpf_cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  created_at: string;
}

export interface Categoria {
  id: string;
  user_id: string;
  tipo: TransacaoTipo;
  nome: string;
  cor: string;
}

export interface ItemNota {
  descricao: string;
  quantidade: number;
  valor_unit_centavos: number;
}

export interface NotaFiscal {
  id: string;
  user_id: string;
  numero: string;
  tipo: "recibo" | "nfse";
  data_emissao: string;
  cliente_nome: string;
  cliente_documento: string | null;
  itens: ItemNota[];
  valor_centavos: number;
  iss_centavos: number;
  irrf_centavos: number;
  assinado_em: string | null;
  assinatura_ip: string | null;
  created_at: string;
}

export type ImpostoTipo = "das" | "irpf" | "simples" | "irrf";

export interface Imposto {
  id: string;
  user_id: string;
  tipo: ImpostoTipo;
  periodo: string; // ex "2026-07"
  valor_centavos: number;
  vencimento: string;
  data_pagamento: string | null;
  status: "pago" | "pendente";
  created_at: string;
}

export type SimulacaoTipo = "breakeven" | "cenario" | "viabilidade" | "investimento";

export interface Simulacao {
  id: string;
  user_id: string;
  nome: string;
  tipo: SimulacaoTipo;
  parametros: Record<string, number | string>;
  resultado: Record<string, number | string>;
  created_at: string;
}

// ============================================================
// ANÁLISES AVANÇADAS (11 módulos) — tipos strict, sem `any`.
// Espelham as tabelas em /supabase/schema.sql.
// ============================================================

export type AnaliseTipo =
  | "previsao"
  | "benchmarking"
  | "estilo_vida"
  | "capital_giro"
  | "fuga"
  | "preco"
  | "mix"
  | "roi"
  | "variance"
  | "decisao"
  | "vies";

export type Dificuldade = "facil" | "medio" | "dificil";
export type Tendencia = "alta" | "estavel" | "queda";
export type StatusMetrica = "acima" | "igual" | "abaixo";

/** Ponto de recomendação acionável reutilizado por várias análises. */
export interface Recomendacao {
  titulo: string;
  detalhe: string;
  impacto_reais?: number;
  dificuldade?: Dificuldade;
}

// 1. Previsão de fluxo -----------------------------------------
export interface PrevisaoPonto {
  data: string;
  saldo: number; // centavos
  min: number; // limite inferior do intervalo de confiança
  max: number; // limite superior
}
export interface PrevisaoResultado {
  periodo_dias: number;
  pontos: PrevisaoPonto[];
  saldo_inicial: number;
  saldo_final_esperado: number;
  tendencia: Tendencia;
  dia_saldo_negativo: string | null; // primeira data em que o saldo fica negativo
  alertas: string[];
  recomendacoes: Recomendacao[];
}

// 2. Benchmarking ----------------------------------------------
export interface BenchmarkMetrica {
  chave: string;
  label: string;
  unidade: "reais" | "pct" | "num";
  voce: number;
  mediana: number;
  top20: number;
  status: StatusMetrica;
}
export interface BenchmarkResultado {
  segmento: string;
  metricas: BenchmarkMetrica[];
  oportunidades: Recomendacao[];
}

// 3. Estilo de vida do dono ------------------------------------
export interface DespesaPessoal {
  id: string;
  user_id: string;
  categoria: string;
  valor_centavos: number;
  created_at: string;
}
export interface EstiloVidaResultado {
  despesa_pessoal_total: number;
  lucro_negocio: number;
  gap: number; // negativo = retira mais do que o negócio gera
  cobre: boolean;
  passos_equilibrio: { label: string; delta: number }[]; // waterfall
  recomendacoes: Recomendacao[];
}

// 4. Capital de giro -------------------------------------------
export interface CapitalGiroResultado {
  ciclo_caixa_dias: number;
  prazo_recebimento: number;
  prazo_pagamento: number;
  giro_necessario: number;
  giro_atual: number;
  deficit: number;
  solucoes: { nome: string; impacto_dias: number; impacto_reais: number; dificuldade: Dificuldade }[];
}

// 5. Detector de fuga de dinheiro ------------------------------
export interface FugaAnomalia {
  id: string;
  categoria: string;
  titulo: string;
  descricao: string;
  economia_potencial: number; // centavos/mês
  dificuldade: Dificuldade;
  severidade: "alta" | "media" | "baixa";
}

// 6. Otimização de preço ---------------------------------------
export interface PrecoCenario {
  nome: string;
  preco: number; // centavos
  demanda_estimada: number; // clientes/mês
  margem_unit: number;
  lucro_total: number;
  destaque: boolean;
}
export interface PrecoResultado {
  elasticidade: number;
  cenarios: PrecoCenario[];
  preco_otimo: number;
  recomendacao: string;
}

// 7. Mix de serviços (Pareto) ----------------------------------
export interface ServicoMix {
  nome: string;
  frequencia: number;
  preco: number; // centavos
  margem_pct: number;
  contribuicao_lucro: number; // centavos
  contribuicao_acumulada_pct: number;
  classe: "A" | "B" | "C"; // A = top 20%
  acao: string;
}
export interface ParetoResultado {
  servicos: ServicoMix[];
  top20_lucro_pct: number;
  insight: string;
}

// 8. ROI de investimento ---------------------------------------
export interface RoiResultado {
  payback_meses: number;
  roi_pct: number;
  vpl: number;
  tir_mensal_pct: number;
  valeApena: boolean;
  serie_acumulada: { mes: number; fluxo: number }[];
  sensibilidade: { cenario: string; vpl: number; roi_pct: number }[];
  vs_cdb: number; // quanto renderia no CDB no mesmo período
}

// 9. Variance (o que mudou?) -----------------------------------
export interface VarianceResultado {
  lucro_anterior: number;
  lucro_atual: number;
  delta_lucro: number;
  delta_pct: number;
  efeito_receita: number;
  efeito_despesa: number;
  culpado: string;
  drilldown: { nome: string; anterior: number; atual: number; delta: number }[];
  recomendacoes: Recomendacao[];
}

// 10. Mapa de decisão estratégica ------------------------------
export interface DecisaoOpcao {
  id: string;
  nome: string;
  investimento: number; // centavos
  retorno_mensal: number; // centavos
  payback_meses: number;
  risco: number; // 0-100
  retorno_pct: number; // retorno anualizado sobre investimento
  otimista: number;
  pessimista: number;
}
export interface DecisaoResultado {
  capital: number;
  opcoes: DecisaoOpcao[];
  recomendada: string; // id
  justificativa: string;
}

// 11. Viés cognitivo -------------------------------------------
export interface ViesCognitivo {
  id: string;
  vies: string; // ex "Excesso de otimismo"
  gatilho: string;
  percepcao: string;
  realidade: string;
  acao: string;
}

/** União discriminada dos resultados persistidos. */
export type AnaliseResultado =
  | { tipo: "previsao"; dados: PrevisaoResultado }
  | { tipo: "benchmarking"; dados: BenchmarkResultado }
  | { tipo: "estilo_vida"; dados: EstiloVidaResultado }
  | { tipo: "capital_giro"; dados: CapitalGiroResultado }
  | { tipo: "fuga"; dados: FugaAnomalia[] }
  | { tipo: "preco"; dados: PrecoResultado }
  | { tipo: "mix"; dados: ParetoResultado }
  | { tipo: "roi"; dados: RoiResultado }
  | { tipo: "variance"; dados: VarianceResultado }
  | { tipo: "decisao"; dados: DecisaoResultado }
  | { tipo: "vies"; dados: ViesCognitivo[] };

export interface Analise {
  id: string;
  user_id: string;
  tipo: AnaliseTipo;
  resultado: AnaliseResultado;
  recomendacoes: string[];
  criado_em: string;
}

/** Cenário salvo pelo simulador estratégico (compõe múltiplos ajustes). */
export interface AjusteCenario {
  tipo: "preco" | "volume" | "custo_fixo" | "custo_variavel";
  label: string;
  delta_pct: number;
}
export interface Cenario {
  id: string;
  user_id: string;
  nome: string;
  ajustes: AjusteCenario[];
  receita_base: number;
  despesa_base: number;
  receita_projetada: number;
  despesa_projetada: number;
  lucro_projetado: number;
  created_at: string;
}

// ============================================================
// DÍVIDAS — o coração do módulo de desendividamento.
// Espelha a tabela `dividas` em /supabase/schema.sql.
// ============================================================

/**
 * Tipos de dívida cobrindo os quatro públicos. A ordem reflete, em geral,
 * do mais caro/tóxico (rotativo, cheque especial) ao estruturado.
 */
export type DividaTipo =
  | "cartao" // cartão de crédito (rotativo)
  | "cheque_especial" // cheque especial / conta garantida
  | "emprestimo" // empréstimo pessoal
  | "consignado" // crédito consignado (juro baixo, garantido em folha)
  | "financiamento" // veículo / imóvel
  | "crediario" // carnê / loja / BNPL
  | "capital_giro" // PJ — capital de giro
  | "antecipacao" // PJ — antecipação de recebíveis / desconto de duplicatas
  | "fornecedor" // PJ — dívida com fornecedores
  | "imposto" // tributos atrasados (DAS, Simples, DARF) / parcelamento
  | "estruturada" // empresa — debênture, CRI, dívida bancária estruturada
  | "outro";

export type DividaStatus = "em_dia" | "atrasada" | "renegociada" | "quitada";

export interface Divida {
  id: string;
  user_id: string;
  credor: string;
  tipo: DividaTipo;
  saldo_devedor_centavos: number; // saldo devedor atual (principal restante)
  taxa_am: number; // juros nominais ao mês (%). Ex.: 14.5 = cartão rotativo
  parcela_centavos: number; // parcela mensal (0 = rotativo / sem parcela fixa)
  parcelas_total: number; // total de parcelas (0 = sem prazo definido / rotativo)
  parcelas_pagas: number;
  vencimento_dia: number; // dia do mês do vencimento (1–28)
  garantia: string | null; // ex.: veículo, imóvel, folha (consignado)
  status: DividaStatus;
  created_at: string;
}

// ---------- Store shape ----------

export interface KronosState {
  user: User | null;
  users: User[]; // MVP local "auth" registry
  transacoes: Transacao[];
  clientes: Cliente[];
  categorias: Categoria[];
  notas: NotaFiscal[];
  impostos: Imposto[];
  simulacoes: Simulacao[];
  // Análises avançadas (persistidas — começam vazias, o usuário preenche)
  analises: Analise[];
  cenarios: Cenario[];
  despesasPessoais: DespesaPessoal[];
  dividas: Divida[];
  hydrated: boolean;
}
