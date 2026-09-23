import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { extractProposalTracking, formatRelativeDateTimePT } from './proposalTracking'

describe('proposalTracking utils', () => {
  beforeEach(() => {
    // Fixar data para 2026-09-15 14:30:00 UTC
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-15T14:30:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('formatRelativeDateTimePT', () => {
    it('retorna string vazia para datas nulas ou inválidas', () => {
      expect(formatRelativeDateTimePT(null)).toBe('')
      expect(formatRelativeDateTimePT(undefined)).toBe('')
      expect(formatRelativeDateTimePT('invalido')).toBe('')
    })

    it('formata como "hoje às HH:mm" para o mesmo dia', () => {
      const hojeIso = new Date('2026-09-15T10:15:00Z').toISOString()
      const res = formatRelativeDateTimePT(hojeIso)
      expect(res).toContain('hoje às')
    })

    it('formata como "ontem às HH:mm" para o dia anterior', () => {
      const ontemIso = new Date('2026-09-14T18:00:00Z').toISOString()
      const res = formatRelativeDateTimePT(ontemIso)
      expect(res).toContain('ontem às')
    })
  })

  describe('extractProposalTracking', () => {
    it('retorna estado padrão para proposta sem visualizações', () => {
      const prop = {
        visualizacoes_count: 0,
      }
      const tracking = extractProposalTracking(prop)
      expect(tracking.total).toBe(0)
      expect(tracking.hasViewed).toBe(false)
      expect(tracking.historico).toHaveLength(0)
      expect(tracking.ultimaEm).toBeUndefined()
    })

    it('extrai histórico a partir de visualizacoes_historico (array de ISO timestamps)', () => {
      const prop = {
        visualizacoes_count: 2,
        ultima_visualizacao: '2026-09-15T14:00:00Z',
        primeira_visualizacao: '2026-09-14T10:00:00Z',
        visualizacoes_historico: ['2026-09-14T10:00:00Z', '2026-09-15T14:00:00Z'],
      }
      const tracking = extractProposalTracking(prop)
      expect(tracking.total).toBe(2)
      expect(tracking.hasViewed).toBe(true)
      expect(tracking.historico).toHaveLength(2)
      // Primeiro deve ser a mais recente
      expect(tracking.historico[0].dataIso).toBe('2026-09-15T14:00:00.000Z')
      expect(tracking.historico[1].dataIso).toBe('2026-09-14T10:00:00.000Z')
      expect(tracking.ultimaRelativa).toContain('hoje às')
    })

    it('extrai histórico a partir de historico_acessos (JSON string ou objetos)', () => {
      const prop = {
        visualizacoes_count: 3,
        historico_acessos: JSON.stringify([
          { data: '2026-09-13T09:00:00Z', ip: '1.2.3.4' },
          { data: '2026-09-14T12:00:00Z', ip: '1.2.3.4' },
          { data: '2026-09-15T14:10:00Z', ip: '1.2.3.4' },
        ]),
      }
      const tracking = extractProposalTracking(prop)
      expect(tracking.total).toBe(3)
      expect(tracking.hasViewed).toBe(true)
      expect(tracking.historico).toHaveLength(3)
      expect(tracking.historico[0].dataIso).toBe('2026-09-15T14:10:00.000Z')
      expect(tracking.historico[0].ip).toBe('1.2.3.4')
    })

    it('combina e desduplica timestamps de historico_acessos e visualizacoes_historico', () => {
      const prop = {
        visualizacoes_count: 1,
        visualizacoes_historico: ['2026-09-15T14:00:00Z'],
        historico_acessos: [{ data: '2026-09-15T14:00:00Z', ip: '192.168.1.1' }],
      }
      const tracking = extractProposalTracking(prop)
      expect(tracking.total).toBe(1)
      expect(tracking.historico).toHaveLength(1)
      expect(tracking.historico[0].ip).toBe('192.168.1.1')
    })

    it('faz fallback para primeira e última visualização caso não haja array', () => {
      const prop = {
        visualizacoes_count: 1,
        primeira_visualizacao: '2026-09-15T14:00:00Z',
        ultima_visualizacao: '2026-09-15T14:00:00Z',
        ultimo_ip_visualizacao: '10.0.0.1',
      }
      const tracking = extractProposalTracking(prop)
      expect(tracking.total).toBe(1)
      expect(tracking.hasViewed).toBe(true)
      expect(tracking.historico).toHaveLength(1)
      expect(tracking.historico[0].ip).toBe('10.0.0.1')
    })
  })
})
