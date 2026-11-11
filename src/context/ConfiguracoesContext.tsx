// Contexto global das configurações do app: carrega o registro único da
// coleção configuracoes_app, aplica a cor primária do tema via variáveis CSS
// e expõe a margem padrão do kit e o modelo padrão de proposta.
// Para Vendedor/Engenheiro a coleção é restrita — volta silenciosamente ao padrão.
import { createContext, useContext, useEffect, useState } from 'react'
import {
  ConfiguracoesService,
  aplicarCorTema,
  type ConfiguracoesApp,
  type ModeloProposta,
  COR_PADRAO,
  MARGEM_PADRAO_KIT_FALLBACK,
} from '@/services/configuracoes'
import { useAuth } from '@/context/AuthContext'

interface ConfiguracoesContextValue {
  pronto: boolean
  /** Cor primária em hex sem '#' (ex.: '0B7A5B'). */
  corPrimaria: string
  modeloPropostaPadrao: ModeloProposta
  margemPadraoKit: number
}

const ConfiguracoesContext = createContext<ConfiguracoesContextValue>({
  pronto: false,
  corPrimaria: COR_PADRAO,
  modeloPropostaPadrao: 'classica',
  margemPadraoKit: MARGEM_PADRAO_KIT_FALLBACK,
})

export function ConfiguracoesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [config, setConfig] = useState<ConfiguracoesApp | null>(null)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    let ativo = true
    // Sem usuário logado (login/cadastro) aplica o padrão e não consulta o banco.
    if (!user) {
      aplicarCorTema(COR_PADRAO)
      setConfig(null)
      setPronto(false)
      return
    }
    ;(async () => {
      try {
        const c = await ConfiguracoesService.carregar()
        if (!ativo) return
        setConfig(c)
        aplicarCorTema(c?.cor_primaria || COR_PADRAO)
      } catch (err) {
        console.warn('Configurações do app indisponíveis, usando padrão:', err)
        if (!ativo) return
        setConfig(null)
        aplicarCorTema(COR_PADRAO)
      } finally {
        if (ativo) setPronto(true)
      }
    })()
    return () => {
      ativo = false
    }
  }, [user])

  return (
    <ConfiguracoesContext.Provider
      value={{
        pronto,
        corPrimaria: config?.cor_primaria || COR_PADRAO,
        modeloPropostaPadrao: config?.modelo_proposta_padrao || 'classica',
        margemPadraoKit: config?.margem_padrao_kit ?? MARGEM_PADRAO_KIT_FALLBACK,
      }}
    >
      {children}
    </ConfiguracoesContext.Provider>
  )
}

export function useConfiguracoesApp() {
  return useContext(ConfiguracoesContext)
}
