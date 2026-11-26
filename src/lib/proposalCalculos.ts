/**
 * Cálculos da proposta clássica REVISADA — economia LÍQUIDA (Lei 14.300).
 * Substitui a lógica antiga de proposalCalculos mantendo os exports usados
 * pelos outros módulos (formatBRL, percentualFioB, garantias, rendimentos...).
 */

// ---------- constantes de mercado ----------
export const TARIFA_PADRAO_KWH = 1.15 // R$/kWh (tarifa cheia média)
export const PERDA_ANUAL_PAINEL = 0.004 // degradação de 0,4% a.a. composta
export const RENDIMENTO_POUPANCA_AO_ANO = 0.006 // poupança ~0,6% a.a.
export const RENDIMENTO_CDB_LIQUIDO_AO_ANO = 0.0917 // CDB líquido de IR ~9,17% a.a.
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
  const energiaCompensadaKwh = geracaoMensalKwh * cobertura
  const energiaInjetadaKwh = energiaCompensadaKwh * (1 - s)

  const contaHoje = consumo * tarifa

  const kWhMin = TAXA_DISPONIBILIDADE_KWH[tipoLigacao]
  const taxaMinimaMensal = kWhMin * tarifa
  const consumoNaoCobertoKwh = Math.max(0, consumo - energiaCompensadaKwh)
  const custoConsumoNaoCoberto = consumoNaoCobertoKwh * tarifa

  const fioBPct = percentualFioB(data)
  const custoFioBMensal = energiaInjetadaKwh * tarifa * fioBPct

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
    q: 'E se faltar luz (apagão)?',
    a: 'O sistema é conectado à rede da concessionária (on-grid). Em um apagão, por segurança, ele desliga automaticamente junto com a rede. Quem deseja energia em apagões pode incluir baterias em uma ampliação futura.',
  },
  {
    q: 'O sistema precisa de manutenção?',
    a: 'A manutenção é simples: limpeza dos painéis e inspeção periódica, que acompanham o plano de monitoramento. Os painéis têm garantia de desempenho de 30 anos e o inversor, de 10 anos.',
  },
  {
    q: 'Dá para ampliar o sistema depois?',
    a: 'Sim. O inversor é dimensionado com folga para receber mais painéis, e o monitoramento mostra em tempo real se vale a pena ampliar conforme seu consumo cresce.',
  },
  {
    q: 'A conta de luz zera?',
    a: 'Na prática, a energia compensada zera o consumo do sistema elétrico, mas permanece a taxa mínima de disponibilidade da concessionária (por tipo de ligação) e o Fio B da Lei 14.300 — por isso a economia mostrada já é líquida.',
  },
] as const

export function etapasImplantacao(concessionaria: string) {
  return [
    { quem: 'Você', txt: 'Aceita a proposta e envia os documentos' },
    { quem: 'Ecosolar', txt: 'Projeto elétrico e homologação junto à concessionária' },
    { quem: 'Ecosolar', txt: 'Execução da instalação (1 a 2 dias úteis)' },
    { quem: 'Ecosolar', txt: 'Inspeção e vistoria da concessionária' },
    { quem: 'Ecosolar', txt: 'Vistoria final e ligação' },
    { quem: 'Você', txt: 'Assinatura do termo de ligação na concessionária' },
    { quem: 'Ecosolar', txt: 'Ativação do monitoramento e treinamento' },
    { quem: 'Você', txt: 'Sistema ligado e gerando economia' },
  ]
}

export const DEPOIMENTO_PROPOSTA = [
  {
    nome: 'Cliente residencial, Recife - PE',
    txt: 'A conta de luz caiu de R$ 980 para menos de R$ 150 no primeiro mês. O acompanhamento do time da Ecosolar foi impecável, do projeto ao monitoramento.',
  },
  {
    nome: 'Cliente comercial, Caruaru - PE',
    txt: 'Paguei o sistema com a economia da própria conta. Hoje a energia é um custo previsível, e o atendimento resolve tudo pelo WhatsApp.',
  },
  {
    nome: 'Cliente rural, Garanhuns - PE',
    txt: 'Instalação rápida, estrutura firme e geração acima do previsto no projeto. Recomendo para quem tem propriedade no interior.',
  },
] as const
