/**
 * investmentComparison.ts
 * Utilitário de simulação financeira comparativa em 30 anos:
 * Solar vs Poupança vs CDB (100% CDI com IR regressivo).
 */

export interface InvestmentRates {
  /** Taxa anual da Poupança (padrão 6,17% a.a. = 0.0617) */
  poupancaRate: number
  /** Taxa anual bruta do CDI (padrão 10,50% a.a. = 0.1050) */
  cdiRate: number
  /** Percentual do CDI pago pelo CDB (padrão 100% = 1.0) */
  cdbPercentCdi: number
  /** Taxa de reinvestimento da economia gerada pelo solar (padrão 6,17% a.a.) */
  solarReinvestmentRate: number
  /** Taxa de degradação anual dos painéis solares (padrão 0,5% a.a. = 0.005) */
  solarDegradationRate: number
}

export const DEFAULT_INVESTMENT_RATES: InvestmentRates = {
  poupancaRate: 0.0617, // 6,17% ao ano (isento de IR)
  cdiRate: 0.105, // 10,50% ao ano
  cdbPercentCdi: 1.0, // 100% do CDI
  solarReinvestmentRate: 0.0617, // Reinvestimento conservador à taxa da poupança (6,17% a.a.)
  solarDegradationRate: 0.005, // Degradação padrão garantida de 0,5% a.a.
}

export interface YearSnapshot {
  ano: number
  poupanca: number
  cdb: number
  solar: number
  economiaSolarAno: number
  rendimentoAcumuladoPoupanca: number
  rendimentoAcumuladoCdb: number
}

export interface InvestmentComparisonResult {
  anos: number
  valorInvestido: number
  economiaMensalInicial: number
  series: YearSnapshot[]
  finalPoupanca: number
  finalCdb: number
  finalSolar: number
  ganhoSolarVsPoupancaValor: number
  ganhoSolarVsPoupancaPercent: number
  ganhoSolarVsCdbValor: number
  ganhoSolarVsCdbPercent: number
  paybackEstimadoAnos: number
  rates: InvestmentRates
}

/**
 * Alíquota de IR regressivo da renda fixa (CDB):
 * - Até 180 dias (0,5 ano): 22,5%
 * - De 181 a 360 dias (1 ano): 20,0%
 * - De 361 a 720 dias (2 anos): 17,5%
 * - Acima de 720 dias (> 2 anos): 15,0%
 */
export function getCdbIrRate(ano: number): number {
  if (ano <= 0) return 0
  if (ano <= 0.5) return 0.225
  if (ano <= 1) return 0.2
  if (ano <= 2) return 0.175
  return 0.15
}

/**
 * Simula a evolução patrimonial ao longo de N anos (padrão 30 anos) para:
 * 1. Poupança: Valor investido rendendo juros compostos isentos de IR.
 * 2. CDB: Valor investido rendendo a taxa bruta do CDI, descontando o IR regressivo sobre o rendimento total no ano examinado.
 * 3. Solar: O capital foi investido no sistema solar. A cada ano, a economia de energia gerada (com degradação técnica de 0,5% a.a.)
 *    é economizada na conta e reinvestida com juros compostos (taxa da poupança 6,17% a.a.).
 */
export function calculateInvestmentComparison(
  valorInvestido: number,
  economiaMensal: number,
  anos: number = 30,
  customRates?: Partial<InvestmentRates>,
): InvestmentComparisonResult {
  const rates: InvestmentRates = {
    ...DEFAULT_INVESTMENT_RATES,
    ...customRates,
  }

  const safeInvest = Math.max(0, valorInvestido)
  const safeEconomiaMensal = Math.max(0, economiaMensal)
  const safeEconomiaAnualInicial = safeEconomiaMensal * 12

  const series: YearSnapshot[] = []

  // Ano 0: Marco inicial
  series.push({
    ano: 0,
    poupanca: Math.round(safeInvest),
    cdb: Math.round(safeInvest),
    solar: 0,
    economiaSolarAno: 0,
    rendimentoAcumuladoPoupanca: 0,
    rendimentoAcumuladoCdb: 0,
  })

  let saldoSolarAcumulado = 0
  let paybackEstimadoAnos = 0
  let somaEconomiaAcumuladaSemRendimento = 0

  for (let ano = 1; ano <= anos; ano++) {
    // 1. POUPANÇA: Juros compostos contínuos isentos
    const montantePoupanca = safeInvest * Math.pow(1 + rates.poupancaRate, ano)
    const rendimentoPoupanca = montantePoupanca - safeInvest

    // 2. CDB: Rendimento bruto acumulado menos alíquota regressiva de IR no resgate
    const cdbRateBruto = rates.cdiRate * rates.cdbPercentCdi
    const montanteBrutoCdb = safeInvest * Math.pow(1 + cdbRateBruto, ano)
    const rendimentoBrutoCdb = montanteBrutoCdb - safeInvest
    const irRate = getCdbIrRate(ano)
    const impostoDevido = rendimentoBrutoCdb * irRate
    const montanteLiquidoCdb = safeInvest + (rendimentoBrutoCdb - impostoDevido)

    // 3. SOLAR: Economia gerada no ano com degradação acumulada dos módulos
    // ano 1: (1 - 0.005)^0 = 100% da economia
    // ano 2: (1 - 0.005)^1, etc.
    const fatorDegradacao = Math.pow(1 - rates.solarDegradationRate, ano - 1)
    const economiaAnoAtual = safeEconomiaAnualInicial * fatorDegradacao

    somaEconomiaAcumuladaSemRendimento += economiaAnoAtual
    if (
      paybackEstimadoAnos === 0 &&
      somaEconomiaAcumuladaSemRendimento >= safeInvest &&
      safeInvest > 0
    ) {
      paybackEstimadoAnos = ano
    }

    // A economia deste ano é somada ao saldo anterior e reinvestida
    // Saldo acumulado anterior rende a taxa de reinvestimento + nova economia entra
    saldoSolarAcumulado = saldoSolarAcumulado * (1 + rates.solarReinvestmentRate) + economiaAnoAtual

    series.push({
      ano,
      poupanca: Math.round(montantePoupanca),
      cdb: Math.round(montanteLiquidoCdb),
      solar: Math.round(saldoSolarAcumulado),
      economiaSolarAno: Math.round(economiaAnoAtual),
      rendimentoAcumuladoPoupanca: Math.round(rendimentoPoupanca),
      rendimentoAcumuladoCdb: Math.round(montanteLiquidoCdb - safeInvest),
    })
  }

  const finalPoupanca = series[anos]?.poupanca ?? 0
  const finalCdb = series[anos]?.cdb ?? 0
  const finalSolar = series[anos]?.solar ?? 0

  const ganhoSolarVsPoupancaValor = finalSolar - finalPoupanca
  const ganhoSolarVsPoupancaPercent =
    finalPoupanca > 0 ? Math.round(((finalSolar - finalPoupanca) / finalPoupanca) * 100) : 0

  const ganhoSolarVsCdbValor = finalSolar - finalCdb
  const ganhoSolarVsCdbPercent =
    finalCdb > 0 ? Math.round(((finalSolar - finalCdb) / finalCdb) * 100) : 0

  // Se o payback simples não foi atingido em 30 anos (raro) ou aproximar por interpolação
  if (paybackEstimadoAnos === 0 && safeEconomiaAnualInicial > 0) {
    paybackEstimadoAnos = Math.round((safeInvest / safeEconomiaAnualInicial) * 10) / 10
  }

  return {
    anos,
    valorInvestido: safeInvest,
    economiaMensalInicial: safeEconomiaMensal,
    series,
    finalPoupanca,
    finalCdb,
    finalSolar,
    ganhoSolarVsPoupancaValor,
    ganhoSolarVsPoupancaPercent,
    ganhoSolarVsCdbValor,
    ganhoSolarVsCdbPercent,
    paybackEstimadoAnos,
    rates,
  }
}
