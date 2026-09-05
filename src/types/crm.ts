export type UserRole = 'Admin' | 'Vendedor'

import type { RecordModel } from 'pocketbase'

export interface User extends RecordModel {
  id: string
  email: string
  name?: string
  role?: UserRole
  avatar?: string
  created: string
  updated: string
}

export type LeadStatus =
  | 'Novo'
  | 'Contato Feito'
  | 'Proposta Enviada'
  | 'Negociação'
  | 'Fechado Ganho'
  | 'Fechado Perdido'

export type LeadOrigem = 'Indicação' | 'Site' | 'Redes Sociais' | 'Evento' | 'Parceria' | 'Outros'

export interface HistoricoItem {
  data: string
  tipo:
    | 'criacao'
    | 'status'
    | 'proposta'
    | 'negociacao'
    | 'fechamento'
    | 'perda'
    | 'alerta_sla'
    | 'nota'
  descricao: string
}

export interface Lead extends RecordModel {
  id: string
  nome: string
  email: string
  telefone?: string
  origem?: LeadOrigem
  consumo_mensal_kwh: number
  endereco?: string
  cidade?: string
  estado?: string
  status: LeadStatus
  pr_post_encerramento?: string
  sla_dias: number
  sla_limite?: string
  pr_assinada_ganho?: boolean
  pr_file?: string
  preco_venda?: number
  proprietario: string
  luvik_deal_id?: string
  historico?: HistoricoItem[]
  created: string
  updated: string
  expand?: {
    proprietario?: User
  }
}

export type KitCategoria = 'Residencial' | 'Comercial' | 'Rural'

export interface Kit extends RecordModel {
  id: string
  nome: string
  fabricante?: string
  potencia_kw: number
  categoria: KitCategoria
  custo: number
  margem: number
  preco_venda: number
  descricao?: string
  created: string
  updated: string
}

export interface Convidado extends RecordModel {
  id: string
  nome?: string
  email: string
  role: UserRole
  codigo_convite: string
  ativo: boolean
  created: string
  updated: string
}

export type WhatsAppConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export interface WhatsAppSettings {
  configured: boolean
  id?: string
  api_url: string
  instance_name: string
  has_key?: boolean
  masked_key?: string
  connection_status: WhatsAppConnectionStatus
  phone_number?: string
  webhook_url?: string
}

export type WhatsAppMessageDirection = 'in' | 'out'
export type WhatsAppMessageStatus = 'pending' | 'sent' | 'received' | 'read' | 'error'

export interface WhatsAppMessage extends RecordModel {
  id: string
  lead?: string
  phone_number: string
  sender_name?: string
  direction: WhatsAppMessageDirection
  content: string
  wa_message_id: string
  status: WhatsAppMessageStatus
  unread?: boolean
  created: string
  updated: string
  expand?: {
    lead?: Lead
  }
}

export interface WhatsAppConversation {
  phone_number: string
  lead?: Lead
  last_message: WhatsAppMessage
  unread_count: number
}

export type LuvikEventoTipo =
  | 'negocio_criado'
  | 'negocio_ganho'
  | 'negocio_perdido'
  | 'desconhecido'
export type LuvikStatusProcessamento = 'sucesso' | 'ignorado' | 'erro'

export interface LuvikSettings {
  id: string
  webhook_token: string
  ativo: boolean
  created?: string
  updated?: string
}

export interface LuvikLogItem {
  id: string
  evento: LuvikEventoTipo
  status_processamento: LuvikStatusProcessamento
  lead_id?: string
  lead_nome?: string
  deal_id?: string
  mensagem?: string
  payload_bruto?: Record<string, unknown>
  created: string
}
