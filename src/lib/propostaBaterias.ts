/**
 * Baterias e quantidades reais por linha na proposta comercial.
 *
 * A proposta grava em kit_baterias um JSON { linhas: BateriaLinha[] } (vindo do
 * kit do Gerador, campo kit_gerados.bateria). O PDF clássico e o Story leem esse
 * campo com parseBateriasJson e também usam parsePaineisLinhas/parseInversoresLinhas
 * para mostrar as quantidades reais por modelo — os parsers canônicos do serviço
 * kitGerador são tolerantes a legado, então propostas antigas sem esses dados
 * renderizam exatamente como antes.
 */
import {
  parseBateriasJson,
  parsePaineisLinhas,
  parseInversoresLinhas,
  type BateriaLinha,
  type BateriaJsonValor,
  type PainelJsonValor,
  type InversorJsonValor,
  type PainelLinha,
  type InversorLinha,
} from '@/services/kitGerador'

/** Formato gravado no campo kit_baterias da proposta. */
export interface PropostaKitBateriasJson {
  linhas: BateriaLinha[]
  outrosDados?: string
}

export interface PropostaEquipamentos {
  /** Linhas de bateria do kit (vazio em propostas antigas sem baterias). */
  baterias: BateriaLinha[]
  /** Quantidades reais por modelo de painel (vazio → usar fallback legado). */
  paineis: PainelLinha[]
  /** Quantidades reais por modelo de inversor (vazio → usar fallback legado). */
  inversores: InversorLinha[]
}

/** Texto de uma linha de bateria, ex.: "2× Freyr 5.12 kWh (51,2 V)" ou "FREYR — 10 kWh". */
export function rotuloBateria(b: BateriaLinha): string {
  const partes: string[] = []
  if (b.qtd && b.qtd > 1) partes.push(`${b.qtd}× `)
  const nome = [b.marca, b.modelo].filter(Boolean).join(' ')
  if (nome) partes.push(nome)
  const especs: string[] = []
  if (b.capacidade_kwh) especs.push(`${b.capacidade_kwh} kWh`)
  if (b.tensao) especs.push(b.tensao)
  if (especs.length) partes.push(especs.join(' — '))
  return partes.join(' ').replace(/\s+/g, ' ').trim()
}

/** Soma de capacidade das baterias em kWh (0 quando não há). */
export function totalKwhBaterias(baterias: BateriaLinha[]): number {
  return baterias.reduce(
    (acc, b) => acc + (Number(b.capacidade_kwh) || 0) * (Number(b.qtd) || 1),
    0,
  )
}

/**
 * Lê equipamentos completos de uma proposta: baterias (kit_baterias) e as
 * linhas reais de painéis/inversores gravadas na descrição não — estas vêm do
 * JSON legado da proposta quando existir; caso contrário devolve listas vazias
 * e o chamador usa os campos simples (kit_marca_painel etc.).
 */
export function lerEquipamentosProposta(
  kitBaterias: BateriaJsonValor | unknown,
  kitPainel?: PainelJsonValor | unknown,
  kitInversor?: InversorJsonValor | unknown,
): PropostaEquipamentos {
  return {
    baterias: parseBateriasJson(kitBaterias),
    paineis: kitPainel != null ? parsePaineisLinhas(kitPainel as PainelJsonValor) : [],
    inversores: kitInversor != null ? parseInversoresLinhas(kitInversor as InversorJsonValor) : [],
  }
}

/** Monta o JSON a gravar no campo kit_baterias da proposta. */
export function montarKitBateriasJson(
  baterias: BateriaLinha[],
  outrosDados?: string,
): PropostaKitBateriasJson {
  return { linhas: baterias, ...(outrosDados ? { outrosDados } : {}) }
}
