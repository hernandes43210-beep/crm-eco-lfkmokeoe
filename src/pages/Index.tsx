import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Flame,
  Percent,
  CircleDollarSign,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
  SunMedium,
} from 'lucide-react'
import { LeadsService } from '@/services/leads'
import type { Lead, LeadStatus } from '@/types/crm'
import useRealtime from '@/hooks/use-realtime'
import { formatBRL, computeSLAStatus, getStatusBadgeStyle, formatDateBR } from '@/lib/solarUtils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const STAGES: { key: LeadStatus; label: string; color: string; bg: string }[] = [
  { key: 'Novo', label: 'Novo', color: '#3B82F6', bg: 'bg-blue-500' },
  { key: 'Contato Feito', label: 'Contato', color: '#06B6D4', bg: 'bg-cyan-500' },
  { key: 'Proposta Enviada', label: 'Proposta', color: '#F59E0B', bg: 'bg-amber-500' },
  { key: 'Negociação', label: 'Negociação', color: '#8B5CF6', bg: 'bg-purple-500' },
  { key: 'Fechado Ganho', label: 'Ganho', color: '#10B981', bg: 'bg-emerald-500' },
  { key: 'Fechado Perdido', label: 'Perdido', color: '#EF4444', bg: 'bg-rose-500' },
]

export default function Index() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLeads = async () => {
    try {
      const data = await LeadsService.getAllLeads()
      setLeads(data)
    } catch (err) {
      console.error('Error fetching leads for dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  // Live real-time updates
  useRealtime<Lead>('leads', () => {
    fetchLeads()
  })

  // KPIs Calculations
  const stats = useMemo(() => {
    const total = leads.length
    const emAberto = leads.filter(
      (l) => l.status !== 'Fechado Ganho' && l.status !== 'Fechado Perdido',
    ).length

    // Conversion rate: ganhos / leads that reached proposal or further
    const propostasOuAlem = leads.filter((l) =>
      ['Proposta Enviada', 'Negociação', 'Fechado Ganho', 'Fechado Perdido'].includes(l.status),
    ).length
    const ganhos = leads.filter((l) => l.status === 'Fechado Ganho').length
    const taxaConversao = propostasOuAlem > 0 ? Math.round((ganhos / propostasOuAlem) * 100) : 0

    // Revenue at play: sum of preco_venda across all leads except Fechado Perdido
    const receitaEmJogo = leads
      .filter((l) => l.status !== 'Fechado Perdido')
      .reduce((acc, curr) => acc + (curr.preco_venda || 0), 0)

    // Overdue leads
    const overdueLeads = leads
      .filter((l) => {
        if (l.status === 'Fechado Ganho' || l.status === 'Fechado Perdido') return false
        const sla = computeSLAStatus(l.sla_limite, l.status)
        return sla.isOverdue
      })
      .sort((a, b) => {
        const tA = new Date(a.sla_limite || 0).getTime()
        const tB = new Date(b.sla_limite || 0).getTime()
        return tA - tB // Most overdue first
      })

    // Stage counts
    const stageCounts: Record<LeadStatus, number> = {
      Novo: 0,
      'Contato Feito': 0,
      'Proposta Enviada': 0,
      Negociação: 0,
      'Fechado Ganho': 0,
      'Fechado Perdido': 0,
    }
    leads.forEach((l) => {
      if (stageCounts[l.status] !== undefined) {
        stageCounts[l.status]++
      }
    })

    return {
      total,
      emAberto,
      taxaConversao,
      ganhos,
      receitaEmJogo,
      overdueLeads,
      stageCounts,
      propostasOuAlem,
    }
  }, [leads])

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date())
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 select-none animate-fade-in-up">
      {/* Header with date */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Visão Geral do Funil
            </h2>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold gap-1 hover:bg-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Ao vivo
            </Badge>
          </div>
          <p className="text-sm text-slate-500 capitalize">{todayStr}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/funil')}
            className="text-xs font-semibold gap-1.5 h-8 border-slate-200 text-slate-700 hover:text-[#0B7A5B]"
          >
            <span>Ver Kanban do Funil</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Leads Totais */}
        <Card
          onClick={() => navigate('/leads')}
          className="card-lift cursor-pointer border-slate-200/80 shadow-xs hover:border-slate-300 transition-all bg-white"
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Leads Totais
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 font-mono-numbers">
                {stats.total}
              </span>
              <span className="text-xs text-slate-500 font-medium">cadastrados</span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Base ativa da operação</span>
            </div>
          </CardContent>
        </Card>

        {/* Leads em Aberto */}
        <Card
          onClick={() => navigate('/funil')}
          className="card-lift cursor-pointer border-slate-200/80 shadow-xs hover:border-amber-200 transition-all bg-white"
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Leads em Aberto
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-600 font-mono-numbers">
                {stats.emAberto}
              </span>
              <span className="text-xs text-slate-500 font-medium">em negociação</span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Requer acompanhamento</span>
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Conversão */}
        <Card className="card-lift border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Taxa de Conversão
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Percent className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#0B7A5B] font-mono-numbers">
                {stats.taxaConversao}%
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {stats.ganhos}/{stats.propostasOuAlem} propostas
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Eficiência de fechamento</span>
            </div>
          </CardContent>
        </Card>

        {/* Receita em Jogo */}
        <Card className="card-lift border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Receita em Jogo
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <CircleDollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-900 font-mono-numbers truncate">
                {formatBRL(stats.receitaEmJogo)}
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <SunMedium className="w-3.5 h-3.5 text-amber-500" />
              <span>Pipeline ativo (exceto perdas)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Status Chart: Horizontal Stacked Bar + Funil Visual */}
      <Card className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
              Distribuição do Pipeline por Estágio
            </CardTitle>
            <p className="text-xs text-slate-500">
              Volume proporcional de leads distribuídos nas 6 etapas do funil solar
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/funil')}
            className="text-xs text-[#0B7A5B] hover:text-[#095C44]"
          >
            Abrir Funil Completo
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {/* Horizontal multi-color stacked bar */}
          <div className="h-7 w-full bg-slate-100 rounded-lg overflow-hidden flex shadow-inner">
            {STAGES.map((st) => {
              const count = stats.stageCounts[st.key] || 0
              const percent = stats.total > 0 ? (count / stats.total) * 100 : 0
              if (percent <= 0) return null

              return (
                <div
                  key={st.key}
                  style={{
                    width: `${percent}%`,
                    backgroundColor: st.color,
                  }}
                  title={`${st.label}: ${count} leads (${percent.toFixed(1)}%)`}
                  className="h-full relative group transition-all duration-300 hover:opacity-90 flex items-center justify-center overflow-hidden"
                >
                  {percent > 8 && (
                    <span className="text-[11px] font-bold text-white drop-shadow-sm font-mono-numbers px-1">
                      {count}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend row */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
            {STAGES.map((st) => {
              const count = stats.stageCounts[st.key] || 0
              const percent = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
              return (
                <div
                  key={st.key}
                  onClick={() => navigate(`/funil`)}
                  className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: st.color }}
                    ></span>
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      {st.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-bold text-slate-900 font-mono-numbers">
                      {count}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">{percent}%</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Visual Step Funnel (Conversion Drop-off simulation) */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Progressão do Funil de Conversão
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {[
                { stage: 'Novo', count: stats.stageCounts['Novo'], color: '#3B82F6' },
                {
                  stage: 'Contato Feito',
                  count: stats.stageCounts['Contato Feito'],
                  color: '#06B6D4',
                },
                {
                  stage: 'Proposta Enviada',
                  count: stats.stageCounts['Proposta Enviada'],
                  color: '#F59E0B',
                },
                {
                  stage: 'Negociação',
                  count: stats.stageCounts['Negociação'],
                  color: '#8B5CF6',
                },
                {
                  stage: 'Fechado Ganho',
                  count: stats.stageCounts['Fechado Ganho'],
                  color: '#10B981',
                },
              ].map((step, idx) => (
                <div
                  key={step.stage}
                  className="p-3 rounded-lg bg-slate-50/90 border border-slate-200/70 flex flex-col justify-between relative"
                >
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span className="font-semibold">{step.stage}</span>
                    <span className="font-mono text-slate-400">Etapa {idx + 1}</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span
                      className="text-2xl font-extrabold font-mono-numbers"
                      style={{ color: step.color }}
                    >
                      {step.count}
                    </span>
                    <span className="text-xs text-slate-400">leads</span>
                  </div>
                  {/* Visual progress bar based on total */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: step.color,
                        width: `${stats.total > 0 ? (step.count / stats.total) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two columns: Leads em Atraso (High Urgency) & Próximos Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads em Atraso */}
        <Card className="border-red-200/70 shadow-xs bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Leads em Atraso</span>
                  {stats.overdueLeads.length > 0 && (
                    <Badge variant="destructive" className="h-5 px-1.5 text-[11px] font-bold">
                      {stats.overdueLeads.length}
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Prazo SLA estourado sem fechamento — requer ação prioritária
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/leads')}
              className="text-xs text-red-700 hover:text-red-800 hover:bg-red-50"
            >
              Ver todos
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {stats.overdueLeads.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Nenhum lead com prazo estourado!
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Excelente, a equipe comercial está mantendo todos os prazos em dia.
                </p>
              </div>
            ) : (
              stats.overdueLeads.slice(0, 5).map((lead) => {
                const sla = computeSLAStatus(lead.sla_limite, lead.status)
                return (
                  <div
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="p-3 rounded-lg border border-red-100 bg-red-50/30 hover:bg-red-50/70 hover:border-red-300 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 group-hover:text-red-700 transition-colors truncate">
                          {lead.nome}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${getStatusBadgeStyle(lead.status)}`}
                        >
                          {lead.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span>{lead.cidade ? `${lead.cidade}/${lead.estado}` : lead.email}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700 font-mono-numbers">
                          {lead.consumo_mensal_kwh} kWh/mês
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${sla.chipClass}`}>
                        {sla.label}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Próximos Leads / Recentes */}
        <Card className="border-slate-200/80 shadow-xs bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                Últimos Leads Cadastrados
              </CardTitle>
              <p className="text-xs text-slate-500">
                Oportunidades mais recentes recebidas no sistema
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/leads')}
              className="text-xs text-[#0B7A5B] hover:text-[#095C44]"
            >
              Ver tabela completa
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {leads.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Nenhum lead cadastrado ainda.
              </div>
            ) : (
              leads.slice(0, 5).map((lead) => {
                const sla = computeSLAStatus(lead.sla_limite, lead.status)
                return (
                  <div
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-200 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 group-hover:text-[#0B7A5B] transition-colors truncate">
                          {lead.nome}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${getStatusBadgeStyle(lead.status)}`}
                        >
                          {lead.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span>{lead.email}</span>
                        <span>•</span>
                        <span>{formatDateBR(lead.created)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${sla.chipClass}`}>
                        {sla.shortLabel}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#0B7A5B] transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
