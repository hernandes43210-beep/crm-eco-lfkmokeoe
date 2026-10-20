import { describe, it, expect } from 'vitest'
import { toPortugueseErrorMessage } from './errors'
import { ClientResponseError } from 'pocketbase'

describe('toPortugueseErrorMessage - Login & ClientResponseError handling', () => {
  it('handles ClientResponseError 0 (network failure / connection error)', () => {
    const error0 = new ClientResponseError({
      status: 0,
      message: 'Something went wrong.',
      data: {},
    })

    const msg = toPortugueseErrorMessage(
      error0,
      'E-mail ou senha inválidos. Verifique suas credenciais.',
    )
    expect(msg).toContain('Não foi possível conectar ao servidor')
    expect(msg.toLowerCase()).not.toContain('something went wrong')
  })

  it('handles ClientResponseError 400 (invalid credentials)', () => {
    const error400 = new ClientResponseError({
      status: 400,
      message: 'Failed to authenticate.',
      data: {},
    })

    const msg = toPortugueseErrorMessage(
      error400,
      'E-mail ou senha inválidos. Verifique suas credenciais.',
    )
    expect(msg).toBe('E-mail ou senha inválidos. Verifique suas credenciais.')
  })

  it('handles ClientResponseError 400 with "Something went wrong." message', () => {
    const error400 = new ClientResponseError({
      status: 400,
      message: 'Something went wrong.',
      data: {},
    })

    const msg = toPortugueseErrorMessage(
      error400,
      'E-mail ou senha inválidos. Verifique suas credenciais.',
    )
    expect(msg).toBe('E-mail ou senha inválidos. Verifique suas credenciais.')
  })

  it('handles ClientResponseError 500/503 (server instability)', () => {
    const error503 = new ClientResponseError({
      status: 503,
      message: 'Service Unavailable',
      data: {},
    })

    const msg = toPortugueseErrorMessage(
      error503,
      'E-mail ou senha inválidos. Verifique suas credenciais.',
    )
    expect(msg).toContain('instabilidade temporária')
  })

  it('handles TypeError Failed to fetch', () => {
    const typeError = new TypeError('Failed to fetch')
    const msg = toPortugueseErrorMessage(typeError, 'E-mail ou senha inválidos.')
    expect(msg).toContain('Erro de conexão')
  })

  it('handles ClientResponseError 422 with response.error message in Portuguese', () => {
    const error422 = new ClientResponseError({
      status: 422,
      message: 'Something went wrong.',
      response: {
        error:
          'O modelo de IA (gemini-2.5-flash) não está disponível nesta versão da API do Google Gemini.',
        code: 'EXTRACTION_FAILED',
      },
      data: {},
    })

    const msg = toPortugueseErrorMessage(error422, 'Erro ao processar.')
    expect(msg).toBe(
      'O modelo de IA (gemini-2.5-flash) não está disponível nesta versão da API do Google Gemini.',
    )
    expect(msg).not.toContain('Something went wrong')
  })

  it('handles ClientResponseError 422 with response.message in Portuguese', () => {
    const error422 = new ClientResponseError({
      status: 422,
      message: 'Something went wrong.',
      response: {
        message:
          'Não foi possível ler o PDF — verifique se é uma cotação válida de kit solar com texto legível.',
        code: 'EXTRACTION_FAILED',
      },
      data: {},
    })

    const msg = toPortugueseErrorMessage(error422, 'Erro ao processar.')
    expect(msg).toBe(
      'Não foi possível ler o PDF — verifique se é uma cotação válida de kit solar com texto legível.',
    )
    expect(msg).not.toContain('Something went wrong')
  })
})
