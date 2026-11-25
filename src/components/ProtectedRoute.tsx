import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
  blockEngenheiro?: boolean
  blockInstalador?: boolean
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  adminOnly = false,
  blockEngenheiro = false,
  blockInstalador = false,
}) => {
  const { isAuthenticated, isLoading, isAdmin, isEngenheiro, isInstalador } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B7A5B]" />
        <p className="text-sm font-medium text-slate-500">Carregando painel solar...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Bloqueio de rotas comerciais para Engenheiro: redirecionamento silencioso para /engenharia sem toast
  if (isEngenheiro && (blockEngenheiro || (adminOnly && !isAdmin))) {
    return <Navigate to="/engenharia" replace />
  }

  // Bloqueio de rotas comerciais para Instalador: redirecionamento silencioso para /minhas-instalacoes sem toast
  if (isInstalador && (blockInstalador || (adminOnly && !isAdmin))) {
    return <Navigate to="/minhas-instalacoes" replace />
  }

  if (adminOnly && !isAdmin) {
    return (
      <Navigate
        to={isEngenheiro ? '/engenharia' : isInstalador ? '/minhas-instalacoes' : '/'}
        replace
      />
    )
  }

  return <>{children}</>
}
