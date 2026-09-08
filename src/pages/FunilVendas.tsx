import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  MoreVertical,
  Eye,
  Edit3,
  AlertTriangle,
  MoveRight,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react'
import { LeadsService } from '@/services/leads'
import type { Lead, LeadStatus } from '@/types/crm'
import useRealtime from '@/hooks/use-realtime'
import { computeSLAStatus, formatBRL } from '@/lib/solarUtils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/hooks/use-toast'

interface ColumnDef {
  key: LeadStatus
  title: string
  color: string
  dotClass: string
  borderColor: string
}

const KANBAN_COLUMNS: ColumnDef[] = [
  {
    key: 'Novo',
    title: 'Novo',
    color: '#3B82F6',
    dotClass: 'bg-blue-500',
    borderColor: 'border-t-blue-500',
  },
  {
    key: 'Contato Feito',
    title: 'Contato Feito',
    color: '#06B6D4',
    dotClass: 'bg-cyan-500',
    borderColor: 'border-t-cyan-500',
  },
  {
    key: 'Proposta Enviada',
    title: 'Proposta Enviada',
    color: '#F59E0B',
    dotClass: 'bg-amber-500',
    borderColor: 'border-t-amber-500',
  },
  {
    key: 'Negociação',
    title: 'Negociação',
    color: '#8B5CF6',
    dotClass: 'bg-purple-500',
    borderColor: 'border-t-purple-500',
  },
  {
    key: 'Fechado Ganho',
    title: 'Fechado Ganho',
    color: '#10B981',
    dotClass: 'bg-emerald-500',
    borderColor: 'border-t-emerald-500',
  },
  {
    key: 'Fechado Perdido',
    title: 'Fechado Perdido',
    color: '#EF4444',
    dotClass: 'bg-rose-500',
    borderColor: 'border-t-rose-500',
  },
]

export default function FunilVendas() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<LeadStatus | null>(null)

  const fetchLeads = async () => {
    try {
      const data = await LeadsService.getAllLeads()
      setLeads(data)
    } catch (err) {
      console.error('Error fetching leads for funil:', err)
      toast({
        title: 'Erro ao carregar funil',
        description: 'Não foi possível carregar as etapas de vendas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  // Real-time subscription
  useRealtime<Lead>('leads', () => {
    fetchLeads()
  })

  // Optimistic status update
  const moveLeadToStage = async (leadId: string, newStatus: LeadStatus) => {
    const targetLead = leads.find((l) => l.id === leadId)
    if (!targetLead || targetLead.status === newStatus) return

    const previousStatus = targetLead.status

    // Optimistic UI update
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)))

    try {
      let currentHist = targetLead.historico
      if (typeof currentHist === 'string') {
        try {
          currentHist = JSON.parse(currentHist)
        } catch (_) {
          currentHist = []
        }
      }
      let historyList = Array.isArray(currentHist) ? currentHist : []
      historyList = [
        ...historyList,
        {
          data: new Date().toISOString(),
          tipo: 'status',
          descricao: `Lead movido no funil de '${previousStatus}' para '${newStatus}'.`,
        },
      ]

      await LeadsService.updateLead(leadId, {
        status: newStatus,
        // Enviar como JSON string ou array para compatibilidade
        historico: historyList,
        pr_assinada_ganho: newStatus === 'Fechado Ganho' ? true : targetLead.pr_assinada_ganho,
      })

      toast({
        title: 'Lead atualizado',
        description: `Movido com sucesso para "${newStatus}".`,
      })
    } catch (err) {
      console.error('Failed to move lead:', err)
      // Revert optimistic update
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: previousStatus } : l)))
      toast({
        title: 'Falha ao mover',
        description: 'Não foi possível salvar a alteração. Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  // HTML5 Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId)
    e.dataTransfer.setData('text/plain', leadId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, colStatus: LeadStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCol !== colStatus) {
      setDragOverCol(colStatus)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverCol(null)
  }

  const handleDrop = (e: React.DragEvent, colStatus: LeadStatus) => {
    e.preventDefault()
    setDragOverCol(null)
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId
    if (leadId) {
      moveLeadToStage(leadId, colStatus)
    }
    setDraggedLeadId(null)
  }

  return (
    <div className="space-y-6 select-none animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Funil de Vendas Solar
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Arraste os cards entre as colunas para atualizar a fase de negociação em tempo real
          </p>
        </div>

        <Button
          onClick={() => navigate('/leads/novo')}
          className="bg-[#0B7A5B] hover:bg-[#095C44] text-white font-medium shadow-sm shadow-[#0B7A5B]/30 gap-1.5 h-9.5 px-4 rounded-lg self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo Lead</span>
        </Button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-[#0B7A5B] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm">Carregando colunas do funil...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#0B7A5B] flex items-center justify-center mb-3">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Nenhum lead no funil ainda</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
            Cadastre seu primeiro lead para visualizar e movimentar as etapas da negociação no
            quadro Kanban.
          </p>
          <Button
            onClick={() => navigate('/leads/novo')}
            className="bg-[#0B7A5B] hover:bg-[#095C44] text-white font-medium gap-1.5 h-9 px-4 rounded-lg"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Cadastrar Primeiro Lead</span>
          </Button>
        </div>
      ) : (
        /* Kanban Board Horizontal Container */
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 min-h-[calc(100vh-220px)] items-start">
          {KANBAN_COLUMNS.map((col) => {
            const columnLeads = leads.filter((l) => l.status === col.key)
            const hasOverdueLeads = columnLeads.some((l) => {
              if (col.key === 'Fechado Ganho' || col.key === 'Fechado Perdido') return false
              const s = computeSLAStatus(l.sla_limite, l.status)
              return s.isOverdue
            })
            const isDropTarget = dragOverCol === col.key

            return (
              <div
                key={col.key}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`w-[290px] shrink-0 rounded-xl bg-slate-100/80 border transition-all duration-200 flex flex-col max-h-[calc(100vh-230px)] ${
                  hasOverdueLeads
                    ? 'border-t-4 border-t-red-500 border-slate-200 shadow-xs'
                    : `border-t-4 ${col.borderColor} border-slate-200`
                } ${
                  isDropTarget ? 'ring-2 ring-[#0B7A5B] bg-emerald-50/40 border-emerald-300' : ''
                }`}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-slate-200/90 flex items-center justify-between bg-white/70 rounded-t-lg backdrop-blur-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: col.color }}
                    ></span>
                    <h3 className="font-bold text-sm text-slate-800 tracking-tight">{col.title}</h3>
                  </div>

                  <span className="text-xs font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full font-mono-numbers">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5">
                  {columnLeads.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                      Nenhum lead nesta etapa
                    </div>
                  ) : (
                    columnLeads.map((lead) => {
                      const sla = computeSLAStatus(lead.sla_limite, lead.status)
                      const isDragging = draggedLeadId === lead.id
                      const initials = lead.nome.slice(0, 2).toUpperCase()

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className={`p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 cursor-grab active:cursor-grabbing transition-all duration-150 relative group ${
                            isDragging ? 'opacity-40 scale-95' : 'hover:-translate-y-0.5'
                          } ${sla.isOverdue ? 'border-l-4 border-l-red-500' : ''}`}
                        >
                          {/* Card Top: Lead Name & Menu */}
                          <div className="flex items-start justify-between gap-1.5">
                            <h4
                              className={`text-sm font-bold text-slate-900 group-hover:text-[#0B7A5B] transition-colors truncate ${
                                sla.isOverdue ? 'text-red-700' : ''
                              }`}
                            >
                              {lead.nome}
                            </h4>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-400 hover:text-slate-700 -mr-1 -mt-1"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem onClick={() => navigate(`/leads/${lead.id}`)}>
                                  <Eye className="w-3.5 h-3.5 mr-2" />
                                  <span>Ver Lead</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => navigate(`/leads/${lead.id}/editar`)}
                                >
                                  <Edit3 className="w-3.5 h-3.5 mr-2" />
                                  <span>Editar</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Email */}
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{lead.email}</p>

                          {/* Consumption & Price */}
                          <div className="flex items-center justify-between text-xs pt-2 mt-2 border-t border-slate-100">
                            <span className="font-semibold text-slate-700 font-mono-numbers">
                              {lead.consumo_mensal_kwh} kWh
                            </span>
                            <span className="font-bold text-[#0B7A5B] font-mono-numbers">
                              {formatBRL(lead.preco_venda)}
                            </span>
                          </div>

                          {/* Card Footer: SLA Chip & Owner Avatar */}
                          <div className="flex items-center justify-between pt-2 mt-2">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${sla.chipClass}`}
                            >
                              {sla.label}
                            </span>

                            <div
                              title={`Proprietário: ${lead.expand?.proprietario?.name || 'Equipe'}`}
                              className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center border border-slate-200 shrink-0"
                            >
                              {initials}
                            </div>
                          </div>

                          {/* Mobile Fallback: Direct "Mover para" select menu */}
                          <div
                            className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-slate-400 font-medium">Mover:</span>
                            <select
                              value={lead.status}
                              onChange={(e) =>
                                moveLeadToStage(lead.id, e.target.value as LeadStatus)
                              }
                              className="text-[11px] py-0.5 px-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#0B7A5B]"
                            >
                              {KANBAN_COLUMNS.map((c) => (
                                <option key={c.key} value={c.key}>
                                  {c.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
