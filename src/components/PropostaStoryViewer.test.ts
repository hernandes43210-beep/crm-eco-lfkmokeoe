import { describe, it, expect } from 'vitest'
import { parseKitDetailedItems } from '@/lib/kitItemsParser'

describe('Proposta Story Equipamentos e Mascote', () => {
  it('extrai corretamente quantidade, marca e potência de módulos', () => {
    const specs = parseKitDetailedItems({
      kitNome: 'Kit Solar 6,3 kWp — Canadian Solar + Sungrow',
      kitPotenciaKw: 6.3,
      kitFabricante: 'Canadian Solar / Sungrow',
      descricao: '10= MODULO BIFACIAL 132 CEL. N TYPE 630W CANADIAN SOLAR 01= INVERSOR SUNGROW 5KW',
      potenciaPainelW: 630,
      marcaPainel: 'Canadian Solar',
      marcaInversor: 'Sungrow',
      potenciaInversorKw: 5,
    })

    const moduloItem = specs.itens.find((it) => it.tipo === 'modulo')
    expect(moduloItem).toBeDefined()
    expect(moduloItem?.quantidade).toBe(10)
    expect(moduloItem?.potenciaUnit).toBe('630 W')

    const inversorItem = specs.itens.find((it) => it.tipo === 'inversor')
    expect(inversorItem).toBeDefined()
    expect(inversorItem?.quantidade).toBe(1)
    expect(inversorItem?.potenciaUnit).toContain('5')
  })

  it('extrai dados corretos para montagem do carrossel do Story', () => {
    const specs = parseKitDetailedItems({
      kitNome: 'Kit Residencial 10 kWp',
      kitPotenciaKw: 10,
      kitFabricante: 'OSDA / Deye',
      potenciaPainelW: 550,
      potenciaInversorKw: 8,
    })

    expect(specs.quantidadeModulosTotal).toBeGreaterThan(0)
    expect(specs.potenciaTotalFormatada).toContain('kWp')
  })
})
