import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileDown,
  Phone,
  Mail,
  Sparkles,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import officialLogoPng from '@/assets/a-613c6.png'
import { ProposalsService } from '@/services/proposals'
import type { PublicProposta } from '@/types/crm'
import { formatBRL, formatDateBR, formatDateTimeBR } from '@/lib/solarUtils'
import { CONTATO_ECOSOLAR } from '@/constants/empresa'
import { openProposalPDFPrint } from '@/lib/proposalPdf'
import { parseKitDetailedItems } from '@/lib/kitItemsParser'
import { PropostaStoryViewer } from '@/components/PropostaStoryViewer'
import { PROPOSTA_V2_CSS, FONTS_PROPOSTA_LINK } from '@/lib/proposalPdfCss'
import { PropostaViewerErrorBoundary } from '@/components/PropostaViewerErrorBoundary'
import { CabecalhoDoc } from '@/components/proposta/DocumentoViewer'
import { proposalDataDePublica, resolverFotosTela } from '@/components/proposta/v2Helpers'
import { montarDadosV2 } from '@/lib/proposalDadosV2'
import { PaginaCapa } from '@/components/proposta/v2PaginaCapa'
import { PaginaApresentacao } from '@/components/proposta/v2PaginaApresentacao'
import { PaginaSistema } from '@/components/proposta/v2PaginaSistema'
import { PaginaInvestimento } from '@/components/proposta/v2PaginaInvestimento'
import { PaginaComoVaiSer } from '@/components/proposta/v2PaginaComoVaiSer'
import { PaginaFinal } from '@/components/proposta/v2PaginaFinal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'

export default function PropostaPublica() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()
  const isPreviewParam =
    searchParams.get('preview') === 'true' || searchParams.get('preview') === '1'
  const isInternalViewer = isAuthenticated || isPreviewParam

  const [proposta, setProposta] = useState<PublicProposta | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // Formato ativo na visualização (inicializa a partir da query param ?formato= se presente, ou da proposta)
  const [visualizacaoFormato, setVisualizacaoFormato] = useState<'story' | 'classica' | null>(null)

  // Acceptance state
  const [nomeConfirmacao, setNomeConfirmacao] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [acceptedSuccess, setAcceptedSuccess] = useState(false)

  // Disparar conclusão de visualização apenas 1 vez por sessão de navegação do usuário
  const handleNotifyCompleteView = React.useCallback(
    async (formato: 'story' | 'classica') => {
      if (!token || isInternalViewer) return
      try {
        const sessionKey = `crm_prop_completed_${token}`
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const alreadyNotified = window.sessionStorage.getItem(sessionKey)
          if (alreadyNotified) return
          window.sessionStorage.setItem(sessionKey, String(Date.now()))
        }
        await ProposalsService.notifyProposalCompleteView(token, formato)
      } catch (err) {
        console.warn('Falha silenciosa ao notificar conclusão de visualização:', err)
      }
    },
    [token, isInternalViewer],
  )

  // IntersectionObserver para o formato clássico quando o bloco de aceite/assinatura digital entrar na viewport
  useEffect(() => {
    if (visualizacaoFormato !== 'classica' || isInternalViewer || !proposta) return

    const targetEl = document.getElementById('secao-assinatura-classica')
    if (!targetEl) return

    let triggered = false
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first && first.isIntersecting && !triggered) {
          triggered = true
          handleNotifyCompleteView('classica')
        }
      },
      { threshold: 0.25 },
    )

    observer.observe(targetEl)
    return () => observer.disconnect()
  }, [visualizacaoFormato, isInternalViewer, proposta, handleNotifyCompleteView])

  useEffect(() => {
    if (!token) {
      setErrorMsg('Token da proposta não fornecido na URL.')
      setLoading(false)
      return
    }

    loadProposta(token)
  }, [token, isInternalViewer])

  const loadProposta = async (t: string) => {
    try {
      setLoading(true)
      setErrorMsg(null)

      // Throttle de ~1 minuto por sessão do navegador (sessionStorage) para clientes reais
      // Se acabou de carregar a proposta nos últimos 60 segundos nesta mesma aba, usa flag preview/internal
      // para evitar contabilizar recarregamentos em sequência imediata (F5 repetido)
      let effectivePreview = isInternalViewer
      if (!effectivePreview && typeof window !== 'undefined' && window.sessionStorage) {
        try {
          const storageKey = `crm_prop_view_${t}`
          const lastViewTime = window.sessionStorage.getItem(storageKey)
          const now = Date.now()
          if (lastViewTime) {
            const diff = now - Number(lastViewTime)
            if (diff < 60000 && diff >= 0) {
              effectivePreview = true
            }
          }
          if (!effectivePreview) {
            window.sessionStorage.setItem(storageKey, String(now))
          }
        } catch {
          /* intentionally ignored */
        }
      }

      const data = await ProposalsService.getPublicProposta(t, { preview: effectivePreview })
      setProposta(data)
      if (data.lead?.nome) {
        setNomeConfirmacao(data.lead.nome)
      }
      if (data.status === 'Aceita') {
        setAcceptedSuccess(true)
      }

      // Definir formato inicial
      const formatQuery = searchParams.get('formato')
      if (formatQuery === 'classica' || formatQuery === 'story') {
        setVisualizacaoFormato(formatQuery)
      } else {
        // Padrão: documento clássico estilo PDF (o Story continua disponível pelo
        // botão "Ver Formato Story" dentro do leitor ou via ?formato=story)
        setVisualizacaoFormato('classica')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Proposta não encontrada ou expirada.'
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  const executeAcceptProposal = async (nomeDigitado: string) => {
    if (!token || !proposta) return

    try {
      setAccepting(true)
      const res = await ProposalsService.acceptPublicProposta(token, nomeDigitado.trim())
      setProposta((prev) =>
        prev
          ? {
              ...prev,
              status: 'Aceita',
              data_aceite: res.data_aceite || new Date().toISOString(),
              aceito_por_nome: nomeDigitado.trim() || prev.lead?.nome,
            }
          : null,
      )
      setAcceptedSuccess(true)
      toast({
        title: 'Proposta Aceita com Sucesso!',
        description:
          'Seu aceite formal foi registrado no sistema. Nossa equipe técnica de engenharia dará início imediato ao projeto executivo e homologação.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao aceitar proposta.'
      toast({
        title: 'Não foi possível aceitar',
        description: msg,
        variant: 'destructive',
      })
      throw err
    } finally {
      setAccepting(false)
    }
  }

  const handleAcceptProposal = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await executeAcceptProposal(nomeConfirmacao)
    } catch {
      /* feedback already toasted */
    }
  }

  const handleDownloadPDF = () => {
    if (!proposta) return
    openProposalPDFPrint({
      id: proposta.id,
      token_publico: proposta.token_publico,
      status: proposta.status,
      kit_nome: proposta.kit_nome,
      kit_potencia_kw: proposta.kit_potencia_kw,
      kit_fabricante: proposta.kit_fabricante,
      custo: proposta.custo,
      margem: proposta.margem,
      preco_venda: proposta.preco_venda,
      desconto_percentual: proposta.desconto_percentual,
      valor_desconto: proposta.valor_desconto,
      valor_bruto: proposta.valor_bruto,
      validade_dias: proposta.validade_dias,
      data_validade: proposta.data_validade,
      condicoes_pagamento: proposta.condicoes_pagamento,
      observacoes: proposta.observacoes,
      data_aceite: proposta.data_aceite,
      aceito_por_nome: proposta.aceito_por_nome,
      created: proposta.created,
      kit_descricao: (proposta as any)?.kit_descricao || proposta.kit?.descricao,
      kit_string_box: (proposta as any)?.kit_string_box || proposta.kit?.string_box || undefined,
      kit_marca_painel:
        (proposta as any)?.kit_marca_painel || proposta.kit?.marca_painel || undefined,
      kit_marca_inversor:
        (proposta as any)?.kit_marca_inversor || proposta.kit?.marca_inversor || undefined,
      kit_potencia_painel_w:
        (proposta as any)?.kit_potencia_painel_w || proposta.kit?.potencia_painel_w || undefined,
      kit_potencia_inversor_kw:
        (proposta as any)?.kit_potencia_inversor_kw ||
        proposta.kit?.potencia_inversor_kw ||
        undefined,
      kit_tipo_estrutura:
        (proposta as any)?.kit_tipo_estrutura || proposta.kit?.tipo_estrutura || undefined,
      cliente: {
        nome: proposta.lead?.nome || 'Cliente',
        email: proposta.lead?.email,
        telefone: proposta.lead?.telefone,
        cidade: proposta.lead?.cidade,
        estado: proposta.lead?.estado,
        endereco: proposta.lead?.endereco,
        consumo_mensal_kwh: proposta.lead?.consumo_mensal_kwh,
      },
      vendedor: {
        name: proposta.vendedor?.name || 'Equipe Ecosolar Energy',
        email: proposta.vendedor?.email,
      },
      fotos_obra: proposta.fotos_obra,
      fotos_selecionadas: proposta.fotos_selecionadas,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex flex-col items-center justify-center p-4 text-white">
        <div className="w-20 h-20 rounded-2xl bg-white p-2 shadow-2xl mb-4 border border-amber-400/40 animate-pulse flex items-center justify-center">
          <img
            src={officialLogoPng}
            alt="Ecosolar Energy"
            className="w-full h-full object-contain"
          />
        </div>
        <Loader2 className="w-7 h-7 animate-spin text-amber-400 mb-2" />
        <p className="text-base font-bold text-slate-100">
          Carregando Proposta Comercial Oficial...
        </p>
        <p className="text-xs text-amber-300 mt-1 font-semibold">
          ECOSOLAR ENERGY • Soluções em Engenharia Solar
        </p>
      </div>
    )
  }

  if (errorMsg || !proposta) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Proposta Indisponível</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {errorMsg || 'Esta proposta comercial não foi localizada ou o link expirou.'}
          </p>
          <div className="pt-2">
            <p className="text-xs text-slate-400 mb-4">
              Caso você seja o cliente, por favor solicite um novo link ao seu consultor solar
              Ecosolar Energy.
            </p>
            <Link to="/">
              <Button variant="outline" size="sm" className="text-xs">
                Ir para a Página Inicial
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Decompor o kit em itens reais cadastrados no sistema (usado na tela de proposta expirada)
  const specs = parseKitDetailedItems({
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

  const consultorNome = proposta.vendedor?.name || 'Equipe Ecosolar Energy'
  const consultorEmail = proposta.vendedor?.email || CONTATO_ECOSOLAR.email

  // Checar validade
  const dataValidade = new Date(proposta.data_validade)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const isExpirada =
    (proposta.is_expirada === true || dataValidade < hoje) && proposta.status !== 'Aceita'

  const proposalNumber = (proposta.id || 'ECO').slice(-6).toUpperCase()
  // Contato do consultor/empresa para atendimento comercial na proposta (especialmente na tela expirada)
  const consultorTelefoneExibicao = CONTATO_ECOSOLAR.telefoneExibicao
  const consultorWhatsappLink = `https://wa.me/${CONTATO_ECOSOLAR.whatsappDDI}?text=${encodeURIComponent(
    `Olá! Estou no link da proposta comercial Nº ${proposalNumber} da Ecosolar Energy e gostaria de solicitar uma renovação do prazo de validade das condições.`,
  )}`

  // Se o formato escolhido for "story" (padrão) e a proposta não estiver expirada
  const isStoryFormat = (visualizacaoFormato || proposta.formato || 'classica') === 'story'

  if (!isExpirada && isStoryFormat) {
    return (
      <PropostaStoryViewer
        proposta={proposta}
        onAccept={executeAcceptProposal}
        accepting={accepting}
        acceptedSuccess={acceptedSuccess}
        onDownloadPDF={handleDownloadPDF}
        onSwitchToClassic={() => setVisualizacaoFormato('classica')}
        isInternalViewer={isInternalViewer}
        onStoryCompleted={() => handleNotifyCompleteView('story')}
      />
    )
  }

  // 3) Se a proposta estiver expirada (e o cliente não tiver aceitado anteriormente):
  // Exibir a tela elegante de Proposta Expirada da marca Ecosolar Energy (Navy/Amarelo)
  if (isExpirada) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#060F1E] via-[#0A192F] to-[#163868] text-white flex flex-col justify-between p-4 sm:p-8">
        {/* Header institucional */}
        <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-white/15">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl p-1.5 shadow-lg flex items-center justify-center">
              <img
                src={officialLogoPng}
                alt="Ecosolar Energy"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-white block">
                ECO<span className="text-[#F5C518] border-b border-[#F5C518]">SOLAR</span> ENERGY
              </span>
              <span className="text-[11px] text-slate-300 font-semibold uppercase">
                A ENERGIA DO FUTURO, HOJE!
              </span>
            </div>
          </div>
          <Badge className="bg-amber-400 text-slate-950 font-black text-xs uppercase px-2.5 py-1">
            Proposta Nº {proposalNumber}
          </Badge>
        </header>

        {/* Card Central de Proposta Expirada */}
        <main className="max-w-xl w-full mx-auto my-12 bg-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-10 border-2 border-amber-400/50 shadow-2xl text-center space-y-6">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-amber-400/15 border-2 border-amber-400 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <Badge className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-bold uppercase tracking-wider px-3 py-1">
              Prazo de Validade Expirado
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Esta Proposta Comercial Expirou
            </h1>
            <p className="text-sm text-slate-200 leading-relaxed max-w-md mx-auto pt-1">
              O link exclusivo da proposta preparada para{' '}
              <strong className="text-white">{proposta.lead?.nome || 'o cliente'}</strong> era
              válido por <strong>{proposta.validade_dias || 15} dias</strong> a partir da emissão e
              expirou em{' '}
              <strong className="text-amber-300">{formatDateBR(proposta.data_validade)}</strong>.
            </p>
          </div>

          {/* Destaque das condições expiradas */}
          <div className="bg-[#0A192F]/80 rounded-2xl p-4 sm:p-5 border border-white/15 text-left space-y-2.5 text-xs text-slate-300">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Kit Orçado</span>
              <span className="font-bold text-white text-right truncate max-w-[200px]">
                {proposta.kit_nome}
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-slate-400 uppercase text-[10px] font-bold">
                Potência do Sistema
              </span>
              <span className="font-mono font-bold text-amber-400">
                {specs.potenciaTotalFormatada}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 uppercase text-[10px] font-bold">
                Consultor Ecosolar
              </span>
              <span className="font-semibold text-white">{consultorNome}</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Devido à flutuação de preços dos módulos solares e inversores homologados, os valores e
            prazos precisam ser revalidados com a nossa engenharia. Fale agora com seu consultor
            para solicitar uma reativação com as melhores condições!
          </p>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={consultorWhatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 font-black text-xs sm:text-sm gap-2 h-11 px-5 shadow-lg border border-[#25D366]"
              >
                <Phone className="w-4 h-4 text-slate-950" />
                <span>Falar pelo WhatsApp ({consultorTelefoneExibicao})</span>
              </Button>
            </a>

            <a
              href={`mailto:${consultorEmail}?subject=Renova%C3%A7%C3%A3o%20da%20Proposta%20Comercial%20N%C2%BA%20${proposalNumber}&body=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20a%20renova%C3%A7%C3%A3o%20da%20minha%20proposta%20comercial%20solar.`}
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                variant="outline"
                className="w-full text-xs sm:text-sm font-bold gap-2 h-11 px-5 bg-white/10 hover:bg-white/20 text-white border-white/25"
              >
                <Mail className="w-4 h-4" />
                <span>Enviar E-mail ao Consultor</span>
              </Button>
            </a>

            {isInternalViewer && proposta.lead?.id && (
              <Link to={`/leads/${proposta.lead.id}`} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full bg-white/10 hover:bg-white/20 text-white border-white/25 text-xs sm:text-sm font-bold gap-2 h-11 px-5"
                >
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                  <span>Ver Ficha no CRM</span>
                </Button>
              </Link>
            )}
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ECOSOLAR ENERGY • Atendimento comercial e homologação autorizada</span>
          </div>
        </main>

        {/* Footer */}
        <footer className="max-w-4xl w-full mx-auto text-center text-xs text-slate-400 pt-6 border-t border-white/15 space-y-1">
          <p className="font-bold text-slate-200">ECOSOLAR ENERGY — A energia do futuro, hoje!</p>
          <p className="text-[11px]">
            Soluções em Engenharia Solar e Homologação Chave na Mão • Suporte: {consultorEmail}
          </p>
        </footer>
      </div>
    )
  }

  // ===== FORMATO CLÁSSICO v2 — as 6 páginas novas (mesma fonte de dados do PDF) =====
  const dadosProposta = proposalDataDePublica(proposta)
  const dadosV2 = montarDadosV2(dadosProposta)
  const fotosV2 = resolverFotosTela(proposta)
  const linkPublicoProposta =
    typeof window !== 'undefined'
      ? `${window.location.origin}/proposta/${proposta.token_publico}`
      : `/proposta/${proposta.token_publico}`

  return (
    <PropostaViewerErrorBoundary
      alternativeLabel="Ver Formato Story"
      onAlternative={() => setVisualizacaoFormato('story')}
    >
      {/* Fontes do documento + CSS do modelo v2 (mesmo usado pela versão de impressão/PDF) */}
      <link rel="stylesheet" href={FONTS_PROPOSTA_LINK} />
      <style>{PROPOSTA_V2_CSS}</style>
      <style>{`
        /* Impressão: sai apenas o documento (folhas A4), sem as barras do leitor */
        @media print {
          .proposta-doc-topbar,
          .proposta-doc-acoes,
          .proposta-doc-aviso,
          .proposta-doc-avisos {
            display: none !important;
          }
          .proposta-doc-viewer {
            background: #fff !important;
            min-height: 0 !important;
            padding: 0 !important;
          }
          main[id='detalhes-proposta'] {
            padding: 0 !important;
          }
          .prop-v2 {
            padding: 0 !important;
            background: #fff !important;
          }
          .prop-v2 .pv-page {
            box-shadow: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Leitor estilo PDF: folha A4 centralizada sobre fundo cinza, com barra de ações */}
      <div className="proposta-doc-viewer min-h-screen bg-slate-200/70 pb-16">
        <CabecalhoDoc
          numeroProposta={proposalNumber}
          emissao={formatDateBR(proposta.created)}
          onImprimir={() => window.print()}
        />

        {/* Ações do consultor (fora da folha, não imprimem) */}
        <div className="proposta-doc-acoes max-w-[900px] mx-auto px-4 pt-3 flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisualizacaoFormato('story')}
            className="text-xs font-bold gap-1.5 h-8.5 bg-white/80 hover:bg-white text-[#0A192F] border-slate-300"
            title="Visualizar no formato Story interativo"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Ver Formato Story</span>
            <span className="sm:hidden">Story</span>
          </Button>
          {isInternalViewer && proposta.lead?.id && (
            <Link to={`/leads/${proposta.lead.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold gap-1.5 h-8.5 bg-white/80 hover:bg-white text-[#0A192F] border-slate-300"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ver Ficha no CRM</span>
                <span className="sm:hidden">CRM</span>
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="text-xs font-bold gap-1.5 h-8.5 bg-[#0A192F] hover:bg-[#163868] text-amber-300 border-[#0A192F]"
          >
            <FileDown className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Baixar em PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>

        {/* Banner para usuário autenticado do CRM ou modo preview */}
        {isInternalViewer && (
          <div className="proposta-doc-aviso max-w-[900px] mx-auto px-4 pt-3">
            <div className="bg-slate-950 text-white text-xs px-4 py-2 rounded-lg border border-slate-800 flex items-center justify-between gap-3">
              <span className="text-slate-300 flex items-center gap-1.5 min-w-0">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">
                  <strong>Modo Pré-visualização da Equipe:</strong> não contabiliza visualização do
                  cliente.
                </span>
              </span>
              {proposta.lead?.id && (
                <Link
                  to={`/leads/${proposta.lead.id}`}
                  className="font-bold text-amber-400 hover:underline shrink-0"
                >
                  Voltar ao Lead &rarr;
                </Link>
              )}
            </div>
          </div>
        )}

        <main id="detalhes-proposta" className="pt-4">
          {/* Avisos acima do documento */}
          <div className="proposta-doc-avisos max-w-[900px] mx-auto px-4 space-y-3">
            {acceptedSuccess && (
              <div className="p-4 rounded-xl bg-emerald-600 text-white shadow-lg flex items-start sm:items-center gap-3 border border-emerald-500">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs sm:text-sm font-bold leading-relaxed">
                  ✓ Proposta Formalmente Aceita — aceite digital registrado em{' '}
                  {formatDateTimeBR(proposta.data_aceite || new Date().toISOString())} por{' '}
                  {proposta.aceito_por_nome || proposta.lead?.nome}.
                </p>
              </div>
            )}
            {isExpirada && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-xs leading-relaxed">
                  <strong>Atenção:</strong> O prazo original de validade desta proposta expirou em{' '}
                  {formatDateBR(proposta.data_validade)}. Entre em contato com seu consultor solar
                  para confirmar a validade dos valores e condições comerciais.
                </p>
              </div>
            )}
          </div>

          {/* Folha(s) do documento */}
          <div className="prop-v2 pt-2">
            <PaginaCapa d={dadosV2} fotos={fotosV2} />
            <PaginaApresentacao d={dadosV2} />
            <PaginaSistema d={dadosV2} />
            <PaginaInvestimento d={dadosV2} kitNome={proposta.kit_nome || ''} />
            <PaginaComoVaiSer d={dadosV2} />
            <PaginaFinal d={dadosV2} fotos={fotosV2} linkPublico={linkPublicoProposta}>
              {/* Card de Aceite Online com Assinatura Digital (mantido do formato clássico) */}
              <Card
                id="secao-assinatura-classica"
                className={`border-2 shadow-lg transition-all text-left ${
                  acceptedSuccess
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-[#0A192F] bg-gradient-to-b from-slate-50 to-white'
                }`}
              >
                <CardHeader className="pb-3 border-b border-slate-200 bg-[#0A192F] text-white rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-amber-400" />
                      <CardTitle className="text-base font-bold text-white">
                        {acceptedSuccess
                          ? 'Proposta Aceita Formalmente'
                          : 'Aceite Digital Online da Proposta'}
                      </CardTitle>
                    </div>
                    <Badge
                      className={
                        acceptedSuccess
                          ? 'bg-emerald-500 text-white font-bold text-xs'
                          : 'bg-amber-400 text-slate-950 font-black text-xs uppercase'
                      }
                    >
                      {acceptedSuccess ? 'Concluído' : 'Aguardando Aceite'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {acceptedSuccess ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-emerald-800 text-sm font-bold">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>
                          Aceita digitalmente por{' '}
                          <strong className="text-slate-900">
                            {proposta.aceito_por_nome || proposta.lead?.nome}
                          </strong>{' '}
                          em {formatDateTimeBR(proposta.data_aceite || new Date().toISOString())}.
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        O registro eletrônico do seu aceite foi gravado no sistema com IP e
                        data/hora. Você pode baixar o documento oficial assinado em PDF a qualquer
                        momento pelo botão abaixo.
                      </p>
                      <div className="pt-2">
                        <Button
                          onClick={handleDownloadPDF}
                          className="bg-[#0A192F] hover:bg-[#163868] text-white text-xs font-bold gap-2 shadow-sm"
                        >
                          <FileDown className="w-4 h-4 text-amber-400" />
                          <span>Baixar Documento Oficial em PDF</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleAcceptProposal} className="space-y-4">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Ao clicar em <strong>&quot;Aceitar Proposta Agora&quot;</strong>, você
                        concorda com o valor de investimento de{' '}
                        <strong>{formatBRL(proposta.preco_venda)}</strong> e o escopo técnico com os
                        itens discriminados. O projeto avançará automaticamente para o início dos
                        trâmites de engenharia e homologação.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="nomeAceite" className="text-xs font-bold text-slate-800">
                            Nome Completo do Cliente Contratante (para assinatura eletrônica)
                          </Label>
                          <Input
                            id="nomeAceite"
                            value={nomeConfirmacao}
                            onChange={(e) => setNomeConfirmacao(e.target.value)}
                            placeholder="Ex: João da Silva"
                            required
                            className="h-10 text-xs bg-white border-slate-300 font-semibold"
                          />
                        </div>

                        <div className="flex items-end">
                          <Button
                            type="submit"
                            disabled={accepting || isExpirada}
                            className="w-full h-10 bg-[#0A192F] hover:bg-[#163868] text-amber-400 hover:text-amber-300 font-black text-sm shadow-md gap-2 border border-amber-400/50"
                          >
                            {accepting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                <span>Registrando Assinatura Eletrônica...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                                <span>Aceitar Proposta Agora</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                        <span>
                          Validade das condições garantida até:{' '}
                          {formatDateBR(proposta.data_validade)}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500 font-medium">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          Ambiente seguro e auditável com registro de IP
                        </span>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </PaginaFinal>
          </div>
        </main>
      </div>
    </PropostaViewerErrorBoundary>
  )
}
