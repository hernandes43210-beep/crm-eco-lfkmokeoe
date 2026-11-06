import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'

// Serviço do GERADOR DE KIT SOLAR — todas as operações persistem no banco (PocketBase).

export const TIPOS_INVERSOR = [
  'Monofásico',
  'Trifásico',
  'Híbrido monofásico',
  'Híbrido trifásico',
  'Eco-híbrido / off-grid',
  'Microinversor',
] as const

export type TipoInversor = (typeof TIPOS_INVERSOR)[number]

export type Origem = 'inicial' | 'cadastrado'

export interface PainelCatalogo {
  id: string
  marca: string
  modelo: string
  potencia_w: number
  area_m2: number
  origem: Origem
  ativo: boolean
}

export interface InversorCatalogo {
  id: string
  marca: string
  modelo: string
  potencia_kw: number
  tipo: TipoInversor
  origem: Origem
  ativo: boolean
}

export interface DistribuidoraItem {
  id: string
  nome: string
  ativo: boolean
}

export interface ItemKitGerado {
  nome: string
  qtd: number
}

/** Item da lista de "demais itens" na tela (com estado de inclusão). */
export interface ItemListaKit {
  nome: string
  qtd: number
  incluido: boolean
  padrao?: boolean
}

// Aliases usados pelos componentes das abas
export type PainelCatalogoRow = PainelCatalogo
export type InversorCatalogoRow = InversorCatalogo
export type DistribuidoraRow = DistribuidoraItem

export interface KitPainelJson {
  marca: string
  modelo: string
  potencia_w: number
  area_m2: number
  qtd: number
}

export interface KitInversorJson {
  marca: string
  modelo: string
  potencia_kw: number
  tipo: string
  qtd: number
}

export interface KitGerado {
  id: string
  nome: string
  potencia_kwp: number
  geracao_kwh: number
  area_m2: number
  tipo_instalacao: string
  ligacao: string
  distribuidora: string
  painel: KitPainelJson | string
  inversor: KitInversorJson | string
  itens: ItemKitGerado[] | string
  custo: number
  acrescimo_pct: number
  preco_venda: number
  desconto_tipo: '%' | 'R$'
  desconto_valor: number
  desconto_rs: number
  preco_final: number
  lucro: number
  margem_pct: number
  criado_por: string
  created: string
  expand?: Record<string, unknown>
}

export interface SalvarKitPayload {
  nome: string
  potencia_kwp: number
  geracao_kwh: number
  area_m2: number
  tipo_instalacao: string
  ligacao: string
  distribuidora: string
  painel: KitPainelJson
  inversor: KitInversorJson
  itens: ItemKitGerado[]
  custo: number
  acrescimo_pct: number
  preco_venda: number
  desconto_tipo: '%' | 'R$'
  desconto_valor: number
  desconto_rs: number
  preco_final: number
  lucro: number
  margem_pct: number
}

/** Normaliza o json "painel" que pode chegar como string (do PocketBase) ou objeto. */
export function parsePainelJson(valor: KitGerado['painel']): KitPainelJson | null {
  if (!valor) return null
  if (typeof valor === 'string') {
    try {
      return JSON.parse(valor) as KitPainelJson
    } catch {
      return null
    }
  }
  return valor
}

/** Normaliza o json "inversor". */
export function parseInversorJson(valor: KitGerado['inversor']): KitInversorJson | null {
  if (!valor) return null
  if (typeof valor === 'string') {
    try {
      return JSON.parse(valor) as KitInversorJson
    } catch {
      return null
    }
  }
  return valor
}

/** Normaliza a lista de itens (json string ou array). */
export function parseItens(valor: KitGerado['itens']): ItemKitGerado[] {
  if (!valor) return []
  if (Array.isArray(valor)) return valor
  try {
    const arr = JSON.parse(valor as string)
    return Array.isArray(arr) ? (arr as ItemKitGerado[]) : []
  } catch {
    return []
  }
}

function eh404(err: unknown): boolean {
  const e = err as { status?: number; message?: string }
  return e?.status === 404 || (typeof e?.message === 'string' && e.message.includes('404'))
}

export const KitGeradorService = {
  // ===================== PAINÉIS =====================
  async listarPaineis(): Promise<PainelCatalogo[]> {
    return await pb
      .collection('kit_paineis')
      .getFullList<PainelCatalogo>({ filter: 'ativo = true', sort: '-created' })
  },

  /** Cria (ou reativa) um painel — sem duplicar marca+modelo+potência. */
  async gravarPainel(dados: {
    marca: string
    modelo: string
    potencia_w: number
    area_m2: number
  }): Promise<PainelCatalogo> {
    const marca = dados.marca.trim()
    const modelo = dados.modelo.trim()
    if (!marca || !modelo || !dados.potencia_w) {
      throw new Error('Preencha marca, modelo e potência para gravar o painel.')
    }
    const existente = await pb
      .collection('kit_paineis')
      .getFirstListItem<PainelCatalogo>(
        `marca = "${escapar(marca)}" && modelo = "${escapar(modelo)}" && potencia_w = ${dados.potencia_w}`,
      )
      .catch((err) => {
        if (eh404(err)) return null
        throw err
      })

    if (existente) {
      if (!existente.ativo) {
        const reativado = await pb.collection('kit_paineis').update<PainelCatalogo>(existente.id, {
          ativo: true,
          area_m2: dados.area_m2 || existente.area_m2,
        })
        toast({ title: `Painel ${marca} ${dados.potencia_w} W reativado no catálogo.` })
        return reativado
      }
      toast({ title: `Painel ${marca} ${dados.potencia_w} W já estava no catálogo.` })
      return existente
    }

    const novo = await pb.collection('kit_paineis').create<PainelCatalogo>({
      marca,
      modelo,
      potencia_w: dados.potencia_w,
      area_m2: dados.area_m2 || 2.7,
      origem: 'cadastrado',
      ativo: true,
    })
    toast({ title: `Painel ${marca} ${dados.potencia_w} W gravado — já está na lista.` })
    return novo
  },

  async desativarPainel(id: string): Promise<void> {
    await pb.collection('kit_paineis').update(id, { ativo: false })
  },

  // ===================== INVERSORES =====================
  async listarInversores(): Promise<InversorCatalogo[]> {
    return await pb
      .collection('kit_inversores')
      .getFullList<InversorCatalogo>({ filter: 'ativo = true', sort: '-created' })
  },

  /** Cria (ou reativa) um inversor — sem duplicar marca+modelo+potência. */
  async gravarInversor(dados: {
    marca: string
    modelo: string
    potencia_kw: number
    tipo: string
  }): Promise<InversorCatalogo> {
    const marca = dados.marca.trim()
    const modelo = dados.modelo.trim()
    if (!marca || !modelo || !dados.potencia_kw) {
      throw new Error('Preencha marca, modelo e potência para gravar o inversor.')
    }
    const existente = await pb
      .collection('kit_inversores')
      .getFirstListItem<InversorCatalogo>(
        `marca = "${escapar(marca)}" && modelo = "${escapar(modelo)}" && potencia_kw = ${dados.potencia_kw}`,
      )
      .catch((err) => {
        if (eh404(err)) return null
        throw err
      })

    if (existente) {
      if (!existente.ativo) {
        const reativado = await pb
          .collection('kit_inversores')
          .update<InversorCatalogo>(existente.id, {
            ativo: true,
            tipo: dados.tipo || existente.tipo,
          })
        toast({ title: `Inversor ${marca} ${dados.potencia_kw} kW reativado no catálogo.` })
        return reativado
      }
      toast({ title: `Inversor ${marca} ${dados.potencia_kw} kW já estava no catálogo.` })
      return existente
    }

    const novo = await pb.collection('kit_inversores').create<InversorCatalogo>({
      marca,
      modelo,
      potencia_kw: dados.potencia_kw,
      tipo: dados.tipo,
      origem: 'cadastrado',
      ativo: true,
    })
    toast({ title: `Inversor ${marca} ${dados.potencia_kw} kW gravado — já está na lista.` })
    return novo
  },

  async desativarInversor(id: string): Promise<void> {
    await pb.collection('kit_inversores').update(id, { ativo: false })
  },

  // ===================== DISTRIBUIDORAS =====================
  async listarDistribuidoras(): Promise<DistribuidoraItem[]> {
    return await pb
      .collection('kit_distribuidoras')
      .getFullList<DistribuidoraItem>({ filter: 'ativo = true', sort: 'nome' })
  },

  /** Cria (ou reativa) uma distribuidora sem duplicar nome. */
  async gravarDistribuidora(nome: string): Promise<DistribuidoraItem> {
    const limpo = nome.trim()
    if (!limpo) throw new Error('Digite o nome da distribuidora.')
    const existente = await pb
      .collection('kit_distribuidoras')
      .getFirstListItem<DistribuidoraItem>(`nome = "${escapar(limpo)}"`)
      .catch((err) => {
        if (eh404(err)) return null
        throw err
      })
    if (existente) {
      if (!existente.ativo) {
        const reativada = await pb
          .collection('kit_distribuidoras')
          .update<DistribuidoraItem>(existente.id, { ativo: true })
        toast({ title: `Distribuidora ${limpo} reativada na lista.` })
        return reativada
      }
      toast({ title: `Distribuidora ${limpo} já estava na lista.` })
      return existente
    }
    const nova = await pb.collection('kit_distribuidoras').create<DistribuidoraItem>({
      nome: limpo,
      ativo: true,
    })
    toast({ title: `Distribuidora ${limpo} guardada na lista.` })
    return nova
  },

  async desativarDistribuidora(id: string): Promise<void> {
    await pb.collection('kit_distribuidoras').update(id, { ativo: false })
  },

  // ===================== KITS GERADOS =====================
  async listarKits(): Promise<KitGerado[]> {
    return await pb
      .collection('kit_gerados')
      .getFullList<KitGerado>({ filter: 'ativo = true', sort: '-created' })
  },

  async salvarKit(payload: SalvarKitPayload): Promise<KitGerado> {
    return await pb.collection('kit_gerados').create<KitGerado>({
      ...payload,
      itens: JSON.stringify(payload.itens),
      criado_por: pb.authStore.record?.id || '',
    })
  },

  async atualizarKit(id: string, payload: SalvarKitPayload): Promise<KitGerado> {
    return await pb.collection('kit_gerados').update<KitGerado>(id, {
      ...payload,
      itens: JSON.stringify(payload.itens),
    })
  },

  async desativarKit(id: string): Promise<void> {
    await pb.collection('kit_gerados').update(id, { ativo: false })
  },
}

function escapar(valor: string): string {
  return valor.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
