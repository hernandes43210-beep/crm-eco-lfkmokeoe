import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { HomologacaoService } from '@/services/homologacao'
import type { HomologacaoLead } from '@/types/crm'
import { FileUp, Loader2, AlertCircle, FileText, CheckCircle2 } from 'lucide-react'

interface EnviarArtModalProps {
  homologacao: HomologacaoLead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (updated: { homologacaoId: string; artStatus: string; artArquivo?: string }) => void
}

export function EnviarArtModal({
  homologacao,
  open,
  onOpenChange,
  onSuccess,
}: EnviarArtModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [observacao, setObservacao] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!homologacao) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo em formato PDF.',
        variant: 'destructive',
      })
      e.target.value = ''
      return
    }

    if (selected.size > 30 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo não pode exceder 30 MB.',
        variant: 'destructive',
      })
      e.target.value = ''
      return
    }

    setFile(selected)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file && !homologacao.art_arquivo) {
      toast({
        title: 'Arquivo obrigatório',
        description: 'Por favor, anexe o arquivo PDF da ART.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)

      // Se não selecionou um novo arquivo mas já tem um existente, criamos um dummy File ou informamos
      if (!file) {
        toast({
          title: 'Arquivo não selecionado',
          description: 'Selecione o arquivo PDF da ART a ser enviada.',
          variant: 'destructive',
        })
        setSubmitting(false)
        return
      }

      const res = await HomologacaoService.enviarArt(homologacao.id, file, observacao)

      toast({
        title: 'ART enviada para pagamento!',
        description: 'Notificação e e-mail disparados para o vendedor responsável e para o Admin.',
      })

      onSuccess({
        homologacaoId: homologacao.id,
        artStatus: 'enviada',
        artArquivo: res.art_arquivo || file.name,
      })
      onOpenChange(false)
      setFile(null)
      setObservacao('')
    } catch (err: any) {
      console.error('Erro ao enviar ART:', err)
      toast({
        title: 'Erro ao enviar ART',
        description:
          err?.message ||
          'Não foi possível enviar o documento da ART. Verifique o arquivo e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white text-slate-900 border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <FileUp className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Enviar ART para Pagamento
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Cliente: <strong>{homologacao.cliente_nome || 'Cliente'}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Card Resumo do Cliente */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Local:</span>
              <span className="font-semibold text-slate-800">
                {homologacao.cliente_cidade || 'Não informado'}
                {homologacao.cliente_estado ? ` - ${homologacao.cliente_estado}` : ''}
              </span>
            </div>
            {homologacao.potencia_total_kwp ? (
              <div className="flex justify-between">
                <span className="text-slate-500">Potência:</span>
                <span className="font-bold text-emerald-700">
                  {homologacao.potencia_total_kwp} kWp
                </span>
              </div>
            ) : null}
            {homologacao.unidade_consumidora && (
              <div className="flex justify-between">
                <span className="text-slate-500">Unidade Consumidora:</span>
                <span className="font-mono text-slate-700">{homologacao.unidade_consumidora}</span>
              </div>
            )}
          </div>

          {/* Anexo de Arquivo PDF */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <span>Arquivo da ART (PDF)</span>
              <span className="text-rose-500">*</span>
            </Label>

            <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500/60 rounded-xl p-4 text-center bg-slate-50/50 hover:bg-emerald-50/20 transition-colors">
              <input
                type="file"
                id="art-file-input"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={submitting}
              />
              <label
                htmlFor="art-file-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                {file ? (
                  <div className="flex items-center gap-2 text-emerald-800 bg-emerald-100/70 px-3 py-1.5 rounded-lg border border-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-xs font-bold truncate max-w-[240px]">{file.name}</span>
                    <span className="text-[10px] text-emerald-900 font-mono">
                      ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#0B7A5B] flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800">
                        Clique para selecionar o PDF da ART
                      </p>
                      <p className="text-[11px] text-slate-400">PDF até 30 MB</p>
                    </div>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Campo Observação */}
          <div className="space-y-1.5">
            <Label htmlFor="art-obs" className="text-xs font-bold text-slate-700">
              Observações / Instruções para o Pagamento (opcional)
            </Label>
            <Textarea
              id="art-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Taxa do CREA no valor de R$ 98,50 com vencimento em 3 dias..."
              className="text-xs min-h-[75px] border-slate-200"
              disabled={submitting}
            />
          </div>

          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Atenção:</strong> Ao enviar, o vendedor responsável e os administradores
              receberão um alerta no sino e e-mail transacional com o botão para baixar a ART. O
              card no Kanban exibirá a marcação{' '}
              <span className="font-bold underline text-amber-950">
                "ART enviada — aguardando pagamento"
              </span>
              .
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || (!file && !homologacao.art_arquivo)}
              className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando ART...</span>
                </>
              ) : (
                <>
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Confirmar & Enviar ART</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
