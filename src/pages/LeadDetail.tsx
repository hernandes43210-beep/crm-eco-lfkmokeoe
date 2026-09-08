import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Upload,
  ArrowRight,
  TrendingUp,
  User,
  Zap,
  Building,
  Check,
  XCircle,
  FileDown,
  Loader2,
  Send,
  Sparkles,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'
import { LeadsService } from '@/services/leads'
import { WhatsAppService } from '@/services/whatsapp'
import { ProposalsService } from '@/services/proposals'
import type { Lead, LeadStatus, HistoricoItem, WhatsAppMessage, Proposta } from '@/types/crm'
import { GerarPropostaModal } from '@/components/GerarPropostaModal'
import { openProposalPDFPrint } from '@/lib/proposalPdf'
import useRealtime from '@/hooks/use-realtime'
import { useAuth } from '@/context/AuthContext'
import {
  formatBRL,
  formatDateBR,
  formatDateTimeBR,
  computeSLAStatus,
  getStatusBadgeStyle,
} from '@/lib/solarUtils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'

const PIPELINE_ORDER: LeadStatus[] = [
  'Novo',
  'Contato Feito',
  'Proposta Enviada',
  'Negociação',
  'Fechado Ganho',
  'Fechado Perdido',
]

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)

  // Proposals list and generation modal
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [loadingPropostas, setLoadingPropostas] = useState(false)
  const [showGerarPropostaModal, setShowGerarPropostaModal] = useState(false)

  // Legacy proposal editable state
  const [precoVenda, setPrecoVenda] = useState<number | string>('')
  const [prAssinada, setPrAssinada] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [savingProposal, setSavingProposal] = useState(false)

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Quick note modal/field
  const [novaNota, setNovaNota] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // WhatsApp integration in LeadDetail
  const [waMessages, setWaMessages] = useState<WhatsAppMessage[]>([])
  const [loadingWa, setLoadingWa] = useState(false)
  const [waText, setWaText] = useState('')
  const [sendingWa, setSendingWa] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const fetchPropostas = async (leadId: string) => {
    try {
      setLoadingPropostas(true)
      const list = await ProposalsService.getPropostasByLead(leadId)
      setPropostas(list)
    } catch (err) {
      console.error('Erro ao carregar propostas:', err)
    } finally {
      setLoadingPropostas(false)
    }
  }

  const fetchLead = async () => {
    if (!id) return
    try {
      const data = await LeadsService.getLeadById(id)
      setLead(data)
      setPrecoVenda(data.preco_venda || '')
      setPrAssinada(data.pr_assinada_ganho || false)
      fetchWaMessages(data)
      fetchPropostas(data.id)
    } catch (err) {
      console.error('Error loading lead detail:', err)
      toast({
        title: 'Lead não encontrado',
        description: 'Não foi possível carregar os dados desta oportunidade.',
        variant: 'destructive',
      })
      navigate('/leads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLead()
  }, [id])

  const fetchWaMessages = async (leadData?: Lead | null) => {
    const targetLead = leadData || lead
    if (!targetLead) return
    try {
      setLoadingWa(true)
      let list: WhatsAppMessage[] = []
      if (targetLead.id) {
        list = await WhatsAppService.getMessagesByLead(targetLead.id)
      }
      if (list.length === 0 && targetLead.telefone) {
        list = await WhatsAppService.getMessagesByPhone(targetLead.telefone)
      }
      setWaMessages(list)
    } catch (err) {
      console.error('Error loading WhatsApp messages for lead:', err)
    } finally {
      setLoadingWa(false)
    }
  }

  // Realtime subscription for WhatsApp messages for this lead
  useRealtime<WhatsAppMessage>('whatsapp_messages', (e) => {
    if (
      lead &&
      (e.record.lead === lead.id ||
        (lead.telefone && e.record.phone_number === lead.telefone.replace(/\D/g, '')))
    ) {
      if (e.action === 'create') {
        setWaMessages((prev) => [...prev, e.record])
      } else if (e.action === 'update') {
        setWaMessages((prev) => prev.map((m) => (m.id === e.record.id ? e.record : m)))
      }
    }
  })

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lead || !lead.telefone || !waText.trim()) return

    const textToSend = waText.trim()
    setWaText('')

    try {
      setSendingWa(true)
      await WhatsAppService.sendMessage({
        number: lead.telefone,
        text: textToSend,
        lead_id: lead.id,
      })
      toast({
        title: 'Mensagem enviada!',
        description: 'Enviada com sucesso para o WhatsApp do cliente.',
      })
      fetchWaMessages()
      fetchLead() // Atualiza histórico do lead
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar via WhatsApp'
      toast({
        title: 'Erro no envio',
        description: msg,
        variant: 'destructive',
      })
      setWaText(textToSend)
    } finally {
      setSendingWa(false)
    }
  }

  // Real-time subscription for this specific lead
  useRealtime<Lead>('leads', (e) => {
    if (e.record.id === id) {
      setLead(e.record)
      setPrecoVenda(e.record.preco_venda || '')
      setPrAssinada(e.record.pr_assinada_ganho || false)
    }
  })

  // Real-time subscription for propostas of this lead
  useRealtime<Proposta>('propostas', (e) => {
    if (id && e.record.lead === id) {
      if (e.action === 'create') {
        setPropostas((prev) => [e.record, ...prev.filter((p) => p.id !== e.record.id)])
      } else if (e.action === 'update') {
        setPropostas((prev) => prev.map((p) => (p.id === e.record.id ? e.record : p)))
      } else if (e.action === 'delete') {
        setPropostas((prev) => prev.filter((p) => p.id !== e.record.id))
      }
    }
  })

  // Pipeline advance/retreat
  const changeStage = async (newStatus: LeadStatus) => {
    if (!lead) return
    try {
      const origStatus = lead.status
      let historyList = lead.historico || []

      const desc =
        newStatus === 'Fechado Ganho'
          ? 'Negócio fechado com sucesso! Contrato assinado.'
          : newStatus === 'Fechado Perdido'
            ? 'Oportunidade marcada como perdida no funil.'
            : `Lead avançado de '${origStatus}' para '${newStatus}'.`

      historyList = [
        ...historyList,
        {
          data: new Date().toISOString(),
          tipo: 'status',
          descricao: desc,
        },
      ]

      const payload: Partial<Lead> = {
        status: newStatus,
        historico: historyList,
        pr_assinada_ganho: newStatus === 'Fechado Ganho' ? true : lead.pr_assinada_ganho,
      }

      const updated = await LeadsService.updateLead(lead.id, payload)
      setLead(updated)
      setPrAssinada(updated.pr_assinada_ganho || false)

      toast({
        title: 'Estágio atualizado',
        description: `Lead alterado para "${newStatus}".`,
      })
    } catch (err) {
      console.error('Error changing stage:', err)
      toast({
        title: 'Erro ao mover estágio',
        description: 'Não foi possível atualizar o status do lead.',
        variant: 'destructive',
      })
    }
  }

  // Save Proposal (file, signed flag, price)
  const handleSaveProposal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lead) return

    try {
      setSavingProposal(true)

      const formData = new FormData()
      formData.append('preco_venda', String(Number(precoVenda) || 0))
      formData.append('pr_assinada_ganho', String(prAssinada))

      if (selectedFile) {
        formData.append('pr_file', selectedFile)
      }

      // Add to history
      const historyList = [
        ...(lead.historico || []),
        {
          data: new Date().toISOString(),
          tipo: 'proposta' as const,
          descricao: `Proposta comercial atualizada (Valor: ${formatBRL(
            Number(precoVenda),
          )}${selectedFile ? ', novo arquivo PDF anexado' : ''}${
            prAssinada ? ', marcada como Assinada' : ''
          }).`,
        },
      ]
      formData.append('historico', JSON.stringify(historyList))

      const updated = await LeadsService.updateLead(lead.id, formData)
      setLead(updated)
      setSelectedFile(null)

      toast({
        title: 'Proposta salva',
        description: 'As informações da proposta foram gravadas com sucesso.',
      })
    } catch (err) {
      console.error('Error saving proposal:', err)
      toast({
        title: 'Erro ao salvar proposta',
        description: 'Verifique o formato do PDF e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingProposal(false)
    }
  }

  // Add quick note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lead || !novaNota.trim()) return

    try {
      setSavingNote(true)
      const historyList: HistoricoItem[] = [
        ...(lead.historico || []),
        {
          data: new Date().toISOString(),
          tipo: 'nota',
          descricao: novaNota.trim(),
        },
      ]

      const updated = await LeadsService.updateLead(lead.id, {
        historico: historyList,
      })
      setLead(updated)
      setNovaNota('')
      toast({
        title: 'Nota registrada',
        description: 'Comentário adicionado ao histórico do lead.',
      })
    } catch (err) {
      console.error('Error adding note:', err)
      toast({
        title: 'Erro ao registrar nota',
        variant: 'destructive',
      })
    } finally {
      setSavingNote(false)
    }
  }

  // Delete lead
  const handleDelete = async () => {
    if (!lead) return
    try {
      setIsDeleting(true)
      await LeadsService.deleteLead(lead.id)
      toast({
        title: 'Lead excluído',
        description: 'O lead foi excluído permanentemente.',
      })
      navigate('/leads')
    } catch (err) {
      console.error('Error deleting lead:', err)
      toast({
        title: 'Erro ao excluir',
        description: 'Permissão negada ou erro no servidor.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B7A5B] mx-auto mb-3" />
        <p className="text-sm">Carregando detalhes do lead...</p>
      </div>
    )
  }

  if (!lead) return null

  const sla = computeSLAStatus(lead.sla_limite, lead.status)
  const currentIdx = PIPELINE_ORDER.indexOf(lead.status)
  const nextStatus = currentIdx >= 0 && currentIdx < 4 ? PIPELINE_ORDER[currentIdx + 1] : null
  const prevStatus = currentIdx > 0 && currentIdx < 5 ? PIPELINE_ORDER[currentIdx - 1] : null

  // Monthly estimated bill economy calculation: estimated 85% reduction, kWh * 0.95 tariff
  const estimatedBill = (lead.consumo_mensal_kwh || 0) * 0.92
  const estimatedSavings = estimatedBill * 0.85

  // SLA bar calculation: total SLA days vs remaining days
  const totalDays = lead.sla_dias || 7
  const remainingDays = sla.daysDiff
  const progressPercent = Math.max(0, Math.min(100, Math.round((remainingDays / totalDays) * 100)))

  const pdfUrl = lead.pr_file ? LeadsService.getFileUrl(lead, lead.pr_file) : ''

  const handleCopyLink = (token: string) => {
    const url = ProposalsService.getPublicUrl(token)
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    toast({
      title: 'Link copiado!',
      description: 'O link exclusivo da proposta foi copiado para sua área de transferência.',
    })
    setTimeout(() => setCopiedToken(null), 3000)
  }

  const handleSendProposalWhatsApp = (prop: Proposta) => {
    const rawPhone = (lead.telefone || '').replace(/\D/g, '')
    if (!rawPhone) {
      toast({
        title: 'Telefone não cadastrado',
        description: 'Cadastre o WhatsApp do cliente para enviar a proposta diretamente.',
        variant: 'destructive',
      })
      return
    }
    const publicUrl = ProposalsService.getPublicUrl(prop.token_publico)
    const msg = `Olá, ${lead.nome}! Tudo bem? Segue a proposta comercial do seu sistema solar (${prop.kit_nome}) no valor de ${formatBRL(prop.preco_venda)}. Você pode visualizar todos os detalhes e aprovar online através do link: ${publicUrl}`
    const waUrl = `https://wa.me/55${rawPhone}?text=${encodeURIComponent(msg)}`
    window.open(waUrl, '_blank')
  }

  const handleDownloadPDF = (prop: Proposta) => {
    openProposalPDFPrint({
      id: prop.id,
      token_publico: prop.token_publico,
      status: prop.status,
      kit_nome: prop.kit_nome,
      kit_potencia_kw: prop.kit_potencia_kw,
      kit_fabricante: prop.kit_fabricante,
      custo: prop.custo,
      margem: prop.margem,
      preco_venda: prop.preco_venda,
      validade_dias: prop.validade_dias,
      data_validade: prop.data_validade,
      condicoes_pagamento: prop.condicoes_pagamento,
      observacoes: prop.observacoes,
      data_aceite: prop.data_aceite,
      aceito_por_nome: prop.aceito_por_nome,
      created: prop.created,
      cliente: {
        nome: lead.nome,
        email: lead.email,
        telefone: lead.telefone,
        cidade: lead.cidade,
        estado: lead.estado,
        endereco: lead.endereco,
        consumo_mensal_kwh: lead.consumo_mensal_kwh,
      },
      vendedor: {
        name: lead.expand?.proprietario?.name || user?.name,
        email: lead.expand?.proprietario?.email || user?.email,
      },
    })
  }

  return (
    <div className="space-y-6 select-none animate-fade-in-up pb-12">
      {/* Top Breadcrumb & Header Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/leads')}
            className="text-slate-500 hover:text-slate-900 -ml-2 h-9 px-2 gap-1 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Leads</span>
          </Button>
          <div className="h-4 w-px bg-slate-300"></div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {lead.nome}
              </h2>
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-0.5 border ${getStatusBadgeStyle(lead.status)}`}
              >
                {lead.status}
              </Badge>

              {propostas.length > 0 && (
                <Badge
                  variant="outline"
                  className={`text-xs px-2.5 py-0.5 border font-semibold ${
                    propostas[0].status === 'Aceita'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : propostas[0].status === 'Enviada'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : propostas[0].status === 'Recusada'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                  title={`Status da última proposta gerada: ${propostas[0].status}`}
                >
                  Proposta: {propostas[0].status}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Proprietário:{' '}
              <span className="font-semibold text-slate-700">
                {lead.expand?.proprietario?.name || 'Equipe'}
              </span>{' '}
              • Criado em {formatDateBR(lead.created)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            onClick={() => setShowGerarPropostaModal(true)}
            className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-bold gap-1.5 h-9 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Gerar Proposta</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/leads/${lead.id}/editar`)}
            className="text-xs font-semibold gap-1.5 h-9 border-slate-200 text-slate-700 hover:text-[#0B7A5B]"
          >
            <Edit3 className="w-4 h-4" />
            <span>Editar</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            className="text-xs font-semibold gap-1.5 h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir</span>
          </Button>
        </div>
      </div>

      {/* Two Column Layout (Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Contato & Endereço */}
          <Card className="border-slate-200/80 shadow-xs bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                Informações de Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">E-mail</p>
                  <a
                    href={`mailto:${lead.email}`}
                    className="font-medium text-slate-800 hover:text-[#0B7A5B] truncate block"
                  >
                    {lead.email}
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Telefone / WhatsApp</p>
                    <p className="font-medium text-slate-800">{lead.telefone || 'Não informado'}</p>
                  </div>
                </div>
                {lead.telefone && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate('/whatsapp')}
                    title="Abrir no WhatsApp CRM"
                    className="text-[#0B7A5B] hover:text-[#095C44] hover:bg-emerald-50 h-7 px-2 text-xs gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Inbox</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Localização</p>
                  <p className="font-medium text-slate-800">
                    {lead.endereco ? `${lead.endereco}, ` : ''}
                    {lead.cidade || lead.estado
                      ? `${lead.cidade || ''} - ${lead.estado || ''}`
                      : 'Endereço não cadastrado'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Canal de Origem</p>
                    <Badge variant="secondary" className="text-xs mt-0.5 font-medium">
                      {lead.origem || 'Site'}
                    </Badge>
                  </div>
                </div>

                {lead.luvik_deal_id && (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[11px] font-mono"
                    title={`ID do Negócio no Luvik: ${lead.luvik_deal_id}`}
                  >
                    Luvik #{lead.luvik_deal_id.slice(-6)}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Consumo & Economia Estimada */}
          <Card className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-emerald-50/40">
              <CardTitle className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span>Dimensionamento Solar & Economia</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Consumo Mensal</p>
                  <p className="text-xl font-extrabold text-slate-900 font-mono-numbers mt-1">
                    {lead.consumo_mensal_kwh} <span className="text-xs font-normal">kWh</span>
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100">
                  <p className="text-xs text-emerald-800 font-semibold uppercase">Economia Est.</p>
                  <p className="text-xl font-extrabold text-emerald-700 font-mono-numbers mt-1">
                    {formatBRL(estimatedSavings)}
                    <span className="text-[10px] block font-normal text-emerald-600">ao mês</span>
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Potencial de Redução da Conta:
                </p>
                Com base no consumo informado de <strong>{lead.consumo_mensal_kwh} kWh/mês</strong>,
                o cliente paga cerca de {formatBRL(estimatedBill)}/mês à concessionária. Um sistema
                solar reduz essa fatura para a taxa mínima de disponibilidade, gerando mais de{' '}
                <strong className="text-emerald-700">
                  {formatBRL(estimatedSavings * 12)} de economia anual
                </strong>
                .
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 3: SLA Countdown Bar & Urgência */}
          <Card
            className={`border shadow-xs bg-white ${
              sla.isOverdue
                ? 'border-red-300 ring-2 ring-red-100'
                : sla.state === 'warning'
                  ? 'border-amber-300'
                  : 'border-slate-200/80'
            }`}
          >
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0B7A5B]" />
                <span>Controle de Prazo SLA</span>
              </CardTitle>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border ${sla.chipClass}`}>
                {sla.label}
              </span>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Visual Countdown Bar */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                  <span>Progresso do Prazo SLA ({lead.sla_dias || 7} dias)</span>
                  <span className="font-mono-numbers">
                    {sla.isOverdue
                      ? 'Prazo Expirado'
                      : `${Math.max(0, sla.daysDiff)} dias restantes`}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      sla.isOverdue
                        ? 'bg-red-500'
                        : sla.state === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{
                      width: sla.isOverdue ? '100%' : `${progressPercent}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">
                    Data Limite SLA:
                  </span>
                  <span className="text-sm font-bold text-slate-800 font-mono-numbers">
                    {formatDateBR(lead.sla_limite)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">
                    Status do Prazo:
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      sla.isOverdue
                        ? 'text-red-600'
                        : sla.state === 'warning'
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                    }`}
                  >
                    {sla.isOverdue
                      ? `Em atraso há ${Math.abs(sla.daysDiff)} dias`
                      : `${sla.daysDiff} dias até o vencimento`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Histórico de Atividades & Timeline */}
          <Card className="border-slate-200/80 shadow-xs bg-white">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                Histórico & Timeline de Eventos
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {(lead.historico || []).length} registros
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Timeline Items */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {!lead.historico || lead.historico.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    Nenhum evento registrado até o momento.
                  </p>
                ) : (
                  [...lead.historico].reverse().map((item, idx) => {
                    const isSlaAlert = item.tipo === 'alerta_sla'
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs flex items-start gap-3 ${
                          isSlaAlert
                            ? 'bg-red-50/50 border-red-200 text-red-900'
                            : 'bg-slate-50/70 border-slate-100 text-slate-700'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            isSlaAlert
                              ? 'bg-red-200 text-red-700'
                              : item.tipo === 'status'
                                ? 'bg-blue-100 text-blue-700'
                                : item.tipo === 'fechamento'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isSlaAlert ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium leading-relaxed">{item.descricao}</p>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            {formatDateTimeBR(item.data)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Add Quick Note Form */}
              <form onSubmit={handleAddNote} className="pt-3 border-t border-slate-100 flex gap-2">
                <Input
                  value={novaNota}
                  onChange={(e) => setNovaNota(e.target.value)}
                  placeholder="Adicionar nota rápida ou observação..."
                  className="h-9 text-xs border-slate-200"
                />
                <Button
                  type="submit"
                  disabled={savingNote || !novaNota.trim()}
                  size="sm"
                  className="bg-[#0B7A5B] hover:bg-[#095C44] text-white h-9 px-3 text-xs gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Salvar</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Card 5: Painel de Conversas WhatsApp do Lead */}
          <Card className="border-slate-200/80 shadow-xs bg-white">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#0B7A5B]" />
                <CardTitle className="text-sm font-bold text-slate-900">
                  Conversas no WhatsApp
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {waMessages.length} mensagens
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/whatsapp')}
                  className="text-xs text-[#0B7A5B] hover:bg-emerald-50 h-7 px-2 gap-1"
                >
                  <span>Abrir Inbox</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Mensagens do Lead */}
              <div className="space-y-2.5 max-h-64 overflow-y-auto p-2 bg-slate-50/70 rounded-lg border border-slate-100">
                {loadingWa ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    Carregando mensagens do WhatsApp...
                  </p>
                ) : waMessages.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 space-y-1">
                    <p>Nenhuma mensagem do WhatsApp trocada com este lead ainda.</p>
                    <p className="text-[11px] text-slate-400">
                      Envie uma mensagem abaixo ou conecte o WhatsApp na aba lateral.
                    </p>
                  </div>
                ) : (
                  waMessages.map((msg) => {
                    const isOut = msg.direction === 'out'
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl px-3 py-2 text-xs shadow-xs ${
                            isOut
                              ? 'bg-[#0B7A5B] text-white'
                              : 'bg-white text-slate-800 border border-slate-200/80'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <span
                            className={`text-[9px] block text-right mt-1 ${
                              isOut ? 'text-emerald-100' : 'text-slate-400'
                            }`}
                          >
                            {formatDateTimeBR(msg.created)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Formulário de Envio Rápido para este Lead */}
              <form onSubmit={handleSendWhatsApp} className="pt-2 flex gap-2">
                <Input
                  value={waText}
                  onChange={(e) => setWaText(e.target.value)}
                  placeholder={
                    lead.telefone
                      ? `Responder via WhatsApp para ${lead.telefone}...`
                      : 'Lead não possui telefone cadastrado'
                  }
                  disabled={!lead.telefone || sendingWa}
                  className="h-9 text-xs border-slate-200 focus-visible:ring-[#0B7A5B]"
                />
                <Button
                  type="submit"
                  disabled={!lead.telefone || !waText.trim() || sendingWa}
                  size="sm"
                  className="bg-[#0B7A5B] hover:bg-[#095C44] text-white h-9 px-3 text-xs gap-1 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingWa ? 'Enviando...' : 'Enviar'}</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Nova Seção: Propostas Comerciais Geradas com Link Público */}
      <Card className="border-slate-200/80 shadow-xs bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#0B7A5B]" />
              <span>Propostas Geradas & Link Público do Cliente</span>
            </CardTitle>
            <p className="text-xs text-slate-500">
              Propostas com link exclusivo para envio no WhatsApp, aceite digital automático e
              download em PDF
            </p>
          </div>

          <Button
            onClick={() => setShowGerarPropostaModal(true)}
            size="sm"
            className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5 h-8.5 shadow-xs shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>+ Gerar Nova Proposta</span>
          </Button>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {loadingPropostas ? (
            <div className="py-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#0B7A5B] mx-auto mb-2" />
              <p className="text-xs">Carregando propostas vinculadas...</p>
            </div>
          ) : propostas.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#0B7A5B] flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Nenhuma proposta gerada ainda</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-0.5">
                  Clique em &quot;Gerar Proposta&quot; para selecionar um kit solar, calcular a
                  margem e ativar o link público exclusivo para o cliente.
                </p>
              </div>
              <Button
                onClick={() => setShowGerarPropostaModal(true)}
                size="sm"
                className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Gerar Proposta Solar</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {propostas.map((prop) => {
                const publicUrl = ProposalsService.getPublicUrl(prop.token_publico)
                const isAceita = prop.status === 'Aceita'
                const isRecusada = prop.status === 'Recusada'

                return (
                  <div
                    key={prop.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isAceita
                        ? 'border-emerald-300 bg-emerald-50/30'
                        : isRecusada
                          ? 'border-rose-200 bg-rose-50/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Dados Básicos */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                            {prop.kit_nome}
                          </h4>
                          <Badge
                            variant="outline"
                            className={`text-xs px-2 py-0.5 font-bold ${
                              isAceita
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : prop.status === 'Enviada'
                                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                                  : isRecusada
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {prop.status}
                          </Badge>
                          {prop.kit_potencia_kw ? (
                            <span className="text-xs text-slate-500 font-mono-numbers">
                              {prop.kit_potencia_kw} kWp
                            </span>
                          ) : null}
                          {prop.kit_fabricante ? (
                            <span className="text-xs text-slate-400">• {prop.kit_fabricante}</span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span>
                            Valor da Venda:{' '}
                            <strong className="text-slate-900 font-bold font-mono-numbers text-sm text-[#0B7A5B]">
                              {formatBRL(prop.preco_venda)}
                            </strong>
                          </span>
                          <span>
                            Custo:{' '}
                            <span className="font-mono-numbers">{formatBRL(prop.custo)}</span>
                          </span>
                          <span>
                            Margem:{' '}
                            <span className="font-mono-numbers font-semibold">{prop.margem}%</span>
                          </span>
                          <span>
                            Validade até:{' '}
                            <strong className="text-slate-800 font-mono-numbers">
                              {formatDateBR(prop.data_validade)}
                            </strong>
                          </span>
                        </div>

                        {isAceita && (
                          <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5 pt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              Aceita digitalmente em{' '}
                              {formatDateTimeBR(prop.data_aceite || prop.updated)}
                              {prop.aceito_por_nome ? ` por ${prop.aceito_por_nome}` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Ações: Copiar Link, Enviar WhatsApp, Baixar PDF, Abrir Link */}
                      <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyLink(prop.token_publico)}
                          className="h-8 text-xs font-semibold border-slate-200 text-slate-700 hover:text-[#0B7A5B] gap-1.5"
                          title="Copiar link exclusivo da proposta"
                        >
                          {copiedToken === prop.token_publico ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5" />
                              <span>Copiar Link</span>
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleSendProposalWhatsApp(prop)}
                          className="h-8 text-xs font-semibold bg-[#25D366] hover:bg-[#20bd5a] text-white gap-1.5 shadow-xs"
                          title="Abrir WhatsApp com mensagem pronta"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(prop)}
                          className="h-8 text-xs font-semibold border-slate-200 text-slate-700 hover:text-blue-600 gap-1.5"
                          title="Gerar e imprimir documento PDF"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>Baixar PDF</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(publicUrl, '_blank')}
                          className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1"
                          title="Visualizar tela pública do cliente"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proposta Section (Ações do Funil) */}
      <Card className="border-slate-200/80 shadow-xs bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0B7A5B]" />
              <span>Ações do Funil & Anexo Avulso</span>
            </CardTitle>
            <p className="text-xs text-slate-500">
              Movimente o lead no funil ou anexe arquivos externos de contratos
            </p>
          </div>

          {/* Quick Stage Transitions */}
          <div className="flex flex-wrap items-center gap-2">
            {prevStatus && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeStage(prevStatus)}
                className="text-xs border-slate-200 h-8"
              >
                ← Retornar p/ {prevStatus}
              </Button>
            )}

            {nextStatus && (
              <Button
                size="sm"
                onClick={() => changeStage(nextStatus)}
                className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold h-8 gap-1.5 shadow-sm"
              >
                <span>Avançar para {nextStatus}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}

            {lead.status !== 'Fechado Ganho' && (
              <Button
                size="sm"
                onClick={() => changeStage('Fechado Ganho')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 gap-1"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Fechar Ganho</span>
              </Button>
            )}

            {lead.status !== 'Fechado Perdido' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changeStage('Fechado Perdido')}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs h-8"
              >
                Marcar Perdido
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSaveProposal} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Preço de Venda */}
              <div className="space-y-1.5">
                <Label htmlFor="propPreco" className="text-xs font-semibold text-slate-700">
                  Preço de Venda da Proposta (R$)
                </Label>
                <Input
                  id="propPreco"
                  type="number"
                  min="0"
                  step="0.01"
                  value={precoVenda}
                  onChange={(e) => setPrecoVenda(e.target.value)}
                  placeholder="Ex: 22500"
                  className="h-10 text-sm font-bold border-slate-200 focus-visible:ring-[#0B7A5B]"
                />
                <p className="text-[11px] text-slate-400">
                  Valor final negociado com o cliente para instalação.
                </p>
              </div>

              {/* Upload Proposta PDF */}
              <div className="space-y-1.5">
                <Label htmlFor="pdfFile" className="text-xs font-semibold text-slate-700">
                  Anexo da Proposta (.PDF)
                </Label>
                <Input
                  id="pdfFile"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setSelectedFile(f)
                  }}
                  className="h-10 text-xs border-slate-200 cursor-pointer file:text-xs file:font-medium file:text-slate-700 file:bg-slate-100 file:border-0 file:rounded-md file:mr-2"
                />
                {pdfUrl ? (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#0B7A5B] font-semibold hover:underline mt-1"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Visualizar PDF Atual Anexado</span>
                  </a>
                ) : (
                  <p className="text-[11px] text-slate-400">Nenhum PDF anexado ainda.</p>
                )}
              </div>

              {/* Toggle Proposta Assinada */}
              <div className="space-y-1.5 flex flex-col justify-between">
                <Label className="text-xs font-semibold text-slate-700">Status de Assinatura</Label>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Proposta Assinada / Ganho?
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {prAssinada ? 'Contrato formalizado' : 'Aguardando assinatura'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={prAssinada}
                    onChange={(e) => setPrAssinada(e.target.checked)}
                    className="w-5 h-5 rounded text-[#0B7A5B] focus:ring-[#0B7A5B] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                type="submit"
                disabled={savingProposal}
                className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold h-10 px-6 rounded-lg gap-2 shadow-sm"
              >
                {savingProposal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando Proposta...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Salvar Dados da Proposta</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Excluir Lead Permanentemente?
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Esta ação excluirá todos os dados, proposta anexada e histórico do lead{' '}
              <strong className="text-slate-900">{lead.nome}</strong>. Esta ação não poderá ser
              desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir Lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Gerar Proposta */}
      {lead && (
        <GerarPropostaModal
          open={showGerarPropostaModal}
          onOpenChange={setShowGerarPropostaModal}
          lead={lead}
          onProposalCreated={(nova) => {
            setPropostas((prev) => [nova, ...prev])
            fetchLead() // Recarrega para obter possível histórico atualizado
          }}
        />
      )}
    </div>
  )
}
