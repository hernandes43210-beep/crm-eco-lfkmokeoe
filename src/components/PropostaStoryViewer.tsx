import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Award,
  Sparkles,
  Building2,
  FileDown,
  Layers,
  MapPin,
  Clock,
  Sun,
  Cpu,
  BarChart3,
  Loader2,
  ArrowRight,
  VolumeX,
  Volume2,
  Camera,
  Flame,
  Check,
} from 'lucide-react'
import officialLogoPng from '@/assets/a-613c6.png'
import type { PublicProposta } from '@/types/crm'
import {
  formatBRL,
  formatDateBR,
  formatDateTimeBR,
  calcularGeracaoMensalKwh,
  calcularEconomiaMensal,
  IRRADIACAO_MEDIA_DIARIA_HORAS,
  FATOR_PERDAS_SISTEMA,
} from '@/lib/solarUtils'
import { parseKitDetailedItems } from '@/lib/kitItemsParser'
import { INSTITUTIONAL_INSTALLATION_PHOTOS } from '@/data/socialProofPhotos'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface PropostaStoryViewerProps {
  proposta: PublicProposta
  onAccept: (nome: string) => Promise<void>
  accepting: boolean
  acceptedSuccess: boolean
  onDownloadPDF: () => void
  onSwitchToClassic?: () => void
  isInternalViewer?: boolean
}

const TOTAL_SCREENS = 6

export function PropostaStoryViewer({
  proposta,
  onAccept,
  accepting,
  acceptedSuccess,
  onDownloadPDF,
  onSwitchToClassic,
  isInternalViewer,
}: PropostaStoryViewerProps) {
  const [currentScreen, setCurrentScreen] = useState(0)
  const [nomeConfirmacao, setNomeConfirmacao] = useState(proposta.lead?.nome || '')
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<{
    id?: string
    url: string
    titulo: string
    legenda: string
    descricao: string
    tag: string
    local: string
  } | null>(null)

  // Autoplay pausável (como story de Instagram com 8 segundos por tela, exceto a tela final de aceite)
  const [isPaused, setIsPaused] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0)

  // Decompor o kit
  const specs = useMemo(() => {
    return parseKitDetailedItems({
      kitNome: proposta.kit_nome,
      kitPotenciaKw: proposta.kit_potencia_kw,
      kitFabricante: proposta.kit_fabricante,
      descricao: (proposta as any)?.kit_descricao || proposta.kit?.descricao,
      observacoes: proposta.observacoes,
      consumoKwh: proposta.lead?.consumo_mensal_kwh,
      stringBox: (proposta as any)?.kit_string_box || proposta.kit?.string_box,
      marcaPainel: (proposta as any)?.kit_marca_painel || proposta.kit?.marca_painel,
      marcaInversor: (proposta as any)?.kit_marca_inversor || proposta.kit?.marca_inversor,
      potenciaPainelW: (proposta as any)?.kit_potencia_painel_w || proposta.kit?.potencia_painel_w,
      potenciaInversorKw:
        (proposta as any)?.kit_potencia_inversor_kw || proposta.kit?.potencia_inversor_kw,
      tipoEstrutura: (proposta as any)?.kit_tipo_estrutura || proposta.kit?.tipo_estrutura,
    })
  }, [proposta])

  // Dados técnicos específicos
  const marcaInversor =
    (proposta as any)?.kit_marca_inversor ||
    proposta.kit?.marca_inversor ||
    specs.itens.find((it) => it.tipo === 'inversor')?.fabricanteModelo?.split(' ')[0] ||
    ''

  const marcaPainel =
    (proposta as any)?.kit_marca_painel ||
    proposta.kit?.marca_painel ||
    specs.itens.find((it) => it.tipo === 'modulo')?.fabricanteModelo?.split(' ')[0] ||
    ''

  const potenciaPainelFormatada = (proposta as any)?.kit_potencia_painel_w
    ? `${(proposta as any).kit_potencia_painel_w}W`
    : specs.itens.find((it) => it.tipo === 'modulo')?.potenciaUnit || 'Alta Eficiência'

  const potenciaInversorKw =
    (proposta as any)?.kit_potencia_inversor_kw ||
    proposta.kit?.potencia_inversor_kw ||
    proposta.kit_potencia_kw

  const inversorItem = specs.itens.find((it) => it.tipo === 'inversor')
  const inversorPrincipal =
    inversorItem?.fabricanteModelo || marcaInversor || 'Inversor Homologado Classe A'
  const stringBoxDesc =
    (proposta as any)?.kit_string_box ||
    proposta.kit?.string_box ||
    specs.itens.find((it) => it.tipo === 'string_box')?.nome

  const tipoEstruturaRotulo =
    (proposta as any)?.kit_tipo_estrutura ||
    proposta.kit?.tipo_estrutura ||
    specs.itens.find((it) => it.tipo === 'estrutura')?.nome

  // Cálculos solares
  const consumoKwh = proposta.lead?.consumo_mensal_kwh || 400
  const geracaoEstimadaKwh =
    specs.geracaoMensalEstimadaKwh ||
    (proposta.kit_potencia_kw
      ? calcularGeracaoMensalKwh(proposta.kit_potencia_kw)
      : Math.round(consumoKwh))
  const economiaMensal = calcularEconomiaMensal(consumoKwh)
  const economiaAnual = economiaMensal * 12
  const economia30Anos = economiaAnual * 30 // Exigência da regra: 30 anos
  const investimentoTotal = proposta.preco_venda || 0
  const paybackAnos =
    investimentoTotal > 0 && economiaAnual > 0
      ? (investimentoTotal / economiaAnual).toFixed(1).replace('.', ',')
      : '3,2'

  const proposalNumber = (proposta.id || 'ECO').slice(-6).toUpperCase()
  const localCliente =
    [proposta.lead?.cidade, proposta.lead?.estado].filter(Boolean).join(' - ') || 'Brasil'

  // Identificação do inversor e marca
  const marcaInversorLower = (
    marcaInversor ||
    proposta.kit_nome ||
    proposta.kit_fabricante ||
    ''
  ).toLowerCase()
  const isInversorSungrow = marcaInversorLower.includes('sungrow')
  const isInversorHuawei = marcaInversorLower.includes('huawei')
  const isInversorDestaque = isInversorSungrow || isInversorHuawei

  // Resolver fotos selecionadas para a prova social discreta na tela 4
  const resolvedPhotos = useMemo(() => {
    const list: Array<{
      id: string
      url: string
      titulo: string
      legenda: string
      descricao: string
      tag: string
      local: string
    }> = []

    if (Array.isArray(proposta.fotos_selecionadas) && proposta.fotos_selecionadas.length > 0) {
      proposta.fotos_selecionadas.forEach((sel, i) => {
        if (sel.origem === 'lead') {
          const leadPh = (proposta.fotos_obra || []).find((p) => p.id === sel.id)
          const url = leadPh?.url || leadPh?.foto || ''
          if (url) {
            list.push({
              id: `lead-${sel.id}-${i}`,
              url,
              titulo: sel.legenda || leadPh?.legenda || `Instalação do Cliente #${i + 1}`,
              legenda: sel.legenda || leadPh?.legenda || 'Instalação executada pela Ecosolar',
              descricao: 'Acompanhamento de engenharia e ART assinada.',
              tag: 'Obra do Cliente',
              local: localCliente,
            })
          }
        } else {
          const inst = INSTITUTIONAL_INSTALLATION_PHOTOS.find((p) => p.id === sel.id)
          if (inst) {
            list.push({
              id: inst.id,
              url: inst.src,
              titulo: inst.titulo,
              legenda: sel.legenda || inst.legenda,
              descricao: inst.descricao,
              tag: inst.tag,
              local: inst.local,
            })
          } else if (sel.id) {
            const pbHost = window.location.origin
            const url = `${pbHost}/api/files/fotos_institucionais/${sel.id}/${sel.id}.jpg`
            list.push({
              id: sel.id,
              url,
              titulo: sel.legenda || 'Instalação Solar Homologada',
              legenda: sel.legenda || 'Instalação Solar Homologada',
              descricao: 'Acompanhamento de engenharia e ART assinada.',
              tag: 'Galeria Inst.',
              local: localCliente,
            })
          }
        }
      })
    } else if (proposta.fotos_obra && proposta.fotos_obra.length > 0) {
      proposta.fotos_obra.slice(0, 3).forEach((ph, i) => {
        list.push({
          id: ph.id || `lead-${i}`,
          url: ph.url || ph.foto || '',
          titulo: ph.legenda || `Obra Homologada #${i + 1}`,
          legenda: ph.legenda || 'Instalação executada pela Ecosolar',
          descricao: 'Instalação homologada com acompanhamento de engenharia.',
          tag: 'Obra Homologada',
          local: localCliente,
        })
      })
    } else {
      INSTITUTIONAL_INSTALLATION_PHOTOS.slice(0, 3).forEach((inst) => {
        list.push({
          id: inst.id,
          url: inst.src,
          titulo: inst.titulo,
          legenda: inst.legenda,
          descricao: inst.descricao,
          tag: inst.tag,
          local: inst.local,
        })
      })
    }
    return list
  }, [proposta, localCliente])

  // Navegação
  const handleNext = useCallback(() => {
    if (currentScreen < TOTAL_SCREENS - 1) {
      setCurrentScreen((prev) => prev + 1)
      setProgressPercent(0)
    }
  }, [currentScreen])

  const handlePrev = useCallback(() => {
    if (currentScreen > 0) {
      setCurrentScreen((prev) => prev - 1)
      setProgressPercent(0)
    }
  }, [currentScreen])

  // Timer de avanço estilo Instagram
  // Na tela 5 (fechamento/aceite) o timer fica pausado para o cliente preencher tranquilamente
  useEffect(() => {
    if (currentScreen === TOTAL_SCREENS - 1 || isPaused) {
      return
    }

    const interval = 80 // ms
    const step = 100 / (8000 / interval) // 8 segundos por tela

    const timer = setInterval(() => {
      setProgressPercent((old) => {
        if (old >= 100) {
          handleNext()
          return 0
        }
        return old + step
      })
    }, interval)

    return () => clearInterval(timer)
  }, [currentScreen, isPaused, handleNext])

  // Controle por teclado (setas esquerda/direita)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeConfirmacao.trim()) return
    await onAccept(nomeConfirmacao.trim())
  }

  return (
    <div className="min-h-screen bg-[#060F1E] text-white flex flex-col items-center justify-center p-2 sm:p-4 selection:bg-amber-400 selection:text-slate-950">
      {/* Contêiner Estilo Story: proporção vertical elegante tipo smartphone/story max-w-md ou sm:max-w-lg */}
      <div
        className="relative w-full max-w-[500px] h-[94vh] max-h-[880px] bg-gradient-to-b from-[#0A192F] via-[#0D2340] to-[#071324] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-between"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Barra de Progresso Estilo Story (Segmentada no topo) */}
        <div className="absolute top-0 left-0 right-0 z-30 pt-3 px-3 pb-2 bg-gradient-to-b from-[#060F1E]/90 to-transparent">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_SCREENS }).map((_, idx) => {
              let fillWidth = '0%'
              if (idx < currentScreen) {
                fillWidth = '100%'
              } else if (idx === currentScreen) {
                fillWidth = `${progressPercent}%`
              }
              return (
                <div
                  key={`progress-${idx}`}
                  onClick={() => {
                    setCurrentScreen(idx)
                    setProgressPercent(0)
                  }}
                  className="flex-1 h-1 sm:h-1.5 bg-white/25 rounded-full overflow-hidden cursor-pointer"
                  title={`Tela ${idx + 1}`}
                >
                  <div
                    className="h-full bg-amber-400 transition-all duration-75 ease-linear rounded-full"
                    style={{ width: fillWidth }}
                  />
                </div>
              )
            })}
          </div>

          {/* Top Bar Header: Logo Ecosolar, Nome do Cliente, Botão PDF e Trocar para Clássica */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs">
                <img
                  src={officialLogoPng}
                  alt="Ecosolar"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-black text-xs text-white block leading-tight">
                  ECO<span className="text-[#F5C518]">SOLAR</span>
                </span>
                <span className="text-[10px] text-amber-300 font-medium block leading-tight">
                  {proposta.lead?.nome ? `${proposta.lead.nome.split(' ')[0]}` : 'Cliente'} • Nº{' '}
                  {proposalNumber}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {onSwitchToClassic && (
                <button
                  type="button"
                  onClick={onSwitchToClassic}
                  className="text-[10px] px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200 transition-colors font-medium border border-white/15"
                  title="Alternar para o formato de proposta clássico (completo e rolável)"
                >
                  Ver Clássica
                </button>
              )}
              <button
                type="button"
                onClick={onDownloadPDF}
                className="text-[10px] px-2 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold transition-colors flex items-center gap-1 shadow-xs"
                title="Baixar proposta em PDF"
              >
                <FileDown className="w-3 h-3 stroke-[2.5]" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Zonas de Toque Laterais estilo Instagram (Toque esquerdo = voltar, Toque direito = avançar) */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentScreen === 0}
          aria-label="Voltar tela anterior"
          className="absolute left-0 top-16 bottom-20 w-1/4 z-20 opacity-0 focus:opacity-10 focus:bg-white/10 disabled:pointer-events-none text-left pl-2 cursor-pointer flex items-center"
        >
          <ChevronLeft className="w-6 h-6 text-white drop-shadow-md" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={currentScreen === TOTAL_SCREENS - 1}
          aria-label="Avançar próxima tela"
          className="absolute right-0 top-16 bottom-20 w-1/4 z-20 opacity-0 focus:opacity-10 focus:bg-white/10 disabled:pointer-events-none text-right pr-2 cursor-pointer flex items-center justify-end"
        >
          <ChevronRight className="w-6 h-6 text-white drop-shadow-md" />
        </button>

        {/* Conteúdo Central da Tela Ativa */}
        <div className="flex-1 flex flex-col justify-between pt-18 pb-4 px-4 sm:px-6 relative z-10 overflow-y-auto">
          {/* ======================================================== */}
          {/* TELA 1: POTÊNCIA DO KIT CONTRATADO                        */}
          {/* ======================================================== */}
          {currentScreen === 0 && (
            <div className="flex-1 flex flex-col justify-between space-y-4 animate-in fade-in duration-300 py-2">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>1 de 6 • Potência do Kit Contratado</span>
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                    Seu Sistema Solar <span className="text-amber-400">Sob Medida</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    Dimensionado exclusivamente para o perfil de consumo de{' '}
                    <strong className="text-white">{proposta.lead?.nome || 'você'}</strong>.
                  </p>
                </div>
              </div>

              {/* Destaque Principal de Potência */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-5 border border-amber-400/40 text-center relative overflow-hidden shadow-xl">
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold block">
                  Potência Total Homologada
                </span>
                <div className="text-4xl sm:text-5xl font-black text-amber-300 font-mono-numbers my-1.5 tracking-tight flex items-baseline justify-center gap-1.5">
                  <span>{specs.potenciaTotalFormatada.split(' ')[0]}</span>
                  <span className="text-lg sm:text-xl text-white font-bold">kWp</span>
                </div>
                <div className="inline-block bg-[#0A192F]/80 px-3 py-1 rounded-lg border border-white/10 text-xs font-semibold text-slate-200">
                  {proposta.kit_nome}
                </div>
              </div>

              {/* Cards de Métricas Rápidas */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Geração Estimada
                  </span>
                  <p className="text-lg font-black text-white mt-0.5">
                    ~{geracaoEstimadaKwh}{' '}
                    <span className="text-[10px] font-normal text-slate-400">kWh/mês</span>
                  </p>
                  <p className="text-[10px] text-emerald-400 mt-0.5">Supre 100% do consumo</p>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Total de Módulos
                  </span>
                  <p className="text-lg font-black text-white mt-0.5">
                    {specs.quantidadeModulosTotal || '10+'}{' '}
                    <span className="text-[10px] font-normal text-slate-400">painéis</span>
                  </p>
                  <p className="text-[10px] text-amber-300 mt-0.5">{potenciaPainelFormatada}</p>
                </div>
              </div>

              {/* Box de localização e consultor */}
              <div className="bg-[#060F1E]/60 rounded-xl p-3 border border-white/10 text-xs text-slate-300 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" /> Local:
                  </span>
                  <strong className="text-white">{localCliente}</strong>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Consumo de referência:</span>
                  <span className="text-slate-200 font-semibold">{consumoKwh} kWh/mês</span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TELA 2: EQUIPAMENTOS EM DESTAQUE — INVERSOR               */}
          {/* ======================================================== */}
          {currentScreen === 1 && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-in fade-in duration-300 py-2">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-400/40 text-blue-300 text-[11px] font-bold uppercase tracking-wider">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  <span>2 de 6 • O Coração do Sistema: Inversor</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                  Inversor Fotovoltaico{' '}
                  <span className="text-amber-400">
                    {marcaInversor || proposta.kit_fabricante || 'Premium'}
                  </span>
                </h2>
                <p className="text-xs text-slate-300">
                  O inversor converte a energia solar em eletricidade pronta para o seu imóvel com a
                  máxima segurança e monitoramento via aplicativo.
                </p>
              </div>

              {/* Destaque customizado se Sungrow ou Huawei */}
              {isInversorDestaque ? (
                <div className="bg-gradient-to-br from-amber-400/20 via-blue-900/30 to-[#0A192F] rounded-2xl p-4 border-2 border-amber-400/60 shadow-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-400 text-slate-950 font-black text-[10px] uppercase">
                      Líder Mundial Tier 1
                    </Badge>
                    <span className="text-[10px] font-extrabold text-amber-300">
                      Garantia de até 10-12 Anos
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {isInversorSungrow ? 'Sungrow Power Supply' : 'Huawei FusionSolar'}
                  </h3>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {isInversorSungrow
                      ? 'Reconhecida globalmente pela extrema confiabilidade e assistência técnica ágil no Brasil. Eficiência superior a 98,5%, proteção anti-ilhamento ativa e suporte pós-venda direto e garantido pela Ecosolar.'
                      : 'Tecnologia de inteligência artificial de ponta, design premiado e segurança avançada com proteção contra arco elétrico (AFCI). O inversor mais premiado do mercado fotovoltaico.'}
                  </p>
                </div>
              ) : (
                <div className="bg-white/10 rounded-2xl p-4 border border-white/15 shadow-md space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-blue-500/20 text-blue-300 font-bold text-[10px] uppercase">
                      Homologação INMETRO
                    </Badge>
                    <span className="text-[10px] font-bold text-slate-300">
                      Garantia de Fábrica
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{inversorPrincipal}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Equipamento de alta robustez com selo INMETRO, proteção integrada contra surtos
                    e compatibilidade total com a rede da concessionária Energisa.
                  </p>
                </div>
              )}

              {/* Pilares do Inversor */}
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 bg-white/5 rounded-xl p-2.5 border border-white/10">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs text-white block">Garantia & Assistência</strong>
                    <span className="text-[11px] text-slate-300">
                      Troca facilitada e suporte local garantido pela engenharia Ecosolar Energy.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-white/5 rounded-xl p-2.5 border border-white/10">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs text-white block">
                      Monitoramento em Tempo Real
                    </strong>
                    <span className="text-[11px] text-slate-300">
                      Acompanhe pelo celular a geração de energia em kWh e a economia minuto a
                      minuto.
                    </span>
                  </div>
                </div>
              </div>

              {potenciaInversorKw ? (
                <div className="text-center text-[11px] text-slate-400 bg-black/30 py-1.5 px-3 rounded-lg">
                  Potência Nominal do Inversor:{' '}
                  <strong className="text-white">{potenciaInversorKw} kW</strong>
                  {stringBoxDesc ? ` • String Box: ${stringBoxDesc}` : ''}
                </div>
              ) : null}
            </div>
          )}

          {/* ======================================================== */}
          {/* TELA 3: PAINEL SOLAR E SUAS TECNOLOGIAS                   */}
          {/* ======================================================== */}
          {currentScreen === 2 && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-in fade-in duration-300 py-2">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>3 de 6 • Painéis Solares & Tecnologias</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                  Módulos de <span className="text-amber-400">Altíssima Eficiência</span>
                </h2>
                <p className="text-xs text-slate-300">
                  Tecnologia fotovoltaica de última geração para máxima geração mesmo em dias
                  nublados ou com altas temperaturas.
                </p>
              </div>

              {/* Card Destaque de Tecnologias dos Módulos */}
              <div className="bg-gradient-to-br from-[#0F284E] to-[#163868] rounded-2xl p-4 border border-amber-400/30 space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-white">
                    {marcaPainel || proposta.kit_fabricante || 'Módulos Monocristalinos'}
                  </span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    25 Anos de Garantia Linear
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-black/20 rounded-lg p-2 space-y-0.5">
                    <span className="text-[10px] text-amber-300 font-bold block">
                      Células Half-Cell
                    </span>
                    <p className="text-[11px] text-slate-300">
                      Reduz perdas térmicas e aumenta a tolerância a sombras parciais.
                    </p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2 space-y-0.5">
                    <span className="text-[10px] text-amber-300 font-bold block">
                      Tecnologia PERC / N-Type
                    </span>
                    <p className="text-[11px] text-slate-300">
                      Geração otimizada com excelente coeficiente de temperatura.
                    </p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2 space-y-0.5">
                    <span className="text-[10px] text-amber-300 font-bold block">
                      Vidro Anti-Reflexo
                    </span>
                    <p className="text-[11px] text-slate-300">
                      Vidro temperado de alta transparência com autolimpeza pela chuva.
                    </p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2 space-y-0.5">
                    <span className="text-[10px] text-amber-300 font-bold block">
                      Moldura Anodizada
                    </span>
                    <p className="text-[11px] text-slate-300">
                      Alumínio aeroespacial com alta resistência mecânica a ventos fortes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Garantia dos Painéis */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <strong className="text-white block font-bold">Garantia Linear de 25 Anos</strong>
                  <span className="text-[11px] text-slate-400">
                    Garantia de que seu sistema continuará gerando energia por décadas.
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xl font-black text-amber-400 font-mono-numbers block">
                    84%+
                  </span>
                  <span className="text-[9px] text-slate-400">ao final de 25 anos</span>
                </div>
              </div>

              <div className="text-center text-[11px] text-slate-400">
                Fixação em estrutura:{' '}
                <strong className="text-slate-200">
                  {tipoEstruturaRotulo || 'Conforme telhado / solo'}
                </strong>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TELA 4: QUALIDADES DA ECOSOLAR                            */}
          {/* ======================================================== */}
          {currentScreen === 3 && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-in fade-in duration-300 py-2">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>4 de 6 • Por que Escolher a Ecosolar Energy?</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                  Engenharia Própria & <span className="text-amber-400">Homologação</span>
                </h2>
                <p className="text-xs text-slate-300">
                  Solução Chave na Mão: nós cuidamos de 100% da burocracia técnica com a
                  concessionária Energisa e entregamos seu sistema funcionando.
                </p>
              </div>

              {/* 3 Pilares Ecosolar */}
              <div className="space-y-2">
                <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      Engenharia Própria com Emissão de ART
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Projeto executivo elétrico assinado por engenheiro habilitado no CREA. Sem
                      gambiarras e com rigor total de segurança.
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-400/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      Homologação 100% Inclusa na Energisa
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Tramitação direta de parecer de acesso e vistoria técnica até a troca do
                      relógio para o medidor bidirecional.
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-400/20 text-blue-400 flex items-center justify-center shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      Suporte Pós-Venda Especializado
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Acompanhamento contínuo da geração, garantia de instalação e equipe local
                      pronta para te atender.
                    </p>
                  </div>
                </div>
              </div>

              {/* Prova Social Discreta (fotos selecionadas de instalações reais sem cards gigantes) */}
              {resolvedPhotos.length > 0 && (
                <div className="bg-black/30 rounded-xl p-2.5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Camera className="w-3 h-3 text-amber-400" />
                      <span>Instalações Reais Ecosolar</span>
                    </span>
                    <span className="text-[9px] text-emerald-400 font-semibold">
                      ✓ Padrão NR10/NR35
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {resolvedPhotos.slice(0, 3).map((ph, idx) => (
                      <button
                        key={`story-photo-${idx}`}
                        type="button"
                        onClick={() => setSelectedPhotoModal(ph)}
                        className="group relative aspect-4/3 rounded-lg overflow-hidden border border-white/15 bg-slate-900 focus:outline-hidden"
                      >
                        <img
                          src={ph.url}
                          alt={ph.legenda}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1">
                          <span className="text-[8px] text-white font-medium truncate block w-full text-left">
                            {ph.tag}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TELA 5: RETORNO SOBRE O INVESTIMENTO (30 ANOS)            */}
          {/* ======================================================== */}
          {currentScreen === 4 && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-in fade-in duration-300 py-2">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>5 de 6 • Retorno sobre Investimento (ROI)</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                  Seu Dinheiro Rendendo <span className="text-emerald-400">Muito Mais</span>
                </h2>
                <p className="text-xs text-slate-300">
                  Energia solar não é custo, é um dos investimentos mais seguros e rentáveis do
                  Brasil, superando CDB e Poupança.
                </p>
              </div>

              {/* Destaque Triplo: Payback, Economia Mensal e Economia em 30 Anos */}
              <div className="grid grid-cols-1 gap-2.5">
                {/* Economia em 30 Anos (Destaque Principal) */}
                <div className="bg-gradient-to-r from-emerald-950/60 via-emerald-900/40 to-[#0A192F] rounded-2xl p-4 border-2 border-emerald-400/60 text-center shadow-lg">
                  <span className="text-[10px] uppercase tracking-widest text-emerald-300 font-extrabold block">
                    Economia Estimada em 30 Anos
                  </span>
                  <p className="text-3xl sm:text-4xl font-black text-emerald-300 font-mono-numbers my-1 tracking-tight">
                    {formatBRL(economia30Anos)}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Recursos que deixam de ser pagos à concessionária e permanecem no seu
                    patrimônio.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Economia Mensal
                    </span>
                    <p className="text-xl font-black text-white font-mono-numbers mt-1">
                      {formatBRL(economiaMensal)}
                    </p>
                    <p className="text-[10px] text-emerald-400 mt-0.5">Alívio imediato na conta</p>
                  </div>

                  <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Payback Estimado
                    </span>
                    <p className="text-xl font-black text-amber-300 font-mono-numbers mt-1">
                      ~{paybackAnos} anos
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Retorno do valor investido</p>
                  </div>
                </div>
              </div>

              {/* Comparativo Resumido */}
              <div className="bg-black/30 rounded-xl p-3 border border-white/10 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <strong>Energia Solar Ecosolar:</strong>
                  </span>
                  <span className="font-bold text-emerald-400">Rendimento de 25% a 32% a.a.</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Poupança Tradicional:</span>
                  <span>~6,5% a.a. (abaixo da inflação real)</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>CDB 100% CDI Líquido:</span>
                  <span>~8,5% a 9,5% a.a. (com incidência de IR)</span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TELA 6: VALOR DO INVESTIMENTO COM CTA DE ASSINATURA/ACEITE */}
          {/* ======================================================== */}
          {currentScreen === 5 && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-in fade-in duration-300 py-1">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>6 de 6 • Fechamento & Assinatura Digital</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  Investimento Total <span className="text-amber-400">Chave na Mão</span>
                </h2>
                <p className="text-[11px] text-slate-300">
                  Tudo incluso: equipamentos homologados, projeto de engenharia, ART e instalação.
                </p>
              </div>

              {/* Card de Preço com Desconto se houver */}
              <div className="bg-gradient-to-br from-white/10 via-[#0A192F] to-[#163868] rounded-2xl p-4 border-2 border-amber-400 text-center shadow-xl space-y-1 relative">
                <span className="text-[10px] uppercase tracking-widest text-slate-300 font-extrabold block">
                  Valor Final da Proposta
                </span>

                {proposta.desconto_percentual && proposta.desconto_percentual > 0 ? (
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-center gap-2">
                      <span className="line-through text-slate-400 text-xs sm:text-sm font-mono-numbers">
                        {formatBRL(proposta.valor_bruto || proposta.preco_venda)}
                      </span>
                      <span className="bg-emerald-500 text-white font-black text-[9px] uppercase px-1.5 py-0.5 rounded">
                        -{proposta.desconto_percentual}% OFF
                      </span>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-amber-300 font-mono-numbers tracking-tight">
                      {formatBRL(proposta.preco_venda)}
                    </div>
                    <span className="text-[10px] text-emerald-300 font-semibold block">
                      Economia imediata de{' '}
                      {formatBRL(
                        proposta.valor_desconto ||
                          Math.max(
                            0,
                            (proposta.valor_bruto || proposta.preco_venda) - proposta.preco_venda,
                          ),
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="text-3xl sm:text-4xl font-black text-amber-300 font-mono-numbers tracking-tight my-1">
                    {formatBRL(proposta.preco_venda)}
                  </div>
                )}

                <div className="pt-2 border-t border-white/10 text-[10px] text-slate-300 flex items-center justify-between">
                  <span>Validade garantida até:</span>
                  <strong className="text-white">{formatDateBR(proposta.data_validade)}</strong>
                </div>
              </div>

              {/* Formulário de Aceite Digital ou Confirmação */}
              {acceptedSuccess ? (
                <div className="p-3.5 rounded-2xl bg-emerald-600/90 text-white border border-emerald-400 space-y-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-black text-sm sm:text-base">
                    ✓ Proposta Assinada & Aceita com Sucesso!
                  </h3>
                  <p className="text-[11px] text-emerald-100 leading-relaxed">
                    Aceite digital formalizado por{' '}
                    <strong>{proposta.aceito_por_nome || proposta.lead?.nome}</strong> em{' '}
                    {formatDateTimeBR(proposta.data_aceite || new Date().toISOString())}.
                  </p>
                  <Button
                    onClick={onDownloadPDF}
                    size="sm"
                    className="bg-white text-emerald-950 hover:bg-slate-100 font-black text-xs gap-1.5 mt-1"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Baixar Documento Assinado</span>
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={handleFormSubmit}
                  className="bg-white/5 rounded-2xl p-3.5 border border-white/15 space-y-2.5"
                >
                  <div className="space-y-1 text-left">
                    <Label
                      htmlFor="storyNomeAceite"
                      className="text-[11px] font-bold text-slate-200"
                    >
                      Nome Completo do Cliente Contratante (para assinatura eletrônica)
                    </Label>
                    <Input
                      id="storyNomeAceite"
                      value={nomeConfirmacao}
                      onChange={(e) => setNomeConfirmacao(e.target.value)}
                      placeholder="Ex: João da Silva"
                      required
                      className="h-9 text-xs bg-black/40 border-white/20 text-white font-medium"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={accepting}
                    className="w-full h-11 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl gap-2 border border-amber-400"
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Formalizando Assinatura Digital...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[3]" />
                        <span>Assinar & Aceitar Proposta Agora</span>
                      </>
                    )}
                  </Button>

                  <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Aceite auditável com registro de IP e data/hora oficial</span>
                  </div>
                </form>
              )}

              {/* Botão de PDF secundário */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span>Dúvidas? Fale com seu consultor</span>
                <button
                  type="button"
                  onClick={onDownloadPDF}
                  className="text-amber-300 hover:underline font-semibold flex items-center gap-1"
                >
                  <FileDown className="w-3 h-3" />
                  <span>Baixar em PDF</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Barra Inferior com Controles: Botão Voltar / Avançar */}
        <div className="relative z-30 px-4 py-3 bg-[#060F1E]/95 border-t border-white/10 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={currentScreen === 0}
            className="text-xs h-9 font-semibold bg-white/5 hover:bg-white/15 text-white border-white/15 disabled:opacity-30 gap-1 px-3"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar</span>
          </Button>

          <div className="text-[11px] font-bold text-slate-400">
            {currentScreen + 1} de {TOTAL_SCREENS}
          </div>

          {currentScreen < TOTAL_SCREENS - 1 ? (
            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="text-xs h-9 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black gap-1 px-4 shadow-md"
            >
              <span>Avançar</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const el = document.getElementById('storyNomeAceite')
                if (el) el.focus()
              }}
              className="text-xs h-9 bg-emerald-500 hover:bg-emerald-400 text-white font-black gap-1 px-3 shadow-md"
            >
              <span>Assinar</span>
              <Check className="w-4 h-4 stroke-[3]" />
            </Button>
          )}
        </div>
      </div>

      {/* Modal de Zoom da Foto da Prova Social (Discreto) */}
      <Dialog
        open={!!selectedPhotoModal}
        onOpenChange={(open) => !open && setSelectedPhotoModal(null)}
      >
        <DialogContent className="sm:max-w-2xl p-4 bg-[#0A192F] text-white border border-white/20">
          {selectedPhotoModal && (
            <div className="space-y-3">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-400 text-slate-950 font-black text-xs uppercase px-2 py-0.5">
                    {selectedPhotoModal.tag}
                  </Badge>
                  <DialogTitle className="text-sm font-bold text-white">
                    {selectedPhotoModal.titulo}
                  </DialogTitle>
                </div>
              </DialogHeader>

              <div className="rounded-xl overflow-hidden bg-black/60 border border-white/15 max-h-[55vh] flex items-center justify-center">
                <img
                  src={selectedPhotoModal.url}
                  alt={selectedPhotoModal.legenda}
                  className="max-h-[55vh] w-auto max-w-full object-contain"
                />
              </div>

              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Local: {selectedPhotoModal.local}</span>
                  <span className="text-emerald-400 font-bold">✓ Homologação Ecosolar</span>
                </div>
                <p className="text-slate-200">{selectedPhotoModal.descricao}</p>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPhotoModal(null)}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
