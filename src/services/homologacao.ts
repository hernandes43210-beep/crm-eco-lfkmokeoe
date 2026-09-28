import pb from '@/lib/pocketbase/client'
import type { HomologacaoLead, HomologacaoStatus } from '@/types/crm'

export interface EnviarArtResponse {
  success: boolean
  message: string
  homologacao_id: string
  art_status: string
  art_arquivo?: string
  art_enviada_em?: string
  emails_enviados?: number
}

export interface MarcarArtPagaResponse {
  success: boolean
  message: string
  homologacao_id: string
  art_status: string
  art_paga_em?: string
}

export interface MoverStatusResponse {
  success: boolean
  message: string
  homologacao_id: string
  status: HomologacaoStatus
}

export const COLUNAS_HOMOLOGACAO: Array<{
  id: HomologacaoStatus
  titulo: string
  descricao: string
  cor: string
  badgeClass: string
}> = [
  {
    id: 'novo_cliente',
    titulo: 'Novo Cliente',
    descricao: 'Dossiê recém-enviado pelo comercial',
    cor: '#3B82F6',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    id: 'em_projeto',
    titulo: 'Em Projeto',
    descricao: 'Elaboração técnica do diagrama e memorial',
    cor: '#6366F1',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  {
    id: 'homologacao',
    titulo: 'Homologação',
    descricao: 'Protocolo de acesso aberto na Energisa',
    cor: '#8B5CF6',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    id: 'resposta_energisa',
    titulo: 'Resposta da Energisa',
    descricao: 'Parecer de acesso emitido pela concessionária',
    cor: '#F59E0B',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  {
    id: 'liberado_vistoria',
    titulo: 'Liberado para Vistoria',
    descricao: 'Instalação pronta para agendamento de vistoria',
    cor: '#10B981',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    id: 'vistoria_solicitada',
    titulo: 'Vistoria Solicitada',
    descricao: 'Pedido de vistoria formalizado junto à concessionária',
    cor: '#06B6D4',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  },
  {
    id: 'entregue',
    titulo: 'Entregue',
    descricao: 'Troca de medidor e homologação concluída',
    cor: '#0B7A5B',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-200',
  },
]

export const HomologacaoService = {
  /**
   * Busca todas as homologações visíveis para o usuário autenticado
   */
  async getHomologacoes(params?: {
    engenheiroId?: string
    isAdmin?: boolean
  }): Promise<HomologacaoLead[]> {
    try {
      const options: { sort: string; requestKey: null; filter?: string; expand?: string } = {
        sort: '-created',
        requestKey: null,
        expand: 'engenheiro,vendedor,dossie',
      }

      if (params?.engenheiroId && !params?.isAdmin) {
        options.filter = `engenheiro = "${params.engenheiroId}"`
      }

      return await pb.collection('homologacoes').getFullList<HomologacaoLead>(options)
    } catch (err) {
      console.error('Erro ao buscar homologações:', err)
      return []
    }
  },

  /**
   * Busca a homologação vinculada a um lead específico
   */
  async getHomologacaoByLead(leadId: string): Promise<HomologacaoLead | null> {
    try {
      const records = await pb.collection('homologacoes').getList<HomologacaoLead>(1, 1, {
        filter: `lead = "${leadId}"`,
        sort: '-created',
        requestKey: null,
        expand: 'engenheiro,vendedor,dossie',
      })
      return records.items[0] || null
    } catch (err) {
      console.warn('Nenhuma homologação encontrada para o lead:', err)
      return null
    }
  },

  /**
   * Envia o PDF da ART para pagamento disparando notificação e e-mail
   */
  async enviarArt(
    homologacaoId: string,
    artFile: File,
    observacao?: string,
  ): Promise<EnviarArtResponse> {
    const formData = new FormData()
    formData.append('homologacaoId', homologacaoId)
    formData.append('art_arquivo', artFile)
    if (observacao) {
      formData.append('observacao', observacao)
    }

    return await pb.send<EnviarArtResponse>('/backend/v1/homologacao/enviar-art', {
      method: 'POST',
      body: formData,
    })
  },

  /**
   * Vendedor ou Admin confirma o pagamento da taxa da ART
   */
  async marcarArtPaga(homologacaoId: string, observacao?: string): Promise<MarcarArtPagaResponse> {
    return await pb.send<MarcarArtPagaResponse>('/backend/v1/homologacao/marcar-art-paga', {
      method: 'POST',
      body: {
        homologacaoId,
        observacao,
      },
    })
  },

  /**
   * Movimenta o card entre as 7 colunas do Kanban
   */
  async moverStatus(
    homologacaoId: string,
    status: HomologacaoStatus,
  ): Promise<MoverStatusResponse> {
    return await pb.send<MoverStatusResponse>('/backend/v1/homologacao/mover-status', {
      method: 'POST',
      body: {
        homologacaoId,
        status,
      },
    })
  },

  /**
   * Marca a homologação como visualizada pelo engenheiro
   */
  async marcarComoVisualizada(homologacaoId: string): Promise<HomologacaoLead> {
    return await pb.collection('homologacoes').update<HomologacaoLead>(homologacaoId, {
      visualizado_em: new Date().toISOString(),
    })
  },

  /**
   * Obtém a URL de download do PDF da ART
   */
  getArtDownloadUrl(homologacao: HomologacaoLead): string {
    if (!homologacao || !homologacao.art_arquivo) return ''
    return pb.files.getURL(homologacao, homologacao.art_arquivo)
  },
}
