/**
 * Cálculos da proposta clássica REVISADA — economia LÍQUIDA (Lei 14.300).
 * Substitui a lógica antiga de proposalCalculos mantendo os exports usados
 * pelos outros módulos (formatBRL, percentualFioB, garantias, rendimentos...).
 */

// ---------- constantes de mercado ----------
export const TARIFA_PADRAO_KWH = 0.98 // R$/kWh (tarifa cheia com impostos — referência da proposta)
export const TARIFA_FIO_B_PADRAO = 0.3 // R$/kWh do componente Fio B (referência)
export const PERDA_ANUAL_PAINEL = 0.004 // degradação de 0,4% a.a. composta
export const RENDIMENTO_POUPANCA_AO_ANO = 0.006 // poupança ~0,6% a.a.
export const RENDIMENTO_CDB_LIQUIDO_AO_ANO = 0.1 // CDB líquido de IR ~10% a.a.
export const DIAS_VALIDADE_PADRAO = 15
export const GARANTIA_INVERSOR_ANOS = 10
export const GARANTIA_INSTALACAO_ANOS = 5
export const SIMULTANEIDADE_PADRAO = 0.3 // 30% da energia injetada não é compensada

/** Percentual do Fio B cobrado sobre a energia injetada, por ano (Lei 14.300). */
export const FIO_B_POR_ANO: Record<number, number> = {
  2023: 0.15,
  2024: 0.3,
  2025: 0.45,
  2026: 0.6,
  2027: 0.75,
  2028: 0.9,
}

export function percentualFioB(data: Date): number {
  const ano = data.getFullYear()
  return FIO_B_POR_ANO[ano] ?? 0.9 // a partir de 2029: 90% (tarifa cheia)
}

/** kWh mínimos faturados por tipo de ligação (taxa de disponibilidade). */
export const TAXA_DISPONIBILIDADE_KWH: Record<TipoLigacao, number> = {
  mono: 30,
  bi: 50,
  tri: 100,
}

export type TipoLigacao = 'mono' | 'bi' | 'tri'

// ---------- formatação ----------
export function formatBRL(v: number | null | undefined): string {
  const n = Number(v || 0)
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export function formatNumeroBR(v: number | null | undefined, decimals = 0): string {
  const n = Number(v || 0)
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function formatPct(v: number | null | undefined, decimals = 0): string {
  return `${formatNumeroBR(v, decimals)}%`
}

/** Partículas "da/de/do/das/dos/e" em minúsculas. */
const PARTICULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])
export function capitalizarNome(nome: string): string {
  return (nome || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (PARTICULAS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

/** "4 anos e 3 meses" a partir de meses (>= 1) — vazio quando inválido. */
export function anosEMeses(meses: number): string {
  if (!Number.isFinite(meses) || meses <= 0) return '—'
  const m = Math.max(1, Math.round(meses))
  const anos = Math.floor(m / 12)
  const rest = m % 12
  if (anos === 0) return `${m} ${m === 1 ? 'mês' : 'meses'}`
  const anosTxt = `${anos} ${anos === 1 ? 'ano' : 'anos'}`
  if (rest === 0) return anosTxt
  return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${rest} ${rest === 1 ? 'mês' : 'meses'}`
}

/** Versão curta do payback, ex.: "4 a 5 anos". */
export function paybackCurto(meses: number): string {
  const t = anosEMeses(meses)
  if (t === '—') return '—'
  const anos = Math.round(meses / 12)
  if (anos < 1) return t
  return `${anos} a ${anos + 1} anos`
}

export function calcularDataValidade(de: Date, dias = DIAS_VALIDADE_PADRAO): Date {
  const d = new Date(de)
  d.setDate(d.getDate() + dias)
  return d
}

// ---------- entrada / saída ----------
export interface LimiteInversorInfo {
  razaoPct: number
  limitePct: number
  estourado: boolean
}

export interface EntradaCalculoProposta {
  consumoKwh: number
  potenciaKwp: number
  precoFinal: number
  precoCheio?: number
  tarifaKwh?: number
  tarifaFioB?: number
  tipoLigacao?: TipoLigacao
  dataEmissao?: Date
  simultaneidade?: number
  hsp?: number
  eficiencia?: number
  kwInversor?: number
  qtdInversores?: number
  limiteInversorPct?: number
}

export interface ResultadoCalculoProposta {
  geracaoDiariaKwh: number
  geracaoMensalKwh: number
  coberturaPct: number
  energiaCompensadaKwh: number
  energiaInjetadaKwh: number
  contaHoje: number
  consumoNaoCobertoKwh: number
  custoConsumoNaoCoberto: number
  taxaMinimaMensal: number
  custoFioBMensal: number
  contaNova: number
  economiaMensal: number
  economiaAnual: number
  economia25Anos: number
  paybackMeses: number
  rendimentoSolarPct: number
  tarifaKwh: number
  tarifaFioB: number
  fioBPct: number
  precoFinal: number
  precoCheio: number
  descontoRs: number
  descontoPct: number
  alertaInversor: LimiteInversorInfo | null
}

const HSP_PADRAO = 4.6
const EFICIENCIA_PADRAO = 0.8

export function calcularProposta(e: EntradaCalculoProposta): ResultadoCalculoProposta {
  const consumo = Math.max(0, Number(e.consumoKwh || 0))
  const potencia = Math.max(0, Number(e.potenciaKwp || 0))
  const precoFinal = Math.max(0, Number(e.precoFinal || 0))
  const precoCheio = Math.max(precoFinal, Number(e.precoCheio ?? precoFinal))
  const tarifa = Number(e.tarifaKwh || TARIFA_PADRAO_KWH)
  const tipoLigacao: TipoLigacao = e.tipoLigacao || 'mono'
  const data = e.dataEmissao || new Date()
  const s = Number.isFinite(e.simultaneidade) ? Number(e.simultaneidade) : SIMULTANEIDADE_PADRAO
  const hsp = Number.isFinite(e.hsp) ? Number(e.hsp) : HSP_PADRAO
  const ef = Number.isFinite(e.eficiencia) ? Number(e.eficiencia) : EFICIENCIA_PADRAO

  const geracaoDiariaKwh = potencia * hsp * ef
  const geracaoMensalKwh = geracaoDiariaKwh * 30
  const cobertura = consumo > 0 ? Math.min(1, geracaoMensalKwh / consumo) : 0
  // Só compensa até o que a casa consome: excedente vira crédito, não reduz a conta além disso.
  const energiaCompensadaKwh = consumo > 0 ? Math.min(geracaoMensalKwh, consumo) : 0
  const energiaInjetadaKwh = energiaCompensadaKwh * (1 - s)

  const contaHoje = consumo * tarifa

  const kWhMin = TAXA_DISPONIBILIDADE_KWH[tipoLigacao]
  const taxaMinimaMensal = kWhMin * tarifa
  const consumoNaoCobertoKwh = Math.max(0, consumo - energiaCompensadaKwh)
  const custoConsumoNaoCoberto = consumoNaoCobertoKwh * tarifa

  const fioBPct = percentualFioB(data)
  const tarifaFioB = Number.isFinite(e.tarifaFioB) ? Number(e.tarifaFioB) : TARIFA_FIO_B_PADRAO
  const custoFioBMensal = energiaInjetadaKwh * tarifaFioB * fioBPct

  const baseContaNova = Math.max(taxaMinimaMensal, custoConsumoNaoCoberto)
  const contaNova = baseContaNova + custoFioBMensal

  const economiaMensal = Math.max(0, contaHoje - contaNova)
  const economiaAnual = economiaMensal * 12
  const paybackMeses = economiaAnual > 0 ? (precoFinal / economiaAnual) * 12 : 0

  // 25 anos com degradação de painéis (0,4% a.a. composta)
  let economia25Anos = 0
  for (let ano = 0; ano < 25; ano++) {
    economia25Anos += economiaMensal * 12 * Math.pow(1 - PERDA_ANUAL_PAINEL, ano)
  }

  const rendimentoSolarPct = precoFinal > 0 ? (economiaAnual / precoFinal) * 100 : 0

  const descontoRs = Math.max(0, precoCheio - precoFinal)
  const descontoPct = precoCheio > 0 ? (descontoRs / precoCheio) * 100 : 0

  // ---------- ALERTA DE SOBRECARGA DO INVERSOR (uso interno, no-print) ----------
  const kwInv = Number(e.kwInversor || 0)
  const qtdInv = Math.max(1, Number(e.qtdInversores || 1))
  const limitePct = Number.isFinite(e.limiteInversorPct) ? Number(e.limiteInversorPct) : 1.5
  let alertaInversor: LimiteInversorInfo | null = null
  if (kwInv > 0 && potencia > 0) {
    const razao = potencia / (kwInv * qtdInv)
    alertaInversor = {
      razaoPct: razao * 100,
      limitePct: limitePct * 100,
      estourado: razao > limitePct,
    }
  }

  return {
    geracaoDiariaKwh,
    geracaoMensalKwh,
    coberturaPct: Math.round(cobertura * 100),
    energiaCompensadaKwh,
    energiaInjetadaKwh,
    contaHoje,
    consumoNaoCobertoKwh,
    custoConsumoNaoCoberto,
    taxaMinimaMensal,
    custoFioBMensal,
    contaNova,
    economiaMensal,
    economiaAnual,
    economia25Anos,
    paybackMeses,
    rendimentoSolarPct,
    tarifaKwh: tarifa,
    tarifaFioB,
    fioBPct,
    precoFinal,
    precoCheio,
    descontoRs,
    descontoPct,
    alertaInversor,
  }
}

// ---------- conteúdo fixo ----------
export const FAQ_PROPOSTA = [
  {
    q: 'E se faltar energia na rede?',
    a: 'Por segurança, o inversor desliga junto com a rede e volta sozinho. Para ter luz no apagão, existe a opção com bateria.',
  },
  {
    q: 'Precisa de manutenção?',
    a: 'Pouca: limpar os painéis com água de vez em quando, principalmente na seca. O app avisa se a geração cair.',
  },
  {
    q: 'E se eu aumentar o consumo?',
    a: 'O sistema pode ser ampliado depois, dentro da capacidade do inversor ou com um segundo inversor.',
  },
  {
    q: 'A conta zera?',
    a: 'Não. Continuam a taxa mínima e o Fio B (página 4). Ainda assim, a maior parte da conta deixa de existir.',
  },
] as const

export function etapasImplantacao(_concessionaria: string) {
  return [
    {
      quem: 'Você',
      titulo: 'Aceite da proposta',
      txt: 'Você aprova online ou assina e escolhe a forma de pagamento.',
    },
    {
      quem: 'Ecosolar',
      titulo: 'Vistoria técnica',
      txt: 'Conferimos telhado, padrão de entrada e posição dos painéis.',
    },
    {
      quem: 'Ecosolar',
      titulo: 'Projeto + ART',
      txt: 'Engenheiro eletricista elabora o projeto e emite a ART.',
    },
    {
      quem: 'Ecosolar',
      titulo: 'Pedido na concessionária',
      txt: 'Protocolamos e acompanhamos a aprovação do projeto.',
    },
    {
      quem: 'Ecosolar',
      titulo: 'Entrega do material',
      txt: 'Equipamentos novos, lacrados e com nota fiscal.',
    },
    { quem: 'Ecosolar', titulo: 'Instalação', txt: 'Equipe treinada em NR10 e NR35. Obra limpa.' },
    {
      quem: 'Concessionária',
      titulo: 'Vistoria e medidor',
      txt: 'Troca do medidor pelo bidirecional, que registra os créditos.',
    },
    {
      quem: 'Você',
      titulo: 'Sistema ligado',
      txt: 'Ensinamos a usar o app e você acompanha tudo pelo celular.',
    },
  ]
}

export const DEPOIMENTO_PROPOSTA = [
  {
    nome: 'Dona Arlete – Seringueiras/RO',
    txt: 'Pediram 20 dias e entregaram em 16. Equipe boa, eficiente e rápida — eu recomendo.',
  },
] as const

/** Instalação em até X dias após a aprovação da concessionária (página 5). */
export const PRAZO_INSTALACAO_DIAS = 20
