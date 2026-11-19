// Simulador FNO (BASA) — metodologia reproduzida da planilha "Simulador FNO":
// 1) SAC com carência: durante a carência paga só juros; depois amortização fixa =
//    valor financiado ÷ (prazo − carência), arredondada ao centavo; a última parcela
//    absorve a diferença de arredondamento.
// 2) Juros por dias úteis, base 252: fator = (1 + taxa anual)^(dias úteis/252),
//    arredondado a 9 casas decimais.
// 3) Apuração em 2 trechos por parcela: do dia seguinte ao pagamento anterior até o
//    dia 10 do mês de vencimento (ou próximo dia útil), e daí até o vencimento.
//    Cada trecho é arredondado ao centavo e os dois somados.
// 4) Vencimentos no mesmo dia do mês da data-base; fim de semana/feriado bancário
//    empurra para o próximo dia útil.
// 5) Sem IOF e sem bônus de adimplência.

export interface FnoEntrada {
  valorSistema: number // R$ (centavos não — valores em reais, arredondados a 2 casas)
  valorFinanciado: number
  taxaAnualAA: number // % a.a. (ex.: 8.5)
  prazoMeses: number
  carenciaMeses: number
  dataLiberacao: string // 'YYYY-MM-DD'
  dataPrimeiroVencimento?: string // 'YYYY-MM-DD'; se vazio, liberação + 1 mês
}

export interface FnoParcela {
  n: number
  vencimento: string // 'DD/MM/AAAA'
  diasUteisTrecho1: number
  diasUteisTrecho2: number
  jurosTrecho1: number
  jurosTrecho2: number
  jurosMes: number
  amortizacao: number
  parcela: number
  saldoFinal: number
}

export interface FnoResultado {
  parcelas: FnoParcela[]
  valorEntrada: number
  totalJuros: number
  totalAPagar: number // entrada + parcelas
  valorFinanciado: number
  taxaAnualAA: number
  prazoMeses: number
  carenciaMeses: number
  dataLiberacao: string
  dataPrimeiroVencimento: string
  erro?: string
}

// ---------- utilidades de data (UTC ao meio-dia para evitar DST) ----------

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0))
}

export function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function formatarDataBR(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000)
}

function addMonthsClamped(d: Date, months: number): Date {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + months
  const day = d.getUTCDate()
  const lastDay = new Date(Date.UTC(y, m + 1, 0, 12)).getUTCDate()
  return new Date(Date.UTC(y, m, Math.min(day, lastDay), 12, 0, 0))
}

function diasNoMes(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0, 12)).getUTCDate()
}

function diaSemana(d: Date): number {
  return d.getUTCDay() // 0 dom, 6 sáb
}

// ---------- dias úteis ----------

/** Próximo dia útil (>= data informada), considerando fim de semana + feriados 'YYYY-MM-DD'. */
export function proximoDiaUtil(d: Date, feriados: Set<string>): Date {
  let cur = d
  while (diaSemana(cur) === 0 || diaSemana(cur) === 6 || feriados.has(toISODate(cur))) {
    cur = addDays(cur, 1)
  }
  return cur
}

/**
 * Conta dias úteis entre duas datas, INCLUSIVE nos dois extremos
 * (de `inicio` até `fim`, ambos podendo ser úteis).
 */
export function contarDiasUteis(inicio: Date, fim: Date, feriados: Set<string>): number {
  let count = 0
  let cur = new Date(inicio.getTime())
  while (cur.getTime() <= fim.getTime()) {
    if (diaSemana(cur) !== 0 && diaSemana(cur) !== 6 && !feriados.has(toISODate(cur))) {
      count++
    }
    cur = addDays(cur, 1)
  }
  return count
}

// ---------- arredondamentos ----------

export function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100
}

function round9(v: number): number {
  return Math.round((v + Number.EPSILON) * 1e9) / 1e9
}

/** Fator de capitalização por dias úteis, base 252, com 9 casas decimais. */
export function fatorCapitalizacao(taxaAnualAA: number, diasUteis: number): number {
  const taxaDec = taxaAnualAA / 100
  return round9(Math.pow(1 + taxaDec, diasUteis / 252))
}

/** Juros = saldo × (fator − 1), arredondado ao centavo. */
export function jurosDoTrecho(saldo: number, taxaAnualAA: number, diasUteis: number): number {
  if (diasUteis <= 0 || saldo <= 0) return 0
  const fator = fatorCapitalizacao(taxaAnualAA, diasUteis)
  return round2(saldo * (fator - 1))
}

// ---------- simulação principal ----------

/**
 * Roda a simulação completa. `feriados` é o Set de datas 'YYYY-MM-DD'
 * carregado da coleção fno_feriados em tempo de execução.
 */
export function simularFno(entrada: FnoEntrada, feriados: Set<string>): FnoResultado {
  const valorSistema = round2(entrada.valorSistema || 0)
  const valorFinanciado = round2(entrada.valorFinanciado || 0)
  const taxaAnualAA = entrada.taxaAnualAA || 0
  const prazoMeses = Math.max(1, Math.floor(entrada.prazoMeses || 0))
  const carenciaMeses = Math.max(0, Math.floor(entrada.carenciaMeses || 0))
  const valorEntrada = round2(Math.max(0, valorSistema - valorFinanciado))

  const base: FnoResultado = {
    parcelas: [],
    valorEntrada,
    totalJuros: 0,
    totalAPagar: 0,
    valorFinanciado,
    taxaAnualAA,
    prazoMeses,
    carenciaMeses,
    dataLiberacao: entrada.dataLiberacao,
    dataPrimeiroVencimento: '',
  }

  if (!entrada.dataLiberacao || !/^\d{4}-\d{2}-\d{2}$/.test(entrada.dataLiberacao)) {
    return { ...base, erro: 'Informe a data de liberação (AAAA-MM-DD).' }
  }
  if (valorFinanciado <= 0) {
    return { ...base, erro: 'Valor financiado deve ser maior que zero.' }
  }
  if (carenciaMeses >= prazoMeses) {
    return { ...base, erro: 'Carência deve ser menor que o prazo total.' }
  }

  const dataLiberacao = parseISODate(entrada.dataLiberacao)

  // Primeiro vencimento: data informada ou liberação + 1 mês (mesmo dia do mês).
  const primeiroVencBase = entrada.dataPrimeiroVencimento
    ? parseISODate(entrada.dataPrimeiroVencimento)
    : addMonthsClamped(dataLiberacao, 1)

  // Vencimentos: mesmo dia do mês da data-base; empurra p/ próximo dia útil se cair
  // em fim de semana/feriado. Dia 31 em mês de 30 dias "clamp" para o fim do mês.
  const vencimentos: Date[] = []
  for (let k = 0; k < prazoMeses; k++) {
    const y = primeiroVencBase.getUTCFullYear()
    const m = primeiroVencBase.getUTCMonth() + k
    const dia = Math.min(primeiroVencBase.getUTCDate(), diasNoMes(y, m))
    const alvo = new Date(Date.UTC(y, m, dia, 12, 0, 0))
    vencimentos.push(proximoDiaUtil(alvo, feriados))
  }

  const amortizacaoFixa = round2(valorFinanciado / (prazoMeses - carenciaMeses))
  const parcelas: FnoParcela[] = []
  let saldo = valorFinanciado
  let totalJuros = 0

  // Trecho 1 da 1ª parcela: do dia seguinte à liberação até o dia 10 do mês do 1º venc.
  let pagamentoAnterior = dataLiberacao

  for (let k = 1; k <= prazoMeses; k++) {
    const vencimento = vencimentos[k - 1]
    const vencISO = toISODate(vencimento)

    // Dia 10 do mês de vencimento (ou próximo dia útil).
    const dia10 = new Date(
      Date.UTC(vencimento.getUTCFullYear(), vencimento.getUTCMonth(), 10, 12, 0, 0),
    )
    const fimTrecho1 = proximoDiaUtil(dia10, feriados)

    // Trecho 1: do dia seguinte ao pagamento anterior ATÉ o dia 10 (inclusive).
    const inicioTrecho1 = addDays(pagamentoAnterior, 1)
    const duTrecho1 = contarDiasUteis(inicioTrecho1, fimTrecho1, feriados)

    // Trecho 2: do dia seguinte ao dia 10 até o vencimento (inclusive).
    const duTrecho2 = contarDiasUteis(addDays(fimTrecho1, 1), vencimento, feriados)

    const jurosTrecho1 = jurosDoTrecho(saldo, taxaAnualAA, duTrecho1)
    const jurosTrecho2 = jurosDoTrecho(saldo, taxaAnualAA, duTrecho2)
    const jurosMes = round2(jurosTrecho1 + jurosTrecho2)

    let amortizacao = 0
    if (k > carenciaMeses) {
      amortizacao = k === prazoMeses ? saldo : amortizacaoFixa
    }
    const parcela = round2(jurosMes + amortizacao)
    saldo = round2(saldo - amortizacao)

    parcelas.push({
      n: k,
      vencimento: formatarDataBR(vencISO),
      diasUteisTrecho1: duTrecho1,
      diasUteisTrecho2: duTrecho2,
      jurosTrecho1,
      jurosTrecho2,
      jurosMes,
      amortizacao,
      parcela,
      saldoFinal: saldo,
    })

    totalJuros = round2(totalJuros + jurosMes)
    pagamentoAnterior = vencimento
  }

  const totalParcelas = round2(parcelas.reduce((acc, p) => acc + p.parcela, 0))

  return {
    parcelas,
    valorEntrada,
    totalJuros,
    totalAPagar: round2(valorEntrada + totalParcelas),
    valorFinanciado,
    taxaAnualAA,
    prazoMeses,
    carenciaMeses,
    dataLiberacao: entrada.dataLiberacao,
    dataPrimeiroVencimento: toISODate(primeiroVencBase),
  }
}

// ---------- helpers de exibição/gravação ----------

export interface FnoParcelaResumo {
  n: number
  vencimento: string
  juros_trecho1: number
  juros_trecho2: number
  juros_mes: number
  amortizacao: number
  parcela: number
  saldo: number
}

export interface FnoSimulacaoResumo {
  valor_entrada: number
  valor_financiado: number
  taxa_anual_aa: number
  prazo_meses: number
  carencia_meses: number
  data_base: string
  data_liberacao: string
  data_primeiro_vencimento: string
  total_juros: number
  total_a_pagar: number
  parcela_mensal_estimada: number
  parcelas_resumo: FnoParcelaResumo[]
}

/** Compacta o resultado para gravar em propostas.fno_simulacao (JSON). */
export function resumoDaSimulacao(res: FnoResultado): FnoSimulacaoResumo {
  const parcelasAmort = res.parcelas.filter((p) => p.amortizacao > 0)
  const parcelaMensalEstimada = parcelasAmort.length
    ? parcelasAmort.reduce((acc, p) => acc + p.parcela, 0) / parcelasAmort.length
    : res.parcelas.length
      ? res.parcelas.reduce((acc, p) => acc + p.parcela, 0) / res.parcelas.length
      : 0

  return {
    valor_entrada: res.valorEntrada,
    valor_financiado: res.valorFinanciado,
    taxa_anual_aa: res.taxaAnualAA,
    prazo_meses: res.prazoMeses,
    carencia_meses: res.carenciaMeses,
    data_base: res.dataPrimeiroVencimento,
    data_liberacao: res.dataLiberacao,
    data_primeiro_vencimento: res.parcelas[0]?.vencimento || '',
    total_juros: res.totalJuros,
    total_a_pagar: res.totalAPagar,
    parcela_mensal_estimada: round2(parcelaMensalEstimada),
    parcelas_resumo: res.parcelas.map((p) => ({
      n: p.n,
      vencimento: p.vencimento,
      juros_trecho1: p.jurosTrecho1,
      juros_trecho2: p.jurosTrecho2,
      juros_mes: p.jurosMes,
      amortizacao: p.amortizacao,
      parcela: p.parcela,
      saldo: p.saldoFinal,
    })),
  }
}

export function formatarBRL(v: number | undefined | null): string {
  if (v === undefined || v === null || isNaN(Number(v))) return '—'
  return Number(v).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
