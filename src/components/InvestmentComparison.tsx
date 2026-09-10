import React, { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  Sun,
  PiggyBank,
  Landmark,
  Award,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
} from 'lucide-react'
import { formatBRL } from '@/lib/solarUtils'
import {
  calculateInvestmentComparison,
  InvestmentComparisonResult,
  YearSnapshot,
} from '@/utils/investmentComparison'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface InvestmentComparisonProps {
  valorInvestido: number
  economiaMensal: number
  anos?: number
  mostrarTabelaPadrao?: boolean
  titulo?: string
  subtitulo?: string
  className?: string
  mostrarAvisoNotas?: boolean
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    name: string
    color: string
    dataKey: string
  }>
  label?: number | string
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs min-w-[200px] backdrop-blur-md">
      <div className="font-bold border-b border-slate-800 pb-1.5 mb-2 text-slate-300 flex items-center justify-between">
        <span>Ano {label} de 30</span>
        <span className="text-[10px] text-emerald-400 font-mono">Evolução</span>
      </div>
      <div className="space-y-1.5">
        {payload.map((entry) => {
          let labelText = entry.name
          if (entry.dataKey === 'solar') labelText = '☀ Solar Fotovoltaico'
          else if (entry.dataKey === 'cdb') labelText = '🏦 CDB (100% CDI Líq.)'
          else if (entry.dataKey === 'poupanca') labelText = '🪙 Poupança (6,17% a.a.)'

          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                {labelText}:
              </span>
              <span className="font-mono font-bold text-white font-mono-numbers">
                {formatBRL(entry.value)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const InvestmentComparison: React.FC<InvestmentComparisonProps> = ({
  valorInvestido,
  economiaMensal,
  anos = 30,
  mostrarTabelaPadrao = false,
  titulo = 'Quanto rende esse investimento em 30 anos?',
  subtitulo = 'Comparativo financeiro real: Energia Solar vs Poupança vs CDB',
  className = '',
  mostrarAvisoNotas = true,
}) => {
  const [mostrarTabela, setMostrarTabela] = useState(mostrarTabelaPadrao)

  const sim: InvestmentComparisonResult = useMemo(() => {
    return calculateInvestmentComparison(valorInvestido, economiaMensal, anos)
  }, [valorInvestido, economiaMensal, anos])

  // Amostragem para a tabela a cada 5 anos (0, 5, 10, 15, 20, 25, 30)
  const marcosTabela: YearSnapshot[] = useMemo(() => {
    return sim.series.filter((s) => s.ano % 5 === 0 || s.ano === sim.anos)
  }, [sim.series, sim.anos])

  const solarWins = sim.finalSolar >= sim.finalCdb && sim.finalSolar >= sim.finalPoupanca

  return (
    <Card className={`border-slate-200/90 shadow-sm bg-white overflow-hidden ${className}`}>
      {/* Header — Estilo Executivo Azul-Marinho Navy (#0A192F) */}
      <CardHeader className="pb-4 border-b-2 border-amber-400 bg-[#0A192F] text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
              <CardTitle className="text-base sm:text-lg font-black text-white tracking-tight">
                {titulo}
              </CardTitle>
            </div>
            <p className="text-xs text-slate-300 pl-10 sm:pl-10">{subtitulo}</p>
          </div>

          <Badge className="self-start sm:self-center bg-amber-400 text-slate-950 hover:bg-amber-300 border-amber-400 font-black text-xs uppercase gap-1 py-1 px-2.5">
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            Horizonte de {anos} anos
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Banner de Destaque / Veredito */}
        {solarWins && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#0B7A5B]/10 via-emerald-50 to-amber-50/60 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  A Energia Solar é a opção mais rentável e segura!
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Em 30 anos, o Solar gera{' '}
                  <strong className="text-emerald-700">
                    +{sim.ganhoSolarVsPoupancaPercent}% a mais que a Poupança
                  </strong>{' '}
                  ({formatBRL(sim.ganhoSolarVsPoupancaValor)} de diferença) e{' '}
                  <strong className="text-[#0B7A5B]">
                    +{sim.ganhoSolarVsCdbPercent}% a mais que o CDB Líquido
                  </strong>{' '}
                  ({formatBRL(sim.ganhoSolarVsCdbValor)} a mais).
                </p>
              </div>
            </div>

            {sim.paybackEstimadoAnos > 0 && (
              <div className="sm:text-right shrink-0 bg-white/80 backdrop-blur-xs p-2.5 rounded-lg border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Payback Estimado
                </span>
                <span className="text-base font-extrabold text-[#0B7A5B] font-mono-numbers">
                  ~{sim.paybackEstimadoAnos} anos
                </span>
              </div>
            )}
          </div>
        )}

        {/* 3 Cards Comparativos de Acúmulo em 30 Anos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Card 1: Poupança */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wide">
                  <PiggyBank className="w-4 h-4 text-amber-500" />
                  Poupança
                </span>
                <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                  {(sim.rates.poupancaRate * 100).toFixed(2)}% a.a.
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Rendimento isento tradicional</p>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-slate-800 font-mono-numbers block">
                  {formatBRL(sim.finalPoupanca)}
                </span>
                <span className="text-[11px] text-slate-500">
                  Rendimento: {formatBRL(sim.finalPoupanca - sim.valorInvestido)}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200/70 text-[11px] text-slate-500">
              Valor aplicado: {formatBRL(sim.valorInvestido)}
            </div>
          </div>

          {/* Card 2: CDB 100% CDI Líquido */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wide">
                  <Landmark className="w-4 h-4 text-blue-600" />
                  CDB 100% CDI
                </span>
                <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                  {(sim.rates.cdiRate * 100).toFixed(1)}% a.a. bruto
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Líquido de IR (15% no resgate)</p>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-slate-800 font-mono-numbers block">
                  {formatBRL(sim.finalCdb)}
                </span>
                <span className="text-[11px] text-slate-500">
                  Rendimento líq.: {formatBRL(sim.finalCdb - sim.valorInvestido)}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200/70 text-[11px] text-slate-500">
              Valor aplicado: {formatBRL(sim.valorInvestido)}
            </div>
          </div>

          {/* Card 3: Solar Fotovoltaico (Vencedor Comercial) */}
          <div className="p-4 rounded-xl border-2 border-[#0A192F] bg-gradient-to-b from-amber-50/40 to-white flex flex-col justify-between relative shadow-sm">
            <div className="absolute -top-2.5 right-3 bg-[#0A192F] text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-xs border border-amber-400">
              ★ Mais Rentável
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#0A192F] flex items-center gap-1.5 uppercase tracking-wide">
                  <Sun className="w-4 h-4 text-amber-500" />
                  Energia Solar
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">Economia na conta reinvestida</p>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black text-[#0A192F] font-mono-numbers block">
                  {formatBRL(sim.finalSolar)}
                </span>
                <span className="text-[11px] text-emerald-700 font-extrabold">
                  +{sim.ganhoSolarVsCdbPercent}% superior ao CDB
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] text-slate-800 flex items-center justify-between font-medium">
              <span>Economia mensal inicial:</span>
              <span className="font-bold font-mono-numbers text-[#0A192F]">
                {formatBRL(sim.economiaMensalInicial)}/mês
              </span>
            </div>
          </div>
        </div>

        {/* Gráfico de Evolução 0 a 30 Anos */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Curva de Acúmulo Patrimonial Ano a Ano (0 a {anos} Anos)
            </h4>
            <span className="text-[11px] text-slate-400">Valores em Reais (R$)</span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sim.series} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B7A5B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0B7A5B" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCdb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorPoupanca" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />

                <XAxis
                  dataKey="ano"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickFormatter={(val) => (val === 0 ? 'Início' : `Ano ${val}`)}
                />

                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`
                    if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`
                    return `R$ ${val}`
                  }}
                />

                <Tooltip content={<CustomTooltip />} />

                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
                  formatter={(value) => {
                    if (value === 'solar')
                      return <span className="text-slate-800 font-bold">☀ Energia Solar</span>
                    if (value === 'cdb')
                      return (
                        <span className="text-slate-600 font-medium">🏦 CDB (100% CDI Líq.)</span>
                      )
                    if (value === 'poupanca')
                      return <span className="text-slate-600 font-medium">🪙 Poupança</span>
                    return value
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="poupanca"
                  name="poupanca"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPoupanca)"
                />

                <Area
                  type="monotone"
                  dataKey="cdb"
                  name="cdb"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCdb)"
                />

                <Area
                  type="monotone"
                  dataKey="solar"
                  name="solar"
                  stroke="#0B7A5B"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSolar)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Botão de Toggle da Tabela Detalhada a cada 5 anos */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarTabela(!mostrarTabela)}
            className="text-xs font-semibold gap-1.5 h-8 border-slate-200 text-slate-700 hover:text-[#0B7A5B]"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>{mostrarTabela ? 'Ocultar tabela resumida' : 'Ver tabela a cada 5 anos'}</span>
            {mostrarTabela ? (
              <ChevronUp className="w-3.5 h-3.5 ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            )}
          </Button>

          {mostrarTabela && (
            <div className="mt-3 rounded-lg border border-slate-200 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-2.5">Marco</th>
                    <th className="p-2.5 text-right">Poupança (R$)</th>
                    <th className="p-2.5 text-right">CDB Líquido (R$)</th>
                    <th className="p-2.5 text-right text-emerald-800 bg-emerald-50/50">
                      ☀ Solar (R$)
                    </th>
                    <th className="p-2.5 text-right text-[#0B7A5B] bg-emerald-50/50 font-bold">
                      Vantagem Solar vs CDB
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono-numbers">
                  {marcosTabela.map((row) => {
                    const diffCdb = row.solar - row.cdb
                    return (
                      <tr
                        key={row.ano}
                        className={
                          row.ano === sim.anos
                            ? 'bg-emerald-50/40 font-bold text-slate-900'
                            : 'hover:bg-slate-50/60 text-slate-700'
                        }
                      >
                        <td className="p-2.5 font-sans font-semibold">
                          {row.ano === 0 ? 'Investimento (Ano 0)' : `${row.ano} anos`}
                        </td>
                        <td className="p-2.5 text-right">{formatBRL(row.poupanca)}</td>
                        <td className="p-2.5 text-right">{formatBRL(row.cdb)}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-800 bg-emerald-50/30">
                          {formatBRL(row.solar)}
                        </td>
                        <td
                          className={`p-2.5 text-right font-bold bg-emerald-50/30 ${
                            diffCdb >= 0 ? 'text-[#0B7A5B]' : 'text-slate-500'
                          }`}
                        >
                          {diffCdb >= 0 ? `+${formatBRL(diffCdb)}` : formatBRL(diffCdb)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Nota de rodapé com as premissas transparentes */}
        {mostrarAvisoNotas && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Info className="w-3.5 h-3.5 text-[#0B7A5B]" />
              <span>Premissas financeiras transparentes desta simulação:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-slate-600">
              <li>
                <strong>Poupança:</strong> Rendimento conservador estimado em{' '}
                {(sim.rates.poupancaRate * 100).toFixed(2)}% a.a., isento de Imposto de Renda para
                pessoa física.
              </li>
              <li>
                <strong>CDB (Certificado de Depósito Bancário):</strong> Considera taxa de 100% do
                CDI atual em torno de {(sim.rates.cdiRate * 100).toFixed(2)}% a.a. bruto, com
                incidência da alíquota regressiva de IR (15% para resgates acima de 24 meses).
              </li>
              <li>
                <strong>Energia Solar:</strong> O investimento inicial corresponde ao preço total de
                implantação do sistema. A economia mensal na conta de luz é reinvestida ano a ano à
                taxa da poupança ({(sim.rates.solarReinvestmentRate * 100).toFixed(2)}% a.a.), já
                deduzindo a degradação técnica padrão dos módulos fotovoltaicos de{' '}
                {(sim.rates.solarDegradationRate * 100).toFixed(1)}% ao ano.
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default InvestmentComparison
