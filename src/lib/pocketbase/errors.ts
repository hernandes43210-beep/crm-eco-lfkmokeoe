import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

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
      const msg = (detail as { message: string }).message
      // Traduzir mensagens padrão comuns do PocketBase
      if (msg.includes('Value must be unique') || msg.includes('unique')) {
        errors[field] =
          field === 'email'
            ? 'Já existe um lead cadastrado com este e-mail.'
            : 'Este valor já está em uso.'
      } else if (msg.includes('Cannot be blank')) {
        errors[field] = 'Este campo é obrigatório.'
      } else if (msg.includes('Must be a valid email')) {
        errors[field] = 'Informe um endereço de e-mail válido.'
      } else {
        errors[field] = msg
      }
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

  const rawMsg = error.response?.message || error.message || ''
  if (rawMsg.includes('Failed to create record') || rawMsg.includes('Failed to update record')) {
    return 'Não foi possível salvar os dados do lead. Verifique os campos preenchidos e tente novamente.'
  }
  if (
    rawMsg.includes('unique') ||
    rawMsg.includes('UNIQUE') ||
    rawMsg.includes('idx_leads_email')
  ) {
    return 'Já existe um lead cadastrado com este e-mail.'
  }

  return rawMsg || 'Ocorreu um erro ao salvar o registro no banco de dados.'
}
