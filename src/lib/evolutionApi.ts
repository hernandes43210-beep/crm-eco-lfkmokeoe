/**
 * Utilitários para integração com a Evolution API (WhatsApp)
 * Inclui validação de API Key, normalização de telefones brasileiros,
 * extração de dados do webhook e deduplicação de eventos.
 */

export interface EvolutionWebhookEvent {
  event?: string
  type?: string
  instance?: string
  data?: {
    key?: {
      remoteJid?: string
      fromMe?: boolean
      id?: string
      participant?: string
    }
    pushName?: string
    message?: Record<string, unknown> | string
    messageType?: string
    messageTimestamp?: number | string
    status?: string
    state?: string
    [key: string]: unknown
  }
  sender?: string
  [key: string]: unknown
}

export interface NormalizedMessagePayload {
  waMessageId: string
  phoneNumber: string
  contactName: string
  text: string
  fromMe: boolean
  timestamp: string
  isGroupOrBroadcast: boolean
}

/**
 * Normaliza número de telefone brasileiro para o formato Evolution API:
 * 55 + DDD + número (apenas dígitos).
 * Exemplos:
 * "(69) 99234-6989" -> "5569992346989"
 * "69992346989" -> "5569992346989"
 * "5569992346989" -> "5569992346989"
 * "069992346989" -> "5569992346989"
 */
export function normalizarTelefoneWhatsApp(rawPhone: string | null | undefined): string {
  if (!rawPhone || typeof rawPhone !== 'string') return ''

  // Remover tudo que não for dígito
  let digits = rawPhone.replace(/\D/g, '')
  if (!digits) return ''

  // Se começar com 0 (ex: 069...), remove o 0 inicial
  if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) {
    digits = digits.slice(1)
  }

  // Se já começar com 55 e tiver 12 ou 13 dígitos (55 + 2 dígitos DDD + 8 ou 9 dígitos)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits
  }

  // Se tiver 10 ou 11 dígitos (DDD + número), adicionar DDI 55
  if (digits.length === 10 || digits.length === 11) {
    return '55' + digits
  }

  // Se tiver 8 ou 9 dígitos (número sem DDD) ou outro formato incomum, se já tiver 55 no início mantém, senão adiciona 55
  if (digits.length >= 8 && digits.length <= 9) {
    // Número local sem DDD - não é possível deduzir com certeza, mas mantém formato
    return digits
  }

  if (!digits.startsWith('55') && digits.length > 9) {
    return '55' + digits
  }

  return digits
}

/**
 * Validação de API KEY no header do webhook.
 * Compara case-sensitive e de forma estrita o header apikey com o segredo esperado.
 */
export function validarApiKeyEvolution(
  requestApiKey: string | null | undefined,
  configuredApiKey: string | null | undefined,
): { valida: boolean; erro?: string } {
  const secretKey = (configuredApiKey || '').trim()

  // Se o segredo estiver vazio no servidor, a integração não está configurada
  if (!secretKey) {
    return {
      valida: false,
      erro: 'Integração Evolution API não configurada no servidor (EVOLUTION_API_KEY vazia).',
    }
  }

  const reqKey = (requestApiKey || '').trim()
  if (!reqKey) {
    return {
      valida: false,
      erro: 'Não autorizado: Header apikey ausente na requisição.',
    }
  }

  if (reqKey !== secretKey) {
    return {
      valida: false,
      erro: 'Não autorizado: API KEY inválida.',
    }
  }

  return { valida: true }
}

/**
 * Extrai o texto limpo da mensagem recebida em qualquer um dos formatos da Evolution API v2
 */
export function extrairTextoMensagem(messageObj: unknown): string {
  if (!messageObj) return '[Mensagem]'
  if (typeof messageObj === 'string') return messageObj.trim() || '[Mensagem]'

  if (typeof messageObj === 'object') {
    const msg = messageObj as Record<string, unknown>

    if (typeof msg.conversation === 'string' && msg.conversation.trim()) {
      return msg.conversation.trim()
    }

    if (msg.extendedTextMessage && typeof msg.extendedTextMessage === 'object') {
      const ext = msg.extendedTextMessage as Record<string, unknown>
      if (typeof ext.text === 'string' && ext.text.trim()) {
        return ext.text.trim()
      }
    }

    if (msg.imageMessage && typeof msg.imageMessage === 'object') {
      const img = msg.imageMessage as Record<string, unknown>
      const caption =
        typeof img.caption === 'string' && img.caption.trim() ? img.caption.trim() : ''
      return caption ? `[Imagem] ${caption}` : '[Imagem]'
    }

    if (msg.documentMessage && typeof msg.documentMessage === 'object') {
      const doc = msg.documentMessage as Record<string, unknown>
      const title = typeof doc.title === 'string' && doc.title.trim() ? doc.title.trim() : ''
      return title ? `[Documento] ${title}` : '[Documento]'
    }

    if (msg.audioMessage) return '[Mensagem de Áudio]'
    if (msg.videoMessage) return '[Vídeo]'
    if (msg.contactMessage) return '[Contato compartilhado]'
    if (msg.locationMessage) return '[Localização compartilhada]'
  }

  return '[Mensagem]'
}

/**
 * Processa o payload de evento do webhook Evolution API
 */
export function processarEventoEvolution(body: EvolutionWebhookEvent): {
  tipo: 'MESSAGES_UPSERT' | 'CONNECTION_UPDATE' | 'MESSAGES_UPDATE' | 'DESCONHECIDO'
  dadosMensagem?: NormalizedMessagePayload
  dadosConexao?: { state: string }
  dadosStatus?: { waMessageId: string; status: string }
} {
  const eventRaw = (body.event || body.type || '').toUpperCase()

  if (eventRaw.includes('CONNECTION') || eventRaw === 'CONNECTION_UPDATE') {
    const data = body.data || {}
    const state = (typeof data.state === 'string' ? data.state : '').toLowerCase()
    return {
      tipo: 'CONNECTION_UPDATE',
      dadosConexao: { state },
    }
  }

  if (
    eventRaw.includes('MESSAGES_UPDATE') ||
    eventRaw.includes('MESSAGE_STATUS') ||
    eventRaw === 'MESSAGES_UPDATE' ||
    eventRaw === 'MESSAGES.UPDATE'
  ) {
    const data = body.data || {}
    const key = data.key || {}
    const waMessageId = key.id || (typeof data.id === 'string' ? data.id : '')
    const status = (typeof data.status === 'string' ? data.status : '').toLowerCase()
    return {
      tipo: 'MESSAGES_UPDATE',
      dadosStatus: { waMessageId, status },
    }
  }

  if (
    eventRaw === 'MESSAGES_UPSERT' ||
    eventRaw === 'MESSAGES.UPSERT' ||
    eventRaw.includes('UPSERT') ||
    (!eventRaw && body.data && body.data.key)
  ) {
    const data = body.data || {}
    const key = data.key || {}
    const waMessageId = key.id || ''
    const fromMe = !!key.fromMe

    const remoteJid = key.remoteJid || (typeof body.sender === 'string' ? body.sender : '') || ''
    const isGroupOrBroadcast =
      remoteJid.includes('@g.us') ||
      remoteJid.includes('status@broadcast') ||
      remoteJid.includes('@broadcast')

    const rawPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '')
    const phoneNumber = normalizarTelefoneWhatsApp(rawPhone)

    const text = extrairTextoMensagem(data.message)
    const contactName = (data.pushName || '').trim() || 'Contato WhatsApp'

    let timestamp = new Date().toISOString()
    if (data.messageTimestamp) {
      const tsNum = Number(data.messageTimestamp)
      if (!isNaN(tsNum)) {
        // Se for em segundos (Unix padrão), converter para ms
        const ms = tsNum < 10000000000 ? tsNum * 1000 : tsNum
        timestamp = new Date(ms).toISOString()
      }
    }

    return {
      tipo: 'MESSAGES_UPSERT',
      dadosMensagem: {
        waMessageId,
        phoneNumber,
        contactName,
        text,
        fromMe,
        timestamp,
        isGroupOrBroadcast,
      },
    }
  }

  return { tipo: 'DESCONHECIDO' }
}

/**
 * Estrutura para deduplicação em memória (auxiliar de testes / camada aplicação)
 */
export class DeduplicadorEventos {
  private idsProcessados = new Set<string>()

  foiProcessado(id: string): boolean {
    if (!id) return false
    return this.idsProcessados.has(id)
  }

  marcarProcessado(id: string): void {
    if (id) {
      this.idsProcessados.add(id)
    }
  }

  limpar(): void {
    this.idsProcessados.clear()
  }
}
