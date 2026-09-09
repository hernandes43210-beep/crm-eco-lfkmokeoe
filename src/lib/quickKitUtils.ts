/**
 * Utilitários para o modo de montagem rápida / Kit Pré-Pronto
 */

export const POTENCIAS_COMUNS_PAINEIS = [550, 575, 610, 630] as const

export interface MontagemPreProntaState {
  qtdPaineis: number | string
  potenciaPainelW: number | string
  marcaPaineis: string
  qtdInversores: number | string
  marcaInversor: string
}

/**
 * Calcula a potência pico em kWp:
 * kWp = (qtd × potência em Wp) / 1000
 */
export function calcularKwpPrePronto(
  qtd: number | string,
  potenciaW: number | string,
): { kwp: number; formattedBR: string } {
  const q = Number(qtd) || 0
  const w = Number(potenciaW) || 0

  if (q <= 0 || w <= 0) {
    return { kwp: 0, formattedBR: '0,00' }
  }

  const rawKwp = (q * w) / 1000
  // Arredonda para até 2 casas decimais precisas
  const rounded = Math.round(rawKwp * 100) / 100

  // Formatação pt-BR com vírgula decimal
  const formattedBR = rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })

  return { kwp: rounded, formattedBR }
}

/**
 * Sugere o nome comercial do kit a partir dos dados preenchidos:
 * Ex.: "Kit Solar 6,1 kWp — Canadian Solar + Growatt"
 */
export function sugerirNomeKit(params: {
  kwp: number
  marcaPaineis?: string
  marcaInversor?: string
  qtdPaineis?: number | string
  potenciaPainelW?: number | string
}): string {
  const { kwp, marcaPaineis, marcaInversor } = params

  if (kwp <= 0) {
    return ''
  }

  // Formatação compacta ex: 6,1 kWp ou 6,15 kWp
  const kwpStr = kwp.toLocaleString('pt-BR', {
    minimumFractionDigits: kwp % 1 === 0 ? 1 : 1,
    maximumFractionDigits: 2,
  })

  const painelClean = (marcaPaineis || '').trim()
  const inversorClean = (marcaInversor || '').trim()

  const partesMarcas: string[] = []
  if (painelClean) partesMarcas.push(painelClean)
  if (inversorClean) partesMarcas.push(inversorClean)

  const sufixoMarcas = partesMarcas.length > 0 ? ` — ${partesMarcas.join(' + ')}` : ''

  return `Kit Solar ${kwpStr} kWp${sufixoMarcas}`
}

/**
 * Sugere o campo Fabricante/Marcas unificado para o kit:
 * Ex.: "Canadian Solar / Growatt"
 */
export function sugerirFabricanteKit(marcaPaineis?: string, marcaInversor?: string): string {
  const p = (marcaPaineis || '').trim()
  const i = (marcaInversor || '').trim()

  if (p && i) return `${p} / ${i}`
  if (p) return p
  if (i) return i
  return ''
}

/**
 * Sugere a descrição técnica detalhada para o kit
 */
export function sugerirDescricaoTecnica(params: {
  qtdPaineis: number | string
  potenciaPainelW: number | string
  marcaPaineis: string
  qtdInversores: number | string
  marcaInversor: string
  kwp: number
}): string {
  const { qtdPaineis, potenciaPainelW, marcaPaineis, qtdInversores, marcaInversor, kwp } = params

  const qP = Number(qtdPaineis) || 0
  const potP = Number(potenciaPainelW) || 0
  const qI = Number(qtdInversores) || 0

  const linhas: string[] = []

  if (qP > 0 && potP > 0) {
    const nomeMód = marcaPaineis.trim() ? ` (${marcaPaineis.trim()})` : ''
    linhas.push(
      `${qP}x Módulo fotovoltaico ${potP}Wp${nomeMód} — Total ${kwp.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kWp`,
    )
  }

  if (qI > 0 && marcaInversor.trim()) {
    linhas.push(`${qI}x Inversor solar ${marcaInversor.trim()}`)
  } else if (marcaInversor.trim()) {
    linhas.push(`Inversor solar ${marcaInversor.trim()}`)
  }

  linhas.push('Estrutura de fixação e cabeamento completo inclusos.')

  return linhas.join('\n')
}
