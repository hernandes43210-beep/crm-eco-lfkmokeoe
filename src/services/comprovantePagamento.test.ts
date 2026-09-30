import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HomologacaoService } from './homologacao'
import pb from '@/lib/pocketbase/client'

vi.mock('@/lib/pocketbase/client', () => {
  return {
    default: {
      collection: vi.fn(),
      send: vi.fn(),
      files: {
        getURL: vi.fn(
          (record: any, filename: string) =>
            `https://test.skip.dev/api/files/${record.collectionId || 'hom'}/${record.id}/${filename}`,
        ),
      },
      authStore: {
        model: { id: 'usr_admin_1', role: 'Admin' },
      },
    },
  }
})

describe('HomologacaoService - Comprovantes de Pagamento (ART e Projeto)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('anexarComprovante envia requisição multipart para /backend/v1/homologacao/anexar-comprovante', async () => {
    const mockSend = vi.fn().mockResolvedValueOnce({
      success: true,
      message: 'Comprovante de pagamento da ART anexado com sucesso!',
      homologacao_id: 'hom_123',
      tipo: 'art',
      art_status: 'paga',
      comprovante_art_arquivo: 'art_comprovante.pdf',
    })

    vi.mocked(pb.send).mockImplementation(mockSend as any)

    const fakeFile = new File(['fake content'], 'comprovante_art.pdf', {
      type: 'application/pdf',
    })

    const res = await HomologacaoService.anexarComprovante({
      homologacaoId: 'hom_123',
      tipo: 'art',
      file: fakeFile,
      observacao: 'PIX pago pelo cliente',
    })

    expect(mockSend).toHaveBeenCalledTimes(1)
    const [path, options] = mockSend.mock.calls[0]
    expect(path).toBe('/backend/v1/homologacao/anexar-comprovante')
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    expect(res.success).toBe(true)
    expect(res.art_status).toBe('paga')
  })

  it('anexarComprovante suporta tipo "projeto"', async () => {
    const mockSend = vi.fn().mockResolvedValueOnce({
      success: true,
      message: 'Comprovante de pagamento do Projeto anexado com sucesso!',
      homologacao_id: 'hom_123',
      tipo: 'projeto',
      projeto_pago: true,
      comprovante_projeto_arquivo: 'projeto_comprovante.png',
    })

    vi.mocked(pb.send).mockImplementation(mockSend as any)

    const fakeFile = new File(['fake-png'], 'recibo_projeto.png', {
      type: 'image/png',
    })

    const res = await HomologacaoService.anexarComprovante({
      homologacaoId: 'hom_123',
      tipo: 'projeto',
      file: fakeFile,
    })

    expect(res.tipo).toBe('projeto')
    expect(res.projeto_pago).toBe(true)
  })

  it('getComprovanteArtUrl e getComprovanteProjetoUrl geram URLs válidas', () => {
    const fakeHomologacao: any = {
      id: 'hom_abc',
      collectionId: 'homologacoes',
      comprovante_art_arquivo: 'comprovante_art.pdf',
      comprovante_projeto_arquivo: 'comprovante_proj.jpg',
    }

    const artUrl = HomologacaoService.getComprovanteArtUrl(fakeHomologacao)
    expect(artUrl).toContain('comprovante_art.pdf')

    const projUrl = HomologacaoService.getComprovanteProjetoUrl(fakeHomologacao)
    expect(projUrl).toContain('comprovante_proj.jpg')

    expect(HomologacaoService.getComprovanteArtUrl({} as any)).toBe('')
    expect(HomologacaoService.getComprovanteProjetoUrl({} as any)).toBe('')
  })
})
