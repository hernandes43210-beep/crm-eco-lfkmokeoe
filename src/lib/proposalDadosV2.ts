/**
 * Montagem dos dados exibidos nas 6 páginas da proposta clássica v2.
 * Fonte única usada pela página pública /proposta/:id (componentes React)
 * e pela versão para impressão/PDF (proposalPdf.ts) — tela e PDF mostram
 * sempre os mesmos números, todos vindos do cadastro ou de proposalCalculos.
 */
import {
  calcularProposta,
  calcularDataValidade,
  percentualFioB,
  DEPOIMENTO_PROPOSTA,
  FAQ_PROPOSTA,
  etapasImplantacao,
  descricaoFuncaoItem,
  formatNumeroBR,
  GARANTIA_INVERSOR_ANOS,
  GARANTIA_INSTALACAO_ANOS,
  RENDIMENTO_POUPANCA_AO_ANO,
  RENDIMENTO_CDB_LIQUIDO_AO_ANO,
  PERDA_ANUAL_PAINEL,
} from './proposalCalculos'
import { formatBRL, formatDateBR } from './solarUtils'
import { CONTATO_ECOSOLAR } from '@/constants/empresa'

/** Área aproximada ocupada por cada painel (m²) — usada só para estimar a área do telhado. */
export const AREA_PAINEL_M2 = 2.3

export interface ProposalPDFData {
  id?: string
  token_publico?: string
  status?: string
  kit_nome: string
  kit_potencia_kw?: number
  kit_fabricante?: string
  custo?: number
  margem?: number
  preco_venda: number
  desconto_percentual?: number
  valor_desconto?: number
  valor_bruto?: number
  validade_dias?: number
  data_validade: string
  condicoes_pagamento?: string
  observacoes?: string
  data_aceite?: string
  aceito_por_nome?: string
  created?: string
  cliente: {
    nome: string
    email?: string
    telefone?: string
    cidade?: string
    estado?: string
    endereco?: string
    consumo_mensal_kwh?: number
  }
  vendedor?: { name?: string; email?: string }
  kit_descricao?: string
  kit_string_box?: string
  kit_marca_painel?: string
  kit_marca_inversor?: string
  kit_potencia_painel_w?: number
  kit_potencia_inversor_kw?: number
  kit_tipo_estrutura?: string
  kit?: {
    descricao?: string
    string_box?: string
    marca_painel?: string
    marca_inversor?: string
    potencia_painel_w?: number
    potencia_inversor_kw?: number
    tipo_estrutura?: string
  }
  lead?: { consumo_mensal_kwh?: number }
  fotos_selecionadas?:
    | Array<{ origem: 'lead' | 'institucional'; id: string; legenda?: string }>
    | string
  fotos_obra?: Array<{ id: string; url?: string; foto?: string; legenda?: string }>
  /** Fotos já resolvidas pela página (URL absolutas) — têm prioridade sobre fotos_obra. */
  fotos_urls?: FotoProposta[]
}

export interface FotoProposta {
  url: string
  legenda: string
}

/** Resolve as fotos da obra (URL + legenda) com fallback para gradiente quando não há fotos. */
export function fotosPropostaDe(
  data: ProposalPDFData,
  fotosResolvidas?: FotoProposta[],
): FotoProposta[] {
  if (fotosResolvidas && fotosResolvidas.length > 0) return fotosResolvidas.slice(0, 5)
  const out: FotoProposta[] = []
  if (Array.isArray(data.fotos_obra)) {
    for (const f of data.fotos_obra) {
      const url = f.url || ''
      if (!url) continue
      out.push({ url, legenda: f.legenda || 'Obra Ecosolar Energy' })
      if (out.length >= 5) break
    }
  }
  return out
}

/** Escapa texto para uso seguro em HTML gerado. */
export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface DadosV2 {
  numero: string
  emissaoBR: string
  validadeBR: string
  anoEmissao: number
  fioB: number
  clienteNome: string
  primeiroNome: string
  localCliente: string
  consumoKwh: number
  tipoTelhado: string
  concessionaria: string
  consultorNome: string
  consultorEmail: string
  whatsapp: string
  instagram: string
  calc: ReturnType<typeof calcularProposta>
  precoFinalRS: string
  precoCheioRS: string
  descontoRS: string
  descontoPct: number
  tarifaRS: string
  contaHojeRS: string
  economiaMensalRS: string
  economiaAnualRS: string
  economia25Txt: string
  paybackCurtoTxt: string
  paybackExtensoTxt: string
  rendimentoSolarInt: number
  cdbNoPrimeiroAnoRS: string
  marcaPainel: string
  marcaInversor: string
  potenciaPainelW: number
  potenciaInversorKw: number
  stringBox: string
  tipoEstruturaTexto: string
  qtdPaineis: number | null
  areaTelhadoM2: number | null
  kwpFmt: string
  itensKit: Array<{ qtd: string; item: string; para: string }>
  faq: typeof FAQ_PROPOSTA
  etapas: ReturnType<typeof etapasImplantacao>
  depoimento: { texto: string; autor: string }
  garantiaInversorTxt: string
  garantiaInstalacaoTxt: string
  formasPagamento: Array<{ titulo: string; texto: string }>
}

const WHATSAPP_ECOSOLAR = '(69) 99234-6989'
const INSTAGRAM_ECOSOLAR = '@_ecosolar_energy'
const CONCESSIONARIA_PADRAO = 'Energisa'

/** Monta todos os dados/textos das 6 páginas a partir do cadastro da proposta. */
export function montarDadosV2(data: ProposalPDFData): DadosV2 {
  const consumoKwh = Number(data.lead?.consumo_mensal_kwh || data.cliente.consumo_mensal_kwh || 0)
  const kwp = Number(data.kit_potencia_kw || 0)
  const precoFinal = Number(data.preco_venda || 0)
  let precoCheio = Number(data.valor_bruto || 0)
  if (!(precoCheio > precoFinal) && data.desconto_percentual && data.desconto_percentual > 0) {
    precoCheio = precoFinal / (1 - data.desconto_percentual / 100)
  }
  if (!(precoCheio > precoFinal)) precoCheio = precoFinal

  const calc = calcularProposta({
    consumoKwh,
    potenciaKwp: kwp,
    precoFinal,
    precoCheio,
  })

  const emissao = data.created ? new Date(data.created) : new Date()
  const validade = calcularDataValidade(emissao, data.validade_dias || 15)

  const marcaPainel = data.kit_marca_painel || data.kit?.marca_painel || ''
  const marcaInversor = data.kit_marca_inversor || data.kit?.marca_inversor || ''
  const potenciaPainelW = Number(data.kit_potencia_painel_w || data.kit?.potencia_painel_w || 0)
  const potenciaInversorKw = Number(
    data.kit_potencia_inversor_kw || data.kit?.potencia_inversor_kw || 0,
  )
  const stringBox = data.kit_string_box || data.kit?.string_box || ''
  const tipoEstruturaTexto = data.kit_tipo_estrutura || data.kit?.tipo_estrutura || 'telhado'

  const qtdPaineis =
    potenciaPainelW > 0 && kwp > 0 ? Math.round((kwp * 1000) / potenciaPainelW) : null
  const areaTelhadoM2 = qtdPaineis ? Math.round(qtdPaineis * AREA_PAINEL_M2) : null

  const itemPaineis = `Painéis solares ${marcaPainel || 'de alta eficiência'}${
    potenciaPainelW ? ` ${formatNumeroBR(potenciaPainelW)} W` : ''
  }`.replace(/\s+/g, ' ')
  const itemInversor = `Inversor on-grid ${marcaInversor || 'de qualidade homologada'}${
    potenciaInversorKw ? ` ${formatNumeroBR(potenciaInversorKw, 1)} kW` : ''
  }`.replace(/\s+/g, ' ')
  const itemEstrutura = `Estrutura para telhado de ${tipoEstruturaTexto}`

  const itensKit = [
    {
      qtd: qtdPaineis ? `${qtdPaineis}x` : 'kit',
      item: itemPaineis,
      para: descricaoFuncaoItem(itemPaineis, tipoEstruturaTexto),
    },
    {
      qtd: '1x',
      item: itemInversor,
      para: descricaoFuncaoItem(itemInversor, tipoEstruturaTexto),
    },
    {
      qtd: '1x',
      item: stringBox
        ? `String box (proteção CC/CA) — ${stringBox}`
        : 'String box (proteção CC/CA)',
      para: descricaoFuncaoItem('string box'),
    },
    {
      qtd: '1 kit',
      item: itemEstrutura,
      para: descricaoFuncaoItem(itemEstrutura, tipoEstruturaTexto),
    },
    {
      qtd: '1 kit',
      item: 'Cabos solares e conectores MC4',
      para: descricaoFuncaoItem('cabos solares mc4'),
    },
    {
      qtd: '1x',
      item: 'Monitoramento 24 h',
      para: descricaoFuncaoItem('monitoramento'),
    },
    {
      qtd: '1 serv.',
      item: 'Projeto, ART e homologação',
      para: descricaoFuncaoItem('projeto art homologação'),
    },
  ]

  const formasPagamento: Array<{ titulo: string; texto: string }> = [
    {
      titulo: 'À vista',
      texto: 'PIX ou TED — condição com o desconto desta proposta.',
    },
    {
      titulo: 'Financiamento',
      texto: 'Bancário em até 84x, com até 90 dias de carência para a 1ª parcela.',
    },
    {
      titulo: 'Cartão de crédito',
      texto: 'Em até 24x, conforme a bandeira.',
    },
  ]

  const garantiaInversorTxt =
    GARANTIA_INVERSOR_ANOS && GARANTIA_INVERSOR_ANOS > 0
      ? `garantia de fábrica de ${GARANTIA_INVERSOR_ANOS} anos conforme certificado do fabricante`
      : 'garantia de fábrica conforme certificado do fabricante'
  const garantiaInstalacaoTxt =
    GARANTIA_INSTALACAO_ANOS && GARANTIA_INSTALACAO_ANOS > 0
      ? `garantia de ${GARANTIA_INSTALACAO_ANOS} anos sobre o serviço executado pela Ecosolar`
      : 'garantia sobre o serviço executado pela Ecosolar'

  return {
    numero: (data.id || 'ECO').slice(-6).toUpperCase(),
    emissaoBR: formatDateBR(emissao.toISOString()),
    validadeBR: formatDateBR(validade.toISOString()),
    anoEmissao: emissao.getFullYear(),
    fioB: percentualFioB(emissao),
    clienteNome: data.cliente?.nome || 'Cliente',
    primeiroNome: (data.cliente?.nome || 'Cliente').split(' ')[0],
    localCliente:
      [data.cliente?.cidade, data.cliente?.estado].filter(Boolean).join(' - ') || 'Brasil',
    consumoKwh,
    tipoTelhado: tipoEstruturaTexto,
    concessionaria: CONCESSIONARIA_PADRAO,
    consultorNome: data.vendedor?.name || 'Equipe Ecosolar Energy',
    consultorEmail: data.vendedor?.email || CONTATO_ECOSOLAR.email || 'hernandes43210@gmail.com',
    whatsapp: WHATSAPP_ECOSOLAR,
    instagram: INSTAGRAM_ECOSOLAR,
    calc,
    precoFinalRS: formatBRL(precoFinal),
    precoCheioRS: formatBRL(precoCheio),
    descontoRS: formatBRL(calc.descontoRs),
    descontoPct: Math.round(calc.descontoPct),
    tarifaRS: `R$ ${formatNumeroBR(calc.tarifaKwh, 2)}`,
    contaHojeRS: formatBRL(calc.contaHoje),
    economiaMensalRS: formatBRL(calc.economiaMensal),
    economiaAnualRS: formatBRL(calc.economiaAnual),
    economia25Txt: `${formatNumeroBR(Math.floor(calc.economia25Anos / 1000), 0)} mil`,
    paybackCurtoTxt: paybackCurtoLocal(calc.paybackMeses),
    paybackExtensoTxt: paybackExtensoLocal(calc.paybackMeses),
    rendimentoSolarInt: Math.round(calc.rendimentoSolarPct),
    cdbNoPrimeiroAnoRS: formatBRL(precoFinal * RENDIMENTO_CDB_LIQUIDO_AO_ANO),
    marcaPainel,
    marcaInversor,
    potenciaPainelW,
    potenciaInversorKw,
    stringBox,
    tipoEstruturaTexto,
    qtdPaineis,
    areaTelhadoM2,
    kwpFmt: formatNumeroBR(kwp, 2),
    itensKit,
    faq: FAQ_PROPOSTA,
    etapas: etapasImplantacao(CONCESSIONARIA_PADRAO),
    depoimento: DEPOIMENTO_PROPOSTA,
    garantiaInversorTxt,
    garantiaInstalacaoTxt,
    formasPagamento,
  }
}

function paybackCurtoLocal(meses: number): string {
  if (meses <= 0) return '—'
  const anos = Math.round((meses / 12) * 2) / 2
  return `≈ ${String(anos).replace('.', ',')} ${anos === 1 ? 'ano' : 'anos'}`
}

function paybackExtensoLocal(meses: number): string {
  if (meses <= 0) return '—'
  const anos = Math.floor(meses / 12)
  const rest = meses % 12
  const partes: string[] = []
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`)
  if (rest > 0) partes.push(`${rest} ${rest === 1 ? 'mês' : 'meses'}`)
  return partes.length ? `cerca de ${partes.join(' e ')}` : 'cerca de 1 mês'
}

export { RENDIMENTO_POUPANCA_AO_ANO, RENDIMENTO_CDB_LIQUIDO_AO_ANO, PERDA_ANUAL_PAINEL }
