import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { User } from '@/types/crm'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    return (pb.authStore.record as unknown as User) || null
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (pb.authStore.isValid) {
          // Refresh auth record
          const authRecord = await pb.collection('users').authRefresh()
          setUser(authRecord.record as unknown as User)
        } else {
          setUser(null)
        }
      } catch (_) {
        pb.authStore.clear()
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser((model as unknown as User) || null)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    const authData = await pb.collection('users').authWithPassword(email, pass)
    if (!authData || !authData.record) {
      throw new Error('Falha na autenticação: dados de usuário não retornados.')
    }
    setUser(authData.record as unknown as User)
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    window.location.href = '/login'
  }

  const refreshUser = async () => {
    if (pb.authStore.isValid) {
      try {
        const authRecord = await pb.collection('users').authRefresh()
        setUser(authRecord.record as unknown as User)
      } catch (_) {
        // ignore
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'Admin',
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
