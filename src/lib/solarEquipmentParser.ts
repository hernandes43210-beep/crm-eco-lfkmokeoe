import type { Proposta, Kit, Lead } from '@/types/crm'
import {
  calcularEconomiaMensal,
  calcularGeracaoMensalKwh,
  TARIFA_ENERGIA_KWH,
  PARCELA_COMPENSADA_PERCENTUAL,
} from './solarUtils'

export interface SolarEquipmentExtracted {
  modulos: string
  inversor: string
  potenciaKw?: number
  potenciaDisplay: string
  economiaMensal?: number
  economiaDisplay: string
  inversorPotenciaKw?: number
}

/**
 * Extrai a potência nominal do inversor em kW a partir de texto (descrição, modelo ou fabricante).
 * Trata:
 * - Padrões explícitos: "5 kW", "5.0 kW", "7,5 kW", "10KW" (vírgula e ponto decimal)
 * - Modelos com KTL/RT/RS/K: SG5KTL-MT, SG5.0RT, SUN2000-5KTL-L1, MAC 50KTL3-X, MID 20KTL, SOFAR 5KTL, DEYE 5K
 * - Modelos em watts: SUN2000-5000, Growatt 5000, MIC 3000TL-X, MIN 5000TL-X, 5000W (divide por 1000 quando entre 1000 e 100000)
 * NUNCA retorna potência do kit.
 */
export function extrairPotenciaInversorTexto(texto?: string | null): number | undefined {
  if (!texto) return undefined
  const raw = String(texto).trim()
  if (!raw) return undefined

  // 1. Padrão explícito em kW: "5 kW", "5.0 kW", "7,5 kW", "10KW", "7.5kW"
  const matchKw = raw.match(/(?:^|[^\w.,])(\d+(?:[.,]\d+)?)\s*k\s*w(?!\w)/i)
  if (matchKw) {
    const val = parseFloat(matchKw[1].replace(',', '.'))
    if (!isNaN(val) && val > 0 && val <= 500) {
      return val
    }
  }

  // 2. Modelos com KTL, RT ou RS grudados no número:
  // Ex: SG5KTL, SG5.0RT, SG10RT, SUN2000-5KTL-L1, SUN2000-10KTL, MAC 50KTL3-X, MID 20KTL3-X, SOFAR 5KTLM
  const matchKtl = raw.match(
    /(?:^|[^\d,.-])(\d+(?:[.,]\d+)?)\s*(?:KTL[A-Za-z0-9_-]*|RT[A-Za-z0-9_-]*|RS[A-Za-z0-9_-]*)/i,
  )
  if (matchKtl) {
    const val = parseFloat(matchKtl[1].replace(',', '.'))
    if (!isNaN(val) && val > 0 && val <= 500) {
      return val
    }
  }

  // Modelos com K isolado ou antes de delimitador (ex: SUN-5K, DEYE 5K, FOX 5K, SG5K)
  const matchK = raw.match(/(?:^|[^\d,.-])(\d+(?:[.,]\d+)?)\s*K(?=[-_/\s]|$)(?![A-Za-z0-9])/i)
  if (matchK) {
    const val = parseFloat(matchK[1].replace(',', '.'))
    if (!isNaN(val) && val > 0 && val <= 500) {
      return val
    }
  }

  // 3. Padrões em watts com sufixo TL: MIC 3000TL-X, MIN 5000TL-X (3000 -> 3 kW, 5000 -> 5 kW)
  const matchTl = raw.match(/(?:^|[^\d,.-])(\d{4,5})\s*TL/i)
  if (matchTl) {
    const num = parseInt(matchTl[1], 10)
    if (num >= 1000 && num <= 100000) {
      return num / 1000
    }
  }

  // Watts explícitos em inversor: 5000W, 3000 W
  const matchWatts = raw.match(/(?:^|[^\d,.-])(\d{4,5})\s*W\b/i)
  if (matchWatts) {
    const num = parseInt(matchWatts[1], 10)
    if (num >= 1000 && num <= 100000) {
      return num / 1000
    }
  }

  // Marca seguida de número de watts: Growatt 5000, SUN2000-5000, PHB 3000
  const matchBrandWatts = raw.match(
    /(?:SUN2000[-_\s]+|GROWATT[-_\s]+|PHB[-_\s]+|DEYE[-_\s]+|SOFAR[-_\s]+)(\d{4,5})\b/i,
  )
  if (matchBrandWatts) {
    const num = parseInt(matchBrandWatts[1], 10)
    if (num >= 1000 && num <= 100000) {
      return num / 1000
    }
  }

  // 4 a 5 dígitos genéricos em texto de inversor (excluindo voltagem como 1000V e o prefixo SUN2000)
  const matchGenericWatts = raw.match(/(?:^|[^\d])(\d{4,5})(?!\s*V(?:DC|AC)?\b)/i)
  if (matchGenericWatts) {
    const num = parseInt(matchGenericWatts[1], 10)
    const isSun2000Prefix = /SUN2000/i.test(raw) && num === 2000
    if (!isSun2000Prefix && num >= 1000 && num <= 100000) {
      return num / 1000
    }
  }

  return undefined
}

/**
 * Normaliza e formata string de potência em kWp para exibição
 */
export function formatPotenciaDisplay(kw?: number | string | null): string {
  if (kw === undefined || kw === null || kw === '') return ''
  const str = String(kw).trim()
  if (/kwp/i.test(str)) {
    return str.toUpperCase().replace(/\s*KWP/i, ' KWp')
  }
  const num = Number(str.replace(',', '.'))
  if (!isNaN(num) && num > 0) {
    const formatted = num.toLocaleString('pt-BR', {
      minimumFractionDigits: Number.isInteger(num) ? 1 : 1,
      maximumFractionDigits: 2,
    })
    return `${formatted} KWp`
  }
  return str ? `${str} KWp` : ''
}

/**
 * Normaliza e formata valor de economia mensal para exibição na pílula
 */
export function formatEconomiaDisplay(value?: number | string | null): string {
  if (value === undefined || value === null || value === '') return ''
  const str = String(value).trim()
  if (/r\$/i.test(str) || /mês/i.test(str)) {
    return str.startsWith('Economia') ? str : `Economia ${str}`
  }
  const cleaned = str.replace(/[^\d.,]/g, '').replace(',', '.')
  const num = Number(cleaned)
  if (!isNaN(num) && num > 0) {
    return `Economia +${Math.round(num)} R$/Mês`
  }
  return str ? `Economia ${str}` : ''
}

/**
 * Analisa a descrição detalhada do kit (típica do distribuidor/orçamento)
 * Ex: "22= MODULO BIFACIAL 132 CEL. N TYPE 630W BLACK FRAME CABO 0.30M TSUN POWERMFTB-0.3-BF-132-630W 01= INVERSOR DE CORRENTE MONOFASICO 3MPPT 220V 10KW SUNGROWINVSG-MO-220V-10KW..."
 */
function extractFromDescription(desc: string): { modulos?: string; inversor?: string } {
  if (!desc) return {}
  let modulos: string | undefined
  let inversor: string | undefined

  // Quebrar por quebra de linha ou delimitador de itens
  const lines = desc
    .split(/\r?\n|\b\d+=\s*/i)
    .map((s) => s.trim())
    .filter(Boolean)

  for (const line of lines) {
    const upper = line.toUpperCase()

    // Identificar módulos
    if (
      !modulos &&
      (upper.includes('MODULO') ||
        upper.includes('MÓDULO') ||
        upper.includes('PAINEL') ||
        upper.includes('PLACA'))
    ) {
      // Ex: MODULO BIFACIAL 132 CEL. N TYPE 630W BLACK FRAME CABO 0.30M TSUN POWER
      // Tentar capturar fabricante e potência em W
      const potMatch = line.match(/(\d{3,4})\s*W(?:P)?/i)
      const pot = potMatch ? `${potMatch[1]} Wp` : ''

      let brand = ''
      if (/TSUN/i.test(line)) brand = 'TSUN'
      else if (/SUNGROW/i.test(line)) brand = 'Sungrow'
      else if (/CANADIAN/i.test(line)) brand = 'Canadian Solar'
      else if (/JINKO/i.test(line)) brand = 'Jinko Solar'
      else if (/JA\s+SOLAR/i.test(line)) brand = 'JA Solar'
      else if (/TRINA/i.test(line)) brand = 'Trina Solar'
      else if (/LONGI/i.test(line)) brand = 'LONGi'
      else if (/RISEN/i.test(line)) brand = 'Risen'
      else if (/WINAICO/i.test(line)) brand = 'Winaico'
      else if (/DAH/i.test(line)) brand = 'DAH Solar'
      else if (/OSDA/i.test(line)) brand = 'OSDA'

      if (brand && pot) {
        modulos = `Módulos ${brand} ${pot}`
      } else if (brand) {
        modulos = `Módulos ${brand}`
      } else if (pot) {
        modulos = `Módulos ${pot}`
      } else {
        const cleanShort = line
          .replace(/^(?:\d+=\s*)?(?:MODULO|MÓDULO)\s+/i, '')
          .split(/\s{2,}|CABO|BLACK/i)[0]
          .trim()
        if (cleanShort) {
          modulos = `Módulos ${cleanShort}`
        }
      }
    }

    // Identificar inversor
    if (!inversor && (upper.includes('INVERSOR') || upper.includes('MICROINVERSOR'))) {
      // Extração robusta de potência nominal do inversor (kW, KTL, W)
      const potKw = extrairPotenciaInversorTexto(line)
      let pot = ''
      if (potKw !== undefined) {
        pot = `${String(potKw).replace('.', ',')} kW`
      } else {
        const potMatch = line.match(/(\d+(?:[.,]\d+)?)\s*KW\b/i)
        if (potMatch) {
          pot = `${potMatch[1].replace('.', ',')} kW`
        }
      }

      let brand = ''
      if (/SUNGROW/i.test(line)) brand = 'Sungrow'
      else if (/GROWATT/i.test(line)) brand = 'Growatt'
      else if (/DEYE/i.test(line)) brand = 'Deye'
      else if (/HUAWEI/i.test(line)) brand = 'Huawei'
      else if (/SOLIS/i.test(line)) brand = 'Solis'
      else if (/SOFAR/i.test(line)) brand = 'Sofar'
      else if (/HOYMILES/i.test(line)) brand = 'Hoymiles'
      else if (/SAJ/i.test(line)) brand = 'SAJ'
      else if (/FRONIUS/i.test(line)) brand = 'Fronius'
      else if (/WEG/i.test(line)) brand = 'WEG'
      else if (/INTELBRAS/i.test(line)) brand = 'Intelbras'
      else if (/PHB/i.test(line)) brand = 'PHB'
      else if (/TSUN/i.test(line)) brand = 'TSUN'
      else if (/FOX/i.test(line)) brand = 'FoxESS'

      if (brand && pot) {
        inversor = `Inversor ${brand} ${pot}`
      } else if (brand) {
        inversor = `Inversor ${brand}`
      } else if (pot) {
        inversor = `Inversor ${pot}`
      } else {
        const cleanShort = line
          .replace(/^(?:\d+=\s*)?INVERSOR(?:\s+DE\s+CORRENTE)?\s+/i, '')
          .split(/\s{2,}|MONOFASICO|TRIFASICO/i)[0]
          .trim()
        if (cleanShort) {
          inversor = `Inversor ${cleanShort}`
        }
      }
    }
  }

  return { modulos, inversor }
}

/**
 * Analisa pares de marcas no campo fabricante (ex: "Canadian Solar / Growatt", "Sungrow/TSUN", "TSUN 630/ SUNGROW")
 */
function parseFabricantePair(fab: string): { modulos?: string; inversor?: string } {
  if (!fab) return {}
  const parts = fab
    .split(/[/;|]/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return {}

  const knownInverters = [
    'GROWATT',
    'DEYE',
    'SUNGROW',
    'HUAWEI',
    'SOLIS',
    'SOFAR',
    'HOYMILES',
    'SAJ',
    'FRONIUS',
    'WEG',
    'INTELBRAS',
    'PHB',
    'TSUN',
    'APSYSTEMS',
  ]

  const knownModules = [
    'CANADIAN',
    'CANADIAN SOLAR',
    'JINKO',
    'JINKO SOLAR',
    'JA SOLAR',
    'TRINA',
    'TRINA SOLAR',
    'LONGI',
    'RISEN',
    'WINAICO',
    'SUNOVA',
    'DAH',
    'DAH SOLAR',
    'OSDA',
    'TSUN',
  ]

  if (parts.length === 1) {
    const single = parts[0]
    const upper = single.toUpperCase()
    const isInverter = knownInverters.some((k) => upper.includes(k)) && !upper.includes('MODULO')
    const isModule = knownModules.some((k) => upper.includes(k))

    if (isInverter && !isModule) {
      return { inversor: single.startsWith('Inversor') ? single : `Inversor ${single}` }
    }
    if (isModule && !isInverter) {
      return { modulos: single.startsWith('Módulos') ? single : `Módulos ${single}` }
    }
    return {
      modulos: single.startsWith('Módulos') ? single : `Módulos ${single}`,
      inversor: single.startsWith('Inversor') ? single : `Inversor ${single}`,
    }
  }

  // Dois ou mais termos: tentar classificar qual é módulo e qual é inversor
  let modPart: string | undefined
  let invPart: string | undefined

  for (const part of parts) {
    const upper = part.toUpperCase()
    if (/MODULO|MÓDULO|PAINEL|PLACA/i.test(part)) {
      modPart = part
      continue
    }
    if (/INVERSOR|MICROINVERSOR/i.test(part)) {
      invPart = part
      continue
    }

    const isKnownInv = knownInverters.some((k) => upper.includes(k))
    const isKnownMod = knownModules.some((k) => upper.includes(k))

    if (isKnownInv && !isKnownMod && !invPart) {
      invPart = part
    } else if (isKnownMod && !isKnownInv && !modPart) {
      modPart = part
    } else if (!modPart) {
      modPart = part
    } else if (!invPart) {
      invPart = part
    }
  }

  // Se a ordem clássica do CRM for "Módulos / Inversor"
  if (!modPart && parts[0]) modPart = parts[0]
  if (!invPart && parts[1]) invPart = parts[1]

  const formatMod = (m?: string) => {
    if (!m) return undefined
    const clean = m.trim().replace(/^módulos?\s+/i, '')
    return `Módulos ${clean}`
  }

  const formatInv = (i?: string) => {
    if (!i) return undefined
    const clean = i.trim().replace(/^inversor\s+/i, '')
    return `Inversor ${clean}`
  }

  return {
    modulos: formatMod(modPart),
    inversor: formatInv(invPart),
  }
}

/**
 * Extrai a melhor representação de equipamentos (Módulos e Inversor), potência e economia
 * a partir das propostas e do lead vinculado.
 *
 * Regras:
 * - Prioriza proposta 'Aceita', senão a mais recente (primeira na lista ordenada por -created).
 * - Se não houver proposta vinculada nem kit, retorna strings vazias (sem fallbacks genéricos de exemplo).
 */
export function extractSolarEquipmentFromProposal(
  propostas: Proposta[] = [],
  lead?: Lead | null,
): SolarEquipmentExtracted {
  // 1. Proposta prioritária: 'Aceita' ou a mais recente
  const primaryProposal = propostas.find((p) => p.status === 'Aceita') || propostas[0] || null
  const kitExpanded = (primaryProposal?.expand?.kit as Kit | undefined) || null

  let modulos = ''
  let inversor = ''

  // Prioridade 0: Campos técnicos diretos do kit (kit manual ou catalogado)
  const directMarcaPainel = (primaryProposal as any)?.kit_marca_painel || kitExpanded?.marca_painel
  const directPotPainelW =
    (primaryProposal as any)?.kit_potencia_painel_w || kitExpanded?.potencia_painel_w
  if (directMarcaPainel && directPotPainelW) {
    modulos = `Módulos ${directMarcaPainel} ${directPotPainelW} Wp`
  } else if (directMarcaPainel) {
    modulos = `Módulos ${directMarcaPainel}`
  }

  const directMarcaInv = (primaryProposal as any)?.kit_marca_inversor || kitExpanded?.marca_inversor
  const directPotInvKw =
    (primaryProposal as any)?.kit_potencia_inversor_kw || kitExpanded?.potencia_inversor_kw
  if (directMarcaInv && directPotInvKw) {
    modulos = modulos || ''
    inversor = `Inversor ${directMarcaInv} ${String(directPotInvKw).replace('.', ',')} kW`
  } else if (directMarcaInv) {
    inversor = `Inversor ${directMarcaInv}`
  }

  // Tentativa 1: Analisar descrição técnica do kit expandido ou observações da proposta
  const descCandidate =
    (primaryProposal as any)?.kit_descricao ||
    kitExpanded?.descricao ||
    primaryProposal?.observacoes ||
    ''
  if (descCandidate && (!modulos || !inversor)) {
    const fromDesc = extractFromDescription(descCandidate)
    if (fromDesc.modulos) modulos = fromDesc.modulos
    if (fromDesc.inversor) inversor = fromDesc.inversor
  }

  // Tentativa 2: Campo kit_fabricante da proposta ou fabricante do kit expandido
  const fabricanteRaw = (primaryProposal?.kit_fabricante || kitExpanded?.fabricante || '').trim()
  if (fabricanteRaw && (!modulos || !inversor)) {
    const fromFab = parseFabricantePair(fabricanteRaw)
    if (!modulos && fromFab.modulos) modulos = fromFab.modulos
    if (!inversor && fromFab.inversor) inversor = fromFab.inversor
  }

  // Tentativa 3: Se ainda faltar módulo ou inversor, tentar extrair do kit_nome
  const kitNomeRaw = (primaryProposal?.kit_nome || kitExpanded?.nome || '').trim()
  if (kitNomeRaw && (!modulos || !inversor)) {
    const fromName = parseFabricantePair(kitNomeRaw)
    if (!modulos && fromName.modulos) modulos = fromName.modulos
    if (!inversor && fromName.inversor) inversor = fromName.inversor
  }

  // Se após todas as tentativas ainda faltar algum campo mas temos o kit_nome descritivo
  if (!modulos && primaryProposal?.kit_fabricante) {
    modulos = `Módulos ${primaryProposal.kit_fabricante}`
  } else if (!modulos && primaryProposal?.kit_nome) {
    modulos = `Módulos ${primaryProposal.kit_nome}`
  }

  if (!inversor && primaryProposal?.kit_fabricante) {
    inversor = `Inversor ${primaryProposal.kit_fabricante}`
  }

  // Resolver potência nominal isolada do inversor (nunca a potência do kit)
  let resolvedPotInversorKw: number | undefined
  if (directPotInvKw && Number(directPotInvKw) > 0) {
    resolvedPotInversorKw = Number(directPotInvKw)
  } else {
    // Tenta extrair potência nominal do inversor a partir do texto do inversor ou das descrições
    const fromInversorText = extrairPotenciaInversorTexto(inversor)
    const fromDescText = extrairPotenciaInversorTexto(descCandidate)
    resolvedPotInversorKw = fromInversorText || fromDescText || undefined
  }

  // Se temos a marca do inversor mas a string do inversor não continha potência e conseguimos extrair:
  if (inversor && resolvedPotInversorKw && !/\d+(?:[.,]\d+)?\s*kW/i.test(inversor)) {
    inversor = `${inversor} ${String(resolvedPotInversorKw).replace('.', ',')} kW`
  }

  // Potência total do gerador/kit (kWp) - NUNCA atribuída ao inversor
  const potVal = primaryProposal?.kit_potencia_kw ?? kitExpanded?.potencia_kw ?? undefined

  const potenciaKw = potVal && Number(potVal) > 0 ? Number(potVal) : undefined
  const potenciaDisplay = formatPotenciaDisplay(potenciaKw)

  // Economia Mensal (R$/mês)
  // Calculada com base na proposta/orçamento real do lead:
  // Se o lead tem consumo informado: Consumo (kWh) × R$ 1,15 × 85%
  // Ou com base na potência do kit: Geração mensal estimada (kWp × 4,6 × 0,80 × 30) × R$ 1,15 × 85%
  let economiaCalculada: number | undefined
  const consumoLead = lead?.consumo_mensal_kwh || 0

  if (consumoLead > 0) {
    economiaCalculada = Math.round(calcularEconomiaMensal(consumoLead))
  } else if (potenciaKw && potenciaKw > 0) {
    const geracaoEstimadaKwh = calcularGeracaoMensalKwh(potenciaKw)
    economiaCalculada = Math.round(
      geracaoEstimadaKwh * TARIFA_ENERGIA_KWH * PARCELA_COMPENSADA_PERCENTUAL,
    )
  }

  const economiaDisplay = formatEconomiaDisplay(economiaCalculada)

  return {
    modulos: modulos.trim(),
    inversor: inversor.trim(),
    potenciaKw,
    potenciaDisplay,
    economiaMensal: economiaCalculada,
    economiaDisplay,
    inversorPotenciaKw: resolvedPotInversorKw,
  }
}
