import pb from '@/lib/pocketbase/client'
import type { Convidado, User } from '@/types/crm'

export const EquipeService = {
  async getTeamMembers() {
    return await pb.collection('users').getFullList<User>({
      sort: '-created',
    })
  },

  async getInvites() {
    return await pb.collection('convidados').getFullList<Convidado>({
      sort: '-created',
    })
  },

  async createInvite(data: {
    nome?: string
    email: string
    role: UserRole
    codigo_convite: string
    forcar_reenvio?: boolean
  }): Promise<{
    convite: Convidado
    email_status: 'sucesso' | 'erro' | 'duplicado_ignorado'
    email_mensagem: string
  }> {
    try {
      const response = await pb.send<{
        success: boolean
        convite: Convidado
        email_status: 'sucesso' | 'erro' | 'duplicado_ignorado'
        email_mensagem: string
        message?: string
      }>('/backend/v1/equipe/convidar', {
        method: 'POST',
        body: data,
      })

      if (response && response.convite) {
        return {
          convite: response.convite,
          email_status: response.email_status || 'sucesso',
          email_mensagem: response.email_mensagem || 'E-mail de convite enviado!',
        }
      }
      throw new Error(response?.message || 'Falha ao processar convite.')
    } catch (endpointErr) {
      console.warn('Endpoint automatizado falhou, tentando fallback direto no banco:', endpointErr)
      // Fallback gracioso: persistir direto na collection para nunca bloquear o usuário
      const fallbackConvidado = await pb.collection('convidados').create<Convidado>({
        nome: data.nome,
        email: data.email || 'ecosolarenergy2022@gmail.com',
        role: data.role,
        codigo_convite: data.codigo_convite,
        ativo: true,
        email_enviado: false,
      })
      return {
        convite: fallbackConvidado,
        email_status: 'erro',
        email_mensagem:
          endpointErr instanceof Error
            ? endpointErr.message
            : 'Convite criado, mas o serviço de e-mail está indisponível no momento.',
      }
    }
  },

  async resendInviteEmail(inviteId: string): Promise<{
    success: boolean
    email_status: 'sucesso' | 'erro'
    email_mensagem: string
    convite?: Partial<Convidado>
  }> {
    return await pb.send<{
      success: boolean
      email_status: 'sucesso' | 'erro'
      email_mensagem: string
      convite?: Partial<Convidado>
    }>('/backend/v1/equipe/reenviar-convite', {
      method: 'POST',
      body: { id: inviteId },
    })
  },

  async toggleInviteStatus(id: string, currentStatus: boolean) {
    return await pb.collection('convidados').update<Convidado>(id, {
      ativo: !currentStatus,
    })
  },

  async deleteInvite(id: string) {
    return await pb.collection('convidados').delete(id)
  },

  async updateUserRole(userId: string, role: UserRole) {
    return await pb.collection('users').update<User>(userId, { role })
  },

  async updateUserCidadeAtuacao(userId: string, cidade_atuacao: string) {
    return await pb.collection('users').update<User>(userId, {
      cidade_atuacao: cidade_atuacao.trim(),
    })
  },

  async updateUserTelefone(userId: string, telefone: string) {
    return await pb.collection('users').update<User>(userId, {
      telefone: telefone.trim(),
    })
  },

  async adminResetPassword(userId: string, newPassword: string) {
    return await pb.collection('users').update<User>(userId, {
      password: newPassword,
      passwordConfirm: newPassword,
    })
  },
}
