/**
 * Cálculos da Proposta Comercial — versão explicativa (formato clássico v2).
 * Todas as fórmulas saem daqui, para que a página pública (/proposta/:id)
 * e a versão para imprimir/PDF (proposalPdf.ts) mostrem SEMPRE os mesmos números.
 */
import { IRRADIACAO_MEDIA_DIARIA_HORAS, FATOR_PERDAS_SISTEMA } from '@/lib/solarUtils'

/** Tarifa média com impostos (R$/kWh) — padrão atual usado quando a proposta não traz o campo. */
export const TARIFA_PADRAO_KWH = 0.9775

/** Desgaste natural dos painéis por ano (0,4%). */
export const PERDA_ANUAL_PAINEL = 0.004

/** Rendimentos de referência para o comparativo da página 4 (editáveis). */
export const RENDIMENTO_POUPANCA_AO_ANO = 0.0617
export const RENDIMENTO_CDB_LIQUIDO_AO_ANO = 0.1

/** Validade padrão da proposta: emissão + 15 dias. */
export const DIAS_VALIDADE_PADRAO = 15

/** Anos de garantia editáveis (inversor e instalação). Preenchidos => exibidos na página 5. */
export const GARANTIA_INVERSOR_ANOS: number | null = 10
export const GARANTIA_INSTALACAO_ANOS: number | null = 5

/** Depoimento da página 6 (campo configurável). */
export const DEPOIMENTO_PROPOSTA = {
  texto: 'Pediram 20 dias e entregaram em 16. Equipe boa, eficiente e rápida — eu recomendo.',
  autor: 'Dona Arlete, cliente Ecosolar Energy',
}

/** Percentual do Fio B (Lei 14.300) cobrado sobre a energia compensada, conforme o ano da emissão. */
export function percentualFioB(dataEmissao: Date | string): number {
  const ano = new Date(dataEmissao).getFullYear()
  if (ano >= 2028) return 90
  if (ano === 2027) return 75
  return 60
}

export interface EntradaCalculoProposta {
  consumoKwh: number
  potenciaKwp: number
  precoFinal: number
  precoCheio?: number
  tarifaKwh?: number
  irradiacaoHoras?: number
  fatorPerdas?: number
}

export interface ResultadoCalculoProposta {
  potenciaKwp: number
  geracaoMensalKwh: number
  consumoKwh: number
  coberturaPct: number
  restanteRedeKwh: number
  tarifaKwh: number
  irradiacaoHoras: number
  fatorPerdas: number
  contaHoje: number
  economiaMensal: number
  economiaAnual: number
  paybackMeses: number
  paybackAnosMeio: number
  economia25Anos: number
  rendimentoSolarPct: number
  descontoRs: number
  descontoPct: number
  precoFinal: number
  precoCheio: number
}

export function calcularProposta(e: EntradaCalculoProposta): ResultadoCalculoProposta {
  const consumo = Math.max(0, e.consumoKwh || 0)
  const kwp = Math.max(0, e.potenciaKwp || 0)
  const tarifa = e.tarifaKwh && e.tarifaKwh > 0 ? e.tarifaKwh : TARIFA_PADRAO_KWH
  const irradiacao =
    e.irradiacaoHoras && e.irradiacaoHoras > 0 ? e.irradiacaoHoras : IRRADIACAO_MEDIA_DIARIA_HORAS
  const perdas = e.fatorPerdas && e.fatorPerdas > 0 ? e.fatorPerdas : FATOR_PERDAS_SISTEMA

  // potência já vem do kit; geracao = kWp × irradiância × 30 dias × fator de perdas
  const geracaoMensal = Math.round(kwp * irradiacao * 30 * perdas)
  const coberturaPct = consumo > 0 ? Math.min(100, Math.round((geracaoMensal / consumo) * 100)) : 0
  const restanteRede = Math.max(0, consumo - geracaoMensal)

  const contaHoje = consumo * tarifa
  // IMPORTANTE: economia usa a GERAÇÃO (não o consumo) — não prometemos mais do que o sistema entrega
  const baseEconomia = Math.min(geracaoMensal, consumo)
  const economiaMensal = baseEconomia * tarifa
  const economiaAnual = economiaMensal * 12

  const paybackMeses = economiaMensal > 0 ? Math.ceil(e.precoFinal / economiaMensal) : 0
  const paybackAnosMeio = paybackMeses > 0 ? Math.round(paybackMeses / 6) / 2 : 0

  // 25 anos com desgaste de 0,4%/ano aplicado desde o 1º ano, sem reajuste de tarifa
  let economia25 = 0
  for (let ano = 1; ano <= 25; ano++) {
    economia25 += economiaAnual * Math.pow(1 - PERDA_ANUAL_PAINEL, ano)
  }

  const precoCheio = e.precoCheio && e.precoCheio > 0 ? e.precoCheio : e.precoFinal
  const descontoRs = Math.max(0, precoCheio - e.precoFinal)
  const descontoPct = precoCheio > 0 ? (descontoRs / precoCheio) * 100 : 0

  return {
    potenciaKwp: kwp,
    geracaoMensalKwh: geracaoMensal,
    consumoKwh: consumo,
    coberturaPct,
    restanteRedeKwh: Math.round(restanteRede),
    tarifaKwh: tarifa,
    irradiacaoHoras: irradiacao,
    fatorPerdas: perdas,
    contaHoje,
    economiaMensal,
    economiaAnual,
    paybackMeses,
    paybackAnosMeio,
    economia25Anos: economia25,
    rendimentoSolarPct: e.precoFinal > 0 ? (economiaAnual / e.precoFinal) * 100 : 0,
    descontoRs,
    descontoPct,
    precoFinal: e.precoFinal,
    precoCheio,
  }
}

/** Validade = emissão + N dias (padrão 15). Corrige propostas cuja data_validade não bate. */
export function calcularDataValidade(created: Date | string, dias = DIAS_VALIDADE_PADRAO): Date {
  const d = new Date(created)
  if (isNaN(d.getTime())) return new Date()
  d.setDate(d.getDate() + dias)
  return d
}

/** 1234.5 => "1.234" (padrão brasileiro). */
export function formatNumeroBR(v: number, casas = 0): string {
  return (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

/** 951 => "951 kWh" | 1200 => "1.200 kWh". */
export function formatKwhMes(v: number): string {
  return `${formatNumeroBR(v, 0)} kWh`
}

/** 265600 => "R$ 265 mil" (sempre para baixo, para nunca prometer mais). */
export function formatMilReais(v: number): string {
  return `R$ ${formatNumeroBR(Math.floor(v / 1000), 0)} mil`
}

/** "≈ X anos" arredondado de meio em meio ano: 22 meses => "≈ 2 anos". */
export function paybackCurto(meses: number): string {
  if (meses <= 0) return '—'
  const anos = Math.round((meses / 12) * 2) / 2
  const texto = String(anos).replace('.', ',')
  return `≈ ${texto} ${anos === 1 ? 'ano' : 'anos'}`
}

/** 22 meses => "cerca de 1 ano e 10 meses". */
export function paybackExtenso(meses: number): string {
  if (meses <= 0) return ''
  const anos = Math.floor(meses / 12)
  const rest = meses % 12
  const partes: string[] = []
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`)
  if (rest > 0) partes.push(`${rest} ${rest === 1 ? 'mês' : 'meses'}`)
  if (partes.length === 0) return 'cerca de 1 mês'
  return `cerca de ${partes.join(' e ')}`
}

/** Descrição "para que serve cada item" do kit, conforme o tipo de item. */
export function descricaoFuncaoItem(nome: string, tipoEstrutura?: string): string {
  const n = (nome || '').toLowerCase()
  if (n.includes('painel') || n.includes('módulo') || n.includes('modulo') || n.includes('panel')) {
    return 'Monocristalinos de alta eficiência. Captam a luz do sol e transformam em energia elétrica. Garantia de desempenho de 30 anos.'
  }
  if (n.includes('inversor')) {
    return "O 'cérebro' do sistema: converte a energia dos painéis para o padrão da sua tomada e conecta com a rede. Wi-Fi integrado."
  }
  if (n.includes('string') || n.includes('box')) {
    return 'Caixa de proteção com DPS contra raios e surtos e proteção contra sobrecorrente. Protege os equipamentos e a sua casa.'
  }
  if (n.includes('estrutura')) {
    const tipo = (tipoEstrutura || 'telhado').toLowerCase()
    if (tipo.includes('solo') || tipo.includes('ground')) {
      return 'Perfis de alumínio anodizado e fixação em aço inox com vedação, dimensionados para instalação em solo: aguenta vento forte e chuva.'
    }
    if (tipo.includes('carport') || tipo.includes('garagem')) {
      return 'Estrutura metálica para carport/garagem: protege o veículo e gera energia ao mesmo tempo, com fixação em aço galvanizado.'
    }
    return 'Perfis de alumínio anodizado e fixação em aço inox com vedação: aguenta vento forte e não causa goteira.'
  }
  if (n.includes('cabo') || n.includes('mc4') || n.includes('conector')) {
    return "Cabos com dupla isolação e proteção UV; conectores à prova d'água (IP68). Feitos para durar no sol e na chuva."
  }
  if (n.includes('monitor') || n.includes('app')) {
    return 'App no celular (iOS e Android) mostra quanto o sistema gerou no dia, no mês e quanto você economizou.'
  }
  if (n.includes('bateria')) {
    return 'Armazenam a energia excedente para você usar à noite, em apagões ou picos de consumo. Baterias de lítio com BMS integrado.'
  }
  if (n.includes('projeto') || n.includes('art') || n.includes('homolog')) {
    return 'Engenheiro eletricista responsável faz o projeto, registra a ART e cuida de todo o processo na concessionária até a troca do medidor.'
  }
  return 'Componente homologado, incluso no escopo chave na mão da sua instalação.'
}

/** FAQ fixo da página 6 (2 colunas). */
export const FAQ_PROPOSTA: Array<{ p: string; r: string }> = [
  {
    p: 'E se faltar energia na rede?',
    r: 'Por segurança, o inversor desliga junto com a rede e volta sozinho quando a energia retorna. Para ter luz mesmo no apagão, existe a opção com bateria.',
  },
  {
    p: 'Precisa de manutenção?',
    r: 'Pouca: limpar os painéis com água de vez em quando, principalmente na época seca. O app avisa se a geração cair.',
  },
  {
    p: 'E se eu aumentar o consumo?',
    r: 'O sistema pode ser ampliado depois, acrescentando painéis, dentro da capacidade do inversor ou com um segundo inversor.',
  },
  {
    p: 'A conta zera?',
    r: 'Não. Continua a taxa mínima e o Fio B (explicados na página 4). Ainda assim, a maior parte da conta deixa de existir.',
  },
  {
    p: 'Chuva e granizo estragam?',
    r: 'Os painéis têm vidro temperado e são feitos para ficar no tempo por décadas, com sol, chuva e vento.',
  },
  {
    p: 'Valoriza o imóvel?',
    r: 'Sim. Uma casa que produz a própria energia é mais atrativa para venda ou aluguel.',
  },
]

/** Etapas da página 5 (grade 4×2). */
export interface EtapaImplantacao {
  n: string
  titulo: string
  texto: string
  quem: 'VOCE' | 'ECOSOLAR' | 'CONCESS'
  destaque?: boolean
}

export function etapasImplantacao(concessionaria: string): EtapaImplantacao[] {
  return [
    {
      n: '1',
      titulo: 'Aceite da proposta',
      texto: 'Você aprova online ou assina esta proposta e escolhe a forma de pagamento.',
      quem: 'VOCE',
    },
    {
      n: '2',
      titulo: 'Vistoria técnica',
      texto: 'Conferimos telhado, padrão de entrada e o melhor posicionamento dos painéis.',
      quem: 'ECOSOLAR',
    },
    {
      n: '3',
      titulo: 'Projeto + ART',
      texto: 'Engenheiro eletricista elabora o projeto e emite a ART (responsabilidade técnica).',
      quem: 'ECOSOLAR',
    },
    {
      n: '4',
      titulo: 'Pedido na concessionária',
      texto: `Protocolamos e acompanhamos a aprovação do projeto junto à ${concessionaria}.`,
      quem: 'ECOSOLAR',
    },
    {
      n: '5',
      titulo: 'Entrega do material',
      texto: 'Painéis, inversor, estrutura e cabos chegam novos, lacrados e com nota fiscal.',
      quem: 'ECOSOLAR',
    },
    {
      n: '6',
      titulo: 'Instalação',
      texto: 'Equipe treinada em NR10 e NR35 (eletricidade e trabalho em altura). Obra limpa.',
      quem: 'ECOSOLAR',
    },
    {
      n: '7',
      titulo: 'Vistoria e medidor',
      texto:
        'A concessionária vistoria e troca o medidor pelo bidirecional, que registra os créditos.',
      quem: 'CONCESS',
    },
    {
      n: '✓',
      titulo: 'Sistema ligado',
      texto: 'Ensinamos a usar o app e você já acompanha a geração e a economia pelo celular.',
      quem: 'VOCE',
      destaque: true,
    },
  ]
}
