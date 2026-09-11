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
    // Nova fórmula: 13.8 * 4.6 * 0.80 * 30 = 1523.52 ≈ 1524 kWh/mês
    expect(res.geracaoMensalEstimadaKwh).toBe(Math.round(13.8 * 4.6 * 0.8 * 30))

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
    // Validação do exemplo do usuário: 6,1 kWp × 4,6 × 0,80 = 22,4 kWh/dia ≈ 673 kWh/mês
    expect(res.geracaoMensalEstimadaKwh).toBe(673)
    const modulo = res.itens.find((i) => i.tipo === 'modulo')
    expect(modulo).toBeDefined()
    expect(modulo?.quantidade).toBe(10)
    expect(modulo?.fabricanteModelo).toContain('Canadian Solar')
    expect(modulo?.fabricanteModelo).toMatch(/610\s*W/)
    expect(modulo?.potenciaUnit).toBe('610 W')

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

  it('rotula e decompõe string box conforme a opção escolhida pelo usuário', () => {
    const resComSb = parseKitDetailedItems({
      kitNome: 'Kit Solar 6,1 kWp — Canadian Solar + Growatt',
      kitPotenciaKw: 6.1,
      descricao:
        '10x Módulo fotovoltaico 610Wp (Canadian Solar) — Total 6,1 kWp\n1x Inversor solar Growatt 5000\n1x String box 2 entradas / 2 saídas\nEstrutura inclusa.',
      stringBox: '2_entradas',
    })

    const sbItem = resComSb.itens.find((i) => i.tipo === 'string_box')
    expect(sbItem).toBeDefined()
    expect(sbItem?.quantidade).toBe(1)
    expect(sbItem?.nome).toBe('String box 2 entradas / 2 saídas')

    // Se o usuário não escolheu string box e não há na descrição, não deve listar
    const resSemSb = parseKitDetailedItems({
      kitNome: 'Kit Solar 5,5 kWp',
      kitPotenciaKw: 5.5,
      descricao: '8 módulos 550W + inversor monofásico 5kW.',
    })
    const sbItemAusente = resSemSb.itens.find((i) => i.tipo === 'string_box')
    expect(sbItemAusente).toBeUndefined()
  })

  it('respeita tipo de estrutura especificado (solo monoposte, mini trilho, fibrocimento)', () => {
    const resMonoposte = parseKitDetailedItems({
      kitNome: 'Kit Monoposte 6.3kWp',
      kitPotenciaKw: 6.3,
      tipoEstrutura: 'solo_monoposte',
    })
    const itemMono = resMonoposte.itens.find((i) => i.tipo === 'estrutura')
    expect(itemMono?.nome).toContain('Solo Monoposte')

    const resMiniTrilho = parseKitDetailedItems({
      kitNome: 'Kit Telhado Metalico',
      kitPotenciaKw: 6.3,
      tipoEstrutura: 'mini_trilho',
    })
    const itemMini = resMiniTrilho.itens.find((i) => i.tipo === 'estrutura')
    expect(itemMini?.nome).toContain('Mini Trilho')

    const resFibro = parseKitDetailedItems({
      kitNome: 'Kit Telhado Fibrocimento',
      kitPotenciaKw: 6.3,
      tipoEstrutura: 'fibrocimento',
    })
    const itemFibro = resFibro.itens.find((i) => i.tipo === 'estrutura')
    expect(itemFibro?.nome).toContain('Fibrocimento')
  })

  it('respeita marcas solicitadas de painéis e inversores', () => {
    const res = parseKitDetailedItems({
      kitNome: 'Kit Custom',
      kitPotenciaKw: 6.3,
      marcaPainel: 'TSUN POWER',
      marcaInversor: 'HUAWEI',
      tipoEstrutura: 'solo_monoposte',
    })
    const modulo = res.itens.find((i) => i.tipo === 'modulo')
    expect(modulo?.fabricanteModelo).toContain('TSUN POWER')

    const inversor = res.itens.find((i) => i.tipo === 'inversor')
    expect(inversor?.fabricanteModelo).toContain('HUAWEI')
  })

  it('exibe potências formatadas com padrão brasileiro em W para painel e kW para inversor', () => {
    const res = parseKitDetailedItems({
      kitNome: 'Kit Solar 7,56 kWp',
      kitPotenciaKw: 7.56,
      marcaPainel: 'Canadian Solar',
      potenciaPainelW: 630,
      marcaInversor: 'Growatt',
      potenciaInversorKw: 7.5,
    })

    const modulo = res.itens.find((i) => i.tipo === 'modulo')
    expect(modulo?.potenciaUnit).toBe('630 W')
    expect(modulo?.fabricanteModelo).toContain('630 W')

    const inversor = res.itens.find((i) => i.tipo === 'inversor')
    expect(inversor?.potenciaUnit).toBe('7,5 kW')
    expect(inversor?.fabricanteModelo).toContain('7,5 kW')
  })
})
