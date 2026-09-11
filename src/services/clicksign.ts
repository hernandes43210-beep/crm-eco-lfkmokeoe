import { pb } from '@/lib/pocketbase/client'
import { AssinaturaEnvelope, FormalizacaoTipo } from '@/types/crm'

export interface ClicksignStatusResponse {
  configured: boolean
  host: string
  ambiente: 'producao' | 'sandbox'
  masked_token: string | null
}

export interface CreateEnvelopePayload {
  lead_id: string
  documento_id?: string
  tipo_documento: FormalizacaoTipo
  signer_nome: string
  signer_email: string
  signer_cpf?: string
  signer_telefone?: string
  pdf_base64: string
  envelope_nome?: string
}

export interface CreateEnvelopeResponse {
  success: boolean
  envelope_id: string
  document_id: string
  signer_id: string
  status: string
  link_assinatura: string
  record_id: string
  message: string
}

export interface CheckStatusResponse {
  success: boolean
  status: string
  raw_status: string
  link_assinatura: string
  envelope: Record<string, unknown>
}

export const ClicksignService = {
  /**
   * Obtém status da conexão Clicksign no backend
   */
  async getStatus(): Promise<ClicksignStatusResponse> {
    const res = await pb.send('/backend/v1/integrations/clicksign/status', {
      method: 'GET',
    })
    return res as ClicksignStatusResponse
  },

  /**
   * Envia documento para assinatura na Clicksign
   */
  async createEnvelope(payload: CreateEnvelopePayload): Promise<CreateEnvelopeResponse> {
    const res = await pb.send('/backend/v1/integrations/clicksign/create-envelope', {
      method: 'POST',
      body: payload,
    })
    return res as CreateEnvelopeResponse
  },

  /**
   * Consulta status atual de um envelope na Clicksign e sincroniza com o banco local
   */
  async checkStatus(params: {
    record_id?: string
    envelope_id?: string
  }): Promise<CheckStatusResponse> {
    const res = await pb.send('/backend/v1/integrations/clicksign/check-status', {
      method: 'POST',
      body: params,
    })
    return res as CheckStatusResponse
  },

  /**
   * Lista todos os envelopes associados a um Lead
   */
  async listEnvelopesByLead(leadId: string): Promise<AssinaturaEnvelope[]> {
    const list = await pb.collection('assinaturas_envelopes').getFullList<AssinaturaEnvelope>({
      filter: `lead = "${leadId}"`,
      sort: '-created',
      expand: 'lead,documento,criado_por',
    })
    return list
  },

  /**
   * Busca o envelope mais recente para um determinado tipo de documento de um lead
   */
  async getLatestEnvelope(
    leadId: string,
    tipoDocumento: FormalizacaoTipo,
  ): Promise<AssinaturaEnvelope | null> {
    try {
      const list = await pb.collection('assinaturas_envelopes').getList<AssinaturaEnvelope>(1, 1, {
        filter: `lead = "${leadId}" && tipo_documento = "${tipoDocumento}"`,
        sort: '-created',
        expand: 'lead,documento,criado_por',
      })
      return list.items[0] || null
    } catch (_) {
      return null
    }
  },
}
