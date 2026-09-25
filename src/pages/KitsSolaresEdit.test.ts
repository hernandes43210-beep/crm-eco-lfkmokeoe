import { describe, it, expect } from 'vitest'
import { calcularMargemReal } from '../utils/marginUtils'
import {
  calcularKwpPrePronto,
  extrairComponentesKit,
  formatarPotenciaKw,
  formatarRotuloEstrutura,
} from '../lib/quickKitUtils'
import type { Kit } from '../types/crm'

describe('Edição Completa de Kits Solares', () => {
  it('extrai corretamente todos os componentes técnicos de um kit existente', () => {
    const kitMock: Kit = {
      id: 'kit-123',
      collectionId: 'kits',
      collectionName: 'kits',
      nome: 'Kit Solar 6,3 kWp — TSUN POWER + Sungrow — Solo monoposte',
      fabricante: 'TSUN POWER / Sungrow',
      potencia_kw: 6.3,
      categoria: 'Residencial',
      custo: 14000,
      margem: 30,
      preco_venda: 20000,
      marca_painel: 'TSUN POWER',
      potencia_painel_w: 630,
      marca_inversor: 'Sungrow',
      potencia_inversor_kw: 7.5,
      tipo_estrutura: 'solo_monoposte',
      string_box: '1_entrada',
      descricao: '10 módulos TSUN POWER 630Wp + Inversor Sungrow 7.5kW',
      created: '2025-01-01',
      updated: '2025-01-01',
    }

    const componentes = extrairComponentesKit(kitMock)
    expect(componentes.qtdPaineis).toBe(10)
    expect(componentes.potenciaPainelW).toBe(630)
    expect(componentes.marcaPaineis).toBe('TSUN POWER')
    expect(componentes.marcaInversor).toBe('Sungrow')
    expect(componentes.potenciaInversorKw).toBe(7.5)
    expect(componentes.tipoEstrutura).toBe('solo_monoposte')
    expect(componentes.stringBox).toBe('1_entrada')
  })

  it('calcula a potência em kWp em tempo real quando alterada quantidade ou potência dos painéis', () => {
    const calc = calcularKwpPrePronto(12, 610)
    expect(calc.kwp).toBe(7.32)
    expect(calc.formattedBR).toBe('7,32')
  })

  it('calcula o semáforo e percentual de margem real dinamicamente conforme custo e preço de venda mudam', () => {
    // Margem saudável >= 15%
    const margemSaudavel = calcularMargemReal(20000, 14000)
    expect(margemSaudavel.margemPercentual).toBe(30)
    expect(margemSaudavel.isSaudavel).toBe(true)
    expect(margemSaudavel.status.label).toBe('Margem Saudável')

    // Margem apertada (5% - 15%)
    const margemApertada = calcularMargemReal(15000, 13500)
    expect(margemApertada.margemPercentual).toBe(10)
    expect(margemApertada.isApertada).toBe(true)
    expect(margemApertada.status.label).toBe('Margem Apertada')

    // Margem em risco/crítica < 5%
    const margemCritica = calcularMargemReal(14000, 13700)
    expect(margemCritica.margemPercentual).toBe(2.1)
    expect(margemCritica.isPrejuizo).toBe(true)
    expect(margemCritica.status.label).toBe('Atenção: Risco de Prejuízo')
  })

  it('formata adequadamente rótulos técnicos em português', () => {
    expect(formatarRotuloEstrutura('solo_monoposte')).toBe('Solo Monoposte')
    expect(formatarRotuloEstrutura('fibrocimento')).toBe('Telhado Fibrocimento')
    expect(formatarPotenciaKw(7.5)).toBe('7,5 kW')
  })
})
