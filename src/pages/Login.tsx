import React, { useState } from 'react'
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom'
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  KeyRound,
} from 'lucide-react'
import officialLogoPng from '@/assets/a-613c6.png'
import { useAuth } from '@/context/AuthContext'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { toPortugueseErrorMessage } from '@/lib/errors'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MENSAGEM_NEUTRA =
  'Se este e-mail estiver cadastrado, você receberá um link de redefinição em instantes.'

export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [modo, setModo] = useState<'login' | 'recuperar'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetEnviado, setResetEnviado] = useState(false)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!email || !password) {
      setErrorMsg('Por favor, informe seu e-mail e sua senha.')
      return
    }

    try {
      setIsSubmitting(true)
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      console.error('Login error:', err)
      let msg = toPortugueseErrorMessage(
        err,
        'E-mail ou senha inválidos. Verifique suas credenciais.',
      )
      if (
        !msg ||
        msg.toLowerCase().includes('something went wrong') ||
        msg.toLowerCase().includes('clientresponseerror')
      ) {
        msg = 'E-mail ou senha inválidos. Verifique suas credenciais.'
      }
      setErrorMsg(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRecuperarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!email) {
      setErrorMsg('Por favor, informe o e-mail da sua conta.')
      return
    }

    try {
      setIsSendingReset(true)
      await pb.collection('users').requestPasswordReset(email.trim())
      // Enviado — mostra a mensagem neutra de sucesso (mesmo para e-mail inexistente).
      setResetEnviado(true)
    } catch (err: unknown) {
      console.error('Recuperação de senha:', err)
      const status = (err as { status?: number; response?: { code?: number } })?.status
      // SMTP não configurado no backend (ou indisponível):
      // PocketBase responde 400 com a mensagem "Failed to send password reset email."
      if (status === 400 || (err as { response?: { code?: number } })?.response?.code === 400) {
        // Não revela se o e-mail existe: mostra a mensagem neutra.
        setResetEnviado(true)
      } else {
        setErrorMsg(
          'O envio de e-mail não está disponível no momento. Por favor, tente novamente mais tarde ou contate o administrador do sistema.',
        )
      }
    } finally {
      setIsSendingReset(false)
    }
  }

  const voltarParaLogin = () => {
    setModo('login')
    setResetEnviado(false)
    setErrorMsg('')
    setPassword('')
  }

  const iniciarRecuperacao = () => {
    setModo('recuperar')
    setErrorMsg('')
    setResetEnviado(false)
    setPassword('')
  }

  return (
    <div className="min-h-screen bg-radial from-[#1e293b] via-[#0f172a] to-[#020617] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#0B7A5B]/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#F5C518]/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Brand Header — Front Door Oficial ECOSOLAR ENERGY */}
      <div className="text-center mb-8 relative z-10 flex flex-col items-center max-w-sm">
        {/* Card branco com a logo oficial completa em alta definição */}
        <div className="bg-white rounded-3xl p-5 shadow-2xl shadow-black/50 mb-3 border border-white/50 flex flex-col items-center justify-center w-full max-w-[340px]">
          <img
            src={officialLogoPng}
            alt="ECOSOLAR ENERGY — A ENERGIA DO FUTURO, HOJE!"
            className="w-full h-auto max-h-48 object-contain"
          />
        </div>

        <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">
          CRM Comercial e Engenharia Solar Fotovoltaica
        </p>
      </div>

      {/* Login / Recuperação Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-8 relative z-10">
        {modo === 'login' ? (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Acesse sua conta</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Insira suas credenciais corporativas para continuar
              </p>
            </div>

            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-sm animate-fade-in-up">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4.5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  E-mail corporativo
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.nome@empresa.com.br"
                    className="pl-9 h-11 text-sm border-slate-200 focus-visible:ring-[#0B7A5B]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Senha
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 pr-10 h-11 text-sm border-slate-200 focus-visible:ring-[#0B7A5B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-[#0B7A5B] hover:bg-[#095C44] text-white font-semibold text-sm shadow-md shadow-[#0B7A5B]/25 rounded-lg flex items-center justify-center gap-2 mt-2 transition-transform duration-150"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validando acesso...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-3">
              <p className="text-xs text-slate-500">
                Recebeu um convite da equipe?{' '}
                <Link
                  to="/cadastro"
                  className="text-[#0B7A5B] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  Criar conta com código
                </Link>
              </p>
              <button
                type="button"
                onClick={iniciarRecuperacao}
                className="text-xs text-slate-400 hover:text-[#0B7A5B] hover:underline focus:outline-none"
              >
                Esqueci minha senha
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="w-11 h-11 rounded-full bg-[#0B7A5B]/10 flex items-center justify-center mb-3">
                <KeyRound className="w-5 h-5 text-[#0B7A5B]" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recuperar senha</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Informe o e-mail da sua conta para receber o link de redefinição
              </p>
            </div>

            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-sm animate-fade-in-up">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {resetEnviado ? (
              <div className="space-y-5">
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-700 text-sm animate-fade-in-up">
                  <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{MENSAGEM_NEUTRA}</span>
                </div>
                <Button
                  type="button"
                  onClick={voltarParaLogin}
                  className="w-full h-11 bg-[#0B7A5B] hover:bg-[#095C44] text-white font-semibold text-sm shadow-md shadow-[#0B7A5B]/25 rounded-lg flex items-center justify-center gap-2 transition-transform duration-150"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar para o login</span>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRecuperarSenha} className="space-y-4.5">
                <div className="space-y-1.5">
                  <Label htmlFor="recuperar-email" className="text-xs font-semibold text-slate-700">
                    E-mail corporativo
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="recuperar-email"
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.nome@empresa.com.br"
                      className="pl-9 h-11 text-sm border-slate-200 focus-visible:ring-[#0B7A5B]"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSendingReset}
                  className="w-full h-11 bg-[#0B7A5B] hover:bg-[#095C44] text-white font-semibold text-sm shadow-md shadow-[#0B7A5B]/25 rounded-lg flex items-center justify-center gap-2 mt-2 transition-transform duration-150"
                >
                  {isSendingReset ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <span>Enviar link de redefinição</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={voltarParaLogin}
                  className="w-full text-xs text-slate-400 hover:text-[#0B7A5B] hover:underline focus:outline-none flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar para o login
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* Helper Footer */}
      <p className="text-xs text-slate-400 mt-6 relative z-10 text-center">
        Acesso restrito à equipe autorizada.
      </p>
    </div>
  )
}
