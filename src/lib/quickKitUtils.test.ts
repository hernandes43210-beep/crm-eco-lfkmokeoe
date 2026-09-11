import { describe, it, expect } from 'vitest'
import {
  calcularKwpPrePronto,
  sugerirNomeKit,
  sugerirFabricanteKit,
  sugerirDescricaoTecnica,
  gerarNomeKitClonado,
  extrairComponentesKit,
  formatarRotuloStringBox,
  formatarRotuloEstrutura,
  formatarNomeItemEstrutura,
  formatarPotenciaW,
  formatarPotenciaKw,
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
    expect(desc).toContain('10x Módulo fotovoltaico 610 W (Canadian Solar)')
    expect(desc).toContain('1x Inversor solar Growatt 5000')
    expect(desc).toContain('Total 6,1 kWp')

    const descComSb = sugerirDescricaoTecnica({
      qtdPaineis: 10,
      potenciaPainelW: 610,
      marcaPaineis: 'OSDA',
      qtdInversores: 1,
      marcaInversor: 'Sungrow',
      kwp: 6.1,
      stringBox: '2_entradas',
      tipoEstrutura: 'solo_monoposte',
    })
    expect(descComSb).toContain('1x String box 2 entradas / 2 saídas')
    expect(descComSb).toContain('Estrutura de fixação: Solo monoposte')
  })

  it('formata potencias em W e kW no padrao brasileiro', () => {
    expect(formatarPotenciaW(630)).toBe('630 W')
    expect(formatarPotenciaW(630, 'Wp')).toBe('630 Wp')
    expect(formatarPotenciaKw(7.5)).toBe('7,5 kW')
    expect(formatarPotenciaKw(10)).toBe('10 kW')
    expect(formatarPotenciaKw(5)).toBe('5 kW')
  })

  it('formata rotulos de estrutura e nome de item com precisão', () => {
    expect(formatarRotuloEstrutura('solo_monoposte')).toBe('Solo monoposte')
    expect(formatarRotuloEstrutura('mini_trilho')).toBe('Mini trilho')
    expect(formatarRotuloEstrutura('fibrocimento')).toBe('Fibrocimento')

    const monoposteItem = formatarNomeItemEstrutura('solo_monoposte')
    expect(monoposteItem.nome).toContain('Solo Monoposte')

    const miniTrilhoItem = formatarNomeItemEstrutura('mini_trilho')
    expect(miniTrilhoItem.nome).toContain('Mini Trilho')

    const fibrocimentoItem = formatarNomeItemEstrutura('fibrocimento')
    expect(fibrocimentoItem.nome).toContain('Fibrocimento')
  })

  it('formata rotulo amigavel de string box', () => {
    expect(formatarRotuloStringBox('1_entrada')).toBe('String box 1 entrada / 1 saída')
    expect(formatarRotuloStringBox('2_entradas')).toBe('String box 2 entradas / 2 saídas')
    expect(formatarRotuloStringBox('3_entradas')).toBe('String box 3 entradas / 3 saídas')
    expect(formatarRotuloStringBox('')).toBe('')
    expect(formatarRotuloStringBox(undefined)).toBe('')
  })

  it('gera nome duplicado com sufixo "— Cópia"', () => {
    expect(gerarNomeKitClonado('Kit Solar 6,1 kWp — Canadian')).toBe(
      'Kit Solar 6,1 kWp — Canadian — Cópia',
    )
    expect(gerarNomeKitClonado('Kit Solar 6,1 kWp — Cópia')).toBe('Kit Solar 6,1 kWp — Cópia 2')
    expect(gerarNomeKitClonado('Kit Solar 6,1 kWp — Cópia 2')).toBe('Kit Solar 6,1 kWp — Cópia 3')
    expect(gerarNomeKitClonado('')).toBe('Novo Kit Solar — Cópia')
  })

  it('extrai componentes para pré-preenchimento da montagem pré-pronta', () => {
    const kitPrePronto = {
      nome: 'Kit Solar 6,3 kWp-SOLO — TSUN + 5KW AUXSOL-BELENERGY',
      potencia_kw: 6.3,
      fabricante: 'TSUN / 5KW AUXSOL',
      marca_painel: 'TSUN POWER',
      marca_inversor: 'AUSXOL',
      tipo_estrutura: 'solo_monoposte',
      descricao:
        '10x Módulo fotovoltaico 630Wp (TSUN) — Total 6,3 kWp\n1x Inversor solar 5KW AUXSOL\nEstrutura inclusa.',
    }

    const componentes = extrairComponentesKit(kitPrePronto)
    expect(componentes.isPrePronto).toBe(true)
    expect(componentes.qtdPaineis).toBe(10)
    expect(componentes.potenciaPainelW).toBe(630)
    expect(componentes.marcaPaineis).toBe('TSUN POWER')
    expect(componentes.qtdInversores).toBe(1)
    expect(componentes.marcaInversor).toBe('AUSXOL')
    expect(componentes.tipoEstrutura).toBe('solo_monoposte')
  })

  it('extrai componentes de kit manual com fallback seguro', () => {
    const kitManual = {
      nome: 'Kit Sob Demanda Especial',
      potencia_kw: 5.5,
      fabricante: 'WEG',
      descricao: 'Estrutura personalizada sob encomenda.',
    }

    const comp = extrairComponentesKit(kitManual)
    expect(comp.isPrePronto).toBe(true)
    expect(comp.qtdPaineis).toBeGreaterThan(0)
    expect(comp.potenciaPainelW).toBe(610)
  })
})
