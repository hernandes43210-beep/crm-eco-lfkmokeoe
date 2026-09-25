import pb from '@/lib/pocketbase/client'
import type { FotoInstitucionalRecord, FotoInstitucionalTipo } from '@/types/crm'

export type GeminiInstalacaoTipo = 'residencial' | 'comercial' | 'carport' | 'rural'

export interface GenerateGeminiImageParams {
  tipo: GeminiInstalacaoTipo
  detalhe?: string
}

export interface GenerateGeminiImageResponse {
  success: boolean
  tipo: GeminiInstalacaoTipo
  titulo_sugerido: string
  legenda_sugerida: string
  prompt_usado: string
  mime_type: string
  image_base64: string
  data_url: string
}

export interface SaveFotoInstitucionalPayload {
  titulo: string
  tipo: FotoInstitucionalTipo
  legenda?: string
  descricao?: string
  origem?: string
  prompt_usado?: string
  arquivoBase64?: string
  file?: File
}

/**
 * Converte string base64 pura ou dataURL em objeto File pronto para upload no PocketBase
 */
export function base64ToFile(
  base64OrDataUrl: string,
  filename: string,
  mimeType = 'image/jpeg',
): File {
  let cleanBase64 = base64OrDataUrl
  let resolvedMime = mimeType

  if (base64OrDataUrl.startsWith('data:')) {
    const parts = base64OrDataUrl.split(',')
    const match = parts[0].match(/:(.*?);/)
    if (match) {
      resolvedMime = match[1]
    }
    cleanBase64 = parts[1] || ''
  }

  const binaryString = atob(cleanBase64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  const blob = new Blob([bytes], { type: resolvedMime })
  return new File([blob], filename, { type: resolvedMime })
}

export const GeminiImageService = {
  /**
   * Chama o endpoint backend seguro /backend/v1/gemini/generate-image
   * A chave GEMINI_API_KEY fica exclusivamente no servidor.
   */
  async generateImage(params: GenerateGeminiImageParams): Promise<GenerateGeminiImageResponse> {
    const token = pb.authStore.token
    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente para gerar imagens.')
    }

    const response = await fetch(`${pb.baseUrl}/backend/v1/gemini/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify(params),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const msg =
        data.error ||
        data.message ||
        (response.status === 400
          ? 'Geração de imagens indisponível: a chave GEMINI_API_KEY não está configurada. Configure-a no painel Skip Cloud para ativar.'
          : 'Não foi possível gerar a imagem via IA. Tente novamente.')
      throw new Error(msg)
    }

    return data as GenerateGeminiImageResponse
  },

  /**
   * Salva uma imagem na coleção fotos_institucionais
   */
  async saveToGaleriaInstitucional(
    payload: SaveFotoInstitucionalPayload,
  ): Promise<FotoInstitucionalRecord> {
    const formData = new FormData()
    formData.append('titulo', payload.titulo)
    formData.append('tipo', payload.tipo)
    if (payload.legenda) formData.append('legenda', payload.legenda)
    if (payload.descricao) formData.append('descricao', payload.descricao)
    formData.append('origem', payload.origem || 'ia_gemini')
    if (payload.prompt_usado) formData.append('prompt_usado', payload.prompt_usado)

    const userId = pb.authStore.record?.id
    if (userId) {
      formData.append('criado_por', userId)
    }

    if (payload.file) {
      formData.append('arquivo', payload.file)
    } else if (payload.arquivoBase64) {
      const safeFilename = `ia_${payload.tipo}_${Date.now()}.jpg`
      const file = base64ToFile(payload.arquivoBase64, safeFilename, 'image/jpeg')
      formData.append('arquivo', file)
    }

    return await pb.collection('fotos_institucionais').create<FotoInstitucionalRecord>(formData)
  },

  /**
   * Lista todas as fotos institucionais cadastradas no PocketBase
   */
  async getFotosInstitucionais(): Promise<FotoInstitucionalRecord[]> {
    try {
      return await pb.collection('fotos_institucionais').getFullList<FotoInstitucionalRecord>({
        sort: '-created',
        expand: 'criado_por',
      })
    } catch (err) {
      console.warn('Erro ao carregar fotos_institucionais do banco:', err)
      return []
    }
  },

  /**
   * Exclui uma foto da galeria institucional
   */
  async deleteFotoInstitucional(id: string): Promise<boolean> {
    return await pb.collection('fotos_institucionais').delete(id)
  },

  /**
   * Obtém a URL pública do arquivo no PocketBase
   */
  getFotoUrl(record: FotoInstitucionalRecord, thumb?: string): string {
    if (!record || !record.arquivo) return ''
    return pb.files.getURL(record, record.arquivo, thumb ? { thumb } : undefined)
  },
}
