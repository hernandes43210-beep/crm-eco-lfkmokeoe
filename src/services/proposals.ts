import pb from '@/lib/pocketbase/client'
import type { Proposta, PublicProposta } from '@/types/crm'

export interface CreatePropostaPayload {
  lead: string
  kit?: string
  criado_por?: string
  kit_nome: string
  kit_potencia_kw?: number
  kit_fabricante?: string
  custo: number
  margem: number
  preco_venda: number
  validade_dias: number
  data_validade: string
  condicoes_pagamento?: string
  observacoes?: string
  status: 'Rascunho' | 'Enviada' | 'Aceita' | 'Recusada'
  token_publico: string
}

export interface GetPropostasParams {
  page?: number
  perPage?: number
  leadId?: string
  status?: string
  sort?: string
}

function generateRandomToken(length = 32): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const ProposalsService = {
  generateToken(): string {
    return generateRandomToken(32)
  },

  getPublicUrl(token: string): string {
    return `${window.location.origin}/proposta/${token}`
  },

  async getAllPropostas(params: GetPropostasParams = {}) {
    const { page = 1, perPage = 50, leadId, status, sort = '-created' } = params
    const filters: string[] = []

    if (leadId) {
      filters.push(`lead = "${leadId}"`)
    }
    if (status && status !== 'all') {
      filters.push(`status = "${status}"`)
    }

    return await pb.collection('propostas').getList<Proposta>(page, perPage, {
      filter: filters.length ? filters.join(' && ') : undefined,
      sort,
      expand: 'lead,kit,criado_por',
    })
  },

  async getPropostasByLead(leadId: string) {
    return await pb.collection('propostas').getFullList<Proposta>({
      filter: `lead = "${leadId}"`,
      sort: '-created',
      expand: 'lead,kit,criado_por',
    })
  },

  async getPropostaById(id: string) {
    return await pb.collection('propostas').getOne<Proposta>(id, {
      expand: 'lead,kit,criado_por',
    })
  },

  async createProposta(data: CreatePropostaPayload) {
    return await pb.collection('propostas').create<Proposta>(data, {
      expand: 'lead,kit,criado_por',
    })
  },

  async updateProposta(id: string, data: Partial<Proposta>) {
    return await pb.collection('propostas').update<Proposta>(id, data, {
      expand: 'lead,kit,criado_por',
    })
  },

  async deleteProposta(id: string) {
    return await pb.collection('propostas').delete(id)
  },

  // Consulta pública por token (não exige auth)
  async getPublicProposta(token: string): Promise<PublicProposta> {
    try {
      const cleanToken = encodeURIComponent(token.trim())
      return await pb.send<PublicProposta>(`/backend/v1/propostas/public/${cleanToken}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })
    } catch (err: unknown) {
      if (err && typeof err === 'object') {
        const pbErr = err as {
          response?: { error?: string; message?: string }
          message?: string
          status?: number
        }
        const message = pbErr.response?.error || pbErr.response?.message || pbErr.message
        if (pbErr.status === 404) {
          throw new Error('Proposta não encontrada ou link inválido.')
        }
        if (message) {
          throw new Error(message)
        }
      }
      throw new Error('Erro ao carregar proposta')
    }
  },

  // Aceite público por token (não exige auth)
  async acceptPublicProposta(
    token: string,
    nome?: string,
  ): Promise<{ success: boolean; message: string; status: string; data_aceite: string }> {
    try {
      const cleanToken = encodeURIComponent(token.trim())
      return await pb.send<{
        success: boolean
        message: string
        status: string
        data_aceite: string
      }>(`/backend/v1/propostas/public/${cleanToken}/aceitar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: { nome: (nome || '').trim() },
      })
    } catch (err: unknown) {
      if (err && typeof err === 'object') {
        const pbErr = err as {
          response?: { error?: string; message?: string }
          message?: string
          status?: number
        }
        const message = pbErr.response?.error || pbErr.response?.message || pbErr.message
        if (pbErr.status === 404) {
          throw new Error('Proposta não encontrada.')
        }
        if (message) {
          throw new Error(message)
        }
      }
      throw new Error('Erro ao aceitar proposta')
    }
  },
}
