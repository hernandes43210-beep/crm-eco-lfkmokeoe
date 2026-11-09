import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, MessageCircle, RefreshCw, Send, Settings2, PlugZap } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { Lead } from '@/types/crm'

const AZUL = '#0b1f4d'
const AMARELO = '#ffd23f'

interface NumeroConectado {
  id: string
  numero: string
  nome: string
  qualidade: string
}

interface OwnerStatus {
  connected: boolean
  modo?: 'manual' | 'conector'
  numeros?: NumeroConectado[]
  message?: string
}

interface ManualConfig {
  configured: boolean
  waba_id: string
  phone_number_id: string
  masked_token: string
  ultimo_teste_status?: string
  ultimo_teste_mensagem?: string
  ultimo_teste_em?: string
}

interface ManualTestResult {
  success: boolean
  status: string
  message: string
  numeros?: NumeroConectado[]
}

interface ErroPb {
  response?: { message?: string }
  message?: string
}

export default function WhatsAppPage() {
  const { toast } = useToast()
  const location = useLocation()
  const isAdmin = useAuth()?.isAdmin

  const [status, setStatus] = useState<OwnerStatus | null>(null)
  const [statusCarregando, setStatusCarregando] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadId, setLeadId] = useState('')
  const [telefone, setTelefone] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')

  // Conexão manual
  const [manualConfig, setManualConfig] = useState<ManualConfig | null>(null)
  const [manualWabaId, setManualWabaId] = useState('')
  const [manualPhoneNumberId, setManualPhoneNumberId] = useState('')
  const [manualToken, setManualToken] = useState('')
  const [manualSalvando, setManualSalvando] = useState(false)
  const [manualTestando, setManualTestando] = useState(false)
  const [manualTesteResultado, setManualTesteResultado] = useState<ManualTestResult | null>(null)
  const [manualTesteErro, setManualTesteErro] = useState('')

  const carregarStatus = useCallback(async () => {
    setStatusCarregando(true)
    try {
      const res = await pb.send('/backend/v1/whatsapp/owner-status', { method: 'GET' })
      setStatus(res as OwnerStatus)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setStatus({ connected: false, message: msg })
    } finally {
      setStatusCarregando(false)
    }
  }, [])

  const carregarManualConfig = useCallback(async () => {
    if (!isAdmin) return
    try {
      const res = await pb.send('/backend/v1/whatsapp/manual-config', { method: 'GET' })
      const cfg = res as ManualConfig
      setManualConfig(cfg)
      setManualWabaId(cfg.waba_id || '')
      setManualPhoneNumberId(cfg.phone_number_id || '')
    } catch {
      // Sem permissão ou sem configuração: seção fica oculta/vazia
      setManualConfig({ configured: false, waba_id: '', phone_number_id: '', masked_token: '' })
    }
  }, [isAdmin])

  // Pré-preenche o número quando a página é aberta de um lead (?lead=ID&telefone=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const leadParam = params.get('lead') || ''
    const telParam = params.get('telefone') || ''
    if (leadParam) setLeadId(leadParam)
    if (telParam) setTelefone(telParam)
  }, [location.search])

  useEffect(() => {
    let ativo = true
    const carregarLeads = async () => {
      try {
        const res = await pb.collection('leads').getList(1, 200, {
          filter: `status_qualificacao != "descartado"`,
          sort: '-created',
        })
        if (ativo) setLeads(res.items as unknown as Lead[])
      } catch {
        // sem leads, o usuário digita o número manualmente
      }
    }
    carregarLeads()
    carregarStatus()
    if (isAdmin) carregarManualConfig()
    return () => {
      ativo = false
    }
  }, [carregarStatus, carregarManualConfig, isAdmin])

  const aoTrocarLead = (id: string) => {
    setLeadId(id)
    if (!id) {
      setTelefone('')
      return
    }
    const lead = leads.find((l) => l.id === id)
    if (lead?.telefone) setTelefone(lead.telefone)
  }

  const salvarManual = async () => {
    setManualTesteResultado(null)
    setManualTesteErro('')
    if (!manualWabaId.trim() || !manualPhoneNumberId.trim() || !manualToken.trim()) {
      setManualTesteErro('Preencha WABA ID, Phone Number ID e Access Token antes de salvar.')
      return
    }
    setManualSalvando(true)
    try {
      const res = await pb.send('/backend/v1/whatsapp/manual-config', {
        method: 'POST',
        body: {
          waba_id: manualWabaId.trim(),
          phone_number_id: manualPhoneNumberId.trim(),
          access_token: manualToken.trim(),
        },
      })
      const r = res as { message?: string }
      toast({
        title: 'Conexão manual salva',
        description: r.message || 'Os dados foram gravados no banco e já estão em uso.',
      })
      setManualToken('')
      await carregarManualConfig()
      await carregarStatus()
    } catch (err) {
      const e = err as ErroPb
      const msg = e?.response?.message || e?.message || 'Falha ao salvar a conexão manual'
      setManualTesteErro(msg)
      toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' })
    } finally {
      setManualSalvando(false)
    }
  }

  const testarManual = async () => {
    setManualTesteResultado(null)
    setManualTesteErro('')
    setManualTestando(true)
    try {
      const res = await pb.send('/backend/v1/whatsapp/manual-test', {
        method: 'POST',
        body: {
          waba_id: manualWabaId.trim() || undefined,
          access_token: manualToken.trim() || undefined,
        },
      })
      const r = res as ManualTestResult
      setManualTesteResultado(r)
      if (r.success) {
        toast({ title: 'Conexão manual OK', description: r.message })
      } else {
        toast({ title: 'Teste falhou', description: r.message, variant: 'destructive' })
      }
      await carregarManualConfig()
    } catch (err) {
      const e = err as ErroPb
      const msg = e?.response?.message || e?.message || 'Falha ao testar a conexão manual'
      setManualTesteErro(msg)
      toast({ title: 'Erro ao testar', description: msg, variant: 'destructive' })
    } finally {
      setManualTestando(false)
    }
  }

  const enviar = async () => {
    setErroEnvio('')
    if (!telefone.trim()) {
      setErroEnvio('Informe o número de destino')
      return
    }
    if (!texto.trim()) {
      setErroEnvio('Escreva a mensagem')
      return
    }
    setEnviando(true)
    try {
      await pb.send('/backend/v1/whatsapp/owner-send', {
        method: 'POST',
        body: { telefone: telefone.trim(), texto: texto.trim(), lead: leadId || undefined },
      })
      setTexto('')
      const modo =
        status?.modo === 'manual' ? 'conexão manual (API da Meta)' : 'sua conta conectada'
      toast({
        title: 'Mensagem enviada',
        description: `Enviada pela ${modo}.`,
      })
    } catch (err) {
      const e = err as ErroPb
      const msg =
        e?.response?.message ||
        e?.message ||
        'Falha ao enviar a mensagem pela sua conta de WhatsApp'
      setErroEnvio(msg)
      toast({ title: 'Erro ao enviar', description: msg, variant: 'destructive' })
    } finally {
      setEnviando(false)
    }
  }

  const rotuloModo =
    status?.modo === 'manual'
      ? 'Conectado (manual)'
      : status?.modo === 'conector'
        ? 'Conectado à sua conta (conector)'
        : ''

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: AZUL }}>
            WhatsApp
          </h1>
          <p className="text-sm text-slate-500">
            Mensagens enviadas pela sua conta de WhatsApp — conexão manual (API da Meta) ou conector
            Skip.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={carregarStatus}
          disabled={statusCarregando}
          className="shrink-0"
        >
          {statusCarregando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Atualizar status
        </Button>
      </div>

      {/* Status da conexão */}
      <Card className="rounded-[14px] border-[#dfe5f0] bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: AZUL }}>
            <MessageCircle className="h-5 w-5" />
            Conexão WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {statusCarregando ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Verificando conexão…
            </div>
          ) : status?.connected ? (
            <div className="space-y-2">
              <Badge className="border-transparent bg-green-100 text-green-800 hover:bg-green-100">
                {rotuloModo}
              </Badge>
              {status.numeros && status.numeros.length > 0 && (
                <div className="text-sm text-slate-600">
                  Números da conta:{' '}
                  {status.numeros
                    .map((n) => (n.numero || n.id) + (n.nome ? ` (${n.nome})` : ''))
                    .join(', ')}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Badge variant="destructive">Não conectado</Badge>
              {status?.message && <p className="text-sm text-red-600">{status.message}</p>}
              {status?.modo !== 'manual' && (
                <p className="text-sm text-slate-500">
                  Configure a conexão manual abaixo (recomendado) ou conecte sua conta nos
                  Conectores do painel Skip.
                </p>
              )}
              {status?.modo === 'manual' && (
                <p className="text-sm text-slate-500">
                  A conexão manual está configurada mas a API da Meta recusou o acesso. Revise o
                  token e o WABA ID no formulário abaixo.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conexão manual (Admin) */}
      {isAdmin && (
        <Card className="rounded-[14px] border-[#dfe5f0] bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: AZUL }}>
              <Settings2 className="h-5 w-5" />
              Conexão manual (Admin)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">
              Informe os dados da sua conta de WhatsApp Cloud API (Meta). Salve e o CRM passa a usar
              esta conexão em vez do conector Skip. Token é salvo no banco e nunca é exibido de
              novo.
            </p>
            {manualConfig?.configured && (
              <div className="rounded-[14px] border border-[#dfe5f0] bg-[#eef2f8] p-3 text-sm">
                <div className="font-semibold" style={{ color: AZUL }}>
                  Dados gravados
                </div>
                <div className="text-slate-600">
                  WABA ID: <span className="font-mono">{manualConfig.waba_id}</span> · Phone Number
                  ID: <span className="font-mono">{manualConfig.phone_number_id}</span> · Token:{' '}
                  <span className="font-mono">{manualConfig.masked_token}</span>
                </div>
                {manualConfig.ultimo_teste_status && (
                  <div className="mt-1 text-xs text-slate-500">
                    Último teste:{' '}
                    <span
                      className={
                        manualConfig.ultimo_teste_status === 'sucesso'
                          ? 'font-semibold text-green-700'
                          : 'font-semibold text-red-600'
                      }
                    >
                      {manualConfig.ultimo_teste_status}
                    </span>
                    {manualConfig.ultimo_teste_mensagem
                      ? ` — ${manualConfig.ultimo_teste_mensagem}`
                      : ''}
                  </div>
                )}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: AZUL }}>
                  WABA ID
                </label>
                <Input
                  value={manualWabaId}
                  onChange={(e) => setManualWabaId(e.target.value)}
                  placeholder="Ex.: 102290129340398"
                  disabled={manualSalvando || manualTestando}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: AZUL }}>
                  Phone Number ID
                </label>
                <Input
                  value={manualPhoneNumberId}
                  onChange={(e) => setManualPhoneNumberId(e.target.value)}
                  placeholder="Ex.: 106540352249227"
                  disabled={manualSalvando || manualTestando}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: AZUL }}>
                Access Token (Meta)
              </label>
              <Input
                type="password"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder={manualConfig?.masked_token || 'Cole o token (EAAG…)'}
                disabled={manualSalvando || manualTestando}
              />
              <p className="text-xs text-slate-400">
                {manualConfig?.configured
                  ? `Token já salvo (${manualConfig.masked_token}). Deixe em branco para manter o atual — só preencha para trocar.`
                  : 'Cole o token de acesso da Meta (formato EAAG…).'}
              </p>
            </div>
            {manualTesteErro && (
              <div
                className="rounded-[14px] border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                role="alert"
              >
                {manualTesteErro}
              </div>
            )}
            {manualTesteResultado && (
              <div
                className={
                  manualTesteResultado.success
                    ? 'rounded-[14px] border border-green-200 bg-green-50 p-3 text-sm text-green-800'
                    : 'rounded-[14px] border border-red-200 bg-red-50 p-3 text-sm text-red-700'
                }
                role="status"
              >
                {manualTesteResultado.message}
                {manualTesteResultado.numeros && manualTesteResultado.numeros.length > 0 && (
                  <div className="mt-1 text-xs">
                    Números:{' '}
                    {manualTesteResultado.numeros
                      .map((n) => (n.numero || n.id) + (n.nome ? ` (${n.nome})` : ''))
                      .join(', ')}
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                onClick={testarManual}
                disabled={manualSalvando || manualTestando}
              >
                {manualTestando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlugZap className="mr-2 h-4 w-4" />
                )}
                Testar conexão
              </Button>
              <Button
                onClick={salvarManual}
                disabled={manualSalvando || manualTestando}
                className="rounded-[14px] font-semibold hover:opacity-90"
                style={{ backgroundColor: AMARELO, color: AZUL }}
              >
                {manualSalvando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Settings2 className="mr-2 h-4 w-4" />
                )}
                Salvar conexão
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário de envio */}
      <Card className="rounded-[14px] border-[#dfe5f0] bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base" style={{ color: AZUL }}>
            Enviar mensagem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: AZUL }}>
                Lead (opcional)
              </label>
              <Select value={leadId} onValueChange={aoTrocarLead}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um lead" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="">Sem lead vinculado</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: AZUL }}>
                Número de destino (com DDD)
              </label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="47 99999-9999"
                disabled={enviando}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: AZUL }}>
              Mensagem
            </label>
            <textarea
              className="min-h-[110px] w-full rounded-[14px] border border-[#dfe5f0] bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#ffd23f]"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escreva a mensagem que será enviada pela sua conta de WhatsApp…"
              disabled={enviando}
            />
          </div>

          {erroEnvio && (
            <div
              className="rounded-[14px] border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              role="alert"
            >
              {erroEnvio}
              <button
                type="button"
                className="ml-2 underline hover:no-underline"
                onClick={() => setErroEnvio('')}
              >
                fechar
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTexto('')
                setErroEnvio('')
              }}
              disabled={enviando}
            >
              Limpar
            </Button>
            <Button
              onClick={enviar}
              disabled={enviando}
              className="rounded-[14px] font-semibold hover:opacity-90"
              style={{ backgroundColor: AMARELO, color: AZUL }}
            >
              {enviando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar pelo WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
