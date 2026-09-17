/**
 * Utilitários para cálculo e exibição da margem real do negócio.
 *
 * Conceito:
 * - Margem em R$ (Lucro Bruto da Venda):
 *     margemReais = precoVenda - custo
 * - Margem sobre a Venda (% da receita que vira margem bruta):
 *     margemPercentualVenda = (margemReais / precoVenda) * 100
 * - Margem sobre o Custo / Markup (% sobre o custo):
 *     margemPercentualCusto = (margemReais / custo) * 100
 *
 * Na precificação solar da Ecosolar:
 *   preco_venda = custo / (1 - margem/100)
 *   o que equivale à margem sobre a venda (gross margin).
 *
 * Limiares de saúde da margem comercial:
 * - Saudável: >= 15% (Verde)
 * - Apertada / Alerta: >= 5% e < 15% (Amarelo / Âmbar)
 * - Prejuízo / Risco: < 5% (Vermelho)
 */

export const MARGEM_LIMIAR_SAUDAVEL = 15 // >= 15%
export const MARGEM_LIMIAR_APERTADA = 5 // >= 5% e < 15%

export type MargemStatusNivel = 'saudavel' | 'apertada' | 'prejuizo'

export interface MargemStatusInfo {
  nivel: MargemStatusNivel
  label: string
  descricao: string
  badgeClass: string
  textClass: string
  borderClass: string
  bgClass: string
  dotClass: string
}

export interface MargemRealResult {
  custo: number
  precoVenda: number
  margemReais: number
  /** % de margem sobre o preço de venda: (margemReais / precoVenda) * 100 */
  margemPercentual: number
  /** % de markup sobre o custo: (margemReais / custo) * 100 */
  markupPercentual: number
  isPrejuizo: boolean
  isApertada: boolean
  isSaudavel: boolean
  status: MargemStatusInfo
  /** Texto formatado ex: "R$ 4.500,00 (30,0%)" */
  formatado: string
}

/**
 * Avalia o nível de saúde financeira da margem da negociação.
 */
export function getMargemStatusInfo(margemPercentual: number): MargemStatusInfo {
  if (margemPercentual >= MARGEM_LIMIAR_SAUDAVEL) {
    return {
      nivel: 'saudavel',
      label: 'Margem Saudável',
      descricao: 'Excelente rentabilidade comercial para a empresa.',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      textClass: 'text-emerald-700',
      borderClass: 'border-emerald-300',
      bgClass: 'bg-emerald-50/70',
      dotClass: 'bg-emerald-500',
    }
  }

  if (margemPercentual >= MARGEM_LIMIAR_APERTADA) {
    return {
      nivel: 'apertada',
      label: 'Margem Apertada',
      descricao: 'Atenção: desconto elevado reduzindo o retorno da operação.',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      textClass: 'text-amber-800',
      borderClass: 'border-amber-300',
      bgClass: 'bg-amber-50/70',
      dotClass: 'bg-amber-500',
    }
  }

  return {
    nivel: 'prejuizo',
    label: 'Atenção: Risco de Prejuízo',
    descricao: 'Margem crítica ou negativa. O valor negociado mal cobre os custos do kit.',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-300',
    bgClass: 'bg-rose-50/70',
    dotClass: 'bg-rose-500',
  }
}

/**
 * Calcula a margem real de uma negociação ou kit.
 *
 * @param precoVenda Valor final comercial cobrado do cliente (após desconto, se houver)
 * @param custo Custo do kit solar
 */
export function calcularMargemReal(
  precoVenda: number | string | null | undefined,
  custo: number | string | null | undefined,
): MargemRealResult {
  const numPreco =
    typeof precoVenda === 'string'
      ? parseFloat(precoVenda.replace(',', '.')) || 0
      : Number(precoVenda) || 0
  const numCusto =
    typeof custo === 'string' ? parseFloat(custo.replace(',', '.')) || 0 : Number(custo) || 0

  const margemReais = Math.round((numPreco - numCusto) * 100) / 100

  // Se não houver preço de venda positivo, margem é zero ou 100% negativa
  let margemPercentual = 0
  if (numPreco > 0) {
    margemPercentual = Math.round((margemReais / numPreco) * 100 * 10) / 10
  } else if (numCusto > 0) {
    margemPercentual = -100
  }

  let markupPercentual = 0
  if (numCusto > 0) {
    markupPercentual = Math.round((margemReais / numCusto) * 100 * 10) / 10
  }

  const isPrejuizo = margemPercentual < MARGEM_LIMIAR_APERTADA
  const isApertada =
    margemPercentual >= MARGEM_LIMIAR_APERTADA && margemPercentual < MARGEM_LIMIAR_SAUDAVEL
  const isSaudavel = margemPercentual >= MARGEM_LIMIAR_SAUDAVEL

  const status = getMargemStatusInfo(margemPercentual)

  const numFormat = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(margemReais)

  const pctFormat = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(margemPercentual)

  return {
    custo: numCusto,
    precoVenda: numPreco,
    margemReais,
    margemPercentual,
    markupPercentual,
    isPrejuizo,
    isApertada,
    isSaudavel,
    status,
    formatado: `${numFormat} (${pctFormat}%)`,
  }
}
