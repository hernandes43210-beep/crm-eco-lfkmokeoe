import { ClientResponseError } from 'pocketbase'

/**
 * Mapeamento de nomes de campos técnicos para rótulos amigáveis em português
 */
export const FIELD_LABELS: Record<string, string> = {
  // Geral e Usuários
  email: 'E-mail',
  password: 'Senha',
  oldPassword: 'Senha atual',
  passwordConfirm: 'Confirmação de senha',
  name: 'Nome',
  avatar: 'Foto de perfil',
  role: 'Perfil de acesso',

  // Leads
  nome: 'Nome',
  telefone: 'Telefone / WhatsApp',
  origem: 'Origem do lead',
  consumo_mensal_kwh: 'Consumo mensal (kWh)',
  endereco: 'Endereço',
  cidade: 'Cidade',
  estado: 'UF / Estado',
  status: 'Status',
  preco_venda: 'Preço de venda',
  proprietario: 'Responsável / Proprietário',
  proximo_contato: 'Próximo contato',
  proximo_contato_data: 'Data e hora do próximo contato',
  proximo_contato_obs: 'Observação do próximo contato',
  lembrete_1d_enviado: 'Lembrete de 1 dia',
  lembrete_4h_enviado: 'Lembrete de 4 horas',
  lembrete_20m_enviado: 'Lembrete de 20 minutos',
  tipo_imovel: 'Tipo do imóvel',
  valor_conta_reais: 'Valor da conta (R$)',
  status_qualificacao: 'Status de qualificação',
  motivo_descarte: 'Motivo do descarte',
  cpf_cnpj: 'CPF ou CNPJ',
  nacionalidade: 'Nacionalidade',
  estado_civil: 'Estado civil',
  profissao: 'Profissão',
  cep: 'CEP',
  pr_file: 'Arquivo da proposta',
  pr_assinada_ganho: 'Proposta assinada',
  sla_dias: 'Prazo SLA',
  sla_limite: 'Limite do SLA',
  historico: 'Histórico',

  // Propostas & Kits
  lead: 'Lead vinculado',
  kit: 'Kit solar',
  kit_nome: 'Nome do kit solar',
  kit_potencia_kw: 'Potência do kit (kWp)',
  kit_fabricante: 'Fabricante do kit',
  custo: 'Custo base',
  margem: 'Margem de lucro (%)',
  validade_dias: 'Prazo de validade',
  data_validade: 'Data de validade',
  condicoes_pagamento: 'Condições de pagamento',
  observacoes: 'Observações',
  categoria: 'Categoria',
  potencia_kw: 'Potência (kWp)',
  fabricante: 'Fabricante',
  descricao: 'Descrição técnica',
  string_box: 'String Box',

  // Formalização
  tipo: 'Tipo de documento',
  titulo: 'Título do documento',
  versao: 'Versão',
  dados_customizados: 'Dados customizados',
  conteudo_html: 'Conteúdo do documento',
  arquivo_pdf: 'Arquivo do documento',
  criado_por: 'Criado por',
  documento: 'Documento',
  tipo_documento: 'Tipo de documento',

  // Clicksign / Assinaturas
  envelope_id: 'ID do envelope',
  signer_token: 'Token do assinante',
  link_assinatura: 'Link de assinatura',
  api_token: 'Token de API',
  ambiente: 'Ambiente de assinatura',
}

/**
 * Tradução de mensagens de validação padrão do PocketBase e backends comuns
 */
const PB_VALIDATION_MESSAGES: Record<string, string> = {
  validation_required: 'Campo obrigatório não informado.',
  validation_missing_required_elem: 'Campo obrigatório não preenchido.',
  validation_invalid_email: 'Endereço de e-mail inválido.',
  validation_invalid_url: 'Endereço de URL inválido.',
  validation_not_unique: 'Este valor já está em uso e precisa ser único.',
  validation_unique: 'Este valor já está em uso e precisa ser único.',
  validation_min_text_constraint:
    'Texto muito curto. Informe ao menos a quantidade mínima de caracteres.',
  validation_max_text_constraint: 'Texto ultrapassa o limite máximo de caracteres permitido.',
  validation_length_out_of_range: 'Tamanho do texto fora dos limites permitidos.',
  validation_min_numeric_value: 'Valor abaixo do mínimo permitido.',
  validation_max_numeric_value: 'Valor acima do máximo permitido.',
  validation_invalid_date: 'Data informada é inválida.',
  validation_min_date_constraint: 'Data anterior ao limite mínimo permitido.',
  validation_max_date_constraint: 'Data posterior ao limite máximo permitido.',
  validation_file_size_limit: 'O tamanho do arquivo excede o limite permitido.',
  validation_invalid_mime_type: 'Tipo de arquivo não permitido.',
}

/**
 * Tradução de frases comuns em inglês para português
 */
const PHRASE_TRANSLATIONS: Array<[RegExp, string]> = [
  [/Failed to create record\.?/gi, 'Falha ao salvar o registro no sistema.'],
  [/Failed to update record\.?/gi, 'Falha ao atualizar o registro no sistema.'],
  [/Failed to delete record\.?/gi, 'Falha ao excluir o registro.'],
  [/Failed to authenticate\.?/gi, 'E-mail ou senha incorretos.'],
  [/Failed to find record\.?/gi, 'Registro não encontrado.'],
  [/Failed to load/gi, 'Falha ao carregar'],
  [/Invalid credentials\.?/gi, 'E-mail ou senha inválidos.'],
  [/The request is invalid\.?/gi, 'Requisição inválida. Verifique os dados enviados.'],
  [/Something went wrong\.?/gi, 'Ocorreu um erro inesperado. Tente novamente.'],
  [/An unexpected error occurred\.?/gi, 'Ocorreu um erro inesperado. Tente novamente.'],
  [
    /Network error|Failed to fetch|NetworkError/gi,
    'Erro de conexão com o servidor. Verifique sua internet.',
  ],
  [/Cannot be blank\.?/gi, 'Não pode ficar em branco.'],
  [/Value must be unique\.?/gi, 'Já existe um registro com este mesmo valor.'],
  [/Must be a valid email address\.?/gi, 'Informe um endereço de e-mail válido.'],
  [
    /The relation collection cannot be changed\.?/gi,
    'A coleção relacionada não pode ser alterada.',
  ],
  [/Only admins can perform this action\.?/gi, 'Apenas administradores podem realizar esta ação.'],
  [
    /You are not allowed to perform this action\.?/gi,
    'Você não tem permissão para realizar esta operação.',
  ],
  [/Record not found\.?/gi, 'Registro não encontrado.'],
]

/**
 * Traduz um código de erro ou mensagem de validação de campo para pt-BR
 */
export function translateValidationMessage(codeOrMsg: string, fieldName?: string): string {
  if (!codeOrMsg) return 'Dado inválido.'
  const trimmed = codeOrMsg.trim()

  // 1. Checa chave direta de validação do PocketBase
  if (PB_VALIDATION_MESSAGES[trimmed]) {
    // Casos especiais com contexto de campo
    if (trimmed === 'validation_not_unique' || trimmed === 'validation_unique') {
      if (fieldName === 'email') return 'Já existe um registro cadastrado com este e-mail.'
      if (fieldName === 'cpf_cnpj') return 'Já existe um registro cadastrado com este CPF/CNPJ.'
      const label = fieldName ? FIELD_LABELS[fieldName] || fieldName : 'valor'
      return `Já existe um registro com este ${label}.`
    }
    return PB_VALIDATION_MESSAGES[trimmed]
  }

  // 2. Substituição por regex de frases conhecidas
  for (const [regex, replacement] of PHRASE_TRANSLATIONS) {
    if (regex.test(trimmed)) {
      return trimmed.replace(regex, replacement)
    }
  }

  // 3. Casos pontuais de texto
  const lower = trimmed.toLowerCase()
  if (lower.includes('unique') || lower.includes('already exists')) {
    if (fieldName === 'email') return 'Já existe um registro cadastrado com este e-mail.'
    return 'Este dado já está cadastrado no sistema e deve ser único.'
  }
  if (lower.includes('required') || lower.includes('cannot be blank')) {
    return 'Campo obrigatório não preenchido.'
  }
  if (
    lower.includes('password') &&
    (lower.includes('length') || lower.includes('min') || lower.includes('caracteres'))
  ) {
    return 'A senha deve conter no mínimo 8 caracteres.'
  }

  return trimmed
}

/**
 * Traduz o nome de um campo para rótulo legível em pt-BR
 */
export function getFieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] || fieldName.replace(/_/g, ' ')
}

export type ExtractedFieldErrors = Record<string, string>

/**
 * Extrai erros de validação por campo a partir de um erro desconhecido (ex: PocketBase ClientResponseError)
 * Traduz tanto a chave do erro quanto a mensagem para pt-BR.
 */
export function extractTranslatedFieldErrors(error: unknown): ExtractedFieldErrors {
  if (!error || typeof error !== 'object') return {}

  const fieldErrors: ExtractedFieldErrors = {}

  // Tratamento específico PocketBase response.data
  const errWithResponse = error as {
    response?: {
      data?: Record<string, unknown>
      message?: string
    }
    data?: Record<string, unknown>
  }

  const rawData = errWithResponse.response?.data || errWithResponse.data
  if (rawData && typeof rawData === 'object') {
    for (const [field, detail] of Object.entries(rawData)) {
      if (!detail) continue

      if (typeof detail === 'string') {
        fieldErrors[field] = translateValidationMessage(detail, field)
      } else if (typeof detail === 'object') {
        const item = detail as { code?: string; message?: string }
        const rawMsg = item.code
          ? translateValidationMessage(item.code, field)
          : item.message
            ? translateValidationMessage(item.message, field)
            : ''
        if (rawMsg) {
          fieldErrors[field] = rawMsg
        }
      }
    }
  }

  return fieldErrors
}

/**
 * Formata um erro para mensagem final amigável em português brasileiro.
 *
 * @param error O objeto de erro capturado (ClientResponseError, Error, string, etc.)
 * @param fallbackMsg Mensagem padrão se não for possível inferir detalhes
 * @returns Mensagem limpa e amigável em pt-BR
 */
export function toPortugueseErrorMessage(
  error: unknown,
  fallbackMsg: string = 'Não foi possível completar a operação. Tente novamente.',
): string {
  if (!error) return fallbackMsg

  // Se já for uma string limpa
  if (typeof error === 'string') {
    return translateValidationMessage(error)
  }

  // Erros de rede padrão do browser (TypeError: Failed to fetch)
  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.'
  }

  // PocketBase ClientResponseError ou compatíveis
  if (
    error instanceof ClientResponseError ||
    (typeof error === 'object' && error !== null && 'response' in error)
  ) {
    const pbErr = error as ClientResponseError
    const status = pbErr.status || (pbErr.response as any)?.status

    // Extrair erros detalhados por campo
    const fieldErrors = extractTranslatedFieldErrors(pbErr)
    const fieldEntries = Object.entries(fieldErrors)

    if (fieldEntries.length > 0) {
      // Monta lista legível de erros de campo com rótulos traduzidos
      const details = fieldEntries
        .map(([field, msg]) => `${getFieldLabel(field)}: ${msg}`)
        .join(' | ')

      return `Dados inválidos: ${details}`
    }

    // Tratamento de códigos HTTP comuns
    if (status === 401 || status === 403) {
      const msg = pbErr.message?.toLowerCase() || ''
      if (msg.includes('authenticate') || msg.includes('credential') || msg.includes('login')) {
        return 'E-mail ou senha incorretos.'
      }
      return 'Você não tem permissão para realizar esta operação.'
    }
    if (status === 404) {
      return 'Registro não encontrado ou já excluído.'
    }
    if (status === 400) {
      const originalMsg = pbErr.message || (pbErr.response as any)?.message || ''
      const translated = translateValidationMessage(originalMsg)
      if (
        translated &&
        !translated.toLowerCase().includes('failed to create record') &&
        !translated.toLowerCase().includes('failed to update record')
      ) {
        return translated
      }
      return 'Verifique os dados informados e tente novamente.'
    }
    if (status && status >= 500) {
      return 'O servidor encontrou uma instabilidade temporária. Tente novamente em instantes.'
    }
  }

  // Erro padrão JavaScript (Error instance)
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return 'A operação foi cancelada antes de ser concluída.'
    }
    const msg = error.message
    if (msg) {
      return translateValidationMessage(msg)
    }
  }

  return fallbackMsg
}

/**
 * Helper para obter texto descritivo e amigável para toasts destrutivos de erro
 */
export function getFriendlyErrorMessage(error: unknown, fallback: string): string {
  const result = toPortugueseErrorMessage(error, fallback)
  return result || fallback
}
