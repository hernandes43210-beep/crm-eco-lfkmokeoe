import pb from '@/lib/pocketbase/client'
import type { SiteFormSettings, SiteFormLogItem } from '@/types/crm'

export const SiteFormService = {
  // Obter configurações e token do formulário do site
  async getSettings(): Promise<SiteFormSettings> {
    const res = await pb.send<SiteFormSettings>('/backend/v1/integrations/site-form/settings', {
      method: 'GET',
    })
    return res
  },

  // Regenerar token do formulário do site
  async regenerateToken(): Promise<{ success: boolean; message: string; form_token: string }> {
    const res = await pb.send<{ success: boolean; message: string; form_token: string }>(
      '/backend/v1/integrations/site-form/regenerate-token',
      {
        method: 'POST',
      },
    )
    return res
  },

  // Buscar logs recentes de envios do formulário do site
  async getLogs(): Promise<SiteFormLogItem[]> {
    const res = await pb.send<{ logs: SiteFormLogItem[] }>(
      '/backend/v1/integrations/site-form/logs',
      {
        method: 'GET',
      },
    )
    return res.logs || []
  },

  // Retorna a URL base absoluta do endpoint de submissão
  getEndpointUrl(): string {
    const baseUrl = pb.baseURL ? pb.baseURL.replace(/\/$/, '') : window.location.origin
    return `${baseUrl}/backend/v1/integrations/site-form/submit`
  },

  // Constrói a URL completa com o token como query param (útil para webhooks diretos)
  buildUrlWithToken(token: string): string {
    return `${this.getEndpointUrl()}?token=${encodeURIComponent(token)}`
  },
}
