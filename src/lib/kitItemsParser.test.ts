import { describe, it, expect } from 'vitest'
import { parseKitDetailedItems } from './kitItemsParser'

describe('kitItemsParser', () => {
  it('decompoe descricao de distribuidor tipo Bel Energy com 22 modulos e inversor 10kW', () => {
    const desc =
      '22= MODULO BIFACIAL 132 CEL. N TYPE 630W BLACK FRAME CABO 0.30M TSUN POWERMFTB-0.3-BF-132-630W 01= INVERSOR DE CORRENTE MONOFASICO 3MPPT 220V 10KW SUNGROWINVSG-MO-220V-10KW 01= STRING BOX 3E/3S 1000V DC C'

    const res = parseKitDetailedItems({
      kitNome: 'GERADOR BEL ENERGY-TELHADO- SUNGROW10WP-TESUN630W',
      kitPotenciaKw: 13.8,
      kitFabricante: 'Sungrow/TSUN',
      descricao: desc,
      consumoKwh: 1200,
    })

    expect(res.potenciaTotalKwp).toBe(13.8)
    expect(res.quantidadeModulosTotal).toBe(22)
    expect(res.geracaoMensalEstimadaKwh).toBe(Math.round(13.8 * 125))

    const moduloItem = res.itens.find((i) => i.tipo === 'modulo')
    expect(moduloItem).toBeDefined()
    expect(moduloItem?.quantidade).toBe(22)
    expect(moduloItem?.fabricanteModelo).toContain('TSUN')
    expect(moduloItem?.fabricanteModelo).toContain('630Wp')

    const inversorItem = res.itens.find((i) => i.tipo === 'inversor')
    expect(inversorItem).toBeDefined()
    expect(inversorItem?.quantidade).toBe(1)
    expect(inversorItem?.fabricanteModelo).toContain('Sungrow')
    expect(inversorItem?.fabricanteModelo).toContain('10 kW')

    const stringBox = res.itens.find((i) => i.tipo === 'string_box')
    expect(stringBox).toBeDefined()
  })

  it('decompoe kit pré-pronto gerado pelo CRM com descrição linha a linha', () => {
    const desc =
      '10x Módulo fotovoltaico 610Wp (Canadian Solar) — Total 6,10 kWp\n1x Inversor solar Growatt 5000\nEstrutura de fixação e cabeamento completo inclusos.'

    const res = parseKitDetailedItems({
      kitNome: 'Kit Solar 6,1 kWp — Canadian Solar + Growatt',
      kitPotenciaKw: 6.1,
      kitFabricante: 'Canadian Solar / Growatt',
      descricao: desc,
      consumoKwh: 600,
    })

    expect(res.potenciaTotalKwp).toBe(6.1)
    const modulo = res.itens.find((i) => i.tipo === 'modulo')
    expect(modulo).toBeDefined()
    expect(modulo?.quantidade).toBe(10)
    expect(modulo?.fabricanteModelo).toContain('Canadian Solar')
    expect(modulo?.fabricanteModelo).toContain('610Wp')

    const inv = res.itens.find((i) => i.tipo === 'inversor')
    expect(inv).toBeDefined()
    expect(inv?.quantidade).toBe(1)
    expect(inv?.fabricanteModelo).toContain('Growatt')
  })

  it('calcula área estimada de telhado com base na quantidade de painéis', () => {
    const res = parseKitDetailedItems({
      kitNome: 'Kit Residencial 6,6 kWp',
      kitPotenciaKw: 6.6,
      descricao:
        'Atende consumo entre 600 e 800 kWh/mês com geração de alta eficiência. 12 módulos bifaciais.',
    })

    expect(res.quantidadeModulosTotal).toBe(12)
    expect(res.areaEstimadaM2).toBe(Math.round(12 * 2.8))
  })
})
