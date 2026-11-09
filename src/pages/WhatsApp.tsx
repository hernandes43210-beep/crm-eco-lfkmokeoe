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
import { Loader2, MessageCircle, RefreshCw, Send } from 'lucide-react'
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
  numeros?: NumeroConectado[]
  message?: string
}

interface ErroPb {
  response?: { message?: string }
  message?: string
}

export default function WhatsAppPage() {
  const { toast } = useToast()
  const location = useLocation()

  const [status, setStatus] = useState<OwnerStatus | null>(null)
  const [statusCarregando, setStatusCarregando] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadId, setLeadId] = useState('')
  const [telefone, setTelefone] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')

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
    return () => {
      ativo = false
    }
  }, [carregarStatus])

  const aoTrocarLead = (id: string) => {
    setLeadId(id)
    if (!id) {
      setTelefone('')
      return
    }
    const lead = leads.find((l) => l.id === id)
    if (lead?.telefone) setTelefone(lead.telefone)
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
      toast({
        title: 'Mensagem enviada',
        description: 'Enviada pela sua conta de WhatsApp conectada.',
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

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: AZUL }}>
            WhatsApp
          </h1>
          <p className="text-sm text-slate-500">
            Mensagens enviadas pela sua conta conectada (Skip Connectors).
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
            Sua conta de WhatsApp
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
                Conectado à sua conta
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
              {status?.message && <p className="text-sm text-slate-600">{status.message}</p>}
              <p className="text-sm text-slate-500">
                Conecte sua conta nos Conectores do painel Skip para enviar mensagens por aqui.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
