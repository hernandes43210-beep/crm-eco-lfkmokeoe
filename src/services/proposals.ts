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
    const res = await fetch(`/backend/v1/propostas/public/${token}`, {
      headers: {
        Accept: 'application/json',
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Proposta não encontrada' }))
      throw new Error(err.error || 'Erro ao carregar proposta')
    }
    return (await res.json()) as PublicProposta
  },

  // Aceite público por token (não exige auth)
  async acceptPublicProposta(
    token: string,
    nome?: string,
  ): Promise<{ success: boolean; message: string; status: string; data_aceite: string }> {
    const res = await fetch(`/backend/v1/propostas/public/${token}/aceitar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ nome: nome || '' }),
    })
    const data = await res.json().catch(() => ({ error: 'Falha na requisição' }))
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao aceitar proposta')
    }
    return data
  },
}
