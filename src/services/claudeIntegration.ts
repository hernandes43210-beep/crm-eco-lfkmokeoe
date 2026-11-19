// Serviço de integração Claude (Anthropic) — espelha geminiIntegration.ts
// A chave fica apenas no backend (integracoes_config chave='claude' > env ANTHROPIC_API_KEY).

import { pb } from '@/lib/pocketbase/client'

export interface ClaudeStatusResponse {
  configured: boolean
  source: 'database' | 'env' | 'none'
  masked_key: string | null
  settings_id: string
  model_default: string
  ultimo_teste_status: string
  ultimo_teste_mensagem: string
  ultimo_teste_em: string
}

export interface SaveClaudeSettingsPayload {
  api_key: string
}

export interface SaveClaudeSettingsResponse {
  success: boolean
  message: string
  configured: boolean
  source: string
  masked_key: string | null
}

export interface TestClaudeResponse {
  success: boolean
  status: string
  message: string
  http_status?: number
  duration_ms?: number
}

export interface ClaudeChatResponse {
  success: boolean
  texto?: string
  model?: string
  duration_ms?: number
  error?: string
  message?: string
}

export const CLAUDE_MODELO_PADRAO = 'claude-sonnet-4-5'

export const ClaudeIntegrationService = {
  /** Status da integração (se há chave configurada, origem, máscara) */
  async getStatus(): Promise<ClaudeStatusResponse> {
    return pb.send('/backend/v1/integrations/claude/status', { method: 'GET' })
  },

  /** Salva a chave da API da Anthropic (Admin only, validado no backend) */
  async saveSettings(payload: SaveClaudeSettingsPayload): Promise<SaveClaudeSettingsResponse> {
    return pb.send('/backend/v1/integrations/claude/settings', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /** Teste real: o backend chama a API de Mensagens da Anthropic com uma mensagem mínima */
  async testConnection(apiKeyParaTestar?: string): Promise<TestClaudeResponse> {
    return pb.send('/backend/v1/integrations/claude/test', {
      method: 'POST',
      body: JSON.stringify(apiKeyParaTestar ? { api_key: apiKeyParaTestar } : {}),
    })
  },

  /** Envia um prompt à Claude via proxy backend (a chave nunca vai exposta ao frontend) */
  async chat(
    prompt: string,
    options?: { system?: string; max_tokens?: number; model?: string },
  ): Promise<ClaudeChatResponse> {
    return pb.send('/backend/v1/integrations/claude/chat', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        system: options?.system,
        max_tokens: options?.max_tokens,
        model: options?.model ?? CLAUDE_MODELO_PADRAO,
      }),
    })
  },
}
