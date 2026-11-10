import { describe, it, expect } from 'vitest'
import { precoFinalReal, lucroReal, margemReal, precificar } from './logica'
import { calcularTudo } from './kitCalculos'

describe('Kit Solar - Margem sobre o custo do produto', () => {
  it('calcula o preço final com margem sobre o custo exatamente: custo + (custo * margem/100)', () => {
    // Exemplo do usuário: custo 255.208,50 e margem 41% -> 359.843,985 -> arredonda/precisão ~359.843,99
    const custo = 255208.5
    const margem = 41
    const preco = precoFinalReal(custo, margem, 'R$', 0)
    expect(preco).toBeCloseTo(255208.5 * 1.41, 2)
    expect(preco).toBeCloseTo(359843.985, 2)
  })

  it('aplica desconto em R$ por cima do preço de venda com margem', () => {
    const custo = 10000
    const margem = 40
    // Preço de venda: 14.000, desconto R$ 500 -> 13.500
    const preco = precoFinalReal(custo, margem, 'R$', 500)
    expect(preco).toBe(13500)
    expect(lucroReal(custo, preco)).toBe(3500)
  })

  it('aplica desconto em % por cima do preço de venda com margem', () => {
    const custo = 10000
    const margem = 40
    // Preço de venda: 14.000, desconto 10% (1.400) -> 12.600
    const preco = precoFinalReal(custo, margem, '%', 10)
    expect(preco).toBe(12600)
  })

  it('calcularTudo calcula precoFinal e soma custo dos itens adicionais se houver', () => {
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

    expect(res.precoFinal).toBeCloseTo(359843.985, 2)
    expect(res.lucro).toBeCloseTo(359843.985 - 255208.5, 2)
  })
})
