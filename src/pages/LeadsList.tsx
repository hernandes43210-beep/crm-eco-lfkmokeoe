import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Trash2,
  Edit3,
  Eye,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  FolderOpen,
  CheckCircle2,
  UserX,
  Clock,
  Inbox,
  AlertTriangle,
  Bot,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LeadsService } from '@/services/leads'
import { EquipeService } from '@/services/equipe'
import { toPortugueseErrorMessage } from '@/lib/errors'
import type { Lead, LeadStatus, User } from '@/types/crm'
import useRealtime from '@/hooks/use-realtime'
import { useAuth } from '@/context/AuthContext'
import { computeSLAStatus, getStatusBadgeStyle, formatDateBR, formatBRL } from '@/lib/solarUtils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeleteLeadDialog } from '@/components/DeleteLeadDialog'
import { toast } from '@/hooks/use-toast'

const ALL_STATUSES: LeadStatus[] = [
  'Novo',
  'Contato Feito',
  'Proposta Enviada',
  'Negociação',
  'Fechado Ganho',
  'Fechado Perdido',
]

export default function LeadsList() {
  const navigate = useNavigate()
  const { isAdmin, user } = useAuth()

  const [leads, setLeads] = useState<Lead[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<LeadStatus[]>([])
  const [selectedOwner, setSelectedOwner] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('-created')
  const [loading, setLoading] = useState(true)

  // Aba ativa: 'funil' (leads no funil), 'aguardando' (fila de pré-qualificação do site), 'descartados' (triagem descartada)
  const [tabView, setTabView] = useState<'funil' | 'aguardando' | 'descartados'>('funil')
  const [countAguardando, setCountAguardando] = useState(0)

  // Ações de qualificação e descarte
  const [qualifyingId, setQualifyingId] = useState<string | null>(null)
  const [leadToDiscard, setLeadToDiscard] = useState<Lead | null>(null)
  const [motivoDescarte, setMotivoDescarte] = useState('Fora da área de cobertura')
  const [motivoCustom, setMotivoCustom] = useState('')
  const [isDiscarding, setIsDiscarding] = useState(false)

  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const canDeleteLead = (lead: Lead) => {
    if (isAdmin) return true
    if (!user) return false
    return lead.proprietario === user.id
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  // Load team members for owner filter
  useEffect(() => {
    if (isAdmin) {
      EquipeService.getTeamMembers()
        .then((members) => setTeamMembers(members))
        .catch(() => {})
    }
  }, [isAdmin])

  // Atualiza contador de leads aguardando qualificação
  const refreshCounterAguardando = useCallback(async () => {
    try {
      const c = await LeadsService.countAguardandoQualificacao()
      setCountAguardando(c)
    } catch {
      // noop
    }
  }, [])

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true)
      const params: Parameters<typeof LeadsService.getLeads>[0] = {
        page,
        perPage: 20,
        search: debouncedSearch,
        proprietario: selectedOwner !== 'all' ? selectedOwner : undefined,
        sort: sortBy,
      }

      if (tabView === 'aguardando') {
        params.statusQualificacao = 'aguardando'
      } else if (tabView === 'descartados') {
        params.statusQualificacao = 'descartado'
      } else {
        params.statusQualificacao = 'funil_ativo'
        if (selectedStatuses.length > 0) {
          params.status = selectedStatuses
        }
      }

      const res = await LeadsService.getLeads(params)
      setLeads(res.items)
      setTotalItems(res.totalItems)
      setTotalPages(res.totalPages || 1)
      refreshCounterAguardando()
    } catch (err) {
      console.error('Error fetching leads:', err)
      toast({
        title: 'Erro ao carregar leads',
        description: 'Não foi possível atualizar a listagem de leads.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [
    page,
    debouncedSearch,
    selectedStatuses,
    selectedOwner,
    sortBy,
    tabView,
    refreshCounterAguardando,
  ])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Real-time subscription
  useRealtime<Lead>('leads', () => {
    fetchLeads()
    refreshCounterAguardando()
  })

  // Ação de Qualificar lead
  const handleQualificar = async (lead: Lead) => {
    try {
      setQualifyingId(lead.id)
      await LeadsService.qualificar(lead.id, {
        id: user?.id || '',
        nome: user?.name,
        email: user?.email,
      })
      toast({
        title: 'Lead qualificado com sucesso!',
        description: `"${lead.nome}" foi transferido para o funil no estágio "Novo". SLA de 7 dias iniciado.`,
      })
      fetchLeads()
      refreshCounterAguardando()
    } catch (err) {
      console.error('Error qualifying lead:', err)
      toast({
        title: 'Erro ao qualificar lead',
        description: 'Não foi possível mover o lead para o funil. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setQualifyingId(null)
    }
  }

  // Ação de Descartar lead
  const handleConfirmarDescarte = async () => {
    if (!leadToDiscard) return
    const motivoFinal = motivoDescarte === 'Outro' ? motivoCustom.trim() : motivoDescarte
    try {
      setIsDiscarding(true)
      await LeadsService.descartar(leadToDiscard.id, motivoFinal, {
        id: user?.id || '',
        nome: user?.name,
        email: user?.email,
      })
      toast({
        title: 'Lead descartado',
        description: `"${leadToDiscard.nome}" foi removido da fila de qualificação.`,
      })
      setLeadToDiscard(null)
      setMotivoCustom('')
      fetchLeads()
      refreshCounterAguardando()
    } catch (err) {
      console.error('Error discarding lead:', err)
      toast({
        title: 'Erro ao descartar lead',
        description: 'Não foi possível descartar o lead. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsDiscarding(false)
    }
  }

  const toggleStatusFilter = (st: LeadStatus) => {
    setPage(1)
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((item) => item !== st) : [...prev, st],
    )
  }

  const resetFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setSelectedStatuses([])
    setSelectedOwner('all')
    setSortBy('-created')
    setPage(1)
  }

  const handleDeleteLead = async () => {
    if (!leadToDelete) return
    const leadId = leadToDelete.id
    const leadNome = leadToDelete.nome

    try {
      setIsDeleting(true)
      await LeadsService.deleteLead(leadId)

      // Atualização otimista imediata na lista
      setLeads((prev) => prev.filter((l) => l.id !== leadId))
      setTotalItems((prev) => Math.max(0, prev - 1))

      toast({
        title: 'Lead excluído',
        description: `O lead "${leadNome}" foi removido com sucesso.`,
      })
      setLeadToDelete(null)
      fetchLeads()
    } catch (err: unknown) {
      console.error('Erro ao excluir lead:', err)
      const errorMsg = toPortugueseErrorMessage(
        err,
        'Não foi possível excluir o lead. Tente novamente mais tarde.',
      )

      toast({
        title: 'Erro ao excluir lead',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getOwnerName = (lead: Lead) => {
    if (lead.expand?.proprietario?.name) return lead.expand.proprietario.name
    if (lead.expand?.proprietario?.email) return lead.expand.proprietario.email
    return 'Equipe'
  }

  return (
    <div className="space-y-6 select-none animate-fade-in-up">
      {/* Header with Title and Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Leads Comerciais
            </h2>
            {countAguardando > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                <Clock className="w-3 h-3 text-amber-700" />
                {countAguardando} aguardando
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie contatos, prazos de SLA e proposta de cada oportunidade solar
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            onClick={() => navigate('/leads/importar')}
            className="border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-medium text-xs h-9.5 px-3.5 gap-1.5 rounded-lg shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#0B7A5B]" />
            <span>Importar</span>
          </Button>

          <Button
            onClick={() => navigate('/leads/novo')}
            className="bg-[#0B7A5B] hover:bg-[#095C44] text-white font-medium shadow-sm shadow-[#0B7A5B]/30 gap-1.5 h-9.5 px-4 rounded-lg"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Cadastrar Lead</span>
          </Button>
        </div>
      </div>

      {/* Abas de Navegação: Funil Principal vs Aguardando Qualificação vs Descartados */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => {
            setTabView('funil')
            setPage(1)
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            tabView === 'funil'
              ? 'bg-[#0B7A5B] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Funil Comercial</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTabView('aguardando')
            setPage(1)
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all relative ${
            tabView === 'aguardando'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-700 hover:bg-amber-50 hover:text-amber-900'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Aguardando Qualificação</span>
          {countAguardando > 0 && (
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                tabView === 'aguardando' ? 'bg-white text-amber-800' : 'bg-amber-500 text-white'
              }`}
            >
              {countAguardando}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setTabView('descartados')
            setPage(1)
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            tabView === 'descartados'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>Descartados</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="pl-9 h-10 text-sm border-slate-200 focus-visible:ring-[#0B7A5B]"
            />
          </div>

          {/* Owner Filter (if Admin) */}
          {isAdmin && (
            <div className="w-full md:w-52">
              <select
                value={selectedOwner}
                onChange={(e) => {
                  setSelectedOwner(e.target.value)
                  setPage(1)
                }}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
              >
                <option value="all">Todos os Proprietários</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort By */}
          <div className="w-full md:w-52">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                setPage(1)
              }}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
            >
              <option value="-created">Mais recentes primeiro</option>
              <option value="created">Mais antigos primeiro</option>
              <option value="-consumo_mensal_kwh">Maior consumo (kWh)</option>
              <option value="sla_limite">Prazo SLA mais urgente</option>
              <option value="-preco_venda">Maior valor de venda</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(debouncedSearch || selectedStatuses.length > 0 || selectedOwner !== 'all') && (
            <Button
              variant="outline"
              onClick={resetFilters}
              className="h-10 text-xs font-semibold text-slate-600 gap-1.5 border-dashed border-slate-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar filtros</span>
            </Button>
          )}
        </div>

        {/* Status Multi-select Chips (apenas no Funil) */}
        {tabView === 'funil' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Etapas:
            </span>
            {ALL_STATUSES.map((st) => {
              const isSelected = selectedStatuses.includes(st)
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => toggleStatusFilter(st)}
                  className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                    isSelected
                      ? 'bg-[#0B7A5B] text-white border-[#0B7A5B] shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              )
            })}
          </div>
        )}

        {tabView === 'aguardando' && (
          <div className="pt-2 border-t border-amber-100 flex items-center gap-2 text-xs text-amber-800 bg-amber-50/70 p-2.5 rounded-lg border">
            <Inbox className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Fila de Pré-Qualificação:</strong> leads recebidos através do formulário do
              site <em>ecoenergy.net.br</em>. Eles não entram no funil principal e o SLA de 7 dias
              só começa quando forem qualificados.
            </span>
          </div>
        )}

        {tabView === 'descartados' && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border">
            <UserX className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              <strong>Leads Descartados na Triagem:</strong> contatos filtrados por estarem fora da
              região de atendimento, testes ou não atenderem aos critérios comerciais.
            </span>
          </div>
        )}
      </div>

      {/* Main Content: Desktop Table & Mobile Cards */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-[#0B7A5B] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-medium">Carregando leads...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {debouncedSearch || selectedStatuses.length > 0 || selectedOwner !== 'all'
                ? 'Nenhum lead encontrado'
                : 'Nenhum lead ainda'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              {debouncedSearch || selectedStatuses.length > 0 || selectedOwner !== 'all'
                ? 'Não encontramos nenhum lead com os filtros aplicados.'
                : 'Sua carteira de leads está vazia no momento — cadastre o primeiro lead para iniciar seu pipeline comercial.'}
            </p>
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                onClick={() => navigate('/leads/importar')}
                className="text-xs font-semibold gap-1.5 h-9 border-slate-300 text-slate-700"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#0B7A5B]" />
                <span>Importar Planilha Luvik</span>
              </Button>
              <Button
                onClick={() => navigate('/leads/novo')}
                className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5 h-9"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar primeiro lead</span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Lead</th>
                    <th className="py-3 px-4">Contato</th>
                    <th className="py-3 px-4">Consumo / Conta</th>
                    <th className="py-3 px-4">
                      {tabView === 'aguardando'
                        ? 'Origem'
                        : tabView === 'descartados'
                          ? 'Motivo Descarte'
                          : 'Estágio'}
                    </th>
                    <th className="py-3 px-4">
                      {tabView === 'aguardando'
                        ? 'Status Fila'
                        : tabView === 'descartados'
                          ? 'Descartado em'
                          : 'SLA (Prazo)'}
                    </th>
                    <th className="py-3 px-4">Proprietário</th>
                    <th className="py-3 px-4">Recebido em</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead) => {
                    const isAguardando = lead.status_qualificacao === 'aguardando'
                    const isDescartado = lead.status_qualificacao === 'descartado'
                    const sla = computeSLAStatus(
                      lead.sla_limite,
                      lead.status,
                      lead.status_qualificacao,
                    )
                    const ownerName = getOwnerName(lead)

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors group ${
                          isAguardando
                            ? 'bg-amber-50/30'
                            : isDescartado
                              ? 'bg-slate-50/50 opacity-80'
                              : ''
                        }`}
                      >
                        {/* Name & Initials */}
                        <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-[#0B7A5B]">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center border shrink-0 ${
                                isAguardando
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : isDescartado
                                    ? 'bg-slate-200 text-slate-600 border-slate-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {lead.nome.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span
                                className={`block truncate ${
                                  sla.isOverdue ? 'text-red-700 font-bold' : ''
                                }`}
                              >
                                {lead.nome}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-normal">
                                {lead.cidade && (
                                  <span>
                                    {lead.cidade}/{lead.estado}
                                  </span>
                                )}
                                {lead.tipo_imovel && <span>• {lead.tipo_imovel}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          <div className="truncate max-w-[180px]">{lead.email}</div>
                          <div className="text-[11px] text-slate-400">{lead.telefone || '-'}</div>
                        </td>

                        {/* Consumption */}
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-800 font-mono-numbers">
                          {lead.consumo_mensal_kwh > 0 ? `${lead.consumo_mensal_kwh} kWh` : '-'}
                          <div className="text-[11px] font-normal text-slate-400">
                            {lead.valor_conta_reais && lead.valor_conta_reais > 0
                              ? `Conta: ${formatBRL(lead.valor_conta_reais)}`
                              : formatBRL(lead.preco_venda)}
                          </div>
                        </td>

                        {/* Column 4: Estágio / Origem / Motivo */}
                        <td className="py-3.5 px-4">
                          {tabView === 'aguardando' ? (
                            <Badge
                              variant="outline"
                              className="text-xs bg-sky-50 text-sky-700 border-sky-300"
                            >
                              Site ({lead.origem || 'Site'})
                            </Badge>
                          ) : tabView === 'descartados' ? (
                            <span className="text-xs text-slate-600 font-medium">
                              {lead.motivo_descarte || 'Sem motivo especificado'}
                            </span>
                          ) : (
                            <div className="flex flex-col items-start gap-1">
                              <Badge
                                variant="outline"
                                className={`text-xs px-2 py-0.5 rounded-md font-medium border ${getStatusBadgeStyle(
                                  lead.status,
                                )}`}
                              >
                                {lead.status}
                              </Badge>
                              {lead.qualificada_ia && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  <Bot className="w-2.5 h-2.5" />
                                  Amanda (IA)
                                </span>
                              )}
                              {lead.status === 'Fechado Perdido' && lead.motivo_perda && (
                                <span
                                  className="text-[11px] text-rose-700 font-medium truncate max-w-[170px]"
                                  title={`Motivo da perda: ${lead.motivo_perda}`}
                                >
                                  Motivo: {lead.motivo_perda}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Column 5: SLA Status / Status da Fila */}
                        <td className="py-3.5 px-4">
                          {isAguardando ? (
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-300 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Aguardando Qualificação
                              </span>
                              <span className="text-[10px] text-slate-400">
                                SLA iniciará após qualificar
                              </span>
                            </div>
                          ) : isDescartado ? (
                            <span className="text-xs text-slate-400">
                              {lead.updated ? formatDateBR(lead.updated) : '-'}
                            </span>
                          ) : (
                            <div className="flex flex-col items-start gap-0.5">
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-full border ${sla.chipClass}`}
                              >
                                {sla.label}
                              </span>
                              {lead.sla_limite && (
                                <span className="text-[10px] text-slate-400">
                                  Limite: {formatDateBR(lead.sla_limite)}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Owner */}
                        <td className="py-3.5 px-4 text-xs text-slate-600 truncate max-w-[120px]">
                          {ownerName}
                        </td>

                        {/* Created At */}
                        <td className="py-3.5 px-4 text-xs text-slate-400">
                          {formatDateBR(lead.created)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Botões diretos para Aguardando Qualificação */}
                            {isAguardando && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleQualificar(lead)}
                                  disabled={qualifyingId === lead.id}
                                  className="h-8 px-2.5 text-xs bg-[#0B7A5B] hover:bg-[#095C44] text-white gap-1 font-semibold shadow-xs"
                                  title="Qualificar lead e transferir para o funil no estágio Novo"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>
                                    {qualifyingId === lead.id ? 'Qualificando...' : 'Qualificar'}
                                  </span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setLeadToDiscard(lead)}
                                  className="h-8 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  title="Descartar lead"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Descartar</span>
                                </Button>
                              </>
                            )}

                            {canDeleteLead(lead) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLeadToDelete(lead)}
                                title="Excluir lead permanentemente"
                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => navigate(`/leads/${lead.id}`)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  <span>Ver detalhes</span>
                                </DropdownMenuItem>
                                {isAguardando && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleQualificar(lead)}>
                                      <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                                      <span className="text-emerald-700 font-medium">
                                        Qualificar Lead
                                      </span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setLeadToDiscard(lead)}>
                                      <UserX className="w-4 h-4 mr-2 text-red-600" />
                                      <span className="text-red-600">Descartar Lead</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem
                                  onClick={() => navigate(`/leads/${lead.id}/editar`)}
                                >
                                  <Edit3 className="w-4 h-4 mr-2" />
                                  <span>Editar</span>
                                </DropdownMenuItem>
                                {canDeleteLead(lead) && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setLeadToDelete(lead)}
                                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      <span>Excluir</span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {leads.map((lead) => {
                const isAguardando = lead.status_qualificacao === 'aguardando'
                const isDescartado = lead.status_qualificacao === 'descartado'
                const sla = computeSLAStatus(lead.sla_limite, lead.status, lead.status_qualificacao)
                return (
                  <div
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className={`p-4 space-y-3 cursor-pointer hover:bg-slate-50/80 transition-colors ${
                      isAguardando
                        ? 'bg-amber-50/30'
                        : isDescartado
                          ? 'bg-slate-50/50 opacity-80'
                          : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4
                          className={`text-base font-bold text-slate-900 ${
                            sla.isOverdue ? 'text-red-700' : ''
                          }`}
                        >
                          {lead.nome}
                        </h4>
                        <p className="text-xs text-slate-500">{lead.email}</p>
                      </div>
                      {isAguardando ? (
                        <Badge
                          variant="outline"
                          className="text-xs bg-amber-50 text-amber-800 border-amber-300"
                        >
                          Aguardando
                        </Badge>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5">
                          <Badge
                            variant="outline"
                            className={`text-xs px-2 py-0.5 border ${getStatusBadgeStyle(lead.status)}`}
                          >
                            {lead.status}
                          </Badge>
                          {lead.qualificada_ia && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <Bot className="w-2.5 h-2.5" />
                              Amanda (IA)
                            </span>
                          )}
                          {lead.status === 'Fechado Perdido' && lead.motivo_perda && (
                            <span
                              className="text-[10px] text-rose-700 font-medium truncate max-w-[160px]"
                              title={`Motivo da perda: ${lead.motivo_perda}`}
                            >
                              {lead.motivo_perda}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Consumo:
                        </span>
                        <span className="font-semibold text-slate-800">
                          {lead.consumo_mensal_kwh > 0 ? `${lead.consumo_mensal_kwh} kWh/mês` : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          {lead.valor_conta_reais ? 'Valor Conta:' : 'Valor Estimado:'}
                        </span>
                        <span className="font-semibold text-slate-800 font-mono-numbers">
                          {lead.valor_conta_reais && lead.valor_conta_reais > 0
                            ? formatBRL(lead.valor_conta_reais)
                            : formatBRL(lead.preco_venda)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${sla.chipClass}`}
                      >
                        {sla.label}
                      </span>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {isAguardando && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleQualificar(lead)}
                              disabled={qualifyingId === lead.id}
                              className="h-8 px-2 text-xs bg-[#0B7A5B] hover:bg-[#095C44] text-white"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Qualificar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setLeadToDiscard(lead)}
                              className="h-8 px-2 text-xs text-red-600 border-red-200"
                            >
                              <UserX className="w-3.5 h-3.5 mr-1" />
                              Descartar
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/leads/${lead.id}/editar`)}
                          className="h-8 px-2 text-xs text-slate-600"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" />
                          Editar
                        </Button>
                        {canDeleteLead(lead) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLeadToDelete(lead)}
                            className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Mostrando <span className="font-semibold text-slate-700">{leads.length}</span> de{' '}
                <span className="font-semibold text-slate-700">{totalItems}</span> leads
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs gap-1 border-slate-200"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </Button>
                <span className="text-xs font-semibold text-slate-700 px-2 font-mono-numbers">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 text-xs gap-1 border-slate-200"
                >
                  <span>Próxima</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de Descarte de Lead com Confirmação e Motivo */}
      <Dialog open={!!leadToDiscard} onOpenChange={(open) => !open && setLeadToDiscard(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Descartar Lead da Qualificação?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              O lead <strong>"{leadToDiscard?.nome}"</strong> será marcado como descartado e não
              entrará no funil de vendas.
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
              disabled={isDiscarding}
              onClick={() => setLeadToDiscard(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDiscarding || (motivoDescarte === 'Outro' && !motivoCustom.trim())}
              onClick={handleConfirmarDescarte}
              className="text-xs bg-red-600 hover:bg-red-700"
            >
              {isDiscarding ? 'Descartando...' : 'Confirmar Descarte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteLeadDialog
        open={!!leadToDelete}
        onOpenChange={(open) => !open && setLeadToDelete(null)}
        leadName={leadToDelete?.nome}
        isDeleting={isDeleting}
        onConfirm={handleDeleteLead}
      />
    </div>
  )
}
