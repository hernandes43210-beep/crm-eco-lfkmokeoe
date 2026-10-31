import { describe, it, expect } from 'vitest'
import { formatarEnderecoCompleto, formatarCidadeUf, obterLinkMaps } from './formatadorLocalizacao'

describe('formatadorLocalizacao', () => {
  it('formata endereço completo com logradouro, bairro, cidade, UF e CEP', () => {
    const res = formatarEnderecoCompleto({
      endereco_instalacao: 'Rua das Flores, 123',
      cliente_bairro: 'Jardim dos Estados',
      cliente_cidade: 'Campo Grande',
      cliente_estado: 'MS',
      cliente_cep: '79002-000',
    })

    expect(res).toBe(
      'Rua das Flores, 123, Bairro Jardim dos Estados, Campo Grande - MS, CEP: 79002-000',
    )
  })

  it('usa fallback de campos do lead se campos cliente_* não existirem', () => {
    const res = formatarEnderecoCompleto({
      endereco: 'Av. Afonso Pena, 500',
      bairro: 'Centro',
      cidade: 'Campo Grande',
      estado: 'MS',
      cep: '79000-000',
    })

    expect(res).toBe('Av. Afonso Pena, 500, Bairro Centro, Campo Grande - MS, CEP: 79000-000')
  })

  it('retorna mensagem legível se dados estiverem vazios', () => {
    expect(formatarEnderecoCompleto(null)).toBe('Localização não informada')
    expect(formatarEnderecoCompleto({})).toBe('Localização não informada')
  })

  it('formata Cidade/UF corretamente', () => {
    expect(formatarCidadeUf({ cidade: 'Dourados', estado: 'MS' })).toBe('Dourados - MS')
    expect(formatarCidadeUf({ cliente_cidade: 'Cuiabá', cliente_estado: 'MT' })).toBe('Cuiabá - MT')
    expect(formatarCidadeUf(null)).toBe('')
  })

  it('gera link do Maps com coordenadas se disponíveis', () => {
    const link = obterLinkMaps({
      latitude: -20.4697,
      longitude: -54.6201,
    })
    expect(link).toBe('https://www.google.com/maps?q=-20.4697,-54.6201')
  })

  it('respeita localizacao_maps_url pré-existente', () => {
    const link = obterLinkMaps({
      localizacao_maps_url: 'https://maps.google.com/?q=-20,-54',
    })
    expect(link).toBe('https://maps.google.com/?q=-20,-54')
  })
})
