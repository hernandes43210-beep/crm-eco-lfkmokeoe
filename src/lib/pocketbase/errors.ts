import { ClientResponseError } from 'pocketbase'
import {
  extractTranslatedFieldErrors,
  toPortugueseErrorMessage,
  getFieldLabel,
  FIELD_LABELS,
} from '@/lib/errors'

export type FieldErrors = Record<string, string>

export { getFieldLabel, FIELD_LABELS }

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) {
    return extractTranslatedFieldErrors(error)
  }
  return extractTranslatedFieldErrors(error)
}

export function getErrorMessage(error: unknown): string {
  return toPortugueseErrorMessage(error, 'Ocorreu um erro inesperado. Tente novamente.')
}
