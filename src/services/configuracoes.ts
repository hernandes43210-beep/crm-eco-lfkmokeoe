// Serviço das configurações globais do app (coleção configuracoes_app,
// registro único com chave 'app'). Somente Admin/CEO acessam no banco.
import pb from '@/lib/pocketbase/client'
import { getErrorMessage as _getErrorMessageBase } from '@/lib/pocketbase/errors'

const getErrorMessage = (err: unknown, fallback: string) => {
  const msg = _getErrorMessageBase(err)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallback
}

export type ModeloProposta = 'classica' | 'story'

export interface ConfiguracoesApp {
  id: string
  cor_primaria: string
  modelo_proposta_padrao: ModeloProposta
  margem_padrao_kit: number
  observacoes: string
}

export const CHAVE_CONFIG_APP = 'app'

/** Cor primária padrão do CRM (Solar Green) — mesma do tema em main.css. */
export const COR_PADRAO = '0B7A5B'
/** Margem padrão caso não haja configuração salva. */
export const MARGEM_PADRAO_KIT_FALLBACK = 41

export interface SalvarConfiguracoesPayload {
  cor_primaria: string
  modelo_proposta_padrao: ModeloProposta
  margem_padrao_kit: number
  observacoes: string
}

function normalizarConfig(registro: any): ConfiguracoesApp {
  return {
    id: registro.id,
    cor_primaria: (registro.cor_primaria || COR_PADRAO).toUpperCase().replace('#', ''),
    modelo_proposta_padrao: registro.modelo_proposta_padrao === 'story' ? 'story' : 'classica',
    margem_padrao_kit:
      typeof registro.margem_padrao_kit === 'number' && !isNaN(registro.margem_padrao_kit)
        ? registro.margem_padrao_kit
        : MARGEM_PADRAO_KIT_FALLBACK,
    observacoes: registro.observacoes || '',
  }
}

export const ConfiguracoesService = {
  /** Carrega o registro único de configurações; null quando não existe ainda. */
  async carregar(): Promise<ConfiguracoesApp | null> {
    try {
      const registro = await pb
        .collection('configuracoes_app')
        .getFirstListItem<ConfiguracoesApp>(`chave = "${CHAVE_CONFIG_APP}"`)
      return normalizarConfig(registro)
    } catch (err: any) {
      if (err?.status === 404) return null
      throw new Error(getErrorMessage(err, 'Erro ao carregar as configurações do app.'))
    }
  },

  /** Cria ou atualiza o registro único de configurações. */
  async salvar(payload: SalvarConfiguracoesPayload): Promise<ConfiguracoesApp> {
    const dados = {
      chave: CHAVE_CONFIG_APP,
      cor_primaria: payload.cor_primaria.toUpperCase().replace('#', ''),
      modelo_proposta_padrao: payload.modelo_proposta_padrao,
      margem_padrao_kit: payload.margem_padrao_kit,
      observacoes: payload.observacoes,
    }
    try {
      const existente = await pb
        .collection('configuracoes_app')
        .getFirstListItem<{ id: string }>(`chave = "${CHAVE_CONFIG_APP}"`)
      const atualizado = await pb
        .collection('configuracoes_app')
        .update<ConfiguracoesApp>(existente.id, dados)
      return normalizarConfig(atualizado)
    } catch (err: any) {
      if (err?.status === 404) {
        const criado = await pb.collection('configuracoes_app').create<ConfiguracoesApp>(dados)
        return normalizarConfig(criado)
      }
      throw new Error(getErrorMessage(err, 'Erro ao salvar as configurações do app.'))
    }
  },
}

// ---------- Tema de cores (paleta + aplicação via variáveis CSS) ----------

export interface OpcaoCor {
  /** Hex sem '#' (armazenado no banco). */
  valor: string
  nome: string
  /** HSL "H S% L%" equivalente para as variáveis --primary / --ring. */
  hsl: string
  /** Hex do tom de hover (mais escuro). */
  hover: string
  /** Hex do tom de fundo suave (accent). */
  suave: string
}

export const PALETA_CORES: OpcaoCor[] = [
  {
    valor: '0B7A5B',
    nome: 'Verde Solar (padrão)',
    hsl: '163 83% 26%',
    hover: '#095C44',
    suave: '163 45% 95%',
  },
  {
    valor: '0E7490',
    nome: 'Azul Oceano',
    hsl: '192 79% 31%',
    hover: '#0A5A70',
    suave: '192 45% 95%',
  },
  {
    valor: '1D4ED8',
    nome: 'Azul Royal',
    hsl: '224 69% 48%',
    hover: '#173DB0',
    suave: '224 45% 95%',
  },
  {
    valor: '6D28D9',
    nome: 'Violeta',
    hsl: '262 66% 50%',
    hover: '#551FB0',
    suave: '262 45% 96%',
  },
  {
    valor: 'B45309',
    nome: 'Âmbar Terroso',
    hsl: '27 90% 37%',
    hover: '#8F4207',
    suave: '33 60% 95%',
  },
  {
    valor: 'BE123C',
    nome: 'Rubi',
    hsl: '347 78% 41%',
    hover: '#9A0F30',
    suave: '347 55% 96%',
  },
  {
    valor: '374151',
    nome: 'Grafite',
    hsl: '217 19% 27%',
    hover: '#232C3B',
    suave: '217 20% 94%',
  },
  {
    valor: '0F766E',
    nome: 'Teal',
    hsl: '175 77% 26%',
    hover: '#0B5A54',
    suave: '175 45% 95%',
  },
]

/** Aplica a cor escolhida nas variáveis CSS globais do tema (--primary, --ring, --accent, sidebar). */
export function aplicarCorTema(corHex: string) {
  const hex = (corHex || COR_PADRAO).toUpperCase().replace('#', '')
  const opcao =
    PALETA_CORES.find((c) => c.valor === hex) || PALETA_CORES.find((c) => c.valor === COR_PADRAO)!

  const root = document.documentElement
  root.style.setProperty('--primary', opcao.hsl)
  root.style.setProperty('--ring', opcao.hsl)
  root.style.setProperty('--accent', opcao.suave)
  root.style.setProperty('--sidebar-primary', opcao.hsl)
  root.style.setProperty('--sidebar-ring', opcao.hsl)
}
