import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { formatBRL } from '@/lib/solarUtils'
import type { Proposta } from '@/types/crm'

interface DeletePropostaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proposta?: Proposta | null
  isDeleting: boolean
  onConfirm: () => void | Promise<void>
}

export function DeletePropostaDialog({
  open,
  onOpenChange,
  proposta,
  isDeleting,
  onConfirm,
}: DeletePropostaDialogProps) {
  const kitNome = proposta?.kit_nome || 'Proposta Comercial'
  const precoVenda = proposta?.preco_venda ? formatBRL(proposta.preco_venda) : null
  const clienteNome = proposta?.expand?.lead?.nome

  return (
    <Dialog open={open} onOpenChange={(val) => !isDeleting && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-2">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Excluir proposta?
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              Esta ação{' '}
              <strong className="text-slate-900 font-semibold">não pode ser desfeita</strong>. O
              registro da proposta será excluído permanentemente da base de dados e o link público
              de aceite deixará de funcionar.
            </DialogDescription>
          </div>
        </DialogHeader>

        {proposta && (
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs space-y-1 text-slate-600 my-1">
            <p className="font-semibold text-slate-800 truncate">{kitNome}</p>
            {clienteNome && (
              <p>
                Cliente: <span className="font-medium text-slate-700">{clienteNome}</span>
              </p>
            )}
            {precoVenda && (
              <p>
                Valor:{' '}
                <span className="font-bold text-[#0B7A5B] font-mono-numbers">{precoVenda}</span>
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Excluindo...</span>
              </>
            ) : (
              'Excluir'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
