import { describe, it, expect } from 'vitest'
import {
  isValidLatitude,
  isValidLongitude,
  buildCanonicalGoogleMapsUrl,
  extractCoordinatesFromMapsUrl,
  validateLocationLink,
  parseCombinedCoordinates,
  validateCoordinates,
  consolidateLocation,
} from './locationUtils'

describe('locationUtils', () => {
  describe('isValidLatitude and isValidLongitude', () => {
    it('valida latitude corretamente (-90 a 90)', () => {
      expect(isValidLatitude(0)).toBe(true)
      expect(isValidLatitude(-11.834)).toBe(true)
      expect(isValidLatitude(90)).toBe(true)
      expect(isValidLatitude(-90)).toBe(true)
      expect(isValidLatitude(90.1)).toBe(false)
      expect(isValidLatitude(-91)).toBe(false)
      expect(isValidLatitude(NaN)).toBe(false)
    })

    it('valida longitude corretamente (-180 a 180)', () => {
      expect(isValidLongitude(0)).toBe(true)
      expect(isValidLongitude(-62.345)).toBe(true)
      expect(isValidLongitude(180)).toBe(true)
      expect(isValidLongitude(-180)).toBe(true)
      expect(isValidLongitude(180.1)).toBe(false)
      expect(isValidLongitude(-181)).toBe(false)
      expect(isValidLongitude(NaN)).toBe(false)
    })
  })

  describe('buildCanonicalGoogleMapsUrl', () => {
    it('gera URL canônica correta do Google Maps', () => {
      expect(buildCanonicalGoogleMapsUrl(-11.834, -62.345)).toBe(
        'https://www.google.com/maps?q=-11.834,-62.345',
      )
    })
  })

  describe('extractCoordinatesFromMapsUrl', () => {
    it('extrai coordenadas com padrão @lat,lng', () => {
      const url = 'https://www.google.com/maps/@-11.834123,-62.345123,17z/data=!3m1'
      const coords = extractCoordinatesFromMapsUrl(url)
      expect(coords).not.toBeNull()
      expect(coords?.latitude).toBeCloseTo(-11.834123)
      expect(coords?.longitude).toBeCloseTo(-62.345123)
    })

    it('extrai coordenadas de parâmetro ?q=lat,lng', () => {
      const url = 'https://www.google.com/maps?q=-11.834,-62.345'
      const coords = extractCoordinatesFromMapsUrl(url)
      expect(coords).toEqual({ latitude: -11.834, longitude: -62.345 })
    })

    it('extrai coordenadas de /place/lat,lng', () => {
      const url = 'https://www.google.com/maps/place/-11.834,-62.345'
      const coords = extractCoordinatesFromMapsUrl(url)
      expect(coords).toEqual({ latitude: -11.834, longitude: -62.345 })
    })

    it('retorna null para link encurtado sem coordenadas no path (ex: maps.app.goo.gl/xyz)', () => {
      expect(extractCoordinatesFromMapsUrl('https://maps.app.goo.gl/AbCdEf123')).toBeNull()
    })
  })

  describe('validateLocationLink', () => {
    it('rejeita link vazio ou que não comece com http(s)', () => {
      expect(validateLocationLink('').isValid).toBe(false)
      expect(validateLocationLink('maps.google.com').isValid).toBe(false)
      expect(validateLocationLink('maps.google.com').errorMessage).toContain('http:// ou https://')
    })

    it('aceita URLs válidas do Google Maps e Waze', () => {
      const res = validateLocationLink('https://maps.app.goo.gl/xYz123')
      expect(res.isValid).toBe(true)
      expect(res.cleanUrl).toBe('https://maps.app.goo.gl/xYz123')

      const resWaze = validateLocationLink('https://waze.com/ul?ll=-11.834,-62.345&navigate=yes')
      expect(resWaze.isValid).toBe(true)
    })
  })

  describe('parseCombinedCoordinates', () => {
    it('faz parse de "-11.834, -62.345" com vírgula de separação', () => {
      const parsed = parseCombinedCoordinates('-11.834, -62.345')
      expect(parsed).toEqual({ latitude: -11.834, longitude: -62.345 })
    })

    it('faz parse com vírgula decimal brasileira "-11,834 -62,345"', () => {
      const parsed = parseCombinedCoordinates('-11,834 -62,345')
      expect(parsed).toEqual({ latitude: -11.834, longitude: -62.345 })
    })

    it('retorna null se inválido', () => {
      expect(parseCombinedCoordinates('invalido')).toBeNull()
      expect(parseCombinedCoordinates('-11.834')).toBeNull()
    })
  })

  describe('validateCoordinates', () => {
    it('rejeita quando falta um dos campos', () => {
      const res = validateCoordinates(-11.834, '')
      expect(res.isValid).toBe(false)
      expect(res.errorMessage).toContain('tanto a latitude quanto a longitude')
    })

    it('valida números válidos e gera link canônico', () => {
      const res = validateCoordinates('-11.834', '-62.345')
      expect(res.isValid).toBe(true)
      expect(res.latitude).toBe(-11.834)
      expect(res.longitude).toBe(-62.345)
      expect(res.canonicalMapsUrl).toBe('https://www.google.com/maps?q=-11.834,-62.345')
    })

    it('rejeita latitude fora do intervalo -90..90', () => {
      const res = validateCoordinates(120, -62.345)
      expect(res.isValid).toBe(false)
      expect(res.errorMessage).toContain('entre -90 e 90')
    })
  })

  describe('consolidateLocation', () => {
    it('retorna vazio válido se nada for informado', () => {
      const res = consolidateLocation({ mode: 'link', link: '' })
      expect(res.isValid).toBe(true)
      expect(res.displayUrl).toBeUndefined()
    })

    it('consolida link com coordenadas extraídas', () => {
      const res = consolidateLocation({
        mode: 'link',
        link: 'https://www.google.com/maps?q=-11.834,-62.345',
      })
      expect(res.isValid).toBe(true)
      expect(res.latitude).toBe(-11.834)
      expect(res.longitude).toBe(-62.345)
      expect(res.localizacao_maps_url).toBe('https://www.google.com/maps?q=-11.834,-62.345')
    })

    it('consolida modo coords gerando link canônico', () => {
      const res = consolidateLocation({
        mode: 'coords',
        latitude: -11.834,
        longitude: -62.345,
      })
      expect(res.isValid).toBe(true)
      expect(res.localizacao_maps_url).toBe('https://www.google.com/maps?q=-11.834,-62.345')
      expect(res.displayUrl).toBe('https://www.google.com/maps?q=-11.834,-62.345')
    })
  })
})
