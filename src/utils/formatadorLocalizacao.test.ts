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
      'Rua das Flores, 123, Bairro Jardim dos Estados, Campo Grande/MS, CEP 79002-000',
    )
  })

  it('usa fallback de campos do lead se campos cliente_* não existirem', () => {
    const res = formatarEnderecoCompleto({
      endereco: 'Av. Afonso Pena, 500',
      bairro: 'Centro',
      cidade: 'Campo Grande',
      estado: 'ms',
      cep: '79000-000',
    })

    expect(res).toBe('Av. Afonso Pena, 500, Bairro Centro, Campo Grande/MS, CEP 79000-000')
  })

  it('retorna mensagem legível se dados estiverem vazios ou nulos', () => {
    expect(formatarEnderecoCompleto(null)).toBe('Localização não informada')
    expect(formatarEnderecoCompleto(undefined)).toBe('Localização não informada')
    expect(formatarEnderecoCompleto({})).toBe('Localização não informada')
    expect(
      formatarEnderecoCompleto({
        endereco_instalacao: '',
        cliente_bairro: '',
        cliente_cidade: '',
        cliente_estado: '',
        cliente_cep: '',
      }),
    ).toBe('Localização não informada')
  })

  it('omite campos vazios sem gerar undefined, null ou vírgulas duplicadas', () => {
    const res1 = formatarEnderecoCompleto({
      endereco: 'Rua X, 123',
      cidade: 'Goiânia',
      estado: 'GO',
    })
    expect(res1).toBe('Rua X, 123, Goiânia/GO')
    expect(res1).not.toContain('undefined')
    expect(res1).not.toContain('null')
    expect(res1).not.toContain(', ,')

    const res2 = formatarEnderecoCompleto({
      cliente_bairro: 'Setor Bueno',
      cliente_cidade: 'Goiânia',
      cliente_estado: 'GO',
      cliente_cep: '74230-100',
    })
    expect(res2).toBe('Bairro Setor Bueno, Goiânia/GO, CEP 74230-100')
  })

  it('evita repetição da palavra Bairro e CEP se já estiverem presentes', () => {
    const res = formatarEnderecoCompleto({
      endereco: 'Rua 10',
      bairro: 'Bairro Novo',
      cidade: 'Goiânia',
      estado: 'GO',
      cep: 'CEP 74000-000',
    })
    expect(res).toBe('Rua 10, Bairro Novo, Goiânia/GO, CEP 74000-000')
    expect(res).not.toContain('Bairro Bairro')
    expect(res).not.toContain('CEP CEP')
  })

  it('formata CEP numérico de 8 dígitos adicionando traço', () => {
    const res = formatarEnderecoCompleto({
      cidade: 'Anápolis',
      estado: 'GO',
      cep: '75000000',
    })
    expect(res).toBe('Anápolis/GO, CEP 75000-000')
  })

  it('filtra strings literais "undefined" e "null"', () => {
    const res = formatarEnderecoCompleto({
      endereco: 'undefined',
      bairro: 'null',
      cidade: 'Goiânia',
      estado: 'GO',
    })
    expect(res).toBe('Goiânia/GO')
  })

  it('formata Cidade/UF corretamente', () => {
    expect(formatarCidadeUf({ cidade: 'Dourados', estado: 'ms' })).toBe('Dourados/MS')
    expect(formatarCidadeUf({ cliente_cidade: 'Cuiabá', cliente_estado: 'MT' })).toBe('Cuiabá/MT')
    expect(formatarCidadeUf({ cidade: 'Campo Grande' })).toBe('Campo Grande')
    expect(formatarCidadeUf({ estado: 'GO' })).toBe('GO')
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

  it('gera busca no Maps se tiver endereço legível mas sem coordenadas', () => {
    const link = obterLinkMaps({
      cidade: 'Goiânia',
      estado: 'GO',
      endereco: 'Av. T-9, 100',
    })
    expect(link).toBe(
      'https://www.google.com/maps/search/?api=1&query=Av.%20T-9%2C%20100%2C%20Goi%C3%A2nia%2FGO',
    )
  })
})
