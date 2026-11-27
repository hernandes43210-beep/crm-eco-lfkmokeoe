/**
 * Dados da proposta clássica REVISADA (navy #0B1E4A + amarelo #FFC629).
 * Substitui a antiga montarDadosV2: lê os MESMOS inputs (proposta pública + kit).
 * Fonte dos números: calcularProposta (economia líquida, Lei 14.300).
 */
import type { PublicProposta } from '@/types/crm'
import {
  parsePaineisLinhas,
  parseInversoresLinhas,
  parseBateriasJson,
  type PainelJsonValor,
  type InversorJsonValor,
} from '@/services/kitGerador'
import { rotuloBateria } from './propostaBaterias'
import {
  calcularProposta,
  calcularDataValidade,
  formatNumeroBR,
  formatBRL,
  paybackCurto,
  anosEMeses,
  capitalizarNome,
  percentualFioB,
  FAQ_PROPOSTA,
  etapasImplantacao,
  DEPOIMENTO_PROPOSTA,
  GARANTIA_INVERSOR_ANOS,
  GARANTIA_INSTALACAO_ANOS,
  RENDIMENTO_POUPANCA_AO_ANO,
  RENDIMENTO_CDB_LIQUIDO_AO_ANO,
  DIAS_VALIDADE_PADRAO,
  PRAZO_INSTALACAO_DIAS,
  TAXA_DISPONIBILIDADE_KWH,
  type ResultadoCalculoProposta,
  type TipoLigacao,
  type LimiteInversorInfo,
} from './proposalCalculos'

/** Área aproximada por kWp (m²) — fallback quando o painel não traz área. */
const M2_POR_KWP = 5

export interface FotoProposta {
  url: string
  legenda?: string
}

export interface EmpresaProposta {
  nome: string
  slogan: string
  cnpj: string
  endereco: string
  whatsapp: string
  email: string
  instagram: string
  engenheiro: string
  crea: string
}

export const EMPRESA_PADRAO: EmpresaProposta = {
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

export interface KitItensProposta {
  nome: string
  qtd: string
  obs: string
}

export interface DadosV2 {
  empresa: EmpresaProposta
  numero: string
  dataEmissao: Date
  dataValidade: Date
  validadeDias: number
  clienteNome: string
  clientePrimeiroNome: string
  /** Segundo depoimento (placeholder até o CRM ter depoimentos reais). */
  depoimentoExtra: { nome: string; txt: string } | null
  precoAVistaRS: string
  cartaoTxt: string
  prazoInstalacaoDias: number
  cidade: string
  uf: string
  cidadeUf: string
  consumoKwh: number
  tipoTelhado: string
  tipoLigacao: TipoLigacao
  concessLabel: string
  concessionaria: string
  consultorNome: string
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
  kitItens: KitItensProposta[]
  fotoCapa: FotoProposta | null
  calc: ResultadoCalculoProposta
  fioBPct: number
  simultaneidadePct: number
  tarifaFioB: number
  aceiteUrl: string
  financiamentoTxt: string
  faq: typeof FAQ_PROPOSTA
  etapas: ReturnType<typeof etapasImplantacao>
  depoimento: typeof DEPOIMENTO_PROPOSTA
  garantiaInversorAnos: number | null
  garantiaInstalacaoAnos: number | null
  rendPoupancaPct: number
  rendCdbPct: number
  alertaInversor: LimiteInversorInfo | null
  txt: {
    contaHojeRS: string
    contaNovaRS: string
    economiaMensalRS: string
    economiaAnualRS: string
    retornoPctAA: string
    paybackCurto: string
    paybackExtenso: string
    anosEMeses: (m: number) => string
    economia25RS: string
    potenciaTxt: string
    geracaoTxt: string
    precoFinalRS: string
    precoCheioRS: string
    descontoRS: string
    descontoPct: string
    tarifaRS: string
    taxaMinimaRS: string
    fioBRS: string
    coberturaPctTxt: string
  }
}

export type PropostaInput = PublicProposta

/** O expand do kit, em runtime, traz também os campos JSON do kit gerado. */
type KitCamposJson = { painel?: PainelJsonValor; inversor?: InversorJsonValor }

function parseTipoLigacao(p: PropostaInput): TipoLigacao {
  const t = ((p as unknown as Record<string, unknown>).tipo_ligacao as string) || ''
  const tl = t.toLowerCase()
  if (tl.includes('tri')) return 'tri'
  if (tl.includes('bi')) return 'bi'
  // dica pelo texto do kit (ex.: "Monofásico")
  const kitTxt = String(p.kit_descricao || '')
  if (kitTxt.toLowerCase().includes('trif')) return 'tri'
  if (kitTxt.toLowerCase().includes('bif')) return 'bi'
  return 'mono'
}

export function proposalDataDePublica(
  p: PropostaInput,
  empresa: Partial<EmpresaProposta> = {},
  aceiteUrl = '',
): DadosV2 {
  const emp: EmpresaProposta = { ...EMPRESA_PADRAO, ...empresa }
  const kit = p.kit
  const kitJson = (kit ?? {}) as unknown as KitCamposJson
  const paineisLinhas = parsePaineisLinhas(kitJson.painel ?? null)
  const painel =
    paineisLinhas[0] ??
    (kit?.marca_painel || p.kit_marca_painel
      ? {
          marca: kit?.marca_painel || p.kit_marca_painel || '',
          modelo: '',
          potencia_w: Number(kit?.potencia_painel_w || p.kit_potencia_painel_w || 0),
          area_m2: 0,
          qtd: 0,
        }
      : null)
  const inversoresLinhas = parseInversoresLinhas(kitJson.inversor ?? null)
  const tipoLigacao = parseTipoLigacao(p)
  const dataEmissao = p.created ? new Date(p.created) : new Date()
  const dataValidade = p.data_validade
    ? new Date(p.data_validade)
    : calcularDataValidade(dataEmissao)

  const potenciaKwp = Number(p.kit_potencia_kw || kit?.potencia_kw || 0)
  const precoFinal = Number(p.preco_venda || 0)
  const precoCheio = Number(p.valor_bruto || p.preco_venda || 0)

  const calc = calcularProposta({
    consumoKwh: Number(p.lead?.consumo_mensal_kwh || 0),
    potenciaKwp,
    precoFinal,
    precoCheio,
    tarifaKwh: undefined,
    tipoLigacao,
    dataEmissao,
    kwInversor: Number(kit?.potencia_inversor_kw || p.kit_potencia_inversor_kw || 0) || undefined,
    qtdInversores: Number(kit?.qtd_inversores || p.kit_qtd_inversores || 1),
  })

  // FOTOS: somente a CAPA — nenhuma foto de obras destacada (decisão do usuário).
  let fotoCapa: FotoProposta | null = null
  const kitImg = kit?.imagem_ia_url || kit?.imagem_ia
  if (kitImg) {
    fotoCapa = { url: kitImg, legenda: 'Imagem ilustrativa do sistema proposto' }
  }

  const financiamentoTxt = 'ou financiamento com carência — consulte condições'

  return {
    empresa: emp,
    numero: p.token_publico || p.id || '',
    dataEmissao,
    dataValidade,
    validadeDias: Number(p.validade_dias || DIAS_VALIDADE_PADRAO),
    clienteNome: capitalizarNome(p.lead?.nome || 'Cliente'),
    clientePrimeiroNome: capitalizarNome(p.lead?.nome || 'Cliente').split(' ')[0] || 'Cliente',
    cidade: p.lead?.cidade || '',
    uf: p.lead?.estado || '',
    cidadeUf: [p.lead?.cidade, p.lead?.estado].filter(Boolean).join(' - '),
    consumoKwh: Number(p.lead?.consumo_mensal_kwh || 0),
    tipoTelhado: p.kit_tipo_estrutura || kit?.tipo_estrutura || 'telhado',
    tipoLigacao,
    concessLabel: p.lead?.cidade ? `a ${p.lead.cidade}` : 'à sua região',
    concessionaria: 'concessionária local',
    consultorNome: p.vendedor?.name || '',
    potenciaKwp,
    geracaoMensalKwh: calc.geracaoMensalKwh,
    areaM2: painel?.area_m2 && painel?.qtd ? painel.area_m2 * painel.qtd : potenciaKwp * M2_POR_KWP,
    painelModelo: painel
      ? `${painel.marca} ${painel.modelo || ''}`.trim() || 'Painel fotovoltaico monocristalino'
      : 'Painel fotovoltaico monocristalino',
    painelQtd: painel?.qtd ? Number(painel.qtd) : 0,
    painelGarantiaProduto: '12 anos',
    painelGarantiaDesempenho: '30 anos',
    inversorModelo: (() => {
      const inv = inversoresLinhas[0]
      if (inv) return `${inv.marca} ${inv.modelo}`.trim()
      return kit?.marca_inversor || p.kit_marca_inversor
        ? (kit?.marca_inversor || p.kit_marca_inversor || '').trim()
        : 'Inversor string'
    })(),
    inversorKw: Number(kit?.potencia_inversor_kw || p.kit_potencia_inversor_kw || 0),
    inversorQtd: Number(kit?.qtd_inversores || p.kit_qtd_inversores || 1),
    kitItens: (() => {
      // Baterias do kit entram como linhas do "O que vem no seu kit" (v0.0.79+).
      const baterias = parseBateriasJson(p.kit_baterias)
      return baterias.map((b) => ({
        nome: rotuloBateria(b),
        qtd: String(b.qtd || 1),
        obs: 'Armazenamento de energia (ampliação opcional)',
      }))
    })(),
    fotoCapa,
    calc,
    fioBPct: percentualFioB(dataEmissao),
    simultaneidadePct: 30,
    tarifaFioB: calc.tarifaFioB,
    aceiteUrl,
    financiamentoTxt,
    cartaoTxt: '',
    prazoInstalacaoDias: PRAZO_INSTALACAO_DIAS,
    depoimentoExtra: {
      nome: 'Marcos R. – Porto Velho/RO',
      txt: 'Do orçamento à ligação, tudo aconteceu no prazo combinado. Equipe organizada e o monitoramento no celular funcionando perfeitamente.',
    },
    precoAVistaRS: formatBRL(precoFinal),
    faq: FAQ_PROPOSTA,
    etapas: etapasImplantacao('concessionária local'),
    depoimento: DEPOIMENTO_PROPOSTA,
    garantiaInversorAnos: GARANTIA_INVERSOR_ANOS,
    garantiaInstalacaoAnos: GARANTIA_INSTALACAO_ANOS,
    rendPoupancaPct: Math.round(RENDIMENTO_POUPANCA_AO_ANO * 100),
    rendCdbPct: Math.round(RENDIMENTO_CDB_LIQUIDO_AO_ANO * 100),
    alertaInversor: calc.alertaInversor,
    txt: {
      contaHojeRS: formatBRL(calc.contaHoje),
      contaNovaRS: formatBRL(calc.contaNova),
      economiaMensalRS: formatBRL(calc.economiaMensal),
      economiaAnualRS: formatBRL(calc.economiaAnual),
      retornoPctAA: `${formatNumeroBR(calc.rendimentoSolarPct, 1)}% a.a.`,
      paybackCurto: paybackCurto(calc.paybackMeses),
      paybackExtenso: paybackExtensoTxt(calc.paybackMeses),
      anosEMeses,
      economia25RS: formatBRL(calc.economia25Anos),
      potenciaTxt: `${formatNumeroBR(potenciaKwp, 2)} kWp`,
      geracaoTxt: `${formatNumeroBR(calc.geracaoMensalKwh)} kWh/mês`,
      precoFinalRS: formatBRL(precoFinal),
      precoCheioRS: formatBRL(precoCheio),
      descontoRS: formatBRL(calc.descontoRs),
      descontoPct: `${formatNumeroBR(calc.descontoPct, 0)}%`,
      tarifaRS: formatBRL(calc.tarifaKwh),
      taxaMinimaRS: formatBRL(calc.taxaMinimaMensal),
      fioBRS: formatBRL(calc.custoFioBMensal),
      coberturaPctTxt: `${calc.coberturaPct}%`,
    },
  }
}

function paybackExtensoTxt(meses: number): string {
  const t = anosEMeses(meses)
  return t === '—' ? '' : `cerca de ${t}`
}

/** Compat: nome antigo mantido exportado. */
export const montarDadosV2 = proposalDataDePublica

export { TAXA_DISPONIBILIDADE_KWH }
export type { TipoLigacao }
