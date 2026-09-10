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
      let msg = (detail as { message: string }).message
      const code =
        'code' in detail && typeof (detail as { code: unknown }).code === 'string'
          ? (detail as { code: string }).code
          : ''
      if (code === 'validation_not_unique' || msg.toLowerCase().includes('must be unique')) {
        if (field === 'email') {
          msg = 'Já existe um registro com este e-mail.'
        } else {
          msg = 'Este valor já está em uso.'
        }
      }
      errors[field] = msg
    }
  }
  return errors
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  if (msgs.length > 0) {
    return msgs.join(' ')
  }
  if (error.status === 400) {
    return 'Dados inválidos. Verifique os campos preenchidos e tente novamente.'
  }
  if (error.status === 403) {
    return 'Você não tem permissão para realizar esta ação.'
  }
  if (error.status === 404) {
    return 'Registro não encontrado.'
  }
  return error.message || 'Ocorreu um erro ao processar a solicitação.'
}
