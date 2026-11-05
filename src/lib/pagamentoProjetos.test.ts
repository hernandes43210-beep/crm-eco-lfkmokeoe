import { describe, it, expect } from 'vitest'
import {
  contarDiasAte,
  nomeClienteProjeto,
  separarProjetosPorPagamento,
  textoDias,
} from './pagamentoProjetos'
import type { HomologacaoLead } from '@/types/crm'

const AGORA = new Date('2026-11-05T12:00:00.000Z')

function hom(par: Partial<HomologacaoLead>): HomologacaoLead {
  return {
    id: 'h1',
    lead: 'l1',
    engenheiro: 'e1',
    status: 'entregue',
    collectionId: 'hom',
    collectionName: 'homologacoes',
    created: '2026-10-01T10:00:00.000Z',
    updated: '2026-10-01T10:00:00.000Z',
    ...par,
  } as HomologacaoLead
}

describe('contarDiasAte', () => {
  it('conta dias completos ignorando o horário', () => {
    expect(contarDiasAte('2026-11-04T23:59:00.000Z', AGORA)).toBe(1)
    expect(contarDiasAte('2026-10-24T12:00:00.000Z', AGORA)).toBe(12)
  })

  it('retorna 0 para hoje e para datas inválidas', () => {
    expect(contarDiasAte('2026-11-05T08:00:00.000Z', AGORA)).toBe(0)
    expect(contarDiasAte('', AGORA)).toBe(0)
  })

  it('nunca retorna dias negativos para data no futuro', () => {
    expect(contarDiasAte('2026-12-01T00:00:00.000Z', AGORA)).toBe(0)
  })
})

describe('textoDias', () => {
  it('singular, plural e hoje', () => {
    expect(textoDias(0)).toBe('hoje')
    expect(textoDias(1)).toBe('há 1 dia')
    expect(textoDias(12)).toBe('há 12 dias')
  })
})

describe('nomeClienteProjeto', () => {
  it('usa cliente_nome da homologação e cai para o nome do lead', () => {
    expect(nomeClienteProjeto(hom({ cliente_nome: 'Maria Souza' }))).toBe('Maria Souza')
    expect(
      nomeClienteProjeto(
        hom({ cliente_nome: '', expand: { lead: { nome: 'João Lima' } } as never }),
      ),
    ).toBe('João Lima')
    expect(nomeClienteProjeto(hom({}))).toBe('Cliente sem nome')
  })
})

describe('separarProjetosPorPagamento', () => {
  it('separa pagos e pendentes usando os campos projeto_pago*', () => {
    const { pagos, pendentes } = separarProjetosPorPagamento(
      [
        hom({ id: 'a', cliente_nome: 'Pendente Antigo', created: '2026-10-01T00:00:00.000Z' }),
        hom({
          id: 'b',
          cliente_nome: 'Pago Recentemente',
          projeto_pago: true,
          projeto_pago_em: '2026-11-04',
        }),
        hom({ id: 'c', cliente_nome: 'Pendente Recente', created: '2026-11-01T00:00:00.000Z' }),
        hom({
          id: 'd',
          cliente_nome: 'Pago Antigo',
          projeto_pago: true,
          projeto_pago_em: '2026-10-10',
        }),
      ],
      AGORA,
    )

    expect(pagos.map((p) => p.nome)).toEqual(['Pago Recentemente', 'Pago Antigo'])
    expect(pendentes.map((p) => p.nome)).toEqual(['Pendente Antigo', 'Pendente Recente'])
    // Pendentes: mais dias aguardando primeiro
    expect(pendentes[0].dias).toBeGreaterThan(pendentes[1].dias)
    // Pagos: dias desde o pagamento
    expect(pagos[0].dias).toBe(1)
    expect(pagos[0].pagoEm).toBe('2026-11-04')
  })

  it('não expõe nenhum valor monetário (só id, nome, datas e dias)', () => {
    const { pagos, pendentes } = separarProjetosPorPagamento(
      [hom({ cliente_nome: 'X', projeto_pago: true, projeto_pago_em: '2026-11-01' })],
      AGORA,
    )
    for (const item of [...pagos, ...pendentes]) {
      expect(Object.keys(item).sort()).toEqual([
        'dias',
        'id',
        'nome',
        'pago',
        'pagoEm',
        'referencia',
      ])
    }
  })

  it('retorna listas vazias para entrada vazia', () => {
    const { pagos, pendentes } = separarProjetosPorPagamento([], AGORA)
    expect(pagos).toEqual([])
    expect(pendentes).toEqual([])
  })
})
