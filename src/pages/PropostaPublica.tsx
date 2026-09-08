import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Sun,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
  FileDown,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  Loader2,
  Building2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { ProposalsService } from '@/services/proposals'
import type { PublicProposta } from '@/types/crm'
import { formatBRL, formatDateBR, formatDateTimeBR } from '@/lib/solarUtils'
import { openProposalPDFPrint } from '@/lib/proposalPdf'
import { InvestmentComparison } from '@/components/InvestmentComparison'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'

export default function PropostaPublica() {
  const { token } = useParams<{ token: string }>()
  const { isAuthenticated } = useAuth()
  const [proposta, setProposta] = useState<PublicProposta | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Acceptance state
  const [nomeConfirmacao, setNomeConfirmacao] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [acceptedSuccess, setAcceptedSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setErrorMsg('Token da proposta não fornecido na URL.')
      setLoading(false)
      return
    }

    loadProposta(token)
  }, [token])

  const loadProposta = async (t: string) => {
    try {
      setLoading(true)
      setErrorMsg(null)
      const data = await ProposalsService.getPublicProposta(t)
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
          'Seu aceite formal foi registrado no sistema. Nossa equipe técnica entrará em contato em breve para os próximos passos.',
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
      validade_dias: proposta.validade_dias,
      data_validade: proposta.data_validade,
      condicoes_pagamento: proposta.condicoes_pagamento,
      observacoes: proposta.observacoes,
      data_aceite: proposta.data_aceite,
      aceito_por_nome: proposta.aceito_por_nome,
      created: proposta.created,
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
        name: proposta.vendedor?.name || 'Equipe SolarCRM',
        email: proposta.vendedor?.email,
      },
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#0B7A5B] to-emerald-400 flex items-center justify-center text-amber-300 shadow-lg mb-4 animate-bounce">
          <Sun className="w-7 h-7" />
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-[#0B7A5B] mb-2" />
        <p className="text-sm font-semibold text-slate-700">Carregando sua proposta comercial...</p>
        <p className="text-xs text-slate-400 mt-1">SolarCRM • Engenharia Fotovoltaica</p>
      </div>
    )
  }

  if (errorMsg || !proposta) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Proposta Indisponível</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {errorMsg || 'Esta proposta comercial não foi localizada ou o link expirou.'}
          </p>
          <div className="pt-2">
            <p className="text-xs text-slate-400 mb-4">
              Caso você seja o cliente, por favor solicite um novo link ao seu consultor solar.
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

  // Cálculos solares
  const consumoKwh = proposta.lead?.consumo_mensal_kwh || 400
  const geracaoEstimadaKwh = Math.round((proposta.kit_potencia_kw || consumoKwh / 120) * 125)
  const economiaMensal = consumoKwh * 0.92 * 0.85
  const economiaAnual = economiaMensal * 12
  const economia25Anos = economiaAnual * 25

  // Checar validade
  const dataValidade = new Date(proposta.data_validade)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const isExpirada = dataValidade < hoje && proposta.status !== 'Aceita'

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16">
      {/* Top Navigation Bar with SolarCRM Brand */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0B7A5B] to-emerald-400 flex items-center justify-center text-amber-300 shadow-md">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-base text-slate-900 tracking-tight">
                  Solar
                </span>
                <span className="font-extrabold text-base text-amber-500 tracking-tight">CRM</span>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Proposta Oficial de Energia Solar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && proposta.lead?.id && (
              <Link to={`/leads/${proposta.lead.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold gap-1.5 h-8.5 border-slate-200 text-slate-700 hover:text-[#0B7A5B]"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ver Ficha do Lead</span>
                  <span className="sm:hidden">Lead</span>
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="text-xs font-semibold gap-1.5 h-8.5 border-slate-200 hover:text-[#0B7A5B]"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Baixar em PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Top Banner for authenticated CRM user */}
      {isAuthenticated && proposta.lead?.id && (
        <div className="bg-slate-900 text-white text-xs px-4 py-2">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <span className="text-slate-300">
              Você está visualizando a <strong>página pública da proposta</strong> como membro
              logado do CRM.
            </span>
            <Link
              to={`/leads/${proposta.lead.id}`}
              className="font-semibold text-amber-400 hover:underline flex items-center gap-1"
            >
              Ir para detalhes do lead &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Banner de Status quando Aceita */}
        {acceptedSuccess && (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-600 text-white shadow-md flex items-start sm:items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-base sm:text-lg">
                ✓ Proposta Formalmente Aceita com Sucesso!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100 mt-0.5">
                Obrigado pela confiança, {proposta.aceito_por_nome || proposta.lead?.nome}! Nossa
                equipe de engenharia já foi notificada e dará início aos trâmites de homologação e
                agendamento da instalação.
              </p>
            </div>
          </div>
        )}

        {isExpirada && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-xs leading-relaxed">
              <strong>Atenção:</strong> O prazo original desta proposta expirou em{' '}
              {formatDateBR(proposta.data_validade)}. Entre em contato com seu consultor solar para
              confirmar a validade das condições comerciais.
            </p>
          </div>
        )}

        {/* Hero Card da Proposta */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#095C44] to-[#0B7A5B] text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none blur-2xl"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-400 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase px-2.5 py-0.5">
                  Proposta Exclusiva
                </Badge>
                <Badge
                  variant="outline"
                  className="text-white border-white/30 text-xs font-semibold"
                >
                  Validade: {formatDateBR(proposta.data_validade)}
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {proposta.kit_nome}
              </h1>

              <p className="text-sm text-emerald-100 leading-relaxed">
                Sistema Solar Fotovoltaico On-Grid preparado para suprir o consumo de{' '}
                <strong>{consumoKwh} kWh/mês</strong> do cliente{' '}
                <strong>{proposta.lead?.nome}</strong>.
              </p>

              {proposta.kit_potencia_kw && (
                <div className="flex items-center gap-3 pt-1 text-xs text-emerald-200">
                  <span>
                    Potência: <strong>{proposta.kit_potencia_kw} kWp</strong>
                  </span>
                  {proposta.kit_fabricante && (
                    <span>
                      • Fabricante: <strong>{proposta.kit_fabricante}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Price Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-right shrink-0 md:min-w-[240px]">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-200 block">
                Investimento Total
              </span>
              <span className="text-3xl sm:text-4xl font-black text-amber-300 font-mono-numbers block tracking-tight my-1">
                {formatBRL(proposta.preco_venda)}
              </span>
              <span className="text-xs text-emerald-100 block">
                Projeto + Equipamentos + Instalação inclusos
              </span>
            </div>
          </div>
        </div>

        {/* Três Métricas de Economia */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardContent className="p-5 text-center">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                <Zap className="w-5 h-5" />
              </div>
              <p className="text-xs uppercase font-bold text-slate-400">Geração Mensal Média</p>
              <p className="text-2xl font-extrabold text-slate-900 font-mono-numbers mt-1">
                ~{geracaoEstimadaKwh} <span className="text-xs font-normal">kWh/mês</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Geração limpa e renovável gerada no telhado
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardContent className="p-5 text-center">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-xs uppercase font-bold text-slate-400">Economia Anual Est.</p>
              <p className="text-2xl font-extrabold text-emerald-700 font-mono-numbers mt-1">
                {formatBRL(economiaAnual)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Cerca de {formatBRL(economiaMensal)} por mês de alívio na conta
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardContent className="p-5 text-center">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-xs uppercase font-bold text-slate-400">Economia em 25 Anos</p>
              <p className="text-2xl font-extrabold text-slate-900 font-mono-numbers mt-1">
                {formatBRL(economia25Anos)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Vida útil garantida dos painéis fotovoltaicos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Comparativo de Investimento em 30 Anos: Solar vs Poupança vs CDB */}
        <InvestmentComparison
          valorInvestido={proposta.preco_venda || 0}
          economiaMensal={economiaMensal}
          anos={30}
          titulo="Quanto rende esse investimento em 30 anos?"
          subtitulo="Entenda por que aplicar seu capital em Energia Solar supera com folga as opções tradicionais do mercado financeiro"
        />

        {/* Detalhes do Cliente & Consultor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cliente */}
          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Dados do Cliente Contratante
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
                    <p className="text-xs text-slate-400">Telefone</p>
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
                    <p className="text-xs text-slate-400">Endereço da Instalação</p>
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

          {/* Consultor */}
          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Consultor & Engenharia Responsável
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0B7A5B] flex items-center justify-center shrink-0 font-bold">
                  ☀
                </div>
                <div>
                  <p className="text-xs text-slate-400">Especialista Solar</p>
                  <p className="font-bold text-slate-900">
                    {proposta.vendedor?.name || 'SolarCRM Engenharia Solar'}
                  </p>
                  {proposta.vendedor?.email && (
                    <p className="text-xs text-slate-500">{proposta.vendedor.email}</p>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0B7A5B]" />
                  Garantias & Padrão de Engenharia
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pt-1">
                  <li>25 anos de garantia linear de geração dos módulos solares</li>
                  <li>10 a 12 anos de garantia de fábrica do inversor fotovoltaico</li>
                  <li>Homologação 100% inclusa junto à concessionária de energia</li>
                  <li>Instalação realizada conforme normas técnicas NR10 e NR35</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Escopo Técnico Completo */}
        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              Itens e Serviços Inclusos na Solução Turnkey
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 text-xs">
              <div className="p-4 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 text-sm">Gerador Solar Fotovoltaico</p>
                  <p className="text-slate-600 mt-0.5">
                    Módulos monocristalinos de alta eficiência Tier 1 e inversor de alta performance
                    com conexão Wi-Fi para monitoramento via celular.
                  </p>
                </div>
              </div>

              <div className="p-4 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 text-sm">
                    Projeto Executivo de Engenharia & Homologação
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Elaboração de diagramas unifilares, emissão de ART assinada por engenheiro e
                    trâmite completo com a concessionária até a troca do medidor bidirecional.
                  </p>
                </div>
              </div>

              <div className="p-4 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 text-sm">
                    Instalação Elétrica e Fixação Mecânica
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Estrutura de fixação adequada ao tipo de telhado em alumínio anodizado, string
                    box com proteções contra surtos (DPS) e disjuntores específicos para corrente
                    contínua.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Condições de Pagamento & Observações */}
        {(proposta.condicoes_pagamento || proposta.observacoes) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {proposta.condicoes_pagamento && (
              <Card className="border-slate-200/80 bg-white shadow-xs">
                <CardHeader className="pb-2 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Condições de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {proposta.condicoes_pagamento}
                </CardContent>
              </Card>
            )}

            {proposta.observacoes && (
              <Card className="border-slate-200/80 bg-white shadow-xs">
                <CardHeader className="pb-2 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Observações Importantes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {proposta.observacoes}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Bloco de Aceite Digital da Proposta */}
        <Card
          id="aceite-proposta"
          className={`border shadow-md transition-all ${
            acceptedSuccess
              ? 'border-emerald-300 bg-emerald-50/50'
              : 'border-[#0B7A5B]/40 bg-gradient-to-b from-emerald-50/40 to-white'
          }`}
        >
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#0B7A5B]" />
                <CardTitle className="text-base font-bold text-slate-900">
                  {acceptedSuccess ? 'Proposta Aceita Formalmente' : 'Aceite Online da Proposta'}
                </CardTitle>
              </div>
              <Badge
                className={
                  acceptedSuccess ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
                }
              >
                {acceptedSuccess ? 'Concluído' : 'Aguardando Aceite'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {acceptedSuccess ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>
                    Aceita por{' '}
                    <strong className="text-slate-900">
                      {proposta.aceito_por_nome || proposta.lead?.nome}
                    </strong>{' '}
                    em {formatDateTimeBR(proposta.data_aceite || new Date().toISOString())}.
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  O registro eletrônico do seu aceite foi gravado no histórico do projeto. Você pode
                  baixar a via completa em PDF a qualquer momento pelo botão abaixo.
                </p>
                <div className="pt-2">
                  <Button
                    onClick={handleDownloadPDF}
                    className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Baixar Via Formal em PDF</span>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAcceptProposal} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ao clicar em <strong>&quot;Aceitar Proposta&quot;</strong>, você concorda com os
                  valores de investimento de <strong>{formatBRL(proposta.preco_venda)}</strong> e o
                  escopo técnico apresentado. O status do projeto avançará automaticamente para
                  início imediato dos trâmites de homologação.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="nomeAceite" className="text-xs font-semibold text-slate-700">
                      Seu Nome Completo (para formalização)
                    </Label>
                    <Input
                      id="nomeAceite"
                      value={nomeConfirmacao}
                      onChange={(e) => setNomeConfirmacao(e.target.value)}
                      placeholder="Ex: João da Silva"
                      required
                      className="h-10 text-xs bg-white"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="submit"
                      disabled={accepting || isExpirada}
                      className="w-full h-10 bg-[#0B7A5B] hover:bg-[#095C44] text-white font-bold text-sm shadow-md gap-2"
                    >
                      {accepting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Registrando Aceite...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                          <span>Aceitar Proposta Agora</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <span>Validade garantida até: {formatDateBR(proposta.data_validade)}</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Ambiente seguro e criptografado
                  </span>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 sm:px-6 mt-12 text-center text-xs text-slate-400 border-t border-slate-200/80 pt-6">
        <p>
          SolarCRM — Gestão Especializada de Vendas e Engenharia Fotovoltaica • Todos os direitos
          reservados.
        </p>
      </footer>
    </div>
  )
}
