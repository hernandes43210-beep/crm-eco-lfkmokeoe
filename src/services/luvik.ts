import pb from '@/lib/pocketbase/client'
import type { LuvikSettings, LuvikLogItem } from '@/types/crm'

export interface WebhookUrls {
  criado: string
  ganho: string
  perdido: string
  generica: string
}

export const LuvikService = {
  // Obter URLs prontas e configurações
  async getSettings(): Promise<LuvikSettings> {
    const res = await pb.send<LuvikSettings>('/backend/v1/integrations/luvik/settings', {
      method: 'GET',
    })
    return res
  },

  // Regenerar token de webhook
  async regenerateToken(): Promise<{ success: boolean; message: string; webhook_token: string }> {
    const res = await pb.send<{ success: boolean; message: string; webhook_token: string }>(
      '/backend/v1/integrations/luvik/regenerate-token',
      {
        method: 'POST',
      },
    )
    return res
  },

  // Buscar logs recentes do webhook Luvik
  async getLogs(): Promise<LuvikLogItem[]> {
    const res = await pb.send<{ logs: LuvikLogItem[] }>('/backend/v1/integrations/luvik/logs', {
      method: 'GET',
    })
    return res.logs || []
  },

  // Constrói as 3 URLs de webhook prontas para colar no Luvik
  buildWebhookUrls(token: string): WebhookUrls {
    const baseUrl = pb.baseURL ? pb.baseURL.replace(/\/$/, '') : window.location.origin
    const endpoint = `${baseUrl}/backend/v1/integrations/luvik/webhook/${token}`

    return {
      criado: `${endpoint}?evento=criado`,
      ganho: `${endpoint}?evento=ganho`,
      perdido: `${endpoint}?evento=perdido`,
      generica: endpoint,
    }
  },
}
