import pb from '@/lib/pocketbase/client'
import type { Kit, KitCategoria, KitStringBox, KitTipoEstrutura } from '@/types/crm'

export interface CotacaoComponenteItem {
  sku?: string | null
  descricao: string
  fabricante?: string | null
  quantidade: number
  unidade: string
  preco_unitario: number
}

export interface ExtrairPdfCotacaoResult {
  success: boolean
  arquivo: string
  model_used?: string
  distribuidora?: string
  numero_cotacao?: string | null
  data_cotacao?: string | null
  nome: string
  potencia_kwp: number
  fabricante: string
  categoria: KitCategoria
  tipo_estrutura: KitTipoEstrutura | ''
  estrutura_detalhe?: string | null
  string_box?: KitStringBox | ''
  marca_painel: string
  potencia_painel_w: number
  qtd_paineis: number
  marca_inversor: string
  potencia_inversor_kw: number
  qtd_inversores: number
  frete: number
  valor_total: number
  custo: number
  descricao: string
  componentes: CotacaoComponenteItem[]
}

export const KitsService = {
  async getKits() {
    return await pb.collection('kits').getFullList<Kit>({
      sort: 'potencia_kw',
    })
  },

  async getKitById(id: string) {
    return await pb.collection('kits').getOne<Kit>(id)
  },

  async createKit(data: Partial<Kit>) {
    return await pb.collection('kits').create<Kit>(data)
  },

  async updateKit(id: string, data: Partial<Kit> | FormData) {
    return await pb.collection('kits').update<Kit>(id, data)
  },

  async deleteKit(id: string) {
    return await pb.collection('kits').delete(id)
  },

  getKitImageUrl(
    kit: Kit | { id: string; imagem_ia?: string } | null | undefined,
    thumb?: string,
  ): string {
    if (!kit || !kit.id || !kit.imagem_ia) return ''
    return pb.files.getURL(kit as any, kit.imagem_ia, thumb ? { thumb } : undefined)
  },

  /**
   * Envia o PDF de cotação (Belenus, PHB Solar, Fortlev etc.) para o backend (Gemini multimodal)
   * e extrai nome, potência, componentes com marca e preço, estrutura, frete e custo total.
   */
  async extrairPdfCotacao(file: File): Promise<ExtrairPdfCotacaoResult> {
    if (!file) {
      throw new Error('Nenhum arquivo PDF selecionado.')
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Formato inválido. Por favor, envie um arquivo com extensão .pdf.')
    }

    const MAX_BYTES = 15 * 1024 * 1024
    if (file.size > MAX_BYTES) {
      throw new Error('PDF muito grande (máximo 15 MB). Envie uma cotação dentro do limite.')
    }

    // Lê o arquivo como base64 para envio robusto via JSON
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const res = reader.result as string
        const cleaned = res.replace(/^data:[^;]+;base64,/, '')
        resolve(cleaned)
      }
      reader.onerror = () => reject(new Error('Erro ao ler os bytes do arquivo PDF.'))
      reader.readAsDataURL(file)
    })

    const response = await pb.send<ExtrairPdfCotacaoResult>('/backend/v1/kits/extrair-pdf', {
      method: 'POST',
      body: JSON.stringify({
        pdf_base64: base64Data,
        nome_arquivo: file.name,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return response
  },
}
