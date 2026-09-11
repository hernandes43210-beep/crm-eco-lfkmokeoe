import { AssinaturaEnvelope, AssinaturaEnvelopeStatus } from '@/types/crm'

/**
 * Retorna as propriedades visuais de badge para o status de um envelope Clicksign
 */
export function getEnvelopeStatusBadge(status: AssinaturaEnvelopeStatus): {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  colorClass: string
  bgClass: string
  borderClass: string
  iconName: 'clock' | 'check-circle-2' | 'alert-circle' | 'x-circle' | 'file-text'
} {
  switch (status) {
    case 'signed':
      return {
        label: 'Assinado',
        variant: 'default',
        colorClass: 'text-emerald-700 dark:text-emerald-300',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
        borderClass: 'border-emerald-200 dark:border-emerald-800',
        iconName: 'check-circle-2',
      }
    case 'running':
      return {
        label: 'Aguardando Assinatura',
        variant: 'secondary',
        colorClass: 'text-amber-700 dark:text-amber-300',
        bgClass: 'bg-amber-50 dark:bg-amber-950/40',
        borderClass: 'border-amber-200 dark:border-amber-800',
        iconName: 'clock',
      }
    case 'draft':
      return {
        label: 'Rascunho',
        variant: 'outline',
        colorClass: 'text-slate-600 dark:text-slate-300',
        bgClass: 'bg-slate-50 dark:bg-slate-800/40',
        borderClass: 'border-slate-200 dark:border-slate-700',
        iconName: 'file-text',
      }
    case 'canceled':
      return {
        label: 'Cancelado',
        variant: 'outline',
        colorClass: 'text-rose-700 dark:text-rose-300',
        bgClass: 'bg-rose-50 dark:bg-rose-950/40',
        borderClass: 'border-rose-200 dark:border-rose-800',
        iconName: 'x-circle',
      }
    case 'expired':
      return {
        label: 'Expirado',
        variant: 'outline',
        colorClass: 'text-stone-700 dark:text-stone-300',
        bgClass: 'bg-stone-50 dark:bg-stone-800/40',
        borderClass: 'border-stone-200 dark:border-stone-700',
        iconName: 'alert-circle',
      }
    case 'error':
    default:
      return {
        label: 'Erro no Envio',
        variant: 'destructive',
        colorClass: 'text-destructive',
        bgClass: 'bg-destructive/10',
        borderClass: 'border-destructive/30',
        iconName: 'alert-circle',
      }
  }
}

/**
 * Constrói a mensagem pronta para envio no WhatsApp com o link de assinatura
 */
export function buildWhatsAppSigningMessage(params: {
  clienteNome: string
  tipoDocumento: 'contrato' | 'procuracao'
  linkAssinatura: string
}): string {
  const primeiroNome = params.clienteNome.trim().split(' ')[0] || 'Cliente'
  const nomeDoc =
    params.tipoDocumento === 'procuracao'
      ? 'Procuração Energisa'
      : 'Contrato de Prestação de Serviços'

  return `Olá, ${primeiroNome}! Aqui é da Ecosolar Energy ☀️

Seu ${nomeDoc} já está pronto para assinatura digital com validade jurídica via Clicksign.

Para assinar direto do seu celular ou computador, basta acessar o link abaixo:
👉 ${params.linkAssinatura}

O processo leva menos de 1 minuto e não precisa imprimir nada. Qualquer dúvida estamos à disposição!`
}

/**
 * Constrói o link wa.me pronto para abrir com a mensagem preenchida
 */
export function buildWhatsAppSigningUrl(params: {
  telefone?: string
  clienteNome: string
  tipoDocumento: 'contrato' | 'procuracao'
  linkAssinatura: string
}): string {
  const cleanPhone = (params.telefone || '').replace(/\D/g, '')
  // Garantir DDI 55 do Brasil se tiver 10 ou 11 dígitos
  let phoneWithCountry = cleanPhone
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    phoneWithCountry = '55' + cleanPhone
  }

  const msg = buildWhatsAppSigningMessage({
    clienteNome: params.clienteNome,
    tipoDocumento: params.tipoDocumento,
    linkAssinatura: params.linkAssinatura,
  })

  return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`
}
