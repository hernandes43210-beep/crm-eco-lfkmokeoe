import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Loader2,
  KeyRound,
  CheckCircle2,
} from 'lucide-react'
import officialLogoPng from '@/assets/a-613c6.png'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getFriendlyErrorMessage } from '@/lib/errors'

const MIN_SENHA = 8

type EstadoTela = 'form' | 'sucesso' | 'linkInvalido'

const AVISO_LINK_INVALIDO = 'Link inválido ou expirado. Solicite um novo link de redefinição.'

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams()

  // O template do PocketBase envia o token como query param: ...?token=eyJ...
  // (suporta também o formato com hash #/... usado por templates antigos).
  const token = useMemo(() => {
    const daQuery = searchParams.get('token') || ''
    if (daQuery) return daQuery
    const hash = window.location.hash || ''
    const idx = hash.indexOf('token=')
    return idx >= 0 ? hash.slice(idx + 'token='.length) : ''
  }, [searchParams])

  const tokenPresente = token.trim().length > 0

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const [erroConfirmar, setErroConfirmar] = useState('')
  const [erroGeral, setErroGeral] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [estado, setEstado] = useState<EstadoTela>(tokenPresente ? 'form' : 'linkInvalido')

  // Sem token na URL → aviso de link inválido desde o início.
  useEffect(() => {
    if (!tokenPresente) setEstado('linkInvalido')
  }, [tokenPresente])

  if (!tokenPresente) {
    return (
      <div className="min-h-screen bg-radial from-[#1e293b] via-[#0f172a] to-[#020617] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#0B7A5B]/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#F5C518]/15 rounded-full blur-3xl pointer-events-none"></div>
        <CardLinkInvalido />
      </div>
    )
  }

  const validarCampos = (): boolean => {
    setErroSenha('')
    setErroConfirmar('')
    setErroGeral('')

    if (novaSenha.length < MIN_SENHA) {
      setErroSenha(`A senha deve ter no mínimo ${MIN_SENHA} caracteres.`)
      return false
    }
    if (confirmarSenha !== novaSenha) {
      setErroConfirmar('As senhas não coincidem.')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validarCampos()) return

    try {
      setIsSubmitting(true)
      await pb.collection('users').confirmPasswordReset(token, novaSenha, confirmarSenha)
      setEstado('sucesso')
    } catch (err: unknown) {
      console.error('confirmPasswordReset:', err)
      // 400 = token inválido/expirado no PocketBase
      const status = (err as { status?: number; response?: { code?: number } })?.status
      if (status === 400 || (err as { response?: { code?: number } })?.response?.code === 400) {
        setEstado('linkInvalido')
        return
      }
      setErroGeral(
        getFriendlyErrorMessage(err, 'Não foi possível redefinir a senha. Tente novamente.'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (estado === 'sucesso') {
    return (
      <div className="min-h-screen bg-radial from-[#1e293b] via-[#0f172a] to-[#020617] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#0B7A5B]/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#F5C518]/15 rounded-full blur-3xl pointer-events-none"></div>
        <CardSucesso />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-radial from-[#1e293b] via-[#0f172a] to-[#020617] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#0B7A5B]/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#F5C518]/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Brand Header — Front Door Oficial ECOSOLAR ENERGY */}
      <div className="text-center mb-8 relative z-10 flex flex-col items-center max-w-sm">
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

      {/* Redefinir Senha Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-8 relative z-10">
        <div className="mb-6">
          <div className="w-11 h-11 rounded-full bg-[#0B7A5B]/10 flex items-center justify-center mb-3">
            <KeyRound className="w-5 h-5 text-[#0B7A5B]" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Redefinir senha</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Crie uma nova senha para acessar sua conta
          </p>
        </div>

        {erroGeral && (
          <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-sm animate-fade-in-up">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{erroGeral}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4.5">
          <div className="space-y-1.5">
            <Label htmlFor="nova-senha" className="text-xs font-semibold text-slate-700">
              Nova senha
            </Label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="nova-senha"
                type={showSenha ? 'text' : 'password'}
                required
                autoFocus
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder={`Mínimo de ${MIN_SENHA} caracteres`}
                className="pl-9 pr-10 h-11 text-sm border-slate-200 focus-visible:ring-[#0B7A5B]"
              />
              <button
                type="button"
                onClick={() => setShowSenha(!showSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {erroSenha && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {erroSenha}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmar-senha" className="text-xs font-semibold text-slate-700">
              Confirmar nova senha
            </Label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="confirmar-senha"
                type={showConfirmar ? 'text' : 'password'}
                required
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a nova senha"
                className="pl-9 pr-10 h-11 text-sm border-slate-200 focus-visible:ring-[#0B7A5B]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmar(!showConfirmar)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {erroConfirmar && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {erroConfirmar}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-[#0B7A5B] hover:bg-[#095C44] text-white font-semibold text-sm shadow-md shadow-[#0B7A5B]/25 rounded-lg flex items-center justify-center gap-2 mt-2 transition-transform duration-150"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <span>Salvar nova senha</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </div>

      <p className="text-xs text-slate-400 mt-6 relative z-10 text-center">
        Acesso restrito à equipe autorizada.
      </p>
    </div>
  )
}

function CardSucesso() {
  // Redireciona para o login alguns segundos após o sucesso.
  useEffect(() => {
    const t = setTimeout(() => {
      window.location.href = '/login'
    }, 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-8 relative z-10 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-7 h-7 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
        Senha redefinida com sucesso!
      </h2>
      <p className="text-xs text-slate-500 mt-1 mb-6">
        Sua nova senha já está ativa. Você será redirecionado para o login em instantes.
      </p>
      <Link
        to="/login"
        className="w-full h-11 bg-[#0B7A5B] hover:bg-[#095C44] text-white font-semibold text-sm shadow-md shadow-[#0B7A5B]/25 rounded-lg flex items-center justify-center gap-2 transition-transform duration-150"
      >
        <span>Ir para o login</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

function CardLinkInvalido() {
  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-8 relative z-10 text-center">
      <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-7 h-7 text-rose-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 tracking-tight">Link inválido</h2>
      <p className="text-xs text-slate-500 mt-1 mb-6">{AVISO_LINK_INVALIDO}</p>
      <Link
        to="/login"
        className="w-full h-11 bg-[#0B7A5B] hover:bg-[#095C44] text-white font-semibold text-sm shadow-md shadow-[#0B7A5B]/25 rounded-lg flex items-center justify-center gap-2 transition-transform duration-150"
      >
        <span>Voltar para o login</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
