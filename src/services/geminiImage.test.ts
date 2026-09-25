import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GeminiImageService, base64ToFile } from './geminiImage'
import pb from '@/lib/pocketbase/client'

describe('GeminiImageService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('converte string base64 pura para objeto File corretamente', () => {
    const rawBase64 = 'SGVsbG8gV29ybGQ=' // "Hello World"
    const file = base64ToFile(rawBase64, 'teste.jpg', 'image/jpeg')

    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('teste.jpg')
    expect(file.type).toBe('image/jpeg')
    expect(file.size).toBe(11)
  })

  it('converte dataURL com prefixo MIME para objeto File corretamente', () => {
    const dataUrl = 'data:image/jpeg;base64,SGVsbG8gV29ybGQ='
    const file = base64ToFile(dataUrl, 'foto.jpg')

    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('foto.jpg')
    expect(file.type).toBe('image/jpeg')
    expect(file.size).toBe(11)
  })

  it('exibe erro claro quando a chave GEMINI_API_KEY não estiver configurada', async () => {
    // Simula token presente no authStore
    pb.authStore.save('mock-token-abc', { id: 'user123', email: 'vendedor@ecosolar.com' } as any)

    // Mock fetch respondendo status 400 com erro específico da falta de chave
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error:
          'Geração de imagens indisponível: a chave da API do Gemini não está configurada. Acesse o menu Integrações do CRM para configurá-la.',
        code: 'GEMINI_API_KEY_NOT_CONFIGURED',
      }),
    } as any)

    await expect(
      GeminiImageService.generateImage({
        tipo: 'residencial',
      }),
    ).rejects.toThrow(
      'Geração de imagens indisponível: a chave da API do Gemini não está configurada. Acesse o menu Integrações do CRM para configurá-la.',
    )
  })

  it('solicita login quando o token de autenticação estiver ausente', async () => {
    pb.authStore.clear()

    await expect(
      GeminiImageService.generateImage({
        tipo: 'carport',
      }),
    ).rejects.toThrow('Sessão expirada. Faça login novamente para gerar imagens.')
  })

  it('gera URL de arquivo do PocketBase usando pb.files.getURL', () => {
    const mockRecord: any = {
      id: 'rec123',
      collectionId: 'fotos_institucionais',
      arquivo: 'foto_123.jpg',
    }

    const url = GeminiImageService.getFotoUrl(mockRecord, '400x300')
    expect(url).toContain('rec123')
    expect(url).toContain('foto_123.jpg')
  })

  it('retorna dados da imagem gerada com sucesso quando a API responde 200', async () => {
    pb.authStore.save('mock-token-abc', { id: 'user123', email: 'vendedor@ecosolar.com' } as any)

    const mockResponse = {
      success: true,
      model_used: 'gemini-2.5-flash-image',
      tipo: 'residencial',
      titulo_sugerido: 'Instalação Solar em Telhado Residencial Brasileiro',
      legenda_sugerida: 'Telhado residencial com painéis solares de alta performance',
      prompt_usado: 'Ultra-realistic...',
      mime_type: 'image/jpeg',
      image_base64: 'dGVzdGU=',
      data_url: 'data:image/jpeg;base64,dGVzdGU=',
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as any)

    const result = await GeminiImageService.generateImage({
      tipo: 'residencial',
      detalhe: 'vista frontal',
    })

    expect(result.success).toBe(true)
    expect(result.model_used).toBe('gemini-2.5-flash-image')
    expect(result.image_base64).toBe('dGVzdGU=')
    expect(result.data_url).toContain('data:image/jpeg;base64,dGVzdGU=')
  })

  it('propaga mensagem de erro amigável quando o modelo não estiver disponível (404)', async () => {
    pb.authStore.save('mock-token-abc', { id: 'user123', email: 'vendedor@ecosolar.com' } as any)

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error:
          'O modelo de geração de imagem (gemini-2.5-flash-image) não está disponível para esta chave de API no Google AI Studio. Verifique se o recurso de geração de imagem está liberado em sua conta do Google AI Studio.',
        status: 404,
      }),
    } as any)

    await expect(
      GeminiImageService.generateImage({
        tipo: 'comercial',
      }),
    ).rejects.toThrow('não está disponível para esta chave de API')
  })
})
