import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  CheckCheck,
  MapPin,
  Phone,
  Building,
  User,
  ExternalLink,
  Loader2,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import useRealtime from '@/hooks/use-realtime'
import { NotificacoesService } from '@/services/notificacoes'
import type { NotificacaoCRM } from '@/types/crm'
import { formatDateBR } from '@/lib/solarUtils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'

interface NotificationBellProps {
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

export function NotificationBell({ side = 'right', align = 'end' }: NotificationBellProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notificacoes, setNotificacoes] = useState<NotificacaoCRM[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotificacoes = useCallback(async () => {
    if (!user?.id) return
    try {
      const [list, count] = await Promise.all([
        NotificacoesService.getNotificacoes(user.id, 30),
        NotificacoesService.countNaoLidas(user.id),
      ])
      setNotificacoes(list)
      setUnreadCount(count)
    } catch (err) {
      console.error('Erro ao carregar notificações:', err)
    }
  }, [user?.id])

  useEffect(() => {
    fetchNotificacoes()
  }, [fetchNotificacoes])

  // Escuta realtime na coleção de notificações
  useRealtime('notificacoes', () => {
    fetchNotificacoes()
  })

  const handleMarcarComoLida = async (item: NotificacaoCRM, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (item.lida) return

    try {
      await NotificacoesService.marcarComoLida(item.id)
      setNotificacoes((prev) => prev.map((n) => (n.id === item.id ? { ...n, lida: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Erro ao marcar como lida:', err)
      toast({
        title: 'Erro ao atualizar notificação',
        variant: 'destructive',
      })
    }
  }

  const handleMarcarTodasComoLidas = async () => {
    if (!user?.id || unreadCount === 0) return
    try {
      setMarkingAll(true)
      await NotificacoesService.marcarTodasComoLidas(user.id)
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
      setUnreadCount(0)
      toast({
        title: 'Notificações marcadas como lidas',
        description: 'Todas as notificações foram marcadas como lidas.',
      })
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err)
      toast({
        title: 'Erro ao marcar notificações',
        variant: 'destructive',
      })
    } finally {
      setMarkingAll(false)
    }
  }

  const handleItemClick = async (item: NotificacaoCRM) => {
    if (!item.lida) {
      await handleMarcarComoLida(item)
    }
    setIsOpen(false)
    if (item.lead) {
      navigate(`/leads/${item.lead}`)
    } else {
      navigate('/leads')
    }
  }

  const handleExcluir = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await NotificacoesService.excluirNotificacao(id)
      setNotificacoes((prev) => prev.filter((n) => n.id !== id))
      fetchNotificacoes()
    } catch (err) {
      console.error('Erro ao excluir notificação:', err)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notificações: ${unreadCount} não lidas`}
          className="relative group flex items-center justify-center w-9 h-9 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
          title={
            unreadCount > 0
              ? `${unreadCount} nova(s) notificação(ões)`
              : 'Nenhuma notificação não lida'
          }
        >
          <Bell className="w-5 h-5 transition-transform group-hover:scale-110 text-slate-300 group-hover:text-amber-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-[#0F172A] animate-pulse shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className="w-[360px] sm:w-[400px] p-0 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 text-slate-900"
      >
        {/* Cabeçalho */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#0B7A5B]/30 border border-[#0B7A5B]/50">
              <Bell className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
                <span>Notificações</span>
                {unreadCount > 0 && (
                  <Badge className="bg-rose-500 hover:bg-rose-500 text-white text-[10px] px-1.5 py-0 h-4">
                    {unreadCount} novas
                  </Badge>
                )}
              </h4>
              <p className="text-[11px] text-slate-400">
                Alertas de novos leads da sua cidade e do CRM
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={markingAll}
              onClick={handleMarcarTodasComoLidas}
              className="h-7 text-[11px] text-emerald-400 hover:text-white hover:bg-slate-800 px-2 gap-1"
              title="Marcar todas como lidas"
            >
              {markingAll ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Ler todas</span>
            </Button>
          )}
        </div>

        {/* Lista de Notificações */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
          {notificacoes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Bell className="w-5 h-5 opacity-40" />
              </div>
              <p className="text-xs font-medium text-slate-600">Nenhuma notificação no momento</p>
              <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto">
                Quando novos leads da sua cidade de atuação entrarem no CRM, você será avisado aqui.
              </p>
            </div>
          ) : (
            notificacoes.map((item) => {
              const isLeadCidade = item.tipo === 'lead_cidade'
              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 transition-colors cursor-pointer group flex items-start gap-3 relative ${
                    item.lida
                      ? 'bg-white hover:bg-slate-50/80 text-slate-700'
                      : 'bg-emerald-50/40 hover:bg-emerald-50/70 text-slate-900 border-l-3 border-[#0B7A5B]'
                  }`}
                >
                  {/* Ícone Indicador */}
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isLeadCidade
                        ? item.lida
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-emerald-100 text-[#0B7A5B] border border-emerald-200'
                        : item.lida
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {isLeadCidade ? <MapPin className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h5
                        className={`text-xs leading-snug line-clamp-1 ${
                          item.lida ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'
                        }`}
                      >
                        {item.titulo}
                      </h5>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium whitespace-nowrap">
                        {formatDateBR(item.created)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {item.mensagem}
                    </p>

                    {/* Ficha rápida do Lead: Nome, Cidade, Bairro e Telefone */}
                    {isLeadCidade && (
                      <div className="pt-1.5 pb-0.5 grid grid-cols-1 gap-1 text-[11px] text-slate-600 bg-white/80 p-2 rounded-md border border-slate-200/70">
                        {item.lead_nome && (
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 truncate">
                            <User className="w-3 h-3 text-[#0B7A5B] shrink-0" />
                            <span className="truncate">{item.lead_nome}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-500">
                          {item.lead_cidade && (
                            <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/80">
                              <MapPin className="w-2.5 h-2.5 text-[#0B7A5B]" />
                              <span>{item.lead_cidade}</span>
                            </span>
                          )}
                          {item.lead_bairro && item.lead_bairro !== 'Não informado' && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.2 rounded">
                              <Building className="w-2.5 h-2.5 text-slate-500" />
                              <span>Bairro: {item.lead_bairro}</span>
                            </span>
                          )}
                          {item.lead_telefone && (
                            <span className="inline-flex items-center gap-1 text-slate-700 font-mono font-medium">
                              <Phone className="w-2.5 h-2.5 text-slate-500" />
                              <span>{item.lead_telefone}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Ações Rápidas no Hover */}
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span className="inline-flex items-center gap-1 text-[#0B7A5B] font-medium group-hover:underline">
                        <span>Ver lead no CRM</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>

                      <div className="flex items-center gap-1.5">
                        {!item.lida && (
                          <button
                            type="button"
                            onClick={(e) => handleMarcarComoLida(item, e)}
                            className="p-1 rounded text-slate-400 hover:text-[#0B7A5B] hover:bg-emerald-50"
                            title="Marcar como lida"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleExcluir(item.id, e)}
                          className="p-1 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                          title="Excluir notificação"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Rodapé informativo */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-[11px] text-slate-500">
            Cadastre sua <strong>cidade de atuação</strong> em <em>/equipe</em> para receber leads
            direcionados.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
