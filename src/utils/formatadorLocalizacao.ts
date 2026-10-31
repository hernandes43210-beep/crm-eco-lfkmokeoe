/**
 * Utilitários para formatação e exibição de localização no CRM ECO
 */

export interface DadosLocalizacaoBase {
  endereco_instalacao?: string
  endereco?: string
  cliente_bairro?: string
  bairro?: string
  cliente_cidade?: string
  cidade?: string
  cliente_estado?: string
  estado?: string
  cliente_cep?: string
  cep?: string
  latitude?: number | null
  longitude?: number | null
  localizacao_maps_url?: string
  localizacao_link?: string
}

/**
 * Monta o endereço legível e completo a partir dos dados do lead ou dossiê/homologação.
 * Exemplo: "Av. Brasil, 1500, Bairro Centro, Campo Grande - MS, CEP: 79000-000"
 */
export function formatarEnderecoCompleto(dados?: DadosLocalizacaoBase | null): string {
  if (!dados) return 'Localização não informada'

  const logradouro = dados.endereco_instalacao || dados.endereco || ''
  const bairro = dados.cliente_bairro || dados.bairro || ''
  const cidade = dados.cliente_cidade || dados.cidade || ''
  const uf = dados.cliente_estado || dados.estado || ''
  const cep = dados.cliente_cep || dados.cep || ''

  const partes: string[] = []

  if (logradouro.trim()) {
    partes.push(logradouro.trim())
  }

  if (bairro.trim()) {
    partes.push(`Bairro ${bairro.trim()}`)
  }

  if (cidade.trim() || uf.trim()) {
    const cidadeUf = [cidade.trim(), uf.trim()].filter(Boolean).join(' - ')
    partes.push(cidadeUf)
  }

  if (cep.trim()) {
    partes.push(`CEP: ${cep.trim()}`)
  }

  return partes.length > 0 ? partes.join(', ') : 'Localização não informada'
}

/**
 * Retorna cidade e estado formatados, ex: "Campo Grande - MS"
 */
export function formatarCidadeUf(dados?: DadosLocalizacaoBase | null): string {
  if (!dados) return ''
  const cidade = dados.cliente_cidade || dados.cidade || ''
  const uf = dados.cliente_estado || dados.estado || ''
  return [cidade.trim(), uf.trim()].filter(Boolean).join(' - ')
}

/**
 * Retorna URL do Google Maps a partir das coordenadas ou link salvo
 */
export function obterLinkMaps(dados?: DadosLocalizacaoBase | null): string | null {
  if (!dados) return null

  if (dados.localizacao_maps_url) return dados.localizacao_maps_url
  if (dados.localizacao_link) return dados.localizacao_link

  if (
    dados.latitude !== undefined &&
    dados.latitude !== null &&
    dados.longitude !== undefined &&
    dados.longitude !== null &&
    !isNaN(Number(dados.latitude)) &&
    !isNaN(Number(dados.longitude))
  ) {
    return `https://www.google.com/maps?q=${dados.latitude},${dados.longitude}`
  }

  // Fallback: se tiver endereço completo com cidade, gerar busca no Maps
  const end = formatarEnderecoCompleto(dados)
  if (end && end !== 'Localização não informada') {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`
  }

  return null
}
