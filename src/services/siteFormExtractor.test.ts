import { describe, it, expect } from 'vitest'
import {
  extractConsumoFromText,
  extractValorContaFromText,
  extractSiteFormData,
} from './siteFormExtractor'

describe('siteFormExtractor', () => {
  describe('extractConsumoFromText', () => {
    it('extrai consumo no formato padrão do Horizons: "Consumo: 900 kWh/mês"', () => {
      const text =
        'Simulação de energia solar — Consumo: 900 kWh/mês; Valor médio da conta: R$ 600.'
      expect(extractConsumoFromText(text)).toBe(900)
    })

    it('extrai consumo com sufixo "+": "Consumo: 3000+ kWh/mês"', () => {
      const text =
        'Simulação de energia solar — Consumo: 3000+ kWh/mês; Valor médio da conta: R$ 5000.'
      expect(extractConsumoFromText(text)).toBe(3000)
    })

    it('extrai consumo com ponto de milhar brasileiro: "Consumo: 1.500 kWh"', () => {
      const text = 'Consumo: 1.500 kWh/mês'
      expect(extractConsumoFromText(text)).toBe(1500)
    })

    it('extrai consumo sem rótulo direto mas com kWh: "900 kWh"', () => {
      const text = 'Meu gasto atual é de aproximadamente 900 kWh na fatura'
      expect(extractConsumoFromText(text)).toBe(900)
    })

    it('extrai consumo com case insensível e variações: "consumo médio de 1200 kwh"', () => {
      const text = 'Temos um consumo médio de 1200 kwh por mês no galpão'
      expect(extractConsumoFromText(text)).toBe(1200)
    })

    it('retorna 0 quando não há consumo na mensagem', () => {
      expect(extractConsumoFromText('Gostaria de saber mais informações sobre painéis')).toBe(0)
      expect(extractConsumoFromText('')).toBe(0)
      expect(extractConsumoFromText(null)).toBe(0)
    })
  })

  describe('extractValorContaFromText', () => {
    it('extrai valor da conta: "Valor médio da conta: R$ 600."', () => {
      const text =
        'Simulação de energia solar — Consumo: 900 kWh/mês; Valor médio da conta: R$ 600.'
      expect(extractValorContaFromText(text)).toBe(600)
    })

    it('extrai valor da conta com milhar: "Valor médio da conta: R$ 5.000"', () => {
      const text = 'Simulação — Valor médio da conta: R$ 5.000'
      expect(extractValorContaFromText(text)).toBe(5000)
    })

    it('extrai valor da conta sem ponto: "Valor médio da conta: R$ 5000."', () => {
      const text =
        'Simulação de energia solar — Consumo: 3000+ kWh/mês; Valor médio da conta: R$ 5000.'
      expect(extractValorContaFromText(text)).toBe(5000)
    })

    it('extrai valor monetário com centavos no formato pt-BR: "R$ 1.234,56"', () => {
      const text = 'Minha conta atual vem em torno de R$ 1.234,56'
      expect(extractValorContaFromText(text)).toBe(1234.56)
    })

    it('retorna 0 quando não há valor da conta', () => {
      expect(extractValorContaFromText('Apenas uma mensagem de contato')).toBe(0)
      expect(extractValorContaFromText('')).toBe(0)
      expect(extractValorContaFromText(null)).toBe(0)
    })
  })

  describe('extractSiteFormData', () => {
    it('extrai de mensagem caso real Renato Tota Motos', () => {
      const input = {
        message: 'Simulação de energia solar — Consumo: 900 kWh/mês; Valor médio da conta: R$ 600.',
      }
      const res = extractSiteFormData(input)
      expect(res.consumo_mensal_kwh).toBe(900)
      expect(res.valor_conta_reais).toBe(600)
      expect(res.consumo_extraido_da_mensagem).toBe(true)
      expect(res.valor_conta_extraido_da_mensagem).toBe(true)
    })

    it('extrai de mensagem caso real Amanda Salinas ("3000+ kWh/mês", "R$ 5000.")', () => {
      const input = {
        message:
          'Simulação de energia solar — Consumo: 3000+ kWh/mês; Valor médio da conta: R$ 5000.',
      }
      const res = extractSiteFormData(input)
      expect(res.consumo_mensal_kwh).toBe(3000)
      expect(res.valor_conta_reais).toBe(5000)
      expect(res.consumo_extraido_da_mensagem).toBe(true)
      expect(res.valor_conta_extraido_da_mensagem).toBe(true)
    })

    it('extrai de mensagem caso real Leandro ("1000 kWh/mês", "R$ 1200.")', () => {
      const input = {
        message:
          'Simulação de energia solar — Consumo: 1000 kWh/mês; Valor médio da conta: R$ 1200.',
      }
      const res = extractSiteFormData(input)
      expect(res.consumo_mensal_kwh).toBe(1000)
      expect(res.valor_conta_reais).toBe(1200)
    })

    it('respeita campos dedicados com prioridade sobre o texto de message', () => {
      const input = {
        consumo: '750',
        valor_conta: '850.50',
        message: 'Simulação de energia solar — Consumo: 900 kWh/mês; Valor médio da conta: R$ 600.',
      }
      const res = extractSiteFormData(input)
      expect(res.consumo_mensal_kwh).toBe(750)
      expect(res.valor_conta_reais).toBe(850.5)
      expect(res.consumo_extraido_da_mensagem).toBe(false)
      expect(res.valor_conta_extraido_da_mensagem).toBe(false)
    })

    it('usa fallback de 400 kWh quando não há consumo nem na mensagem nem no campo dedicado', () => {
      const input = {
        message: 'Teste de integração sem dados de consumo',
      }
      const res = extractSiteFormData(input)
      expect(res.consumo_mensal_kwh).toBe(400)
      expect(res.valor_conta_reais).toBe(0)
      expect(res.consumo_extraido_da_mensagem).toBe(false)
      expect(res.valor_conta_extraido_da_mensagem).toBe(false)
    })

    it('calcula estimativa de consumo baseada na tarifa (~0,92) quando apenas o valor da conta é fornecido', () => {
      const input = {
        valor_conta: '920',
      }
      const res = extractSiteFormData(input)
      expect(res.consumo_mensal_kwh).toBe(1000) // 920 / 0.92 = 1000
      expect(res.valor_conta_reais).toBe(920)
    })
  })
})
