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
  observacoes_etapas?: any[]
}

export interface AnexarArquivoEngenhariaPayload {
  homologacaoId: string
  categoria: string
  file: File
  titulo?: string
  descricao?: string
  etapaOrigem?: HomologacaoStatus
}

export interface AnexarArquivoEngenhariaResponse {
  success: boolean
  message: string
  arquivo: {
    id: string
    titulo: string
    categoria: string
    nome_original: string
    arquivo: string
    tamanho_bytes: number
    created: string
  }
}

export const CATEGORIAS_ARQUIVOS_ENGENHARIA: Array<{
  key: string
  label: string
  descricao: string
}> = [
  {
    key: 'projeto_eletrico',
    label: 'Projeto Elétrico & Diagramas',
    descricao: 'Diagrama unifilar, trifilar, memorial técnico descritivo',
  },
  {
    key: 'plantas',
    label: 'Plantas Técnicas',
    descricao: 'Planta de locação, cobertura, estrutura e civil',
  },
  {
    key: 'processo_energisa',
    label: 'Processo da Energisa',
    descricao: 'Formulários de solicitação de acesso, protocolos e comprovantes',
  },
  {
    key: 'parecer_acesso',
    label: 'Parecer de Acesso / Resposta',
    descricao: 'Documento oficial emitido pela Energisa com aprovação/ressalvas',
  },
  {
    key: 'relatorio_vistoria',
    label: 'Relatório & Solicitação de Vistoria',
    descricao: 'Protocolo de solicitação ou laudo fotográfico pós-obra',
  },
  {
    key: 'art_documento',
    label: 'ART Registrada / Comprovantes',
    descricao: 'Anotação de Responsabilidade Técnica e certidões do CREA/CFT',
  },
  {
    key: 'outros',
    label: 'Outros Documentos de Engenharia',
    descricao: 'Demais arquivos relevantes do processo',
  },
]

export const SEQUENCIA_ETAPAS_HOMOLOGACAO: Array<{
  id: HomologacaoStatus
  nome: string
  acaoBotao: string
  descricaoAcao: string
  proximaEtapa?: HomologacaoStatus
}> = [
  {
    id: 'novo_cliente',
    nome: 'Novo Cliente',
    acaoBotao: 'Iniciar Projeto',
    descricaoAcao: 'Assumir a elaboração do projeto técnico do sistema solar',
    proximaEtapa: 'em_projeto',
  },
  {
    id: 'em_projeto',
    nome: 'Em Projeto',
    acaoBotao: 'Enviar para Homologação',
    descricaoAcao: 'Submeter protocolo de solicitação de acesso junto à Energisa',
    proximaEtapa: 'homologacao',
  },
  {
    id: 'homologacao',
    nome: 'Homologação',
    acaoBotao: 'Registrar Resposta da Energisa',
    descricaoAcao: 'Inserir parecer emitido pela concessionária (aprovação ou pendências)',
    proximaEtapa: 'resposta_energisa',
  },
  {
    id: 'resposta_energisa',
    nome: 'Resposta da Energisa',
    acaoBotao: 'Liberar para Vistoria',
    descricaoAcao: 'Validar obra concluída e autorizar solicitação de vistoria',
    proximaEtapa: 'liberado_vistoria',
  },
  {
    id: 'liberado_vistoria',
    nome: 'Liberado para Vistoria',
    acaoBotao: 'Solicitar Vistoria',
    descricaoAcao: 'Registrar protocolo de agendamento de vistoria técnica',
    proximaEtapa: 'vistoria_solicitada',
  },
  {
    id: 'vistoria_solicitada',
    nome: 'Vistoria Solicitada',
    acaoBotao: 'Marcar como Entregue',
    descricaoAcao: 'Confirmar troca de medidor, ligação e homologação final concluída',
    proximaEtapa: 'entregue',
  },
  {
    id: 'entregue',
    nome: 'Entregue',
    acaoBotao: 'Processo Concluído',
    descricaoAcao: 'Sistema homologado, medidor bidirecional ativo e cliente gerando energia',
  },
]

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
   * Para engenheiro (não admin), aplica filtro estrito por engenheiro = @request.auth.id
   */
  async getHomologacoes(params?: {
    engenheiroId?: string
    isAdmin?: boolean
    podeSupervisionar?: boolean
  }): Promise<HomologacaoLead[]> {
    try {
      const options: { sort: string; requestKey: null; filter?: string; expand?: string } = {
        sort: '-created',
        requestKey: null,
        expand: 'engenheiro,vendedor,dossie',
      }

      // Se for Admin/CEO ou Engenheiro Supervisor com visão de todos (sem engenheiroId específico),
      // lista todas as homologações liberadas pelo backend RLS.
      // Caso contrário, filtra pelo ID do engenheiro responsável.
      if (params?.isAdmin || params?.podeSupervisionar) {
        if (params.engenheiroId) {
          options.filter = `engenheiro = "${params.engenheiroId}"`
        }
      } else if (params?.engenheiroId) {
        options.filter = `engenheiro = "${params.engenheiroId}"`
      } else if (pb.authStore.model?.id) {
        options.filter = `engenheiro = "${pb.authStore.model.id}"`
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
   * Movimenta o card entre as 7 colunas do Kanban e opcionalmente registra observação e dados da etapa
   */
  async moverStatus(
    homologacaoId: string,
    status: HomologacaoStatus,
    observacao?: string,
    dadosEtapa?: {
      energisa_resposta?: string
      energisa_resposta_data?: string
      vistoria_data?: string
      vistoria_observacao?: string
      [key: string]: unknown
    },
  ): Promise<MoverStatusResponse> {
    return await pb.send<MoverStatusResponse>('/backend/v1/homologacao/mover-status', {
      method: 'POST',
      body: {
        homologacaoId,
        status,
        observacao,
        dadosEtapa,
      },
    })
  },

  /**
   * Anexa arquivos do processo de engenharia (projetos, plantas, processo Energisa, pareceres)
   */
  async anexarArquivoProcesso(
    payload: AnexarArquivoEngenhariaPayload,
  ): Promise<AnexarArquivoEngenhariaResponse> {
    const formData = new FormData()
    formData.append('homologacaoId', payload.homologacaoId)
    formData.append('categoria', payload.categoria)
    formData.append('arquivo', payload.file)
    if (payload.titulo) formData.append('titulo', payload.titulo)
    if (payload.descricao) formData.append('descricao', payload.descricao)
    if (payload.etapaOrigem) formData.append('etapa_origem', payload.etapaOrigem)

    return await pb.send<AnexarArquivoEngenhariaResponse>(
      '/backend/v1/homologacao/anexar-arquivo',
      {
        method: 'POST',
        body: formData,
      },
    )
  },

  /**
   * Busca arquivos de engenharia de uma homologação
   */
  async getArquivosByHomologacao(homologacaoId: string): Promise<any[]> {
    try {
      return await pb.collection('arquivos_engenharia').getFullList({
        filter: `homologacao = "${homologacaoId}"`,
        sort: '-created',
        expand: 'criado_por',
        requestKey: null,
      })
    } catch (err) {
      console.warn('Erro ao buscar arquivos de engenharia:', err)
      return []
    }
  },

  /**
   * Exclui um arquivo do processo de engenharia
   */
  async deleteArquivoProcesso(arquivoId: string): Promise<boolean> {
    try {
      return await pb.collection('arquivos_engenharia').delete(arquivoId)
    } catch (err) {
      console.error('Erro ao excluir arquivo de engenharia:', err)
      return false
    }
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

  /**
   * Obtém a URL de download de um arquivo de engenharia
   */
  getArquivoEngenhariaUrl(record: any): string {
    if (!record || !record.arquivo) return ''
    return pb.files.getURL(record, record.arquivo)
  },
}
