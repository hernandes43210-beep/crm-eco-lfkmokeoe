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
    const rawToken = token.trim()
    const cleanToken = encodeURIComponent(rawToken)

    // 1. Tentar primeiro o endpoint customizado do backend
    try {
      return await pb.send<PublicProposta>(`/backend/v1/propostas/public/${cleanToken}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })
    } catch (err: unknown) {
      console.warn(
        'Endpoint customizado falhou, tentando fallback direto na coleção propostas:',
        err,
      )

      // 2. Fallback direto via SDK na collection "propostas" filtrando por token_publico
      try {
        const found = await pb
          .collection('propostas')
          .getFirstListItem<Proposta>(`token_publico = "${rawToken}"`, {
            expand: 'lead,kit,criado_por',
          })

        // Mapear Proposta para PublicProposta
        const expandedLead = found.expand?.lead as
          | {
              id?: string
              nome?: string
              email?: string
              telefone?: string
              cidade?: string
              estado?: string
              endereco?: string
              consumo_mensal_kwh?: number
              status?: string
            }
          | undefined

        const expandedKit = found.expand?.kit as
          | {
              id?: string
              nome?: string
              fabricante?: string
              potencia_kw?: number
              categoria?: string
              descricao?: string
            }
          | undefined

        const expandedVendedor = found.expand?.criado_por as
          | {
              id?: string
              name?: string
              email?: string
            }
          | undefined

        // Fallback: tentar carregar fotos_obra se disponível
        let fallbackFotos: Array<{ id: string; foto: string; legenda?: string; url?: string }> = []
        try {
          const leadId = found.lead
          let records: any[] = []
          if (leadId) {
            const res = await pb.collection('lead_photos').getList(1, 4, {
              filter: `lead = "${leadId}"`,
              sort: 'ordem,created',
            })
            records = res.items
          }
          if (records.length === 0) {
            const res = await pb.collection('lead_photos').getList(1, 4, {
              filter: `foto != ""`,
              sort: '-created',
            })
            records = res.items
          }
          if (records.length > 0) {
            fallbackFotos = records.map((p) => ({
              id: p.id,
              foto: p.foto,
              legenda: p.legenda,
              url: pb.files.getURL(p, p.foto, { thumb: '800x600' }),
            }))
          }
        } catch {
          /* intentionally ignored */
        }

        return {
          id: found.id,
          token_publico: found.token_publico,
          status: found.status,
          kit_nome: found.kit_nome,
          kit_potencia_kw: found.kit_potencia_kw,
          kit_fabricante: found.kit_fabricante,
          custo: found.custo,
          margem: found.margem,
          preco_venda: found.preco_venda,
          validade_dias: found.validade_dias,
          data_validade: found.data_validade,
          condicoes_pagamento: found.condicoes_pagamento,
          observacoes: found.observacoes,
          data_aceite: found.data_aceite,
          aceito_por_nome: found.aceito_por_nome,
          visualizacoes_count: found.visualizacoes_count,
          primeira_visualizacao: found.primeira_visualizacao,
          ultima_visualizacao: found.ultima_visualizacao,
          created: found.created,
          lead: expandedLead
            ? {
                id: expandedLead.id,
                nome: expandedLead.nome || '',
                email: expandedLead.email || '',
                telefone: expandedLead.telefone || '',
                cidade: expandedLead.cidade,
                estado: expandedLead.estado,
                endereco: expandedLead.endereco,
                consumo_mensal_kwh: expandedLead.consumo_mensal_kwh,
                status: expandedLead.status,
              }
            : null,
          kit: expandedKit
            ? {
                id: expandedKit.id,
                nome: expandedKit.nome,
                fabricante: expandedKit.fabricante,
                potencia_kw: expandedKit.potencia_kw,
                categoria: expandedKit.categoria,
                descricao: expandedKit.descricao,
                string_box: (expandedKit as any).string_box || undefined,
              }
            : null,
          vendedor: expandedVendedor
            ? {
                name: expandedVendedor.name,
                email: expandedVendedor.email,
              }
            : null,
          fotos_obra: fallbackFotos,
        }
      } catch (fallbackErr: unknown) {
        // Se ambos falharem, tratar mensagem de erro amigável
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
        throw new Error('Erro ao carregar proposta: proposta não encontrada ou link expirado.')
      }
    }
  },

  // Aceite público por token (não exige auth)
  async acceptPublicProposta(
    token: string,
    nome?: string,
  ): Promise<{ success: boolean; message: string; status: string; data_aceite: string }> {
    const rawToken = token.trim()
    const cleanToken = encodeURIComponent(rawToken)
    const clientName = (nome || '').trim()

    try {
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
        body: { nome: clientName },
      })
    } catch (err: unknown) {
      console.warn('Endpoint customizado de aceite falhou, tentando fallback direto:', err)

      try {
        const found = await pb
          .collection('propostas')
          .getFirstListItem<Proposta>(`token_publico = "${rawToken}"`)

        const now = new Date()
        const nowIso = now.toISOString()
        const nowFormatted = nowIso.replace('T', ' ').substring(0, 19) + 'Z'

        const updated = await pb.collection('propostas').update<Proposta>(found.id, {
          status: 'Aceita',
          data_aceite: nowFormatted,
          aceito_por_nome: clientName || undefined,
        })

        // Tentar atualizar lead se permissões permitirem
        if (found.lead) {
          try {
            await pb.collection('leads').update(found.lead, {
              status: 'Fechado Ganho',
              pr_assinada_ganho: true,
              pr_post_encerramento: nowIso.substring(0, 10),
            })
          } catch {
            /* intentionally ignored */
          }
        }

        return {
          success: true,
          message: 'Proposta aceita com sucesso!',
          status: updated.status,
          data_aceite: updated.data_aceite || nowFormatted,
        }
      } catch (fallbackErr: unknown) {
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
        throw new Error('Erro ao aceitar proposta: verifique se o link ainda é válido.')
      }
    }
  },
}
