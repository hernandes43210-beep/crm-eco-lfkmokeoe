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
} from 'lucide-react'
import { LeadsService } from '@/services/leads'
import { EquipeService } from '@/services/equipe'
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

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true)
      const res = await LeadsService.getLeads({
        page,
        perPage: 20,
        search: debouncedSearch,
        status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        proprietario: selectedOwner !== 'all' ? selectedOwner : undefined,
        sort: sortBy,
      })
      setLeads(res.items)
      setTotalItems(res.totalItems)
      setTotalPages(res.totalPages || 1)
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
  }, [page, debouncedSearch, selectedStatuses, selectedOwner, sortBy])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Real-time subscription
  useRealtime<Lead>('leads', () => {
    fetchLeads()
  })

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
      console.error('Error deleting lead:', err)
      const errorMsg =
        err &&
        typeof err === 'object' &&
        'status' in err &&
        (err as { status?: number }).status === 403
          ? 'Você não tem permissão para excluir este lead. Apenas administradores e o responsável podem excluir.'
          : 'Não foi possível excluir o lead. Tente novamente mais tarde.'

      toast({
        title: 'Erro ao excluir',
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
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Leads Comerciais
          </h2>
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

        {/* Status Multi-select Chips */}
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
                    <th className="py-3 px-4">Consumo</th>
                    <th className="py-3 px-4">Estágio</th>
                    <th className="py-3 px-4">SLA (Prazo)</th>
                    <th className="py-3 px-4">Proprietário</th>
                    <th className="py-3 px-4">Criado em</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead) => {
                    const sla = computeSLAStatus(lead.sla_limite, lead.status)
                    const ownerName = getOwnerName(lead)
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        {/* Name & Initials */}
                        <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-[#0B7A5B]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
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
                              {lead.cidade && (
                                <span className="text-[11px] text-slate-400 font-normal">
                                  {lead.cidade}/{lead.estado}
                                </span>
                              )}
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
                          {lead.consumo_mensal_kwh} kWh
                          <div className="text-[11px] font-normal text-slate-400">
                            {formatBRL(lead.preco_venda)}
                          </div>
                        </td>

                        {/* Status Chip */}
                        <td className="py-3.5 px-4">
                          <Badge
                            variant="outline"
                            className={`text-xs px-2 py-0.5 rounded-md font-medium border ${getStatusBadgeStyle(
                              lead.status,
                            )}`}
                          >
                            {lead.status}
                          </Badge>
                        </td>

                        {/* SLA Status Chip */}
                        <td className="py-3.5 px-4">
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
                          <div className="flex items-center justify-end gap-1">
                            {canDeleteLead(lead) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLeadToDelete(lead)}
                                title="Excluir lead"
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
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem onClick={() => navigate(`/leads/${lead.id}`)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  <span>Ver detalhes</span>
                                </DropdownMenuItem>
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
                const sla = computeSLAStatus(lead.sla_limite, lead.status)
                return (
                  <div
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="p-4 space-y-3 cursor-pointer hover:bg-slate-50/80 transition-colors"
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
                      <Badge
                        variant="outline"
                        className={`text-xs px-2 py-0.5 border ${getStatusBadgeStyle(lead.status)}`}
                      >
                        {lead.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Consumo:
                        </span>
                        <span className="font-semibold text-slate-800">
                          {lead.consumo_mensal_kwh} kWh/mês
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Valor Estimado:
                        </span>
                        <span className="font-semibold text-slate-800 font-mono-numbers">
                          {formatBRL(lead.preco_venda)}
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
