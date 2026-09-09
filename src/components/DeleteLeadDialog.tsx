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

interface DeleteLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadName?: string
  isDeleting: boolean
  onConfirm: () => void | Promise<void>
}

export function DeleteLeadDialog({
  open,
  onOpenChange,
  leadName,
  isDeleting,
  onConfirm,
}: DeleteLeadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !isDeleting && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-2">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900">Excluir Lead</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 mt-1.5">
              {leadName ? (
                <>
                  Deseja realmente excluir o lead de{' '}
                  <strong className="text-slate-900 font-semibold">{leadName}</strong>? Esta ação
                  não pode ser desfeita e removerá todos os dados comerciais associados.
                </>
              ) : (
                'Deseja realmente excluir este lead? Esta ação não pode ser desfeita.'
              )}
            </DialogDescription>
          </div>
        </DialogHeader>

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
              'Excluir Lead'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
