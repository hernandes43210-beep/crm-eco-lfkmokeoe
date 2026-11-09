/**
 * Utilitários de apoio à montagem rápida de kits nos modais de proposta
 * (sugestão de nome, fabricante, descrição técnica e cálculo de potência pico).
 */

export const MARCAS_PAINEIS_SUGERIDAS = [
  'OSDA',
  'DMEGC',
  'TSUN POWER',
  'Astronergy',
  'Canadian Solar',
  'JA Solar',
  'Jinko Solar',
  'LONGi',
  'PHB',
  'Risen',
  'Solarmax',
  'Trina Solar',
  'WEG',
] as const

export const MARCAS_INVERSORES_SUGERIDAS = [
  'Sungrow',
  'HUAWEI',
  'AUSXOL',
  'PHB',
  'GOODWE',
  'Fronius',
  'GROWATT',
  'Hoymiles',
  'Solis',
  'WEG',
] as const

export const POTENCIAS_COMUNS_PAINEIS = [
  450, 500, 540, 550, 575, 580, 585, 600, 610, 615, 620, 625, 630, 635, 650, 660, 700,
] as const

export const POTENCIAS_COMUNS_INVERSORES = [
  1, 1.5, 2, 3, 3.7, 4, 5, 6, 7.5, 8, 10, 12, 15, 20, 25, 30, 50, 75, 100,
] as const

export const TIPOS_ESTRUTURA_OPCOES = [
  { value: 'fibrocimento', label: 'Telhado de Fibrocimento' },
  { value: 'ceramico', label: 'Telhado de Cerâmico' },
  { value: 'mini_trilho', label: 'Telhado Metálico (Mini Trilho)' },
  { value: 'solo_monoposte', label: 'Solo (Monoposte)' },
  { value: 'outro', label: 'Outro' },
] as const

/** Formata potência de painel em watts (ex.: 615 → "615 W"). */
export function formatarPotenciaW(v: number | string): string {
  const n = Number(v)
  if (!n || isNaN(n)) return ''
  return `${n} W`
}

/** Formata potência de inversor em kW (ex.: 7.5 → "7,5 kW"). */
export function formatarPotenciaKw(v: number | string): string {
  const n = Number(v)
  if (!n || isNaN(n)) return ''
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kW`
}

/** Rótulo amigável do tipo de estrutura. */
export function formatarRotuloEstrutura(tipo: string): string {
  const opt = TIPOS_ESTRUTURA_OPCOES.find((o) => o.value === tipo)
  if (opt) return opt.label
  return tipo || 'Não especificado'
}

/** Rótulo amigável do string box. */
export function formatarRotuloStringBox(tipo: string): string {
  const rotulos: Record<string, string> = {
    '1_entrada': '1 entrada (1E/1S)',
    '2_entradas': '2 entradas (2E/2S)',
    '3_entradas': '3 entradas (3E/3S)',
  }
  return rotulos[tipo] || tipo || 'Sem string box'
}

export interface CalcularKwpPreProntoResult {
  kwp: number
  formattedBR: string
}

/** Calcula a potência pico (kWp) a partir da quantidade × potência dos painéis. */
export function calcularKwpPrePronto(
  qtdPaineis: number | string,
  potenciaPainelW: number | string,
): CalcularKwpPreProntoResult {
  const qtd = Number(qtdPaineis) || 0
  const w = Number(potenciaPainelW) || 0
  const kwp = qtd > 0 && w > 0 ? Math.round(((qtd * w) / 1000) * 100) / 100 : 0
  return {
    kwp,
    formattedBR: kwp.toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }),
  }
}

export interface ComponentesKit {
  qtdPaineis?: number
  potenciaPainelW?: number
  marcaPaineis?: string
  qtdInversores?: number
  marcaInversor?: string
  potenciaInversorKw?: number
  tipoEstrutura?: string
  stringBox?: string
}

/** Campos do kit aceitos pela extração de componentes (aceita um Kit completo ou um subconjunto). */
export type KitComponentesInput = Partial<{
  nome: string
  potencia_kw: number
  fabricante: string
  descricao: string
  string_box: string
  marca_painel: string
  marca_inversor: string
  potencia_painel_w: number
  potencia_inversor_kw: number
  tipo_estrutura: string
}>

function parseNum(v: unknown): number {
  if (v === undefined || v === null || v === '') return 0
  const n =
    typeof v === 'number'
      ? v
      : parseFloat(
          String(v)
            .replace(/[^\d.,]/g, '')
            .replace(',', '.'),
        )
  return isNaN(n) ? 0 : n
}

/**
 * Extrai os componentes técnicos de um kit (painéis, inversor, estrutura, string box),
 * combinando os campos estruturados com a decomposição do texto de descrição/nome
 * (formato "22x Módulo fotovoltaico 610 W (BYD) ... 1x Inversor solar 10 kW PHB ...").
 */
export function extrairComponentesKit(kit: KitComponentesInput | null | undefined): ComponentesKit {
  if (!kit) return {}

  const resultado: ComponentesKit = {}
  const texto = `${kit.descricao || ''} ${kit.nome || ''}`

  // --- Painéis ---
  const marcaPainelDireta = (kit.marca_painel || '').trim()
  const potenciaPainelDireta = parseNum(kit.potencia_painel_w)

  // Padrões "22x ... 610 W" na descrição
  const mPainel =
    /(\d+)\s*[x×]\s*[^•;,;\n]*?(\d{3,4})\s*W(p)?\b/i.exec(texto) ||
    /(\d+)\s*[x×]\s*M[oó]dulo[^\n]*/i.exec(texto)

  if (mPainel) {
    resultado.qtdPaineis = parseInt(mPainel[1], 10) || undefined
  }
  if (potenciaPainelDireta > 0) {
    resultado.potenciaPainelW = potenciaPainelDireta
  } else if (mPainel && mPainel[2]) {
    const w = parseInt(mPainel[2], 10)
    if (w > 0) resultado.potenciaPainelW = w
  }

  // Marca do painel: campo direto → "(BYD)" na descrição → fabricante antes da "/"
  const mMarcaDesc = /\(([^()]{2,30})\)/.exec(texto)
  if (marcaPainelDireta) {
    resultado.marcaPaineis = marcaPainelDireta
  } else if (mMarcaDesc) {
    resultado.marcaPaineis = mMarcaDesc[1].trim()
  } else if (kit.fabricante && kit.fabricante.includes('/')) {
    resultado.marcaPaineis = kit.fabricante.split('/')[0].trim() || undefined
  } else if (kit.fabricante) {
    resultado.marcaPaineis = kit.fabricante.trim()
  }

  // Fallback de quantidade pela potência total
  if (!resultado.qtdPaineis && resultado.potenciaPainelW && parseNum(kit.potencia_kw) > 0) {
    resultado.qtdPaineis = Math.round(
      (parseNum(kit.potencia_kw) * 1000) / resultado.potenciaPainelW,
    )
  }

  // --- Inversor ---
  const marcaInversorDireta = (kit.marca_inversor || '').trim()
  const potenciaInversorDireta = parseNum(kit.potencia_inversor_kw)

  const mInversor =
    /(\d+)\s*[x×]\s*Inversor[^\n]*?([\d.,]+)\s*k?W\b/i.exec(texto) ||
    /(\d+)\s*[x×]\s*Inversor[^\n]*/i.exec(texto)

  resultado.qtdInversores = mInversor ? parseInt(mInversor[1], 10) || 1 : 1
  if (potenciaInversorDireta > 0) {
    resultado.potenciaInversorKw = potenciaInversorDireta
  } else if (mInversor && mInversor[2]) {
    const kw = parseNum(mInversor[2])
    if (kw > 0) resultado.potenciaInversorKw = kw
  }

  if (marcaInversorDireta) {
    resultado.marcaInversor = marcaInversorDireta
  } else if (kit.fabricante && kit.fabricante.includes('/')) {
    resultado.marcaInversor = kit.fabricante.split('/')[1]?.trim() || undefined
  } else {
    // "1x Inversor solar 10 kW PHB" → marca após o kW
    const mMarcaInv = /Inversor[^\n]*?k?W\s+([A-Za-z][\w\s-]{1,24})/i.exec(texto)
    if (mMarcaInv) resultado.marcaInversor = mMarcaInv[1].trim()
  }

  // --- Tipo de estrutura ---
  if (kit.tipo_estrutura) {
    resultado.tipoEstrutura = String(kit.tipo_estrutura)
  } else if (/solo\s*monoposte|monoposte/i.test(texto)) {
    resultado.tipoEstrutura = 'solo_monoposte'
  } else if (/mini\s*trilho/i.test(texto)) {
    resultado.tipoEstrutura = 'mini_trilho'
  } else if (/fibrocimento/i.test(texto)) {
    resultado.tipoEstrutura = 'fibrocimento'
  }

  // --- String Box ---
  if (kit.string_box) {
    resultado.stringBox = String(kit.string_box)
  } else {
    const mSb = /String\s*box\s*(\d)\s*entrada/i.exec(texto)
    if (mSb) resultado.stringBox = `${mSb[1]}_entradas`
  }

  return resultado
}

export interface SugerirNomeKitParams {
  kwp: number
  marcaPaineis?: string
  marcaInversor?: string
  qtdPaineis?: number | string
  potenciaPainelW?: number | string
  tipoEstrutura?: string
}

/** Sugere um nome comercial padrão a partir dos componentes (ex.: "Kit Solar 6,3 kWp — TSUN POWER + Sungrow — Fibrocimento"). */
export function sugerirNomeKit(params: SugerirNomeKitParams): string {
  const { kwp, marcaPaineis, marcaInversor, tipoEstrutura } = params
  if (!kwp || kwp <= 0) return ''
  const kwpStr = kwp.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })
  const partes: string[] = [`Kit Solar ${kwpStr} kWp`]
  const marcas = [marcaPaineis?.trim(), marcaInversor?.trim()].filter(Boolean)
  if (marcas.length > 0) {
    partes.push(marcas.join(' + '))
  }
  const rotuloEstrutura = tipoEstrutura
    ? TIPOS_ESTRUTURA_OPCOES.find((o) => o.value === tipoEstrutura)
        ?.label.split(' ')
        .pop() ||
      TIPOS_ESTRUTURA_OPCOES.find((o) => o.value === tipoEstrutura)?.label ||
      ''
    : ''
  if (rotuloEstrutura) {
    partes.push(rotuloEstrutura)
  }
  return partes.join(' — ')
}

/** Sugere o fabricante consolidado (painéis / inversor). */
export function sugerirFabricanteKit(marcaPaineis?: string, marcaInversor?: string): string {
  return [marcaPaineis?.trim(), marcaInversor?.trim()].filter(Boolean).join(' / ') || ''
}

/** Inclui o rótulo da estrutura ao nome do kit (idempotente). */
export function aplicarEstruturaAoNomeKit(nomeKit: string, tipoEstrutura: string): string {
  if (!nomeKit || !tipoEstrutura) return nomeKit
  const rotuloNovo =
    TIPOS_ESTRUTURA_OPCOES.find((o) => o.value === tipoEstrutura)
      ?.label.split(' ')
      .pop() ||
    TIPOS_ESTRUTURA_OPCOES.find((o) => o.value === tipoEstrutura)?.label ||
    ''
  if (!rotuloNovo) return nomeKit

  const nomesConhecidos = TIPOS_ESTRUTURA_OPCOES.map((o) => o.label.split(' ').pop() || o.label)
  let base = nomeKit.trim()
  for (const n of nomesConhecidos) {
    if (base.toLowerCase().endsWith(n.toLowerCase())) {
      base = base.slice(0, base.length - n.length).trimEnd()
      if (base.endsWith('—')) base = base.slice(0, -1).trimEnd()
      break
    }
  }
  return base ? `${base} — ${rotuloNovo}` : rotuloNovo
}

export interface SugerirDescricaoTecnicaParams {
  qtdPaineis: number | string
  potenciaPainelW: number | string
  marcaPaineis?: string
  qtdInversores: number | string
  marcaInversor?: string
  potenciaInversorKw: number | string
  kwp: number
  stringBox?: string
  tipoEstrutura?: string
}

/** Descrição técnica consolidada dos equipamentos do kit manual. */
export function sugerirDescricaoTecnica(params: SugerirDescricaoTecnicaParams): string {
  const {
    qtdPaineis,
    potenciaPainelW,
    marcaPaineis,
    qtdInversores,
    marcaInversor,
    potenciaInversorKw,
    kwp,
    stringBox,
    tipoEstrutura,
  } = params

  const linhas: string[] = []

  const qtdP = Number(qtdPaineis) || 0
  const wP = Number(potenciaPainelW) || 0
  if (qtdP > 0 && wP > 0) {
    linhas.push(`${qtdP}× Módulos ${marcaPaineis || 'Fotovoltaicos'} ${wP} W`)
  }

  const qtdI = Number(qtdInversores) || 0
  const kwI = Number(potenciaInversorKw) || 0
  if (qtdI > 0 && kwI > 0) {
    linhas.push(`${qtdI}× Inversor ${marcaInversor || 'Solar'} ${formatarPotenciaKw(kwI)}`)
  }

  if (kwp > 0) {
    linhas.push(`Potência pico: ${kwp.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kWp`)
  }

  if (stringBox) {
    linhas.push(`String box: ${formatarRotuloStringBox(stringBox)}`)
  }

  if (tipoEstrutura) {
    linhas.push(`Estrutura: ${formatarRotuloEstrutura(tipoEstrutura)}`)
  }

  linhas.push(
    'Incluso estrutura de fixação, cabos, conectores, proteções CC/CA e monitoramento via Wi-Fi.',
  )

  return linhas.join(' • ')
}
