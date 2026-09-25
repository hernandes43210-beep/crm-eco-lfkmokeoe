import pb from '@/lib/pocketbase/client'

export interface GeminiStatusResponse {
  configured: boolean
  source: 'database' | 'env' | 'none'
  masked_key: string | null
  settings_id?: string
  model_default?: string
  ultimo_teste_status?: string
  ultimo_teste_mensagem?: string
  ultimo_teste_em?: string
}

export interface SaveGeminiSettingsPayload {
  api_key: string
}

export interface SaveGeminiSettingsResponse {
  success: boolean
  message: string
  configured: boolean
  source: string
  masked_key: string | null
}

export interface TestGeminiResponse {
  success: boolean
  status: string
  message: string
  http_status?: number
  duration_ms?: number
  raw_error?: string
}

export const GeminiIntegrationService = {
  /**
   * Obtém o status da integração Gemini
   */
  async getStatus(): Promise<GeminiStatusResponse> {
    const token = pb.authStore.token
    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente.')
    }

    const response = await fetch(`${pb.baseUrl}/backend/v1/integrations/gemini/status`, {
      method: 'GET',
      headers: {
        Authorization: token,
      },
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || 'Erro ao consultar status da integração Gemini.')
    }

    return await response.json()
  },

  /**
   * Salva a chave da API do Gemini com segurança no backend (Admin only)
   */
  async saveSettings(payload: SaveGeminiSettingsPayload): Promise<SaveGeminiSettingsResponse> {
    const token = pb.authStore.token
    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente.')
    }

    const response = await fetch(`${pb.baseUrl}/backend/v1/integrations/gemini/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.error || 'Falha ao salvar chave da API do Gemini.')
    }

    return data as SaveGeminiSettingsResponse
  },

  /**
   * Testa a chave da API do Gemini contra o Google AI Studio (Admin only)
   * Se apiKey informada for vazia, testa a chave já persistida no backend.
   */
  async testConnection(apiKey?: string): Promise<TestGeminiResponse> {
    const token = pb.authStore.token
    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente.')
    }

    const response = await fetch(`${pb.baseUrl}/backend/v1/integrations/gemini/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({
        api_key: apiKey ? apiKey.trim() : undefined,
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Falha ao testar conexão com o Gemini.')
    }

    return data as TestGeminiResponse
  },
}
