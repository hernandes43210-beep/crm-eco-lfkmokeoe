import pb from '@/lib/pocketbase/client'
import type { WhatsAppSettings, WhatsAppMessage, WhatsAppConversation, Lead } from '@/types/crm'

export interface SaveSettingsPayload {
  api_url: string
  api_key?: string
  instance_name?: string
  webhook_url?: string
}

export interface ConnectResponse {
  status: 'connected' | 'connecting' | 'disconnected'
  message?: string
  instance_name?: string
  qrcode?: {
    base64?: string
    code?: string
    pairingCode?: string
  }
}

export interface StatusResponse {
  configured: boolean
  instance_name?: string
  status: 'connected' | 'connecting' | 'disconnected'
  state?: string
  phone_number?: string
}

export const WhatsAppService = {
  // Configurações
  async getSettings(): Promise<WhatsAppSettings> {
    const res = await pb.send('/backend/v1/whatsapp/settings', {
      method: 'GET',
    })
    return res as WhatsAppSettings
  },

  async saveSettings(payload: SaveSettingsPayload): Promise<{ success: boolean; message: string }> {
    const res = await pb.send('/backend/v1/whatsapp/settings', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return res as { success: boolean; message: string }
  },

  // Conexão e QR Code
  async connect(): Promise<ConnectResponse> {
    const res = await pb.send('/backend/v1/whatsapp/connect', {
      method: 'POST',
    })
    return res as ConnectResponse
  },

  async getStatus(): Promise<StatusResponse> {
    const res = await pb.send('/backend/v1/whatsapp/status', {
      method: 'GET',
    })
    return res as StatusResponse
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    const res = await pb.send('/backend/v1/whatsapp/logout', {
      method: 'POST',
    })
    return res as { success: boolean; message: string }
  },

  // Envio de mensagens
  async sendMessage(params: {
    number: string
    text: string
    lead_id?: string
  }): Promise<{ success: boolean; wa_message_id: string; record_id: string }> {
    const res = await pb.send('/backend/v1/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify(params),
    })
    return res as { success: boolean; wa_message_id: string; record_id: string }
  },

  // Listagem de mensagens
  async getMessagesByLead(leadId: string): Promise<WhatsAppMessage[]> {
    const records = await pb.collection('whatsapp_messages').getFullList({
      filter: `lead = "${leadId}"`,
      sort: 'created',
      expand: 'lead',
    })
    return records as unknown as WhatsAppMessage[]
  },

  async getMessagesByPhone(phoneNumber: string): Promise<WhatsAppMessage[]> {
    const cleanNumber = phoneNumber.replace(/\D/g, '')
    const records = await pb.collection('whatsapp_messages').getFullList({
      filter: `phone_number = "${cleanNumber}"`,
      sort: 'created',
      expand: 'lead',
    })
    return records as unknown as WhatsAppMessage[]
  },

  // Buscar todas as mensagens e agrupar por conversa (número / lead)
  async getConversations(): Promise<WhatsAppConversation[]> {
    const records = (await pb.collection('whatsapp_messages').getList(1, 200, {
      sort: '-created',
      expand: 'lead',
    })) as { items: WhatsAppMessage[] }

    const grouped = new Map<
      string,
      { last_message: WhatsAppMessage; unread_count: number; lead?: Lead }
    >()

    for (const msg of records.items) {
      const key = msg.phone_number
      if (!grouped.has(key)) {
        grouped.set(key, {
          last_message: msg,
          unread_count: msg.unread ? 1 : 0,
          lead: msg.expand?.lead,
        })
      } else {
        const item = grouped.get(key)!
        if (msg.unread) {
          item.unread_count += 1
        }
        if (!item.lead && msg.expand?.lead) {
          item.lead = msg.expand.lead
        }
      }
    }

    const conversations: WhatsAppConversation[] = []
    for (const [phone, item] of grouped.entries()) {
      conversations.push({
        phone_number: phone,
        lead: item.lead,
        last_message: item.last_message,
        unread_count: item.unread_count,
      })
    }

    return conversations
  },

  // Marcar mensagens de uma conversa como lidas
  async markAsRead(phoneNumber: string): Promise<void> {
    try {
      const unreadList = await pb.collection('whatsapp_messages').getFullList({
        filter: `phone_number = "${phoneNumber}" && unread = true`,
      })
      for (const item of unreadList) {
        await pb.collection('whatsapp_messages').update(item.id, { unread: false })
      }
    } catch {
      /* intentionally ignored */
    }
  },

  // Vincular conversa a um lead existente
  async linkConversationToLead(phoneNumber: string, leadId: string): Promise<void> {
    const messages = await pb.collection('whatsapp_messages').getFullList({
      filter: `phone_number = "${phoneNumber}"`,
    })
    for (const msg of messages) {
      if (!msg.lead) {
        await pb.collection('whatsapp_messages').update(msg.id, { lead: leadId })
      }
    }
  },
}
