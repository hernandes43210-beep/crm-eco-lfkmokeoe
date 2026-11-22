/* Estado React persistido no localStorage (tolerante a falhas de acesso/JSON inválido) */
import { useEffect, useState } from 'react'

export function useLocalStorageState<T>(chave: string, inicial: T) {
  const [valor, setValor] = useState<T>(() => {
    try {
      const salvo = localStorage.getItem(chave)
      return salvo !== null ? (JSON.parse(salvo) as T) : inicial
    } catch {
      return inicial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify(valor))
    } catch {
      // armazenamento indisponível (modo privado, cota cheia): segue só em memória
    }
  }, [chave, valor])

  return [valor, setValor] as const
}

/** Re-renderiza a cada `ms` enquanto `ativo` for true; retorna o "agora" atual */
export function useAgora(ativo: boolean, ms = 250) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    setAgora(Date.now())
    if (!ativo) return
    const id = window.setInterval(() => setAgora(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [ativo, ms])
  return agora
}
