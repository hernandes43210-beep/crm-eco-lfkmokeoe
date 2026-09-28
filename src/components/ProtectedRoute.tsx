import React, { useEffect, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ProtectedRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
  blockEngenheiro?: boolean
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  adminOnly = false,
  blockEngenheiro = false,
}) => {
  const { isAuthenticated, isLoading, isAdmin, isEngenheiro } = useAuth()
  const location = useLocation()
  const notifiedPathRef = useRef<string | null>(null)

  const isAccessBlocked = isEngenheiro && (blockEngenheiro || adminOnly)

  useEffect(() => {
    if (isAccessBlocked && notifiedPathRef.current !== location.pathname) {
      notifiedPathRef.current = location.pathname
      toast({
        title: 'Acesso restrito',
        description: 'Engenheiros acessam apenas Meus Documentos.',
        variant: 'destructive',
      })
    }
  }, [isAccessBlocked, location.pathname])

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

  if (isEngenheiro && (blockEngenheiro || (adminOnly && !isAdmin))) {
    return <Navigate to="/engenharia" replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to={isEngenheiro ? '/engenharia' : '/'} replace />
  }

  return <>{children}</>
}
