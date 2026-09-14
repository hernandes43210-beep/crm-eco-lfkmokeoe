/**
 * Utilitários para o modo de montagem rápida / Kit Pré-Pronto
 */

export const POTENCIAS_COMUNS_PAINEIS = [450, 550, 575, 600, 610, 630, 660, 700] as const

/**
 * Potências sugeridas para inversores em kW
 */
export const POTENCIAS_COMUNS_INVERSORES = [
  3, 4, 5, 6, 7.5, 8, 10, 12, 15, 20, 25, 30, 50, 75, 100,
] as const

/**
 * Formata potência em Watts no padrão brasileiro (ex: "630 W" ou "630 Wp")
 */
export function formatarPotenciaW(
  potenciaW?: number | string | null,
  sufixo: 'W' | 'Wp' = 'W',
): string {
  const num = Number(potenciaW)
  if (!num || isNaN(num) || num <= 0) return ''
  const formatted = num.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return `${formatted} ${sufixo}`
}

/**
 * Formata potência em Quilowatts no padrão brasileiro com vírgula decimal (ex: "7,5 kW")
 */
export function formatarPotenciaKw(potenciaKw?: number | string | null): string {
  const num = Number(potenciaKw)
  if (!num || isNaN(num) || num <= 0) return ''
  const formatted = num.toLocaleString('pt-BR', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  })
  return `${formatted} kW`
}

/**
 * Marcas solicitadas de painéis / módulos:
 * OSDA, DMEGC, TSUN POWER + marcas consolidadas do sistema (Canadian Solar, JA Solar, Jinko, etc.)
 */
export const MARCAS_PAINEIS_SUGERIDAS = [
  'OSDA',
  'DMEGC',
  'TSUN POWER',
  'Canadian Solar',
  'BYD',
  'ELGIN',
  'WEG',
  'JA Solar',
  'Jinko Solar',
  'Trina Solar',
  'Risen',
  'LONGi Solar',
  'Astronergy',
  'DAH Solar',
] as const

/**
 * Marcas solicitadas de inversores solares:
 * Sungrow, HUAWEI, AUSXOL (AUXSOL), PHB, GOODWE + outras comuns (Growatt, Deye, Solis, etc.)
 */
export const MARCAS_INVERSORES_SUGERIDAS = [
  'Sungrow',
  'HUAWEI',
  'AUSXOL',
  'PHB',
  'GOODWE',
  'Growatt',
  'Deye',
  'Solis',
  'Hoymiles',
  'WEG',
  'Fronius',
  'Intelbras',
  'SAJ',
  'Sofar',
] as const

/**
 * Tipos de estrutura solicitados:
 * - Solo monoposte
 * - Mini trilho
 * - Fibrocimento
 */
export const TIPOS_ESTRUTURA_OPCOES = [
  { value: 'solo_monoposte', label: 'Solo monoposte', nomeItem: 'Estrutura de Solo Monoposte' },
  {
    value: 'mini_trilho',
    label: 'Mini trilho',
    nomeItem: 'Estrutura Mini Trilho para Telhado Metálico',
  },
  {
    value: 'fibrocimento',
    label: 'Fibrocimento',
    nomeItem: 'Estrutura de Fixação para Telhado de Fibrocimento',
  },
  {
    value: 'outro',
    label: 'Outro tipo de estrutura',
    nomeItem: 'Estrutura de Fixação Solar Completa',
  },
] as const

export interface MontagemPreProntaState {
  qtdPaineis: number | string
  potenciaPainelW: number | string
  marcaPaineis: string
  qtdInversores: number | string
  marcaInversor: string
  potenciaInversorKw?: number | string
  stringBox?: string
  tipoEstrutura?: string
}

/**
 * Formata o rótulo legível do tipo de estrutura de fixação
 */
export function formatarRotuloEstrutura(val?: string | null): string {
  if (!val) return ''
  const trimmed = val.trim().toLowerCase()
  if (trimmed === 'solo_monoposte' || trimmed === 'solo monoposte') {
    return 'Solo monoposte'
  }
  if (trimmed === 'mini_trilho' || trimmed === 'mini trilho') {
    return 'Mini trilho'
  }
  if (trimmed === 'fibrocimento') {
    return 'Fibrocimento'
  }
  if (trimmed === 'outro') {
    return 'Outra estrutura'
  }
  const match = TIPOS_ESTRUTURA_OPCOES.find(
    (opt) => opt.value === trimmed || opt.label.toLowerCase() === trimmed,
  )
  if (match) return match.label
  return val
}

/**
 * Retorna o nome/descrição técnica do item de estrutura para a composição e contrato
 */
export function formatarNomeItemEstrutura(val?: string | null): {
  nome: string
  especificacao: string
} {
  const rotulo = formatarRotuloEstrutura(val)
  if (!rotulo) {
    return {
      nome: 'Estrutura Completa de Fixação Mecânica',
      especificacao: 'Perfis e suportes em alumínio anodizado e aço inox para fixação dos módulos',
    }
  }

  const rotuloLower = rotulo.toLowerCase()
  if (rotuloLower.includes('solo monoposte')) {
    return {
      nome: 'Estrutura de Solo Monoposte em Aço Galvanizado',
      especificacao:
        'Estrutura de fixação de solo tipo monoposte com alta resistência eólica e fundação dimensionada',
    }
  }
  if (rotuloLower.includes('mini trilho')) {
    return {
      nome: 'Estrutura Mini Trilho em Alumínio Anodizado',
      especificacao:
        'Fixação direta em telha metálica/trapezoidal com mini trilhos de alumínio, parafusos autobrocantes e fita EPDM estanque',
    }
  }
  if (rotuloLower.includes('fibrocimento')) {
    return {
      nome: 'Estrutura de Fixação para Telhado de Fibrocimento',
      especificacao:
        'Parafusos prisioneiros (haste roscada em aço inox) com vedação e perfis de alumínio anodizado',
    }
  }

  return {
    nome: `Estrutura de Fixação (${rotulo})`,
    especificacao:
      'Trilhos, suportes e grampos intermediários/finais em alumínio anodizado e aço inoxidável',
  }
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
 * Sugere o nome comercial do kit a partir dos dados preenchidos,
 * incluindo marcas e o tipo de estrutura selecionado:
 * Ex.: "Kit Solar 6,1 kWp — Canadian Solar + Growatt — Fibrocimento"
 */
export function sugerirNomeKit(params: {
  kwp: number
  marcaPaineis?: string
  marcaInversor?: string
  qtdPaineis?: number | string
  potenciaPainelW?: number | string
  tipoEstrutura?: string
}): string {
  const { kwp, marcaPaineis, marcaInversor, tipoEstrutura } = params

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

  const rotuloEstrutura = formatarRotuloEstrutura(tipoEstrutura)
  const sufixoEstrutura = rotuloEstrutura ? ` — ${rotuloEstrutura}` : ''

  return `Kit Solar ${kwpStr} kWp${sufixoMarcas}${sufixoEstrutura}`
}

/**
 * Atualiza um nome de kit comercial existente com o rótulo da estrutura fornecida.
 * Se o nome já contiver outra estrutura ou a mesma estrutura, substitui de forma limpa.
 * Se não houver estrutura no nome, anexa ao final no padrão consistente " — [Estrutura]".
 */
export function aplicarEstruturaAoNomeKit(
  nomeOriginal: string,
  tipoEstrutura?: string | null,
): string {
  const rotulo = formatarRotuloEstrutura(tipoEstrutura)
  if (!rotulo) return nomeOriginal

  let limpo = (nomeOriginal || '').trim()
  if (!limpo) return ''

  // Lista de rótulos conhecidos de estrutura para remover se já existirem no nome
  // (ex: " — Fibrocimento", " — Solo monoposte", " — Mini trilho", " — Outra estrutura", "-SOLO-", "-TELHADO")
  const rotulosConhecidos = [
    'Solo monoposte',
    'Mini trilho',
    'Fibrocimento',
    'Outra estrutura',
    'Solo Monoposte',
    'Mini Trilho',
  ]

  for (const r of rotulosConhecidos) {
    // Procura " — [r]" ou " - [r]" ou " — [r]" no final ou com traço
    const regexTrailing = new RegExp(`\\s*[—–-]\\s*${r}\\s*$`, 'i')
    limpo = limpo.replace(regexTrailing, '').trim()
  }

  return `${limpo} — ${rotulo}`
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
  potenciaInversorKw?: number | string
  kwp: number
  stringBox?: string
  tipoEstrutura?: string
}): string {
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

  const qP = Number(qtdPaineis) || 0
  const potP = Number(potenciaPainelW) || 0
  const qI = Number(qtdInversores) || 0
  const potInvKw = Number(potenciaInversorKw) || 0

  const linhas: string[] = []

  if (qP > 0 && potP > 0) {
    const nomeMód = marcaPaineis.trim() ? ` (${marcaPaineis.trim()})` : ''
    linhas.push(
      `${qP}x Módulo fotovoltaico ${potP} W${nomeMód} — Total ${kwp.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kWp`,
    )
  }

  const potInvTexto = potInvKw > 0 ? ` ${formatarPotenciaKw(potInvKw)}` : ''
  if (qI > 0 && marcaInversor.trim()) {
    linhas.push(`${qI}x Inversor solar${potInvTexto} ${marcaInversor.trim()}`)
  } else if (marcaInversor.trim()) {
    linhas.push(`Inversor solar${potInvTexto} ${marcaInversor.trim()}`)
  }

  if (stringBox) {
    const rotuloSb = formatarRotuloStringBox(stringBox)
    if (rotuloSb) {
      linhas.push(`1x ${rotuloSb}`)
    }
  }

  const rotuloEstrutura = formatarRotuloEstrutura(tipoEstrutura)
  if (rotuloEstrutura) {
    linhas.push(`Estrutura de fixação: ${rotuloEstrutura}. Cabeamento completo incluso.`)
  } else {
    linhas.push('Estrutura de fixação e cabeamento completo inclusos.')
  }

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
  potenciaInversorKw?: number
  stringBox: string
  tipoEstrutura: string
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
  marca_painel?: string
  marca_inversor?: string
  potencia_painel_w?: number
  potencia_inversor_kw?: number
  tipo_estrutura?: string
}): ExtractedKitComponents {
  const desc = kit.descricao || ''
  const nome = kit.nome || ''
  const fab = kit.fabricante || ''
  const textFull = `${desc}\n${nome}\n${fab}`

  let qtdPaineis = 0
  let potW = kit.potencia_painel_w ? Number(kit.potencia_painel_w) : 0
  let marcaPaineis = kit.marca_painel || ''
  let qtdInversores = 1
  let marcaInversor = kit.marca_inversor || ''
  let potInversorKw = kit.potencia_inversor_kw ? Number(kit.potencia_inversor_kw) : 0
  let stringBox = kit.string_box || ''
  let tipoEstrutura = kit.tipo_estrutura || ''

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
      'OSDA',
      'DMEGC',
      'DMEGG',
      'TSUN Power',
      'TSUN',
      'Canadian Solar',
      'BYD',
      'ELGIN',
      'WEG',
      'Jinko Solar',
      'Jinko',
      'JA Solar',
      'Trina Solar',
      'Trina',
      'LONGi Solar',
      'LONGi',
      'Risen',
      'DAH Solar',
      'Astronergy',
      'Winaico',
      'Sungrow',
    ]
    for (const b of brandsMod) {
      if (new RegExp(`\\b${b}\\b`, 'i').test(textFull)) {
        marcaPaineis = b === 'DMEGG' ? 'DMEGC' : b
        break
      }
    }
  }

  // Detectar inversor e potência do inversor
  const invMatch =
    desc.match(/(\d+)\s*(?:x|=|\*)\s*Inversor(?: solar)?(?:\s+([\d,.]+)\s*k?W)?\s+([^\n,]+)/i) ||
    desc.match(/(\d+)\s*(?:x|=|\*)\s*Inversor(?: solar)?\s+([^\n,]+)/i) ||
    desc.match(/Inversor(?: solar)?(?:\s+([\d,.]+)\s*k?W)?\s+([^\n,]+)/i) ||
    desc.match(/Inversor(?: solar)?\s+([^\n,]+)/i)

  if (invMatch) {
    if (invMatch.length === 4) {
      qtdInversores = parseInt(invMatch[1], 10) || 1
      if (invMatch[2] && !potInversorKw) {
        potInversorKw = parseFloat(invMatch[2].replace(',', '.'))
      }
      marcaInversor = invMatch[3].replace(/Estrutura.*$/i, '').trim()
    } else if (invMatch.length === 3) {
      qtdInversores = parseInt(invMatch[1], 10) || 1
      marcaInversor = invMatch[2].replace(/Estrutura.*$/i, '').trim()
    } else {
      marcaInversor = invMatch[1].replace(/Estrutura.*$/i, '').trim()
    }
  }

  // Tentar extrair potência do inversor caso ainda não detectada
  if (!potInversorKw) {
    // Ex: "Inversor Growatt 7,5kW", "7,5 kW", "Inversor de 7.5kW", "Growatt 5000"
    const potKwMatch =
      desc.match(/inversor[^\n]*?(\d+(?:[.,]\d+)?)\s*(?:k\s*W|kW)/i) ||
      desc.match(
        /(\d+(?:[.,]\d+)?)\s*(?:k\s*W|kW)\s*(?:inversor|auxsol|sungrow|growatt|huawei|phb|goodwe|deye|solis|weg)/i,
      )
    if (potKwMatch) {
      potInversorKw = parseFloat(potKwMatch[1].replace(',', '.'))
    } else {
      // Caso apareça ex: "Growatt 5000" -> 5 kW
      const wMatch =
        desc.match(/inversor[^\n]*?(\d{4,5})\s*W\b/i) || textFull.match(/growatt\s*(\d{4,5})\b/i)
      if (wMatch) {
        potInversorKw = parseFloat(wMatch[1]) / 1000
      }
    }
  }

  if (!marcaInversor) {
    const brandsInv = [
      'Sungrow 10kW',
      'Sungrow 7,5WP',
      'Sungrow',
      'HUAWEI',
      'AUSXOL',
      'AUXSOL',
      '5KW AUXSOL',
      'PHB',
      'GOODWE',
      'Growatt 5000',
      'Growatt',
      'Deye',
      'Solis',
      'Sofar',
      'Hoymiles',
      'Fronius',
      'WEG',
      'Intelbras',
      'SAJ',
    ]
    for (const b of brandsInv) {
      if (new RegExp(b, 'i').test(textFull)) {
        marcaInversor = b
        break
      }
    }
  }

  // Detectar tipo de estrutura se não especificado
  if (!tipoEstrutura) {
    if (/monoposte|solo.*monoposte/i.test(textFull)) {
      tipoEstrutura = 'solo_monoposte'
    } else if (/mini\s*trilho/i.test(textFull)) {
      tipoEstrutura = 'mini_trilho'
    } else if (/fibrocimento/i.test(textFull)) {
      tipoEstrutura = 'fibrocimento'
    } else if (/\bsolo\b/i.test(textFull)) {
      tipoEstrutura = 'solo_monoposte'
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
    potenciaPainelW: potW || (kit.potencia_painel_w ? Number(kit.potencia_painel_w) : 610),
    marcaPaineis: marcaPaineis || (fab ? fab.split('/')[0]?.trim() : '') || 'TSUN POWER',
    qtdInversores: qtdInversores || 1,
    marcaInversor:
      marcaInversor || (fab ? (fab.split('/')[1] || fab.split('/')[0])?.trim() : '') || 'Sungrow',
    potenciaInversorKw:
      potInversorKw ||
      (kit.potencia_inversor_kw
        ? Number(kit.potencia_inversor_kw)
        : kit.potencia_kw
          ? Number(kit.potencia_kw)
          : undefined),
    stringBox,
    tipoEstrutura,
  }
}
