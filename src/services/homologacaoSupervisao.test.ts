import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HomologacaoService } from './homologacao'
import pb from '@/lib/pocketbase/client'

vi.mock('@/lib/pocketbase/client', () => {
  return {
    default: {
      collection: vi.fn(),
      send: vi.fn(),
      authStore: {
        model: { id: 'usr_engenheiro_1' },
      },
    },
  }
})

describe('HomologacaoService - Permissão de Supervisão', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(pb.authStore as any).model = { id: 'usr_engenheiro_1' }
  })

  it('engenheiro comum sem supervisão deve filtrar estritamente pelo seu ID', async () => {
    const mockGetFullList = vi
      .fn()
      .mockResolvedValueOnce([
        { id: 'hom_1', engenheiro: 'usr_engenheiro_1', cliente_nome: 'Cliente A' },
      ])

    vi.mocked(pb.collection).mockReturnValue({
      getFullList: mockGetFullList,
    } as any)

    const res = await HomologacaoService.getHomologacoes({
      engenheiroId: 'usr_engenheiro_1',
      isAdmin: false,
      podeSupervisionar: false,
    })

    expect(mockGetFullList).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: 'engenheiro = "usr_engenheiro_1"',
      }),
    )
    expect(res).toHaveLength(1)
  })

  it('engenheiro supervisor com podeSupervisionar=true deve listar todos sem forçar filtro se nenhum engenheiro for especificado', async () => {
    const mockGetFullList = vi.fn().mockResolvedValueOnce([
      { id: 'hom_1', engenheiro: 'usr_engenheiro_1', cliente_nome: 'Cliente A' },
      { id: 'hom_2', engenheiro: 'usr_engenheiro_2', cliente_nome: 'Cliente B' },
    ])

    vi.mocked(pb.collection).mockReturnValue({
      getFullList: mockGetFullList,
    } as any)

    const res = await HomologacaoService.getHomologacoes({
      isAdmin: false,
      podeSupervisionar: true,
    })

    expect(mockGetFullList).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: '-created',
        expand: 'engenheiro,vendedor,dossie',
      }),
    )
    // Não deve conter filter restringindo ao próprio engenheiro
    const callArgs = mockGetFullList.mock.calls[0][0]
    expect(callArgs.filter).toBeUndefined()
    expect(res).toHaveLength(2)
  })

  it('engenheiro supervisor pode filtrar por um engenheiro específico caso deseje', async () => {
    const mockGetFullList = vi
      .fn()
      .mockResolvedValueOnce([
        { id: 'hom_2', engenheiro: 'usr_engenheiro_2', cliente_nome: 'Cliente B' },
      ])

    vi.mocked(pb.collection).mockReturnValue({
      getFullList: mockGetFullList,
    } as any)

    const res = await HomologacaoService.getHomologacoes({
      engenheiroId: 'usr_engenheiro_2',
      isAdmin: false,
      podeSupervisionar: true,
    })

    expect(mockGetFullList).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: 'engenheiro = "usr_engenheiro_2"',
      }),
    )
    expect(res).toHaveLength(1)
  })

  it('admin lista todos sem filtro de engenheiro', async () => {
    const mockGetFullList = vi.fn().mockResolvedValueOnce([
      { id: 'hom_1', engenheiro: 'usr_engenheiro_1' },
      { id: 'hom_2', engenheiro: 'usr_engenheiro_2' },
    ])

    vi.mocked(pb.collection).mockReturnValue({
      getFullList: mockGetFullList,
    } as any)

    const res = await HomologacaoService.getHomologacoes({
      isAdmin: true,
    })

    const callArgs = mockGetFullList.mock.calls[0][0]
    expect(callArgs.filter).toBeUndefined()
    expect(res).toHaveLength(2)
  })
})
