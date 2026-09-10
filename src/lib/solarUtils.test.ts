import { describe, it, expect } from 'vitest'
import {
  IRRADIACAO_MEDIA_DIARIA_HORAS,
  FATOR_PERDAS_SISTEMA,
  DIAS_MES_COMERCIAL,
  TARIFA_ENERGIA_KWH,
  PARCELA_COMPENSADA_PERCENTUAL,
  calcularGeracaoDiariaKwh,
  calcularGeracaoMensalKwh,
  calcularEconomiaMensal,
  calcularFaturaMensalEstimada,
  PARAMETROS_GERACAO_NOTA,
} from './solarUtils'

describe('solarUtils - Cálculos de Geração e Economia Solar', () => {
  it('garante que constantes centrais estão com os valores definidos pela especificação', () => {
    expect(IRRADIACAO_MEDIA_DIARIA_HORAS).toBe(4.6)
    expect(FATOR_PERDAS_SISTEMA).toBe(0.8)
    expect(DIAS_MES_COMERCIAL).toBe(30)
    expect(TARIFA_ENERGIA_KWH).toBe(1.15)
    expect(PARCELA_COMPENSADA_PERCENTUAL).toBe(0.85)
    expect(PARAMETROS_GERACAO_NOTA).toContain('4,6 h/dia')
    expect(PARAMETROS_GERACAO_NOTA).toContain('20%')
  })

  it('valida o exemplo exato do usuário: 6,1 kWp gera ~22,4 kWh/dia e ~673 kWh/mês', () => {
    const potenciaKwp = 6.1
    // Geração diária = 6,1 × 4,6 × 0,80 = 22,448 kWh/dia ≈ 22,4 kWh/dia
    const geracaoDiaria = calcularGeracaoDiariaKwh(potenciaKwp)
    expect(Number(geracaoDiaria.toFixed(1))).toBe(22.4)
    expect(geracaoDiaria).toBeCloseTo(22.448, 3)

    // Geração mensal = 22,448 × 30 = 673,44 ≈ 673 kWh/mês
    const geracaoMensal = calcularGeracaoMensalKwh(potenciaKwp)
    expect(geracaoMensal).toBe(673)
  })

  it('calcula economia mensal com a nova tarifa de R$ 1,15 e parcela compensada de 85%', () => {
    // Consumo de 1000 kWh: 1000 × 1,15 × 0,85 = R$ 977,50
    const economia1000 = calcularEconomiaMensal(1000)
    expect(economia1000).toBeCloseTo(977.5, 2)

    // Consumo de 500 kWh: 500 × 1,15 × 0,85 = R$ 488,75
    const economia500 = calcularEconomiaMensal(500)
    expect(economia500).toBeCloseTo(488.75, 2)
  })

  it('calcula fatura estimada corretamente com a nova tarifa de R$ 1,15', () => {
    // Consumo de 1000 kWh: 1000 × 1,15 = R$ 1.150,00
    expect(calcularFaturaMensalEstimada(1000)).toBe(1150)
  })

  it('trata casos de borda com valores nulos ou zerados', () => {
    expect(calcularGeracaoDiariaKwh(0)).toBe(0)
    expect(calcularGeracaoMensalKwh(0)).toBe(0)
    expect(calcularEconomiaMensal(0)).toBe(0)
    expect(calcularFaturaMensalEstimada(0)).toBe(0)
  })
})
