import type { HomologacaoLead } from '@/types/crm'

export interface ProjetoPagamentoItem {
  id: string
  /** Nome exibido: cliente do projeto (nunca valores monetários). */
  nome: string
  pago: boolean
  /**
   * Pendente: dias desde o envio do projeto para a engenharia (criação do registro).
   * Pago: dias desde a marcação do pagamento.
   */
  dias: number
  /** Data ISO da marcação de pagamento (quando pago). */
  pagoEm?: string
  /** Data ISO de referência do contador (criação do registro). */
  referencia?: string
  /** Nome do engenheiro responsável (preenchido pela UI, opcional). */
  engenheiroNome?: string
}

/** Um dia em milissegundos. */
const UM_DIA_MS = 24 * 60 * 60 * 1000

/**
 * Conta dias completos entre duas datas, desconsiderando o horário
 * (compara meia-noite com meia-noite para "há 12 dias" bater com o calendário).
 */
export function contarDiasAte(dataISO: string, agora: Date = new Date()): number {
  const alvo = new Date(dataISO)
  if (isNaN(alvo.getTime())) return 0
  const inicioAlvo = new Date(alvo.getFullYear(), alvo.getMonth(), alvo.getDate()).getTime()
  const inicioAgora = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime()
  return Math.max(0, Math.round((inicioAgora - inicioAlvo) / UM_DIA_MS))
}

/** Nome do cliente do projeto: campo direto da homologação ou nome do lead vinculado. */
export function nomeClienteProjeto(hom: HomologacaoLead): string {
  return hom.cliente_nome?.trim() || hom.expand?.lead?.nome?.trim() || 'Cliente sem nome'
}

/**
 * Separa as homologações em "Projetos Pagos" e "Pagamento Pendente".
 * - Pendentes: ordenados do mais antigo para o mais novo (mais dias aguardando primeiro).
 * - Pagos: ordenados do pagamento mais recente para o mais antigo.
 * Nenhuma informação monetária é retornada — apenas nomes e datas.
 */
export function separarProjetosPorPagamento(
  homologacoes: HomologacaoLead[],
  agora: Date = new Date(),
): { pagos: ProjetoPagamentoItem[]; pendentes: ProjetoPagamentoItem[] } {
  const pagos: ProjetoPagamentoItem[] = []
  const pendentes: ProjetoPagamentoItem[] = []

  for (const hom of homologacoes || []) {
    const base: ProjetoPagamentoItem = {
      id: hom.id,
      nome: nomeClienteProjeto(hom),
      pago: false,
      dias: 0,
    }

    if (hom.projeto_pago) {
      const pagoEm = hom.projeto_pago_em || hom.updated
      pagos.push({
        ...base,
        pago: true,
        pagoEm,
        dias: pagoEm ? contarDiasAte(pagoEm, agora) : 0,
      })
    } else {
      pendentes.push({
        ...base,
        referencia: hom.created,
        dias: hom.created ? contarDiasAte(hom.created, agora) : 0,
      })
    }
  }

  pendentes.sort((a, b) => b.dias - a.dias)
  pagos.sort((a, b) => {
    const ta = a.pagoEm ? new Date(a.pagoEm).getTime() : 0
    const tb = b.pagoEm ? new Date(b.pagoEm).getTime() : 0
    return tb - ta
  })

  return { pagos, pendentes }
}

/** Texto de contagem de dias em português: "há 12 dias" / "há 1 dia" / "hoje". */
export function textoDias(dias: number): string {
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'há 1 dia'
  return `há ${dias} dias`
}
