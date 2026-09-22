import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
  FileDown,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Loader2,
  Building2,
  ArrowRight,
  TrendingUp,
  Award,
  ChevronRight,
  Home,
  Check,
  Camera,
  Layers,
  Percent,
} from 'lucide-react'
import officialLogoPng from '@/assets/a-613c6.png'
import { ProposalsService } from '@/services/proposals'
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
import { CONTATO_ECOSOLAR } from '@/constants/empresa'
import { openProposalPDFPrint } from '@/lib/proposalPdf'
import { parseKitDetailedItems } from '@/lib/kitItemsParser'
import { InvestmentComparison } from '@/components/InvestmentComparison'
import { AnimatedInvestmentRace } from '@/components/AnimatedInvestmentRace'
import {
  INSTITUTIONAL_INSTALLATION_PHOTOS,
  type InstitutionalInstallationPhoto,
} from '@/data/socialProofPhotos'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

  // Acceptance state
  const [nomeConfirmacao, setNomeConfirmacao] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [acceptedSuccess, setAcceptedSuccess] = useState(false)
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<{
    id?: string
    url: string
    titulo: string
    legenda: string
    descricao: string
    tag: string
    local: string
  } | null>(null)

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
      const data = await ProposalsService.getPublicProposta(t, { preview: isInternalViewer })
      setProposta(data)
      if (data.lead?.nome) {
        setNomeConfirmacao(data.lead.nome)
      }
      if (data.status === 'Aceita') {
        setAcceptedSuccess(true)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Proposta não encontrada ou expirada.'
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptProposal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !proposta) return

    try {
      setAccepting(true)
      const res = await ProposalsService.acceptPublicProposta(token, nomeConfirmacao.trim())
      setProposta((prev) =>
        prev
          ? {
              ...prev,
              status: 'Aceita',
              data_aceite: res.data_aceite || new Date().toISOString(),
              aceito_por_nome: nomeConfirmacao.trim() || prev.lead?.nome,
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
    } finally {
      setAccepting(false)
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

  // Decompor o kit em itens reais cadastrados no sistema
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
  // Cálculos solares
  const consumoKwh = proposta.lead?.consumo_mensal_kwh || 400
  const geracaoEstimadaKwh =
    specs.geracaoMensalEstimadaKwh ||
    (proposta.kit_potencia_kw
      ? calcularGeracaoMensalKwh(proposta.kit_potencia_kw)
      : Math.round(consumoKwh))
  const economiaMensal = calcularEconomiaMensal(consumoKwh)
  const economiaAnual = economiaMensal * 12
  const economia25Anos = economiaAnual * 25

  const localCliente =
    [proposta.lead?.cidade, proposta.lead?.estado].filter(Boolean).join(' - ') || 'Brasil'
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

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-900 pb-20">
      {/* 1. Top Navigation Bar — Acesso rápido e ações */}
      <header className="sticky top-0 z-30 bg-[#0A192F] text-white border-b-2 border-amber-400 px-4 sm:px-8 py-3.5 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-xl p-1 shadow-sm border border-slate-200/90 flex items-center justify-center">
              <img src={officialLogoPng} alt="Ecosolar Energy" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base text-white tracking-tight">
                  ECO<span className="text-[#F5C518] border-b border-[#F5C518]">SOLAR</span> ENERGY
                </span>
                <span className="hidden sm:inline-block text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded">
                  Engenharia Solar
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                Proposta Comercial Nº <strong className="text-white">{proposalNumber}</strong> •
                Emissão: {formatDateBR(proposta.created)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isInternalViewer && proposta.lead?.id && (
              <Link to={`/leads/${proposta.lead.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold gap-1.5 h-8.5 bg-white/10 hover:bg-white/20 text-white border-white/20"
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
              className="text-xs font-bold gap-1.5 h-8.5 bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-400 shadow-sm"
            >
              <FileDown className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Baixar em PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Top Banner para usuário autenticado do CRM ou modo preview */}
      {isInternalViewer && (
        <div className="bg-slate-950 text-white text-xs px-4 py-2 border-b border-slate-800">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                <strong>Modo Pré-visualização da Equipe:</strong> este acesso não é contabilizado no
                rastreamento de visualizações do cliente.
              </span>
            </span>
            {proposta.lead?.id && (
              <Link
                to={`/leads/${proposta.lead.id}`}
                className="font-bold text-amber-400 hover:underline flex items-center gap-1"
              >
                Voltar ao Lead &rarr;
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CAPA DE PÁGINA INTEIRA (PRIMEIRO SCREEN DA PROPOSTA)     */}
      {/* ======================================================== */}
      <section
        aria-label="Capa Comercial da Proposta"
        className="relative min-h-[92vh] sm:min-h-[88vh] bg-gradient-to-br from-[#060F1E] via-[#0A192F] to-[#163868] text-white flex flex-col justify-between overflow-hidden border-b-4 border-amber-400 px-4 sm:px-8 lg:px-12 py-8 sm:py-12"
      >
        {/* Padrão geométrico de fundo evocando células solares */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(250, 204, 21, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(250, 204, 21, 0.4) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Círculos e gradientes luminosos de energia solar */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-12 -left-24 w-80 h-80 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

        {/* Efeito sutil de painel fotovoltaico inclinado no canto */}
        <div className="hidden lg:grid absolute right-12 top-24 w-44 h-44 grid-cols-3 gap-1.5 opacity-20 rotate-12 pointer-events-none">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="border border-amber-400 bg-amber-400/10 rounded-xs" />
          ))}
        </div>

        {/* Header da Capa */}
        <div className="relative z-10 max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/15">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl p-2 shadow-2xl border border-slate-200/90 flex items-center justify-center shrink-0">
              <img
                src={officialLogoPng}
                alt="Ecosolar Energy"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-2xl sm:text-3xl text-white tracking-tight">
                  ECO<span className="text-[#F5C518] border-b-2 border-[#F5C518]">SOLAR</span>{' '}
                  ENERGY
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 font-semibold tracking-wider uppercase mt-1">
                A ENERGIA DO FUTURO, HOJE!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:text-right">
            <Badge className="bg-amber-400 text-slate-950 hover:bg-amber-400 font-black text-xs uppercase px-3 py-1 shadow-md">
              Proposta Nº {proposalNumber}
            </Badge>
            {proposta.status === 'Aceita' && (
              <Badge className="bg-emerald-500 text-white font-bold text-xs uppercase px-2.5 py-1">
                ✓ Aceita
              </Badge>
            )}
          </div>
        </div>

        {/* Centro da Capa */}
        <div className="relative z-10 max-w-6xl w-full mx-auto py-10 sm:py-16 my-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Engenharia Fotovoltaica & Eficiência Energética</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl">
              Proposta Comercial de <span className="text-amber-400">Energia Solar</span>
            </h1>
            <div className="w-20 h-1.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" />
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl font-medium pt-1">
              Dimensionamento executivo sob medida, viabilidade técnica de homologação e retorno
              financeiro acelerado para geração própria de energia.
            </p>
          </div>

          {/* Card em destaque com o nome do cliente */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 sm:p-7 border border-amber-400/50 border-l-8 border-l-amber-400 max-w-3xl shadow-2xl">
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-sky-200 block">
              Proposta Preparada Especialmente Para
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mt-1.5 break-words">
              {proposta.lead?.nome || 'Cliente'}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-slate-200 mt-3 font-semibold">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Cidade: <strong>{localCliente}</strong>
                </span>
              </span>
              {proposta.lead?.consumo_mensal_kwh ? (
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Consumo Médio: <strong>{proposta.lead.consumo_mensal_kwh} kWh/mês</strong>
                  </span>
                </span>
              ) : null}
            </div>
          </div>

          {/* Grid de Metadados da Capa */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl pt-2">
            <div className="bg-[#0A192F]/80 backdrop-blur-sm border border-white/15 rounded-xl p-3.5">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Consultor Responsável
              </span>
              <p className="text-sm font-extrabold text-white mt-1 truncate">{consultorNome}</p>
              <p className="text-[11px] text-slate-300 truncate">{consultorEmail}</p>
            </div>

            <div className="bg-[#0A192F]/80 backdrop-blur-sm border border-white/15 rounded-xl p-3.5">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Data de Emissão
              </span>
              <p className="text-sm font-extrabold text-white mt-1">
                {formatDateBR(proposta.created)}
              </p>
              <p className="text-[11px] text-slate-300">Documento Oficial</p>
            </div>

            <div className="bg-[#0A192F]/80 backdrop-blur-sm border border-amber-400/40 rounded-xl p-3.5">
              <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold block">
                Data de Validade (15 dias)
              </span>
              <p className="text-sm font-black text-amber-400 mt-1">
                {formatDateBR(proposta.data_validade)}
              </p>
              <p className="text-[11px] text-slate-300">Condições garantidas</p>
            </div>
          </div>

          {/* Botões de Ação na Capa */}
          <div className="flex flex-wrap items-center gap-3 pt-4">
            <a href="#detalhes-proposta">
              <Button
                size="lg"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm gap-2 h-11 px-5 shadow-lg border border-amber-400"
              >
                <span>Ver Detalhes do Projeto & Itens</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </Button>
            </a>

            <Button
              size="lg"
              variant="outline"
              onClick={handleDownloadPDF}
              className="bg-white/10 hover:bg-white/20 text-white border-white/25 text-xs sm:text-sm font-bold gap-2 h-11 px-5"
            >
              <FileDown className="w-4 h-4 text-amber-400" />
              <span>Baixar Proposta Oficial em PDF</span>
            </Button>
          </div>
        </div>

        {/* Rodapé da Capa com dados de contato da Ecosolar Energy */}
        <div className="relative z-10 max-w-6xl w-full mx-auto pt-6 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
          <div>
            <strong className="text-white block font-bold">
              ECOSOLAR ENERGY SOLUÇÕES EM ENERGIA SOLAR
            </strong>
            <span className="text-[11px] text-slate-400">
              Projetos Chave na Mão • Homologação de Engenharia • Instalação Homologada conforme
              NR10/NR35
            </span>
          </div>

          <div className="sm:text-right text-[11px] space-y-0.5">
            <div>
              Contato Comercial:{' '}
              <strong className="text-white font-semibold">{consultorEmail}</strong>
              {' • WhatsApp: '}
              <strong className="text-white font-semibold">{consultorTelefoneExibicao}</strong>
            </div>
            <div>
              Atendimento Especializado •{' '}
              <strong className="text-amber-300">ecosolarenergy.com.br</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <main id="detalhes-proposta" className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Banner de Aceite Concluído */}
        {acceptedSuccess && (
          <div className="p-5 rounded-2xl bg-emerald-600 text-white shadow-lg flex items-start sm:items-center gap-4 border border-emerald-500">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-lg sm:text-xl">
                ✓ Proposta Formalmente Aceita com Sucesso!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100 mt-0.5 leading-relaxed">
                Parabéns, {proposta.aceito_por_nome || proposta.lead?.nome}! Seu aceite digital foi
                registrado eletronicamente no sistema. Nossa equipe técnica de engenharia já recebeu
                a notificação e está iniciando a elaboração da ART e projeto de homologação na
                concessionária.
              </p>
            </div>
          </div>
        )}

        {isExpirada && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-xs leading-relaxed">
              <strong>Atenção:</strong> O prazo original de validade desta proposta expirou em{' '}
              {formatDateBR(proposta.data_validade)}. Entre em contato com seu consultor solar para
              confirmar a validade dos valores e condições comerciais.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. INTRODUÇÃO & COMPOSIÇÃO DO KIT SOLAR (O KIT VEM PRIMEIRO QUE O PREÇO) */}
        {/* ========================================================================= */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0A192F] via-[#0F284E] to-[#163868] text-white p-6 sm:p-8 shadow-xl relative overflow-hidden border-t-4 border-amber-400">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 rounded-full bg-amber-400/10 pointer-events-none blur-3xl"></div>

          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-400 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase px-3 py-1">
                Proposta Nº {proposalNumber}
              </Badge>
              <Badge
                variant="outline"
                className="text-white border-white/30 text-xs font-semibold bg-white/10"
              >
                <Clock className="w-3.5 h-3.5 mr-1 text-amber-300" />
                Validade: {formatDateBR(proposta.data_validade)} (15 dias)
              </Badge>
              {proposta.status === 'Aceita' && (
                <Badge className="bg-emerald-500 text-white font-bold text-xs uppercase px-2.5 py-0.5">
                  ✓ Aceita
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              {proposta.kit_nome}
            </h1>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-3xl">
              Sistema Solar Fotovoltaico On-Grid Chave na Mão projetado sob medida para suprir o
              consumo médio de <strong>{consumoKwh} kWh/mês</strong> do cliente{' '}
              <strong>{proposta.lead?.nome}</strong>, dimensionado com módulos de alta eficiência,
              inversor com certificação INMETRO e proteção completa de engenharia.
            </p>

            {/* Badges de Destaque Técnico */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="bg-white/15 px-3 py-1 rounded-md font-semibold flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Potência Total: <strong>{specs.potenciaTotalFormatada}</strong>
              </span>
              <span className="bg-white/15 px-3 py-1 rounded-md font-semibold">
                Módulos: <strong>{specs.quantidadeModulosTotal || '-'} unidades</strong>
              </span>
              <span className="bg-white/15 px-3 py-1 rounded-md font-semibold">
                Fabricantes: <strong>{specs.fabricantesPrincipais}</strong>
              </span>
              <span className="bg-white/15 px-3 py-1 rounded-md font-semibold">
                Geração Média: <strong>~{geracaoEstimadaKwh} kWh/mês</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 2. COMPOSIÇÃO DETALHADA DO KIT SOLAR ITEM A ITEM COM QUANTIDADES REAIS */}
        <Card className="border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <CardHeader className="bg-[#0A192F] text-white p-5 border-b-2 border-amber-400">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <CardTitle className="text-base sm:text-lg font-black tracking-tight text-white">
                    1. Composição do Kit Solar — Detalhamento Item a Item
                  </CardTitle>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Lista detalhada dos componentes homologados e serviços incluídos com as
                  quantidades reais registradas no sistema
                </p>
              </div>

              <Badge className="self-start sm:self-center bg-amber-400 text-slate-950 font-black text-xs uppercase px-2.5 py-1">
                Potência Total: {specs.potenciaTotalFormatada}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Tabela de Itens com Quantidades Reais */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="p-3 text-center w-16">Qtd.</th>
                    <th className="p-3">Componente / Item</th>
                    <th className="p-3">Fabricante / Modelo Cadastrado</th>
                    <th className="p-3 text-center">Potência</th>
                    <th className="p-3">Especificações Técnicas</th>
                    <th className="p-3 text-right w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {specs.itens.map((it, idx) => (
                    <tr key={`item-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-center font-black text-sm text-[#0A192F]">
                        {it.quantidade}
                        {it.unidade !== 'un' ? ` ${it.unidade}` : 'x'}
                      </td>
                      <td className="p-3 font-bold text-slate-900 text-xs sm:text-sm">{it.nome}</td>
                      <td className="p-3 font-semibold text-slate-800">{it.fabricanteModelo}</td>
                      <td className="p-3 text-center">
                        {it.potenciaUnit ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {it.potenciaUnit}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 text-xs leading-relaxed">
                        {it.especificacao || '-'}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Incluso
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Faixa Resumo Técnico */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-400">
                  Potência Total
                </p>
                <p className="text-base font-black text-[#0A192F] mt-0.5">
                  {specs.potenciaTotalFormatada}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-400">
                  Total de Módulos
                </p>
                <p className="text-base font-black text-[#0A192F] mt-0.5">
                  {specs.quantidadeModulosTotal ? `${specs.quantidadeModulosTotal} painéis` : '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-400">
                  Geração Prevista
                </p>
                <p className="text-base font-black text-[#0A192F] mt-0.5">
                  ~{geracaoEstimadaKwh} kWh/mês
                </p>
                <span className="text-[9px] text-slate-400 block">
                  Irradiação {IRRADIACAO_MEDIA_DIARIA_HORAS.toString().replace('.', ',')}h • Perdas{' '}
                  {Math.round((1 - FATOR_PERDAS_SISTEMA) * 100)}%
                </span>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Área Estimada</p>
                <p className="text-base font-black text-[#0A192F] mt-0.5">
                  {specs.areaEstimadaM2 ? `~${specs.areaEstimadaM2} m²` : 'Sob Demanda'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. DIMENSIONAMENTO TÉCNICO & ESTIMATIVA DE GERAÇÃO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200/90 bg-white shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold text-slate-500">
                  Geração Média Estimada
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono-numbers mt-2">
                ~{geracaoEstimadaKwh}{' '}
                <span className="text-xs font-normal text-slate-500">kWh/mês</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Irradiação de {IRRADIACAO_MEDIA_DIARIA_HORAS.toString().replace('.', ',')} h/dia •
                perdas de {Math.round((1 - FATOR_PERDAS_SISTEMA) * 100)}% (fator{' '}
                {FATOR_PERDAS_SISTEMA.toFixed(2).replace('.', ',')})
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 bg-white shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold text-slate-500">
                  Economia Mensal Est.
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-700 font-mono-numbers mt-2">
                {formatBRL(economiaMensal)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Alívio imediato no orçamento mensal</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 bg-white shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold text-slate-500">
                  Economia em 25 Anos
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono-numbers mt-2">
                {formatBRL(economia25Anos)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Garantia linear de geração dos módulos
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 bg-white shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold text-slate-500">
                  Valorização Imobiliária
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Home className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-indigo-950 font-mono-numbers mt-2">
                +6% a +8%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Valorização patrimonial instantânea</p>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* 4. GRÁFICO ANIMADO TIPO "COMPETIÇÃO / BAR CHART RACE" NA PÁGINA DO LINK */}
        {/* ========================================================================= */}
        <AnimatedInvestmentRace
          valorInvestido={proposta.preco_venda || 0}
          economiaMensal={economiaMensal}
          anos={30}
          titulo="Corrida do Rendimento em 30 Anos — Quem vence essa disputa?"
          subtitulo="Veja em tempo real como o investimento em Energia Solar ultrapassa com folga a Poupança e o CDB Líquido ano a ano."
        />

        {/* ========================================================================= */}
        {/* 5. VALOR DO INVESTIMENTO CHAVE NA MÃO & CONDIÇÕES COMERCIAIS (APÓS O KIT) */}
        {/* ========================================================================= */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0A192F] via-[#102B54] to-[#163868] text-white p-6 sm:p-8 shadow-xl border-2 border-amber-400 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center gap-1.5 bg-amber-400 text-slate-950 font-black text-xs uppercase px-2.5 py-0.5 rounded-md">
              <Award className="w-3.5 h-3.5" />
              Proposta Comercial Chave na Mão
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Investimento Total Chave na Mão
            </h2>
            <p className="text-xs font-semibold text-amber-300">
              (tudo incluso: equipamentos, projeto, homologação e instalação)
            </p>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              Solução completa chave na mão: Equipamentos fotovoltaicos homologados, elaboração de
              projeto executivo com emissão de ART assinada por engenheiro responsável, tramitação
              junto à concessionária de energia e instalação especializada NR10/NR35.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-amber-400/60 text-right shrink-0 md:min-w-[280px] shadow-lg">
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-amber-300 block">
              Valor Total do Projeto
            </span>
            {proposta.desconto_percentual && proposta.desconto_percentual > 0 ? (
              <div className="my-1.5 space-y-0.5">
                <div className="flex items-center justify-end gap-2">
                  <span className="line-through text-slate-300/80 font-mono-numbers text-sm sm:text-base">
                    {formatBRL(proposta.valor_bruto || proposta.preco_venda)}
                  </span>
                  <span className="bg-emerald-500 text-white font-black text-[10px] uppercase px-2 py-0.5 rounded">
                    -{proposta.desconto_percentual}% OFF
                  </span>
                </div>
                <span className="text-3xl sm:text-4xl font-black text-amber-300 font-mono-numbers block tracking-tight">
                  {formatBRL(proposta.preco_venda)}
                </span>
                <span className="text-[11px] text-emerald-300 font-semibold block">
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
              <span className="text-3xl sm:text-4xl font-black text-amber-300 font-mono-numbers block tracking-tight my-1.5">
                {formatBRL(proposta.preco_venda)}
              </span>
            )}
            <span className="text-xs text-slate-200 block font-medium">
              Sem surpresas • Tudo incluso
            </span>
            <div className="mt-3 pt-3 border-t border-white/20 text-[11px] text-slate-300 flex items-center justify-between">
              <span>Economia no 1º Ano:</span>
              <strong className="text-white font-mono-numbers">{formatBRL(economiaAnual)}</strong>
            </div>
          </div>
        </div>

        {/* Dados do Cliente & Consultor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200/90 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Dados do Cliente Contratante</span>
                <span className="text-slate-400">👤</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Nome Completo</p>
                  <p className="font-bold text-slate-900">{proposta.lead?.nome}</p>
                </div>
              </div>

              {proposta.lead?.email && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">E-mail</p>
                    <p className="font-medium text-slate-800">{proposta.lead?.email}</p>
                  </div>
                </div>
              )}

              {proposta.lead?.telefone && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Telefone / WhatsApp</p>
                    <p className="font-medium text-slate-800">{proposta.lead?.telefone}</p>
                  </div>
                </div>
              )}

              {(proposta.lead?.cidade || proposta.lead?.estado || proposta.lead?.endereco) && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Local da Instalação</p>
                    <p className="font-medium text-slate-800">
                      {[proposta.lead?.endereco, proposta.lead?.cidade, proposta.lead?.estado]
                        .filter(Boolean)
                        .join(' - ')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Consultor & Engenharia Responsável</span>
                <span className="text-slate-400">⚡</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0A192F] text-amber-400 flex items-center justify-center shrink-0 font-bold">
                  ☀
                </div>
                <div>
                  <p className="text-xs text-slate-400">Especialista Solar</p>
                  <p className="font-bold text-slate-900">
                    {proposta.vendedor?.name || 'Equipe Técnica Ecosolar Energy'}
                  </p>
                  {proposta.vendedor?.email && (
                    <p className="text-xs text-slate-500">{proposta.vendedor.email}</p>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Garantias & Padrão de Engenharia
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pt-1">
                  <li>
                    25 anos de garantia linear de geração de energia dos módulos fotovoltaicos
                  </li>
                  <li>10 a 12 anos de garantia de fábrica do inversor fotovoltaico homologado</li>
                  <li>Homologação 100% inclusa com emissão de ART assinada por engenheiro</li>
                  <li>Instalação realizada rigorosamente conforme normas técnicas NR10 e NR35</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 5. Prova Social — Obras Concluídas & Padrão de Engenharia (Fotos Reais) */}
        {(() => {
          // Resolver fotos selecionadas ou padrão
          const hasCustomSelection =
            Array.isArray(proposta.fotos_selecionadas) && proposta.fotos_selecionadas.length >= 0

          let rawItemsToDisplay: Array<{
            id: string
            url: string
            titulo: string
            legenda: string
            descricao: string
            tag: string
            local: string
          }> = []

          if (hasCustomSelection) {
            const selList = proposta.fotos_selecionadas || []
            // Se o usuário explicitamente deixou nenhuma marcada ([]), não exibe a galeria adicional de fotos
            if (selList.length === 0) {
              return null
            }

            selList.forEach((sel, i) => {
              if (sel.origem === 'lead') {
                const leadPh = (proposta.fotos_obra || []).find((p) => p.id === sel.id)
                const url = leadPh?.url || leadPh?.foto || ''
                if (url) {
                  rawItemsToDisplay.push({
                    id: `lead-${sel.id}-${i}`,
                    url,
                    titulo: sel.legenda || leadPh?.legenda || `Instalação do Cliente #${i + 1}`,
                    legenda: sel.legenda || leadPh?.legenda || `Instalação do cliente homologada`,
                    descricao:
                      'Instalação executada pela equipe Ecosolar com acompanhamento de engenharia.',
                    tag: 'Foto da Obra',
                    local: proposta.lead?.cidade
                      ? `${proposta.lead.cidade}/${proposta.lead.estado || 'RO'}`
                      : 'Rondônia / RO',
                  })
                }
              } else {
                // Origem institucional
                const inst = INSTITUTIONAL_INSTALLATION_PHOTOS.find((p) => p.id === sel.id)
                if (inst) {
                  rawItemsToDisplay.push({
                    id: inst.id,
                    url: inst.src,
                    titulo: inst.titulo,
                    legenda: sel.legenda || inst.legenda,
                    descricao: inst.descricao,
                    tag: inst.tag,
                    local: inst.local,
                  })
                }
              }
            })
          } else {
            // Propostas legadas sem campo fotos_selecionadas: fallback para a galeria mista padrão
            if (proposta.fotos_obra && proposta.fotos_obra.length > 0) {
              proposta.fotos_obra.forEach((ph, i) => {
                rawItemsToDisplay.push({
                  id: ph.id || `lead-photo-${i}`,
                  url: ph.url || ph.foto || '',
                  titulo: ph.legenda || `Obra Homologada #${i + 1}`,
                  legenda: ph.legenda || `Instalação executada pela Ecosolar`,
                  descricao:
                    'Instalação homologada com acompanhamento de engenharia e ART assinada.',
                  tag: 'Obra Executada',
                  local: proposta.lead?.cidade
                    ? `${proposta.lead.cidade}/${proposta.lead.estado || 'RO'}`
                    : 'Rondônia / RO',
                })
              })
            }

            INSTITUTIONAL_INSTALLATION_PHOTOS.forEach((inst: InstitutionalInstallationPhoto) => {
              if (!rawItemsToDisplay.some((p) => p.legenda === inst.legenda)) {
                rawItemsToDisplay.push({
                  id: inst.id,
                  url: inst.src,
                  titulo: inst.titulo,
                  legenda: inst.legenda,
                  descricao: inst.descricao,
                  tag: inst.tag,
                  local: inst.local,
                })
              }
            })
          }

          if (rawItemsToDisplay.length === 0) {
            return null
          }

          return (
            <Card className="border border-slate-200/90 bg-white shadow-sm overflow-hidden rounded-2xl">
              <CardHeader className="pb-4 border-b border-slate-100 bg-gradient-to-r from-[#0A192F] to-[#163868] text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                      <Camera className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <CardTitle className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                        Prova Social — Obras Reais Executadas & Padrão de Engenharia
                      </CardTitle>
                      <p className="text-xs text-sky-200 mt-0.5">
                        Instalações solares concluídas e homologadas pela equipe própria da Ecosolar
                        Energy
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-amber-400 text-slate-950 hover:bg-amber-400 text-xs font-black uppercase px-2.5 py-1 self-start sm:self-auto shrink-0 shadow-sm">
                    ✓ Galeria de Obras Reais ({rawItemsToDisplay.length})
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 bg-slate-50/50 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rawItemsToDisplay.map((ph, idx) => (
                    <div
                      key={`social-proof-${ph.id || idx}`}
                      onClick={() => setSelectedPhotoModal(ph)}
                      className="group cursor-pointer rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs hover:shadow-md transition-all duration-300 hover:border-amber-400/80 flex flex-col"
                    >
                      {/* Foto */}
                      <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-950">
                        <img
                          src={ph.url}
                          alt={ph.legenda}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute top-2.5 left-2.5">
                          <span className="bg-[#0A192F]/90 backdrop-blur-xs text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm">
                            {ph.tag}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity flex items-end p-3">
                          <span className="text-[11px] text-white/90 font-semibold flex items-center gap-1">
                            <Camera className="w-3 h-3 text-amber-400" />
                            <span>Clique para ampliar em alta resolução</span>
                          </span>
                        </div>
                      </div>

                      {/* Legenda e Descrição */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2 bg-white">
                        <div>
                          <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            <span>{ph.local}</span>
                            <span className="text-emerald-700 font-bold">✓ Homologada</span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0A192F] leading-snug">
                            {ph.legenda}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                            {ph.descricao}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-amber-600 group-hover:text-amber-700 flex items-center gap-1">
                            Ver detalhes técnicos &rarr;
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Padrão NR10/NR35
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-amber-300/60 bg-amber-50/70 p-3 sm:p-4 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-slate-900 font-bold">
                        Garantia de Qualidade de Engenharia Ecosolar
                      </strong>
                      <span className="text-slate-600 text-[11px]">
                        Nossas instalações seguem rigorosamente as normas técnicas vigentes (ABNT
                        NBR 16690 e NR10/NR35), utilizando ferragens estruturais galvanizadas a
                        quente e fiação fotovoltaica certificada com proteção anti-UV.
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* Condições de Pagamento e Observações */}
        {(proposta.condicoes_pagamento || proposta.observacoes) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {proposta.condicoes_pagamento && (
              <Card className="border-slate-200/90 bg-white shadow-xs">
                <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-amber-500" />
                    <span>Condições e Formas de Pagamento</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {proposta.condicoes_pagamento}
                </CardContent>
              </Card>
            )}

            {proposta.observacoes && (
              <Card className="border-slate-200/90 bg-white shadow-xs">
                <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Observações Técnicas & Contratuais</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {proposta.observacoes}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 6. Fechamento com CTA & Aceite Online com Assinatura Digital */}
        <Card
          id="aceite-proposta"
          className={`border-2 shadow-lg transition-all ${
            acceptedSuccess
              ? 'border-emerald-500 bg-emerald-50/50'
              : 'border-[#0A192F] bg-gradient-to-b from-slate-50 to-white'
          }`}
        >
          <CardHeader className="pb-3 border-b border-slate-200 bg-[#0A192F] text-white">
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
                  O registro eletrônico do seu aceite foi gravado no sistema com IP e data/hora.
                  Você pode baixar o documento oficial assinado em PDF a qualquer momento pelo botão
                  abaixo.
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
                  Ao clicar em <strong>&quot;Aceitar Proposta Agora&quot;</strong>, você concorda
                  com o valor de investimento de <strong>{formatBRL(proposta.preco_venda)}</strong>{' '}
                  e o escopo técnico com os itens discriminados. O projeto avançará automaticamente
                  para o início dos trâmites de engenharia e homologação.
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
                    Validade das condições garantida até: {formatDateBR(proposta.data_validade)}
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
      </main>

      {/* Modal de Zoom da Foto da Prova Social */}
      <Dialog
        open={!!selectedPhotoModal}
        onOpenChange={(open) => !open && setSelectedPhotoModal(null)}
      >
        <DialogContent className="sm:max-w-3xl p-5 bg-white overflow-hidden">
          {selectedPhotoModal && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#0A192F] text-amber-400 font-black text-xs uppercase px-2.5 py-0.5">
                    {selectedPhotoModal.tag}
                  </Badge>
                  <DialogTitle className="text-base font-extrabold text-slate-900">
                    {selectedPhotoModal.titulo}
                  </DialogTitle>
                </div>
              </DialogHeader>

              <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-300 max-h-[60vh] flex items-center justify-center">
                <img
                  src={selectedPhotoModal.url}
                  alt={selectedPhotoModal.legenda}
                  className="max-h-[60vh] w-auto max-w-full object-contain"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>
                    Local: <strong>{selectedPhotoModal.local}</strong>
                  </span>
                  <span className="font-bold text-emerald-700">✓ Engenharia Ecosolar Energy</span>
                </div>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {selectedPhotoModal.descricao}
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPhotoModal(null)}
                  className="text-xs"
                >
                  Fechar Visualização
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer Institucional */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 mt-12 text-center text-xs text-slate-500 border-t border-slate-200 pt-6 space-y-1">
        <p className="font-bold text-slate-800">ECOSOLAR ENERGY — A energia do futuro, hoje!</p>
        <p>
          Soluções em Engenharia Solar Fotovoltaica e Eficiência Energética • Todos os direitos
          reservados.
        </p>
      </footer>
    </div>
  )
}
