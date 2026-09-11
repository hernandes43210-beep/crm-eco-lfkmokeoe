import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Trophy,
  Play,
  RotateCcw,
  FastForward,
  Pause,
  Award,
  Sparkles,
  TrendingUp,
  Sun,
  Landmark,
  PiggyBank,
  CheckCircle2,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  Info,
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

export interface AnimatedInvestmentRaceProps {
  valorInvestido: number
  economiaMensal: number
  anos?: number
  titulo?: string
  subtitulo?: string
  className?: string
  mostrarAvisoNotas?: boolean
}

type SpeedOption = 1 | 1.5 | 2

export const AnimatedInvestmentRace: React.FC<AnimatedInvestmentRaceProps> = ({
  valorInvestido,
  economiaMensal,
  anos = 30,
  titulo = 'Corrida do Rendimento em 30 Anos — Quem vence essa disputa?',
  subtitulo = 'Veja em tempo real como o investimento em Energia Solar ultrapassa com folga a Poupança e o CDB Líquido',
  className = '',
  mostrarAvisoNotas = true,
}) => {
  const sim: InvestmentComparisonResult = useMemo(() => {
    return calculateInvestmentComparison(valorInvestido, economiaMensal, anos)
  }, [valorInvestido, economiaMensal, anos])

  // Estado da animação
  const [currentAno, setCurrentAno] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [isCompleted, setIsCompleted] = useState<boolean>(false)
  const [speed, setSpeed] = useState<SpeedOption>(1)
  const [mostrarTabela, setMostrarTabela] = useState<boolean>(false)

  // Ref para o timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Autostart ao entrar na viewport
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let hasStarted = false
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasStarted) {
            hasStarted = true
            setIsPlaying(true)
          }
        })
      },
      { threshold: 0.25 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Loop de animação progressivo
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    if (currentAno >= anos) {
      setIsCompleted(true)
      setIsPlaying(false)
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    // Intervalo de tempo por ano (base 260ms por ano no 1x -> ~7.8s de corrida para 30 anos)
    const baseIntervalMs = 260 / speed

    timerRef.current = setInterval(() => {
      setCurrentAno((prev) => {
        if (prev + 1 >= anos) {
          setIsCompleted(true)
          setIsPlaying(false)
          return anos
        }
        return prev + 1
      })
    }, baseIntervalMs)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, currentAno, anos, speed])

  const handlePlayPause = () => {
    if (isCompleted) {
      // Replay do zero
      setCurrentAno(0)
      setIsCompleted(false)
      setIsPlaying(true)
    } else {
      setIsPlaying((prev) => !prev)
    }
  }

  const handleRestart = () => {
    setCurrentAno(0)
    setIsCompleted(false)
    setIsPlaying(true)
  }

  const handleSkipToEnd = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setCurrentAno(anos)
    setIsCompleted(true)
    setIsPlaying(false)
  }

  const toggleSpeed = () => {
    setSpeed((prev) => (prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1))
  }

  // Dados do ano atual
  const currentSnapshot: YearSnapshot = sim.series[currentAno] ||
    sim.series[sim.series.length - 1] || {
      ano: currentAno,
      poupanca: 0,
      cdb: 0,
      solar: 0,
      economiaSolarAno: 0,
      rendimentoAcumuladoPoupanca: 0,
      rendimentoAcumuladoCdb: 0,
    }

  // Escala para as barras: referência máxima é o valor do Solar no final de 30 anos
  const maxFinalValue = Math.max(sim.finalSolar, sim.finalCdb, sim.finalPoupanca, 1)

  // Percentual de progresso de cada barra relativo ao maior valor final
  // Garantir uma largura mínima visual de 4% para começar aparecendo
  const solarWidthPct = Math.min(100, Math.max(4, (currentSnapshot.solar / maxFinalValue) * 100))
  const cdbWidthPct = Math.min(100, Math.max(4, (currentSnapshot.cdb / maxFinalValue) * 100))
  const poupancaWidthPct = Math.min(
    100,
    Math.max(4, (currentSnapshot.poupanca / maxFinalValue) * 100),
  )

  // Rank atual
  const competitors = [
    {
      id: 'solar',
      nome: '☀ Energia Solar (Economia Reinvestida)',
      nomeCurto: 'Energia Solar',
      valor: currentSnapshot.solar,
      widthPct: solarWidthPct,
      cor: '#0B7A5B',
      gradiente: 'from-amber-400 via-amber-500 to-emerald-600',
      badgeCor: 'bg-emerald-600 text-white',
      icone: Sun,
      destaque: true,
      subtexto:
        currentAno === 0
          ? 'Instalação inicial'
          : `+${formatBRL(currentSnapshot.economiaSolarAno)} economizados este ano`,
    },
    {
      id: 'cdb',
      nome: '🏦 CDB 100% CDI Líquido (IR 15%)',
      nomeCurto: 'CDB 100% CDI',
      valor: currentSnapshot.cdb,
      widthPct: cdbWidthPct,
      cor: '#2563EB',
      gradiente: 'from-blue-400 to-blue-600',
      badgeCor: 'bg-blue-600 text-white',
      icone: Landmark,
      destaque: false,
      subtexto: `Rendimento líq. de IR: ${formatBRL(currentSnapshot.rendimentoAcumuladoCdb)}`,
    },
    {
      id: 'poupanca',
      nome: '🪙 Poupança Tradicional (6,17% a.a.)',
      nomeCurto: 'Poupança',
      valor: currentSnapshot.poupanca,
      widthPct: poupancaWidthPct,
      cor: '#F59E0B',
      gradiente: 'from-slate-400 to-amber-500',
      badgeCor: 'bg-amber-500 text-white',
      icone: PiggyBank,
      destaque: false,
      subtexto: `Rendimento: ${formatBRL(currentSnapshot.rendimentoAcumuladoPoupanca)}`,
    },
  ]

  // Ordenar para determinar quem está liderando agora
  const ranked = [...competitors].sort((a, b) => b.valor - a.valor)
  const leader = ranked[0]
  const solarIsLeading = leader.id === 'solar'

  // Marcos da tabela a cada 5 anos
  const marcosTabela: YearSnapshot[] = useMemo(() => {
    return sim.series.filter((s) => s.ano % 5 === 0 || s.ano === sim.anos)
  }, [sim.series, sim.anos])

  return (
    <Card
      ref={containerRef}
      className={`border-2 border-[#0A192F] shadow-lg bg-white overflow-hidden rounded-2xl ${className}`}
    >
      {/* Header Estilo Navy/Amarelo com Painel da Corrida */}
      <CardHeader className="p-5 sm:p-6 border-b-2 border-amber-400 bg-gradient-to-r from-[#060F1E] via-[#0A192F] to-[#163868] text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-amber-400 text-slate-950 font-black text-xs uppercase px-2.5 py-0.5 rounded-md tracking-wider">
                <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
                Simulação Interativa em Tempo Real
              </span>
              <span className="text-[11px] text-sky-200 font-semibold">
                Bar Chart Race • 30 Anos de Rendimento
              </span>
            </div>
            <CardTitle className="text-lg sm:text-2xl font-black text-white tracking-tight pt-1">
              {titulo}
            </CardTitle>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {subtitulo}
            </p>
          </div>

          {/* Placar de Anos / Cronômetro da Competição */}
          <div className="flex items-center gap-3 self-start lg:self-center shrink-0 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-amber-400/50 shadow-inner">
            <div className="text-center min-w-[70px]">
              <span className="text-[9px] uppercase tracking-wider text-slate-300 font-bold block">
                Tempo Transcorrido
              </span>
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono-numbers">
                {currentAno === 0 ? 'Início' : `Ano ${currentAno}`}
              </span>
              <span className="text-[9px] text-slate-300 block">de {anos} anos</span>
            </div>

            <div className="h-10 w-px bg-white/20" />

            {/* Controles da Animação */}
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePlayPause}
                className="h-8 px-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-400 font-bold text-xs gap-1 shadow-sm"
                title={isPlaying ? 'Pausar animação' : 'Reproduzir corrida'}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span className="hidden sm:inline">Pausar</span>
                  </>
                ) : isCompleted ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Replay</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span className="hidden sm:inline">Continuar</span>
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleRestart}
                className="h-8 px-2 text-white hover:bg-white/10 text-xs"
                title="Reiniciar do Ano 0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleSkipToEnd}
                className="h-8 px-2 text-white hover:bg-white/10 text-xs"
                title="Pular para o resultado final de 30 anos"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px] ml-1">Pular</span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={toggleSpeed}
                className="h-8 px-2 text-amber-300 hover:bg-white/10 text-xs font-mono font-bold"
                title="Velocidade da corrida"
              >
                {speed}x
              </Button>
            </div>
          </div>
        </div>

        {/* Barra de Progresso Temporal */}
        <div className="mt-4 pt-3 border-t border-white/15">
          <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1.5 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
              <span>
                {currentAno === 0
                  ? 'Aguardando largada: Capital inicial aplicado de ' +
                    formatBRL(sim.valorInvestido)
                  : currentAno < 4
                    ? 'Início da corrida: Poupança e CDB saem com saldo, Solar acelerando com economia mensal...'
                    : currentAno < 8
                      ? `Ano ${currentAno}: O Solar atinge o payback e ultrapassa as aplicações financeiras!`
                      : isCompleted
                        ? `Resultado consolidado: Solar vence com ${formatBRL(sim.finalSolar)} (+${sim.ganhoSolarVsCdbPercent}% sobre o CDB)`
                        : `Ano ${currentAno}: Vantagem do Solar crescendo de forma exponencial!`}
              </span>
            </span>
            <span className="font-mono-numbers font-bold text-amber-300">
              {Math.round((currentAno / anos) * 100)}%
            </span>
          </div>

          <div className="w-full h-2 bg-slate-900/60 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${(currentAno / anos) * 100}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-7 space-y-6">
        {/* Banner do Líder da Corrida em Tempo Real */}
        <div
          className={`p-4 rounded-xl border transition-all duration-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            solarIsLeading
              ? 'bg-gradient-to-r from-emerald-50 via-amber-50/60 to-emerald-50/30 border-emerald-300 text-slate-900 shadow-xs'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                solarIsLeading ? 'bg-[#0B7A5B] text-amber-300' : 'bg-blue-600 text-white'
              }`}
            >
              {solarIsLeading ? (
                <Trophy className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <TrendingUp className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Líder da Competição no Ano {currentAno}
                </span>
                {solarIsLeading && (
                  <Badge className="bg-amber-400 text-slate-950 font-black text-[10px] uppercase px-2 py-0">
                    ★ Vencedor Absoluto
                  </Badge>
                )}
              </div>
              <h4 className="text-base sm:text-lg font-black text-slate-900">
                {leader.nomeCurto}:{' '}
                <span className="text-[#0B7A5B] font-mono-numbers">{formatBRL(leader.valor)}</span>
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                {solarIsLeading
                  ? `O investimento em Solar já gerou +${formatBRL(currentSnapshot.solar - currentSnapshot.cdb)} a mais que o CDB Líquido e +${formatBRL(currentSnapshot.solar - currentSnapshot.poupanca)} a mais que a Poupança.`
                  : 'Fase inicial de amortização do sistema solar (retorno do capital investido).'}
              </p>
            </div>
          </div>

          <div className="sm:text-right shrink-0 bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Payback Estimado
            </span>
            <span className="text-base font-extrabold text-[#0B7A5B] font-mono-numbers">
              ~{sim.paybackEstimadoAnos || 3} anos
            </span>
            <span className="text-[10px] text-slate-500 block">Amortização 100%</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PISTA DE CORRIDA — AS 3 BARRAS COMPETINDO EM TEMPO REAL  */}
        {/* ======================================================== */}
        <div className="space-y-5 pt-2">
          {competitors.map((comp, idx) => {
            const isWinner = isCompleted && comp.id === 'solar'
            const isFirst = leader.id === comp.id
            const Icon = comp.icone

            return (
              <div
                key={comp.id}
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  comp.destaque
                    ? 'border-[#0A192F] bg-gradient-to-r from-amber-50/40 via-white to-amber-50/20 shadow-sm ring-1 ring-amber-300/40'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                {/* Cabeçalho da Barra */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        comp.destaque
                          ? 'bg-[#0A192F] text-amber-400'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                          {comp.nome}
                        </span>
                        {isFirst && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded">
                            {currentAno >= 5 ? '1º Lugar 🥇' : 'Na frente'}
                          </span>
                        )}
                        {comp.destaque && (
                          <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-100 px-1.5 py-0.2 rounded hidden sm:inline">
                            EcoSolar
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">{comp.subtexto}</span>
                    </div>
                  </div>

                  {/* Valor acumulado em Reais que sobe durante a animação */}
                  <div className="text-left sm:text-right shrink-0">
                    <span
                      className={`text-xl sm:text-2xl font-black font-mono-numbers block tracking-tight ${
                        comp.destaque ? 'text-[#0A192F]' : 'text-slate-800'
                      }`}
                    >
                      {formatBRL(comp.valor)}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {comp.id === 'solar' ? 'Patrimônio acumulado' : 'Saldo líquido projetado'}
                    </span>
                  </div>
                </div>

                {/* A Pista / Barra com Animação Fluida */}
                <div className="relative w-full h-8 bg-slate-100 rounded-xl overflow-hidden p-1 border border-slate-200">
                  {/* Linhas de grade da pista (25%, 50%, 75%) */}
                  <div className="absolute inset-0 flex justify-between pointer-events-none px-2 opacity-30">
                    <div className="w-px h-full border-r border-dashed border-slate-400" />
                    <div className="w-px h-full border-r border-dashed border-slate-400" />
                    <div className="w-px h-full border-r border-dashed border-slate-400" />
                  </div>

                  {/* A Barra Crescendo */}
                  <div
                    className={`h-full rounded-lg transition-all duration-300 ease-out flex items-center justify-end pr-2.5 shadow-sm relative ${
                      comp.destaque
                        ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-[#0B7A5B]'
                        : comp.id === 'cdb'
                          ? 'bg-gradient-to-r from-sky-400 to-blue-600'
                          : 'bg-gradient-to-r from-slate-400 to-amber-500'
                    }`}
                    style={{ width: `${comp.widthPct}%` }}
                  >
                    {/* Efeito luminoso na ponta da barra líder */}
                    {isFirst && (
                      <span className="absolute right-0 top-0 bottom-0 w-2 bg-white/60 blur-[2px] rounded-r-lg" />
                    )}

                    {/* Tag de porcentagem dentro da barra se couber */}
                    {comp.widthPct > 20 && (
                      <span className="text-[10px] font-black text-white font-mono-numbers drop-shadow-sm select-none">
                        {Math.round(comp.widthPct)}% da meta
                      </span>
                    )}
                  </div>
                </div>

                {/* Diferença comparativa */}
                {comp.destaque && currentSnapshot.solar > currentSnapshot.cdb && (
                  <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Vantagem sobre o CDB no Ano {currentAno}:</span>
                    </span>
                    <strong className="font-mono-numbers font-black">
                      +{formatBRL(currentSnapshot.solar - currentSnapshot.cdb)}
                    </strong>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Veredito Final ao Concluir a Corrida */}
        {isCompleted && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0A192F] to-[#163868] text-white border-2 border-amber-400 shadow-xl space-y-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-md">
                  <Award className="w-7 h-7 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-amber-400 text-xs font-black uppercase tracking-wider block">
                    Veredito da Engenharia Financeira
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    Energia Solar é o Campeão Incontestável dos 30 Anos!
                  </h3>
                </div>
              </div>

              <Badge className="bg-emerald-500 text-white font-black text-xs uppercase px-3 py-1 self-start sm:self-auto">
                Retorno Máximo Garantido
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <span className="text-[10px] uppercase font-bold text-slate-300 block">
                  Resultado Solar Final
                </span>
                <span className="text-xl font-black text-amber-400 font-mono-numbers">
                  {formatBRL(sim.finalSolar)}
                </span>
                <span className="text-[10px] text-slate-300 block">Patrimônio livre gerado</span>
              </div>

              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <span className="text-[10px] uppercase font-bold text-slate-300 block">
                  Vantagem vs. Poupança
                </span>
                <span className="text-xl font-black text-emerald-400 font-mono-numbers">
                  +{sim.ganhoSolarVsPoupancaPercent}%
                </span>
                <span className="text-[10px] text-slate-300 block">
                  +{formatBRL(sim.ganhoSolarVsPoupancaValor)} a mais
                </span>
              </div>

              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <span className="text-[10px] uppercase font-bold text-slate-300 block">
                  Vantagem vs. CDB Líquido
                </span>
                <span className="text-xl font-black text-sky-400 font-mono-numbers">
                  +{sim.ganhoSolarVsCdbPercent}%
                </span>
                <span className="text-[10px] text-slate-300 block">
                  +{formatBRL(sim.ganhoSolarVsCdbValor)} a mais
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed pt-1">
              Ao investir em Energia Solar você não apenas elimina a fatura de luz: você blinda seu
              patrimônio da inflação energética (que historicamente supera o IPCA), valoriza seu
              imóvel em até 8% e acumula um saldo líquido imbatível.
            </p>
          </div>
        )}

        {/* Botão de Toggle da Tabela Detalhada a cada 5 anos */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarTabela(!mostrarTabela)}
            className="text-xs font-semibold gap-1.5 h-8 border-slate-300 text-slate-700 hover:text-[#0B7A5B]"
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
            <div className="mt-3 rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#0A192F] text-white font-bold text-[11px]">
                    <th className="p-3">Marco Temporal</th>
                    <th className="p-3 text-right">Poupança (6,17% a.a.)</th>
                    <th className="p-3 text-right">CDB 100% CDI Líquido</th>
                    <th className="p-3 text-right text-amber-300 bg-white/10">☀ Energia Solar</th>
                    <th className="p-3 text-right text-emerald-300 bg-white/10 font-black">
                      Vantagem Solar vs CDB
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono-numbers">
                  {marcosTabela.map((row) => {
                    const diffCdb = row.solar - row.cdb
                    const is30 = row.ano === 30
                    return (
                      <tr
                        key={row.ano}
                        className={
                          is30
                            ? 'bg-amber-50/70 font-black text-slate-900'
                            : 'hover:bg-slate-50/70 text-slate-700'
                        }
                      >
                        <td className="p-3 font-sans font-bold">
                          {row.ano === 0 ? 'Investimento (Ano 0)' : `${row.ano} anos`}
                        </td>
                        <td className="p-3 text-right">{formatBRL(row.poupanca)}</td>
                        <td className="p-3 text-right">{formatBRL(row.cdb)}</td>
                        <td className="p-3 text-right font-black text-[#0A192F] bg-amber-50/40">
                          {formatBRL(row.solar)}
                        </td>
                        <td
                          className={`p-3 text-right font-black bg-amber-50/40 ${
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

        {/* Premissas Transparentes */}
        {mostrarAvisoNotas && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Info className="w-3.5 h-3.5 text-[#0B7A5B]" />
              <span>Premissas financeiras transparentes desta simulação:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-slate-600">
              <li>
                <strong>Energia Solar:</strong> Investimento inicial de{' '}
                {formatBRL(sim.valorInvestido)} com economia mensal reinvestida conservadoramente a
                6,17% a.a., deduzida a degradação linear padrão de 0,5% a.a. dos módulos
                fotovoltaicos homologados.
              </li>
              <li>
                <strong>CDB 100% CDI:</strong> Taxa bruta de 10,50% a.a. com desconto da alíquota
                regressiva de Imposto de Renda (15% para períodos superiores a 2 anos).
              </li>
              <li>
                <strong>Poupança:</strong> Rentabilidade tradicional estimada em 6,17% a.a. isentos
                de IR.
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AnimatedInvestmentRace
