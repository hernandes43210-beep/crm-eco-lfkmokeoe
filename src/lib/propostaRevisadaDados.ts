/**
 * Nova proposta clássica revisada (v3, navy #0B1E4A + amarelo #FFC629).
 * Alimentada pelos mesmos dados do lead/kit: substitui montarDadosV2 nas telas
 * existentes, que continuam chamando proposalDataDePublica / montarDados.
 */
import type { ProposalPDFData, FotoProposta } from './proposalDadosV2'
import { montarDadosV2 } from './proposalDadosV2'
import {
  calcularProposta,
  percentualFioB,
  DIAS_VALIDADE_PADRAO,
  GARANTIA_INVERSOR_ANOS,
  GARANTIA_INSTALACAO_ANOS,
  FAQ_PROPOSTA,
  etapasImplantacao,
  DEPOIMENTO_PROPOSTA,
  RENDIMENTO_POUPANCA_AO_ANO,
  RENDIMENTO_CDB_LIQUIDO_AO_ANO,
  calcularDataValidade,
  formatNumeroBR,
  paybackCurto,
  paybackExtenso,
  type ResultadoCalculoProposta,
  type LimiteInversorInfo,
} from './proposalCalculos'

/** Tabela Fio B da Lei 14.300 (percentual cobrado sobre a energia injetada). */
export const FIO_B_POR_ANO: Record<number, number> = {
  2023: 15,
  2024: 30,
  2025: 45,
  2026: 60,
  2027: 75,
  2028: 90,
}

export type TipoLigacao = 'mono' | 'bi' | 'tri'

export const TAXA_MINIMA_KWH_POR_LIGACAO: Record<TipoLigacao, number> = {
  mono: 30,
  bi: 50,
  tri: 100,
}

const ROTULO_LIGACAO: Record<TipoLigacao, string> = {
  mono: 'monofásica',
  bi: 'bifásica',
  tri: 'trifásica',
}

export interface DadosPropostaRevisada {
  // empresa
  empresaNome: string
  empresaSlogan: string
  empresaCnpj: string
  empresaEndereco: string
  empresaWhatsapp: string
  empresaEmail: string
  empresaInstagram: string
  engenheiroNome: string
  engenheiroCrea: string
  // proposta
  numeroProposta: string
  dataEmissao: string
  dataValidade: string
  validadeDias: number
  // cliente
  clienteNome: string
  clientePrimeiroNome: string
  cidade: string
  uf: string
  consumoKwh: number
  tipoTelhado: string
  tipoLigacao: TipoLigacao
  concessionaria: string
  consultorNome: string
  // sistema
  potenciaKwp: number
  geracaoMensalKwh: number
  areaM2: number
  painelModelo: string
  painelQtd: number
  painelGarantiaProduto: string
  painelGarantiaDesempenho: string
  inversorModelo: string
  inversorKw: number
  inversorQtd: number
  kitItens: Array<{ nome: string; qtd: string; obs: string }>
  // fotos — só a capa
  fotoCapa: FotoProposta | null
  // números
  calc: ResultadoCalculoProposta
  fioBPct: number
  simultaneidadePct: number
  tarifaFioB: number
  // aceite
  aceiteUrl: string
  // textos derivados
  textos: {
    capitalizado: string
    cidadeUf: string
    saudacao: string
    contaHojeRS: string
    contaNovaRS: string
    economiaMensalRS: string
    economiaAnualRS: string
    retornoPctAA: string
    paybackCurto: string
    paybackExtenso: string
    economia25RS: string
    potenciaTxt: string
    geracaoTxt: string
    precoFinalRS: string
    precoCheioRS: string
    descontoRS: string
    descontoPct: string
    financiamentoTxt: string
    tarifaRS: string
  }
  /** true quando kWp excede a capacidade do inversor além do limite do fabricante */
  alertaInversor: LimiteInversorInfo | null
}

const brl = (v: number) => `R$ ${formatNumeroBR(Math.round(v * 100) / 100, 2)}`

export function capitalizarNome(nome: string): string {
  const minusculas = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])
  return (nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p, i) => {
      const low = p.toLowerCase()
      if (i > 0 && minusculas.has(low)) return low
      return low.charAt(0).toUpperCase() + low.slice(1)
    })
    .join(' ')
}

export function anosEMeses(meses: number): string {
  if (meses <= 0) return '—'
  const anos = Math.floor(meses / 12)
  const rest = Math.round(meses % 12)
  const partes: string[] = []
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`)
  if (rest > 0) partes.push(`${rest} ${rest === 1 ? 'mês' : 'meses'}`)
  return partes.join(' e ') || 'menos de 1 mês'
}

interface EntradaMontar {
  base: ProposalPDFData
  empresa: Partial<{
    nome: string
    slogan: string
    cnpj: string
    endereco: string
    whatsapp: string
    email: string
    instagram: string
    engenheiro: string
    crea: string
  }>
  aceiteUrl: string
  tipoLigacao?: TipoLigacao
  tarifaFioB?: number
  simultaneidadePct?: number
  limiteInversorPct?: number
  financiamento?: { nParcelas: number; valorParcela: number } | null
}

export function montarDadosRevisada(entrada: EntradaMontar): DadosPropostaRevisada {
  const { base, aceiteUrl } = entrada
  const empresa = { ...EMPRESA_PADRAO, ...entrada.empresa }

  const calc = calcularProposta({
    consumoKwh: base.consumoKwh,
    potenciaKwp: base.potenciaKwp,
    precoFinal: base.precoFinal,
    precoCheio: base.precoCheio,
    tarifaKwh: base.tarifaKwh,
    irradiacaoHoras: base.hsp,
    fatorPerdas: base.fatorPerdas,
    tipoLigacao: entrada.tipoLigacao ?? 'mono',
    tarifaFioB: entrada.tarifaFioB ?? base.tarifaKwh,
    simultaneidadePct: entrada.simultaneidadePct ?? 30,
    dataEmissao: base.dataEmissao,
  })

  const fioBPct = percentualFioB(base.dataEmissao)
  const dataValidade = calcularDataValidade(base.dataEmissao, DIAS_VALIDADE_PADRAO)

  const fotoCapa = base.fotos.length > 0 ? base.fotos[0] : null

  const textos = {
    capitalizado: capitalizarNome(base.clienteNome),
    cidadeUf: [base.cidade, base.uf].filter(Boolean).join(' - '),
    saudacao: `Olá, ${capitalizarNome(base.clienteNome).split(' ')[0]}!`,
    contaHojeRS: brl(calc.contaHoje),
    contaNovaRS: brl(calc.contaNova),
    economiaMensalRS: brl(calc.economiaMensal),
    economiaAnualRS: brl(calc.economiaAnual),
    retornoPctAA: `${formatNumeroBR(calc.rendimentoSolarPct, 1)}% a.a.`,
    paybackCurto: paybackCurto(calc.paybackMeses),
    paybackExtenso: paybackExtenso(calc.paybackMeses),
    economia25RS: brl(calc.economia25Anos),
    potenciaTxt: `${formatNumeroBR(base.potenciaKwp, 2)} kWp`,
    geracaoTxt: `${formatNumeroBR(calc.geracaoMensalKwh)} kWh/mês`,
    precoFinalRS: brl(base.precoFinal),
    precoCheioRS: brl(base.precoCheio),
    descontoRS: brl(calc.descontoRs),
    descontoPct: `${formatNumeroBR(calc.descontoPct, 0)}%`,
    financiamentoTxt:
      entrada.financiamento && entrada.financiamento.nParcelas > 0
        ? `ou ${entrada.financiamento.nParcelas}x de ${brl(entrada.financiamento.valorParcela)} (financiamento)`
        : 'ou financiamento com carência — consulte condições',
    tarifaRS: brl(calc.tarifaKwh),
  }

  return {
    empresaNome: empresa.nome,
    empresaSlogan: empresa.slogan,
    empresaCnpj: empresa.cnpj,
    empresaEndereco: empresa.endereco,
    empresaWhatsapp: empresa.whatsapp,
    empresaEmail: empresa.email,
    empresaInstagram: empresa.instagram,
    engenheiroNome: empresa.engenheiro,
    engenheiroCrea: empresa.crea,
    numeroProposta: base.numero,
    dataEmissao: formatarDataBR(base.dataEmissao),
    dataValidade: formatarDataBR(dataValidade),
    validadeDias: DIAS_VALIDADE_PADRAO,
    clienteNome: capitalizarNome(base.clienteNome),
    clientePrimeiroNome: capitalizarNome(base.clienteNome).split(' ')[0],
    cidade: base.cidade,
    uf: base.uf,
    consumoKwh: base.consumoKwh,
    tipoTelhado: base.tipoTelhado || 'telhado',
    tipoLigacao: entrada.tipoLigacao ?? 'mono',
    concessionaria: base.concessionaria || 'concessionária local',
    consultorNome: base.consultorNome || '',
    potenciaKwp: base.potenciaKwp,
    geracaoMensalKwh: calc.geracaoMensalKwh,
    areaM2: base.areaM2,
    painelModelo: base.painelModelo,
    painelQtd: base.painelQtd,
    painelGarantiaProduto: base.painelGarantiaProduto || '12 anos',
    painelGarantiaDesempenho: base.painelGarantiaDesempenho || '30 anos (80,7% da potência)',
    inversorModelo: base.inversorModelo,
    inversorKw: base.inversorKw,
    inversorQtd: base.inversorQtd,
    kitItens: base.kitItens,
    fotoCapa,
    calc,
    fioBPct,
    simultaneidadePct: entrada.simultaneidadePct ?? 30,
    tarifaFioB: entrada.tarifaFioB ?? base.tarifaKwh,
    aceiteUrl,
    textos,
    alertaInversor: calc.alertaInversor,
  }
}

const EMPRESA_PADRAO = {
  nome: 'ECO SOLAR ENERGY',
  slogan: 'Do sol até a sua conta de luz',
  cnpj: '',
  endereco: '',
  whatsapp: '',
  email: '',
  instagram: '',
  engenheiro: '',
  crea: '',
}

function formatarDataBR(d: Date | string): string {
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('pt-BR')
}

export {
  FAQ_PROPOSTA,
  etapasImplantacao,
  DEPOIMENTO_PROPOSTA,
  GARANTIA_INVERSOR_ANOS,
  GARANTIA_INSTALACAO_ANOS,
  RENDIMENTO_POUPANCA_AO_ANO,
  RENDIMENTO_CDB_LIQUIDO_AO_ANO,
}
export { ROTULO_LIGACAO }
export type { ProposalPDFData }
