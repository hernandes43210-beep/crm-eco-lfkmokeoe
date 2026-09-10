import { parseNumberSafe } from './leadImport'

export interface SiteFormExtractionInput {
  message?: string | null
  consumo?: string | number | null
  valor_conta?: string | number | null
}

export interface SiteFormExtractedData {
  consumo_mensal_kwh: number
  valor_conta_reais: number
  consumo_extraido_da_mensagem: boolean
  valor_conta_extraido_da_mensagem: boolean
}

/**
 * Extrai número de consumo (kWh) de um texto livre em pt-BR.
 * Trata:
 * - "Consumo: 900 kWh/mês"
 * - "Consumo: 3000+ kWh/mês"
 * - "consumo médio de 900 kWh"
 * - "Consumo: 1.500 kWh"
 * - "900 kWh"
 */
export function extractConsumoFromText(text?: string | null): number {
  if (!text || typeof text !== 'string') return 0

  // 1. Padrão com rótulo 'consumo'
  // Ex: "Consumo: 900 kWh", "consumo médio de 3000+ kwh/mês", "consumo: 1.500 kWh"
  const patternComRotulo =
    /consumo(?:\s+m[eé]dio)?(?:\s+de)?(?:\s*[:=-])?\s*([0-9]+(?:[.,][0-9]+)?|\d{1,3}(?:\.\d{3})+)\s*\+?\s*(?:kwh(?:\s*[/|\s]m[eê]s)?)?/i

  const matchRotulo = text.match(patternComRotulo)
  if (matchRotulo && matchRotulo[1]) {
    const parsed = parseNumberSafe(matchRotulo[1], 0)
    if (parsed > 0) return Math.round(parsed)
  }

  // 2. Padrão com unidade kWh explícita
  // Ex: "900 kWh", "3000+ kWh/mês", "1.500 kwh"
  const patternComKwh =
    /([0-9]+(?:[.,][0-9]+)?|\d{1,3}(?:\.\d{3})+)\s*\+?\s*kwh(?:\s*[/|\s]m[eê]s)?/i

  const matchKwh = text.match(patternComKwh)
  if (matchKwh && matchKwh[1]) {
    const parsed = parseNumberSafe(matchKwh[1], 0)
    if (parsed > 0) return Math.round(parsed)
  }

  return 0
}

/**
 * Extrai valor monetário da conta de energia de um texto livre em pt-BR.
 * Trata:
 * - "Valor médio da conta: R$ 600."
 * - "Valor médio da conta: R$ 5.000"
 * - "Valor médio da conta: R$ 5000."
 * - "conta de R$ 5.000"
 * - "R$ 1.234,56"
 * - "fatura: R$ 600"
 */
export function extractValorContaFromText(text?: string | null): number {
  if (!text || typeof text !== 'string') return 0

  // 1. Padrão com rótulo (valor/conta/fatura) e opcionalmente R$
  // Ex: "Valor médio da conta: R$ 600.", "conta de R$ 5.000", "valor da fatura: 600,00"
  const patternComRotulo =
    /(?:valor(?:\s+m[eé]dio)?(?:\s+da)?(?:\s+conta|\s+fatura)?|conta(?:\s+de)?|fatura(?:\s+de)?)\s*[:=-]?\s*(?:r\$\s*)?([0-9]+(?:[.,][0-9]+)?|\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)/i

  const matchRotulo = text.match(patternComRotulo)
  if (matchRotulo && matchRotulo[1]) {
    const parsed = parseNumberSafe(matchRotulo[1], 0)
    if (parsed > 0) return Math.round(parsed * 100) / 100
  }

  // 2. Padrão com R$ explícito
  // Ex: "R$ 1.234,56", "R$ 5.000", "R$ 600"
  const patternComRS = /r\$\s*([0-9]+(?:[.,][0-9]+)?|\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)/i

  const matchRS = text.match(patternComRS)
  if (matchRS && matchRS[1]) {
    const parsed = parseNumberSafe(matchRS[1], 0)
    if (parsed > 0) return Math.round(parsed * 100) / 100
  }

  return 0
}

/**
 * Extrai dados consolidados (consumo e valor da conta) considerando campos dedicados com prioridade
 * e texto da mensagem como fallback. Se ambos faltarem, aplica fallback padrão de 400 kWh (ou estimativa pela conta).
 */
export function extractSiteFormData(input: SiteFormExtractionInput): SiteFormExtractedData {
  let finalConsumo = 0
  let finalValorConta = 0
  let consumoExtraidoMsg = false
  let valorContaExtraidoMsg = false

  // 1. Processar consumo dedicado
  if (
    input.consumo !== undefined &&
    input.consumo !== null &&
    String(input.consumo).trim() !== ''
  ) {
    const parsed = parseNumberSafe(String(input.consumo), 0)
    if (parsed > 0) {
      finalConsumo = Math.round(parsed)
    }
  }

  // 2. Processar valor de conta dedicado
  if (
    input.valor_conta !== undefined &&
    input.valor_conta !== null &&
    String(input.valor_conta).trim() !== ''
  ) {
    const parsed = parseNumberSafe(String(input.valor_conta), 0)
    if (parsed > 0) {
      finalValorConta = Math.round(parsed * 100) / 100
    }
  }

  // 3. Fallback: extrair de message se ausente
  const messageText = input.message ? String(input.message).trim() : ''

  if (finalConsumo <= 0 && messageText) {
    const extraido = extractConsumoFromText(messageText)
    if (extraido > 0) {
      finalConsumo = extraido
      consumoExtraidoMsg = true
    }
  }

  if (finalValorConta <= 0 && messageText) {
    const extraido = extractValorContaFromText(messageText)
    if (extraido > 0) {
      finalValorConta = extraido
      valorContaExtraidoMsg = true
    }
  }

  // 4. Se informou valor da conta mas não consumo, estimar consumo (~R$ 0,92/kWh)
  if (finalConsumo <= 0 && finalValorConta > 0) {
    finalConsumo = Math.max(50, Math.round(finalValorConta / 0.92))
  } else if (finalConsumo <= 0) {
    // Padrão solar do CRM
    finalConsumo = 400
  }

  return {
    consumo_mensal_kwh: finalConsumo,
    valor_conta_reais: finalValorConta,
    consumo_extraido_da_mensagem: consumoExtraidoMsg,
    valor_conta_extraido_da_mensagem: valorContaExtraidoMsg,
  }
}
