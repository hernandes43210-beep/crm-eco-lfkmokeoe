// Cálculos centralizados do Kit Solar para suportar múltiplos painéis e inversores
import {
  kwpDePaineis,
  geracaoPorKwp,
  lucroReal,
  margemReal,
  precoFinalReal,
  tipoRelacao,
  type Ligacao,
  type TipoInstalacao,
} from './logica'
import type { PainelItemForm, InversorItemForm } from './formTipos'
import type { DadosResumo } from './resumoTipos'
import type { PainelLinha, InversorLinha } from '@/services/kitGerador'

export interface EstadoCalculo {
  kwp: number
  kwCa: number
  relacao: number | null
  relacaoTipo: 'sub' | 'ok' | 'sobre' | 'critica'
  geracaoMensal: number
  precoItens: number
  precoFinal: number
  lucro: number
  margemPct: number
  areaM2: number
  qtdPaineisTotal: number
  qtdInversoresTotal: number
}

// Converte do estado do formulário para o formato de persistência
export function toPainelLinhas(linhas: PainelItemForm[]): PainelLinha[] {
  return linhas
    .filter((l) => (l.qtd || 0) > 0 && (l.potenciaW || 0) > 0)
    .map((l) => ({
      marca: l.marca || 'Padrão',
      modelo: l.modelo || '',
      potencia_w: Number(l.potenciaW) || 0,
      qtd: Number(l.qtd) || 0,
      area_m2: Number(l.areaM2) || 0,
    }))
}

export function toInversorLinhas(linhas: InversorItemForm[]): InversorLinha[] {
  return linhas
    .filter((l) => (l.qtd || 0) > 0 && (l.potenciaKw || 0) > 0)
    .map((l) => ({
      marca: l.marca || 'Padrão',
      modelo: l.modelo || '',
      potencia_kw: Number(l.potenciaKw) || 0,
      qtd: Number(l.qtd) || 0,
      tipo: l.tipo || 'Monofásico',
    }))
}

// Monta o payload de salvamento em JSON
export function montarPayloadPaineis(linhas: PainelItemForm[], outrosDados: string): string {
  const arr = toPainelLinhas(linhas)
  return JSON.stringify({
    linhas: arr,
    outros_dados: outrosDados.trim(),
  })
}

export function montarPayloadInversores(linhas: InversorItemForm[], outrosDados: string): string {
  const arr = toInversorLinhas(linhas)
  return JSON.stringify({
    linhas: arr,
    outros_dados: outrosDados.trim(),
  })
}

// Cálculo principal somando todas as linhas de painéis e inversores
export function calcularTudo({
  paineisLinhas,
  inversoresLinhas,
  sol,
  perdas,
  custo,
  acrescimoPct,
  descontoTipo,
  descontoValor,
  itens,
}: {
  paineisLinhas: PainelItemForm[]
  inversoresLinhas: InversorItemForm[]
  sol: number
  perdas: number
  custo: number
  acrescimoPct: number
  descontoTipo: '%' | 'R$'
  descontoValor: number
  itens: Array<{ custo?: number; qtd?: number }>
}): EstadoCalculo {
  // Potência CC total (kWp) somando todas as linhas de módulos
  const kwp = paineisLinhas.reduce((acc, p) => {
    return acc + kwpDePaineis(Number(p.qtd) || 0, Number(p.potenciaW) || 0)
  }, 0)

  // Potência CA total (kW) somando todos os inversores
  const kwCa = inversoresLinhas.reduce((acc, inv) => {
    return acc + (Number(inv.qtd) || 0) * (Number(inv.potenciaKw) || 0)
  }, 0)

  // Área total estimada de telhado em m²
  const areaM2 = paineisLinhas.reduce((acc, p) => {
    const areaUnit =
      Number(p.areaM2) > 0 ? Number(p.areaM2) : (Number(p.potenciaW) || 550) >= 500 ? 2.79 : 2.0
    return acc + (Number(p.qtd) || 0) * areaUnit
  }, 0)

  // FDR / Sobrecarga
  let relacao: number | null = null
  if (kwCa > 0 && kwp > 0) {
    relacao = kwp / kwCa
  }
  const relacaoTipo = tipoRelacao(relacao)

  // Geração mensal estimada (kWh/mês = kWp × sol × 30 × (1 − perdas/100))
  const geracaoMensal = kwp * geracaoPorKwp(sol, perdas)

  // Itens adicionais (caso possuam custo opcional)
  const precoItens = itens.reduce(
    (acc, it: any) => acc + (Number(it.custo) || 0) * (Number(it.qtd) || 1),
    0,
  )

  const custoTotal = Number(custo) + precoItens

  const precoFinal = precoFinalReal(custoTotal, acrescimoPct, descontoTipo, descontoValor)

  const lucro = lucroReal(custoTotal, precoFinal)
  const margemPct = margemReal(custoTotal, precoFinal)

  const qtdPaineisTotal = paineisLinhas.reduce((acc, p) => acc + (Number(p.qtd) || 0), 0)
  const qtdInversoresTotal = inversoresLinhas.reduce((acc, inv) => acc + (Number(inv.qtd) || 0), 0)

  return {
    kwp,
    kwCa,
    relacao,
    relacaoTipo,
    geracaoMensal,
    precoItens,
    precoFinal,
    lucro,
    margemPct,
    areaM2,
    qtdPaineisTotal,
    qtdInversoresTotal,
  }
}

// Monta os dados para o Cartão de Resumo
export function montarDadosResumo({
  calc,
  paineisLinhas,
  inversoresLinhas,
  outrosDadosPaineis,
  outrosDadosInversores,
  tipoInstalacao,
  distribuidora,
  ligacao,
}: {
  calc: EstadoCalculo
  paineisLinhas: PainelItemForm[]
  inversoresLinhas: InversorItemForm[]
  outrosDadosPaineis: string
  outrosDadosInversores: string
  tipoInstalacao: TipoInstalacao
  distribuidora: string
  ligacao: Ligacao
}): DadosResumo {
  return {
    kwp: calc.kwp,
    geracaoMensal: calc.geracaoMensal,
    coberturaPct: null,
    kwCa: calc.kwCa,
    linhaInversor: '',
    areaM2: calc.areaM2,
    tipoInstalacao,
    relacao: calc.relacao,
    itens: [],
    distribuidora,
    custo: 0,
    precoVenda: calc.precoFinal,
    descontoRs: 0,
    precoFinal: calc.precoFinal,
    lucro: calc.lucro,
    margemPct: calc.margemPct,
    paineisLinhas: toPainelLinhas(paineisLinhas),
    inversoresLinhas: toInversorLinhas(inversoresLinhas),
    outrosDadosPaineis: outrosDadosPaineis.trim(),
    outrosDadosInversores: outrosDadosInversores.trim(),
    relacaoTipo: calc.relacaoTipo,
    ligacao,
  }
}
