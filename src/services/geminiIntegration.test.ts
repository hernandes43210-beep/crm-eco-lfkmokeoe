import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GeminiIntegrationService } from './geminiIntegration'
import pb from '@/lib/pocketbase/client'

describe('GeminiIntegrationService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    pb.authStore.save('test-token', { id: 'admin1', role: 'Admin' } as never)
  })

  it('getStatus faz chamada GET autenticada e retorna status correto', async () => {
    const mockData = {
      configured: true,
      source: 'database',
      masked_key: 'AIza••••••••ABCD',
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response)

    const res = await GeminiIntegrationService.getStatus()
    expect(res.configured).toBe(true)
    expect(res.masked_key).toBe('AIza••••••••ABCD')
    expect(res.source).toBe('database')
  })

  it('saveSettings envia a api_key e retorna a chave mascarada', async () => {
    const mockResponse = {
      success: true,
      message: 'Chave da API do Gemini salva com sucesso no backend!',
      configured: true,
      source: 'database',
      masked_key: 'AIza••••••••WXYZ',
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const res = await GeminiIntegrationService.saveSettings({
      api_key: 'AIzaSyA_FakeApiKeyForTestWXYZ',
    })
    expect(res.success).toBe(true)
    expect(res.configured).toBe(true)
    expect(res.masked_key).toBe('AIza••••••••WXYZ')
  })

  it('testConnection retorna resultado em português', async () => {
    const mockTestRes = {
      success: true,
      status: 'sucesso',
      message: 'Chave validada com sucesso com a API do Google Gemini!',
      http_status: 200,
      duration_ms: 120,
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockTestRes,
    } as Response)

    const res = await GeminiIntegrationService.testConnection()
    expect(res.success).toBe(true)
    expect(res.message).toContain('Google Gemini')
  })
})
