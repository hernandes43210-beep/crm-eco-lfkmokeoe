import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

// Dicionário de tradução de nomes de campos para pt-BR
const FIELD_LABELS_BR: Record<string, string> = {
  nome: 'Nome',
  email: 'E-mail',
  telefone: 'Telefone',
  origem: 'Origem',
  consumo_mensal_kwh: 'Consumo Mensal (kWh)',
  endereco: 'Endereço',
  cidade: 'Cidade',
  estado: 'UF / Estado',
  status: 'Estágio do Funil',
  pr_post_encerramento: 'Previsão de Encerramento',
  sla_dias: 'Prazo SLA',
  preco_venda: 'Preço de Venda',
  proprietario: 'Proprietário / Vendedor',
  codigo_convite: 'Código de Convite',
  password: 'Senha',
}

// Tradução de mensagens comuns do PocketBase para pt-BR
function translateMessageBR(field: string, rawMsg: string): string {
  const lower = rawMsg.toLowerCase()

  if (
    lower.includes('cannot be blank') ||
    lower.includes("can't be blank") ||
    lower.includes('required')
  ) {
    const label = FIELD_LABELS_BR[field] || field
    return `${label} é obrigatório.`
  }
  if (
    lower.includes('unique') ||
    lower.includes('already exists') ||
    lower.includes('must be unique')
  ) {
    if (field === 'email') return 'Já existe um cadastro com este e-mail no sistema.'
    const label = FIELD_LABELS_BR[field] || field
    return `${label} já está cadastrado no sistema.`
  }
  if (lower.includes('invalid') || lower.includes('not a valid')) {
    if (field === 'email') return 'E-mail inválido. Verifique o formato.'
    if (field === 'estado') return 'UF inválida. Use a sigla de 2 letras (ex: SP, RJ, MG).'
    if (field === 'pr_post_encerramento') return 'Data de previsão de encerramento inválida.'
    const label = FIELD_LABELS_BR[field] || field
    return `${label} possui um formato inválido.`
  }
  if (
    lower.includes('greater than') ||
    lower.includes('min') ||
    lower.includes('must be at least')
  ) {
    const label = FIELD_LABELS_BR[field] || field
    return `${label} deve ser maior que zero.`
  }

  return rawMsg
}

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = translateMessageBR(field, (detail as { message: string }).message)
    } else if (typeof detail === 'string') {
      errors[field] = translateMessageBR(field, detail)
    }
  }
  return errors
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'
  }

  const fieldErrors = extractFieldErrors(error)
  const msgs = Object.values(fieldErrors)
  if (msgs.length > 0) {
    return msgs.join(' ')
  }

  // Se for erro de permissão ou status HTTP
  if (error.status === 403) {
    return 'Permissão negada. Você não tem permissão para realizar esta operação.'
  }
  if (error.status === 400) {
    const rawMsg = error.response?.message || error.message || ''
    if (rawMsg.toLowerCase().includes('failed to create record')) {
      return 'Não foi possível cadastrar o lead. Verifique se todos os campos obrigatórios estão preenchidos corretamente.'
    }
    if (rawMsg.toLowerCase().includes('failed to update record')) {
      return 'Não foi possível atualizar o lead. Verifique os dados informados.'
    }
    return rawMsg || 'Dados inválidos. Verifique as informações do formulário.'
  }
  if (error.status === 404) {
    return 'Registro não encontrado.'
  }
  if (error.status === 0) {
    return 'Falha de conexão com o servidor. Verifique sua conexão com a internet.'
  }

  return error.message || 'Ocorreu um erro inesperado ao salvar.'
}
