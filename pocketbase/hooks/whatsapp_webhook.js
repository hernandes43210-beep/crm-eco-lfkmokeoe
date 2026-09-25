// POST /backend/v1/whatsapp/webhook
// Webhook público para receber eventos da Evolution API v2 (MESSAGES_UPSERT, CONNECTION_UPDATE, MESSAGES_UPDATE/MESSAGE_STATUS)
// Validação por header 'apikey' contra o segredo EVOLUTION_API_KEY ou configuração whatsapp_settings.
// Auto-cria lead no topo do funil para números desconhecidos e salva mensagens com deduplicação por wa_message_id.

routerAdd('POST', '/backend/v1/whatsapp/webhook', (e) => {
  // 1. Obter a API KEY esperada do ambiente ($os.getenv) ou da coleção whatsapp_settings
  let expectedApiKey = ''
  try {
    expectedApiKey = ($os.getenv('EVOLUTION_API_KEY') || '').trim()
  } catch (_) {}

  if (!expectedApiKey) {
    try {
      const list = $app.findRecordsByFilter('whatsapp_settings', '', '-created', 1, 0)
      if (list && list.length > 0) {
        expectedApiKey = (list[0].getString('api_key') || '').trim()
      }
    } catch (_) {}
  }

  // Se a chave não estiver configurada no servidor, responder 200 rápido com flag explicativa em português
  if (!expectedApiKey || expectedApiKey === 'placeholder_api_key') {
    console.warn(
      '[whatsapp_webhook] Aviso: EVOLUTION_API_KEY não configurada no servidor. Requisição de webhook aceita em modo degradado.',
    )
    return e.json(200, {
      received: true,
      integracao_nao_configurada: true,
      aviso: 'Integração Evolution API não configurada no servidor. Configure EVOLUTION_API_KEY.',
    })
  }

  // 2. Validação do header apikey
  const headers = e.requestInfo().headers || {}
  let reqApiKey =
    headers['apikey'] || headers['ApiKey'] || headers['APIKEY'] || headers['api_key'] || ''
  if (!reqApiKey) {
    try {
      reqApiKey = e.request.header.get('apikey') || e.request.header.get('api_key') || ''
    } catch (_) {}
  }
  reqApiKey = (reqApiKey || '').trim()

  if (!reqApiKey || reqApiKey !== expectedApiKey) {
    console.warn(
      '[whatsapp_webhook] Tentativa não autorizada de acesso ao webhook: API KEY inválida ou ausente.',
    )
    return e.json(401, {
      error: 'Não autorizado: API KEY inválida.',
    })
  }

  const body = e.requestInfo().body || {}
  const event = (body.event || body.type || '').toUpperCase()

  // 3. Tratar status de conexão (CONNECTION_UPDATE)
  if (event.indexOf('CONNECTION') !== -1 || event === 'CONNECTION_UPDATE') {
    const data = body.data || {}
    const state = (typeof data.state === 'string' ? data.state : '').toLowerCase()
    try {
      const list = $app.findRecordsByFilter('whatsapp_settings', '', '-created', 1, 0)
      if (list && list.length > 0) {
        const settings = list[0]
        const newStatus =
          state === 'open' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected'
        settings.set('connection_status', newStatus)
        $app.save(settings)
        console.log('[whatsapp_webhook] Status de conexão atualizado para: ' + newStatus)
      }
    } catch (connErr) {
      console.error('[whatsapp_webhook] Erro ao atualizar status de conexão:', connErr)
    }
    return e.json(200, { received: true, event: 'CONNECTION_UPDATE', state: state })
  }

  // 4. Tratar atualização de status de envio da mensagem (MESSAGES_UPDATE ou MESSAGE_STATUS)
  if (
    event.indexOf('MESSAGES_UPDATE') !== -1 ||
    event.indexOf('MESSAGE_STATUS') !== -1 ||
    event === 'MESSAGES.UPDATE'
  ) {
    const data = body.data || {}
    const key = data.key || {}
    const waMsgId = key.id || (typeof data.id === 'string' ? data.id : '')
    const statusRaw = (typeof data.status === 'string' ? data.status : '').toLowerCase()

    if (waMsgId) {
      try {
        const existing = $app.findFirstRecordByData('whatsapp_messages', 'wa_message_id', waMsgId)
        if (existing) {
          let crmStatus = existing.getString('status')
          if (statusRaw === 'delivery_ack' || statusRaw === 'delivered') {
            crmStatus = 'sent'
          } else if (statusRaw === 'read' || statusRaw === 'played') {
            crmStatus = 'read'
          } else if (statusRaw === 'failed' || statusRaw === 'error') {
            crmStatus = 'error'
          }
          existing.set('status', crmStatus)
          $app.save(existing)
        }
      } catch (_) {}
    }
    return e.json(200, { received: true, event: 'MESSAGES_UPDATE' })
  }

  // 5. Tratar mensagens recebidas ou enviadas: MESSAGES_UPSERT
  if (
    event === 'MESSAGES_UPSERT' ||
    event === 'MESSAGES.UPSERT' ||
    event.indexOf('UPSERT') !== -1 ||
    (body.data && body.data.key)
  ) {
    const data = body.data || {}
    const key = data.key || {}
    const fromMe = !!key.fromMe

    // Extrair ID único da mensagem do WhatsApp para deduplicação
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

    // Extrair remoteJid
    let remoteJid =
      key.remoteJid || data.remoteJid || (typeof body.sender === 'string' ? body.sender : '') || ''
    // Ignorar mensagens de grupos ou broadcast se terminarem em @g.us ou status@broadcast
    if (
      remoteJid.indexOf('@g.us') !== -1 ||
      remoteJid.indexOf('status@broadcast') !== -1 ||
      remoteJid.indexOf('@broadcast') !== -1
    ) {
      return e.json(200, { received: true, ignored: 'group_or_status' })
    }

    let rawPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '')
    if (!rawPhone) {
      return e.json(200, { received: true, ignored: 'no_phone' })
    }

    // Normalizar telefone com DDI 55 (padrão Brasil)
    let phoneNumber = rawPhone
    if (phoneNumber.startsWith('0') && (phoneNumber.length === 11 || phoneNumber.length === 12)) {
      phoneNumber = phoneNumber.slice(1)
    }
    if (!phoneNumber.startsWith('55') && (phoneNumber.length === 10 || phoneNumber.length === 11)) {
      phoneNumber = '55' + phoneNumber
    }

    // Extrair conteúdo textual da mensagem
    const messageObj = data.message || {}
    let text = ''
    if (typeof messageObj === 'string') {
      text = messageObj
    } else if (typeof messageObj === 'object') {
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
      } else {
        text = '[Mensagem]'
      }
    } else {
      text = '[Mensagem]'
    }

    const pushName = (data.pushName || '').trim()
    const direction = fromMe ? 'out' : 'in'

    // Buscar lead existente pelo telefone (comparando dígitos)
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

        let leadNome = pushName || ''
        if (!leadNome) {
          leadNome = 'Contato WhatsApp (' + phoneNumber + ')'
        }

        // Email padrão único se não houver
        const autoEmail = 'wa.' + phoneNumber + '@leadsolar.crm'
        let finalEmail = autoEmail
        try {
          const emailExists = $app.findFirstRecordByData('leads', 'email', finalEmail)
          if (emailExists) {
            finalEmail =
              'wa.' + phoneNumber + '.' + Math.floor(Math.random() * 1000) + '@leadsolar.crm'
          }
        } catch (_) {}

        // Obter proprietário padrão: primeiro usuário cadastrado
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
              'Lead cadastrado automaticamente via mensagem do WhatsApp de ' +
              (pushName || phoneNumber) +
              '.',
          },
          {
            data: new Date().toISOString(),
            tipo: 'nota',
            descricao:
              'Primeira mensagem recebida: "' +
              (text.length > 120 ? text.substring(0, 120) + '...' : text) +
              '"',
          },
        ]
        newLead.set('historico', JSON.stringify(hist))

        // Salvar lead (o hook onRecordAfterCreateSuccess de notificação por cidade dispara aqui se tiver cidade)
        $app.save(newLead)
        leadRecord = newLead
      } catch (createLeadErr) {
        console.error('[whatsapp_webhook] Erro ao auto-criar lead:', createLeadErr)
      }
    } else if (leadRecord && !fromMe) {
      // Se lead já existe e mensagem veio dele, registrar no histórico do lead
      try {
        let rawHist = leadRecord.get('historico')
        let hist = []
        if (rawHist) {
          if (typeof rawHist === 'string') {
            try {
              hist = JSON.parse(rawHist)
            } catch (_) {
              hist = []
            }
          } else if (Array.isArray(rawHist)) {
            hist = rawHist
          }
        }
        hist.push({
          data: new Date().toISOString(),
          tipo: 'nota',
          descricao:
            'Mensagem recebida via WhatsApp de ' +
            (pushName || phoneNumber) +
            ': "' +
            (text.length > 120 ? text.substring(0, 120) + '...' : text) +
            '"',
        })
        leadRecord.set('historico', JSON.stringify(hist))
        $app.save(leadRecord)
      } catch (histErr) {
        console.error('[whatsapp_webhook] Erro ao atualizar histórico do lead:', histErr)
      }
    }

    // Salvar mensagem na coleção whatsapp_messages
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

      // 6. Encaminhar para o agente nativo "Amanda" se for mensagem recebida (direction === 'in')
      if (!fromMe && leadRecord) {
        try {
          const pbUrl = $os.getenv('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'
          $http.send({
            url: pbUrl + '/backend/v1/amanda/process-lead',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lead_id: leadRecord.id,
              message: text,
              first_contact: false,
            }),
            timeout: 25,
          })
        } catch (amandaErr) {
          console.warn('[whatsapp_webhook] Falha ao acionar Amanda SDR:', amandaErr)
        }
      }

      return e.json(200, {
        success: true,
        message_id: msg.id,
        lead_id: leadRecord ? leadRecord.id : null,
      })
    } catch (saveErr) {
      console.error('[whatsapp_webhook] Erro ao salvar registro de mensagem:', saveErr)
      return e.json(500, { error: 'Erro ao salvar mensagem: ' + saveErr.message })
    }
  }

  return e.json(200, { received: true, ignored: 'unhandled_event' })
})
