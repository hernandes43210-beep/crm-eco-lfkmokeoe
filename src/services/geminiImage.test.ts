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
})
