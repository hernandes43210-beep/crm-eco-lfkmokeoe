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
  CheckCircle,
  HelpCircle,
  PiggyBank,
  DollarSign,
  Maximize2,
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
import { MascotSpeechBubble } from '@/components/MascotSpeechBubble'
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

/**
 * Sequência de Telas do Story:
 * Tela 0: MÓDULOS (Painéis) - quantidade, marca e potência bem grandes e visuais (ex.: '10 painéis de 630W — [marca]')
 * Tela 1: INVERSOR - potência, marca e quantidade (ex.: 'Sungrow 5 kW'), com destaque da marca
 * Tela 2: GERAÇÃO - dimensionamento, geração kWh/mês e tecnologia de captação
 * Tela 3: ECONOMIA - alívio na conta de luz, comparação de custos antes vs depois
 * Tela 4: RETORNO SOBRE INVESTIMENTO (ROI 30 Anos) - economia acumulada vs poupança/CDB e payback
 * Tela 5: QUALIDADES ECOSOLAR - engenharia própria, ART, homologação Energisa e prova social
 * Tela 6: VALOR FINAL & CTA DE ASSINATURA - valor total, economia, condições e aceite eletrônico com nome
 */
const TOTAL_SCREENS = 7

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

  // Autoplay pausável (estilo Instagram Story com 8.5 segundos por tela, exceto a tela final de aceite)
  const [isPaused, setIsPaused] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0)

  // Decompor o kit em componentes detalhados
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

  // Dados técnicos específicos dos módulos
  const moduloItem = specs.itens.find((it) => it.tipo === 'modulo')
  const quantidadeModulos = specs.quantidadeModulosTotal || moduloItem?.quantidade || 10

  const marcaPainel =
    (proposta as any)?.kit_marca_painel ||
    proposta.kit?.marca_painel ||
    moduloItem?.fabricanteModelo?.split(' ')[0] ||
    (proposta.kit_fabricante ? proposta.kit_fabricante.split('/')[0]?.trim() : '') ||
    'Tier 1'

  const potenciaPainelW =
    (proposta as any)?.kit_potencia_painel_w ||
    proposta.kit?.potencia_painel_w ||
    (moduloItem?.potenciaUnit ? parseInt(moduloItem.potenciaUnit.replace(/\D/g, ''), 10) : 0) ||
    (proposta.kit_potencia_kw && quantidadeModulos
      ? Math.round((proposta.kit_potencia_kw * 1000) / quantidadeModulos)
      : 630)

  const potenciaPainelFormatada = `${potenciaPainelW}W`

  // Dados técnicos específicos do inversor
  const inversorItem = specs.itens.find((it) => it.tipo === 'inversor')
  const quantidadeInversores = inversorItem?.quantidade || 1

  const marcaInversor =
    (proposta as any)?.kit_marca_inversor ||
    proposta.kit?.marca_inversor ||
    inversorItem?.fabricanteModelo?.split(' ')[0] ||
    (proposta.kit_fabricante?.includes('/')
      ? proposta.kit_fabricante.split('/')[1]?.trim()
      : proposta.kit_fabricante) ||
    'Homologado INMETRO'

  const potenciaInversorKw =
    (proposta as any)?.kit_potencia_inversor_kw ||
    proposta.kit?.potencia_inversor_kw ||
    proposta.kit_potencia_kw ||
    5

  const inversorPrincipal =
    inversorItem?.fabricanteModelo || `${marcaInversor} ${potenciaInversorKw} kW`

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
  const economia30Anos = economiaAnual * 30 // 30 anos
  const investimentoTotal = proposta.preco_venda || 0
  const paybackAnos =
    investimentoTotal > 0 && economiaAnual > 0
      ? (investimentoTotal / economiaAnual).toFixed(1).replace('.', ',')
      : '3,2'

  const proposalNumber = (proposta.id || 'ECO').slice(-6).toUpperCase()
  const localCliente =
    [proposta.lead?.cidade, proposta.lead?.estado].filter(Boolean).join(' - ') || 'Brasil'

  // Identificação do inversor e marca em destaque
  const marcaInversorLower = (
    marcaInversor ||
    proposta.kit_nome ||
    proposta.kit_fabricante ||
    ''
  ).toLowerCase()
  const isInversorSungrow = marcaInversorLower.includes('sungrow')
  const isInversorHuawei = marcaInversorLower.includes('huawei')
  const isInversorDestaque = isInversorSungrow || isInversorHuawei

  // Resolver foto de abertura / kit IA / obra
  const fotoAbertura = useMemo(() => {
    if (Array.isArray(proposta.fotos_selecionadas) && proposta.fotos_selecionadas.length > 0) {
      const primeiro = proposta.fotos_selecionadas[0]
      if (primeiro.origem === 'lead') {
        const leadPh = (proposta.fotos_obra || []).find((p) => p.id === primeiro.id)
        const url = leadPh?.url || leadPh?.foto || ''
        if (url) {
          return {
            url,
            origem: 'lead' as const,
            tag: 'Foto da Obra',
            legenda: primeiro.legenda || leadPh?.legenda || 'Instalação Real do Cliente',
            isKitIa: false,
          }
        }
      } else {
        const inst = INSTITUTIONAL_INSTALLATION_PHOTOS.find((p) => p.id === primeiro.id)
        if (inst) {
          return {
            url: inst.src,
            origem: 'institucional' as const,
            tag: inst.tag,
            legenda: primeiro.legenda || inst.legenda,
            isKitIa: false,
          }
        } else if (primeiro.id && primeiro.id.startsWith('kit_')) {
          const kitUrl =
            proposta.kit?.imagem_ia_url ||
            (proposta.kit?.imagem_ia && proposta.kit?.id
              ? `/api/files/kits/${proposta.kit.id}/${proposta.kit.imagem_ia}`
              : '')
          if (kitUrl) {
            return {
              url: kitUrl,
              origem: 'kit_ia' as const,
              tag: 'IA • Kit',
              legenda: primeiro.legenda || 'Simulação fotorrealista do kit solar homologado',
              isKitIa: true,
            }
          }
        } else if (primeiro.id) {
          const pbHost = window.location.origin
          const url = `${pbHost}/api/files/fotos_institucionais/${primeiro.id}/${primeiro.id}.jpg`
          return {
            url,
            origem: 'institucional' as const,
            tag: 'IA • Galeria',
            legenda: primeiro.legenda || 'Instalação Solar Homologada',
            isKitIa: false,
          }
        }
      }
    }

    const kitImgUrl =
      proposta.kit?.imagem_ia_url ||
      (proposta.kit?.imagem_ia && proposta.kit?.id
        ? `/api/files/kits/${proposta.kit.id}/${proposta.kit.imagem_ia}`
        : '')

    if (kitImgUrl) {
      return {
        url: kitImgUrl,
        origem: 'kit_ia' as const,
        tag: 'IA • Kit',
        legenda: `Simulação fotorrealista do ${proposta.kit_nome || 'kit solar'}`,
        isKitIa: true,
      }
    }

    return null
  }, [proposta])

  // Resolver fotos selecionadas para a prova social discreta na tela de qualidades
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

  // Timer de avanço estilo Instagram Story (pausado na última tela de assinatura)
  useEffect(() => {
    if (currentScreen === TOTAL_SCREENS - 1 || isPaused) {
      return
    }

    const interval = 80 // ms
    const step = 100 / (8500 / interval) // 8.5 segundos por tela

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

  // Controle por teclado
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
      {/* Contêiner Estilo Story: proporção vertical de smartphone/story */}
      <div
        className="relative w-full max-w-[500px] h-[94vh] max-h-[880px] bg-gradient-to-b from-[#0A192F] via-[#0D2340] to-[#071324] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-between"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Barra de Progresso Estilo Story (Segmentada no topo) */}
        <div className="absolute top-0 left-0 right-0 z-30 pt-3 px-3 pb-2 bg-gradient-to-b from-[#060F1E]/95 to-transparent">
          <div className="flex items-center gap-1">
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
                    className="h-full bg-amber-400 transition-all duration-75 ease-linear rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]"
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
                <span className="text-[10px] text-amber-300 font-medium block leading-tight truncate max-w-[150px]">
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
        <div className="flex-1 flex flex-col justify-between pt-16 pb-3 px-4 sm:px-6 relative z-10 overflow-y-auto">
          {/* ======================================================== */}
          {/* TELA 1: CARROSSEL DE EQUIPAMENTOS — (1) MÓDULOS SOLARES  */}
          {/* ======================================================== */}
          {currentScreen === 0 && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-in fade-in duration-300 py-1">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>1 de 7 • Equipamento: Módulos Fotovoltaicos</span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  Painéis de <span className="text-amber-400">Alta Potência</span>
                </h1>
                <p className="text-xs text-slate-300">
                  Módulos fotovoltaicos Tier 1 com tecnologia de captação solar contínua.
                </p>
              </div>

              {/* CARD DESTAQUE GIGANTE: Quantidade, Marca e Potência bem grandes */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-amber-400/70 shadow-2xl bg-gradient-to-br from-[#0F284E] via-[#0A192F] to-[#153460] p-4 sm:p-5 text-center">
                {/* Glow decorativo de fundo */}
                <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-sky-500/15 blur-2xl pointer-events-none" />

                <span className="text-[10px] uppercase tracking-widest text-amber-300 font-extrabold block">
                  Configuração Homologada dos Painéis
                </span>

                {/* Bloco com Quantidade e Potência Grandes */}
                <div className="my-3 space-y-1">
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline justify-center gap-2">
                    <span className="text-amber-400 text-4xl sm:text-5xl font-mono-numbers">
                      {quantidadeModulos}
                    </span>
                    <span>painéis de</span>
                    <span className="text-amber-300 text-3xl sm:text-4xl font-mono-numbers">
                      {potenciaPainelFormatada}
                    </span>
                  </div>

                  {/* Marca em Destaque Especial */}
                  <div className="inline-block mt-2 px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-sm sm:text-base uppercase tracking-wider shadow-md">
                    Marca: {marcaPainel}
                  </div>
                </div>

                {/* Faixa técnica rápida */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs">
                  <div className="bg-black/30 rounded-lg p-2 text-left">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">
                      Potência Total
                    </span>
                    <strong className="text-white text-sm font-mono-numbers">
                      {specs.potenciaTotalFormatada}
                    </strong>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2 text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">
                      Garantia Linear
                    </span>
                    <strong className="text-emerald-300 text-sm">25 Anos (84%+)</strong>
                  </div>
                </div>
              </div>

              {/* Tecnologias dos módulos em pílulas */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-amber-300 font-bold block">
                    ⚡ Células Half-Cell & PERC
                  </span>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    Alta eficiência mesmo em dias nublados e menor perda térmica.
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-amber-300 font-bold block">
                    🛡️ Vidro Anti-Reflexo
                  </span>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    Vidro temperado autolimpante com resistência a chuvas de granizo.
                  </p>
                </div>
              </div>

              {/* GUIA AMIGÁVEL: Mascote da Ecosolar dando vida aos números dos módulos */}
              <MascotSpeechBubble
                titulo="O Mascote Explica:"
                fala={`Com esses ${quantidadeModulos} painéis de ${potenciaPainelFormatada} da ${marcaPainel}, seu imóvel vai gerar energia limpa todos os dias direto do sol!`}
                dica="Garantia de 25 anos: seu sistema gerando energia por décadas."
                destaqueBadge={`${specs.potenciaTotalFormatada}`}
                humor="animado"
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TELA 2: CARROSSEL DE EQUIPAMENTOS — (2) INVERSOR SOLAR    */}
          {/* ======================================================== */}
          {currentScreen === 1 && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-in fade-in duration-300 py-1">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-400/40 text-blue-300 text-[11px] font-black uppercase tracking-wider">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  <span>2 de 7 • Equipamento: Inversor Fotovoltaico</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  O Coração do Sistema: <span className="text-amber-400">{marcaInversor}</span>
                </h2>
                <p className="text-xs text-slate-300">
                  Converte a energia solar em eletricidade perfeita para o padrão da sua casa.
                </p>
              </div>

              {/* CARD DESTAQUE GIGANTE: Inversor com Potência, Marca e Quantidade */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-blue-400/70 shadow-2xl bg-gradient-to-br from-[#0B254E] via-[#0A192F] to-[#122A4E] p-4 sm:p-5 text-center">
                <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

                <span className="text-[10px] uppercase tracking-widest text-sky-300 font-extrabold block">
                  Inversor Interativo On-Grid
                </span>

                {/* Potência e Marca em Letras Garrafais */}
                <div className="my-3 space-y-1">
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline justify-center gap-2">
                    <span className="text-sky-300 text-3xl sm:text-4xl font-mono-numbers">
                      {marcaInversor}
                    </span>
                    <span className="text-amber-400 text-4xl sm:text-5xl font-mono-numbers">
                      {potenciaInversorKw} kW
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-400/40 text-blue-200 text-xs font-bold">
                    <span>Quantidade:</span>
                    <strong className="text-white text-sm">{quantidadeInversores} unidade</strong>
                    {isInversorDestaque && (
                      <span className="ml-1 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase">
                        Líder Mundial
                      </span>
                    )}
                  </div>
                </div>

                {/* Descrição técnica do inversor */}
                <p className="text-xs text-slate-200 leading-relaxed pt-1">
                  {isInversorSungrow
                    ? 'Inversor Sungrow com eficiência superior a 98,5%, proteção contra surtos DPS integrada e assistência técnica ágil no Brasil garantida pela Ecosolar.'
                    : isInversorHuawei
                      ? 'Inversor Huawei FusionSolar com inteligência artificial, máxima segurança AFCI e monitoramento inteligente pelo celular.'
                      : `${inversorPrincipal} com homologação INMETRO, alta confiabilidade e conexão autorizada na rede da concessionária Energisa.`}
                </p>

                {stringBoxDesc && (
                  <div className="mt-3 pt-2 border-t border-white/10 text-[11px] text-slate-300">
                    Proteção: <strong className="text-amber-300">{stringBoxDesc}</strong>
                  </div>
                )}
              </div>

              {/* Pilares do Inversor */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-emerald-400 font-bold block flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Garantia Oficial
                  </span>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    Até 10-12 anos de garantia de fábrica com troca ágil.
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-amber-300 font-bold block flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Wi-Fi no Celular
                  </span>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    Acompanhe em tempo real a geração e economia na palma da mão.
                  </p>
                </div>
              </div>

              {/* GUIA AMIGÁVEL: Mascote da Ecosolar dando vida ao inversor */}
              <MascotSpeechBubble
                titulo="O Mascote Explica:"
                fala={`O inversor ${marcaInversor} de ${potenciaInversorKw} kW é o maestro da usina! Ele transforma a luz do sol em eletricidade pronta para ligar seu ar-condicionado e geladeira.`}
                dica="Você acompanha a geração minuto a minuto pelo aplicativo no celular."
                destaqueBadge={`${potenciaInversorKw} kW`}
                humor="conselheiro"
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TELA 3: GERAÇÃO MENSAL ESTIMADA                           */}
          {/* ======================================================== */}
          {currentScreen === 2 && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-in fade-in duration-300 py-1">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>3 de 7 • Geração Mensal de Energia</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  Produção de <span className="text-amber-400">Energia Limpa</span>
                </h2>
                <p className="text-xs text-slate-300">
                  Dimensionamento sob medida para zerar a conta de luz de{' '}
                  <strong className="text-white">{proposta.lead?.nome || 'você'}</strong>.
                </p>
              </div>

              {/* Imagem do Kit ou Card de Geração Estimada */}
              {fotoAbertura ? (
                <div className="relative rounded-2xl overflow-hidden border border-amber-400/50 shadow-xl bg-slate-950">
                  <div className="h-36 sm:h-40 w-full relative overflow-hidden bg-slate-900">
                    <img
                      src={fotoAbertura.url}
                      alt={fotoAbertura.legenda}
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A192F] via-[#0A192F]/40 to-transparent" />

                    <div className="absolute top-2 right-2">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 shadow-md">
                        {fotoAbertura.tag}
                      </span>
                    </div>

                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white">
                      <span className="font-bold truncate max-w-[65%]">
                        {proposta.kit_nome || 'Kit Solar Ecosolar'}
                      </span>
                      <span className="text-amber-300 font-extrabold">
                        {specs.potenciaTotalFormatada}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-r from-[#0A192F] via-[#0E274A] to-[#0A192F] flex items-center justify-between border-t border-white/10">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold block">
                        Geração Mensal Estimada
                      </span>
                      <span className="text-2xl font-black text-amber-300 font-mono-numbers">
                        ~{geracaoEstimadaKwh} kWh/mês
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold block">
                        Cobertura
                      </span>
                      <span className="text-xs font-black text-emerald-400 block">
                        100% do consumo
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-5 border border-amber-400/40 text-center relative overflow-hidden shadow-xl">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold block">
                    Geração Mensal Estimada
                  </span>
                  <div className="text-4xl sm:text-5xl font-black text-amber-300 font-mono-numbers my-1.5 tracking-tight flex items-baseline justify-center gap-1.5">
                    <span>~{geracaoEstimadaKwh}</span>
                    <span className="text-lg text-white font-bold">kWh/mês</span>
                  </div>
                  <div className="inline-block bg-[#0A192F]/80 px-3 py-1 rounded-lg border border-white/10 text-xs font-semibold text-emerald-300">
                    Supre 100% do seu consumo médio de {consumoKwh} kWh/mês
                  </div>
                </div>
              )}

              {/* Métricas de radiação e local */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Localização
                  </span>
                  <p className="text-white font-bold truncate mt-0.5">{localCliente}</p>
                  <p className="text-[10px] text-amber-300">Alta irradiação solar</p>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Fixação Estrutural
                  </span>
                  <p className="text-white font-bold truncate mt-0.5">
                    {tipoEstruturaRotulo || 'Telhado / Solo'}
                  </p>
                  <p className="text-[10px] text-emerald-400">Alumínio naval reforçado</p>
                </div>
              </div>

              {/* GUIA AMIGÁVEL: Mascote da Ecosolar dando vida à geração */}
              <MascotSpeechBubble
                titulo="O Mascote Explica:"
                fala={`Com cerca de ${geracaoEstimadaKwh} kWh gerados todo mês, você nunca mais vai se preocupar em ligar o ar-condicionado nos dias mais quentes!`}
                dica={`Dimensionado exatamente para o perfil de ${localCliente}.`}
                destaqueBadge={`~${geracaoEstimadaKwh} kWh`}
                humor="feliz"
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TELA 4: ECONOMIA NA CONTA DE LUZ                          */}
          {/* ======================================================== */}
          {currentScreen === 3 && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-in fade-in duration-300 py-1">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>4 de 7 • Economia na Fatura de Energia</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  Alívio Imediato no <span className="text-emerald-400">Seu Bolso</span>
                </h2>
                <p className="text-xs text-slate-300">
                  Veja a diferença drástica do que você paga hoje vs o que pagará com a Ecosolar.
                </p>
              </div>

              {/* Comparativo de Economia Mensal e Anual */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-gradient-to-br from-emerald-950/60 to-emerald-900/40 rounded-2xl p-3.5 border-2 border-emerald-400/60 text-center shadow-lg">
                  <span className="text-[10px] uppercase tracking-widest text-emerald-300 font-extrabold block">
                    Economia Todo Mês
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono-numbers my-1">
                    {formatBRL(economiaMensal)}
                  </p>
                  <p className="text-[10px] text-slate-200">Deixa de ir para a distribuidora</p>
                </div>

                <div className="bg-gradient-to-br from-amber-950/40 to-amber-900/30 rounded-2xl p-3.5 border border-amber-400/50 text-center shadow-lg">
                  <span className="text-[10px] uppercase tracking-widest text-amber-300 font-extrabold block">
                    Economia em 1 Ano
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-amber-300 font-mono-numbers my-1">
                    {formatBRL(economiaAnual)}
                  </p>
                  <p className="text-[10px] text-slate-200">Dinheiro livre para investir</p>
                </div>
              </div>

              {/* Card visual comparando Antes x Depois */}
              <div className="bg-black/30 rounded-2xl p-3 border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>Conta Atual (Sem Solar):</span>
                  </span>
                  <strong className="text-rose-400 font-mono-numbers">
                    ~{formatBRL(economiaMensal + 60)}/mês
                  </strong>
                </div>

                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span>Conta Nova (Com Ecosolar):</span>
                  </span>
                  <strong className="text-emerald-300 font-mono-numbers">
                    Apenas taxa mínima da Energisa
                  </strong>
                </div>

                <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold pt-0.5">
                  <span>Redução direta na fatura:</span>
                  <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                    Até 95% de economia
                  </span>
                </div>
              </div>

              {/* GUIA AMIGÁVEL: Mascote da Ecosolar dando vida à economia */}
              <MascotSpeechBubble
                titulo="O Mascote Explica:"
                fala={`São ${formatBRL(economiaMensal)} a mais no seu bolso todo santo mês! Em um ano, são ${formatBRL(economiaAnual)} que viram viagens, reformas ou investimentos.`}
                dica="Energia solar se paga sozinha com o valor que você já gasta hoje na conta."
                destaqueBadge={`${formatBRL(economiaMensal)}/mês`}
                humor="animado"
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TELA 5: RETORNO SOBRE O INVESTIMENTO (ROI 30 ANOS)        */}
          {/* ======================================================== */}
          {currentScreen === 4 && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-in fade-in duration-300 py-1">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>5 de 7 • Retorno sobre Investimento (ROI)</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  Seu Dinheiro Rendendo <span className="text-emerald-400">Muito Mais</span>
                </h2>
                <p className="text-xs text-slate-300">
                  Energia solar não é gasto, é o investimento mais seguro e rentável do Brasil.
                </p>
              </div>

              {/* Card Destaque da Economia em 30 Anos */}
              <div className="bg-gradient-to-r from-emerald-950/70 via-emerald-900/50 to-[#0A192F] rounded-2xl p-4 border-2 border-emerald-400 text-center shadow-xl">
                <span className="text-[10px] uppercase tracking-widest text-emerald-300 font-extrabold block">
                  Economia Acumulada em 30 Anos
                </span>
                <p className="text-3xl sm:text-4xl font-black text-emerald-300 font-mono-numbers my-1 tracking-tight">
                  {formatBRL(economia30Anos)}
                </p>
                <p className="text-[11px] text-slate-300">
                  Patrimônio protegido contra a inflação e aumento contínuo da tarifa elétrica.
                </p>
              </div>

              {/* Payback e Comparativo */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Payback Estimado
                  </span>
                  <p className="text-xl font-black text-amber-300 font-mono-numbers mt-0.5">
                    ~{paybackAnos} anos
                  </p>
                  <p className="text-[10px] text-slate-400">Retorno integral do valor</p>
                </div>

                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Rentabilidade Média
                  </span>
                  <p className="text-xl font-black text-emerald-300 font-mono-numbers mt-0.5">
                    25% a 32% a.a.
                  </p>
                  <p className="text-[10px] text-slate-400">Isento de Imposto de Renda</p>
                </div>
              </div>

              {/* Comparativo Resumido com Poupança e CDB */}
              <div className="bg-black/30 rounded-xl p-2.5 border border-white/10 text-xs space-y-1">
                <div className="flex items-center justify-between text-emerald-300 font-bold">
                  <span>☀️ Energia Solar Ecosolar:</span>
                  <span>~28% a.a. líquido</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>🏦 CDB 100% CDI:</span>
                  <span>~8,5% a.a. (com IR retido)</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>💰 Poupança Bancária:</span>
                  <span>~6,5% a.a. (perde da inflação)</span>
                </div>
              </div>

              {/* GUIA AMIGÁVEL: Mascote da Ecosolar dando vida ao ROI */}
              <MascotSpeechBubble
                titulo="O Mascote Explica:"
                fala={`Em ~${paybackAnos} anos o sistema se paga integralmente e você tem mais de 25 anos de energia gratuita gerando mais de ${formatBRL(economia30Anos)} no seu bolso!`}
                dica="Nenhum investimento de banco bate o retorno da energia solar."
                destaqueBadge={`Payback ~${paybackAnos} anos`}
                humor="comemorando"
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TELA 6: QUALIDADES DA ECOSOLAR ENERGY                     */}
          {/* ======================================================== */}
          {currentScreen === 5 && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-in fade-in duration-300 py-1">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>6 de 7 • Por que Escolher a Ecosolar?</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  Engenharia Própria & <span className="text-amber-400">Homologação</span>
                </h2>
                <p className="text-xs text-slate-300">
                  Solução Chave na Mão: nós cuidamos de 100% da burocracia e entregamos funcionando.
                </p>
              </div>

              {/* 3 Pilares Ecosolar */}
              <div className="space-y-2">
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Projeto com Emissão de ART no CREA
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Engenheiro responsável habilitado com rigor total de segurança e cálculo
                      eólico.
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-400/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Homologação Inclusa na Energisa
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Parecer de acesso, vistoria e troca para o relógio bidirecional sem dor de
                      cabeça.
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-400/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Pós-Venda e Suporte Regional</h4>
                    <p className="text-[11px] text-slate-300">
                      Garantia de instalação com equipe técnica local pronta para atender você.
                    </p>
                  </div>
                </div>
              </div>

              {/* Prova Social Discreta (fotos de instalações reais) */}
              {resolvedPhotos.length > 0 && (
                <div className="bg-black/30 rounded-xl p-2 border border-white/10">
                  <div className="flex items-center justify-between mb-1.5 text-[10px]">
                    <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Camera className="w-3 h-3 text-amber-400" />
                      <span>Instalações Homologadas</span>
                    </span>
                    <span className="text-emerald-400 font-semibold">✓ Padrão NR10/NR35</span>
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

              {/* GUIA AMIGÁVEL: Mascote da Ecosolar garantindo a tranquilidade */}
              <MascotSpeechBubble
                titulo="O Mascote Garante:"
                fala="Aqui na Ecosolar você não precisa esquentar a cabeça com nada! Nossa engenharia cuida do projeto, da Energisa e da instalação com padrão de excelência."
                dica="Mais de centenas de clientes satisfeitos gerando sua própria energia."
                destaqueBadge="100% Chave na Mão"
                humor="animado"
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TELA 7: VALOR FINAL COM CTA DE ASSINATURA / ACEITE        */}
          {/* ======================================================== */}
          {currentScreen === 6 && (
            <div className="flex-1 flex flex-col justify-between space-y-2.5 animate-in fade-in duration-300 py-1">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>7 de 7 • Fechamento & Assinatura Digital</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  Investimento Total <span className="text-amber-400">Chave na Mão</span>
                </h2>
                <p className="text-[11px] text-slate-300">
                  Equipamentos {marcaPainel} + {marcaInversor}, engenharia, ART e instalação
                  inclusos.
                </p>
              </div>

              {/* Card de Preço Oficial com Desconto */}
              <div className="bg-gradient-to-br from-white/10 via-[#0A192F] to-[#163868] rounded-2xl p-3.5 border-2 border-amber-400 text-center shadow-xl space-y-1 relative">
                <span className="text-[10px] uppercase tracking-widest text-slate-300 font-extrabold block">
                  Valor Final da Proposta Comercial
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
                  <div className="text-3xl sm:text-4xl font-black text-amber-300 font-mono-numbers tracking-tight my-0.5">
                    {formatBRL(proposta.preco_venda)}
                  </div>
                )}

                <div className="pt-1.5 border-t border-white/10 text-[10px] text-slate-300 flex items-center justify-between">
                  <span>Validade garantida até:</span>
                  <strong className="text-white">{formatDateBR(proposta.data_validade)}</strong>
                </div>
              </div>

              {/* GUIA AMIGÁVEL: Mascote da Ecosolar chamando para a assinatura */}
              <MascotSpeechBubble
                titulo="O Mascote Comemora:"
                fala="Tudo pronto para você dar adeus às contas de luz caras! Preencha seu nome abaixo e formalize sua adesão agora mesmo."
                dica="Aceite eletrônico simples, seguro e com validade jurídica."
                destaqueBadge="Aceite Digital"
                humor="comemorando"
              />

              {/* Formulário de Aceite Digital ou Confirmação */}
              {acceptedSuccess ? (
                <div className="p-3 rounded-2xl bg-emerald-600/90 text-white border border-emerald-400 space-y-1.5 text-center">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-black text-xs sm:text-sm">
                    ✓ Proposta Assinada & Aceita com Sucesso!
                  </h3>
                  <p className="text-[10px] text-emerald-100 leading-tight">
                    Aceite registrado por{' '}
                    <strong>{proposta.aceito_por_nome || proposta.lead?.nome}</strong> em{' '}
                    {formatDateTimeBR(proposta.data_aceite || new Date().toISOString())}.
                  </p>
                  <Button
                    onClick={onDownloadPDF}
                    size="sm"
                    className="bg-white text-emerald-950 hover:bg-slate-100 font-black text-xs gap-1.5 h-8 mt-1"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Baixar Documento Assinado</span>
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={handleFormSubmit}
                  className="bg-white/5 rounded-2xl p-3 border border-white/15 space-y-2"
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
                    className="w-full h-10 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl gap-2 border border-amber-400"
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

                  <div className="text-[9px] text-slate-400 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Aceite auditável com registro de IP e data/hora oficial</span>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Barra Inferior com Controles: Voltar / Contador / Avançar */}
        <div className="relative z-30 px-4 py-2.5 bg-[#060F1E]/95 border-t border-white/10 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={currentScreen === 0}
            className="text-xs h-8.5 font-semibold bg-white/5 hover:bg-white/15 text-white border-white/15 disabled:opacity-30 gap-1 px-3"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar</span>
          </Button>

          <div className="text-[11px] font-bold text-slate-300">
            {currentScreen + 1} de {TOTAL_SCREENS}
          </div>

          {currentScreen < TOTAL_SCREENS - 1 ? (
            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="text-xs h-8.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black gap-1 px-4 shadow-md"
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
              className="text-xs h-8.5 bg-emerald-500 hover:bg-emerald-400 text-white font-black gap-1 px-3 shadow-md"
            >
              <span>Assinar</span>
              <Check className="w-4 h-4 stroke-[3]" />
            </Button>
          )}
        </div>
      </div>

      {/* Modal de Zoom da Foto da Prova Social */}
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
