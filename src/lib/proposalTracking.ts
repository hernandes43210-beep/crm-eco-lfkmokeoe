import { formatDateTimeBR, formatDateBR } from './solarUtils'
import type { Proposta, PropostaAcessoItem } from '@/types/crm'

export interface VisualizacaoItemFormatada {
  dataIso: string
  formatado: string
  relativo: string
  ip?: string
  origem?: string
}

export interface ProposalTrackingInfo {
  total: number
  hasViewed: boolean
  primeiraEm?: string
  ultimaEm?: string
  primeiraFormatada?: string
  ultimaFormatada?: string
  ultimaRelativa?: string
  historico: VisualizacaoItemFormatada[]
}

/**
 * Retorna texto relativo amigável em português (pt-BR):
 * "hoje às 14:32", "ontem às 09:15", ou "12/03 às 14:32" / "12/03/2026 às 14:32"
 */
export function formatRelativeDateTimePT(dateInput?: string | Date | null): string {
  if (!dateInput) return ''
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return ''

    const agora = new Date()
    const hojeZero = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
    const dataZero = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    const diffDias = Math.round((hojeZero.getTime() - dataZero.getTime()) / (1000 * 60 * 60 * 24))

    const horaStr = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)

    if (diffDias === 0) {
      return `hoje às ${horaStr}`
    } else if (diffDias === 1) {
      return `ontem às ${horaStr}`
    } else if (diffDias > 1 && diffDias < 7) {
      const diaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(d)
      return `${diaSemana} às ${horaStr}`
    } else if (d.getFullYear() === agora.getFullYear()) {
      const diaMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(
        d,
      )
      return `${diaMes} às ${horaStr}`
    } else {
      return `${formatDateBR(d.toISOString())} às ${horaStr}`
    }
  } catch {
    return ''
  }
}

/**
 * Extrai e consolida a lista de timestamps/acessos da proposta
 */
export function extractProposalTracking(proposta: Partial<Proposta>): ProposalTrackingInfo {
  const total = Number(proposta.visualizacoes_count) || 0
  const hasViewed = total > 0 || Boolean(proposta.ultima_visualizacao)

  const itemsMap = new Map<string, VisualizacaoItemFormatada>()

  // 1. Tentar de visualizacoes_historico (array de ISO timestamps)
  let rawVis = proposta.visualizacoes_historico
  if (typeof rawVis === 'string') {
    try {
      rawVis = JSON.parse(rawVis)
    } catch {
      rawVis = []
    }
  }
  if (Array.isArray(rawVis)) {
    for (const entry of rawVis) {
      const iso = typeof entry === 'string' ? entry : (entry as any)?.data
      if (iso && typeof iso === 'string') {
        const d = new Date(iso)
        if (!isNaN(d.getTime())) {
          itemsMap.set(d.toISOString(), {
            dataIso: d.toISOString(),
            formatado: formatDateTimeBR(d.toISOString()),
            relativo: formatRelativeDateTimePT(d),
          })
        }
      }
    }
  }

  // 2. Tentar de historico_acessos (array de objetos { data, ip, origem })
  let rawAcessos = proposta.historico_acessos
  if (typeof rawAcessos === 'string') {
    try {
      rawAcessos = JSON.parse(rawAcessos)
    } catch {
      rawAcessos = []
    }
  }
  if (Array.isArray(rawAcessos)) {
    for (const item of rawAcessos as PropostaAcessoItem[]) {
      if (item && item.data) {
        const d = new Date(item.data)
        if (!isNaN(d.getTime())) {
          const iso = d.toISOString()
          const existing = itemsMap.get(iso) || {
            dataIso: iso,
            formatado: formatDateTimeBR(iso),
            relativo: formatRelativeDateTimePT(d),
          }
          if (item.ip) existing.ip = item.ip
          if (item.origem) existing.origem = item.origem
          itemsMap.set(iso, existing)
        }
      }
    }
  }

  // 3. Fallback: Se não encontrou no histórico mas tem primeira_visualizacao / ultima_visualizacao
  if (proposta.primeira_visualizacao) {
    const d = new Date(proposta.primeira_visualizacao)
    if (!isNaN(d.getTime())) {
      const iso = d.toISOString()
      if (!itemsMap.has(iso)) {
        itemsMap.set(iso, {
          dataIso: iso,
          formatado: formatDateTimeBR(iso),
          relativo: formatRelativeDateTimePT(d),
        })
      }
    }
  }

  if (proposta.ultima_visualizacao) {
    const d = new Date(proposta.ultima_visualizacao)
    if (!isNaN(d.getTime())) {
      const iso = d.toISOString()
      if (!itemsMap.has(iso)) {
        itemsMap.set(iso, {
          dataIso: iso,
          formatado: formatDateTimeBR(iso),
          relativo: formatRelativeDateTimePT(d),
          ip: proposta.ultimo_ip_visualizacao,
        })
      }
    }
  }

  // Ordenar decrescente (mais recente primeiro)
  const sorted = Array.from(itemsMap.values()).sort(
    (a, b) => new Date(b.dataIso).getTime() - new Date(a.dataIso).getTime(),
  )

  const ultimaIso = proposta.ultima_visualizacao || sorted[0]?.dataIso
  const primeiraIso = proposta.primeira_visualizacao || sorted[sorted.length - 1]?.dataIso

  return {
    total: Math.max(total, sorted.length),
    hasViewed: hasViewed || sorted.length > 0,
    primeiraEm: primeiraIso,
    ultimaEm: ultimaIso,
    primeiraFormatada: primeiraIso ? formatDateTimeBR(primeiraIso) : undefined,
    ultimaFormatada: ultimaIso ? formatDateTimeBR(ultimaIso) : undefined,
    ultimaRelativa: ultimaIso ? formatRelativeDateTimePT(ultimaIso) : undefined,
    historico: sorted,
  }
}
