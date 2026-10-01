export type UserRole = 'Admin' | 'Vendedor' | 'Engenheiro'

import type { RecordModel } from 'pocketbase'

export interface User extends RecordModel {
  id: string
  email: string
  name?: string
  role?: UserRole
  avatar?: string
  cidade_atuacao?: string
  telefone?: string
  pode_supervisionar_engenharia?: boolean
  ativo?: boolean
  created: string
  updated: string
}

export type NotificacaoTipo = 'lead_cidade' | 'geral' | 'sla' | 'contato' | 'documentos_engenharia'

export type DocumentoLeadCategoria =
  | 'documentos_pessoais'
  | 'conta_energia'
  | 'datasheet_equipamentos'
  | 'procuracao'

export type DocumentoLeadStatusEnvio = 'pendente' | 'enviado' | 'reenviado'

export type TipoInstalacaoDossie = 'telhado' | 'solo' | 'outro'

export type HomologacaoStatus =
  | 'novo_cliente'
  | 'em_projeto'
  | 'homologacao'
  | 'resposta_energisa'
  | 'liberado_vistoria'
  | 'vistoria_solicitada'
  | 'entregue'

export type ArtStatus = 'nenhuma' | 'enviada' | 'paga'

export interface HomologacaoHistoricoItem {
  data: string
  tipo: string
  descricao: string
  autor_id?: string
  autor_nome?: string
  de?: string
  para?: string
  observacao?: string
  dados_etapa?: Record<string, unknown>
  arquivo_id?: string
  arquivo_nome?: string
  categoria?: string
}

export interface HomologacaoObservacaoEtapa {
  etapa: HomologacaoStatus
  etapa_nome?: string
  observacao: string
  data: string
  autor_id?: string
  autor_nome?: string
  dados_extras?: {
    energisa_resposta?: string
    energisa_resposta_data?: string
    vistoria_data?: string
    vistoria_observacao?: string
    [key: string]: unknown
  }
}

export type ArquivoEngenhariaCategoria =
  | 'projeto_eletrico'
  | 'plantas'
  | 'processo_energisa'
  | 'art_documento'
  | 'memorial_descritivo'
  | 'parecer_acesso'
  | 'relatorio_vistoria'
  | 'comprovante_pagamento'
  | 'outros'

export type ComprovantePagamentoTipo = 'art' | 'projeto'

export interface ArquivoEngenharia extends RecordModel {
  id: string
  homologacao: string
  lead?: string
  categoria: ArquivoEngenhariaCategoria
  titulo: string
  arquivo: string
  nome_original?: string
  tamanho_bytes?: number
  etapa_origem?: HomologacaoStatus
  descricao?: string
  criado_por?: string
  created: string
  updated: string
  expand?: {
    homologacao?: HomologacaoLead
    lead?: Lead
    criado_por?: User
  }
}

export interface HomologacaoLead extends RecordModel {
  id: string
  lead: string
  dossie?: string
  engenheiro: string
  vendedor?: string
  status: HomologacaoStatus
  art_arquivo?: string
  art_status?: ArtStatus
  art_enviada_em?: string
  art_paga_em?: string
  art_observacao?: string
  // Comprovantes de pagamento
  comprovante_art_arquivo?: string
  comprovante_art_anexado_em?: string
  comprovante_art_anexado_por?: string
  projeto_pago?: boolean
  comprovante_projeto_arquivo?: string
  comprovante_projeto_anexado_em?: string
  comprovante_projeto_anexado_por?: string
  cliente_nome?: string
  cliente_telefone?: string
  cliente_cidade?: string
  cliente_estado?: string
  endereco_instalacao?: string
  unidade_consumidora?: string
  potencia_total_kwp?: number
  kit_resumo?: string
  versao_dossie?: number
  visualizado_em?: string
  observacoes_etapas?: HomologacaoObservacaoEtapa[]
  energisa_resposta?: string
  energisa_resposta_data?: string
  vistoria_data?: string
  vistoria_observacao?: string
  historico?: HomologacaoHistoricoItem[]
  created: string
  updated: string
  expand?: {
    lead?: Lead
    engenheiro?: User
    vendedor?: User
    comprovante_art_anexado_por?: User
    comprovante_projeto_anexado_por?: User
    dossie?: DossieTecnicoEngenharia
  }
}

export interface DossieTecnicoEngenharia extends RecordModel {
  id: string
  lead: string
  engenheiro_destino?: string
  enviado_por?: string
  // Dados do Lead / Cliente
  cliente_nome?: string
  cliente_telefone?: string
  cliente_email?: string
  cliente_cidade?: string
  cliente_estado?: string
  endereco_instalacao?: string
  unidade_consumidora?: string
  consumo_medio_kwh?: number
  // Equipamentos e Kit Negociado
  kit_nome?: string
  potencia_total_kwp?: number
  paineis_quantidade?: number
  paineis_modelo?: string
  paineis_potencia_w?: number
  inversor_marca?: string
  inversor_modelo?: string
  inversor_potencia_kw?: number
  inversor_quantidade?: number
  tipo_instalacao?: TipoInstalacaoDossie
  tipo_estrutura_detalhe?: string
  observacoes?: string
  versao?: number
  dados_extras?: Record<string, unknown>
  enviado_em?: string
  visualizado_em?: string
  created: string
  updated: string
  expand?: {
    lead?: Lead
    engenheiro_destino?: User
    enviado_por?: User
  }
}

export interface DocumentoLead extends RecordModel {
  id: string
  lead: string
  categoria: DocumentoLeadCategoria
  arquivo: string
  nome_original?: string
  tamanho_bytes?: number
  enviado_por?: string
  engenheiro_destino?: string
  status_envio?: DocumentoLeadStatusEnvio
  enviado_em?: string
  visualizado_em?: string
  observacoes?: string
  created: string
  updated: string
  expand?: {
    lead?: Lead
    enviado_por?: User
    engenheiro_destino?: User
  }
}

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
    | 'documentos_enviados'
    | 'documentos_reenviados'
  descricao: string
  autor?: string
  autor_nome?: string
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
  imagem_ia?: string
  imagem_ia_prompt?: string
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

export type FotoInstitucionalTipo =
  | 'residencial'
  | 'comercial'
  | 'carport'
  | 'rural'
  | 'fundacao'
  | 'solo'
  | 'outro'

export interface FotoInstitucionalRecord extends RecordModel {
  id: string
  titulo: string
  tipo: FotoInstitucionalTipo
  legenda?: string
  descricao?: string
  origem?: string // 'ia_gemini' | 'upload' | 'seed'
  prompt_usado?: string
  arquivo?: string
  criado_por?: string
  created: string
  updated: string
  expand?: {
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
  dossie_engenharia?: {
    tipo_instalacao?: TipoInstalacaoDossie
    tipo_estrutura_detalhe?: string
  } | null
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
    imagem_ia?: string
    imagem_ia_url?: string
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
