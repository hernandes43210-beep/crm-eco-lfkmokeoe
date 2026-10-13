import { describe, it, expect } from 'vitest'
import { PhbSolarService, type PhbKitDetalhes, type PhbKitResumo } from './phbSolar'

describe('PhbSolarService.mapPhbKitToCrm', () => {
  it('converte kit PHB com módulos, inversor Sungrow e estrutura solo corretamente', () => {
    const detalhes: PhbKitDetalhes = {
      uid: 'kit-12345',
      descricao: 'KIT GERADOR 6.6KWP TELHADO PHB',
      preco: 14500.5,
      potencia_cc: 6600,
      potencia_ca: 6000,
      tipo_estrutura: 'solo_monoposte',
      componentes: [
        {
          quantidade: 12,
          componente: {
            nome: 'MODULO FOTOVOLTAICO OSDA 550W MONO',
            grupo: 'modulo',
          },
        },
        {
          quantidade: 1,
          componente: {
            nome: 'INVERSOR SOLAR ON-GRID SUNGROW SG6.0RS 6KW 220V',
            grupo: 'inversor',
          },
        },
        {
          quantidade: 1,
          componente: {
            nome: 'STRING BOX CC 2 ENTRADAS 2 SAIDAS',
            grupo: 'stringbox',
          },
        },
        {
          quantidade: 1,
          componente: {
            nome: 'ESTRUTURA FIXACAO SOLO MONOPOSTE 12 MODULOS',
            grupo: 'estrutura',
          },
        },
      ],
    }

    const crmKit = PhbSolarService.mapPhbKitToCrm(detalhes)

    expect(crmKit.custo).toBe(14500.5)
    expect(crmKit.potenciaKw).toBe(6.6)
    expect(crmKit.qtdPaineis).toBe(12)
    expect(crmKit.potenciaPainelW).toBe(550)
    expect(crmKit.marcaPainel).toBe('OSDA')
    expect(crmKit.marcaInversor).toBe('Sungrow')
    expect(crmKit.potenciaInversorKw).toBe(6)
    expect(crmKit.stringBox).toBe('2_entradas')
    expect(crmKit.tipoEstrutura).toBe('solo_monoposte')
    expect(crmKit.nome).toContain('Kit Solar 6,6 kWp')
    expect(crmKit.nome).toContain('OSDA + Sungrow')
    expect(crmKit.nome).toContain('Solo monoposte')
    expect(crmKit.descricao).toContain('OSDA')
    expect(crmKit.descricao).toContain('SUNGROW')
  })

  it('faz fallback adequado para kits sem lista de componentes explícita', () => {
    const resumo: PhbKitResumo = {
      uid: 'uid-fallback',
      descricao: 'Kit Solar 5kWp PHB Monofásico 220V',
      preco: 11000,
      potencia_cc: 5000,
      potencia_ca: 5000,
      potencia_modulo: 580,
      tipo_estrutura: 'telhado',
      contem_trafo: false,
    }

    const crmKit = PhbSolarService.mapPhbKitToCrm({ uid: 'uid-fallback' }, resumo)

    expect(crmKit.custo).toBe(11000)
    expect(crmKit.potenciaKw).toBe(5)
    expect(crmKit.marcaInversor).toBe('PHB')
    expect(crmKit.tipoEstrutura).toBe('fibrocimento')
    expect(crmKit.descricao).toContain('Ref. PHB')
  })
})
