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
      // Ex: INVERSOR DE CORRENTE MONOFASICO 3MPPT 220V 10KW SUNGROWINVSG-MO-220V-10KW
      const potMatch = line.match(/(\d+(?:[.,]\d+)?)\s*(KW|W(?:P)?)/i)
      let pot = ''
      if (potMatch) {
        const val = potMatch[1]
        const unit = potMatch[2].toUpperCase()
        pot = unit.startsWith('KW') ? `${val} kW` : `${val} Wp`
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

  // Tentativa 1: Analisar descrição técnica do kit expandido ou observações da proposta
  const descCandidate = kitExpanded?.descricao || primaryProposal?.observacoes || ''
  if (descCandidate) {
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

  // Potência (kWp)
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
  }
}
