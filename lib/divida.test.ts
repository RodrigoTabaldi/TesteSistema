import { describe, expect, it } from "vitest";
import {
  compararEstrategias,
  jurosMensal,
  pagamentoMinimo,
  parcelaPrice,
  resumoDividas,
  saudeDivida,
  simularEstrategia,
  simularRenegociacao,
} from "./divida";
import type { Divida } from "./types";

function divida(overrides: Partial<Divida>): Divida {
  return {
    id: "d1",
    user_id: "u1",
    credor: "Banco X",
    tipo: "cartao",
    saldo_devedor_centavos: 100_000,
    taxa_am: 12,
    parcela_centavos: 0,
    parcelas_total: 0,
    parcelas_pagas: 0,
    vencimento_dia: 10,
    garantia: null,
    status: "em_dia",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("jurosMensal", () => {
  it("calcula juros como percentual do saldo devedor", () => {
    expect(jurosMensal(divida({ saldo_devedor_centavos: 100_000, taxa_am: 10 }))).toBe(10_000);
  });

  it("arredonda para o centavo mais próximo", () => {
    expect(jurosMensal(divida({ saldo_devedor_centavos: 333, taxa_am: 1 }))).toBe(Math.round(333 * 0.01));
  });

  it("é zero quando o saldo é zero", () => {
    expect(jurosMensal(divida({ saldo_devedor_centavos: 0, taxa_am: 20 }))).toBe(0);
  });
});

describe("pagamentoMinimo", () => {
  it("usa a parcela fixa quando existe, limitada ao saldo + juros", () => {
    const d = divida({ saldo_devedor_centavos: 1_000, parcela_centavos: 50_000, taxa_am: 0 });
    expect(pagamentoMinimo(d)).toBe(1_000); // não paga mais do que a dívida vale
  });

  it("dívida rotativa (sem parcela) cobra juros + 5% do principal", () => {
    const d = divida({ saldo_devedor_centavos: 100_000, taxa_am: 10, parcela_centavos: 0 });
    // juros = 10.000; 5% do principal = 5.000
    expect(pagamentoMinimo(d)).toBe(15_000);
  });
});

describe("resumoDividas", () => {
  it("ignora dívidas quitadas ou com saldo zero", () => {
    const dividas = [
      divida({ id: "a", status: "quitada", saldo_devedor_centavos: 50_000 }),
      divida({ id: "b", saldo_devedor_centavos: 0 }),
      divida({ id: "c", saldo_devedor_centavos: 100_000, taxa_am: 5 }),
    ];
    const r = resumoDividas(dividas, 1_000_000, "pf");
    expect(r.qtdAtivas).toBe(1);
    expect(r.totalSaldo).toBe(100_000);
  });

  it("comprometimentoPct e taxaMediaAm são zero sem renda/saldo (sem divisão por zero)", () => {
    const r = resumoDividas([], 0, "pf");
    expect(r.comprometimentoPct).toBe(0);
    expect(r.taxaMediaAm).toBe(0);
    expect(Number.isFinite(r.comprometimentoPct)).toBe(true);
  });

  it("taxaMediaAm é ponderada pelo saldo devedor de cada dívida", () => {
    const dividas = [
      divida({ id: "a", saldo_devedor_centavos: 300_000, taxa_am: 10 }),
      divida({ id: "b", saldo_devedor_centavos: 100_000, taxa_am: 2 }),
    ];
    const r = resumoDividas(dividas, 1_000_000, "pf");
    // (300000*10 + 100000*2) / 400000 = 8
    expect(r.taxaMediaAm).toBeCloseTo(8, 6);
  });
});

describe("saudeDivida", () => {
  it("pontua 100 (saudável) sem dívidas, sem atraso, sem custo", () => {
    const r = resumoDividas([], 500_000, "pf");
    const s = saudeDivida(r);
    expect(s.score).toBe(100);
    expect(s.faixa).toBe("saudavel");
  });

  it("cai para a faixa crítica com dívida rotativa atrasada e comprometimento alto", () => {
    const dividas = [
      divida({ saldo_devedor_centavos: 900_000, taxa_am: 15, tipo: "cartao", status: "atrasada" }),
    ];
    const r = resumoDividas(dividas, 100_000, "pf");
    const s = saudeDivida(r);
    expect(s.score).toBeLessThan(35);
    expect(s.faixa).toBe("critico");
  });

  it("nunca produz nota fora do intervalo 0–100", () => {
    const dividas = [divida({ saldo_devedor_centavos: 10_000_000, taxa_am: 500, status: "atrasada" })];
    const r = resumoDividas(dividas, 1, "pf");
    const s = saudeDivida(r);
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
  });
});

describe("parcelaPrice", () => {
  it("com juro zero, divide o saldo igualmente pelas parcelas", () => {
    expect(parcelaPrice(120_000, 0, 12)).toBe(10_000);
  });

  it("sem parcelas (meses <= 0), devolve o saldo integral", () => {
    expect(parcelaPrice(50_000, 5, 0)).toBe(50_000);
  });

  it("sistema Price: R$1.000 a 2% a.m. em 12x ≈ R$94,56/mês", () => {
    // Fator de anuidade padrão para i=2%, n=12 é ~0.0945596 (tabela financeira).
    expect(parcelaPrice(100_000, 2, 12)).toBe(9456);
  });

  it("parcela cresce com a taxa de juros, para o mesmo saldo e prazo", () => {
    const baixa = parcelaPrice(100_000, 2, 12);
    const alta = parcelaPrice(100_000, 8, 12);
    expect(alta).toBeGreaterThan(baixa);
  });
});

describe("simularRenegociacao", () => {
  it("reduz a parcela quando a nova taxa é menor e o prazo maior", () => {
    const r = simularRenegociacao(100_000, 12, 2, 12, 24);
    expect(r.parcelaDepois).toBeLessThan(r.parcelaAntes);
    expect(r.reducaoParcelaPct).toBeGreaterThan(0);
  });

  it("reducaoParcelaPct é zero quando a parcela original é zero (sem divisão por zero)", () => {
    const r = simularRenegociacao(0, 12, 2, 12, 24);
    expect(r.reducaoParcelaPct).toBe(0);
    expect(Number.isFinite(r.reducaoParcelaPct)).toBe(true);
  });
});

describe("simularEstrategia", () => {
  it("quita uma única dívida sem juros em exatamente saldo/parcela meses", () => {
    const dividas = [divida({ saldo_devedor_centavos: 120_000, taxa_am: 0, parcela_centavos: 10_000 })];
    const r = simularEstrategia(dividas, 0, "avalanche");
    expect(r.viavel).toBe(true);
    expect(r.meses).toBe(12);
    expect(r.totalJuros).toBe(0);
  });

  it("marca como inviável quando o orçamento não cobre nem os juros", () => {
    // parcela mínima do rotativo é juros + 5% do principal; sem orçamento extra
    // e taxa altíssima, o saldo nunca cai (a dívida cresce mais rápido do que paga).
    const dividas = [divida({ saldo_devedor_centavos: 1_000_000, taxa_am: 400, parcela_centavos: 1 })];
    const r = simularEstrategia(dividas, 0, "avalanche");
    expect(r.viavel).toBe(false);
    expect(r.meses).toBe(Infinity);
  });

  it("mais orçamento extra nunca aumenta o tempo até a quitação", () => {
    const dividas = [
      divida({ id: "a", saldo_devedor_centavos: 200_000, taxa_am: 10, parcela_centavos: 8_000 }),
      divida({ id: "b", saldo_devedor_centavos: 80_000, taxa_am: 4, parcela_centavos: 4_000 }),
    ];
    const semExtra = simularEstrategia(dividas, 0, "avalanche");
    const comExtra = simularEstrategia(dividas, 50_000, "avalanche");
    expect(comExtra.meses).toBeLessThanOrEqual(semExtra.meses);
  });
});

describe("compararEstrategias", () => {
  it("avalanche nunca paga mais juros do que bola de neve para as mesmas dívidas", () => {
    const dividas = [
      divida({ id: "a", saldo_devedor_centavos: 300_000, taxa_am: 14, parcela_centavos: 15_000 }),
      divida({ id: "b", saldo_devedor_centavos: 50_000, taxa_am: 3, parcela_centavos: 3_000 }),
    ];
    const c = compararEstrategias(dividas, 20_000);
    expect(c.avalanche.totalJuros).toBeLessThanOrEqual(c.neve.totalJuros);
    expect(["avalanche", "neve"]).toContain(c.recomendado);
  });
});
