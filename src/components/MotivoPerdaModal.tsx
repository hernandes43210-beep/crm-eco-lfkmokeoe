import React, { useState, useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Loader2 } from 'lucide-react'

export const MOTIVOS_PERDA_PADRAO = [
  'Preço alto / Fora do orçamento',
  'Concorrência (preço ou prazo menor)',
  'Sem poder aquisitivo no momento',
  'Financiamento não aprovado pelo banco',
  'Cliente desistiu do investimento solar',
  'Incerteza sobre imóvel (alugado/mudança/reforma)',
  'Não atendeu mais / Sem retorno nas tentativas',
  'Estrutura do telhado ou padrão inviável',
  'Outro motivo...',
] as const

interface MotivoPerdaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadNome?: string
  isSubmitting?: boolean
  onConfirm: (dados: { motivo: string; observacao?: string }) => void | Promise<void>
  onCancel?: () => void
}

export function MotivoPerdaModal({
  open,
  onOpenChange,
  leadNome,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: MotivoPerdaModalProps) {
  const [motivoSelecionado, setMotivoSelecionado] = useState<string>(MOTIVOS_PERDA_PADRAO[0])
  const [motivoCustomizado, setMotivoCustomizado] = useState('')
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  // Resetar estados sempre que abrir
  useEffect(() => {
    if (open) {
      setMotivoSelecionado(MOTIVOS_PERDA_PADRAO[0])
      setMotivoCustomizado('')
      setObservacao('')
      setErro(null)
    }
  }, [open])

  const handleClose = () => {
    if (isSubmitting) return
    onOpenChange(false)
    onCancel?.()
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErro(null)

    const isOutro = motivoSelecionado === 'Outro motivo...'
    const motivoFinal = isOutro ? motivoCustomizado.trim() : motivoSelecionado

    if (isOutro && !motivoFinal) {
      setErro('Por favor, informe o motivo da perda do lead.')
      return
    }

    try {
      await onConfirm({
        motivo: motivoFinal,
        observacao: observacao.trim() ? observacao.trim() : undefined,
      })
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível registrar o motivo da perda. Tente novamente.'
      setErro(msg)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) {
          handleClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-2">
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Mover para Fechado Perdido
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-1">
              {leadNome ? (
                <>
                  Informe a razão pela qual a negociação com{' '}
                  <strong className="text-slate-900 font-semibold">{leadNome}</strong> não foi
                  concluída. Isso nos ajuda a aprimorar as estratégias comerciais.
                </>
              ) : (
                'Informe o motivo da perda desta oportunidade comercial.'
              )}
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {erro && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
              {erro}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="motivo-select" className="text-xs font-semibold text-slate-700">
              Motivo principal da perda <span className="text-rose-500">*</span>
            </Label>
            <select
              id="motivo-select"
              value={motivoSelecionado}
              onChange={(e) => {
                setMotivoSelecionado(e.target.value)
                setErro(null)
              }}
              disabled={isSubmitting}
              className="w-full h-9.5 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
            >
              {MOTIVOS_PERDA_PADRAO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {motivoSelecionado === 'Outro motivo...' && (
            <div className="space-y-1.5 animate-fade-in">
              <Label htmlFor="motivo-custom" className="text-xs font-semibold text-slate-700">
                Descreva o motivo <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="motivo-custom"
                value={motivoCustomizado}
                onChange={(e) => {
                  setMotivoCustomizado(e.target.value)
                  if (erro) setErro(null)
                }}
                disabled={isSubmitting}
                placeholder="Ex.: Fechou com concorrente local por ter parcelamento próprio"
                className="h-9.5 text-xs border-slate-300 focus-visible:ring-[#0B7A5B]"
                autoFocus
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="motivo-obs" className="text-xs font-semibold text-slate-700">
                Observação detalhada (opcional)
              </Label>
              <span className="text-[11px] text-slate-400">Visível no histórico</span>
            </div>
            <Textarea
              id="motivo-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              disabled={isSubmitting}
              placeholder="Adicione detalhes relevantes (ex.: nome do concorrente, objeção de valor ou se vale retornar no futuro)..."
              className="text-xs border-slate-300 focus-visible:ring-[#0B7A5B] resize-none"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                'Confirmar e Marcar Perdido'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
