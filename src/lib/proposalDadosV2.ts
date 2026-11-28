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
import { parseCondicoesPagamento } from './paymentConditionsParser'
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
  /** Tabela completa do kit (página 3): colunas Qtd./Item/Para que serve/Incluso. */
  itensKit: { qtd: string; item: string; paraQue: string; incluso: string }[]
  coberturaPct: number
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
  /** Etapas da implantação (página 5) — quem/título/texto. */
  garantias: string[]
  incluso: string[]
  naoIncluso: string[]
  formasPagamento: { titulo: string; descricao: string }[]
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
    coberturaTxt: string
    formulaTxt: string
    descontoBadge: string
    parcelasTxt: string
    rendPoupanca: string
    rendCdb: string
    rendimentoSolar: string
    comoCalculamos: string[]
    continuaNaConta: string[]
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

  const fioBPctAtual = percentualFioB(dataEmissao)
  const fioBPctInt = Math.round(fioBPctAtual * 100)
  const anoEmissao = dataEmissao.getFullYear()
  const fioBTexto =
    anoEmissao >= 2028
      ? 'sobe para 90% em 2028'
      : anoEmissao === 2027
        ? 'sobe para 75% em 2027'
        : `hoje ${fioBPctInt}% (sobe para 75% em 2027 e 90% em 2028)`
  const painelQtdCalc =
    painel?.qtd && Number(painel.qtd) > 0
      ? Number(painel.qtd)
      : painel?.potencia_w
        ? Math.max(1, Math.round((potenciaKwp * 1000) / Number(painel.potencia_w)))
        : 0
  const painelNome =
    painel && (painel.marca || painel.modelo)
      ? `${painel.marca} ${painel.modelo || ''}`.trim()
      : 'Painel fotovoltaico monocristalino'
  const inversorNome = (() => {
    const inv = inversoresLinhas[0]
    if (inv) return `${inv.marca} ${inv.modelo || ''}`.trim() || 'Inversor string'
    return (kit?.marca_inversor || p.kit_marca_inversor || '').trim() || 'Inversor string'
  })()
  const tipoEstruturaTxt = p.kit_tipo_estrutura || kit?.tipo_estrutura || 'telhado'
  const stringBoxTxt = String(kit?.string_box || p.kit_string_box || '').trim()
  const bateriasKit = parseBateriasJson(p.kit_baterias)
  const itensKit: { qtd: string; item: string; paraQue: string; incluso: string }[] = []
  itensKit.push({
    qtd: painelQtdCalc > 0 ? String(painelQtdCalc) : '—',
    item: painelNome,
    paraQue: 'Geração de energia limpa a partir do sol',
    incluso: '✓ Incluso',
  })
  itensKit.push({
    qtd: String(Math.max(1, Number(kit?.qtd_inversores || p.kit_qtd_inversores || 1))),
    item: inversorNome,
    paraQue: 'Converte a energia para uso na casa (monitoramento incluso)',
    incluso: '✓ Incluso',
  })
  itensKit.push({
    qtd: '1',
    item: `Estrutura de fixação (${tipoEstruturaTxt})`,
    paraQue: 'Fixação e montagem dos painéis',
    incluso: '✓ Incluso',
  })
  if (stringBoxTxt) {
    itensKit.push({
      qtd: '1',
      item: `String box ${stringBoxTxt}`,
      paraQue: 'Proteção e comando do sistema (disjuntores e DPS)',
      incluso: '✓ Incluso',
    })
  }
  for (const b of bateriasKit) {
    itensKit.push({
      qtd: String(b.qtd || 1),
      item: rotuloBateria(b),
      paraQue: 'Armazenamento de energia (ampliação opcional)',
      incluso: '✓ Incluso',
    })
  }
  const matchParcelas = String(
    (p as unknown as Record<string, unknown>).condicoes_pagamento || '',
  ).match(/(\d{1,3}\s*x)/i)
  const parcelasTxt = matchParcelas
    ? `Em até ${matchParcelas[1].replace(/\s+/g, '')} no cartão ou ${financiamentoTxt}`
    : financiamentoTxt
  const formasPagamento = ((p as unknown as Record<string, unknown>).condicoes_pagamento as string)
    ? parseCondicoesPagamento(
        (p as unknown as Record<string, unknown>).condicoes_pagamento as string,
        precoFinal,
      ).itens.map((i) => ({ titulo: i.titulo, descricao: i.descricao }))
    : [
        { titulo: 'À vista', descricao: 'PIX ou TED — melhor condição e retorno imediato.' },
        { titulo: 'Financiamento', descricao: 'Com carência — consulte as condições.' },
      ]

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
    painelModelo: painelNome,
    painelQtd: painelQtdCalc,
    painelGarantiaProduto: '12 anos',
    painelGarantiaDesempenho: '30 anos',
    inversorModelo: inversorNome,
    inversorKw: Number(kit?.potencia_inversor_kw || p.kit_potencia_inversor_kw || 0),
    inversorQtd: Number(kit?.qtd_inversores || p.kit_qtd_inversores || 1),
    kitItens: bateriasKit.map((b) => ({
      nome: rotuloBateria(b),
      qtd: String(b.qtd || 1),
      obs: 'Armazenamento de energia (ampliação opcional)',
    })),
    itensKit,
    coberturaPct: calc.coberturaPct,
    fotoCapa,
    calc,
    fioBPct: fioBPctAtual,
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
    garantias: [
      `Painéis ${painelNome}: garantia de produto de 12 anos e desempenho linear de 30 anos.`,
      `Inversor ${inversorNome}: ${GARANTIA_INVERSOR_ANOS} anos de garantia.`,
      `Instalação: ${GARANTIA_INSTALACAO_ANOS} anos de garantia e suporte técnico pós-venda.`,
      'Projeto assinado por engenheiro eletricista, com ART registrada no CREA.',
    ],
    incluso: [
      'Todos os equipamentos e a estrutura de fixação',
      'Projeto, ART e homologação na concessionária',
      'Mão de obra de instalação e frete do material',
      'Configuração do monitoramento no seu celular',
    ],
    naoIncluso: [] as string[],
    formasPagamento,
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
      descontoBadge: calc.descontoRs > 0 ? `-${formatNumeroBR(calc.descontoPct, 0)}% OFF` : '',
      parcelasTxt,
      tarifaRS: formatBRL(calc.tarifaKwh),
      taxaMinimaRS: formatBRL(calc.taxaMinimaMensal),
      fioBRS: formatBRL(calc.custoFioBMensal),
      coberturaPctTxt: `${calc.coberturaPct}%`,
      coberturaTxt: `${calc.coberturaPct}%`,
      formulaTxt: `${formatNumeroBR(potenciaKwp, 2)} kWp × ~4,6 h de sol/dia × 30 dias × 80% = ~${formatNumeroBR(calc.geracaoMensalKwh)} kWh/mês`,
      rendPoupanca: `${Math.round(RENDIMENTO_POUPANCA_AO_ANO * 100)}%`,
      rendCdb: `${Math.round(RENDIMENTO_CDB_LIQUIDO_AO_ANO * 100)}%`,
      rendimentoSolar: `${formatNumeroBR(calc.rendimentoSolarPct, 1)}%`,
      comoCalculamos: [
        `Geração de ~${formatNumeroBR(calc.geracaoMensalKwh)} kWh/mês, com 20% de perdas já descontadas.`,
        `Tarifa média de ${formatBRL(calc.tarifaKwh)}/kWh — ${formatBRL(calc.taxaMinimaMensal)} de taxa mínima já considerada.`,
        `Fio B da Lei 14.300 descontado: ${formatBRL(calc.custoFioBMensal)}/mês — e ele sobe todo ano.`,
        'Em 25 anos já descontamos o desgaste natural dos painéis (~0,4% ao ano).',
      ],
      continuaNaConta: [
        'A taxa mínima da concessionária (custo de disponibilidade) — todo cliente conectado à rede paga.',
        `O Fio B (Lei 14.300): parte do uso da rede sobre a energia que vai e volta como crédito — ${fioBTexto}.`,
        'O consumo que passar do que o sistema gera.',
        'Por isso falamos em economia ESTIMADA: a conta não zera, mas cai muito.',
      ],
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
