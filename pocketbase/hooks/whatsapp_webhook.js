// POST /backend/v1/whatsapp/webhook
// Webhook público para receber eventos da Evolution API v2 (ex: MESSAGES_UPSERT, CONNECTION_UPDATE)
// Auto-cria lead no topo do funil para números desconhecidos e salva mensagens com deduplicação por wa_message_id
routerAdd('POST', '/backend/v1/whatsapp/webhook', (e) => {
  const body = e.requestInfo().body || {}
  const event = body.event || body.type || ''

  // 1. Tratar atualização de conexão se recebida via webhook
  if (event === 'CONNECTION_UPDATE') {
    const data = body.data || {}
    const state = data.state || ''
    try {
      const list = $app.findRecordsByFilter('whatsapp_settings', '', '-created', 1, 0)
      if (list && list.length > 0) {
        const settings = list[0]
        const newStatus =
          state === 'open' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected'
        settings.set('connection_status', newStatus)
        $app.save(settings)
      }
    } catch (_) {}
    return e.json(200, { received: true, event: event })
  }

  // 2. Tratar mensagens: MESSAGES_UPSERT ou variações
  if (event === 'MESSAGES_UPSERT' || event === 'messages.upsert' || body.data) {
    const data = body.data || {}
    const key = data.key || {}
    const fromMe = !!key.fromMe

    // Extrair ID único da mensagem do WhatsApp
    const waMsgId = key.id || ''
    if (!waMsgId) {
      return e.json(200, { received: true, ignored: 'no_id' })
    }

    // Deduplicação: verificar se a mensagem já existe no banco
    try {
      const existing = $app.findFirstRecordByData('whatsapp_messages', 'wa_message_id', waMsgId)
      if (existing) {
        return e.json(200, { received: true, deduplicated: true, id: waMsgId })
      }
    } catch (_) {
      // Mensagem não existe, prosseguir
    }

    // Extrair número do remetente
    let remoteJid = key.remoteJid || data.remoteJid || body.sender || ''
    // Ignorar mensagens de grupos ou broadcast se terminarem em @g.us ou status@broadcast
    if (remoteJid.indexOf('@g.us') !== -1 || remoteJid.indexOf('status@broadcast') !== -1) {
      return e.json(200, { received: true, ignored: 'group_or_status' })
    }

    let phoneNumber = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '')
    if (!phoneNumber) {
      return e.json(200, { received: true, ignored: 'no_phone' })
    }

    // Extrair conteúdo de texto da mensagem
    const messageObj = data.message || {}
    let text = ''
    if (messageObj.conversation) {
      text = messageObj.conversation
    } else if (messageObj.extendedTextMessage && messageObj.extendedTextMessage.text) {
      text = messageObj.extendedTextMessage.text
    } else if (messageObj.imageMessage && messageObj.imageMessage.caption) {
      text = '[Imagem] ' + messageObj.imageMessage.caption
    } else if (messageObj.imageMessage) {
      text = '[Imagem enviada]'
    } else if (messageObj.documentMessage && messageObj.documentMessage.title) {
      text = '[Documento] ' + messageObj.documentMessage.title
    } else if (messageObj.documentMessage) {
      text = '[Documento anexado]'
    } else if (messageObj.audioMessage) {
      text = '[Mensagem de Áudio]'
    } else if (messageObj.videoMessage) {
      text = '[Vídeo]'
    } else if (messageObj.contactMessage) {
      text = '[Contato compartilhado]'
    } else if (messageObj.locationMessage) {
      text = '[Localização compartilhada]'
    } else if (typeof data.message === 'string') {
      text = data.message
    } else {
      text = '[Mensagem]'
    }

    const pushName = data.pushName || ''
    const direction = fromMe ? 'out' : 'in'

    // Buscar lead associado pelo telefone (últimos 8 dígitos para cobrir variações de DDD e nono dígito)
    let leadRecord = null
    const searchPart = phoneNumber.length >= 8 ? phoneNumber.slice(-8) : phoneNumber
    try {
      const foundLeads = $app.findRecordsByFilter(
        'leads',
        "telefone ~ '" + searchPart + "'",
        '-created',
        1,
        0,
      )
      if (foundLeads && foundLeads.length > 0) {
        leadRecord = foundLeads[0]
      }
    } catch (_) {}

    // SE NÃO EXISTE LEAD E FOR MENSAGEM RECEBIDA (direction === 'in'):
    // Auto-criar lead no TOPO do funil ("Novo")
    if (!leadRecord && !fromMe) {
      try {
        const leadsCol = $app.findCollectionByNameOrId('leads')
        const newLead = new Record(leadsCol)

        // Nome do lead derivado do pushName ou do telefone
        let leadNome = pushName ? pushName.trim() : ''
        if (!leadNome) {
          leadNome = 'Lead WhatsApp (' + phoneNumber + ')'
        }

        // Email padrão único se não houver
        const cleanPhone = phoneNumber
        const autoEmail = 'wa.' + cleanPhone + '@leadsolar.crm'

        // Verificar se este email gerado já existe (defensivo)
        let finalEmail = autoEmail
        try {
          const emailExists = $app.findFirstRecordByData('leads', 'email', finalEmail)
          if (emailExists) {
            finalEmail =
              'wa.' + cleanPhone + '.' + Math.floor(Math.random() * 1000) + '@leadsolar.crm'
          }
        } catch (_) {}

        // Obter proprietário padrão: primeiro usuário Admin ou Vendedor cadastrado
        let ownerId = ''
        try {
          const users = $app.findRecordsByFilter('_pb_users_auth_', '', '+created', 1, 0)
          if (users && users.length > 0) {
            ownerId = users[0].id
          }
        } catch (_) {}

        newLead.set('nome', leadNome)
        newLead.set('email', finalEmail)
        newLead.set('telefone', phoneNumber)
        newLead.set('origem', 'Redes Sociais')
        newLead.set('consumo_mensal_kwh', 350)
        newLead.set('status', 'Novo')
        newLead.set('sla_dias', 7)
        if (ownerId) {
          newLead.set('proprietario', ownerId)
        }

        const hist = [
          {
            data: new Date().toISOString(),
            tipo: 'criacao',
            descricao:
              "Lead auto-criado via WhatsApp (Evolution API) a partir de mensagem de '" +
              (pushName || phoneNumber) +
              "'.",
          },
          {
            data: new Date().toISOString(),
            tipo: 'nota',
            descricao:
              'Primeira mensagem recebida: "' +
              (text.length > 100 ? text.substring(0, 100) + '...' : text) +
              '"',
          },
        ]
        newLead.set('historico', hist)

        $app.save(newLead)
        leadRecord = newLead
      } catch (createLeadErr) {
        // Falha ao auto-criar lead não deve impedir de salvar a mensagem
      }
    } else if (leadRecord && !fromMe) {
      // Se lead já existe e mensagem veio dele, registrar no histórico do lead
      try {
        let hist = leadRecord.get('historico')
        if (!hist || !Array.isArray(hist)) {
          hist = []
        }
        hist.push({
          data: new Date().toISOString(),
          tipo: 'nota',
          descricao:
            'Mensagem recebida via WhatsApp de ' +
            (pushName || phoneNumber) +
            ': "' +
            (text.length > 80 ? text.substring(0, 80) + '...' : text) +
            '"',
        })
        leadRecord.set('historico', hist)
        $app.save(leadRecord)
      } catch (_) {}
    }

    // Salvar mensagem no whatsapp_messages
    try {
      const msgCol = $app.findCollectionByNameOrId('whatsapp_messages')
      const msg = new Record(msgCol)
      if (leadRecord) {
        msg.set('lead', leadRecord.id)
      }
      msg.set('phone_number', phoneNumber)
      msg.set('sender_name', pushName || (fromMe ? 'CRM' : phoneNumber))
      msg.set('direction', direction)
      msg.set('content', text)
      msg.set('wa_message_id', waMsgId)
      msg.set('status', fromMe ? 'sent' : 'received')
      msg.set('unread', !fromMe)

      $app.save(msg)

      return e.json(200, {
        success: true,
        message_id: msg.id,
        lead_id: leadRecord ? leadRecord.id : null,
      })
    } catch (saveErr) {
      return e.json(500, { error: 'Erro ao salvar mensagem: ' + saveErr.message })
    }
  }

  return e.json(200, { received: true, ignored: 'unhandled_event' })
})
