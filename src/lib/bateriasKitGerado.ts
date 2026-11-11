// Baterias no Gerador de Kit Solar — tipos e helpers de JSON (espelha painéis/inversores).
import pb from '@/lib/pocketbase/client'

/** Uma linha de modelo de bateria no kit (o kit pode ter várias). */
export interface BateriaLinha {
  marca: string
  modelo: string
  capacidade_kwh: number
  tensao: string
  qtd: number
}

/** Formato novo: várias linhas de bateria + observações livres da seção. */
export interface BateriasListaJson {
  linhas: BateriaLinha[]
  outrosDados?: string
}

export type BateriasJsonValor = BateriaLinha[] | BateriasListaJson | string | null

function parseCampoJson(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor
  try {
    return JSON.parse(valor)
  } catch {
    return null
  }
}

function ehBateriaLinha(v: unknown): v is BateriaLinha {
  return !!v && typeof v === 'object' && !Array.isArray(v) && 'marca' in (v as object)
}

/**
 * Lê TODAS as linhas de bateria do campo JSON — aceita o formato novo
 * ({ linhas: [...] } ou [ ... ]). Kits antigos sem baterias voltam como [].
 */
export function parseBateriasLinhas(valor: BateriasJsonValor): BateriaLinha[] {
  const v = parseCampoJson(valor)
  if (Array.isArray(v)) return v.filter(ehBateriaLinha)
  if (v && typeof v === 'object') {
    const obj = v as Record<string, unknown>
    if (Array.isArray(obj.linhas)) return obj.linhas.filter(ehBateriaLinha)
  }
  return []
}

/** Observações livres ("Outros dados") gravadas junto das linhas de bateria. */
export function parseOutrosDadosBaterias(valor: BateriasJsonValor): string {
  const v = parseCampoJson(valor)
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const outros = (v as Record<string, unknown>).outrosDados
    if (typeof outros === 'string') return outros
  }
  return ''
}

/** Normaliza as linhas para exibição: descarta linhas sem marca/modelo/capacidade. */
export function bateriasValidas(linhas: BateriaLinha[]): BateriaLinha[] {
  return linhas.filter((b) => (b.qtd || 0) > 0 && (b.marca || b.modelo || b.capacidade_kwh))
}

// ===================== CATÁLOGO DE BATERIAS (kit_baterias) =====================

export interface BateriaCatalogo {
  id: string
  marca: string
  modelo: string
  capacidade_kwh: number
  tensao: string
  origem: 'inicial' | 'cadastrado'
  ativo: boolean
}

export const KitBateriasService = {
  async listar(): Promise<BateriaCatalogo[]> {
    return await pb
      .collection('kit_baterias')
      .getFullList<BateriaCatalogo>({ filter: 'ativo = true', sort: '-created' })
  },

  /** Cria (ou reativa) uma bateria — sem duplicar marca+modelo+capacidade. */
  async gravar(dados: {
    marca: string
    modelo: string
    capacidade_kwh: number
    tensao: string
  }): Promise<BateriaCatalogo> {
    const marca = dados.marca.trim()
    const modelo = dados.modelo.trim()
    if (!marca || !modelo || !dados.capacidade_kwh) {
      throw new Error('Preencha marca, modelo e capacidade para gravar a bateria.')
    }
    const filtros = [`marca = "${marcarFiltro(marca)}"`, `modelo = "${marcarFiltro(modelo)}"`]
    if (dados.capacidade_kwh) filtros.push(`capacidade_kwh = ${dados.capacidade_kwh}`)
    const existente = await pb
      .collection('kit_baterias')
      .getFirstListItem<BateriaCatalogo>(filtros.join(' && '))
      .catch((err) => {
        const e = err as { status?: number }
        if (e?.status === 404) return null
        throw err
      })

    if (existente) {
      if (!existente.ativo) {
        const reativada = await pb
          .collection('kit_baterias')
          .update<BateriaCatalogo>(existente.id, {
            ativo: true,
            tensao: dados.tensao || existente.tensao,
          })
        return reativada
      }
      return existente
    }

    return await pb.collection('kit_baterias').create<BateriaCatalogo>({
      marca,
      modelo,
      capacidade_kwh: dados.capacidade_kwh,
      tensao: dados.tensao || '',
      origem: 'cadastrado',
      ativo: true,
    })
  },
}

function marcarFiltro(valor: string): string {
  return valor.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
