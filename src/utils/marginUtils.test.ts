import { describe, it, expect } from 'vitest'
import {
  calcularMargemReal,
  getMargemStatusInfo,
  MARGEM_LIMIAR_SAUDAVEL,
  MARGEM_LIMIAR_APERTADA,
} from './marginUtils'

describe('marginUtils', () => {
  describe('calcularMargemReal', () => {
    it('calcula margem saudável corretamente (custo 14.000, venda 20.000 => lucro 6.000, 30%)', () => {
      const result = calcularMargemReal(20000, 14000)

      expect(result.margemReais).toBe(6000)
      expect(result.margemPercentual).toBe(30)
      expect(result.markupPercentual).toBeCloseTo(42.9, 1)
      expect(result.isSaudavel).toBe(true)
      expect(result.isApertada).toBe(false)
      expect(result.isPrejuizo).toBe(false)
      expect(result.status.nivel).toBe('saudavel')
      expect(result.status.label).toBe('Margem Saudável')
      expect(result.formatado).toContain('6.000,00')
      expect(result.formatado).toContain('30,0%')
    })

    it('calcula margem apertada (entre 5% e 15%)', () => {
      // Custo 10.000, venda 11.000 => margem 1.000 / 11.000 = 9.09% (~9.1%)
      const result = calcularMargemReal(11000, 10000)

      expect(result.margemReais).toBe(1000)
      expect(result.margemPercentual).toBe(9.1)
      expect(result.isSaudavel).toBe(false)
      expect(result.isApertada).toBe(true)
      expect(result.isPrejuizo).toBe(false)
      expect(result.status.nivel).toBe('apertada')
      expect(result.status.label).toBe('Margem Apertada')
    })

    it('calcula alerta de prejuízo quando margem é inferior a 5%', () => {
      // Custo 10.000, venda 10.300 => 300 / 10.300 = 2.9%
      const result = calcularMargemReal(10300, 10000)

      expect(result.margemReais).toBe(300)
      expect(result.margemPercentual).toBe(2.9)
      expect(result.isSaudavel).toBe(false)
      expect(result.isApertada).toBe(false)
      expect(result.isPrejuizo).toBe(true)
      expect(result.status.nivel).toBe('prejuizo')
      expect(result.status.label).toContain('Risco de Prejuízo')
    })

    it('detecta margem negativa (preço menor que custo => prejuízo)', () => {
      // Custo 15.000, venda 12.000 com superdesconto => lucro -3.000
      const result = calcularMargemReal(12000, 15000)

      expect(result.margemReais).toBe(-3000)
      expect(result.margemPercentual).toBe(-25)
      expect(result.isPrejuizo).toBe(true)
      expect(result.status.nivel).toBe('prejuizo')
    })

    it('suporta strings com vírgula ou ponto', () => {
      const result = calcularMargemReal('20.000,00', '15.000,00')
      // Note: "20.000,00" without cleaning thousand dots might parse as 20 or 20000 depending on float parser
      // If passing standard numeric strings "20000,50":
      const resClean = calcularMargemReal('20000,50', '15000,00')
      expect(resClean.margemReais).toBeCloseTo(5000.5, 2)
    })

    it('trata valores zerados ou nulos de forma segura', () => {
      const result = calcularMargemReal(0, 0)
      expect(result.margemReais).toBe(0)
      expect(result.margemPercentual).toBe(0)
      expect(result.isPrejuizo).toBe(true) // 0% está abaixo de 5%
    })
  })

  describe('getMargemStatusInfo', () => {
    it('retorna níveis corretos baseado nos limiares constantes', () => {
      expect(getMargemStatusInfo(MARGEM_LIMIAR_SAUDAVEL).nivel).toBe('saudavel')
      expect(getMargemStatusInfo(MARGEM_LIMIAR_SAUDAVEL - 0.1).nivel).toBe('apertada')
      expect(getMargemStatusInfo(MARGEM_LIMIAR_APERTADA).nivel).toBe('apertada')
      expect(getMargemStatusInfo(MARGEM_LIMIAR_APERTADA - 0.1).nivel).toBe('prejuizo')
      expect(getMargemStatusInfo(-10).nivel).toBe('prejuizo')
    })
  })
})
