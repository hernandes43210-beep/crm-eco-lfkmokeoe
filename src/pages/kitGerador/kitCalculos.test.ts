import { describe, it, expect } from 'vitest'
import { precoFinalReal, lucroReal, margemReal, precificar } from './logica'
import { calcularTudo } from './kitCalculos'

describe('Kit Solar - Margem sobre o preço de venda', () => {
  it('calcula o preço final com margem sobre a venda: preço = custo ÷ (1 − margem)', () => {
    // Exemplo prescritivo do usuário:
    // Custo: 255.208,50 / Margem: 41%
    // Preço correto: 255.208,50 ÷ 0,59 = 432.556,78
    // Lucro: 177.348,28 (exatamente 41% do preço de venda)
    const custo = 255208.5
    const margem = 41
    const preco = precoFinalReal(custo, margem, 'R$', 0)
    expect(preco).toBe(432556.78)

    const lucro = lucroReal(custo, preco)
    expect(lucro).toBe(177348.28)
    expect(margemReal(custo, preco)).toBeCloseTo(41, 1)

    // Lucro de 177.348,28 é 41% de 432.556,78
    expect(Math.round((lucro / preco) * 10000) / 100).toBeCloseTo(41, 1)
  })

  it('aplica desconto em R$ por cima do preço de venda calculado com margem', () => {
    const custo = 6000
    const margem = 40 // divisor 0.6 => precoVenda = 10.000
    const preco = precoFinalReal(custo, margem, 'R$', 500)
    expect(preco).toBe(9500)
    expect(lucroReal(custo, preco)).toBe(3500)
  })

  it('aplica desconto em % por cima do preço de venda calculado com margem', () => {
    const custo = 6000
    const margem = 40 // divisor 0.6 => precoVenda = 10.000
    const preco = precoFinalReal(custo, margem, '%', 10)
    // 10.000 - 10% (1.000) = 9.000
    expect(preco).toBe(9000)
  })

  it('bloqueia ou retorna 0 para margem igual ou superior a 100%', () => {
    const custo = 10000
    expect(precoFinalReal(custo, 100, 'R$', 0)).toBe(0)
    expect(precoFinalReal(custo, 120, 'R$', 0)).toBe(0)

    const prec = precificar({
      custo: 10000,
      acrescimoPct: 100,
      descontoValor: 0,
      descontoTipo: 'R$',
      kwp: 5,
    })
    expect(prec.precoVenda).toBe(0)
    expect(prec.precoFinal).toBe(0)
    expect(prec.lucro).toBe(0)
  })

  it('calcularTudo calcula precoFinal e lucro usando a fórmula correta', () => {
    const res = calcularTudo({
      paineisLinhas: [
        {
          id: 'p1',
          modo: 'livre',
          marca: 'Canadian',
          modelo: 'CS6W',
          potenciaW: 550,
          areaM2: 2.79,
          qtd: 10,
        },
      ],
      inversoresLinhas: [
        {
          id: 'i1',
          modo: 'livre',
          marca: 'Sungrow',
          modelo: 'SG5.0',
          potenciaKw: 5,
          tipo: 'Monofásico',
          qtd: 1,
        },
      ],
      sol: 4.5,
      perdas: 20,
      custo: 255208.5,
      acrescimoPct: 41,
      descontoTipo: 'R$',
      descontoValor: 0,
      itens: [],
    })

    expect(res.precoFinal).toBe(432556.78)
    expect(res.lucro).toBe(177348.28)
    expect(res.margemPct).toBeCloseTo(41, 1)
  })

  it('precificar calcula lucro e margemPct sobre o preço de venda para exemplo oficial', () => {
    const p = precificar({
      custo: 255208.5,
      acrescimoPct: 41,
      descontoValor: 0,
      descontoTipo: 'R$',
      kwp: 5.5,
    })

    expect(p.precoVenda).toBe(432556.78)
    expect(p.precoFinal).toBe(432556.78)
    expect(p.lucro).toBe(177348.28)
    expect(p.margemPct).toBeCloseTo(41, 1)
  })
})
