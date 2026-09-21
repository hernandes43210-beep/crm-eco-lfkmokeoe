import { describe, it, expect, beforeEach } from 'vitest'
import {
  normalizarTelefoneWhatsApp,
  validarApiKeyEvolution,
  extrairTextoMensagem,
  processarEventoEvolution,
  DeduplicadorEventos,
} from './evolutionApi'

describe('Evolution API - Utilitários e Validações', () => {
  describe('normalizarTelefoneWhatsApp', () => {
    it('formata telefone com pontuação padrão do Brasil (DDD + 9 dígitos) adicionando 55', () => {
      const res = normalizarTelefoneWhatsApp('(69) 99234-6989')
      expect(res).toBe('5569992346989')
    })

    it('mantém telefone que já possui DDI 55', () => {
      const res = normalizarTelefoneWhatsApp('5569992346989')
      expect(res).toBe('5569992346989')
    })

    it('remove 0 à esquerda de DDDs (ex: 069...) e inclui 55', () => {
      const res = normalizarTelefoneWhatsApp('069992346989')
      expect(res).toBe('5569992346989')
    })

    it('formata telefone fixo brasileiro (10 dígitos com DDD)', () => {
      const res = normalizarTelefoneWhatsApp('6934211020')
      expect(res).toBe('556934211020')
    })

    it('retorna string vazia para valores nulos, indefinidos ou sem dígitos', () => {
      expect(normalizarTelefoneWhatsApp(null)).toBe('')
      expect(normalizarTelefoneWhatsApp(undefined)).toBe('')
      expect(normalizarTelefoneWhatsApp('abc')).toBe('')
    })
  })

  describe('validarApiKeyEvolution', () => {
    it('valida corretamente quando o header apikey bate com a chave configurada', () => {
      const res = validarApiKeyEvolution('segredo123', 'segredo123')
      expect(res.valida).toBe(true)
      expect(res.erro).toBeUndefined()
    })

    it('rejeita com mensagem em português quando o header apikey for incorreto', () => {
      const res = validarApiKeyEvolution('chave_errada', 'segredo123')
      expect(res.valida).toBe(false)
      expect(res.erro).toBe('Não autorizado: API KEY inválida.')
    })

    it('rejeita com mensagem em português quando o header apikey estiver ausente', () => {
      const res = validarApiKeyEvolution('', 'segredo123')
      expect(res.valida).toBe(false)
      expect(res.erro).toBe('Não autorizado: Header apikey ausente na requisição.')
    })

    it('informa em português quando os segredos do servidor estiverem vazios', () => {
      const res = validarApiKeyEvolution('qualquer_chave', '')
      expect(res.valida).toBe(false)
      expect(res.erro).toContain('não configurada')
    })
  })

  describe('extrairTextoMensagem', () => {
    it('extrai texto de conversation padrão', () => {
      const text = extrairTextoMensagem({ conversation: 'Olá, gostaria de um orçamento' })
      expect(text).toBe('Olá, gostaria de um orçamento')
    })

    it('extrai texto de extendedTextMessage', () => {
      const text = extrairTextoMensagem({
        extendedTextMessage: { text: 'Quero saber sobre energia solar' },
      })
      expect(text).toBe('Quero saber sobre energia solar')
    })

    it('extrai legenda de imageMessage', () => {
      const text = extrairTextoMensagem({
        imageMessage: { caption: 'Foto da conta de luz' },
      })
      expect(text).toBe('[Imagem] Foto da conta de luz')
    })

    it('extrai título de documentMessage', () => {
      const text = extrairTextoMensagem({
        documentMessage: { title: 'fatura_energisa.pdf' },
      })
      expect(text).toBe('[Documento] fatura_energisa.pdf')
    })
  })

  describe('processarEventoEvolution & Deduplicação', () => {
    let deduplicador: DeduplicadorEventos

    beforeEach(() => {
      deduplicador = new DeduplicadorEventos()
    })

    it('processa evento MESSAGES_UPSERT com contato, texto e telefone normalizado', () => {
      const payload = {
        event: 'messages.upsert',
        data: {
          key: {
            remoteJid: '69992346989@s.whatsapp.net',
            fromMe: false,
            id: 'WA_MSG_001',
          },
          pushName: 'João da Silva',
          message: {
            conversation: 'Boa tarde!',
          },
          messageTimestamp: 1700000000,
        },
      }

      const res = processarEventoEvolution(payload)
      expect(res.tipo).toBe('MESSAGES_UPSERT')
      expect(res.dadosMensagem?.phoneNumber).toBe('5569992346989')
      expect(res.dadosMensagem?.contactName).toBe('João da Silva')
      expect(res.dadosMensagem?.text).toBe('Boa tarde!')
      expect(res.dadosMensagem?.fromMe).toBe(false)
      expect(res.dadosMensagem?.waMessageId).toBe('WA_MSG_001')
      expect(res.dadosMensagem?.isGroupOrBroadcast).toBe(false)
    })

    it('identifica e sinaliza mensagens vindas de grupos (@g.us)', () => {
      const payload = {
        event: 'messages.upsert',
        data: {
          key: {
            remoteJid: '12036302@g.us',
            fromMe: false,
            id: 'WA_GROUP_01',
          },
          message: {
            conversation: 'Mensagem de grupo',
          },
        },
      }

      const res = processarEventoEvolution(payload)
      expect(res.dadosMensagem?.isGroupOrBroadcast).toBe(true)
    })

    it('processa eventos de status CONNECTION_UPDATE', () => {
      const payload = {
        event: 'connection.update',
        data: {
          state: 'open',
        },
      }

      const res = processarEventoEvolution(payload)
      expect(res.tipo).toBe('CONNECTION_UPDATE')
      expect(res.dadosConexao?.state).toBe('open')
    })

    it('processa eventos de status de mensagem MESSAGES_UPDATE', () => {
      const payload = {
        event: 'messages.update',
        data: {
          key: {
            id: 'WA_MSG_123',
          },
          status: 'DELIVERY_ACK',
        },
      }

      const res = processarEventoEvolution(payload)
      expect(res.tipo).toBe('MESSAGES_UPDATE')
      expect(res.dadosStatus?.waMessageId).toBe('WA_MSG_123')
      expect(res.dadosStatus?.status).toBe('delivery_ack')
    })

    it('deduplica mensagens pelo ID da mensagem (evita duplo processamento)', () => {
      const msgId = 'WA_UNIQUE_KEY_999'

      expect(deduplicador.foiProcessado(msgId)).toBe(false)
      deduplicador.marcarProcessado(msgId)
      expect(deduplicador.foiProcessado(msgId)).toBe(true)
    })
  })
})
