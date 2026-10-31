/**
 * Utilitários para formatação e exibição de localização no CRM ECO
 */

export interface DadosLocalizacaoBase {
  endereco_instalacao?: string | null
  endereco?: string | null
  cliente_bairro?: string | null
  bairro?: string | null
  cliente_cidade?: string | null
  cidade?: string | null
  cliente_estado?: string | null
  estado?: string | null
  cliente_cep?: string | null
  cep?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  localizacao_maps_url?: string | null
  localizacao_link?: string | null
  [key: string]: unknown
}

/**
 * Limpa e sanitiza strings de endereço para evitar literais indesejados como
 * "undefined", "null", "NaN", strings vazias ou espaços múltiplos.
 */
function sanitizarTexto(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val).trim()
  if (
    !str ||
    str.toLowerCase() === 'undefined' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'nan'
  ) {
    return ''
  }
  return str.replace(/\s+/g, ' ')
}

/**
 * Formata um CEP no padrão brasileiro "00000-000", se contiver 8 dígitos numéricos,
 * ou retorna o texto sanitizado limpo.
 */
function formatarCepBr(cepRaw: string): string {
  const limpo = cepRaw.replace(/\D/g, '')
  if (limpo.length === 8) {
    return `${limpo.slice(0, 5)}-${limpo.slice(5)}`
  }
  return cepRaw
}

/**
 * Monta o endereço legível e completo a partir dos dados do lead ou dossiê/homologação.
 * Exemplo: "Rua X, 123 — Bairro Y, Goiânia/GO, CEP 74000-000" ou "Av. Brasil, 1500, Bairro Centro, Campo Grande/MS, CEP 79000-000"
 * Omite campos ausentes sem deixar vírgulas duplicadas, "undefined" ou "null".
 */
export function formatarEnderecoCompleto(dados?: DadosLocalizacaoBase | null): string {
  if (!dados || typeof dados !== 'object') return 'Localização não informada'

  const logradouro = sanitizarTexto(dados.endereco_instalacao || dados.endereco)
  let bairro = sanitizarTexto(dados.cliente_bairro || dados.bairro)
  const cidade = sanitizarTexto(dados.cliente_cidade || dados.cidade)
  const uf = sanitizarTexto(dados.cliente_estado || dados.estado)
  const cep = sanitizarTexto(dados.cliente_cep || dados.cep)

  // Se o bairro já começa com a palavra "bairro" (case insensitive), não duplica
  if (bairro && !/^bairro\b/i.test(bairro)) {
    bairro = `Bairro ${bairro}`
  }

  const partes: string[] = []

  // 1. Logradouro (ex: "Rua X, 123" ou "Av. Afonso Pena, 500")
  if (logradouro) {
    // Remove vírgulas ou hífens no fim do logradouro se houver resquício
    const logradouroLimpo = logradouro.replace(/[,\s-]+$/, '')
    if (logradouroLimpo) {
      partes.push(logradouroLimpo)
    }
  }

  // 2. Bairro
  if (bairro) {
    partes.push(bairro)
  }

  // 3. Cidade / UF
  if (cidade || uf) {
    let cidadeUf = ''
    if (cidade && uf) {
      cidadeUf = `${cidade}/${uf.toUpperCase()}`
    } else {
      cidadeUf = cidade || uf.toUpperCase()
    }
    partes.push(cidadeUf)
  }

  // 4. CEP
  if (cep) {
    const cepFormatado = formatarCepBr(cep)
    // Se o CEP já contém o prefixo "CEP", não duplica
    if (/^cep[:\s]/i.test(cepFormatado)) {
      partes.push(cepFormatado)
    } else {
      partes.push(`CEP ${cepFormatado}`)
    }
  }

  if (partes.length === 0) {
    return 'Localização não informada'
  }

  return partes.join(', ')
}

/**
 * Retorna cidade e estado formatados, ex: "Goiânia/GO" ou "Campo Grande/MS"
 */
export function formatarCidadeUf(dados?: DadosLocalizacaoBase | null): string {
  if (!dados || typeof dados !== 'object') return ''
  const cidade = sanitizarTexto(dados.cliente_cidade || dados.cidade)
  const uf = sanitizarTexto(dados.cliente_estado || dados.estado)

  if (cidade && uf) {
    return `${cidade}/${uf.toUpperCase()}`
  }
  return cidade || uf.toUpperCase()
}

/**
 * Retorna URL do Google Maps a partir das coordenadas ou link salvo
 */
export function obterLinkMaps(dados?: DadosLocalizacaoBase | null): string | null {
  if (!dados || typeof dados !== 'object') return null

  const mapsUrl = sanitizarTexto(dados.localizacao_maps_url)
  if (mapsUrl && /^https?:\/\//i.test(mapsUrl)) {
    return mapsUrl
  }

  const locLink = sanitizarTexto(dados.localizacao_link)
  if (locLink && /^https?:\/\//i.test(locLink)) {
    return locLink
  }

  const latRaw = dados.latitude
  const lngRaw = dados.longitude

  if (latRaw !== undefined && latRaw !== null && lngRaw !== undefined && lngRaw !== null) {
    const lat = typeof latRaw === 'number' ? latRaw : parseFloat(String(latRaw))
    const lng = typeof lngRaw === 'number' ? lngRaw : parseFloat(String(lngRaw))

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return `https://www.google.com/maps?q=${lat},${lng}`
    }
  }

  // Fallback: se tiver endereço completo com cidade, gerar busca no Maps
  const end = formatarEnderecoCompleto(dados)
  if (end && end !== 'Localização não informada') {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`
  }

  return null
}
