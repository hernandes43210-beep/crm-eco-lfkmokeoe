import { describe, it, expect } from 'vitest'
import {
  extractSolarEquipmentFromProposal,
  formatPotenciaDisplay,
  formatEconomiaDisplay,
} from './solarEquipmentParser'
import type { Proposta, Kit, Lead } from '@/types/crm'

describe('solarEquipmentParser', () => {
  it('formata potência e economia corretamente', () => {
    expect(formatPotenciaDisplay(7.32)).toBe('7,32 KWp')
    expect(formatPotenciaDisplay('7.32 KWp')).toBe('7.32 KWp')
    expect(formatPotenciaDisplay(undefined)).toBe('')

    expect(formatEconomiaDisplay(700)).toBe('Economia +700 R$/Mês')
    expect(formatEconomiaDisplay('+850 R$/Mês')).toBe('Economia +850 R$/Mês')
    expect(formatEconomiaDisplay('')).toBe('')
  })

  it('retorna campos vazios quando lead não tem propostas nem kit vinculado', () => {
    const lead: Lead = {
      id: 'lead-1',
      collectionId: 'leads',
      collectionName: 'leads',
      nome: 'Cliente Sem Proposta',
      email: 'teste@example.com',
      consumo_mensal_kwh: 0,
      sla_dias: 7,
      status: 'Fechado Ganho',
      proprietario: 'user-1',
      created: '2026-09-08',
      updated: '2026-09-08',
    }

    const result = extractSolarEquipmentFromProposal([], lead)
    expect(result.modulos).toBe('')
    expect(result.inversor).toBe('')
    expect(result.potenciaKw).toBeUndefined()
    expect(result.potenciaDisplay).toBe('')
  })

  it('extrai dados reais de fabricante par "Canadian Solar / Growatt" e calcula economia pelo consumo', () => {
    const lead: Lead = {
      id: 'lead-2',
      collectionId: 'leads',
      collectionName: 'leads',
      nome: 'João Silva',
      email: 'joao@example.com',
      consumo_mensal_kwh: 500,
      cidade: 'Cacoal',
      estado: 'RO',
      sla_dias: 7,
      status: 'Fechado Ganho',
      proprietario: 'user-1',
      created: '2026-09-08',
      updated: '2026-09-08',
    }

    const proposta: Proposta = {
      id: 'prop-1',
      collectionId: 'propostas',
      collectionName: 'propostas',
      lead: 'lead-2',
      kit_nome: 'Kit Residencial 4,5 kWp',
      kit_potencia_kw: 4.5,
      kit_fabricante: 'Canadian Solar / Growatt',
      custo: 12500,
      margem: 30,
      preco_venda: 17857.14,
      data_validade: '2026-09-20',
      status: 'Aceita',
      token_publico: 'token-123',
      created: '2026-09-08',
      updated: '2026-09-08',
    }

    const result = extractSolarEquipmentFromProposal([proposta], lead)
    expect(result.modulos).toBe('Módulos Canadian Solar')
    expect(result.inversor).toBe('Inversor Growatt')
    expect(result.potenciaKw).toBe(4.5)
    expect(result.potenciaDisplay).toBe('4,5 KWp')
    // Consumo 500 * 0.92 * 0.85 = 391
    expect(result.economiaMensal).toBe(391)
    expect(result.economiaDisplay).toBe('Economia +391 R$/Mês')
  })

  it('prioriza proposta aceita em relação a propostas enviadas mais recentes', () => {
    const lead: Lead = {
      id: 'lead-3',
      collectionId: 'leads',
      collectionName: 'leads',
      nome: 'Hernandes Costa',
      email: 'hernandes@example.com',
      consumo_mensal_kwh: 1200,
      cidade: 'Seringueiras',
      estado: 'RO',
      sla_dias: 7,
      status: 'Fechado Ganho',
      proprietario: 'user-1',
      created: '2026-09-08',
      updated: '2026-09-08',
    }

    const propAceita: Proposta = {
      id: 'prop-aceita',
      collectionId: 'propostas',
      collectionName: 'propostas',
      lead: 'lead-3',
      kit_nome: 'Kit Solar Personalizado 1281 kwh/MÊS',
      kit_potencia_kw: 11.38,
      kit_fabricante: 'TSUN 630/ SUNGROW',
      custo: 18420.13,
      margem: 41,
      preco_venda: 31220.56,
      data_validade: '2026-09-11',
      status: 'Aceita',
      token_publico: 'token-aceita',
      created: '2026-09-08 15:55:00',
      updated: '2026-09-08 19:38:00',
    }

    const propRecente: Proposta = {
      id: 'prop-recente',
      collectionId: 'propostas',
      collectionName: 'propostas',
      lead: 'lead-3',
      kit_nome: 'Outro Kit',
      kit_potencia_kw: 13.8,
      kit_fabricante: 'Outro Fab',
      custo: 20000,
      margem: 40,
      preco_venda: 35000,
      data_validade: '2026-09-20',
      status: 'Enviada',
      token_publico: 'token-recente',
      created: '2026-09-08 22:49:00',
      updated: '2026-09-08 22:49:00',
    }

    // Mesmo com a recente vindo primeiro no array
    const result = extractSolarEquipmentFromProposal([propRecente, propAceita], lead)
    expect(result.modulos).toBe('Módulos TSUN 630')
    expect(result.inversor).toBe('Inversor SUNGROW')
    expect(result.potenciaKw).toBe(11.38)
    expect(result.potenciaDisplay).toBe('11,38 KWp')
  })

  it('extrai detalhes da descrição do kit expandido quando disponível', () => {
    const lead: Lead = {
      id: 'lead-4',
      collectionId: 'leads',
      collectionName: 'leads',
      nome: 'Empresa ABC',
      email: 'abc@example.com',
      consumo_mensal_kwh: 0,
      sla_dias: 7,
      status: 'Fechado Ganho',
      proprietario: 'user-1',
      created: '2026-09-08',
      updated: '2026-09-08',
    }

    const kit: Kit = {
      id: 'kit-1',
      collectionId: 'kits',
      collectionName: 'kits',
      nome: 'GERADOR BEL ENERGY',
      potencia_kw: 13.8,
      categoria: 'Residencial',
      custo: 20000,
      margem: 40,
      preco_venda: 35000,
      descricao:
        '22= MODULO BIFACIAL 132 CEL. N TYPE 630W BLACK FRAME CABO 0.30M TSUN POWERMFTB-0.3-BF-132-630W 01= INVERSOR DE CORRENTE MONOFASICO 3MPPT 220V 10KW SUNGROWINVSG-MO-220V-10KW',
      created: '2026-09-08',
      updated: '2026-09-08',
    }

    const proposta: Proposta = {
      id: 'prop-desc',
      collectionId: 'propostas',
      collectionName: 'propostas',
      lead: 'lead-4',
      kit_nome: 'GERADOR BEL ENERGY',
      kit_potencia_kw: 13.8,
      custo: 20000,
      margem: 40,
      preco_venda: 35000,
      data_validade: '2026-09-20',
      status: 'Enviada',
      token_publico: 'token-desc',
      created: '2026-09-08',
      updated: '2026-09-08',
      expand: {
        kit,
      },
    }

    const result = extractSolarEquipmentFromProposal([proposta], lead)
    expect(result.modulos).toBe('Módulos TSUN 630 Wp')
    expect(result.inversor).toBe('Inversor Sungrow 10 kW')
    expect(result.potenciaKw).toBe(13.8)
    // Sem consumo informado, calcula economia pela potência do kit: 13.8 * 125 * 0.92 * 0.85 = ~1349
    expect(result.economiaMensal).toBeGreaterThan(1000)
  })
})
