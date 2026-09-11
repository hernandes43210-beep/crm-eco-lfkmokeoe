import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AssinaturaEnvelope, Lead } from '@/types/crm'
import { getEnvelopeStatusBadge, buildWhatsAppSigningUrl } from '@/utils/clicksignUtils'
import { ClicksignService } from '@/services/clicksign'
import { useToast } from '@/hooks/use-toast'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Copy,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  FileCheck,
  Calendar,
  User,
  Mail,
  Shield,
  Loader2,
} from 'lucide-react'

interface ClicksignEnvelopeCardProps {
  envelope: AssinaturaEnvelope
  lead: Lead
  onUpdated?: () => void
}

export function ClicksignEnvelopeCard({ envelope, lead, onUpdated }: ClicksignEnvelopeCardProps) {
  const { toast } = useToast()
  const [checking, setChecking] = useState(false)
  const [copied, setCopied] = useState(false)

  const statusBadge = getEnvelopeStatusBadge(envelope.status)

  const handleCopyLink = async () => {
    if (!envelope.link_assinatura) return
    try {
      await navigator.clipboard.writeText(envelope.link_assinatura)
      setCopied(true)
      toast({
        title: 'Link copiado!',
        description: 'Link de assinatura copiado para a área de transferência.',
      })
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: envelope.link_assinatura,
      })
    }
  }

  const handleCheckStatus = async () => {
    try {
      setChecking(true)
      const res = await ClicksignService.checkStatus({
        record_id: envelope.id,
        envelope_id: envelope.clicksign_envelope_id,
      })

      toast({
        title: 'Status atualizado com a Clicksign',
        description: `Situação do envelope: ${res.status === 'signed' ? 'Assinado com sucesso!' : 'Aguardando assinatura'}.`,
      })

      onUpdated?.()
    } catch (err: any) {
      toast({
        title: 'Erro ao verificar status',
        description: err?.message || 'Falha ao consultar a API da Clicksign.',
        variant: 'destructive',
      })
    } finally {
      setChecking(false)
    }
  }

  const whatsAppUrl = envelope.link_assinatura
    ? buildWhatsAppSigningUrl({
        telefone: envelope.signatario_telefone || lead.telefone,
        clienteNome: envelope.signatario_nome,
        tipoDocumento: envelope.tipo_documento,
        linkAssinatura: envelope.link_assinatura,
      })
    : null

  const formatDataHora = (isoStr?: string) => {
    if (!isoStr) return '-'
    try {
      const d = new Date(isoStr)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoStr
    }
  }

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all ${
        envelope.status === 'signed'
          ? 'bg-emerald-50/40 border-emerald-200'
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Lado esquerdo: título e signatário */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-xs text-slate-900 truncate">
              {envelope.nome_envelope}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold px-2 py-0.5 gap-1 ${statusBadge.bgClass} ${statusBadge.colorClass} ${statusBadge.borderClass}`}
            >
              {envelope.status === 'signed' ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              ) : envelope.status === 'running' ? (
                <Clock className="w-3 h-3 text-amber-600" />
              ) : (
                <AlertCircle className="w-3 h-3 text-slate-500" />
              )}
              <span>{statusBadge.label}</span>
            </Badge>

            <span className="text-[10px] text-slate-400 font-mono">
              ID: {envelope.clicksign_envelope_id.slice(0, 8)}...
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              <strong>{envelope.signatario_nome}</strong>
              {envelope.signatario_cpf ? ` (${envelope.signatario_cpf})` : ''}
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <Mail className="w-3 h-3 text-slate-400" />
              {envelope.signatario_email}
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Calendar className="w-3 h-3 text-slate-400" />
              Criado: {formatDataHora(envelope.created)}
            </span>
            {envelope.assinado_em && (
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Assinado em: {formatDataHora(envelope.assinado_em)}
              </span>
            )}
          </div>
        </div>

        {/* Lado direito: ações de sincronização e envio */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Botão Atualizar Status */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleCheckStatus}
            disabled={checking}
            className="h-7 px-2.5 text-xs text-slate-700 hover:text-blue-700 border-slate-200 gap-1"
            title="Consultar status em tempo real na Clicksign"
          >
            {checking ? (
              <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
            ) : (
              <RefreshCw className="w-3 h-3 text-slate-500" />
            )}
            <span>{checking ? 'Checando...' : 'Atualizar status'}</span>
          </Button>

          {/* Se tiver link de assinatura e ainda não estiver finalizado */}
          {envelope.link_assinatura && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900 border-slate-200 gap-1"
                title="Copiar link direto para o cliente assinar"
              >
                <Copy className="w-3 h-3 text-slate-500" />
                <span>{copied ? 'Copiado!' : 'Copiar link'}</span>
              </Button>

              {whatsAppUrl && (
                <Button
                  size="sm"
                  asChild
                  className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1 shadow-xs"
                >
                  <a
                    href={whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Enviar link formatado via WhatsApp"
                  >
                    <MessageSquare className="w-3 h-3 fill-current" />
                    <span>WhatsApp</span>
                  </a>
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                asChild
                className="h-7 w-7 p-0 text-slate-500 hover:text-blue-700"
                title="Abrir página de assinatura Clicksign"
              >
                <a href={envelope.link_assinatura} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
