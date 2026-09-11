/**
 * Utilitários para o modo de montagem rápida / Kit Pré-Pronto
 */

export const POTENCIAS_COMUNS_PAINEIS = [550, 575, 610, 630] as const

export interface MontagemPreProntaState {
  qtdPaineis: number | string
  potenciaPainelW: number | string
  marcaPaineis: string
  qtdInversores: number | string
  marcaInversor: string
  stringBox?: string
}

/**
 * Converte o valor salvo da string box (ex: '2_entradas') no rótulo padrão
 * de composição: "String box 2 entradas / 2 saídas"
 */
export function formatarRotuloStringBox(val?: string | null): string {
  if (!val) return ''
  const trimmed = val.trim()
  if (trimmed === '1_entrada' || trimmed === '1') {
    return 'String box 1 entrada / 1 saída'
  }
  if (trimmed === '2_entradas' || trimmed === '2') {
    return 'String box 2 entradas / 2 saídas'
  }
  if (trimmed === '3_entradas' || trimmed === '3') {
    return 'String box 3 entradas / 3 saídas'
  }
  // Se já veio texto formatado como "3E/3S" ou "String box..."
  const matchE = trimmed.match(/(\d+)\s*E(?:ntradas?)?/i)
  if (matchE) {
    const n = matchE[1]
    return n === '1' ? 'String box 1 entrada / 1 saída' : `String box ${n} entradas / ${n} saídas`
  }
  return trimmed
}

/**
 * Calcula a potência pico em kWp:
 * kWp = (qtd × potência em Wp) / 1000
 */
export function calcularKwpPrePronto(
  qtd: number | string,
  potenciaW: number | string,
): { kwp: number; formattedBR: string } {
  const q = Number(qtd) || 0
  const w = Number(potenciaW) || 0

  if (q <= 0 || w <= 0) {
    return { kwp: 0, formattedBR: '0,00' }
  }

  const rawKwp = (q * w) / 1000
  // Arredonda para até 2 casas decimais precisas
  const rounded = Math.round(rawKwp * 100) / 100

  // Formatação pt-BR com vírgula decimal
  const formattedBR = rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })

  return { kwp: rounded, formattedBR }
}

/**
 * Sugere o nome comercial do kit a partir dos dados preenchidos:
 * Ex.: "Kit Solar 6,1 kWp — Canadian Solar + Growatt"
 */
export function sugerirNomeKit(params: {
  kwp: number
  marcaPaineis?: string
  marcaInversor?: string
  qtdPaineis?: number | string
  potenciaPainelW?: number | string
}): string {
  const { kwp, marcaPaineis, marcaInversor } = params

  if (kwp <= 0) {
    return ''
  }

  // Formatação compacta ex: 6,1 kWp ou 6,15 kWp
  const kwpStr = kwp.toLocaleString('pt-BR', {
    minimumFractionDigits: kwp % 1 === 0 ? 1 : 1,
    maximumFractionDigits: 2,
  })

  const painelClean = (marcaPaineis || '').trim()
  const inversorClean = (marcaInversor || '').trim()

  const partesMarcas: string[] = []
  if (painelClean) partesMarcas.push(painelClean)
  if (inversorClean) partesMarcas.push(inversorClean)

  const sufixoMarcas = partesMarcas.length > 0 ? ` — ${partesMarcas.join(' + ')}` : ''

  return `Kit Solar ${kwpStr} kWp${sufixoMarcas}`
}

/**
 * Sugere o campo Fabricante/Marcas unificado para o kit:
 * Ex.: "Canadian Solar / Growatt"
 */
export function sugerirFabricanteKit(marcaPaineis?: string, marcaInversor?: string): string {
  const p = (marcaPaineis || '').trim()
  const i = (marcaInversor || '').trim()

  if (p && i) return `${p} / ${i}`
  if (p) return p
  if (i) return i
  return ''
}

/**
 * Sugere a descrição técnica detalhada para o kit
 */
export function sugerirDescricaoTecnica(params: {
  qtdPaineis: number | string
  potenciaPainelW: number | string
  marcaPaineis: string
  qtdInversores: number | string
  marcaInversor: string
  kwp: number
  stringBox?: string
}): string {
  const {
    qtdPaineis,
    potenciaPainelW,
    marcaPaineis,
    qtdInversores,
    marcaInversor,
    kwp,
    stringBox,
  } = params

  const qP = Number(qtdPaineis) || 0
  const potP = Number(potenciaPainelW) || 0
  const qI = Number(qtdInversores) || 0

  const linhas: string[] = []

  if (qP > 0 && potP > 0) {
    const nomeMód = marcaPaineis.trim() ? ` (${marcaPaineis.trim()})` : ''
    linhas.push(
      `${qP}x Módulo fotovoltaico ${potP}Wp${nomeMód} — Total ${kwp.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kWp`,
    )
  }

  if (qI > 0 && marcaInversor.trim()) {
    linhas.push(`${qI}x Inversor solar ${marcaInversor.trim()}`)
  } else if (marcaInversor.trim()) {
    linhas.push(`Inversor solar ${marcaInversor.trim()}`)
  }

  if (stringBox) {
    const rotuloSb = formatarRotuloStringBox(stringBox)
    if (rotuloSb) {
      linhas.push(`1x ${rotuloSb}`)
    }
  }

  linhas.push('Estrutura de fixação e cabeamento completo inclusos.')

  return linhas.join('\n')
}

/**
 * Adiciona o sufixo "— Cópia" ao nome de um kit para duplicação.
 * Exemplo:
 * "Kit Solar 6,1 kWp" -> "Kit Solar 6,1 kWp — Cópia"
 * "Kit Solar 6,1 kWp — Cópia" -> "Kit Solar 6,1 kWp — Cópia 2"
 */
export function gerarNomeKitClonado(nomeOriginal: string): string {
  const nomeTrim = (nomeOriginal || '').trim()
  if (!nomeTrim) {
    return 'Novo Kit Solar — Cópia'
  }

  // Verifica se já termina com "— Cópia" ou "— Cópia N"
  const matchCopiaNum = nomeTrim.match(/—\s*Cópia(?:\s+(\d+))?$/i)
  if (matchCopiaNum) {
    const num = matchCopiaNum[1] ? parseInt(matchCopiaNum[1], 10) : 1
    const base = nomeTrim.substring(0, matchCopiaNum.index).trim()
    return `${base} — Cópia ${num + 1}`
  }

  return `${nomeTrim} — Cópia`
}

export interface ExtractedKitComponents {
  isPrePronto: boolean
  qtdPaineis: number
  potenciaPainelW: number
  marcaPaineis: string
  qtdInversores: number
  marcaInversor: string
  stringBox: string
}

/**
 * Analisa a descrição e nome do kit para identificar se ele possui dados
 * de módulos e inversor compatíveis com o modo de montagem pré-pronta.
 */
export function extrairComponentesKit(kit: {
  nome?: string
  fabricante?: string
  potencia_kw?: number
  descricao?: string
  string_box?: string
}): ExtractedKitComponents {
  const desc = kit.descricao || ''
  const nome = kit.nome || ''
  const fab = kit.fabricante || ''
  const textFull = `${desc}\n${nome}\n${fab}`

  let qtdPaineis = 0
  let potW = 0
  let marcaPaineis = ''
  let qtdInversores = 1
  let marcaInversor = ''
  let stringBox = kit.string_box || ''

  // Se string_box não estiver no campo dedicado, tentar inferir da descrição
  if (!stringBox) {
    if (/string\s*box\s*3\s*e|3E\/3S|3\s*entradas/i.test(desc)) {
      stringBox = '3_entradas'
    } else if (/string\s*box\s*2\s*e|2E\/2S|2\s*entradas/i.test(desc)) {
      stringBox = '2_entradas'
    } else if (/string\s*box\s*1\s*e|1E\/1S|1\s*entrada/i.test(desc)) {
      stringBox = '1_entrada'
    }
  }

  // 1. Tentar ler padrão de montagem pré-pronta gerada:
  // "10x Módulo fotovoltaico 610Wp (Canadian Solar) — Total 6,1 kWp"
  // "1x Inversor solar Growatt 5000"
  // Ou padrão distribuidor: "22= MODULO BIFACIAL ... 630W ... TSUN"
  const moduloMatch =
    desc.match(
      /(\d+)\s*(?:x|=|\*)\s*M[oó]dulo(?:[^\n]*?)(\d{3,4})\s*W(?:p)?(?:\s*\(([^)]+)\))?/i,
    ) ||
    desc.match(/(\d+)\s*(?:x|=|\*)\s*MODULO[^\n]*?(\d{3,4})\s*W/i) ||
    desc.match(/(\d+)\s*(?:paineis?|painéis?|placas?|módulos?)[^\n]*?(\d{3,4})\s*W(?:p)?/i)

  if (moduloMatch) {
    qtdPaineis = parseInt(moduloMatch[1], 10) || 0
    potW = parseInt(moduloMatch[2], 10) || 0
    if (moduloMatch[3]) {
      marcaPaineis = moduloMatch[3].trim()
    }
  }

  // Se não achou marca do painel no match, buscar marcas conhecidas
  if (!marcaPaineis) {
    const brandsMod = [
      'Canadian Solar',
      'TSUN Power',
      'TSUN',
      'Jinko Solar',
      'JA Solar',
      'Trina Solar',
      'LONGi Solar',
      'LONGi',
      'Sungrow',
      'Winaico',
      'DAH Solar',
      'Astronergy',
      'Risen',
    ]
    for (const b of brandsMod) {
      if (new RegExp(`\\b${b}\\b`, 'i').test(textFull)) {
        marcaPaineis = b
        break
      }
    }
  }

  // Detectar inversor
  const invMatch =
    desc.match(/(\d+)\s*(?:x|=|\*)\s*Inversor(?: solar)?\s+([^\n,]+)/i) ||
    desc.match(/Inversor(?: solar)?\s+([^\n,]+)/i)

  if (invMatch) {
    if (invMatch.length === 3) {
      qtdInversores = parseInt(invMatch[1], 10) || 1
      marcaInversor = invMatch[2].replace(/Estrutura.*$/i, '').trim()
    } else {
      marcaInversor = invMatch[1].replace(/Estrutura.*$/i, '').trim()
    }
  }

  if (!marcaInversor) {
    const brandsInv = [
      'Growatt 5000',
      'Growatt',
      'Sungrow 10kW',
      'Sungrow 7,5WP',
      'Sungrow',
      'AUXSOL',
      '5KW AUXSOL',
      'Huawei',
      'Deye',
      'Solis',
      'Sofar',
      'Hoymiles',
      'Fronius',
      'WEG',
      'Intelbras',
      'SAJ',
      'PHB',
    ]
    for (const b of brandsInv) {
      if (new RegExp(b, 'i').test(textFull)) {
        marcaInversor = b
        break
      }
    }
  }

  // Se não achou potW pelo regex de módulo, tentar achar potW geral e deduzir painéis
  if (!potW) {
    const potMatch = textFull.match(/(\d{3,4})\s*W(?:p)?/i)
    if (potMatch) {
      potW = parseInt(potMatch[1], 10) || 0
    }
  }

  if (qtdPaineis === 0 && kit.potencia_kw && potW > 0) {
    qtdPaineis = Math.round((kit.potencia_kw * 1000) / potW)
  }

  // Se ainda assim não achou potW, mas temos a potência pico do kit
  if (qtdPaineis === 0 && kit.potencia_kw && kit.potencia_kw > 0) {
    potW = 610
    qtdPaineis = Math.max(1, Math.round((kit.potencia_kw * 1000) / 610))
  }

  // Consideramos compatível com pré-pronto se conseguimos extrair quantidade de painéis > 0 e potência > 0
  const isPrePronto = qtdPaineis > 0 && potW > 0

  return {
    isPrePronto,
    qtdPaineis: qtdPaineis || 10,
    potenciaPainelW: potW || 610,
    marcaPaineis: marcaPaineis || (fab ? fab.split('/')[0]?.trim() : '') || 'Canadian Solar',
    qtdInversores: qtdInversores || 1,
    marcaInversor:
      marcaInversor ||
      (fab ? (fab.split('/')[1] || fab.split('/')[0])?.trim() : '') ||
      'Growatt 5000',
    stringBox,
  }
}
