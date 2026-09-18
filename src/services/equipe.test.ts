import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EquipeService } from './equipe'
import pb from '@/lib/pocketbase/client'

vi.mock('@/lib/pocketbase/client', () => {
  return {
    default: {
      collection: vi.fn(),
      send: vi.fn(),
    },
  }
})

describe('EquipeService - Envio de Convites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve chamar o endpoint /backend/v1/equipe/convidar e retornar o status do e-mail com sucesso', async () => {
    const mockResponse = {
      success: true,
      convite: {
        id: 'inv_123',
        nome: 'Maria Silva',
        email: 'maria@ecosolar.com.br',
        role: 'Vendedor',
        codigo_convite: 'SOL789',
        ativo: true,
        email_enviado: true,
        email_enviado_em: '2026-09-18T19:00:00.000Z',
        email_destinatario: 'maria@ecosolar.com.br',
        created: '2026-09-18T19:00:00.000Z',
        updated: '2026-09-18T19:00:00.000Z',
      },
      email_status: 'sucesso',
      email_mensagem: 'E-mail de convite enviado com sucesso para maria@ecosolar.com.br',
    }

    vi.mocked(pb.send).mockResolvedValueOnce(mockResponse)

    const result = await EquipeService.createInvite({
      nome: 'Maria Silva',
      email: 'maria@ecosolar.com.br',
      role: 'Vendedor',
      codigo_convite: 'SOL789',
    })

    expect(pb.send).toHaveBeenCalledWith(
      '/backend/v1/equipe/convidar',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          nome: 'Maria Silva',
          email: 'maria@ecosolar.com.br',
          role: 'Vendedor',
          codigo_convite: 'SOL789',
        }),
      }),
    )

    expect(result.email_status).toBe('sucesso')
    expect(result.convite.codigo_convite).toBe('SOL789')
    expect(result.convite.email_enviado).toBe(true)
  })

  it('deve realizar fallback gracioso quando o backend hook falhar, preservando o convite', async () => {
    vi.mocked(pb.send).mockRejectedValueOnce(new Error('Serviço temporariamente indisponível'))

    const mockCreate = vi.fn().mockResolvedValueOnce({
      id: 'inv_fallback',
      nome: 'Carlos Souza',
      email: 'carlos@ecosolar.com.br',
      role: 'Vendedor',
      codigo_convite: 'SOL123',
      ativo: true,
      email_enviado: false,
      created: '2026-09-18T19:00:00.000Z',
      updated: '2026-09-18T19:00:00.000Z',
    })

    vi.mocked(pb.collection).mockReturnValue({
      create: mockCreate,
    } as any)

    const result = await EquipeService.createInvite({
      nome: 'Carlos Souza',
      email: 'carlos@ecosolar.com.br',
      role: 'Vendedor',
      codigo_convite: 'SOL123',
    })

    expect(result.email_status).toBe('erro')
    expect(result.convite.codigo_convite).toBe('SOL123')
    expect(result.convite.ativo).toBe(true)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo_convite: 'SOL123',
        email: 'carlos@ecosolar.com.br',
      }),
    )
  })

  it('deve permitir reenviar o e-mail de convite através de resendInviteEmail', async () => {
    const mockReenviarRes = {
      success: true,
      email_status: 'sucesso',
      email_mensagem: 'Convite reenviado com sucesso para maria@ecosolar.com.br',
    }

    vi.mocked(pb.send).mockResolvedValueOnce(mockReenviarRes)

    const result = await EquipeService.resendInviteEmail('inv_123')

    expect(pb.send).toHaveBeenCalledWith('/backend/v1/equipe/reenviar-convite', {
      method: 'POST',
      body: { id: 'inv_123' },
    })

    expect(result.success).toBe(true)
    expect(result.email_status).toBe('sucesso')
  })
})
