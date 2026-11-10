// Lógica pura do Gerador de Kit Solar — sem React, testável.
import type { PainelCatalogoRow, InversorCatalogoRow, ItemListaKit } from '@/services/kitGerador'

export const TIPOS_INSTALACAO = [
  'Fibrocimento',
  'Cerâmico',
  'Metálico',
  'Laje',
  'Solo',
  'Solo monoposte',
  'Carport',
] as const

export type TipoInstalacao = (typeof TIPOS_INSTALACAO)[number]

export const LIGACOES = ['Monofásica', 'Bifásica', 'Trifásica'] as const
export type Ligacao = (typeof LIGACOES)[number]

export const TIPOS_INVERSOR = [
  'Monofásico',
  'Trifásico',
  'Híbrido monofásico',
  'Híbrido trifásico',
  'Eco-híbrido / off-grid',
  'Microinversor',
] as const

export const SOBRECARGA_PADRAO = 50
export const ACRESCIMO_PADRAO = 41

/** geração por kWp em kWh/mês = sol × 30 × (1 − perdas/100) */
export function geracaoPorKwp(solHoras: number, perdasPct: number): number {
  return solHoras * 30 * (1 - perdasPct / 100)
}

/** kWp necessário = consumo ÷ geração por kWp */
export function kwpNecessario(consumoKwhMes: number, geracaoPorKwpMes: number): number {
  if (consumoKwhMes <= 0 || geracaoPorKwpMes <= 0) return 0
  return consumoKwhMes / geracaoPorKwpMes
}

/** painéis = ceil(kWp necessário × 1000 ÷ W do painel) */
export function qtdPaineisSugerida(kwpNec: number, potenciaPainelW: number): number {
  if (kwpNec <= 0 || potenciaPainelW <= 0) return 0
  return Math.ceil((kwpNec * 1000) / potenciaPainelW)
}

export function kwpDePaineis(qtd: number, potenciaW: number): number {
  return (qtd * potenciaW) / 1000
}

export function fmt(n: number, decimais = 2): string {
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  })
}

export function fmtBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('pt-BR')
}

export function fmtPct1(n: number): string {
  return fmt(n, 1)
}

export interface EstadoCalculo {
  geracaoPorKwpMes: number
  kwpNec: number
  qtdSugerida: number
  kwp: number
  geracaoMensal: number
  areaM2: number
  coberturaPct: number | null
}

export function calcularKit(opcoes: {
  consumoKwhMes: number
  solHoras: number
  perdasPct: number
  qtdPaineis: number
  potenciaPainelW: number
  areaPainelM2: number
}): EstadoCalculo {
  const geracaoPorKwpMes = geracaoPorKwp(opcoes.solHoras, opcoes.perdasPct)
  const kwpNec = kwpNecessario(opcoes.consumoKwhMes, geracaoPorKwpMes)
  const qtdSugerida = qtdPaineisSugerida(kwpNec, opcoes.potenciaPainelW)
  const kwp = kwpDePaineis(opcoes.qtdPaineis, opcoes.potenciaPainelW)
  const geracaoMensal = kwp * geracaoPorKwpMes
  const areaM2 = opcoes.qtdPaineis * opcoes.areaPainelM2
  const coberturaPct =
    opcoes.consumoKwhMes > 0 && geracaoMensal > 0
      ? (geracaoMensal / opcoes.consumoKwhMes) * 100
      : null
  return { geracaoPorKwpMes, kwpNec, qtdSugerida, kwp, geracaoMensal, areaM2, coberturaPct }
}

export interface SugestaoInversor {
  id: string
  marca: string
  modelo: string
  potenciaKw: number
  tipo: string
  qtd: number
  relacao: number
}

const QTD_MAX_INVERSORES = 4

/** Sugestões de inversores: respeita a ligação e a sobrecarga, ordena por 1 inversor e relação perto de 1,25. */
export function sugerirInversores(
  inversores: InversorCatalogoRow[],
  kwp: number,
  ligacao: Ligacao | null,
  sobrecargaPct: number,
): SugestaoInversor[] {
  if (kwp <= 0 || inversores.length === 0) return []

  const monofasico = (tipo: string) => !tipo.includes('Trifásico')
  const trifasico = (tipo: string) => tipo.includes('Trifásico')

  const candidatas = inversores.filter((inv) => {
    if (ligacao === 'Trifásica') return trifasico(inv.tipo)
    if (ligacao === 'Monofásica' || ligacao === 'Bifásica') return monofasico(inv.tipo)
    return true // sem ligação: qualquer tipo
  })

  const resultados: SugestaoInversor[] = []
  for (const inv of candidatas) {
    const capacidadeComSobrecarga = inv.potencia_kw * (1 + sobrecargaPct / 100)
    const qtd = Math.min(QTD_MAX_INVERSORES, Math.ceil(kwp / capacidadeComSobrecarga))
    if (qtd < 1) continue
    const relacao = kwp / (inv.potencia_kw * qtd)
    if (relacao < 0.8) continue // descarta inversor grande demais
    resultados.push({
      id: inv.id,
      marca: inv.marca,
      modelo: inv.modelo,
      potenciaKw: inv.potencia_kw,
      tipo: inv.tipo,
      qtd,
      relacao,
    })
  }

  // Preferir 1 inversor e relação mais perto de 1,25
  resultados.sort((a, b) => {
    if (a.qtd !== b.qtd) return a.qtd - b.qtd
    return Math.abs(a.relacao - 1.25) - Math.abs(b.relacao - 1.25)
  })
  return resultados.slice(0, 6)
}

export function classificarRelacao(
  relacao: number,
  sobrecargaPct: number,
): 'verde' | 'amarelo-limite' | 'vermelho' | 'amarelo-baixo' {
  const limite = 1 + sobrecargaPct / 100
  if (relacao <= limite && relacao >= 0.8) return 'verde'
  if (relacao > limite && relacao <= limite + 0.1) return 'amarelo-limite'
  if (relacao > limite + 0.1) return 'vermelho'
  return 'amarelo-baixo'
}

export const MENSAGENS_RELACAO: Record<ReturnType<typeof classificarRelacao>, string> = {
  verde: 'Combinação painéis × inversor dentro do normal.',
  'amarelo-limite': 'No limite da sobrecarga. Confira o máximo aceito no datasheet do fabricante.',
  vermelho:
    'Painéis demais para esse inversor (acima de 50% de sobrecarga). Aumente o inversor ou a quantidade.',
  'amarelo-baixo':
    'Inversor grande demais para os painéis: dá para usar um menor e baratear o kit.',
}

export interface Precificacao {
  precoVenda: number
  descontoRs: number
  precoFinal: number
  lucro: number
  margemPct: number
  precoPorWp: number | null
}

export function precoFinalReal(
  custo: number,
  acrescimoPct: number,
  descontoTipo: '%' | 'R$',
  descontoValor: number,
): number {
  const precoVenda = custo * (1 + (acrescimoPct || 0) / 100)
  const descontoRs =
    descontoTipo === '%' ? (precoVenda * (descontoValor || 0)) / 100 : descontoValor || 0
  return Math.max(0, precoVenda - descontoRs)
}

export function lucroReal(custo: number, precoFinal: number): number {
  return precoFinal - custo
}

export function margemReal(custo: number, precoFinal: number): number {
  if (precoFinal <= 0) return 0
  return ((precoFinal - custo) / precoFinal) * 100
}

export function tipoRelacao(relacao: number | null): 'sub' | 'ok' | 'sobre' | 'critica' {
  if (relacao === null || relacao <= 0) return 'ok'
  if (relacao < 1.0) return 'sub'
  if (relacao <= 1.35) return 'ok'
  if (relacao <= 1.55) return 'sobre'
  return 'critica'
}

export function precificar(opcoes: {
  custo: number
  acrescimoPct: number
  descontoValor: number
  descontoTipo: '%' | 'R$'
  kwp: number
}): Precificacao {
  const precoVenda = opcoes.custo * (1 + opcoes.acrescimoPct / 100)
  const descontoRs =
    opcoes.descontoTipo === '%' ? (precoVenda * opcoes.descontoValor) / 100 : opcoes.descontoValor
  const precoFinal = precoVenda - descontoRs
  const lucro = precoFinal - opcoes.custo
  const margemPct = precoFinal > 0 ? (lucro / precoFinal) * 100 : 0
  const precoPorWp = opcoes.kwp > 0 ? precoFinal / (opcoes.kwp * 1000) : null
  return { precoVenda, descontoRs, precoFinal, lucro, margemPct, precoPorWp }
}

const NOMES_ESTRUTURA: Record<string, string> = {
  Fibrocimento: 'telhado de fibrocimento',
  Cerâmico: 'telhado cerâmico',
  Metálico: 'telhado metálico',
  Laje: 'laje',
  Solo: 'solo',
  'Solo monoposte': 'solo monoposte',
  Carport: 'carport',
}

export function nomeEstrutura(tipo: string): string {
  return NOMES_ESTRUTURA[tipo] ?? tipo.toLowerCase()
}

/** Nome automático do kit (editável/travável no formulário). */
export function montarNomeKit(opcoes: {
  kwp: number
  marcaPainel: string
  potenciaPainelW: number
  marcaInversor: string
  potenciaInversorKw: number
  qtdInversores: number
  tipoInstalacao: string
  distribuidora: string
}): string {
  const partes: string[] = []
  if (opcoes.kwp > 0) partes.push(`Kit Solar ${fmt(opcoes.kwp)} kWp`)
  else partes.push('Kit Solar')

  const painel: string[] = []
  if (opcoes.marcaPainel) painel.push(opcoes.marcaPainel)
  if (opcoes.potenciaPainelW > 0) painel.push(`${fmtInt(opcoes.potenciaPainelW)} W`)
  if (painel.length) partes.push(painel.join(' '))

  const inversor: string[] = []
  if (opcoes.marcaInversor) inversor.push(opcoes.marcaInversor)
  if (opcoes.potenciaInversorKw > 0) {
    inversor.push(
      `${fmt(opcoes.potenciaInversorKw)} kW${opcoes.qtdInversores > 1 ? ` ×${opcoes.qtdInversores}` : ''}`,
    )
  }
  if (inversor.length) partes.push(inversor.join(' '))

  if (opcoes.tipoInstalacao) partes.push(opcoes.tipoInstalacao)
  if (opcoes.distribuidora) partes.push(`Distribuidora ${opcoes.distribuidora}`)

  return partes.join(' — ')
}

export function itensPadrao(tipoInstalacao: string, qtdInversores: number): ItemListaKit[] {
  return [
    {
      nome: 'String box (proteção CC/CA) — DPS contra surtos e sobrecorrente',
      qtd: Math.max(1, qtdInversores),
      incluido: true,
      padrao: true,
    },
    {
      nome: `Estrutura para ${nomeEstrutura(tipoInstalacao)} — perfis de alumínio + fixação inox`,
      qtd: 1,
      incluido: true,
      padrao: true,
    },
    {
      nome: 'Cabos solares e conectores MC4 — dupla isolação, proteção UV, IP68',
      qtd: 1,
      incluido: true,
      padrao: true,
    },
    { nome: 'Monitoramento Wi-Fi 24 h — app iOS e Android', qtd: 1, incluido: true, padrao: true },
    {
      nome: 'Projeto, ART e homologação — engenheiro eletricista responsável',
      qtd: 1,
      incluido: true,
      padrao: true,
    },
    {
      nome: 'Instalação NR10/NR35 — mão de obra da equipe Ecosolar',
      qtd: 1,
      incluido: true,
      padrao: true,
    },
  ]
}
