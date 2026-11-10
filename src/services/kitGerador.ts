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

/** Uma linha de modelo de painel no kit (o kit pode ter várias). */
export interface PainelLinha {
  marca: string
  modelo: string
  potencia_w: number
  area_m2: number
  qtd: number
}

/** Uma linha de modelo de inversor no kit (o kit pode ter várias). */
export interface InversorLinha {
  marca: string
  modelo: string
  potencia_kw: number
  tipo: string
  qtd: number
}

/** Formato legado: um único modelo por kit (objeto simples no campo JSON). */
export type KitPainelJson = PainelLinha
export type KitInversorJson = InversorLinha

/** Formato novo: várias linhas de modelo + observações livres da seção. */
export interface PainelListaJson {
  linhas: PainelLinha[]
  outrosDados?: string
}

export interface InversorListaJson {
  linhas: InversorLinha[]
  outrosDados?: string
}

export type PainelJsonValor = PainelLinha | PainelLinha[] | PainelListaJson | string | null
export type InversorJsonValor = InversorLinha | InversorLinha[] | InversorListaJson | string | null

export interface KitGerado {
  id: string
  nome: string
  potencia_kwp: number
  geracao_kwh: number
  area_m2: number
  tipo_instalacao: string
  ligacao: string
  distribuidora: string
  painel: PainelJsonValor
  inversor: InversorJsonValor
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
  ativo?: boolean
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
  painel: PainelLinha | PainelListaJson
  inversor: InversorLinha | InversorListaJson
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

/** Faz o parse do campo JSON que pode chegar como string (do PocketBase) ou objeto. */
function parseCampoJson(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor
  try {
    return JSON.parse(valor)
  } catch {
    return null
  }
}

function ehPainelLinha(v: unknown): v is PainelLinha {
  return !!v && typeof v === 'object' && !Array.isArray(v) && 'marca' in (v as object)
}

function ehInversorLinha(v: unknown): v is InversorLinha {
  return !!v && typeof v === 'object' && !Array.isArray(v) && 'marca' in (v as object)
}

/**
 * Lê TODAS as linhas de painel do campo JSON — aceita o formato novo
 * ({ linhas: [...] } ou [ ... ]) e o legado (objeto único com marca/modelo).
 */
export function parsePaineisLinhas(valor: PainelJsonValor): PainelLinha[] {
  const v = parseCampoJson(valor)
  if (Array.isArray(v)) return v.filter(ehPainelLinha)
  if (v && typeof v === 'object') {
    const obj = v as Record<string, unknown>
    if (Array.isArray(obj.linhas)) return obj.linhas.filter(ehPainelLinha)
    if (typeof obj.marca === 'string') return [obj as unknown as PainelLinha]
  }
  return []
}

/** Igual ao anterior, para inversores. */
export function parseInversoresLinhas(valor: InversorJsonValor): InversorLinha[] {
  const v = parseCampoJson(valor)
  if (Array.isArray(v)) return v.filter(ehInversorLinha)
  if (v && typeof v === 'object') {
    const obj = v as Record<string, unknown>
    if (Array.isArray(obj.linhas)) return obj.linhas.filter(ehInversorLinha)
    if (typeof obj.marca === 'string') return [obj as unknown as InversorLinha]
  }
  return []
}

/** Observações livres ("Outros dados") gravadas junto das linhas no campo JSON. */
export function parseOutrosDados(valor: PainelJsonValor | InversorJsonValor): string {
  const v = parseCampoJson(valor)
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const outros = (v as Record<string, unknown>).outrosDados
    if (typeof outros === 'string') return outros
  }
  return ''
}

/**
 * Compatibilidade: primeiro modelo do kit (legado lia um único objeto).
 * Continua funcionando para kits antigos e para o formato novo (1ª linha).
 */
export function parsePainelJson(valor: PainelJsonValor): KitPainelJson | null {
  return parsePaineisLinhas(valor)[0] ?? null
}

/** Compatibilidade: primeiro modelo de inversor do kit. */
export function parseInversorJson(valor: InversorJsonValor): KitInversorJson | null {
  return parseInversoresLinhas(valor)[0] ?? null
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
      // Kit novo sempre nasce ativo — senão a aba "Kits salvos" (filtra ativo = true) o esconde.
      ativo: true,
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
