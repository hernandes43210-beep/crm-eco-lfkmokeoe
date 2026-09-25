export type UserRole = 'Admin' | 'Vendedor'

import type { RecordModel } from 'pocketbase'

export interface User extends RecordModel {
  id: string
  email: string
  name?: string
  role?: UserRole
  avatar?: string
  cidade_atuacao?: string
  telefone?: string
  created: string
  updated: string
}

export type NotificacaoTipo = 'lead_cidade' | 'geral' | 'sla' | 'contato'

export interface NotificacaoCRM extends RecordModel {
  id: string
  usuario: string
  lead?: string
  titulo: string
  mensagem: string
  tipo: NotificacaoTipo
  lida: boolean
  lead_nome?: string
  lead_cidade?: string
  lead_bairro?: string
  lead_telefone?: string
  metadados?: Record<string, unknown> | string
  created: string
  updated: string
  expand?: {
    lead?: Lead
    usuario?: User
  }
}

export type LeadStatus =
  | 'Novo'
  | 'Contato Feito'
  | 'Proposta Enviada'
  | 'Negociação'
  | 'Fechado Ganho'
  | 'Fechado Perdido'

export type LeadOrigem = 'Indicação' | 'Site' | 'Redes Sociais' | 'Evento' | 'Parceria' | 'Outros'

export type LeadQualificacaoStatus = 'aguardando' | 'qualificado' | 'descartado'

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
    | 'qualificacao'
    | 'descarte'
    | 'contato'
  descricao: string
  autor?: string
}

export interface Lead extends RecordModel {
  id: string
  nome: string
  email: string
  telefone?: string
  cpf_cnpj?: string
  nacionalidade?: string
  estado_civil?: string
  profissao?: string
  cep?: string
  origem?: LeadOrigem
  consumo_mensal_kwh: number
  endereco?: string
  bairro?: string
  cidade?: string
  estado?: string
  status: LeadStatus
  status_qualificacao?: LeadQualificacaoStatus
  qualificado_em?: string
  qualificado_por?: string
  qualificada_ia?: boolean
  amanda_conversation_id?: string
  motivo_descarte?: string
  motivo_perda?: string
  proximo_contato?: string
  proximo_contato_data?: string
  proximo_contato_obs?: string
  lembrete_1d_enviado?: boolean
  lembrete_4h_enviado?: boolean
  lembrete_20m_enviado?: boolean
  lembretes_logs?: Array<{
    tipo: '1d' | '4h' | '20m'
    destinatario: string
    enviado_em?: string
    tentativa_em?: string
    status: 'sucesso' | 'erro'
    erro?: string
  }>
  pr_post_encerramento?: string
  sla_dias: number
  sla_limite?: string
  pr_assinada_ganho?: boolean
  pr_file?: string
  preco_venda?: number
  proprietario: string
  luvik_deal_id?: string
  tipo_imovel?: string
  valor_conta_reais?: number
  historico?: HistoricoItem[]
  created: string
  updated: string
  expand?: {
    proprietario?: User
    qualificado_por?: User
  }
}

export type FormalizacaoTipo = 'contrato' | 'procuracao'

export interface FormalizacaoDocumento extends RecordModel {
  id: string
  lead: string
  tipo: FormalizacaoTipo
  titulo: string
  versao: number
  dados_customizados?: Record<string, unknown>
  conteudo_html?: string
  arquivo_pdf?: string
  criado_por?: string
  created: string
  updated: string
  expand?: {
    lead?: Lead
    criado_por?: User
  }
}

export type AssinaturaEnvelopeStatus =
  | 'draft'
  | 'running'
  | 'signed'
  | 'canceled'
  | 'expired'
  | 'error'

export interface AssinaturaEnvelope extends RecordModel {
  id: string
  lead: string
  documento?: string
  tipo_documento: FormalizacaoTipo
  clicksign_envelope_id: string
  clicksign_document_id?: string
  clicksign_signer_id?: string
  clicksign_requirement_id?: string
  status: AssinaturaEnvelopeStatus
  nome_envelope: string
  signatario_nome: string
  signatario_email: string
  signatario_cpf?: string
  signatario_telefone?: string
  link_assinatura?: string
  arquivo_assinado_pdf?: string
  assinado_em?: string
  dados_resposta?: Record<string, unknown>
  mensagem_erro?: string
  criado_por?: string
  created: string
  updated: string
  expand?: {
    lead?: Lead
    documento?: FormalizacaoDocumento
    criado_por?: User
  }
}

export type KitCategoria = 'Residencial' | 'Comercial' | 'Rural'

export type KitStringBox = '1_entrada' | '2_entradas' | '3_entradas'

export type KitTipoEstrutura = 'solo_monoposte' | 'mini_trilho' | 'fibrocimento' | 'outro'

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
  string_box?: KitStringBox | ''
  marca_painel?: string
  marca_inversor?: string
  potencia_painel_w?: number
  potencia_inversor_kw?: number
  tipo_estrutura?: KitTipoEstrutura | ''
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
  email_enviado?: boolean
  email_enviado_em?: string
  email_destinatario?: string
  email_erro?: string
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

export interface SiteFormSettings {
  id: string
  form_token: string
  ativo: boolean
  site_url?: string
  created?: string
  updated?: string
}

export interface SiteFormLogItem {
  id: string
  status_processamento: 'sucesso' | 'ignorado' | 'erro'
  lead_id?: string
  lead_nome?: string
  mensagem?: string
  payload_bruto?: Record<string, unknown>
  origem_ip?: string
  created: string
}

export type PropostaStatus = 'Rascunho' | 'Enviada' | 'Aceita' | 'Recusada'
export type PropostaFormato = 'story' | 'classica'

export interface PropostaAcessoItem {
  data: string
  ip?: string
  origem?: string
}

export interface PropostaFotoSelecionada {
  origem: 'lead' | 'institucional'
  id: string
  legenda?: string
}

export interface Proposta extends RecordModel {
  id: string
  lead: string
  kit?: string
  criado_por?: string
  kit_nome: string
  kit_potencia_kw?: number
  kit_fabricante?: string
  custo: number
  margem: number
  preco_venda: number
  desconto_percentual?: number
  valor_desconto?: number
  valor_bruto?: number
  validade_dias?: number
  data_validade: string
  condicoes_pagamento?: string
  observacoes?: string
  status: PropostaStatus
  formato?: PropostaFormato
  token_publico: string
  data_aceite?: string
  aceito_por_nome?: string
  aceito_por_ip?: string
  visualizacoes_count?: number
  primeira_visualizacao?: string
  ultima_visualizacao?: string
  ultimo_ip_visualizacao?: string
  ultimo_user_agent?: string
  historico_acessos?: PropostaAcessoItem[] | string
  visualizacoes_historico?: string[] | string
  kit_marca_painel?: string
  kit_marca_inversor?: string
  kit_tipo_estrutura?: KitTipoEstrutura | ''
  kit_potencia_painel_w?: number
  kit_potencia_inversor_kw?: number
  kit_descricao?: string
  kit_string_box?: KitStringBox | ''
  fotos_selecionadas?: PropostaFotoSelecionada[] | string
  created: string
  updated: string
  expand?: {
    lead?: Lead
    kit?: Kit
    criado_por?: User
  }
}

export interface LeadPhoto extends RecordModel {
  id: string
  lead: string
  criado_por?: string
  foto: string
  legenda?: string
  ordem?: number
  created: string
  updated: string
  expand?: {
    lead?: Lead
    criado_por?: User
  }
}

export interface PublicProposta {
  id: string
  token_publico: string
  status: PropostaStatus
  formato?: PropostaFormato
  kit_nome: string
  kit_potencia_kw?: number
  kit_fabricante?: string
  custo: number
  margem: number
  preco_venda: number
  desconto_percentual?: number
  valor_desconto?: number
  valor_bruto?: number
  validade_dias?: number
  data_validade: string
  condicoes_pagamento?: string
  observacoes?: string
  data_aceite?: string
  aceito_por_nome?: string
  visualizacoes_count?: number
  primeira_visualizacao?: string
  ultima_visualizacao?: string
  visualizacoes_historico?: string[] | string
  created: string
  kit_marca_painel?: string
  kit_marca_inversor?: string
  kit_tipo_estrutura?: KitTipoEstrutura | ''
  kit_potencia_painel_w?: number
  kit_potencia_inversor_kw?: number
  kit_descricao?: string
  kit_string_box?: KitStringBox | ''
  fotos_selecionadas?: PropostaFotoSelecionada[]
  lead?: {
    id: string
    nome: string
    email: string
    telefone?: string
    cidade?: string
    estado?: string
    endereco?: string
    consumo_mensal_kwh?: number
    status?: string
  }
  kit?: {
    id: string
    nome: string
    fabricante?: string
    potencia_kw?: number
    categoria?: string
    descricao?: string
    string_box?: KitStringBox | ''
    marca_painel?: string
    marca_inversor?: string
    potencia_painel_w?: number
    potencia_inversor_kw?: number
    tipo_estrutura?: KitTipoEstrutura | ''
  }
  vendedor?: {
    name?: string
    email?: string
  }
  fotos_obra?: Array<{
    id: string
    foto: string
    legenda?: string
    url?: string
  }>
  is_expirada?: boolean
}
