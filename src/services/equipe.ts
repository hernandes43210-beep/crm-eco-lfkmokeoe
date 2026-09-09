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
    role: 'Admin' | 'Vendedor'
    codigo_convite: string
  }) {
    return await pb.collection('convidados').create<Convidado>({
      ...data,
      ativo: true,
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

  async updateUserRole(userId: string, role: 'Admin' | 'Vendedor') {
    return await pb.collection('users').update<User>(userId, { role })
  },

  async adminResetPassword(userId: string, newPassword: string) {
    return await pb.collection('users').update<User>(userId, {
      password: newPassword,
      passwordConfirm: newPassword,
    })
  },
}
