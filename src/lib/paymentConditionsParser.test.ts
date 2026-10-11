import { describe, it, expect } from 'vitest'
import { parseCondicoesPagamento, sanitizarNomesInstituicoes } from './paymentConditionsParser'

describe('sanitizarNomesInstituicoes', () => {
  it('remove nomes de bancos específicos em parênteses', () => {
    const raw =
      'Financiamento Solar em até 84x (Santander, BV ou Solfácil) com carência de 90 dias.'
    const limpo = sanitizarNomesInstituicoes(raw)
    expect(limpo).not.toMatch(/Santander/i)
    expect(limpo).not.toMatch(/BV/i)
    expect(limpo).not.toMatch(/Solfácil/i)
    expect(limpo).toContain('Financiamento Solar em até 84x com carência de 90 dias.')
  })

  it('remove citações a bancos ou financeiras como banco BV ou Fácil', () => {
    const raw = 'Financiamento bancário em até 72x pelo banco BV ou Fácil com taxa reduzida.'
    const limpo = sanitizarNomesInstituicoes(raw)
    expect(limpo).not.toMatch(/\bBV\b/i)
    expect(limpo).not.toMatch(/\bFácil\b/i)
  })
})

describe('parseCondicoesPagamento', () => {
  it('retorna temCondicoes=false para texto vazio, null ou undefined', () => {
    expect(parseCondicoesPagamento('').temCondicoes).toBe(false)
    expect(parseCondicoesPagamento(null).temCondicoes).toBe(false)
    expect(parseCondicoesPagamento(undefined).temCondicoes).toBe(false)
    expect(parseCondicoesPagamento('   ').temCondicoes).toBe(false)
  })

  it('analisa texto padrão de proposta, sanitiza nomes de bancos e gera modalidades genéricas', () => {
    const raw =
      'À vista com 5% de desconto via TED/PIX ou Financiamento Solar em até 84x (Santander, BV ou Solfácil) com carência de 90 dias.'
    const parsed = parseCondicoesPagamento(raw, 25000)

    expect(parsed.temCondicoes).toBe(true)
    expect(parsed.temAVista).toBe(true)
    expect(parsed.temFinanciamento).toBe(true)
    expect(parsed.itens.length).toBeGreaterThanOrEqual(2)

    // Verifica que nomes específicos foram removidos
    expect(parsed.textoSanitizado).not.toMatch(/Santander|BV|Solfácil/i)

    const aVista = parsed.itens.find((i) => i.tipo === 'a_vista')
    expect(aVista).toBeDefined()
    expect(aVista?.destaqueBadge).toContain('5%')

    const fin = parsed.itens.find((i) => i.tipo === 'financiamento')
    expect(fin).toBeDefined()
    expect(fin?.destaqueBadge).toContain('84X')
    expect(fin?.descricao).not.toMatch(/Santander|BV|Solfácil/i)

    // Fala do mascote reforça o convite convidativo e opções genéricas
    expect(parsed.resumoMascote).toContain('Escolha a sua melhor opção')
    expect(parsed.resumoMascote).toContain('pagamento à vista é a melhor opção')
  })

  it('analisa texto com pagamento com cartão de crédito e parcelas', () => {
    const raw =
      'À vista via TED/PIX ou Financiamento Solar em até 84x. No cartão de crédito em 24 vezes de 1.030,04'
    const parsed = parseCondicoesPagamento(raw)

    expect(parsed.temCondicoes).toBe(true)
    expect(parsed.temCartao).toBe(true)
    expect(parsed.itens.some((i) => i.tipo === 'cartao')).toBe(true)
  })

  it('analisa condição com entrada + parcelas', () => {
    const raw = 'Entrada de 30% e saldo em 12 parcelas fixas sem juros no boleto bancário.'
    const parsed = parseCondicoesPagamento(raw)

    expect(parsed.temCondicoes).toBe(true)
    expect(parsed.temEntrada).toBe(true)
    expect(parsed.resumoMascote).toBeDefined()
  })

  it('gera comentário do mascote convidativo mesmo para financiamento isolado', () => {
    const raw = 'Financiamento bancário em até 72x pelo banco BV com 60 dias de carência.'
    const parsed = parseCondicoesPagamento(raw)

    expect(parsed.temFinanciamento).toBe(true)
    expect(parsed.textoSanitizado).not.toMatch(/\bBV\b/i)
    expect(parsed.resumoMascote).toContain('Escolha a sua melhor opção')
  })

  it('gera comentário relevante do mascote quando é apenas à vista', () => {
    const raw = 'Pagamento à vista via PIX com 8% de desconto exclusivo.'
    const parsed = parseCondicoesPagamento(raw)

    expect(parsed.temAVista).toBe(true)
    expect(parsed.resumoMascote).toContain('Escolha a sua melhor opção')
  })
})
