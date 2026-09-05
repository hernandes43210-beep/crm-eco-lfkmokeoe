import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  MessageSquare,
  QrCode,
  Settings,
  RefreshCw,
  Send,
  UserPlus,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Search,
  Copy,
  Check,
  Power,
  Clock,
  ArrowUpRight,
  UserCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { WhatsAppService, type ConnectResponse, type StatusResponse } from '@/services/whatsapp'
import { LeadsService } from '@/services/leads'
import type { WhatsAppSettings, WhatsAppConversation, WhatsAppMessage, Lead } from '@/types/crm'

export default function WhatsAppPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = searchParams.get('tab') || 'inbox'
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab })
  }

  // --- Estado de Conexão e Configurações ---
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [apiUrl, setApiUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [instanceName, setInstanceName] = useState('solarcrm')
  const [savingSettings, setSavingSettings] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [qrCodeData, setQrCodeData] = useState<ConnectResponse['qrcode'] | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)

  // --- Estado de Inbox e Conversas ---
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [newMessageText, setNewMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // --- Modal Vincular a Lead Existente ---
  const [linkingModalOpen, setLinkingModalOpen] = useState(false)
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([])
  const [selectedLeadIdToLink, setSelectedLeadIdToLink] = useState('')
  const [linkingLead, setLinkingLead] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Carregar dados iniciais
  const loadSettingsAndStatus = useCallback(async () => {
    try {
      setLoadingSettings(true)
      const data = await WhatsAppService.getSettings()
      setSettings(data)
      setApiUrl(data.api_url || '')
      setInstanceName(data.instance_name || 'solarcrm')

      const st = await WhatsAppService.getStatus()
      setStatus(st)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar configurações'
      console.error(msg)
    } finally {
      setLoadingSettings(false)
    }
  }, [])

  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true)
      const list = await WhatsAppService.getConversations()
      setConversations(list)
      if (list.length > 0 && !selectedPhone) {
        setSelectedPhone(list[0].phone_number)
      }
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setLoadingConversations(false)
    }
  }, [selectedPhone])

  const loadMessages = useCallback(async (phone: string) => {
    try {
      setLoadingMessages(true)
      const msgs = await WhatsAppService.getMessagesByPhone(phone)
      setMessages(msgs)
      await WhatsAppService.markAsRead(phone)
      setConversations((prev) =>
        prev.map((c) => (c.phone_number === phone ? { ...c, unread_count: 0 } : c)),
      )
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    loadSettingsAndStatus()
    loadConversations()
  }, [loadSettingsAndStatus, loadConversations])

  useEffect(() => {
    if (selectedPhone) {
      loadMessages(selectedPhone)
    }
  }, [selectedPhone, loadMessages])

  // Rolar para a última mensagem da thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime para novas mensagens no whatsapp_messages
  useRealtime<WhatsAppMessage>('whatsapp_messages', (e) => {
    const { action, record } = e
    if (action === 'create' || action === 'update') {
      if (selectedPhone && record.phone_number === selectedPhone) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === record.id)
          if (exists) {
            return prev.map((m) => (m.id === record.id ? record : m))
          }
          return [...prev, record]
        })
      }
      loadConversations()
    }
  })

  // Polling automático de status quando em estado 'connecting' ou aba de conexão ativa
  useEffect(() => {
    if (activeTab === 'conexao' && status?.status === 'connecting') {
      const interval = setInterval(async () => {
        try {
          const st = await WhatsAppService.getStatus()
          setStatus(st)
          if (st.status === 'connected') {
            setQrCodeData(null)
            toast({
              title: 'WhatsApp Conectado!',
              description: 'Sua instância do WhatsApp foi conectada com sucesso.',
            })
            clearInterval(interval)
          }
        } catch {
          /* intentionally ignored */
        }
      }, 3500)
      return () => clearInterval(interval)
    }
  }, [activeTab, status?.status])

  // Ações de Conexão
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apiUrl.trim()) {
      toast({
        title: 'URL obrigatória',
        description: 'Por favor, informe a URL da Evolution API.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSavingSettings(true)
      const res = await WhatsAppService.saveSettings({
        api_url: apiUrl,
        api_key: apiKey.trim() || undefined,
        instance_name: instanceName.trim() || 'solarcrm',
        webhook_url: `${window.location.origin}/backend/v1/whatsapp/webhook`,
      })
      toast({
        title: 'Configurações salvas',
        description: res.message || 'Dados atualizados com sucesso.',
      })
      setApiKey('')
      await loadSettingsAndStatus()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar configurações.'
      toast({
        title: 'Erro ao salvar',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSavingSettings(false)
    }
  }

  const handleConnect = async () => {
    try {
      setConnecting(true)
      const res = await WhatsAppService.connect()
      if (res.status === 'connected') {
        toast({
          title: 'Conectado!',
          description: 'A instância já está conectada e pronta para uso.',
        })
        setQrCodeData(null)
      } else if (res.qrcode) {
        setQrCodeData(res.qrcode)
        toast({
          title: 'QR Code Gerado',
          description: 'Abra seu WhatsApp e escaneie o código na tela.',
        })
      }
      const st = await WhatsAppService.getStatus()
      setStatus(st)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao conectar com o WhatsApp.'
      toast({
        title: 'Erro de conexão',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setConnecting(false)
    }
  }

  const handleLogout = async () => {
    if (!confirm('Deseja realmente desconectar esta instância do WhatsApp?')) return
    try {
      setLoggingOut(true)
      await WhatsAppService.logout()
      toast({
        title: 'Instância desconectada',
        description: 'A sessão do WhatsApp foi encerrada.',
      })
      setQrCodeData(null)
      const st = await WhatsAppService.getStatus()
      setStatus(st)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao desconectar.'
      toast({
        title: 'Erro ao desconectar',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoggingOut(false)
    }
  }

  // Envio de mensagem direta na thread
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPhone || !newMessageText.trim()) return

    const currentConv = conversations.find((c) => c.phone_number === selectedPhone)
    const textToSend = newMessageText.trim()
    setNewMessageText('')

    try {
      setSendingMessage(true)
      await WhatsAppService.sendMessage({
        number: selectedPhone,
        text: textToSend,
        lead_id: currentConv?.lead?.id,
      })
      await loadMessages(selectedPhone)
      await loadConversations()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar mensagem.'
      toast({
        title: 'Erro no envio',
        description: msg,
        variant: 'destructive',
      })
      setNewMessageText(textToSend)
    } finally {
      setSendingMessage(false)
    }
  }

  // Abertura do modal de vincular lead
  const handleOpenLinkModal = async () => {
    try {
      const leadsList = await LeadsService.getAllLeads()
      setAvailableLeads(leadsList)
      setLinkingModalOpen(true)
    } catch (err) {
      console.error(err)
    }
  }

  const handleConfirmLinkLead = async () => {
    if (!selectedPhone || !selectedLeadIdToLink) return
    try {
      setLinkingLead(true)
      await WhatsAppService.linkConversationToLead(selectedPhone, selectedLeadIdToLink)
      toast({
        title: 'Lead Vinculado!',
        description: 'A conversa foi associada ao lead selecionado.',
      })
      setLinkingModalOpen(false)
      setSelectedLeadIdToLink('')
      await loadConversations()
      await loadMessages(selectedPhone)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao vincular lead.'
      toast({
        title: 'Erro',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLinkingLead(false)
    }
  }

  // Conversas filtradas pela busca
  const filteredConversations = conversations.filter((conv) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    const phoneMatch = conv.phone_number.includes(q)
    const nameMatch = conv.lead?.nome?.toLowerCase().includes(q)
    const textMatch = conv.last_message.content.toLowerCase().includes(q)
    return phoneMatch || nameMatch || textMatch
  })

  const currentConversation = conversations.find((c) => c.phone_number === selectedPhone)

  const formatTime = (isoString?: string) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const now = new Date()
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()

    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    return (
      date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
      ' ' +
      date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com Status do WhatsApp */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0B7A5B] shadow-xs">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                WhatsApp Comercial
              </h2>
              {status?.status === 'connected' ? (
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 gap-1 font-semibold text-xs py-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Conectado
                </Badge>
              ) : status?.status === 'connecting' ? (
                <Badge className="bg-amber-500/10 text-amber-700 border-amber-300 gap-1 font-semibold text-xs py-0.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  Conectando...
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-slate-500 border-slate-300 gap-1 text-xs py-0.5"
                >
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Desconectado
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {status?.status === 'connected'
                ? `Instância ativa (${status.instance_name || 'solarcrm'})${
                    status.phone_number ? ` • ${status.phone_number}` : ''
                  }`
                : 'Integração via Evolution API v2 para atendimento e captação de leads solares'}
            </p>
          </div>
        </div>

        {/* Botões rápidos do header */}
        <div className="flex items-center gap-2">
          {status?.status === 'connected' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 text-xs h-9 gap-1.5"
            >
              <Power className="w-3.5 h-3.5" />
              <span>{loggingOut ? 'Desconectando...' : 'Desconectar WhatsApp'}</span>
            </Button>
          ) : (
            <Button
              onClick={() => {
                setActiveTab('conexao')
                handleConnect()
              }}
              disabled={connecting}
              size="sm"
              className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs h-9 gap-1.5 font-semibold shadow-xs"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{connecting ? 'Gerando QR...' : 'Conectar / Gerar QR'}</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              loadSettingsAndStatus()
              loadConversations()
            }}
            title="Atualizar dados"
            className="h-9 w-9 text-slate-600"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs Principais: Inbox vs Conectar */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100/90 p-1 border border-slate-200/80 mb-5">
          <TabsTrigger
            value="inbox"
            className="gap-2 data-[state=active]:bg-white data-[state=active]:text-[#0B7A5B] data-[state=active]:shadow-xs text-xs font-semibold px-4 py-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Inbox de Conversas</span>
            {conversations.reduce((acc, c) => acc + c.unread_count, 0) > 0 && (
              <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 h-4">
                {conversations.reduce((acc, c) => acc + c.unread_count, 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="conexao"
            className="gap-2 data-[state=active]:bg-white data-[state=active]:text-[#0B7A5B] data-[state=active]:shadow-xs text-xs font-semibold px-4 py-2"
          >
            <QrCode className="w-4 h-4" />
            <span>Conectar WhatsApp & QR Code</span>
          </TabsTrigger>
        </TabsList>

        {/* ----------------- ABA 1: INBOX DE CONVERSAS ----------------- */}
        <TabsContent value="inbox" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[680px] bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Coluna Esquerda: Lista de Conversas (4 colunas) */}
            <div className="lg:col-span-4 border-r border-slate-200/80 flex flex-col h-full bg-slate-50/40">
              {/* Barra de busca de conversas */}
              <div className="p-3 border-b border-slate-200/80 bg-white">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar conversa ou telefone..."
                    className="pl-9 h-9 text-xs border-slate-200 focus-visible:ring-[#0B7A5B] bg-slate-50"
                  />
                </div>
              </div>

              {/* Lista com scroll */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {loadingConversations ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Carregando conversas...
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0B7A5B] flex items-center justify-center mx-auto">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-700">Nenhuma conversa ainda</p>
                      <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                        Conecte seu WhatsApp ou aguarde mensagens recebidas para que apareçam aqui.
                      </p>
                    </div>
                    {status?.status !== 'connected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('conexao')}
                        className="text-xs border-[#0B7A5B] text-[#0B7A5B] hover:bg-emerald-50"
                      >
                        Conectar WhatsApp Agora
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const isSelected = selectedPhone === conv.phone_number
                    const leadName = conv.lead?.nome
                    const displayName =
                      leadName || conv.last_message.sender_name || `Contato (${conv.phone_number})`

                    return (
                      <button
                        key={conv.phone_number}
                        onClick={() => setSelectedPhone(conv.phone_number)}
                        className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 hover:bg-slate-100/80 ${
                          isSelected ? 'bg-emerald-50/70 border-r-2 border-[#0B7A5B]' : ''
                        }`}
                      >
                        {/* Avatar com status ou lead */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            conv.lead ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {displayName.slice(0, 2).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {displayName}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {formatTime(conv.last_message.created)}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 truncate mb-1">
                            {conv.last_message.direction === 'out' && (
                              <span className="text-emerald-700 font-semibold mr-1">Você:</span>
                            )}
                            {conv.last_message.content}
                          </p>

                          <div className="flex items-center justify-between gap-1">
                            {conv.lead ? (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200 truncate max-w-[140px]"
                              >
                                Lead: {conv.lead.status}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200"
                              >
                                Sem Lead Vinculado
                              </Badge>
                            )}

                            {conv.unread_count > 0 && (
                              <span className="w-5 h-5 rounded-full bg-[#0B7A5B] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Coluna Direita: Thread de Mensagens e Resposta (8 colunas) */}
            <div className="lg:col-span-8 flex flex-col h-full bg-slate-50/20">
              {selectedPhone && currentConversation ? (
                <>
                  {/* Header da Thread */}
                  <div className="p-3.5 px-5 border-b border-slate-200/80 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          currentConversation.lead
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {(
                          currentConversation.lead?.nome ||
                          currentConversation.last_message.sender_name ||
                          currentConversation.phone_number
                        )
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {currentConversation.lead?.nome ||
                              currentConversation.last_message.sender_name ||
                              `Contato WhatsApp`}
                          </h3>
                          {currentConversation.lead && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] py-0">
                              {currentConversation.lead.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          +{currentConversation.phone_number}
                        </p>
                      </div>
                    </div>

                    {/* Ações do topo da conversa */}
                    <div className="flex items-center gap-2">
                      {currentConversation.lead ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/leads/${currentConversation.lead?.id}`)}
                          className="text-xs border-slate-200 h-8 gap-1.5 hover:bg-slate-100 text-slate-700"
                        >
                          <span>Abrir Lead</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleOpenLinkModal}
                            className="text-xs border-slate-200 h-8 gap-1 hover:bg-slate-100 text-slate-700"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Vincular Lead</span>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/leads/novo?telefone=${encodeURIComponent(
                                  currentConversation.phone_number,
                                )}&nome=${encodeURIComponent(
                                  currentConversation.last_message.sender_name || '',
                                )}`,
                              )
                            }
                            className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs h-8 gap-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Criar Lead</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Área com histórico de mensagens com scroll */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
                    {loadingMessages ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        Carregando mensagens da conversa...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        Nenhuma mensagem encontrada nesta conversa.
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isOut = msg.direction === 'out'
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-xs relative ${
                                isOut
                                  ? 'bg-[#0B7A5B] text-white rounded-br-xs'
                                  : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                              }`}
                            >
                              {!isOut && msg.sender_name && (
                                <p className="text-[10px] font-bold text-emerald-700 mb-0.5">
                                  {msg.sender_name}
                                </p>
                              )}
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              <div
                                className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                                  isOut ? 'text-emerald-100' : 'text-slate-400'
                                }`}
                              >
                                <Clock className="w-2.5 h-2.5" />
                                <span>{formatTime(msg.created)}</span>
                                {isOut && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input de Envio de Mensagem */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-3 border-t border-slate-200/80 bg-white flex items-center gap-2"
                  >
                    <Input
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder={`Responder para ${
                        currentConversation.lead?.nome || currentConversation.phone_number
                      }...`}
                      disabled={sendingMessage}
                      className="h-10 text-xs border-slate-200 focus-visible:ring-[#0B7A5B]"
                    />
                    <Button
                      type="submit"
                      disabled={sendingMessage || !newMessageText.trim()}
                      className="bg-[#0B7A5B] hover:bg-[#095C44] text-white h-10 px-4 text-xs font-semibold gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{sendingMessage ? 'Enviando...' : 'Enviar'}</span>
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Selecione uma conversa</p>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    Escolha uma conversa na lista à esquerda para visualizar mensagens e responder
                    diretamente pelo CRM.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ----------------- ABA 2: CONEXÃO E QR CODE ----------------- */}
        <TabsContent value="conexao" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Bloco QR Code / Status da Conexão (5 colunas) */}
            <div className="lg:col-span-5 space-y-5">
              <Card className="border-slate-200/80 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-[#0B7A5B]" />
                    <span>Conexão WhatsApp</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Escaneie o código QR com o WhatsApp no seu smartphone
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 flex flex-col items-center text-center space-y-5">
                  {status?.status === 'connected' ? (
                    <div className="py-8 space-y-3 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-9 h-9" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">
                          WhatsApp Conectado com Sucesso!
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Instância: <span className="font-mono font-bold">{instanceName}</span>
                        </p>
                        {status.phone_number && (
                          <p className="text-xs font-semibold text-emerald-700 mt-1">
                            Número conectado: +{status.phone_number}
                          </p>
                        )}
                      </div>
                      <div className="pt-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab('inbox')}
                          className="text-xs border-[#0B7A5B] text-[#0B7A5B] hover:bg-emerald-50"
                        >
                          Ir para Conversas
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLogout}
                          disabled={loggingOut}
                          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                        >
                          Desconectar
                        </Button>
                      </div>
                    </div>
                  ) : qrCodeData?.base64 ? (
                    <div className="space-y-4 flex flex-col items-center">
                      <div className="p-3 bg-white border-2 border-dashed border-[#0B7A5B] rounded-xl shadow-xs">
                        <img
                          src={qrCodeData.base64}
                          alt="QR Code WhatsApp"
                          className="w-56 h-56 object-contain"
                        />
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800">
                          1. Abra o WhatsApp no seu celular
                        </p>
                        <p className="text-xs text-slate-500">
                          2. Vá em Configurações &gt; Aparelhos conectados &gt; Conectar um aparelho
                        </p>
                        <p className="text-xs text-slate-500">
                          3. Aponte a câmera para este QR code
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={handleConnect}
                          disabled={connecting}
                          variant="outline"
                          className="text-xs gap-1.5 h-8"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Atualizar QR Code</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 space-y-4 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                        <Smartphone className="w-8 h-8" />
                      </div>
                      <div className="space-y-1 max-w-xs">
                        <h4 className="text-sm font-bold text-slate-800">Pronto para conectar</h4>
                        <p className="text-xs text-slate-500">
                          Clique no botão abaixo para inicializar a instância na Evolution API e
                          exibir o QR code.
                        </p>
                      </div>

                      <Button
                        onClick={handleConnect}
                        disabled={connecting || (!settings?.configured && !apiUrl)}
                        className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold h-10 px-5 gap-2 shadow-xs"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>{connecting ? 'Gerando QR Code...' : 'Gerar QR Code Agora'}</span>
                      </Button>

                      {!settings?.configured && !apiUrl && (
                        <p className="text-[11px] text-amber-600">
                          * Configure a URL da Evolution API ao lado antes de conectar.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Box de Webhook Info */}
              <Card className="border-slate-200/80 shadow-xs bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Endpoint do Webhook no CRM
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-slate-500">
                    A Evolution API envia mensagens recebidas e atualizações para esta URL:
                  </p>
                  <div className="p-2 rounded bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-800 break-all select-all flex items-center justify-between">
                    <span>{window.location.origin}/backend/v1/whatsapp/webhook</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/backend/v1/whatsapp/webhook`,
                        )
                        setCopiedKey(true)
                        setTimeout(() => setCopiedKey(false), 2000)
                        toast({ title: 'URL do Webhook copiada!' })
                      }}
                      className="h-6 w-6 text-slate-500 shrink-0 ml-1"
                    >
                      {copiedKey ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    O webhook é configurado automaticamente quando você clica em
                    &quot;Conectar&quot;.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Bloco Formulário de Configurações (7 colunas) */}
            <div className="lg:col-span-7 space-y-5">
              <Card className="border-slate-200/80 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-[#0B7A5B]" />
                        <span>Parâmetros da Evolution API</span>
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Credenciais salvas de forma segura no backend (somente Admin pode editar)
                      </CardDescription>
                    </div>
                    {settings?.configured && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                        Configurado
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <form onSubmit={handleSaveSettings} className="space-y-4">
                    {/* URL da API */}
                    <div className="space-y-1.5">
                      <Label htmlFor="apiUrl" className="text-xs font-semibold text-slate-700">
                        URL da Instância Evolution API *
                      </Label>
                      <Input
                        id="apiUrl"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        placeholder="https://evolution.suaempresa.com.br"
                        disabled={!isAdmin || savingSettings}
                        className="h-10 text-xs border-slate-200 focus-visible:ring-[#0B7A5B]"
                      />
                      <p className="text-[11px] text-slate-400">
                        Endereço base do servidor onde sua Evolution API v2 está hospedada (ex:
                        Docker, VPS, Easypanel, Coolify).
                      </p>
                    </div>

                    {/* API Key */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="apiKey"
                        className="text-xs font-semibold text-slate-700 flex items-center justify-between"
                      >
                        <span>Chave de Autenticação (API Key / Global Key) *</span>
                        {settings?.has_key && (
                          <span className="text-[10px] text-emerald-600 font-normal">
                            Salva no backend: {settings.masked_key}
                          </span>
                        )}
                      </Label>
                      <Input
                        id="apiKey"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={
                          settings?.has_key
                            ? 'Deixe em branco para manter a chave atual'
                            : 'Insira sua Global API Key da Evolution'
                        }
                        disabled={!isAdmin || savingSettings}
                        className="h-10 text-xs border-slate-200 focus-visible:ring-[#0B7A5B]"
                      />
                      <p className="text-[11px] text-slate-400">
                        Definida no arquivo{' '}
                        <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">
                          AUTHENTICATION_API_KEY
                        </code>{' '}
                        do seu container Evolution API.
                      </p>
                    </div>

                    {/* Nome da Instância */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="instanceName"
                        className="text-xs font-semibold text-slate-700"
                      >
                        Nome da Instância
                      </Label>
                      <Input
                        id="instanceName"
                        value={instanceName}
                        onChange={(e) => setInstanceName(e.target.value)}
                        placeholder="solarcrm"
                        disabled={!isAdmin || savingSettings}
                        className="h-10 text-xs border-slate-200 focus-visible:ring-[#0B7A5B]"
                      />
                      <p className="text-[11px] text-slate-400">
                        Identificador da conexão no WhatsApp (padrão:{' '}
                        <code className="text-emerald-700">solarcrm</code>).
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="pt-2 flex justify-end">
                        <Button
                          type="submit"
                          disabled={savingSettings || !apiUrl}
                          className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold h-9 px-5 gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{savingSettings ? 'Salvando...' : 'Salvar Configurações'}</span>
                        </Button>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>

              {/* Guia Colapsável de Como Hospedar Evolution API */}
              <div className="border border-slate-200/80 rounded-xl bg-white shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTutorial(!showTutorial)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-[#0B7A5B]" />
                    <span className="text-xs font-bold text-slate-800">
                      Como hospedar sua própria Evolution API v2 (Passo a Passo)
                    </span>
                  </div>
                  {showTutorial ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {showTutorial && (
                  <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs text-slate-600 leading-relaxed">
                    <p>
                      A <strong>Evolution API</strong> é uma API open source para WhatsApp. Como ela
                      roda externamente, você pode hospedá-la em qualquer servidor VPS
                      (DigitalOcean, Hetzner, AWS, Oracle Cloud) com Docker em poucos minutos:
                    </p>

                    <div className="space-y-2">
                      <p className="font-semibold text-slate-800">
                        1. Exemplo de{' '}
                        <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">
                          docker-compose.yml
                        </code>
                        :
                      </p>
                      <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] overflow-x-auto font-mono">
                        {`version: '3.7'
services:
  evolution-api:
    image: atendai/evolution-api:v2.2.2
    container_name: evolution_api
    restart: always
    ports:
      - "8080:8080"
    environment:
      - SERVER_URL=https://evolution.seudominio.com
      - AUTHENTICATION_API_KEY=minha_chave_super_secreta_123
      - DATABASE_ENABLED=false
      - REDIS_ENABLED=false
      - WEBHOOK_GLOBAL_ENABLED=false`}
                      </pre>
                    </div>

                    <div className="space-y-1.5">
                      <p className="font-semibold text-slate-800">2. Onde pegar a URL e API Key:</p>
                      <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                        <li>
                          <strong>URL:</strong> Aponte seu domínio (ex:{' '}
                          <code className="font-mono text-emerald-800">
                            https://evolution.seudominio.com
                          </code>
                          ) com SSL/HTTPS para a porta 8080.
                        </li>
                        <li>
                          <strong>API Key:</strong> O mesmo valor definido em{' '}
                          <code className="font-mono text-emerald-800">AUTHENTICATION_API_KEY</code>{' '}
                          no compose acima.
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-1.5">
                      <p className="font-semibold text-slate-800">
                        3. Como funciona o funil automático de leads:
                      </p>
                      <p className="text-slate-600">
                        Quando um cliente novo envia uma mensagem para o seu WhatsApp comercial, o
                        CRM recebe o webhook, cadastra o lead imediatamente no estágio{' '}
                        <strong className="text-emerald-700">&quot;Novo&quot;</strong> do funil de
                        vendas, preenche o telefone e nome do contato e dispara o SLA comercial de
                        atendimento!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Vincular Conversa a Lead Existente */}
      <Dialog open={linkingModalOpen} onOpenChange={setLinkingModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Vincular Telefone a um Lead
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Associe o número{' '}
              <strong className="text-slate-800 font-mono">+{selectedPhone}</strong> a um lead
              existente no CRM Solar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold text-slate-700">Selecione o Lead</Label>
            <Select value={selectedLeadIdToLink} onValueChange={setSelectedLeadIdToLink}>
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="Selecione um lead da lista..." />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {availableLeads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id} className="text-xs">
                    {lead.nome} ({lead.status}) — {lead.cidade || lead.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLinkingModalOpen(false)}
              disabled={linkingLead}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmLinkLead}
              disabled={linkingLead || !selectedLeadIdToLink}
              className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold"
            >
              {linkingLead ? 'Vinculando...' : 'Confirmar Vínculo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
