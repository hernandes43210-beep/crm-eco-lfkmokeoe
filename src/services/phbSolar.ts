import pb from '@/lib/pocketbase/client'

export type PhbTensao = 'mono_127' | 'mono_220' | 'tri_127220' | 'tri_220380'
export type PhbTipoEstrutura = 'telhado' | 'solo' | 'solo_monoposte' | 'laje' | 'carport'

export interface PhbStatusResponse {
  configured: boolean
  source: 'database' | 'env' | 'none'
  masked_token: string | null
  settings_id?: string | null
  base_url?: string
  ultimo_teste_status?: string
  ultimo_teste_mensagem?: string
  ultimo_teste_em?: string
}

export interface SavePhbSettingsPayload {
  token: string
}

export interface SavePhbSettingsResponse {
  success: boolean
  message: string
  configured: boolean
  source: string
  masked_token: string | null
}

export interface TestPhbResponse {
  success: boolean
  status: string
  message: string
  http_status?: number
  duration_ms?: number
  quantidade_modulos?: number
  raw_error?: unknown
}

export interface PhbKitResumo {
  uid: string
  descricao: string
  preco: number // Preço de custo na PHB
  potencia_cc: number // Wp ou kWp
  potencia_ca: number // W ou kW
  potencia_modulo?: number // Wp do módulo
  tipo_estrutura?: string
  tipo_kit?: string
  tensao?: string
  contem_trafo?: boolean
  link_datasheet?: string
  [key: string]: unknown
}

export interface PhbBuscarKitsParams {
  potencia: number // em Wp (ex: 6000 para 6 kWp)
  tensao: PhbTensao
  tipo_estrutura: PhbTipoEstrutura
}

export interface PhbBuscarKitsResponse {
  status: 'sucesso' | 'erro'
  quantidade: number
  kits: PhbKitResumo[]
  error?: string
}

export interface PhbKitComponenteItem {
  quantidade: number
  componente: {
    codigo?: string
    nome: string
    grupo?:
      | 'modulo'
      | 'inversor'
      | 'trafo'
      | 'qdca'
      | 'stringbox'
      | 'estrutura'
      | 'cabo_conector'
      | 'variedades'
      | string
    [key: string]: unknown
  }
}

export interface PhbKitDetalhes {
  uid: string
  descricao?: string
  preco?: number
  potencia_cc?: number
  potencia_ca?: number
  potencia_modulo?: number
  tipo_estrutura?: string
  tipo_kit?: string
  tensao?: string
  contem_trafo?: boolean
  componentes?: PhbKitComponenteItem[]
  [key: string]: unknown
}

export interface PhbKitDetalhesResponse {
  status: 'sucesso' | 'erro'
  kit: PhbKitDetalhes
  error?: string
}

export interface PhbImportResult {
  nome: string
  fabricante: string
  potenciaKw: number
  custo: number
  categoria: 'Residencial' | 'Comercial' | 'Rural'
  marcaPainel: string
  potenciaPainelW: number
  qtdPaineis: number
  marcaInversor: string
  potenciaInversorKw: number
  qtdInversores: number
  tipoEstrutura: 'solo_monoposte' | 'mini_trilho' | 'fibrocimento' | 'outro' | ''
  stringBox: '1_entrada' | '2_entradas' | '3_entradas' | ''
  descricao: string
  componentesFormatados: string[]
}

export const OPCOES_TENSAO_PHB: { value: PhbTensao; label: string; desc: string }[] = [
  {
    value: 'mono_220',
    label: 'Monofásico 220V',
    desc: 'Fase + Neutro 220V (Padrão Centro-Oeste / MT)',
  },
  {
    value: 'tri_220380',
    label: 'Trifásico 220/380V',
    desc: 'Trifásico 380V Estrela (Mais comum comercial)',
  },
  { value: 'tri_127220', label: 'Trifásico 127/220V', desc: 'Trifásico 220V Delta / Estrela 127V' },
  { value: 'mono_127', label: 'Monofásico 127V', desc: 'Monofásico 127V residencial' },
]

export const OPCOES_ESTRUTURA_PHB: {
  value: PhbTipoEstrutura
  label: string
  crmMapping: 'solo_monoposte' | 'mini_trilho' | 'fibrocimento' | 'outro'
}[] = [
  {
    value: 'telhado',
    label: 'Telhado (Cerâmico / Fibrocimento / Metálico)',
    crmMapping: 'fibrocimento',
  },
  { value: 'solo', label: 'Solo (Usinas / Fixação em Chão)', crmMapping: 'solo_monoposte' },
  { value: 'solo_monoposte', label: 'Solo Monoposte (Monoestaca)', crmMapping: 'solo_monoposte' },
  { value: 'laje', label: 'Laje Plana (Com inclinação)', crmMapping: 'mini_trilho' },
  { value: 'carport', label: 'Carport (Garagem Solar)', crmMapping: 'outro' },
]

export const PhbSolarService = {
  /**
   * Obtém o status da integração com a PHB Solar
   */
  async getStatus(): Promise<PhbStatusResponse> {
    const token = pb.authStore.token
    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente.')
    }

    const response = await fetch(`${pb.baseUrl}/backend/v1/phb/status`, {
      method: 'GET',
      headers: {
        Authorization: token,
      },
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || 'Erro ao consultar status da integração PHB Solar.')
    }

    return await response.json()
  },

  /**
   * Salva o Token Bearer da PHB Solar no backend (Admin only)
   */
  async saveSettings(payload: SavePhbSettingsPayload): Promise<SavePhbSettingsResponse> {
    const token = pb.authStore.token
    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente.')
    }

    const response = await fetch(`${pb.baseUrl}/backend/v1/phb/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.error || 'Falha ao salvar token da PHB Solar.')
    }

    return data as SavePhbSettingsResponse
  },

  /**
   * Testa a conexão real chamando GET /modulos na PHB Solar através do backend (Admin only)
   */
  async testConnection(tokenInput?: string): Promise<TestPhbResponse> {
    const token = pb.authStore.token
    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente.')
    }

    const response = await fetch(`${pb.baseUrl}/backend/v1/phb/testar-conexao`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({
        token: tokenInput ? tokenInput.trim() : undefined,
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Falha ao testar conexão com a PHB Solar.')
    }

    return data as TestPhbResponse
  },

  /**
   * Busca kits na API PHB Solar através do backend (GET /buscarkits via hook)
   */
  async buscarKits(params: PhbBuscarKitsParams): Promise<PhbBuscarKitsResponse> {
    const token = pb.authStore.token
    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente.')
    }

    const response = await fetch(`${pb.baseUrl}/backend/v1/phb/buscarkits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify(params),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.error || 'Falha ao buscar kits na PHB Solar.')
    }

    return data as PhbBuscarKitsResponse
  },

  /**
   * Obtém os detalhes completos do kit (GET /kit/{uid} via hook)
   */
  async getKitDetalhes(uid: string): Promise<PhbKitDetalhes> {
    const token = pb.authStore.token
    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente.')
    }

    const response = await fetch(`${pb.baseUrl}/backend/v1/phb/kit-detalhes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({ uid }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.error || 'Falha ao buscar detalhes do kit na PHB Solar.')
    }

    return (data.kit || data) as PhbKitDetalhes
  },

  /**
   * Converte os detalhes retornados da API PHB em campos pré-preenchidos para o cadastro de Kits do CRM
   */
  mapPhbKitToCrm(detalhes: PhbKitDetalhes, resumoOriginal?: PhbKitResumo): PhbImportResult {
    const precoCusto = Number(detalhes.preco ?? resumoOriginal?.preco ?? 0)

    // Potência CC: pode vir em Wp (ex: 6600) ou kWp (ex: 6.6)
    let potKw = 0
    const rawPotCc = Number(detalhes.potencia_cc ?? resumoOriginal?.potencia_cc ?? 0)
    if (rawPotCc > 100) {
      potKw = Number((rawPotCc / 1000).toFixed(2))
    } else if (rawPotCc > 0) {
      potKw = Number(rawPotCc.toFixed(2))
    }

    const componentes = detalhes.componentes || []
    const componentesFormatados: string[] = []

    let marcaPainel = ''
    let potenciaPainelW = Number(detalhes.potencia_modulo ?? resumoOriginal?.potencia_modulo ?? 0)
    let qtdPaineis = 0

    let marcaInversor = ''
    let potenciaInversorKw = 0
    let qtdInversores = 0

    let stringBox: '1_entrada' | '2_entradas' | '3_entradas' | '' = ''

    // Mapeamento de tipo de estrutura PHB para o CRM
    let tipoEstrutura: 'solo_monoposte' | 'mini_trilho' | 'fibrocimento' | 'outro' | '' = ''
    const rawEstrutura = String(
      detalhes.tipo_estrutura ?? resumoOriginal?.tipo_estrutura ?? '',
    ).toLowerCase()
    if (rawEstrutura.includes('monoposte')) {
      tipoEstrutura = 'solo_monoposte'
    } else if (rawEstrutura.includes('solo')) {
      tipoEstrutura = 'solo_monoposte'
    } else if (rawEstrutura.includes('laje')) {
      tipoEstrutura = 'mini_trilho'
    } else if (
      rawEstrutura.includes('telhado') ||
      rawEstrutura.includes('fibro') ||
      rawEstrutura.includes('ceramico')
    ) {
      tipoEstrutura = 'fibrocimento'
    } else if (rawEstrutura.includes('carport')) {
      tipoEstrutura = 'outro'
    }

    for (const item of componentes) {
      const comp = item.componente || (item as unknown as { nome: string; grupo?: string })
      const nomeComp = comp.nome || ''
      const grupo = String(comp.grupo || '').toLowerCase()
      const qtd = Number(item.quantidade || 1)

      const linha = `${qtd}x ${nomeComp}`
      componentesFormatados.push(linha)

      // Identifica grupo módulo
      if (grupo === 'modulo' || /módulo|painel|solar\s*panel/i.test(nomeComp)) {
        qtdPaineis += qtd
        if (!marcaPainel) {
          if (/osda/i.test(nomeComp)) marcaPainel = 'OSDA'
          else if (/dmegc/i.test(nomeComp)) marcaPainel = 'DMEGC'
          else if (/tsun/i.test(nomeComp)) marcaPainel = 'TSUN POWER'
          else if (/canadian/i.test(nomeComp)) marcaPainel = 'Canadian Solar'
          else if (/ja\s*solar/i.test(nomeComp)) marcaPainel = 'JA Solar'
          else if (/jinko/i.test(nomeComp)) marcaPainel = 'Jinko Solar'
          else if (/trina/i.test(nomeComp)) marcaPainel = 'Trina Solar'
          else if (/phb/i.test(nomeComp)) marcaPainel = 'PHB'
          else if (/ronma/i.test(nomeComp)) marcaPainel = 'Ronma Solar'
          else if (/risen/i.test(nomeComp)) marcaPainel = 'Risen Energy'
          else {
            // Tenta primeira palavra relevante
            const match = nomeComp.match(/([A-Z][A-Za-z0-9]+)/)
            if (match) marcaPainel = match[1]
          }
        }
        if (!potenciaPainelW) {
          const matchWp = nomeComp.match(/(\d{3,4})\s*W/i)
          if (matchWp) potenciaPainelW = Number(matchWp[1])
        }
      }

      // Identifica grupo inversor
      if (grupo === 'inversor' || /inversor|microinversor/i.test(nomeComp)) {
        qtdInversores += qtd
        if (!marcaInversor) {
          if (/sungrow/i.test(nomeComp)) marcaInversor = 'Sungrow'
          else if (/huawei/i.test(nomeComp)) marcaInversor = 'HUAWEI'
          else if (/ausxol|auxsol/i.test(nomeComp)) marcaInversor = 'AUSXOL'
          else if (/phb/i.test(nomeComp)) marcaInversor = 'PHB'
          else if (/goodwe/i.test(nomeComp)) marcaInversor = 'GOODWE'
          else if (/growatt/i.test(nomeComp)) marcaInversor = 'Growatt'
          else if (/deye/i.test(nomeComp)) marcaInversor = 'Deye'
          else if (/solis/i.test(nomeComp)) marcaInversor = 'Solis'
          else if (/weg/i.test(nomeComp)) marcaInversor = 'WEG'
          else {
            marcaInversor = 'PHB'
          }
        }
        if (!potenciaInversorKw) {
          const matchKw = nomeComp.match(/(\d+(?:[.,]\d+)?)\s*k\s*W/i)
          if (matchKw) {
            potenciaInversorKw = Number(matchKw[1].replace(',', '.'))
          } else {
            const rawCa = Number(detalhes.potencia_ca ?? resumoOriginal?.potencia_ca ?? 0)
            if (rawCa > 100) potenciaInversorKw = Number((rawCa / 1000).toFixed(2))
            else if (rawCa > 0) potenciaInversorKw = Number(rawCa.toFixed(2))
          }
        }
      }

      // Identifica stringbox
      if (grupo === 'stringbox' || /string\s*box/i.test(nomeComp)) {
        if (/3\s*(?:entradas?|e\b|\/)/i.test(nomeComp)) stringBox = '3_entradas'
        else if (/2\s*(?:entradas?|e\b|\/)/i.test(nomeComp)) stringBox = '2_entradas'
        else stringBox = '1_entrada'
      }

      // Identifica estrutura caso ainda não tenha definido
      if (!tipoEstrutura && (grupo === 'estrutura' || /estrutura|trilho|suporte/i.test(nomeComp))) {
        if (/monoposte/i.test(nomeComp)) tipoEstrutura = 'solo_monoposte'
        else if (/solo/i.test(nomeComp)) tipoEstrutura = 'solo_monoposte'
        else if (/mini\s*trilho/i.test(nomeComp)) tipoEstrutura = 'mini_trilho'
        else if (/fibrocimento|ondulada/i.test(nomeComp)) tipoEstrutura = 'fibrocimento'
      }
    }

    // Se calculou qtdPaineis e potenciaPainelW mas potKw estava zerado
    if (potKw <= 0 && qtdPaineis > 0 && potenciaPainelW > 0) {
      potKw = Number(((qtdPaineis * potenciaPainelW) / 1000).toFixed(2))
    }

    // Fallback de marcas
    if (!marcaInversor) marcaInversor = 'PHB'
    if (!marcaPainel) marcaPainel = 'PHB Solar'

    // Nome comercial amigável
    const potenciaFormatada = potKw > 0 ? `${potKw.toLocaleString('pt-BR')} kWp` : 'Potência Padrão'
    const inversorFormatado = marcaInversor || 'PHB'
    const painelFormatado = marcaPainel || 'PHB'
    const estrutFormatada =
      tipoEstrutura === 'solo_monoposte'
        ? 'Solo monoposte'
        : tipoEstrutura === 'mini_trilho'
          ? 'Mini trilho'
          : tipoEstrutura === 'fibrocimento'
            ? 'Fibrocimento'
            : tipoEstrutura === 'outro'
              ? 'Carport / Especial'
              : 'Padrão PHB'

    const nome = `Kit Solar ${potenciaFormatada} — ${painelFormatado} + ${inversorFormatado} — ${estruturadaOuFallback(estrutFormatada)}`

    const fabricante = `${painelFormatado} / ${inversorFormatado}`

    // Categoria: < 15kWp Residencial, >= 15 e < 75 Comercial, >= 75 ou solo monoposte = Rural/Comercial
    let categoria: 'Residencial' | 'Comercial' | 'Rural' = 'Residencial'
    if (tipoEstrutura === 'solo_monoposte' && potKw >= 10) {
      categoria = 'Rural'
    } else if (potKw >= 15) {
      categoria = 'Comercial'
    }

    // Descrição detalhada incluindo lista de componentes
    const descLinhas: string[] = []
    if (qtdPaineis > 0 && potenciaPainelW > 0) {
      descLinhas.push(
        `${qtdPaineis}x Módulo fotovoltaico ${potenciaPainelW} W (${marcaPainel}) — Total ${potenciaFormatada}.`,
      )
    }
    if (qtdInversores > 0) {
      const potInvTexto =
        potenciaInversorKw > 0 ? ` ${potenciaInversorKw.toLocaleString('pt-BR')} kW` : ''
      descLinhas.push(`${qtdInversores}x Inversor solar${potInvTexto} ${marcaInversor}.`)
    }
    if (stringBox) {
      const rotuloSb =
        stringBox === '1_entrada'
          ? '1 entrada'
          : stringBox === '2_entradas'
            ? '2 entradas'
            : '3 entradas'
      descLinhas.push(`String Box CC: ${rotuloSb}.`)
    }
    if (estrutFormatada) {
      descLinhas.push(`Estrutura de fixação: ${estrutFormatada}.`)
    }
    if (detalhes.contem_trafo || resumoOriginal?.contem_trafo) {
      descLinhas.push(`Contém transformador isolador/elevador.`)
    }

    // Se tiver itens extras na lista da PHB
    if (componentesFormatados.length > 0) {
      descLinhas.push(`Componentes fornecidos pela PHB Solar:`)
      for (const compLinha of componentesFormatados) {
        descLinhas.push(`• ${compLinha}`)
      }
    } else if (detalhes.descricao || resumoOriginal?.descricao) {
      descLinhas.push(`Ref. PHB: ${detalhes.descricao || resumoOriginal?.descricao}`)
    }

    const descricao = descLinhas.join('\n')

    return {
      nome,
      fabricante,
      potenciaKw: potKw,
      custo: precoCusto,
      categoria,
      marcaPainel,
      potenciaPainelW,
      qtdPaineis,
      marcaInversor,
      potenciaInversorKw,
      qtdInversores: qtdInversores || 1,
      tipoEstrutura,
      stringBox,
      descricao,
      componentesFormatados,
    }
  },
}

function estruturadaOuFallback(label: string): string {
  return label || 'Telhado'
}
