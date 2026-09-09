import React, { useState } from 'react'
import { Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/context/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'

interface ChangePasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function translatePocketBaseError(error: unknown): string {
  if (!error) return 'Ocorreu um erro ao alterar a senha.'

  const errObj = error as {
    message?: string
    response?: {
      message?: string
      data?: Record<string, { code?: string; message?: string }>
    }
  }

  const data = errObj.response?.data
  if (data) {
    if (data.oldPassword) {
      return 'A senha atual está incorreta.'
    }
    if (data.password) {
      const msg = data.password.message || ''
      if (msg.includes('length') || msg.includes('min') || msg.includes('caracteres')) {
        return 'A nova senha deve ter no mínimo 8 caracteres.'
      }
      return data.password.message || 'Nova senha inválida.'
    }
    if (data.passwordConfirm) {
      return 'A confirmação de senha não confere.'
    }
  }

  const generalMsg = errObj.response?.message || errObj.message || ''
  if (
    generalMsg.toLowerCase().includes('failed to authenticate') ||
    generalMsg.toLowerCase().includes('invalid credentials')
  ) {
    return 'A senha atual está incorreta.'
  }

  return 'Não foi possível alterar a senha. Verifique os dados informados.'
}

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleClose = () => {
    if (isSubmitting) return
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setValidationError(null)
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!user || !user.email) {
      setValidationError('Usuário não autenticado.')
      return
    }

    if (!currentPassword) {
      setValidationError('Informe a sua senha atual.')
      return
    }

    if (newPassword.length < 8) {
      setValidationError('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setValidationError('A confirmação da nova senha não confere.')
      return
    }

    if (newPassword === currentPassword) {
      setValidationError('A nova senha deve ser diferente da senha atual.')
      return
    }

    try {
      setIsSubmitting(true)

      // 1. Validar a senha atual com authWithPassword
      try {
        await pb.collection('users').authWithPassword(user.email, currentPassword)
      } catch (authErr) {
        console.error('Erro na validação da senha atual:', authErr)
        setValidationError('A senha atual está incorreta.')
        setIsSubmitting(false)
        return
      }

      // 2. Atualizar a senha do usuário
      await pb.collection('users').update(user.id, {
        oldPassword: currentPassword,
        password: newPassword,
        passwordConfirm: newPassword,
      })

      toast({
        title: 'Senha alterada com sucesso!',
        description: 'Sua nova senha de acesso já está em vigor.',
      })

      handleClose()
    } catch (err: unknown) {
      console.error('Erro ao atualizar senha:', err)
      const friendlyError = translatePocketBaseError(err)
      setValidationError(friendlyError)
      toast({
        title: 'Erro ao alterar senha',
        description: friendlyError,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1 text-[#0B7A5B]">
            <KeyRound className="w-5 h-5" />
            <DialogTitle className="text-lg font-bold text-slate-900">
              Alterar Minha Senha
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Atualize sua senha de acesso ao CRM Ecosolar Energy. Informe sua senha atual para
            confirmação.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {validationError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Senha Atual */}
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword" className="text-xs font-semibold text-slate-700">
              Senha Atual *
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                className="h-9.5 text-sm pr-10 border-slate-200 focus-visible:ring-[#0B7A5B]"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                title={showCurrentPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nova Senha */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="newPassword" className="text-xs font-semibold text-slate-700">
                Nova Senha *
              </Label>
              <span className="text-[11px] text-slate-400">Mínimo 8 caracteres</span>
            </div>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
                className="h-9.5 text-sm pr-10 border-slate-200 focus-visible:ring-[#0B7A5B]"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                title={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar Nova Senha */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">
              Confirmar Nova Senha *
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="h-9.5 text-sm pr-10 border-slate-200 focus-visible:ring-[#0B7A5B]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                title={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0B7A5B] mt-0.5 shrink-0" />
            <p className="text-[11px] text-slate-500 leading-tight">
              Sua sessão permanecerá ativa após a troca de senha neste navegador.
            </p>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleClose}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Salvar nova senha</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
