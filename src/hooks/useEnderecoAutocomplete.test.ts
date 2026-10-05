import { describe, it, expect } from 'vitest'
import { ESTADOS_BRASILEIROS, UFS_BRASIL, obterEnderecoPorEstado } from './useEnderecoAutocomplete'

describe('useEnderecoAutocomplete', () => {
  it('deve conter os 27 estados da federação brasileira', () => {
    expect(ESTADOS_BRASILEIROS).toHaveLength(27)
    expect(UFS_BRASIL).toHaveLength(27)
    expect(UFS_BRASIL).toContain('RO')
    expect(UFS_BRASIL).toContain('SP')
    expect(UFS_BRASIL).toContain('RJ')
  })

  it('deve preencher cidade e CEP se a UF for igual à do cadastro salvo do lead', () => {
    const leadSalvo = {
      estado: 'RO',
      cidade: 'Seringueiras',
      cep: '76934-000',
    }

    const resultado = obterEnderecoPorEstado('RO', leadSalvo)
    expect(resultado.cidade).toBe('Seringueiras')
    expect(resultado.cep).toBe('76934-000')
  })

  it('deve ignorar diferenças de maiúsculas e minúsculas na UF', () => {
    const leadSalvo = {
      estado: 'ro',
      cidade: 'Seringueiras',
      cep: '76934-000',
    }

    const resultado = obterEnderecoPorEstado('RO', leadSalvo)
    expect(resultado.cidade).toBe('Seringueiras')
    expect(resultado.cep).toBe('76934-000')
  })

  it('deve retornar cidade e CEP vazios se a UF for diferente da salva', () => {
    const leadSalvo = {
      estado: 'RO',
      cidade: 'Seringueiras',
      cep: '76934-000',
    }

    const resultado = obterEnderecoPorEstado('MT', leadSalvo)
    expect(resultado.cidade).toBe('')
    expect(resultado.cep).toBe('')
  })

  it('deve retornar cidade e CEP vazios quando leadSalvo não tiver dados', () => {
    const resultado = obterEnderecoPorEstado('SP', null)
    expect(resultado.cidade).toBe('')
    expect(resultado.cep).toBe('')
  })

  it('deve retornar cidade e CEP vazios quando a UF informada for vazia', () => {
    const leadSalvo = {
      estado: 'RO',
      cidade: 'Seringueiras',
      cep: '76934-000',
    }
    const resultado = obterEnderecoPorEstado('', leadSalvo)
    expect(resultado.cidade).toBe('')
    expect(resultado.cep).toBe('')
  })
})
