import { describe, it, expect, vi } from 'vitest'
import { normalizarTexto } from '@/components/CidadeFilterInput'
import { LeadsService } from '@/services/leads'
import pb from '@/lib/pocketbase/client'

describe('Filtro de Cidades na listagem de leads', () => {
  describe('normalizarTexto (tolerância a acentos e maiúsculas)', () => {
    it('deve normalizar texto removendo acentos e convertendo para minúsculas', () => {
      expect(normalizarTexto('Cacoal')).toBe('cacoal')
      expect(normalizarTexto('CACOAL')).toBe('cacoal')
      expect(normalizarTexto('Ji-Paraná')).toBe('ji-parana')
      expect(normalizarTexto('JI-PARANÁ')).toBe('ji-parana')
      expect(normalizarTexto("Alta Floresta d'Oeste")).toBe("alta floresta d'oeste")
      expect(normalizarTexto('São Miguel do Guaporé')).toBe('sao miguel do guapore')
    })

    it('deve retornar string vazia para valores nulos, indefinidos ou vazios', () => {
      expect(normalizarTexto(null)).toBe('')
      expect(normalizarTexto(undefined)).toBe('')
      expect(normalizarTexto('')).toBe('')
      expect(normalizarTexto('   ')).toBe('')
    })

    it('deve permitir correspondência parcial case-insensitive e sem acentos', () => {
      const cidades = ['Ji-Paraná', 'Cacoal', 'Rolim de Moura', 'Vilhena', 'Porto Velho']
      const busca = normalizarTexto('parana')
      const filtradas = cidades.filter((c) => normalizarTexto(c).includes(busca))
      expect(filtradas).toEqual(['Ji-Paraná'])

      const buscaMoura = normalizarTexto('MOURA')
      const filtradasMoura = cidades.filter((c) => normalizarTexto(c).includes(buscaMoura))
      expect(filtradasMoura).toEqual(['Rolim de Moura'])
    })
  })

  describe('LeadsService.getLeads com filtro de cidade', () => {
    it('deve montar a cláusula de filtro PocketBase com cidade ~ "valor" combinada com search e status', async () => {
      const getListSpy = vi.spyOn(pb.collection('leads'), 'getList').mockResolvedValueOnce({
        page: 1,
        perPage: 20,
        totalItems: 1,
        totalPages: 1,
        items: [] as any,
      })

      await LeadsService.getLeads({
        search: 'Silva',
        cidade: 'Cacoal',
        status: ['Novo'],
        statusQualificacao: 'funil_ativo',
      })

      expect(getListSpy).toHaveBeenCalledTimes(1)
      const options = getListSpy.mock.calls[0][2]
      expect(options?.filter).toContain('(nome ~ "Silva" || email ~ "Silva" || telefone ~ "Silva")')
      expect(options?.filter).toContain('cidade ~ "Cacoal"')
      expect(options?.filter).toContain('(status = "Novo")')
      expect(options?.filter).toContain('status_qualificacao != "aguardando"')

      getListSpy.mockRestore()
    })

    it('deve sanitizar caracteres problemáticos como aspas duplas e barras invertidas na cidade', async () => {
      const getListSpy = vi.spyOn(pb.collection('leads'), 'getList').mockResolvedValueOnce({
        page: 1,
        perPage: 20,
        totalItems: 0,
        totalPages: 1,
        items: [] as any,
      })

      await LeadsService.getLeads({
        cidade: 'Cacoal" || 1=1 --',
      })

      expect(getListSpy).toHaveBeenCalledTimes(1)
      const options = getListSpy.mock.calls[0][2]
      expect(options?.filter).toContain('cidade ~ "Cacoal || 1=1 --"')
      expect(options?.filter).not.toContain('""')

      getListSpy.mockRestore()
    })
  })

  describe('LeadsService.getCidadesCadastradas', () => {
    it('deve retornar lista distinta e ordenada alfabeticamente ignorando duplicatas com caixa diferente', async () => {
      const getFullListSpy = vi
        .spyOn(pb.collection('leads'), 'getFullList')
        .mockResolvedValueOnce([
          { cidade: 'Cacoal' },
          { cidade: 'cacoal' },
          { cidade: 'Ji-Paraná' },
          { cidade: 'JI-PARANÁ' },
          { cidade: 'Ariquemes' },
          { cidade: '' },
          { cidade: '   ' },
          { cidade: 'Vilhena' },
        ] as any)

      const cidades = await LeadsService.getCidadesCadastradas()

      expect(getFullListSpy).toHaveBeenCalledWith({
        filter: "cidade != ''",
        fields: 'cidade',
      })
      // Lista distinta e ordenada
      expect(cidades).toEqual(['Ariquemes', 'Cacoal', 'Ji-Paraná', 'Vilhena'])

      getFullListSpy.mockRestore()
    })
  })
})
