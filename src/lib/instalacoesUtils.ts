import type { Lead } from '@/types/crm'

/** Monta o endereço completo do lead a partir dos campos separados. */
export function formatEnderecoLead(lead: Lead | null | undefined): string {
  if (!lead) return ''
  const partes = [lead.endereco, lead.bairro, lead.cidade, lead.estado].filter(
    (p) => p && String(p).trim(),
  )
  const comCep = lead.cep ? [...partes, `CEP ${lead.cep}`] : partes
  return comCep.join(', ')
}

export function formatarDataBRInstalacao(iso?: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Link do Google Maps a partir de coordenadas (fallback quando não há link salvo). */
export function linkMapsDeCoordenadas(lat?: number | null, lng?: number | null): string | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return `https://www.google.com/maps?q=${lat},${lng}`
}

export function normalizarUrlLocalizacao(url: string): string {
  const u = url.trim()
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  return `https://${u}`
}
