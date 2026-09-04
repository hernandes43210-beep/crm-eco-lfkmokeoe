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
