import pb from '@/lib/pocketbase/client'
import type {
  DocumentoLead,
  DocumentoLeadCategoria,
  DocumentoLeadStatusEnvio,
  User,
} from '@/types/crm'

export interface UploadDocumentoPayload {
  leadId: string
  categoria: DocumentoLeadCategoria
  file: File
  userId?: string
}

export interface EnviarEngenheiroResponse {
  success: boolean
  message: string
  total_documentos: number
  engenheiro: {
    id: string
    nome: string
    email?: string
  }
  email_enviado: boolean
  email_erro?: string
  data_envio: string
}

export const CATEGORIAS_DOCUMENTOS: Array<{
  key: DocumentoLeadCategoria
  label: string
  descricao: string
  iconName: string
  exemplos: string
}> = [
  {
    key: 'documentos_pessoais',
    label: 'Documentos Pessoais do Cliente',
    descricao: 'RG, CNH, CPF do titular e comprovante de residência atualizado',
    iconName: 'UserCheck',
    exemplos: 'PDF, JPG ou PNG (frente e verso)',
  },
  {
    key: 'conta_energia',
    label: 'Conta de Energia',
    descricao: 'Fatura de energia elétrica recente (histórico de consumo e padrão)',
    iconName: 'Zap',
    exemplos: 'PDF ou foto nítida com código de barras legível',
  },
  {
    key: 'datasheet_equipamentos',
    label: 'Datasheet dos Equipamentos Utilizados',
    descricao: 'Especificações técnicas dos módulos e inversor(es) cotados',
    iconName: 'Cpu',
    exemplos: 'PDF do fabricante (Sungrow, Huawei, Deye, Canadian, etc.)',
  },
  {
    key: 'procuracao',
    label: 'Procuração Assinada',
    descricao: 'Procuração específica para homologação e acesso à concessionária',
    iconName: 'FileSignature',
    exemplos: 'Documento assinado digitalmente ou digitalizado',
  },
]

export const LeadDocumentosService = {
  /**
   * Busca todos os documentos vinculados a um determinado lead
   */
  async getDocumentosByLead(leadId: string): Promise<DocumentoLead[]> {
    try {
      return await pb.collection('documentos_lead').getFullList<DocumentoLead>({
        filter: `lead = "${leadId}"`,
        sort: '-created',
        expand: 'enviado_por,engenheiro_destino',
        requestKey: null,
      })
    } catch (err) {
      console.error('Erro ao buscar documentos do lead:', err)
      return []
    }
  },

  /**
   * Busca os documentos direcionados a um determinado engenheiro (Meus Documentos Recebidos)
   */
  async getDocumentosByEngenheiro(engenheiroId: string): Promise<DocumentoLead[]> {
    try {
      return await pb.collection('documentos_lead').getFullList<DocumentoLead>({
        filter: `engenheiro_destino = "${engenheiroId}"`,
        sort: '-created',
        expand: 'lead,enviado_por',
        requestKey: null,
      })
    } catch (err) {
      console.error('Erro ao buscar documentos do engenheiro:', err)
      return []
    }
  },

  /**
   * Busca lista de usuários com o papel 'Engenheiro' (ou 'Admin' que pode atuar como responsável)
   */
  async getEngenheiros(): Promise<User[]> {
    try {
      return await pb.collection('users').getFullList<User>({
        filter: "role = 'Engenheiro' || role = 'Admin'",
        sort: 'name,email',
        requestKey: null,
      })
    } catch (err) {
      console.error('Erro ao buscar engenheiros:', err)
      return []
    }
  },

  /**
   * Upload de um documento
   */
  async uploadDocumento(payload: UploadDocumentoPayload): Promise<DocumentoLead> {
    const { leadId, categoria, file, userId } = payload

    const formData = new FormData()
    formData.append('lead', leadId)
    formData.append('categoria', categoria)
    formData.append('arquivo', file)
    formData.append('nome_original', file.name)
    formData.append('tamanho_bytes', String(file.size))
    formData.append('status_envio', 'pendente')
    if (userId) {
      formData.append('enviado_por', userId)
    }

    return await pb.collection('documentos_lead').create<DocumentoLead>(formData, {
      expand: 'enviado_por,engenheiro_destino',
    })
  },

  /**
   * Exclui um documento
   */
  async deleteDocumento(documentoId: string): Promise<boolean> {
    return await pb.collection('documentos_lead').delete(documentoId)
  },

  /**
   * Envia ou reenviar os documentos anexados ao engenheiro responsável
   */
  async enviarAoEngenheiro(params: {
    leadId: string
    engenheiroId: string
    observacao?: string
    isReenvio?: boolean
  }): Promise<EnviarEngenheiroResponse> {
    return await pb.send<EnviarEngenheiroResponse>('/backend/v1/documentos/enviar-engenheiro', {
      method: 'POST',
      body: params,
    })
  },

  /**
   * Marca um documento como visualizado pelo engenheiro
   */
  async marcarComoVisualizado(documentoId: string): Promise<DocumentoLead> {
    return await pb.collection('documentos_lead').update<DocumentoLead>(documentoId, {
      visualizado_em: new Date().toISOString(),
    })
  },

  /**
   * Obtém a URL de download/visualização do arquivo no PocketBase
   */
  getFileUrl(doc: DocumentoLead): string {
    if (!doc || !doc.arquivo) return ''
    return pb.files.getURL(doc, doc.arquivo)
  },

  /**
   * Formata tamanho de bytes para exibição humana (ex: 2.4 MB)
   */
  formatFileSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return 'Tamanho desconhecido'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  },
}
