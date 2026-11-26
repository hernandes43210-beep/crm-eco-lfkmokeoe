/**
 * Proposta revisada — dados que alimentam as 6 páginas (navy/amarelo).
 * Os dados do lead/kit entram por montarDadosV2 (mesma fonte da versão anterior).
 */
import type { ResultadoCalculoProposta } from '@/lib/proposalCalculos'
import {
  calcularProposta,
  calcularDataValidade,
  DIAS_VALIDADE_PADRAO,
  FAQ_PROPOSTA,
  etapasImplantacao,
  descricaoFuncaoItem,
  formatNumeroBR,
} from '@/lib/proposalCalculos'
import type { FotoProposta } from '@/lib/proposalDadosV2'

export type { FotoProposta }

export interface DadosV2 {
  // empresa
  empresaNome: string
  empresaSlogan: string
  empresaCNPJ: string
  empresaEndereco: string
  empresaWhatsapp: string
  empresaEmail: string
  empresaInstagram: string
  engenheiroNome: string
  engenheiroCREA: string
  concessionaria: string

  // proposta / lead
  numeroProposta: string
  dataEmissao: Date
  dataValidade: Date
  clienteNome: string
  clientePrimeiroNome: string
  clienteCapitalizado: string
  cidadeUF: string
  tipoTelhado: string
  tipoLigacao: 'monofasica' | 'bifasica' | 'trifasica'
  consultorNome: string
  linkPublico: string

  // kit
  kitNome: string
  fotoCapa?: FotoProposta
  paineisLinhas: Array<{
    nome: string
    qtd: number
    garantiaProduto?: number
    garantiaDesempenho?: number
  }>
  inversoresLinhas: Array<{ nome: string; qtd: number; garantiaAnos?: number }>
  outrosItens: Array<{ nome: string; qtd: number }>
  monitoramentoIncluso: boolean
  areaTelhadoM2: number

  // cálculo
  calc: ResultadoCalculoProposta
  fioBPercentual: number
  taxaMinimaKwh: number

  // formatados pt-BR
  brl: (v: number) => string
  num: (v: number, casas?: number) => string
  precoFinalRS: string
  precoCheioRS: string
  descontoRS: string
  descontoPct: string
  precoFinRS: string
  numParcelas: number
  descontoFinancRS: string
  contaHojeRS: string
  contaNovaRS: string
  fioBRS: string
  taxaMinimaRS: string
  economiaMensalRS: string
  economiaAnualRS: string
  economia25RS: string
  paybackAnosMeiosTxt: string
  paybackExtensoTxt: string
  retornoPctAA: string
  geracaoMensalTxt: string
  coberturaTxt: string
  tarifaRS: string
  cdbNoPrimeiroAnoRS: string
  rendimentoSolarInt: number
  faq: Array<{ p: string; r: string }>
  etapas: ReturnType<typeof etapasImplantacao>
  garantiaPainelTxt: string
  garantiaInversorTxt: string
}

const PARTES_MINUSCULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])

/** "MARIA DA SILVA" => "Maria da Silva" */
export function capitalizarNome(nome: string): string {
  return (nome || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((p) => (PARTES_MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')
}

const TAXA_MINIMA_KWH_POR_LIGACAO: Record<DadosV2['tipoLigacao'], number> = {
  monofasica: 30,
  bifasica: 50,
  trifasica: 100,
}

export function rotuloTipoLigacao(t: DadosV2['tipoLigacao']): string {
  return t === 'monofasica' ? 'Monofásica' : t === 'bifasica' ? 'Bifásica' : 'Trifásica'
}

const brlFmt = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

/** "4 anos e 3 meses" a partir de meses. */
export function anosEMeses(meses: number): string {
  const m = Math.max(0, Math.round(meses))
  const anos = Math.floor(m / 12)
  const rest = m % 12
  const partes: string[] = []
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`)
  if (rest > 0) partes.push(`${rest} ${rest === 1 ? 'mês' : 'meses'}`)
  if (partes.length === 0) return 'menos de 1 mês'
  return partes.join(' e ')
}

export interface EntradaNovaProposta {
  consumoKwh: number
  tarifaKwh?: number
  precoFinal: number
  precoCheio?: number
  numeroParcelasFinanciamento?: number
  descontoFinanciamento?: number
  dataEmissao?: Date
  diasValidade?: number
  linkPublico: string
}

/**
 * Monta os dados das 6 páginas a partir de: cálculo do lead/kit (calcularProposta),
 * itens do kit, foto de capa e link público do aceite.
 */
export function montarDadosNovaProposta(
  base: EntradaNovaProposta,
  extras: {
    empresa: Partial<
      Pick<
        DadosV2,
        | 'empresaNome'
        | 'empresaSlogan'
        | 'empresaCNPJ'
        | 'empresaEndereco'
        | 'empresaWhatsapp'
        | 'empresaEmail'
        | 'empresaInstagram'
        | 'engenheiroNome'
        | 'engenheiroCREA'
      >
    >
    proposta: Partial<
      Pick<
        DadosV2,
        | 'numeroProposta'
        | 'clienteNome'
        | 'cidadeUF'
        | 'tipoTelhado'
        | 'tipoLigacao'
        | 'consultorNome'
        | 'concessionaria'
        | 'kitNome'
      >
    > & { fotoCapa?: FotoProposta }
    kit: {
      potenciaKwp: number
      paineisLinhas?: DadosV2['paineisLinhas']
      inversoresLinhas?: DadosV2['inversoresLinhas']
      outrosItens?: DadosV2['outrosItens']
      monitoramentoIncluso?: boolean
      areaTelhadoM2?: number
      irradiacaoHoras?: number
      fatorPerdas?: number
      garantiaPainelAnos?: number
      garantiaInversorAnos?: number
    }
  },
): DadosV2 {
  const dataEmissao = base.dataEmissao ?? new Date()
  const dias = base.diasValidade ?? DIAS_VALIDADE_PADRAO
  const dataValidade = calcularDataValidade(dataEmissao, dias)

  const calc = calcularProposta({
    consumoKwh: base.consumoKwh,
    potenciaKwp: extras.kit.potenciaKwp,
    precoFinal: base.precoFinal,
    precoCheio: base.precoCheio,
    tarifaKwh: base.tarifaKwh,
    irradiacaoHoras: extras.kit.irradiacaoHoras,
    fatorPerdas: extras.kit.fatorPerdas,
  })

  const clienteNome = capitalizarNome(extras.proposta.clienteNome || '')
  const primeiroNome = clienteNome.split(' ')[0] || ''
  const precoCheio = base.precoCheio && base.precoCheio > 0 ? base.precoCheio : base.precoFinal
  const descontoRs = Math.max(0, precoCheio - base.precoFinal)
  const descontoPct = precoCheio > 0 ? (descontoRs / precoCheio) * 100 : 0
  const numParcelas = Math.max(0, base.numeroParcelasFinanciamento ?? 0)
  const descontoFinanc = Math.max(0, base.descontoFinanciamento ?? 0)

  const garantiaPainel = extras.kit.garantiaPainelAnos
  const garantiaInversor = extras.kit.garantiaInversorAnos

  return {
    // empresa
    empresaNome: extras.empresa.empresaNome || 'ECO SOLAR ENERGY',
    empresaSlogan: extras.empresa.empresaSlogan || 'Energia solar para a sua casa ou empresa',
    empresaCNPJ: extras.empresa.empresaCNPJ || '',
    empresaEndereco: extras.empresa.empresaEndereco || '',
    empresaWhatsapp: extras.empresa.empresaWhatsapp || '',
    empresaEmail: extras.empresa.empresaEmail || '',
    empresaInstagram: extras.empresa.empresaInstagram || '',
    engenheiroNome: extras.empresa.engenheiroNome || '',
    engenheiroCREA: extras.empresa.engenheiroCREA || '',
    concessionaria: extras.proposta.concessionaria || 'concessionária local',

    // proposta / lead
    numeroProposta: extras.proposta.numeroProposta || '',
    dataEmissao,
    dataValidade,
    clienteNome,
    clientePrimeiroNome: capitalizarNome(primeiroNome),
    clienteCapitalizado: clienteNome,
    cidadeUF: extras.proposta.cidadeUF || '',
    tipoTelhado: extras.proposta.tipoTelhado || 'Telhado',
    tipoLigacao: extras.proposta.tipoLigacao || 'monofasica',
    consultorNome: extras.proposta.consultorNome || '',
    linkPublico: base.linkPublico,

    // kit
    kitNome: extras.proposta.kitNome || '',
    fotoCapa: extras.proposta.fotoCapa,
    paineisLinhas: extras.kit.paineisLinhas ?? [],
    inversoresLinhas: extras.kit.inversoresLinhas ?? [],
    outrosItens: extras.kit.outrosItens ?? [],
    monitoramentoIncluso: extras.kit.monitoramentoIncluso ?? true,
    areaTelhadoM2: extras.kit.areaTelhadoM2 ?? 0,

    // cálculo
    calc,
    fioBPercentual: calc.fioBPercentual,
    taxaMinimaKwh: TAXA_MINIMA_KWH_POR_LIGACAO[extras.proposta.tipoLigacao || 'monofasica'],

    // formatados
    brl: brlFmt,
    num: formatNumeroBR,
    precoFinalRS: brlFmt(base.precoFinal),
    precoCheioRS: descontoRs > 0 ? brlFmt(precoCheio) : '',
    descontoRS: brlFmt(descontoRs),
    descontoPct: `${formatNumeroBR(Math.round(descontoPct))}%`,
    precoFinRS: numParcelas > 0 ? brlFmt(base.precoFinal / numParcelas) : '',
    numParcelas,
    descontoFinancRS: descontoFinanc > 0 ? brlFmt(descontoFinanc) : '',
    contaHojeRS: brlFmt(calc.contaHoje),
    contaNovaRS: brlFmt(calc.contaNova),
    fioBRS: brlFmt(calc.custoFioB),
    taxaMinimaRS: brlFmt(calc.taxaMinimaValor),
    economiaMensalRS: brlFmt(calc.economiaMensal),
    economiaAnualRS: brlFmt(calc.economiaAnual),
    economia25RS: brlFmt(calc.economia25Anos),
    paybackAnosMeiosTxt: anosEMeses(calc.paybackMeses),
    paybackExtensoTxt: anosEMeses(calc.paybackMeses),
    retornoPctAA: `${formatNumeroBR(calc.rendimentoSolarPct, 1).replace('.', ',')}% a.a.`,
    geracaoMensalTxt: `${formatNumeroBR(calc.geracaoMensalKwh)} kWh/mês`,
    coberturaTxt: `${formatNumeroBR(calc.coberturaPct)}%`,
    tarifaRS: brlFmt(calc.tarifaKwh),
    cdbNoPrimeiroAnoRS: brlFmt(base.precoFinal * 0.1),
    rendimentoSolarInt: Math.round(calc.rendimentoSolarPct),
    faq: FAQ_PROPOSTA.slice(0, 4),
    etapas: etapasImplantacao(extras.proposta.concessionaria || 'concessionária local'),
    garantiaPainelTxt:
      garantiaPainel != null
        ? `${garantiaPainel} anos`
        : 'Garantia do fabricante (produto + desempenho)',
    garantiaInversorTxt:
      garantiaInversor != null ? `${garantiaInversor} anos` : 'Garantia do fabricante',
  }
}

export { descricaoFuncaoItem }
