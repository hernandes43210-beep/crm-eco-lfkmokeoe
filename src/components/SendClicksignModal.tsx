import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lead, FormalizacaoDocumento, FormalizacaoTipo } from '@/types/crm'
import { ClicksignService } from '@/services/clicksign'
import { generatePdfBase64FromHtml } from '@/utils/pdfBase64'
import { useToast } from '@/hooks/use-toast'
import {
  Send,
  Loader2,
  FileCheck2,
  UserCheck,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'

interface SendClicksignModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead
  tipo: FormalizacaoTipo
  documento?: FormalizacaoDocumento | null
  htmlContent?: string
  onSuccess?: () => void
}

export function SendClicksignModal({
  open,
  onOpenChange,
  lead,
  tipo,
  documento,
  htmlContent,
  onSuccess,
}: SendClicksignModalProps) {
  const { toast } = useToast()

  const [nome, setNome] = useState(lead.nome || '')
  const [email, setEmail] = useState(lead.email || '')
  const [cpf, setCpf] = useState(lead.cpf_cnpj || '')
  const [telefone, setTelefone] = useState(lead.telefone || '')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Atualizar formulário quando o modal abrir ou o lead mudar
  React.useEffect(() => {
    if (open) {
      setNome(lead.nome || '')
      setEmail(lead.email || '')
      setCpf(lead.cpf_cnpj || '')
      setTelefone(lead.telefone || '')
      setErrorMsg(null)
    }
  }, [open, lead])

  const docTituloDisplay =
    tipo === 'procuracao' ? 'Procuração Particular Energisa' : 'Contrato de Prestação de Serviços'

  const envelopeSugerido =
    tipo === 'procuracao'
      ? `Procuração Energisa — ${nome || lead.nome}`
      : `Contrato de Prestação de Serviços — ${nome || lead.nome}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!nome.trim()) {
      setErrorMsg('O nome do cliente é obrigatório.')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Informe um endereço de e-mail válido para o envio da assinatura.')
      return
    }

    // Obter conteúdo HTML do documento para gerar o PDF
    const content = htmlContent || documento?.conteudo_html
    if (!content) {
      setErrorMsg(
        'Documento não encontrado ou sem conteúdo gerado. Salve o documento antes de enviar.',
      )
      return
    }

    try {
      setSubmitting(true)

      // 1. Gerar base64 do PDF a partir do HTML oficial
      const pdfBase64 = generatePdfBase64FromHtml(
        tipo === 'procuracao' ? 'Procuracao Energisa Rondonia' : 'Contrato Ecosolar Energy',
        content,
      )

      // 2. Chamar endpoint do backend para criar envelope na Clicksign
      const res = await ClicksignService.createEnvelope({
        lead_id: lead.id,
        documento_id: documento?.id,
        tipo_documento: tipo,
        signer_nome: nome.trim(),
        signer_email: email.trim().toLowerCase(),
        signer_cpf: cpf.trim(),
        signer_telefone: telefone.trim(),
        envelope_nome: envelopeSugerido,
        pdf_base64: pdfBase64,
      })

      toast({
        title: 'Envelope enviado para assinatura!',
        description: `O link de assinatura foi gerado com sucesso via Clicksign.`,
      })

      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao enviar envelope para Clicksign:', err)
      const message =
        err?.response?.data?.error ||
        err?.data?.error ||
        err?.message ||
        'Não foi possível criar o envelope de assinatura na Clicksign. Verifique suas credenciais.'
      setErrorMsg(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-5 bg-gradient-to-r from-[#0A192F] via-[#0F284E] to-[#163868] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white tracking-tight">
                Assinar Digitalmente via Clicksign
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300 mt-0.5">
                Envio do {docTituloDisplay} para assinatura eletrônica do cliente
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <Alert variant="destructive" className="py-2.5 text-xs">
              <AlertCircle className="w-4 h-4 mr-2" />
              <AlertDescription className="font-medium">{errorMsg}</AlertDescription>
            </Alert>
          )}

          {/* Badge informativo */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 block">
                Validade Jurídica Integral (MP 2.200-2/2001)
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                O envelope será criado na Clicksign com 1 documento PDF e 1 signatário. O cliente
                receberá o link seguro por e-mail e você poderá enviá-lo pelo WhatsApp.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#0B7A5B]" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Dados do Signatário (Editáveis)
              </span>
            </div>

            <div className="space-y-1">
              <Label htmlFor="cs-nome" className="text-xs font-semibold text-slate-700">
                Nome Completo do Cliente *
              </Label>
              <Input
                id="cs-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do cliente para o contrato"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cs-email" className="text-xs font-semibold text-slate-700">
                  E-mail do Cliente *
                </Label>
                <Input
                  id="cs-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@exemplo.com.br"
                  className="h-9 text-xs"
                  required
                />
                {!lead.email && (
                  <span className="text-[10px] text-amber-600 font-medium">
                    Lead não possui e-mail no cadastro. Preenchimento obrigatório.
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="cs-cpf" className="text-xs font-semibold text-slate-700">
                  CPF / CNPJ
                </Label>
                <Input
                  id="cs-cpf"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="cs-tel" className="text-xs font-semibold text-slate-700">
                Telefone / WhatsApp (para lembrete)
              </Label>
              <Input
                id="cs-tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(69) 99999-9999"
                className="h-9 text-xs"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
              <span className="font-semibold block">Título do Envelope:</span>
              <span className="text-slate-700 italic block truncate">{envelopeSugerido}</span>
            </div>
          </div>

          <DialogFooter className="p-0 pt-3 border-t border-slate-100 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs h-9"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-[#0A192F] hover:bg-[#0F284E] text-white font-semibold text-xs h-9 gap-1.5 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Enviando para Clicksign...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-amber-400" />
                  <span>Gerar e Enviar para Assinatura</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
