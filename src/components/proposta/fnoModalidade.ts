// Modalidade de venda (à vista × financiada FNO) — campos compartilhados entre
// GerarPropostaModal, EditarPropostaModal, LeadDetail e os visualizadores.

import {
  simularFno,
  resumoDaSimulacao,
  formatarBRL,
  round2,
  type FnoResultado,
} from '@/lib/fnoSimulador'
import { FnoFeriadosService } from '@/services/fnoFeriados'
import type { FnoSimulacaoResumoJson } from '@/types/crm'

export type ModalidadeVenda = 'avista' | 'fno'

export const MODALIDADE_ROTULOS: Record<ModalidadeVenda, string> = {
  avista: 'À vista',
  fno: 'Financiada (FNO)',
}

/** Entrada da simulação, exatamente como o vendedor preenche. */
export interface FnoFormulario {
  valor_total: number // preço de venda da proposta
  valor_entrada: number // à vista; o restante é financiado
  taxa_anual: number // % a.a.
  prazo_meses: number
  carencia_meses: number
  data_base: string // liberação (YYYY-MM-DD)
  dia_vencimento: number
}

/** Converte os campos do formulário na entrada da calculadora. */
export function formularioParaEntrada(form: FnoFormulario) {
  return {
    valorSistema: form.valor_total,
    valorFinanciado: Math.max(0, round2(form.valor_total - form.valor_entrada)),
    taxaAnualAA: form.taxa_anual,
    prazoMeses: form.prazo_meses,
    carenciaMeses: form.carencia_meses,
    dataLiberacao: form.data_base,
  }
}

/** Roda a simulação lendo os feriados da coleção fno_feriados em runtime. */
export async function rodarSimulacaoFno(form: FnoFormulario): Promise<FnoResultado> {
  const feriados = await FnoFeriadosService.listarDatas()
  return simularFno(formularioParaEntrada(form), new Set(feriados))
}

/** Compacta o resultado para gravar em propostas.fno_simulacao. */
export function simulacaoParaJson(res: FnoResultado): FnoSimulacaoResumoJson {
  return resumoDaSimulacao(res) as FnoSimulacaoResumoJson
}

/** Lê o JSON da simulação gravado na proposta (pode chegar como string). */
export function parseFnoSimulacao(
  raw: FnoSimulacaoResumoJson | string | undefined | null,
): FnoSimulacaoResumoJson | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as FnoSimulacaoResumoJson
    } catch (_) {
      return null
    }
  }
  return raw
}

/** Normaliza a modalidade salva (string) em valor do tipo. */
export function parseModalidade(raw: string | undefined | null): ModalidadeVenda {
  return raw === 'fno' ? 'fno' : 'avista'
}

export { formatarBRL }
export { round2 }
