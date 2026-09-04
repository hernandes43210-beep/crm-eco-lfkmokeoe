import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Sun,
  User,
  Mail,
  Lock,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Cadastro() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [codigoConvite, setCodigoConvite] = useState('')

  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!email || !password || !codigoConvite) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    if (password.length < 8) {
      setErrorMsg('A senha deve conter no mínimo 8 caracteres.')
      return
    }

    if (password !== passwordConfirm) {
      setErrorMsg('A confirmação de senha não confere com a senha digitada.')
      return
    }

    try {
      setIsSubmitting(true)
      const backendUrl = import.meta.env.VITE_POCKETBASE_URL || ''
      const res = await fetch(`${backendUrl}/backend/v1/cadastro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          password,
          codigo_convite: codigoConvite.trim().toUpperCase(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Falha ao realizar cadastro.')
      }

      setSuccessMsg('Cadastro validado com sucesso! Autenticando...')

      // Automatically log the new user in
      await login(email.trim().toLowerCase(), password)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      console.error('Registration error:', err)
      const message = err instanceof Error ? err.message : 'Código de convite inválido ou expirado.'
      setErrorMsg(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-radial from-[#1e293b] via-[#0f172a] to-[#020617] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none">
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-[#0B7A5B]/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-[#F59E0B]/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Brand Header */}
      <div className="text-center mb-6 relative z-10 flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0B7A5B] to-emerald-400 flex items-center justify-center text-amber-300 shadow-xl shadow-emerald-950/60 mb-2 border border-emerald-400/30">
          <Sun className="w-8 h-8" />
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Solar</h1>
          <h1 className="text-2xl font-extrabold text-amber-400 tracking-tight">CRM</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          Ativação de novo membro da equipe comercial
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-7 relative z-10">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Entrar para a Equipe</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Insira o código de convite fornecido pelo seu administrador
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs animate-fade-in-up">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-700 text-xs animate-fade-in-up">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <Label htmlFor="codigo" className="text-xs font-semibold text-slate-700">
              Código de Convite (6 dígitos) *
            </Label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
              <Input
                id="codigo"
                required
                value={codigoConvite}
                onChange={(e) => setCodigoConvite(e.target.value.toUpperCase())}
                placeholder="Ex: SOL789"
                maxLength={10}
                className="pl-9 h-10 font-mono tracking-wider font-bold text-sm uppercase border-amber-200 bg-amber-50/30 focus-visible:ring-amber-500"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Convite demo disponível:{' '}
              <span className="font-mono font-bold text-slate-600">SOL789</span> (para
              vendedor.demo@solarcrm.com)
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="nome" className="text-xs font-semibold text-slate-700">
              Nome Completo
            </Label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Lucas Vendedor"
                className="pl-9 h-10 text-sm border-slate-200"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
              E-mail *
            </Label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vendedor.demo@solarcrm.com"
                className="pl-9 h-10 text-sm border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Senha *
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 dígitos"
                  className="pl-9 h-10 text-sm border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="passwordConfirm" className="text-xs font-semibold text-slate-700">
                Confirmar Senha *
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="passwordConfirm"
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Repita a senha"
                  className="pl-9 h-10 text-sm border-slate-200"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10.5 bg-[#0B7A5B] hover:bg-[#095C44] text-white font-semibold text-sm shadow-md shadow-[#0B7A5B]/25 rounded-lg flex items-center justify-center gap-2 mt-4"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Ativando convite...</span>
              </>
            ) : (
              <>
                <span>Ativar Conta e Entrar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Já possui login e senha?{' '}
            <Link to="/login" className="text-[#0B7A5B] font-semibold hover:underline">
              Acessar minha conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
