import pb from '@/lib/pocketbase/client'
import type { NotificacaoCRM } from '@/types/crm'

export const NotificacoesService = {
  /**
   * Busca as notificações do usuário logado (ou todas se admin), mais recentes primeiro
   */
  async getNotificacoes(userId?: string, limit = 50): Promise<NotificacaoCRM[]> {
    try {
      const filter = userId ? `usuario = '${userId}'` : ''
      return await pb.collection('notificacoes').getFullList<NotificacaoCRM>({
        filter,
        sort: '-created',
        requestKey: null,
      })
    } catch (err) {
      console.error('Erro ao buscar notificações:', err)
      return []
    }
  },

  /**
   * Conta as notificações não lidas do usuário
   */
  async countNaoLidas(userId?: string): Promise<number> {
    try {
      const filterParts = ['lida = false']
      if (userId) filterParts.push(`usuario = '${userId}'`)

      const result = await pb.collection('notificacoes').getList(1, 1, {
        filter: filterParts.join(' && '),
        requestKey: null,
      })
      return result.totalItems
    } catch (err) {
      console.error('Erro ao contar notificações não lidas:', err)
      return 0
    }
  },

  /**
   * Marca uma notificação como lida
   */
  async marcarComoLida(notificacaoId: string): Promise<NotificacaoCRM> {
    return await pb.collection('notificacoes').update<NotificacaoCRM>(notificacaoId, {
      lida: true,
    })
  },

  /**
   * Marca todas as notificações não lidas do usuário como lidas
   */
  async marcarTodasComoLidas(userId: string): Promise<void> {
    try {
      const naoLidas = await pb.collection('notificacoes').getFullList<NotificacaoCRM>({
        filter: `usuario = '${userId}' && lida = false`,
        requestKey: null,
      })

      await Promise.all(
        naoLidas.map((item) =>
          pb
            .collection('notificacoes')
            .update(item.id, { lida: true })
            .catch(() => null),
        ),
      )
    } catch (err) {
      console.error('Erro ao marcar todas notificações como lidas:', err)
    }
  },

  /**
   * Exclui uma notificação
   */
  async excluirNotificacao(notificacaoId: string): Promise<boolean> {
    return await pb.collection('notificacoes').delete(notificacaoId)
  },
}
