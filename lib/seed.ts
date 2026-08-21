import type { Categoria, Transacao, Imposto, Cliente } from "./types";
import { uid } from "./format";

const catCores: Record<string, string> = {
  Serviços: "#2F6FED",
  Produtos: "#10B981",
  Vendas: "#C9A24B",
  Aluguel: "#8B5CF6",
  Salários: "#2F6FED",
  Insumos: "#10B981",
  Energia: "#E5A50A",
  Marketing: "#E5484D",
  Impostos: "#64748B",
  Outros: "#64748B",
};

/**
 * Categorias genéricas de estrutura (não são "dados" financeiros).
 * Servem apenas como opções nos formulários — o usuário edita como quiser.
 */
export function seedCategorias(userId: string): Categoria[] {
  const receitas = ["Serviços", "Produtos", "Vendas"];
  const despesas = ["Aluguel", "Salários", "Insumos", "Energia", "Marketing", "Impostos", "Outros"];
  return [
    ...receitas.map((nome) => ({ id: uid(), user_id: userId, tipo: "receita" as const, nome, cor: catCores[nome] ?? "#64748B" })),
    ...despesas.map((nome) => ({ id: uid(), user_id: userId, tipo: "despesa" as const, nome, cor: catCores[nome] ?? "#64748B" })),
  ];
}

export function seedClientes(userId: string): Cliente[] {
  const nomes = ["João Pereira", "Marcos Lima", "Bella Distribuidora", "Ana Souza"];
  return nomes.map((nome) => ({
    id: uid(),
    user_id: userId,
    nome,
    cpf_cnpj: null,
    telefone: null,
    email: null,
    endereco: null,
    created_at: new Date().toISOString(),
  }));
}

/** Gera ~45 dias de lançamentos plausíveis para demonstração */
export function seedTransacoes(userId: string): Transacao[] {
  const out: Transacao[] = [];
  const hoje = new Date();
  const receitaCats = ["Cabelo", "Barba", "Produto"];
  const servicos = [
    "Corte social",
    "Corte + barba",
    "Barba completa",
    "Venda pomada",
    "Coloração",
    "Corte infantil",
  ];
  for (let d = 44; d >= 0; d--) {
    const dia = new Date(hoje);
    dia.setDate(hoje.getDate() - d);
    const iso = dia.toISOString().slice(0, 10);
    const dow = dia.getDay();
    if (dow === 0) continue; // fechado domingo
    const qtd = 3 + Math.floor(Math.random() * 6);
    for (let k = 0; k < qtd; k++) {
      const cat = receitaCats[Math.floor(Math.random() * receitaCats.length)];
      const valor = cat === "Produto" ? 2500 + Math.floor(Math.random() * 6000) : 3000 + Math.floor(Math.random() * 5000);
      out.push({
        id: uid(),
        user_id: userId,
        tipo: "receita",
        descricao: servicos[Math.floor(Math.random() * servicos.length)],
        valor_centavos: Math.round(valor / 500) * 500,
        data: iso,
        categoria: cat,
        cliente_id: null,
        recorrencia: "unico",
        comprovante_url: null,
        status: Math.random() > 0.15 ? "pago" : "pendente",
        tags: [],
        created_at: dia.toISOString(),
      });
    }
  }
  // Despesas fixas mensais
  const mesRef = hoje.toISOString().slice(0, 7);
  const fixas: [string, string, number, boolean][] = [
    ["Aluguel do ponto", "Aluguel", 170000, false],
    ["Salário — auxiliar", "Funcionário", 165000, false],
    ["Conta de energia", "Energia", 41890, true],
    ["Compra de insumos", "Insumos", 95400, false],
    ["Campanha Instagram", "Marketing", 21000, false],
  ];
  fixas.forEach(([desc, cat, valor, pend], i) => {
    out.push({
      id: uid(),
      user_id: userId,
      tipo: "despesa",
      descricao: desc,
      valor_centavos: valor,
      data: `${mesRef}-${String(5 + i * 3).padStart(2, "0")}`,
      categoria: cat,
      cliente_id: null,
      recorrencia: "mensal",
      comprovante_url: null,
      status: pend ? "pendente" : "pago",
      tags: [],
      created_at: new Date().toISOString(),
    });
  });
  return out;
}

export function seedImpostos(userId: string): Imposto[] {
  const hoje = new Date();
  const mes = hoje.toISOString().slice(0, 7);
  const venc = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 7).toISOString().slice(0, 10);
  return [
    {
      id: uid(),
      user_id: userId,
      tipo: "das",
      periodo: mes,
      valor_centavos: 7690,
      vencimento: venc,
      data_pagamento: null,
      status: "pendente",
      created_at: new Date().toISOString(),
    },
  ];
}
