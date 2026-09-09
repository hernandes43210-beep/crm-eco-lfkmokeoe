import { describe, it, expect } from 'vitest'
import {
  calcularKwpPrePronto,
  sugerirNomeKit,
  sugerirFabricanteKit,
  sugerirDescricaoTecnica,
} from './quickKitUtils'

describe('quickKitUtils', () => {
  it('calcula corretamente a potência pico kWp', () => {
    // 10 painéis × 610 Wp = 6,10 kWp
    const res1 = calcularKwpPrePronto(10, 610)
    expect(res1.kwp).toBe(6.1)
    expect(res1.formattedBR).toBe('6,1')

    // 16 painéis × 630 Wp = 10,08 kWp
    const res2 = calcularKwpPrePronto(16, 630)
    expect(res2.kwp).toBe(10.08)
    expect(res2.formattedBR).toBe('10,08')

    // Valores zerados ou inválidos
    const res3 = calcularKwpPrePronto(0, 550)
    expect(res3.kwp).toBe(0)
    expect(res3.formattedBR).toBe('0,00')
  })

  it('sugere o nome do kit a partir dos componentes', () => {
    const nome1 = sugerirNomeKit({
      kwp: 6.1,
      marcaPaineis: 'Canadian Solar',
      marcaInversor: 'Growatt',
    })
    expect(nome1).toBe('Kit Solar 6,1 kWp — Canadian Solar + Growatt')

    const nome2 = sugerirNomeKit({
      kwp: 10.08,
      marcaPaineis: 'TSUN',
      marcaInversor: 'Sungrow 10kW',
    })
    expect(nome2).toBe('Kit Solar 10,08 kWp — TSUN + Sungrow 10kW')

    const nomeSemMarcas = sugerirNomeKit({
      kwp: 5.5,
    })
    expect(nomeSemMarcas).toBe('Kit Solar 5,5 kWp')
  })

  it('sugere o campo fabricante unificado', () => {
    expect(sugerirFabricanteKit('Canadian Solar', 'Growatt')).toBe('Canadian Solar / Growatt')
    expect(sugerirFabricanteKit('Winaico', '')).toBe('Winaico')
    expect(sugerirFabricanteKit('', 'Deye')).toBe('Deye')
    expect(sugerirFabricanteKit('', '')).toBe('')
  })

  it('gera descrição técnica formatada', () => {
    const desc = sugerirDescricaoTecnica({
      qtdPaineis: 10,
      potenciaPainelW: 610,
      marcaPaineis: 'Canadian Solar',
      qtdInversores: 1,
      marcaInversor: 'Growatt 5000',
      kwp: 6.1,
    })
    expect(desc).toContain('10x Módulo fotovoltaico 610Wp (Canadian Solar)')
    expect(desc).toContain('1x Inversor solar Growatt 5000')
    expect(desc).toContain('Total 6,1 kWp')
  })
})
