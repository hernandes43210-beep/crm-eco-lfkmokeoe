import React, { useState, useEffect, useCallback } from 'react'
import {
  Webhook,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Building2,
  Calendar,
  Code,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'
import { LuvikService, type WebhookUrls } from '@/services/luvik'
import type { LuvikSettings, LuvikLogItem } from '@/types/crm'

export default function IntegracoesPage() {
  const { isAdmin } = useAuth()
  const [settings, setSettings] = useState<LuvikSettings | null>(null)
  const [urls, setUrls] = useState<WebhookUrls | null>(null)
  const [logs, setLogs] = useState<LuvikLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false)
  const [selectedLogPayload, setSelectedLogPayload] = useState<Record<string, unknown> | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [showTutorial, setShowTutorial] = useState(true)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await LuvikService.getSettings()
      setSettings(data)
      if (data.webhook_token) {
        setUrls(LuvikService.buildWebhookUrls(data.webhook_token))
      }
      const logsList = await LuvikService.getLogs()
      setLogs(logsList)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar configurações do Luvik'
      toast({
        title: 'Erro de conexão',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(keyName)
    setTimeout(() => setCopiedKey(null), 2000)
    toast({
      title: 'URL copiada!',
      description: 'Pronta para colar no campo correspondente no Luvik.',
    })
  }

  const handleRegenerateToken = async () => {
    try {
      setRegenerating(true)
      const res = await LuvikService.regenerateToken()
      toast({
        title: 'Token regenerado com sucesso!',
        description: 'Lembre-se de atualizar as URLs coladas no painel do Luvik.',
      })
      setConfirmRegenerateOpen(false)
      if (res.webhook_token) {
        setUrls(LuvikService.buildWebhookUrls(res.webhook_token))
      }
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao regenerar token.'
      toast({
        title: 'Erro ao regenerar token',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setRegenerating(false)
    }
  }

  const getEventoBadge = (evento: string) => {
    switch (evento) {
      case 'negocio_criado':
        return (
          <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-xs font-semibold">
            Negócio Criado
          </Badge>
        )
      case 'negocio_ganho':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs font-semibold">
            Negócio Ganho
          </Badge>
        )
      case 'negocio_perdido':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-semibold">
            Negócio Perdido
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-slate-600 border-slate-200 text-xs">
            {evento}
          </Badge>
        )
    }
  }

  const getStatusProcessamentoBadge = (status: string) => {
    switch (status) {
      case 'sucesso':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px] gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Sucesso
          </Badge>
        )
      case 'ignorado':
        return (
          <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[11px] gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Ignorado
          </Badge>
        )
      case 'erro':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[11px] gap-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            Erro
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        )
    }
  }

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-'
    const d = new Date(isoString)
    return (
      d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' às ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    )
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Acesso Restrito</h2>
        <p className="text-xs text-slate-500">
          Apenas administradores do SolarCRM têm permissão para acessar e configurar as integrações
          de webhook.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0B7A5B] shadow-xs">
            <Webhook className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Integrações & Webhooks
              </h2>
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 gap-1 font-semibold text-xs py-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Luvik Solar Ativo
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Receba leads criados, negócios ganhos e perdidos do Luvik em tempo real no funil
              solar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmRegenerateOpen(true)}
            className="text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-300 text-xs h-9 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerar Token</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={loadData}
            title="Atualizar dados e logs"
            className="h-9 w-9 text-slate-600"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Grid de Webhooks Luvik e Instruções */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card das 3 URLs do Luvik (7 colunas) */}
        <div className="lg:col-span-7 space-y-5">
          <Card className="border-slate-200/80 shadow-xs bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#0B7A5B]" />
                    <span>Webhook&apos;s do Luvik</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Copie cada URL abaixo e cole no campo respectivo da tela de integrações do
                    Luvik.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-slate-600 font-mono text-[11px]">
                  Token Ativo
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {/* Campo 1: QUANDO UM NEGÓCIO FOR CRIADO */}
              <div className="space-y-1.5 p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    <label className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                      QUANDO UM NEGÓCIO FOR CRIADO
                    </label>
                  </div>
                  <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] py-0">
                    Cria lead no estágio &quot;Novo&quot; com SLA ativo
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  Cadastra o lead no funil solar, preenche dados do contato e inicia o prazo de SLA.
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    readOnly
                    value={urls?.criado || 'Carregando URL...'}
                    className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-none focus:ring-1 focus:ring-[#0B7A5B]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => urls && copyToClipboard(urls.criado, 'criado')}
                    className="h-8.5 px-3 bg-white text-slate-700 hover:bg-slate-50 border-slate-300 text-xs shrink-0 gap-1.5"
                  >
                    {copiedKey === 'criado' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                        <span className="text-emerald-700 font-semibold">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Campo 2: QUANDO UM NEGÓCIO FOR MARCADO COMO GANHO */}
              <div className="space-y-1.5 p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <label className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                      QUANDO UM NEGÓCIO FOR MARCADO COMO GANHO
                    </label>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] py-0">
                    Move para &quot;Fechado Ganho&quot;
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  Atualiza o lead no CRM para venda concluída, salva valor vendido e data de
                  encerramento.
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    readOnly
                    value={urls?.ganho || 'Carregando URL...'}
                    className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-none focus:ring-1 focus:ring-[#0B7A5B]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => urls && copyToClipboard(urls.ganho, 'ganho')}
                    className="h-8.5 px-3 bg-white text-slate-700 hover:bg-slate-50 border-slate-300 text-xs shrink-0 gap-1.5"
                  >
                    {copiedKey === 'ganho' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                        <span className="text-emerald-700 font-semibold">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Campo 3: QUANDO UM NEGÓCIO FOR MARCADO COMO PERDIDO */}
              <div className="space-y-1.5 p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <label className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                      QUANDO UM NEGÓCIO FOR MARCADO COMO PERDIDO
                    </label>
                  </div>
                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] py-0">
                    Move para &quot;Fechado Perdido&quot;
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  Move o lead no funil para Fechado Perdido e grava no histórico o motivo da perda.
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    readOnly
                    value={urls?.perdido || 'Carregando URL...'}
                    className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-none focus:ring-1 focus:ring-[#0B7A5B]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => urls && copyToClipboard(urls.perdido, 'perdido')}
                    className="h-8.5 px-3 bg-white text-slate-700 hover:bg-slate-50 border-slate-300 text-xs shrink-0 gap-1.5"
                  >
                    {copiedKey === 'perdido' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                        <span className="text-emerald-700 font-semibold">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Nota de Segurança e Conciliação */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#0B7A5B] shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 space-y-1">
                  <p className="font-semibold">Conciliação Inteligente de Leads</p>
                  <p className="text-emerald-800 leading-relaxed text-[11px]">
                    O endpoint armazena o ID do negócio no Luvik (
                    <code className="bg-emerald-100/80 px-1 py-0.5 rounded font-mono">
                      luvik_deal_id
                    </code>
                    ) no lead e verifica e-mail e telefone antes de criar. Se o lead já existir no
                    sistema, ele é conciliado e atualizado, evitando duplicidades.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card Tutorial de Como Configurar no Luvik (5 colunas) */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="border-slate-200/80 shadow-xs bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#0B7A5B]" />
                <span>Como configurar no Luvik</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Guia visual e rápido em 4 passos simples
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <ol className="space-y-3.5 text-xs text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="text-slate-800">Acesse o painel do Luvik:</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Faça login na sua conta do Luvik em{' '}
                      <span className="font-mono text-emerald-700">app.luvik.com.br</span>.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="text-slate-800">Navegue até o menu de Integrações:</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      No menu lateral esquerdo, clique no ícone de engrenagem{' '}
                      <strong>Configurações</strong> &gt; <strong>Integrações</strong>.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="text-slate-800">Cole cada URL nos campos:</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Localize a caixa <strong>&quot;Webhook&apos;s do Luvik&quot;</strong> e cole
                      as 3 URLs correspondentes: Negócio Criado, Negócio Ganho e Negócio Perdido.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center shrink-0">
                    4
                  </span>
                  <div>
                    <strong className="text-slate-800">Clique em &quot;Salvar&quot;:</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pronto! O Luvik passará a enviar requisições automáticas sempre que os eventos
                      ocorrerem.
                    </p>
                  </div>
                </li>
              </ol>

              {/* Botão de abrir ajuda externa */}
              <div className="pt-2">
                <a
                  href="https://ajuda.luvik.com.br/integracao-webhook/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#0B7A5B] hover:text-[#095C44] font-semibold hover:underline"
                >
                  <span>Ver documentação oficial na Central de Ajuda Luvik</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Histórico e Logs de Eventos Recebidos */}
      <Card className="border-slate-200/80 shadow-xs bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#0B7A5B]" />
              <span>Últimos Eventos Recebidos do Luvik</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Histórico em tempo real para auditoria e conferência do processamento dos webhooks
            </CardDescription>
          </div>

          <Badge variant="outline" className="text-xs">
            {logs.length} registro(s)
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Webhook className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-700">Nenhum evento recebido ainda</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Assim que você salvar as URLs no Luvik e realizar um teste ou criar um negócio, os
                dados recebidos e o lead atualizado aparecerão nesta tabela.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Evento</th>
                    <th className="py-3 px-4">Lead Afetado</th>
                    <th className="py-3 px-4">ID Deal Luvik</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Mensagem</th>
                    <th className="py-3 px-4 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {formatDate(log.created)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{getEventoBadge(log.evento)}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {log.lead_nome || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {log.deal_id || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusProcessamentoBadge(log.status_processamento)}
                      </td>
                      <td
                        className="py-3 px-4 text-slate-600 max-w-[280px] truncate"
                        title={log.mensagem}
                      >
                        {log.mensagem || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {log.payload_bruto ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLogPayload(log.payload_bruto || null)}
                            className="h-7 px-2 text-[11px] text-[#0B7A5B] hover:text-[#095C44] hover:bg-emerald-50 gap-1"
                          >
                            <Code className="w-3 h-3" />
                            <span>Ver JSON</span>
                          </Button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Confirmar Regeneração de Token */}
      <Dialog open={confirmRegenerateOpen} onOpenChange={setConfirmRegenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Regenerar Token do Webhook?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed pt-1">
              Atenção: Ao regenerar o token,{' '}
              <strong>todas as URLs antigas serão invalidadas imediatamente</strong>. Você precisará
              copiar as novas URLs e atualizar os campos correspondentes no painel do Luvik para
              continuar recebendo os eventos.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmRegenerateOpen(false)}
              disabled={regenerating}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleRegenerateToken}
              disabled={regenerating}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              <span>{regenerating ? 'Regenerando...' : 'Confirmar e Regenerar'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Ver Payload Bruto do Log */}
      <Dialog
        open={!!selectedLogPayload}
        onOpenChange={(open) => !open && setSelectedLogPayload(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Code className="w-5 h-5 text-[#0B7A5B]" />
              <span>Payload Bruto Recebido (JSON)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Dados brutos enviados pelo Luvik nesta requisição
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto my-2 p-3 bg-slate-900 rounded-lg border border-slate-800">
            <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap break-all leading-relaxed">
              {JSON.stringify(selectedLogPayload, null, 2)}
            </pre>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLogPayload(null)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
