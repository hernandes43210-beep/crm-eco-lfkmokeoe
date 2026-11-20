// Serviço de integração Claude (Anthropic) — espelha geminiIntegration.ts
// A chave fica apenas no backend (integracoes_config chave='claude' > env ANTHROPIC_API_KEY).
// O modelo é configurável pelo Admin (integracoes_config.dados_extras.modelo).

import pb from '@/lib/pocketbase/client'

export interface ClaudeStatusResponse {
  configured: boolean
  source: 'database' | 'env' | 'none'
  masked_key: string | null
  settings_id: string
  model_default: string
  model_configured: string
  model_effective: string
  modelos_disponiveis?: string[]
  ultimo_teste_status: string
  ultimo_teste_mensagem: string
  ultimo_teste_em: string
}

export interface SaveClaudeSettingsPayload {
  api_key: string
  modelo?: string
}

export interface SaveClaudeSettingsResponse {
  success: boolean
  message: string
  configured: boolean
  source: string
  masked_key: string | null
  modelo?: string
}

export interface TestClaudeResponse {
  success: boolean
  status: string
  message: string
  http_status?: number
  duration_ms?: number
  modelo?: string
  modelos_tentados?: string[]
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

/** Modelos sugeridos no seletor da página Integrações (aceita também valor digitado livremente) */
export const CLAUDE_MODELOS_SUGERIDOS = [
  'claude-sonnet-4-5',
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
]

export const ClaudeIntegrationService = {
  /** Status da integração (se há chave configurada, origem, máscara, modelo efetivo) */
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

  /** Salva apenas o modelo a usar nas chamadas de IA (Admin only, validado no backend) */
  async saveModelo(modelo: string): Promise<SaveClaudeSettingsResponse> {
    // O backend exige api_key: repete a chave salva (o valor nunca transita pelo frontend)
    return pb.send('/backend/v1/integrations/claude/settings', {
      method: 'POST',
      body: JSON.stringify({ api_key: '__MANTER_ATUAL__', modelo }),
    })
  },

  /** Teste real: o backend chama a API de Mensagens da Anthropic com uma mensagem mínima.
   * Em 404 do modelo configurado/padrão, tenta automaticamente os modelos alternativos. */
  async testConnection(apiKeyParaTestar?: string): Promise<TestClaudeResponse> {
    return pb.send('/backend/v1/integrations/claude/test', {
      method: 'POST',
      body: JSON.stringify(apiKeyParaTestar ? { api_key: apiKeyParaTestar } : {}),
    })
  },

  /** Envia um prompt à Claude via proxy backend (a chave nunca vai exposta ao frontend).
   * Sem options.model, o backend usa o modelo salvo pelo Admin (com fallback em cascata). */
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
        model: options?.model,
      }),
    })
  },
}
