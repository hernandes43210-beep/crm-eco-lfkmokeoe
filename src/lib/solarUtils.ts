export function formatBRL(value?: number | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00'
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatNumberBR(value?: number | null, decimals = 0): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0'
  }
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d)
  } catch (_) {
    return '-'
  }
}

export function formatDateTimeBR(dateStr?: string | null): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch (_) {
    return '-'
  }
}

export interface SLAStatusInfo {
  state: 'ok' | 'warning' | 'overdue'
  label: string
  shortLabel: string
  daysDiff: number
  isOverdue: boolean
  chipClass: string
  badgeClass: string
}

export function computeSLAStatus(
  slaLimite?: string | null,
  status?: string,
  statusQualificacao?: string,
): SLAStatusInfo {
  if (statusQualificacao === 'aguardando') {
    return {
      state: 'ok',
      label: 'Aguardando Qualificação',
      shortLabel: 'Aguardando',
      daysDiff: 0,
      isOverdue: false,
      chipClass: 'bg-amber-50 text-amber-800 border-amber-300 font-medium',
      badgeClass: 'bg-amber-500',
    }
  }

  if (statusQualificacao === 'descartado') {
    return {
      state: 'ok',
      label: 'Descartado',
      shortLabel: 'Descartado',
      daysDiff: 0,
      isOverdue: false,
      chipClass: 'bg-slate-100 text-slate-500 border-slate-200 line-through',
      badgeClass: 'bg-slate-400',
    }
  }

  if (status === 'Fechado Ganho' || status === 'Fechado Perdido') {
    return {
      state: 'ok',
      label: 'Concluído',
      shortLabel: 'Concluído',
      daysDiff: 0,
      isOverdue: false,
      chipClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeClass: 'bg-emerald-500',
    }
  }

  if (!slaLimite) {
    return {
      state: 'ok',
      label: 'Sem prazo',
      shortLabel: 'Sem prazo',
      daysDiff: 99,
      isOverdue: false,
      chipClass: 'bg-slate-100 text-slate-600 border-slate-200',
      badgeClass: 'bg-slate-400',
    }
  }

  const deadline = new Date(slaLimite).getTime()
  const now = Date.now()
  const diffMs = deadline - now
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs < 0) {
    const overdueDays = Math.abs(diffDays) || 1
    return {
      state: 'overdue',
      label: `Em atraso • ${overdueDays}d`,
      shortLabel: `${overdueDays}d atrasado`,
      daysDiff: diffDays,
      isOverdue: true,
      chipClass: 'bg-red-50 text-red-700 border-red-200 font-semibold animate-pulse-subtle',
      badgeClass: 'bg-red-500',
    }
  }

  // Less than 48 hours remaining
  if (diffHours <= 48) {
    return {
      state: 'warning',
      label: `Atenção • ${Math.max(1, diffDays)}d restantes`,
      shortLabel: `${Math.max(1, diffDays)}d restantes`,
      daysDiff: diffDays,
      isOverdue: false,
      chipClass: 'bg-amber-50 text-amber-800 border-amber-300 font-medium',
      badgeClass: 'bg-amber-500',
    }
  }

  return {
    state: 'ok',
    label: `No prazo • ${diffDays}d`,
    shortLabel: `${diffDays}d`,
    daysDiff: diffDays,
    isOverdue: false,
    chipClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeClass: 'bg-emerald-500',
  }
}

export function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'Novo':
      return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
    case 'Contato Feito':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'
    case 'Proposta Enviada':
      return 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
    case 'Negociação':
      return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
    case 'Fechado Ganho':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-semibold'
    case 'Fechado Perdido':
      return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}
