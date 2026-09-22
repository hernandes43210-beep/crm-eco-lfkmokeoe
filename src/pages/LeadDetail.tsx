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
  AlertCircle,
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
  UserX,
  Eye,
  FileCheck,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { LeadsService } from '@/services/leads'
import { WhatsAppService } from '@/services/whatsapp'
import { ProposalsService } from '@/services/proposals'
import type { Lead, LeadStatus, HistoricoItem, WhatsAppMessage, Proposta } from '@/types/crm'
import { GerarPropostaModal } from '@/components/GerarPropostaModal'
import { InvestmentComparison } from '@/components/InvestmentComparison'
import { DeletePropostaDialog } from '@/components/DeletePropostaDialog'
import { EditarPropostaModal } from '@/components/EditarPropostaModal'
import { MotivoPerdaModal } from '@/components/MotivoPerdaModal'
import { LeadInstallationPhotos } from '@/components/LeadInstallationPhotos'
import { LeadFormalizacaoSection } from '@/components/LeadFormalizacaoSection'
import { openProposalPDFPrint } from '@/lib/proposalPdf'
import useRealtime from '@/hooks/use-realtime'
import { useAuth } from '@/context/AuthContext'
import { toPortugueseErrorMessage } from '@/lib/errors'
import {
  formatBRL,
  formatDateBR,
  formatDateTimeBR,
  computeSLAStatus,
  getStatusBadgeStyle,
  calcularEconomiaMensal,
  calcularFaturaMensalEstimada,
} from '@/lib/solarUtils'
import { calcularMargemReal } from '@/utils/marginUtils'
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
  const { user, isAdmin } = useAuth()

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
  const [propostaToDelete, setPropostaToDelete] = useState<Proposta | null>(null)
  const [isDeletingProposta, setIsDeletingProposta] = useState(false)
  const [propostaToEdit, setPropostaToEdit] = useState<Proposta | null>(null)

  // Motivo de perda modal
  const [showMotivoPerdaModal, setShowMotivoPerdaModal] = useState(false)
  const [isMarkingLost, setIsMarkingLost] = useState(false)

  // Quick note modal/field
  const [novaNota, setNovaNota] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Próximo contato
  const [proximoContato, setProximoContato] = useState('')
  const [proximoContatoData, setProximoContatoData] = useState('')
  const [proximoContatoObs, setProximoContatoObs] = useState('')
  const [savingProximoContato, setSavingProximoContato] = useState(false)
  const [proximoContatoSaved, setProximoContatoSaved] = useState(false)

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
      // Deduplicar lista por id para garantir que itens repetidos não causem problemas de key
      const seen = new Set<string>()
      const unique = list.filter((p) => {
        if (!p.id || seen.has(p.id)) return false
        seen.add(p.id)
        return true
      })
      setPropostas(unique)
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
      setProximoContato(data.proximo_contato || '')
      setProximoContatoObs(data.proximo_contato_obs || data.proximo_contato || '')
      // Converte data ISO do banco para o valor aceito em input datetime-local (YYYY-MM-DDTHH:mm)
      if (data.proximo_contato_data) {
        try {
          const d = new Date(data.proximo_contato_data)
          if (!isNaN(d.getTime())) {
            const pad = (n: number) => String(n).padStart(2, '0')
            const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
            setProximoContatoData(localIso)
          } else {
            setProximoContatoData('')
          }
        } catch (_) {
          setProximoContatoData('')
        }
      } else {
        setProximoContatoData('')
      }
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
      // Deduplicar lista de mensagens por id
      const seen = new Set<string>()
      const unique = list.filter((m) => {
        if (!m.id || seen.has(m.id)) return false
        seen.add(m.id)
        return true
      })
      setWaMessages(unique)
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
        setWaMessages((prev) => {
          if (prev.some((m) => m.id === e.record.id)) {
            return prev.map((m) => (m.id === e.record.id ? e.record : m))
          }
          return [...prev, e.record]
        })
      } else if (e.action === 'update') {
        setWaMessages((prev) => prev.map((m) => (m.id === e.record.id ? e.record : m)))
      } else if (e.action === 'delete') {
        setWaMessages((prev) => prev.filter((m) => m.id !== e.record.id))
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
      const msg = toPortugueseErrorMessage(err, 'Falha ao enviar mensagem via WhatsApp.')
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
      // Se o usuário não estiver editando ativamente outro valor, sincroniza
      if (!savingProximoContato) {
        setProximoContato(e.record.proximo_contato || '')
        setProximoContatoObs(e.record.proximo_contato_obs || e.record.proximo_contato || '')
        if (e.record.proximo_contato_data) {
          try {
            const d = new Date(e.record.proximo_contato_data)
            if (!isNaN(d.getTime())) {
              const pad = (n: number) => String(n).padStart(2, '0')
              const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
              setProximoContatoData(localIso)
            } else {
              setProximoContatoData('')
            }
          } catch (_) {
            setProximoContatoData('')
          }
        } else {
          setProximoContatoData('')
        }
      }
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

  // Normalizar historico caso chegue como string, array de bytes, ou array normal do backend
  const normalizedHistorico = React.useMemo<HistoricoItem[]>(() => {
    if (!lead?.historico) return []
    let val: unknown = lead.historico

    if (typeof val === 'string') {
      try {
        val = JSON.parse(val)
      } catch (_) {
        return []
      }
    }

    if (Array.isArray(val)) {
      // Caso 1: Array de bytes ASCII / UTF-8 salvo por engano (ex: [91, 123, 34, ...])
      if (val.length > 0 && typeof val[0] === 'number') {
        try {
          let str = ''
          for (let i = 0; i < val.length; i++) {
            str += String.fromCharCode(val[i] as number)
          }
          const parsed = JSON.parse(str)
          if (Array.isArray(parsed)) {
            val = parsed
          } else {
            return []
          }
        } catch (_) {
          return []
        }
      }

      // Filtrar e validar cada item para garantir que descricao e tipo existam de forma segura
      return (val as unknown[])
        .filter(
          (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
        )
        .map((item) => ({
          id: typeof item.id === 'string' ? item.id : undefined,
          data: typeof item.data === 'string' ? item.data : new Date().toISOString(),
          tipo: (typeof item.tipo === 'string' ? item.tipo : 'nota') as HistoricoItem['tipo'],
          descricao:
            typeof item.descricao === 'string' ? item.descricao : String(item.descricao ?? ''),
          autor_nome: typeof item.autor_nome === 'string' ? item.autor_nome : undefined,
        }))
    }

    return []
  }, [lead?.historico])

  // Qualificar lead que está na fila de pré-qualificação
  const [qualifying, setQualifying] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [motivoDescarte, setMotivoDescarte] = useState('Fora da área de cobertura')
  const [motivoCustom, setMotivoCustom] = useState('')
  const [discarding, setDiscarding] = useState(false)

  const handleQualificarLead = async () => {
    if (!lead) return
    try {
      setQualifying(true)
      const updated = await LeadsService.qualificar(lead.id, {
        id: user?.id || '',
        nome: user?.name,
        email: user?.email,
      })
      setLead(updated)
      toast({
        title: 'Lead qualificado com sucesso!',
        description: 'O lead entrou no estágio "Novo" do funil e o SLA de 7 dias foi iniciado.',
      })
    } catch (err) {
      console.error('Error qualifying lead:', err)
      toast({
        title: 'Erro ao qualificar',
        description: toPortugueseErrorMessage(err, 'Não foi possível qualificar o lead.'),
        variant: 'destructive',
      })
    } finally {
      setQualifying(false)
    }
  }

  const handleDescartarLead = async () => {
    if (!lead) return
    try {
      setDiscarding(true)
      const motivoFinal = motivoDescarte === 'Outro' ? motivoCustom.trim() : motivoDescarte
      const updated = await LeadsService.descartar(lead.id, motivoFinal, {
        id: user?.id || '',
        nome: user?.name,
        email: user?.email,
      })
      setLead(updated)
      setShowDiscardDialog(false)
      toast({
        title: 'Lead descartado',
        description: 'O lead foi removido da fila de qualificação.',
      })
    } catch (err) {
      console.error('Error discarding lead:', err)
      toast({
        title: 'Erro ao descartar',
        description: toPortugueseErrorMessage(err, 'Não foi possível descartar o lead.'),
        variant: 'destructive',
      })
    } finally {
      setDiscarding(false)
    }
  }

  // Pipeline advance/retreat: se for Fechado Perdido, abre modal para coletar motivo
  const requestChangeStage = (newStatus: LeadStatus) => {
    if (!lead) return
    if (newStatus === 'Fechado Perdido') {
      setShowMotivoPerdaModal(true)
      return
    }
    changeStage(newStatus)
  }

  // Confirmação de perda via modal
  const handleConfirmPerda = async ({
    motivo,
    observacao,
  }: {
    motivo: string
    observacao?: string
  }) => {
    if (!lead) return
    try {
      setIsMarkingLost(true)
      const updated = await LeadsService.marcarPerdido(
        lead.id,
        motivo,
        observacao,
        user ? { id: user.id, nome: user.name, email: user.email } : undefined,
      )
      setLead(updated)
      setShowMotivoPerdaModal(false)
      toast({
        title: 'Lead marcado como Perdido',
        description: `Oportunidade encerrada como perdida. Motivo: ${motivo}`,
      })
    } catch (err) {
      console.error('Error marking lead as lost:', err)
      const errorMsg = toPortugueseErrorMessage(
        err,
        'Não foi possível registrar o motivo da perda. Tente novamente.',
      )
      toast({
        title: 'Erro ao marcar perda',
        description: errorMsg,
        variant: 'destructive',
      })
      throw err
    } finally {
      setIsMarkingLost(false)
    }
  }

  // Pipeline advance/retreat
  const changeStage = async (newStatus: LeadStatus) => {
    if (!lead) return
    try {
      const origStatus = lead.status
      let historyList = [...normalizedHistorico]

      const isFechadoGanho = newStatus === 'Fechado Ganho'
      const desc = isFechadoGanho
        ? 'Negócio fechado com sucesso! Etapa de Formalização Contratual & Energisa iniciada.'
        : newStatus === 'Fechado Perdido'
          ? 'Oportunidade marcada como perdida no funil.'
          : `Lead avançado de '${origStatus}' para '${newStatus}'.`

      historyList = [
        ...historyList,
        {
          data: new Date().toISOString(),
          tipo: isFechadoGanho ? 'fechamento' : 'status',
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

      if (newStatus === 'Fechado Ganho') {
        toast({
          title: 'Venda Fechada! Etapa de Formalização aberta',
          description:
            'O lead entrou na etapa de Formalização. Gere o Contrato e a Procuração Energisa abaixo.',
        })
      } else {
        toast({
          title: 'Estágio atualizado',
          description: `Lead alterado para "${newStatus}".`,
        })
      }
    } catch (err) {
      console.error('Error changing stage:', err)
      toast({
        title: 'Erro ao mover estágio',
        description: toPortugueseErrorMessage(err, 'Não foi possível atualizar o status do lead.'),
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
        ...normalizedHistorico,
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
        description: toPortugueseErrorMessage(err, 'Verifique o formato do PDF e tente novamente.'),
        variant: 'destructive',
      })
    } finally {
      setSavingProposal(false)
    }
  }

  // Salvar próximo contato (data/hora e observações)
  const handleSaveProximoContato = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!lead) return

    const novaObs = proximoContatoObs.trim()
    let dataIsoParaSalvar = ''

    if (proximoContatoData) {
      const parsedDate = new Date(proximoContatoData)
      if (isNaN(parsedDate.getTime())) {
        toast({
          title: 'Data ou hora inválida',
          description: 'Por favor, selecione uma data e horário válidos para o próximo contato.',
          variant: 'destructive',
        })
        return
      }
      dataIsoParaSalvar = parsedDate.toISOString()
    }

    // Gerar resumo textual compatível para proximo_contato (exibição no Kanban/legado)
    let resumoTexto = ''
    if (dataIsoParaSalvar && novaObs) {
      resumoTexto = `${formatDateTimeBR(dataIsoParaSalvar)} - ${novaObs}`
    } else if (dataIsoParaSalvar) {
      resumoTexto = `Agendado para ${formatDateTimeBR(dataIsoParaSalvar)}`
    } else if (novaObs) {
      resumoTexto = novaObs
    }

    // Apenas rearma os 3 lembretes se a data/hora agendada foi alterada de fato para uma NOVA data não-vazia.
    // Se alterou apenas a observação (ou se limpou a data), mantém os flags ou limpa sem causar reenvio acidental.
    const dataAnteriorNormalizada = (lead.proximo_contato_data || '').substring(0, 16)
    const novaDataNormalizada = (dataIsoParaSalvar || '').substring(0, 16)
    const dataRealmenteMudou =
      Boolean(novaDataNormalizada) && novaDataNormalizada !== dataAnteriorNormalizada

    try {
      setSavingProximoContato(true)

      const historyList: HistoricoItem[] = [
        ...normalizedHistorico,
        {
          data: new Date().toISOString(),
          tipo: 'contato',
          descricao: dataIsoParaSalvar
            ? `Próximo contato agendado para ${formatDateTimeBR(dataIsoParaSalvar)}${
                novaObs ? ` (Obs: "${novaObs}")` : ''
              }.${dataRealmenteMudou ? ' Lembretes automáticos rearmados para o novo horário.' : ' Lembretes automáticos mantidos.'}`
            : novaObs
              ? `Próximo contato atualizado: "${novaObs}"`
              : 'Próximo contato removido.',
        },
      ]

      const payload: Partial<Lead> = {
        proximo_contato: resumoTexto,
        proximo_contato_data: dataIsoParaSalvar,
        proximo_contato_obs: novaObs,
        historico: historyList,
      }

      // Somente reseta os flags para reativar os 3 lembretes se a data de fato mudou para um novo horário
      if (dataRealmenteMudou) {
        payload.lembrete_1d_enviado = false
        payload.lembrete_4h_enviado = false
        payload.lembrete_20m_enviado = false
      }

      const updated = await LeadsService.updateLead(lead.id, payload)

      setLead(updated)
      setProximoContato(updated.proximo_contato || '')
      setProximoContatoObs(updated.proximo_contato_obs || updated.proximo_contato || '')
      setProximoContatoSaved(true)
      setTimeout(() => setProximoContatoSaved(false), 2500)

      toast({
        title: 'Próximo contato salvo',
        description: dataIsoParaSalvar
          ? 'Data, horário e observação salvos. Lembretes automáticos ativados (1 dia, 4 horas e 20 minutos antes).'
          : 'Informações do próximo contato salvas com sucesso.',
      })
    } catch (err) {
      console.error('Error saving proximo_contato:', err)
      toast({
        title: 'Erro ao salvar próximo contato',
        description: toPortugueseErrorMessage(
          err,
          'Não foi possível salvar a anotação. Tente novamente.',
        ),
        variant: 'destructive',
      })
    } finally {
      setSavingProximoContato(false)
    }
  }

  // Limpar agendamento
  const handleClearProximoContato = async () => {
    if (!lead) return
    try {
      setSavingProximoContato(true)
      const historyList: HistoricoItem[] = [
        ...normalizedHistorico,
        {
          data: new Date().toISOString(),
          tipo: 'contato',
          descricao: 'Agendamento de próximo contato cancelado/removido.',
        },
      ]

      const updated = await LeadsService.updateLead(lead.id, {
        proximo_contato: '',
        proximo_contato_data: '',
        proximo_contato_obs: '',
        lembrete_1d_enviado: false,
        lembrete_4h_enviado: false,
        lembrete_20m_enviado: false,
        historico: historyList,
      })

      setLead(updated)
      setProximoContato('')
      setProximoContatoData('')
      setProximoContatoObs('')
      toast({
        title: 'Agendamento removido',
        description: 'O compromisso de próximo contato e lembretes foram cancelados.',
      })
    } catch (err) {
      console.error('Error clearing proximo_contato:', err)
      toast({
        title: 'Erro ao remover agendamento',
        description: toPortugueseErrorMessage(err, 'Falha ao limpar o próximo contato.'),
        variant: 'destructive',
      })
    } finally {
      setSavingProximoContato(false)
    }
  }

  // Add quick note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lead || !novaNota.trim()) return

    try {
      setSavingNote(true)
      const historyList: HistoricoItem[] = [
        ...normalizedHistorico,
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
        description: toPortugueseErrorMessage(
          err,
          'Não foi possível registrar o comentário no histórico.',
        ),
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
        description: toPortugueseErrorMessage(err, 'Permissão negada ou erro no servidor.'),
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

  const isAguardando = lead.status_qualificacao === 'aguardando'
  const isDescartado = lead.status_qualificacao === 'descartado'
  const sla = computeSLAStatus(lead.sla_limite, lead.status, lead.status_qualificacao)
  const currentIdx = PIPELINE_ORDER.indexOf(lead.status)
  const nextStatus = currentIdx >= 0 && currentIdx < 4 ? PIPELINE_ORDER[currentIdx + 1] : null
  const prevStatus = currentIdx > 0 && currentIdx < 5 ? PIPELINE_ORDER[currentIdx - 1] : null

  // Monthly estimated bill economy calculation: Consumo (kWh) × R$ 1,15 × 85%
  const estimatedBill = calcularFaturaMensalEstimada(lead.consumo_mensal_kwh || 0)
  const estimatedSavings = calcularEconomiaMensal(lead.consumo_mensal_kwh || 0)

  // SLA bar calculation: total SLA days vs remaining days
  const totalDays = lead.sla_dias || 7
  const remainingDays = sla.daysDiff
  const progressPercent = Math.max(0, Math.min(100, Math.round((remainingDays / totalDays) * 100)))

  const pdfUrl = lead.pr_file ? LeadsService.getFileUrl(lead, lead.pr_file) : ''

  const handleCopyLink = (token: string) => {
    // Copia o link público oficial limpo para envio ao cliente
    const url = ProposalsService.getPublicUrl(token)
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    toast({
      title: 'Link do cliente copiado!',
      description: 'Link oficial pronto para envio ao cliente via WhatsApp ou e-mail.',
    })
    setTimeout(() => setCopiedToken(null), 3000)
  }

  const handleDeleteProposta = async () => {
    if (!propostaToDelete) return
    const id = propostaToDelete.id
    const kitNome = propostaToDelete.kit_nome

    try {
      setIsDeletingProposta(true)
      await ProposalsService.deleteProposta(id)

      // Atualização imediata do estado local
      setPropostas((prev) => prev.filter((p) => p.id !== id))

      toast({
        title: 'Proposta excluída',
        description: `A proposta "${kitNome}" foi removida com sucesso.`,
      })
      setPropostaToDelete(null)

      // Recarrega dados atualizados do lead (histórico e status sincronizados)
      if (id) {
        fetchLead()
      }
    } catch (err: unknown) {
      console.error('Erro ao excluir proposta:', err)
      const errorMsg = toPortugueseErrorMessage(
        err,
        'Não foi possível excluir a proposta comercial. Tente novamente mais tarde.',
      )

      toast({
        title: 'Erro ao excluir proposta',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setIsDeletingProposta(false)
    }
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
      desconto_percentual: prop.desconto_percentual,
      valor_desconto: prop.valor_desconto,
      valor_bruto: prop.valor_bruto,
      validade_dias: prop.validade_dias,
      data_validade: prop.data_validade,
      condicoes_pagamento: prop.condicoes_pagamento,
      observacoes: prop.observacoes,
      data_aceite: prop.data_aceite,
      aceito_por_nome: prop.aceito_por_nome,
      created: prop.created,
      kit_descricao: (prop as any)?.kit_descricao || prop.expand?.kit?.descricao,
      kit_string_box:
        (prop as any)?.kit_string_box || (prop.expand?.kit as any)?.string_box || undefined,
      kit_marca_painel:
        (prop as any)?.kit_marca_painel || (prop.expand?.kit as any)?.marca_painel || undefined,
      kit_marca_inversor:
        (prop as any)?.kit_marca_inversor || (prop.expand?.kit as any)?.marca_inversor || undefined,
      kit_potencia_painel_w:
        (prop as any)?.kit_potencia_painel_w ||
        (prop.expand?.kit as any)?.potencia_painel_w ||
        undefined,
      kit_potencia_inversor_kw:
        (prop as any)?.kit_potencia_inversor_kw ||
        (prop.expand?.kit as any)?.potencia_inversor_kw ||
        undefined,
      kit_tipo_estrutura:
        (prop as any)?.kit_tipo_estrutura || (prop.expand?.kit as any)?.tipo_estrutura || undefined,
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
      fotos_selecionadas: prop.fotos_selecionadas,
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
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {lead.nome}
              </h2>
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-0.5 border ${getStatusBadgeStyle(lead.status)}`}
              >
                {lead.status}
              </Badge>

              {lead.status === 'Fechado Perdido' && lead.motivo_perda && (
                <Badge
                  variant="outline"
                  className="text-xs px-2.5 py-0.5 border bg-rose-50 text-rose-800 border-rose-300 font-medium"
                  title={`Motivo da perda: ${lead.motivo_perda}`}
                >
                  Perda: {lead.motivo_perda}
                </Badge>
              )}

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
          {isAguardando ? (
            <>
              <Button
                onClick={handleQualificarLead}
                disabled={qualifying}
                className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-bold gap-1.5 h-9 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{qualifying ? 'Qualificando...' : 'Qualificar Lead'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiscardDialog(true)}
                className="text-xs font-semibold gap-1.5 h-9 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <UserX className="w-4 h-4" />
                <span>Descartar</span>
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setShowGerarPropostaModal(true)}
              className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-bold gap-1.5 h-9 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Gerar Proposta</span>
            </Button>
          )}

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

      {/* Card de Alerta se estiver Aguardando Qualificação */}
      {isAguardando && (
        <div className="bg-amber-50 border border-amber-300/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-200/60 text-amber-800 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-700 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Lead Aguardando Pré-Qualificação</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Este lead veio do formulário do site <em>ecoenergy.net.br</em> e está fora do funil
                comercial principal. O SLA de 7 dias começará a contar assim que for qualificado.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleQualificarLead}
              disabled={qualifying}
              className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold h-8.5 px-3 gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Qualificar Agora</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDiscardDialog(true)}
              className="border-red-300 text-red-700 hover:bg-red-100/70 text-xs font-semibold h-8.5 px-3 gap-1.5"
            >
              <UserX className="w-4 h-4" />
              <span>Descartar</span>
            </Button>
          </div>
        </div>
      )}

      {/* Card de Alerta se tiver sido Descartado */}
      {isDescartado && (
        <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 flex items-center gap-3 text-slate-700">
          <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Lead Descartado da Qualificação</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Motivo: <strong>{lead.motivo_descarte || 'Não informado'}</strong>. Este lead não
              participa das métricas ativas do funil.
            </p>
          </div>
        </div>
      )}

      {/* Card de Alerta se estiver Fechado Perdido com o motivo exibido com destaque */}
      {lead.status === 'Fechado Perdido' && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-200/80 text-rose-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-rose-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-rose-950">
                  Oportunidade Fechada como Perdida
                </h4>
                <Badge
                  variant="outline"
                  className="bg-white text-rose-800 border-rose-300 text-[10px]"
                >
                  Fechado Perdido
                </Badge>
              </div>
              <p className="text-xs text-rose-900 mt-0.5">
                Motivo registrado:{' '}
                <strong className="text-rose-950 font-semibold">
                  {lead.motivo_perda || 'Motivo não especificado'}
                </strong>
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMotivoPerdaModal(true)}
            className="border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-semibold h-8.5 px-3 self-start sm:self-auto"
          >
            Editar Motivo
          </Button>
        </div>
      )}

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
                  <p className="text-xs text-slate-400">Localização e CEP</p>
                  <p className="font-medium text-slate-800">
                    {lead.endereco ? `${lead.endereco}, ` : ''}
                    {lead.cidade || lead.estado
                      ? `${lead.cidade || ''} - ${lead.estado || ''}`
                      : 'Endereço não cadastrado'}
                    {lead.cep ? ` • CEP: ${lead.cep}` : ''}
                  </p>
                </div>
              </div>

              {/* Informações Civis para Formalização */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Dados Civis (Formalização)
                  </span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal bg-white">
                    {lead.cpf_cnpj ? 'Identificado' : 'Pendente'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block">CPF / CNPJ</span>
                    <span className="font-semibold">{lead.cpf_cnpj || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Nacionalidade</span>
                    <span className="font-medium">{lead.nacionalidade || 'Brasileiro(a)'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Estado Civil</span>
                    <span className="font-medium">{lead.estado_civil || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Profissão</span>
                    <span className="font-medium">{lead.profissao || 'Não informado'}</span>
                  </div>
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

                <div className="flex flex-wrap items-center gap-1.5 justify-end">
                  {lead.tipo_imovel && (
                    <Badge
                      variant="outline"
                      className="text-[11px] font-medium bg-slate-50 text-slate-700 border-slate-200"
                    >
                      {lead.tipo_imovel}
                    </Badge>
                  )}
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
              </div>

              {lead.valor_conta_reais !== undefined && lead.valor_conta_reais > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/70 text-xs flex items-center justify-between">
                  <span className="text-amber-900 font-medium">
                    Valor Médio da Conta de Luz (informado):
                  </span>
                  <span className="font-bold text-amber-800 font-mono-numbers">
                    {formatBRL(lead.valor_conta_reais)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Próximo Contato & Lembretes Automáticos */}
          <Card className="border-amber-200/80 shadow-xs bg-white overflow-hidden ring-1 ring-amber-100">
            <CardHeader className="pb-3 border-b border-amber-100 bg-amber-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Próximo Contato & Lembretes</span>
              </CardTitle>
              {proximoContatoSaved && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-fade-in">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Salvo!</span>
                </span>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Agende a <strong>data e horário</strong> do próximo retorno com este cliente. O
                servidor enviará e-mails automáticos para{' '}
                <code className="text-[11px] font-mono text-[#0B7A5B] bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                  ecosolarenergy2022@gmail.com
                </code>{' '}
                em 3 momentos: <strong>1 dia antes</strong>, <strong>4 horas antes</strong> e{' '}
                <strong>20 minutos antes</strong>.
              </p>

              <form onSubmit={handleSaveProximoContato} className="space-y-3.5">
                {/* Seleção de Data e Hora */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="proximoContatoData"
                    className="text-xs font-bold text-slate-800 flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Data e Horário do Contato</span>
                  </Label>
                  <Input
                    id="proximoContatoData"
                    type="datetime-local"
                    value={proximoContatoData}
                    onChange={(e) => setProximoContatoData(e.target.value)}
                    className="text-xs font-semibold border-amber-200/80 focus-visible:ring-amber-500 bg-amber-50/20 focus:bg-white h-9"
                  />
                  {lead.proximo_contato_data && (
                    <p className="text-[11px] text-slate-500">
                      Horário agendado:{' '}
                      <strong className="text-slate-800">
                        {formatDateTimeBR(lead.proximo_contato_data)}
                      </strong>
                    </p>
                  )}
                </div>

                {/* Observação do Contato */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="proximoContatoObs"
                    className="text-xs font-bold text-slate-800 flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Observação do Contato</span>
                  </Label>
                  <Textarea
                    id="proximoContatoObs"
                    value={proximoContatoObs}
                    onChange={(e) => setProximoContatoObs(e.target.value)}
                    placeholder="Ex.: Ligar para apresentar proposta do kit 5.5kWp e negociar condição de pagamento..."
                    rows={3}
                    className="text-xs border-amber-200/70 focus-visible:ring-amber-500 bg-amber-50/20 focus:bg-white resize-none"
                  />
                </div>

                {/* Status visual dos 3 Lembretes por E-mail */}
                <div className="pt-2 border-t border-amber-100/80 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                    Status dos 3 Lembretes por E-mail:
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Lembrete 1 dia antes */}
                    <div
                      className={`p-2 rounded-lg border text-center transition-colors ${
                        lead.lembrete_1d_enviado
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                          : lead.proximo_contato_data
                            ? 'bg-slate-50 border-slate-200 text-slate-600'
                            : 'bg-slate-50/50 border-dashed border-slate-200 text-slate-400'
                      }`}
                      title={
                        lead.lembrete_1d_enviado
                          ? 'Lembrete de 1 dia antes já foi enviado para ecosolarenergy2022@gmail.com'
                          : 'Aguardando momento (1 dia antes do horário agendado)'
                      }
                    >
                      <div className="flex items-center justify-center gap-1 text-[11px] font-bold">
                        {lead.lembrete_1d_enviado ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span>1 Dia</span>
                      </div>
                      <span className="text-[9px] block mt-0.5 font-medium">
                        {lead.lembrete_1d_enviado ? 'Enviado' : 'Pendente'}
                      </span>
                    </div>

                    {/* Lembrete 4 horas antes */}
                    <div
                      className={`p-2 rounded-lg border text-center transition-colors ${
                        lead.lembrete_4h_enviado
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                          : lead.proximo_contato_data
                            ? 'bg-slate-50 border-slate-200 text-slate-600'
                            : 'bg-slate-50/50 border-dashed border-slate-200 text-slate-400'
                      }`}
                      title={
                        lead.lembrete_4h_enviado
                          ? 'Lembrete de 4 horas antes já foi enviado para ecosolarenergy2022@gmail.com'
                          : 'Aguardando momento (4 horas antes do horário agendado)'
                      }
                    >
                      <div className="flex items-center justify-center gap-1 text-[11px] font-bold">
                        {lead.lembrete_4h_enviado ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span>4 Horas</span>
                      </div>
                      <span className="text-[9px] block mt-0.5 font-medium">
                        {lead.lembrete_4h_enviado ? 'Enviado' : 'Pendente'}
                      </span>
                    </div>

                    {/* Lembrete 20 minutos antes */}
                    <div
                      className={`p-2 rounded-lg border text-center transition-colors ${
                        lead.lembrete_20m_enviado
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                          : lead.proximo_contato_data
                            ? 'bg-slate-50 border-slate-200 text-slate-600'
                            : 'bg-slate-50/50 border-dashed border-slate-200 text-slate-400'
                      }`}
                      title={
                        lead.lembrete_20m_enviado
                          ? 'Lembrete de 20 minutos antes já foi enviado para ecosolarenergy2022@gmail.com'
                          : 'Aguardando momento (20 minutos antes do horário agendado)'
                      }
                    >
                      <div className="flex items-center justify-center gap-1 text-[11px] font-bold">
                        {lead.lembrete_20m_enviado ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span>20 Min</span>
                      </div>
                      <span className="text-[9px] block mt-0.5 font-medium">
                        {lead.lembrete_20m_enviado ? 'Enviado' : 'Pendente'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic">
                    * Destinatário fixo: ecosolarenergy2022@gmail.com (duplicações prevenidas
                    automaticamente).
                  </p>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  {lead.proximo_contato_data || lead.proximo_contato || lead.proximo_contato_obs ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearProximoContato}
                      disabled={savingProximoContato}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2"
                    >
                      Limpar Agendamento
                    </Button>
                  ) : (
                    <span />
                  )}

                  <Button
                    type="submit"
                    disabled={savingProximoContato}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs h-8 px-3 gap-1.5 shadow-xs ml-auto"
                  >
                    {savingProximoContato ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Salvar Agendamento</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
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
                {normalizedHistorico.length} registros
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Timeline Items */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {normalizedHistorico.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    Nenhum evento registrado até o momento.
                  </p>
                ) : (
                  [...normalizedHistorico].reverse().map((item, idx) => {
                    const isSlaAlert = item.tipo === 'alerta_sla'
                    const isPerda = item.tipo === 'perda'
                    const histKey = `hist-${(item as { id?: string }).id ?? item.tipo ?? 'item'}-${item.data ?? 'nodate'}-${idx}`
                    return (
                      <div
                        key={histKey}
                        className={`p-3 rounded-lg border text-xs flex items-start gap-3 ${
                          isSlaAlert
                            ? 'bg-red-50/50 border-red-200 text-red-900'
                            : isPerda
                              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                              : 'bg-slate-50/70 border-slate-100 text-slate-700'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            isSlaAlert || isPerda
                              ? 'bg-rose-100 text-rose-700'
                              : item.tipo === 'status'
                                ? 'bg-blue-100 text-blue-700'
                                : item.tipo === 'fechamento'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : item.tipo === 'proposta'
                                    ? 'bg-amber-100 text-amber-700'
                                    : item.tipo === 'contato'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isSlaAlert ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : isPerda ? (
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                          ) : item.tipo === 'proposta' ? (
                            <Eye className="w-3 h-3" />
                          ) : item.tipo === 'contato' ? (
                            <Calendar className="w-3 h-3 text-amber-700" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}{' '}
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
                  waMessages.map((msg, idx) => {
                    const isOut = msg.direction === 'out'
                    const msgKey = `wa-${msg.id ?? 'msg'}-${idx}`
                    return (
                      <div
                        key={msgKey}
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

      {/* Etapa de Formalização Contratual & Energisa (Visível em Fechado Ganho com aviso explicativo quando em outras etapas) */}
      {lead.status === 'Fechado Ganho' ? (
        <LeadFormalizacaoSection
          lead={lead}
          propostas={propostas}
          isAdmin={isAdmin}
          currentUserId={user?.id}
          onLeadUpdated={() => {
            fetchLead()
            if (lead?.id) fetchPropostas(lead.id)
          }}
        />
      ) : (
        <Card className="border-amber-200 bg-amber-50/40 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5 text-amber-700" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-amber-950">
                    Formalização Contratual & Assinatura Digital (Clicksign)
                  </h4>
                  <Badge
                    variant="outline"
                    className="bg-white text-amber-800 border-amber-300 text-[10px]"
                  >
                    Etapa Atual: {lead.status}
                  </Badge>
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed max-w-2xl">
                  A geração automática de <strong>Contrato de Prestação de Serviços</strong> e{' '}
                  <strong>Procuração Energisa</strong> com envio para assinatura digital via
                  Clicksign é liberada quando o lead for movido para a etapa{' '}
                  <strong className="text-amber-950">"Fechado Ganho"</strong>.
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => changeStage('Fechado Ganho')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8.5 px-3 gap-1.5 shrink-0 shadow-xs"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Avançar para Fechado Ganho</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Seção Fotos da Instalação & Montagem Promocional (Apenas em Fechado Ganho) */}
      {lead.status === 'Fechado Ganho' && (
        <LeadInstallationPhotos
          lead={lead}
          propostas={propostas}
          isAdmin={isAdmin}
          currentUserId={user?.id}
        />
      )}

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
              {propostas.map((prop, idx) => {
                const publicUrl = ProposalsService.getPublicUrl(prop.token_publico)
                const isAceita = prop.status === 'Aceita'
                const isRecusada = prop.status === 'Recusada'
                const propKey = `prop-${prop.id ?? 'sem-id'}-${idx}`

                return (
                  <div
                    key={propKey}
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

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                          <div className="inline-flex items-center gap-1.5 flex-wrap">
                            <span className="text-slate-500">Valor da Proposta:</span>
                            {prop.desconto_percentual && prop.desconto_percentual > 0 ? (
                              <>
                                <span className="line-through text-slate-400 font-mono-numbers text-xs">
                                  {formatBRL(prop.valor_bruto || prop.preco_venda)}
                                </span>
                                <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-1.5 py-0 font-bold">
                                  -{prop.desconto_percentual}% OFF
                                </Badge>
                                <strong className="text-slate-900 font-extrabold font-mono-numbers text-base text-[#0B7A5B]">
                                  {formatBRL(prop.preco_venda)}
                                </strong>
                              </>
                            ) : (
                              <strong className="text-slate-900 font-bold font-mono-numbers text-sm text-[#0B7A5B]">
                                {formatBRL(prop.preco_venda)}
                              </strong>
                            )}
                          </div>
                          <span>
                            Custo:{' '}
                            <span className="font-mono-numbers">{formatBRL(prop.custo)}</span>
                          </span>
                          {(() => {
                            const precoFinalNegociado = prop.preco_venda || prop.valor_bruto || 0
                            const margemReal = calcularMargemReal(precoFinalNegociado, prop.custo)
                            return (
                              <span className="inline-flex items-center gap-1.5 flex-wrap">
                                <span>Margem real:</span>
                                <Badge
                                  className={`text-[10px] px-1.5 py-0 font-bold border font-mono-numbers ${margemReal.status.badgeClass}`}
                                  title={`${margemReal.status.label}: ${margemReal.status.descricao}`}
                                >
                                  {margemReal.formatado}
                                </Badge>
                              </span>
                            )
                          })()}
                          <span>
                            Validade até:{' '}
                            <strong className="text-slate-800 font-mono-numbers">
                              {formatDateBR(prop.data_validade)}
                            </strong>
                          </span>
                        </div>

                        {/* Rastreamento de visualizações pelo cliente */}
                        <div className="pt-1">
                          {prop.visualizacoes_count && prop.visualizacoes_count > 0 ? (
                            <div className="inline-flex flex-wrap items-center gap-2 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 font-medium">
                              <span className="inline-flex items-center gap-1 font-bold text-amber-950">
                                <Eye className="w-3.5 h-3.5 text-amber-600" />
                                {prop.visualizacoes_count === 1
                                  ? 'Visualizada 1 vez pelo cliente'
                                  : `Visualizada ${prop.visualizacoes_count} vezes pelo cliente`}
                              </span>
                              {prop.ultima_visualizacao && (
                                <span className="text-amber-800">
                                  • Última em{' '}
                                  <strong className="font-semibold text-amber-950">
                                    {formatDateTimeBR(prop.ultima_visualizacao)}
                                  </strong>
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] text-slate-400 bg-slate-50 border border-slate-200">
                              <Eye className="w-3 h-3 text-slate-400" />
                              <span>Ainda não visualizada pelo cliente</span>
                            </div>
                          )}
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
                          onClick={() => {
                            const previewUrl = ProposalsService.getPublicUrl(prop.token_publico, {
                              preview: true,
                            })
                            window.open(previewUrl, '_blank')
                          }}
                          className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1"
                          title="Pré-visualizar proposta como consultor (não conta visualização do cliente)"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPropostaToEdit(prop)}
                          className="h-8 text-xs font-semibold border-slate-200 text-slate-700 hover:text-[#0B7A5B] gap-1.5"
                          title="Editar dados e valores da proposta"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPropostaToDelete(prop)}
                          className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1"
                          title="Excluir proposta permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
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

      {/* Modal de Confirmação de Exclusão de Proposta */}
      <DeletePropostaDialog
        open={!!propostaToDelete}
        onOpenChange={(open) => {
          if (!open) setPropostaToDelete(null)
        }}
        proposta={propostaToDelete}
        isDeleting={isDeletingProposta}
        onConfirm={handleDeleteProposta}
      />

      {/* Comparativo de Investimento em 30 Anos: Solar vs Poupança vs CDB */}
      {(propostas.length > 0 ||
        Number(precoVenda) > 0 ||
        (lead.preco_venda && lead.preco_venda > 0)) && (
        <InvestmentComparison
          valorInvestido={propostas[0]?.preco_venda || Number(precoVenda) || lead.preco_venda || 0}
          economiaMensal={estimatedSavings}
          anos={30}
          titulo="Comparativo de Investimento em 30 Anos (Argumento de Venda)"
          subtitulo="Apresente ao cliente por que instalar energia solar rende muito mais do que deixar o dinheiro na Poupança ou no CDB"
        />
      )}

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
                onClick={() => requestChangeStage('Fechado Perdido')}
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

      {/* Modal de Confirmação de Descarte */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Descartar Lead da Qualificação?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              O lead <strong>"{lead.nome}"</strong> será marcado como descartado e não participará
              do funil.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Motivo do Descarte</Label>
              <select
                value={motivoDescarte}
                onChange={(e) => setMotivoDescarte(e.target.value)}
                className="w-full mt-1.5 h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
              >
                <option value="Fora da área de cobertura">
                  Fora da área de cobertura / Região não atendida
                </option>
                <option value="Lead de teste / Dados inválidos">
                  Lead de teste / Dados inválidos / Incompleto
                </option>
                <option value="Concorrente / Pesquisa de mercado">
                  Concorrente / Pesquisa de mercado
                </option>
                <option value="Sem interesse / Contato por engano">
                  Sem interesse / Contato por engano
                </option>
                <option value="Consumo ou conta muito baixa">
                  Consumo ou conta muito baixa (inviável)
                </option>
                <option value="Outro">Outro motivo...</option>
              </select>
            </div>

            {motivoDescarte === 'Outro' && (
              <div>
                <Label className="text-xs font-semibold text-slate-700">Descreva o motivo</Label>
                <Textarea
                  value={motivoCustom}
                  onChange={(e) => setMotivoCustom(e.target.value)}
                  placeholder="Ex: Já possui energia solar instalada"
                  className="mt-1.5 text-xs"
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={discarding}
              onClick={() => setShowDiscardDialog(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={discarding || (motivoDescarte === 'Outro' && !motivoCustom.trim())}
              onClick={handleDescartarLead}
              className="text-xs bg-red-600 hover:bg-red-700"
            >
              {discarding ? 'Descartando...' : 'Confirmar Descarte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Modal Editar Proposta */}
      <EditarPropostaModal
        open={!!propostaToEdit}
        onOpenChange={(open) => {
          if (!open) setPropostaToEdit(null)
        }}
        proposta={propostaToEdit}
        onProposalUpdated={(atualizada) => {
          setPropostas((prev) => prev.map((p) => (p.id === atualizada.id ? atualizada : p)))
          if (atualizada.preco_venda) {
            setPrecoVenda(atualizada.preco_venda)
          }
          fetchLead() // Sincroniza histórico e preço de venda no lead
        }}
      />

      {/* Modal Gerar Proposta */}
      {lead && (
        <GerarPropostaModal
          open={showGerarPropostaModal}
          onOpenChange={setShowGerarPropostaModal}
          lead={lead}
          onProposalCreated={(nova) => {
            setPropostas((prev) => {
              if (prev.some((p) => p.id === nova.id)) {
                return prev.map((p) => (p.id === nova.id ? nova : p))
              }
              return [nova, ...prev]
            })
            if (nova.preco_venda) {
              setPrecoVenda(nova.preco_venda)
            }
            fetchLead() // Recarrega para obter possível histórico atualizado e preco_venda sincronizado
          }}
        />
      )}

      {/* Modal Motivo da Perda */}
      <MotivoPerdaModal
        open={showMotivoPerdaModal}
        onOpenChange={(open) => {
          if (!open && !isMarkingLost) {
            setShowMotivoPerdaModal(false)
          }
        }}
        leadNome={lead?.nome}
        isSubmitting={isMarkingLost}
        onConfirm={handleConfirmPerda}
        onCancel={() => setShowMotivoPerdaModal(false)}
      />
    </div>
  )
}
