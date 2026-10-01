/**
 * Utilitários para validação, parsing e formatação de localização do cliente/instalação
 * Suporta link direto (Google Maps / Waze / OpenStreetMap / URLs genéricas)
 * e coordenadas Latitude / Longitude (individuais ou combinadas "lat, lng").
 */

export interface ParsedLocationResult {
  isValid: boolean
  errorMessage?: string
  mode: 'link' | 'coords'
  link?: string
  latitude?: number
  longitude?: number
  canonicalMapsUrl?: string
}

/**
 * Valida se uma latitude é válida (-90 a 90)
 */
export function isValidLatitude(lat: number): boolean {
  return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90
}

/**
 * Valida se uma longitude é válida (-180 a 180)
 */
export function isValidLongitude(lng: number): boolean {
  return typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180
}

/**
 * Gera URL canônica do Google Maps a partir de latitude e longitude
 */
export function buildCanonicalGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

/**
 * Tenta extrair coordenadas lat/lng de uma URL do Google Maps (ex: @-11.834, -62.345 ou q=-11.834,-62.345 ou ll=-11.834,-62.345)
 */
export function extractCoordinatesFromMapsUrl(
  url: string,
): { latitude: number; longitude: number } | null {
  if (!url || typeof url !== 'string') return null

  // Padrão 1: @lat,lng,zoom (ex: google.com/maps/@-11.834123,-62.345123,17z)
  const atMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (atMatch) {
    const lat = parseFloat(atMatch[1])
    const lng = parseFloat(atMatch[2])
    if (isValidLatitude(lat) && isValidLongitude(lng)) {
      return { latitude: lat, longitude: lng }
    }
  }

  // Padrão 2: q=lat,lng ou query=lat,lng ou ll=lat,lng
  const paramMatch = url.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i)
  if (paramMatch) {
    const lat = parseFloat(paramMatch[1])
    const lng = parseFloat(paramMatch[2])
    if (isValidLatitude(lat) && isValidLongitude(lng)) {
      return { latitude: lat, longitude: lng }
    }
  }

  // Padrão 3: /place/lat,lng ou /search/lat,lng
  const pathMatch = url.match(/\/(?:place|search)\/(-?\d+(?:\.\d+)?)[,+](-?\d+(?:\.\d+)?)/i)
  if (pathMatch) {
    const lat = parseFloat(pathMatch[1])
    const lng = parseFloat(pathMatch[2])
    if (isValidLatitude(lat) && isValidLongitude(lng)) {
      return { latitude: lat, longitude: lng }
    }
  }

  return null
}

/**
 * Valida um link de localização (URL)
 */
export function validateLocationLink(link: string): {
  isValid: boolean
  errorMessage?: string
  cleanUrl?: string
  extractedCoords?: { latitude: number; longitude: number } | null
} {
  const trimmed = (link || '').trim()
  if (!trimmed) {
    return { isValid: false, errorMessage: 'Link de localização não pode ser vazio.' }
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return {
      isValid: false,
      errorMessage:
        'O link deve começar com http:// ou https:// (ex.: https://maps.app.goo.gl/...)',
    }
  }

  try {
    const parsed = new URL(trimmed)
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return { isValid: false, errorMessage: 'URL inválida ou incompleta.' }
    }

    const extracted = extractCoordinatesFromMapsUrl(trimmed)
    return {
      isValid: true,
      cleanUrl: trimmed,
      extractedCoords: extracted,
    }
  } catch {
    return {
      isValid: false,
      errorMessage: 'Formato de URL inválido. Verifique o link copiado.',
    }
  }
}

/**
 * Faz o parse de string combinada de coordenadas, aceitando:
 * "-11.834, -62.345" ou "-11.834 -62.345" ou "-11.834;-62.345"
 */
export function parseCombinedCoordinates(
  input: string,
): { latitude: number; longitude: number } | null {
  if (!input || typeof input !== 'string') return null
  const cleaned = input.trim().replace(/\s*[,;]\s*/, ' ')
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length !== 2) return null

  // Substituir vírgula decimal por ponto caso o usuário tenha digitado -11,834
  const latStr = parts[0].replace(',', '.')
  const lngStr = parts[1].replace(',', '.')

  const lat = parseFloat(latStr)
  const lng = parseFloat(lngStr)

  if (isValidLatitude(lat) && isValidLongitude(lng)) {
    return { latitude: lat, longitude: lng }
  }
  return null
}

/**
 * Valida par de latitude e longitude
 */
export function validateCoordinates(
  latInput: number | string | undefined | null,
  lngInput: number | string | undefined | null,
): {
  isValid: boolean
  errorMessage?: string
  latitude?: number
  longitude?: number
  canonicalMapsUrl?: string
} {
  if (
    latInput === undefined ||
    latInput === null ||
    latInput === '' ||
    lngInput === undefined ||
    lngInput === null ||
    lngInput === ''
  ) {
    return {
      isValid: false,
      errorMessage: 'Informe tanto a latitude quanto a longitude.',
    }
  }

  const latNum =
    typeof latInput === 'number' ? latInput : parseFloat(String(latInput).replace(',', '.'))
  const lngNum =
    typeof lngInput === 'number' ? lngInput : parseFloat(String(lngInput).replace(',', '.'))

  if (isNaN(latNum)) {
    return { isValid: false, errorMessage: 'Latitude inválida. Digite um número válido.' }
  }
  if (!isValidLatitude(latNum)) {
    return { isValid: false, errorMessage: 'Latitude deve estar entre -90 e 90.' }
  }

  if (isNaN(lngNum)) {
    return { isValid: false, errorMessage: 'Longitude inválida. Digite um número válido.' }
  }
  if (!isValidLongitude(lngNum)) {
    return { isValid: false, errorMessage: 'Longitude deve estar entre -180 e 180.' }
  }

  return {
    isValid: true,
    latitude: latNum,
    longitude: lngNum,
    canonicalMapsUrl: buildCanonicalGoogleMapsUrl(latNum, lngNum),
  }
}

/**
 * Prepara o objeto de localização consolidado pronto para ser salvo ou enviado
 */
export function consolidateLocation(params: {
  mode: 'link' | 'coords'
  link?: string
  latitude?: number | string
  longitude?: number | string
}): {
  isValid: boolean
  errorMessage?: string
  localizacao_link?: string
  latitude?: number
  longitude?: number
  localizacao_maps_url?: string
  displayUrl?: string
} {
  const { mode, link, latitude, longitude } = params

  if (mode === 'link') {
    const rawLink = (link || '').trim()
    if (!rawLink) {
      // Vazio é permitido como "sem localização"
      return { isValid: true }
    }
    const val = validateLocationLink(rawLink)
    if (!val.isValid) {
      return { isValid: false, errorMessage: val.errorMessage }
    }
    const extracted = val.extractedCoords
    const mapsUrl = extracted
      ? buildCanonicalGoogleMapsUrl(extracted.latitude, extracted.longitude)
      : val.cleanUrl

    return {
      isValid: true,
      localizacao_link: val.cleanUrl,
      latitude: extracted?.latitude,
      longitude: extracted?.longitude,
      localizacao_maps_url: mapsUrl,
      displayUrl: val.cleanUrl,
    }
  } else {
    // Modo coordenadas
    const hasAny =
      (latitude !== undefined && latitude !== null && latitude !== '') ||
      (longitude !== undefined && longitude !== null && longitude !== '')
    if (!hasAny) {
      // Nenhum campo preenchido é permitido (opcional)
      return { isValid: true }
    }

    const val = validateCoordinates(latitude, longitude)
    if (!val.isValid) {
      return { isValid: false, errorMessage: val.errorMessage }
    }

    return {
      isValid: true,
      latitude: val.latitude,
      longitude: val.longitude,
      localizacao_maps_url: val.canonicalMapsUrl,
      localizacao_link: val.canonicalMapsUrl,
      displayUrl: val.canonicalMapsUrl,
    }
  }
}
