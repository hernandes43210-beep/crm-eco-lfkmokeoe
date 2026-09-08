import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  parseSpreadsheetBuffer,
  autoDetectMapping,
  evaluateRowDeduplication,
  normalizeHeader,
  normalizeDigits,
  parseNumberSafe,
  parseUFSafe,
  parseOrigemSafe,
} from './leadImport'
import type { Lead } from '@/types/crm'

describe('leadImport utilities', () => {
  it('normalizes headers and digits correctly', () => {
    expect(normalizeHeader('  Nome Completo / Cliente * ')).toBe('nome completo cliente')
    expect(normalizeHeader('Preço Proposta (R$)')).toBe('preco proposta r')
    expect(normalizeDigits('(11) 98765-4321')).toBe('11987654321')
    expect(normalizeDigits(null)).toBe('')
  })

  it('parses numbers safely from PT-BR formatting', () => {
    expect(parseNumberSafe('R$ 25.500,00')).toBe(25500)
    expect(parseNumberSafe('1.250,50')).toBe(1250.5)
    expect(parseNumberSafe('450')).toBe(450)
    expect(parseNumberSafe('', 400)).toBe(400)
  })

  it('parses Brazilian UFs and full state names', () => {
    expect(parseUFSafe('São Paulo')).toBe('SP')
    expect(parseUFSafe('rondonia')).toBe('RO')
    expect(parseUFSafe('MG')).toBe('MG')
    expect(parseUFSafe(null)).toBe('SP')
  })

  it('parses origens safely', () => {
    expect(parseOrigemSafe('Indicação do João')).toBe('Indicação')
    expect(parseOrigemSafe('Campanha Instagram')).toBe('Redes Sociais')
    expect(parseOrigemSafe('Site Institucional')).toBe('Site')
    expect(parseOrigemSafe('Feira Solar')).toBe('Evento')
    expect(parseOrigemSafe('Planilha Luvik 2026')).toBe('Outros')
  })

  it('parses XLSX buffer and extracts data rows with headers', () => {
    const data = [
      ['Cliente', 'Telefone', 'E-mail', 'Cidade', 'Estado', 'Consumo kWh', 'Valor'],
      ['João da Silva', '11988887777', 'joao@solar.com', 'Campinas', 'SP', 550, 22000],
      ['Maria Souza', '69999998888', 'maria@solar.com', 'Porto Velho', 'RO', 900, 35000],
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Negócios')
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

    const parsed = parseSpreadsheetBuffer(buffer, { hasHeaders: true })
    expect(parsed.headers).toEqual([
      'Cliente',
      'Telefone',
      'E-mail',
      'Cidade',
      'Estado',
      'Consumo kWh',
      'Valor',
    ])
    expect(parsed.dataRows.length).toBe(2)
    expect(parsed.dataRows[0]['Cliente']).toBe('João da Silva')
    expect(parsed.dataRows[1]['Cidade']).toBe('Porto Velho')

    // Test autoDetectMapping
    const mapping = autoDetectMapping(parsed.headers, parsed.dataRows)
    expect(mapping.nome).toBe('Cliente')
    expect(mapping.telefone).toBe('Telefone')
    expect(mapping.email).toBe('E-mail')
    expect(mapping.cidade).toBe('Cidade')
    expect(mapping.estado).toBe('Estado')
    expect(mapping.consumo_mensal_kwh).toBe('Consumo kWh')
    expect(mapping.preco_venda).toBe('Valor')
  })

  it('evaluates deduplication correctly for new, duplicate and invalid rows', () => {
    const existingLeads: Lead[] = [
      {
        id: 'lead1',
        nome: 'João Existente',
        email: 'joao@existente.com',
        telefone: '11999991111',
        consumo_mensal_kwh: 500,
        status: 'Novo',
        sla_dias: 7,
        proprietario: 'user1',
        luvik_deal_id: 'LVK-100',
        created: '2026-09-01T10:00:00.000Z',
        updated: '2026-09-01T10:00:00.000Z',
        collectionId: 'leads',
        collectionName: 'leads',
      },
    ]

    const rows = [
      {
        Nome: 'Novo Cliente Solar',
        Telefone: '11977776666',
        Email: 'novo@solar.com',
        Cidade: 'Sorocaba',
        Estado: 'SP',
        Consumo: '600',
      },
      {
        Nome: 'João Atualizado',
        Telefone: '11999991111', // same phone as existing lead1
        Email: 'outro_email@solar.com',
        Cidade: 'Campinas',
        Estado: 'SP',
        Consumo: '550',
      },
      {
        Nome: '', // invalid row without name
        Telefone: '11988887777',
        Email: 'semnome@solar.com',
        Cidade: 'Santos',
        Estado: 'SP',
        Consumo: '300',
      },
    ]

    const mapping = {
      nome: 'Nome',
      telefone: 'Telefone',
      email: 'Email',
      cidade: 'Cidade',
      estado: 'Estado',
      endereco: '',
      consumo_mensal_kwh: 'Consumo',
      preco_venda: '',
      origem: '',
      luvik_deal_id: '',
    }

    const processed = evaluateRowDeduplication(rows, mapping, existingLeads)
    expect(processed.length).toBe(3)

    // Row 1: Novo
    expect(processed[0].status).toBe('novo')
    expect(processed[0].nome).toBe('Novo Cliente Solar')

    // Row 2: Duplicado
    expect(processed[1].status).toBe('duplicado')
    expect(processed[1].existingLeadId).toBe('lead1')

    // Row 3: Inválido
    expect(processed[2].status).toBe('invalido')
    expect(processed[2].validationErrors).toContain('Nome do lead não preenchido.')
  })
})
