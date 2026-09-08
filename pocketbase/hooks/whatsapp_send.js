// POST /backend/v1/whatsapp/send
// Envia mensagem via Evolution API v2 (POST /message/sendText/{instance}) e salva no PocketBase
routerAdd(
  'POST',
  '/backend/v1/whatsapp/send',
  (e) => {
    const body = e.requestInfo().body || {}
    const number = (body.number || '').trim().replace(/\D/g, '')
    const text = (body.text || '').trim()
    const leadId = (body.lead_id || '').trim()

    if (!number) {
      return e.json(400, { error: 'Número de telefone é obrigatório.' })
    }
    if (!text) {
      return e.json(400, { error: 'Mensagem não pode ser vazia.' })
    }

    let settings = null
    try {
      const list = $app.findRecordsByFilter('whatsapp_settings', '', '-created', 1, 0)
      if (list && list.length > 0) {
        settings = list[0]
      }
    } catch (err) {
      return e.json(500, { error: 'Erro ao carregar configurações: ' + err.message })
    }

    if (!settings || !settings.getString('api_url') || !settings.getString('api_key')) {
      return e.json(400, {
        error: 'WhatsApp não está configurado. Conecte sua Evolution API primeiro.',
      })
    }

    let apiUrl = settings.getString('api_url').trim()
    if (apiUrl.endsWith('/')) {
      apiUrl = apiUrl.slice(0, -1)
    }
    const apiKey = settings.getString('api_key').trim()
    const instanceName = settings.getString('instance_name').trim() || 'solarcrm'

    // Chamar Evolution API v2 para enviar texto
    let evoRes = null
    try {
      evoRes = $http.send({
        url: apiUrl + '/message/sendText/' + encodeURIComponent(instanceName),
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: number,
          text: text,
        }),
        timeout: 20,
      })
    } catch (err) {
      return e.json(502, { error: 'Falha ao contatar Evolution API: ' + err.message })
    }

    if (evoRes.statusCode < 200 || evoRes.statusCode >= 300) {
      const errMsg =
        evoRes.json && evoRes.json.response
          ? JSON.stringify(evoRes.json.response)
          : evoRes.raw || 'Erro ao enviar mensagem via Evolution API'
      return e.json(evoRes.statusCode || 500, { error: errMsg })
    }

    // Extrair ID da mensagem gerado pelo WhatsApp/Evolution API
    let waMsgId = ''
    if (evoRes.json && evoRes.json.key && evoRes.json.key.id) {
      waMsgId = evoRes.json.key.id
    } else {
      waMsgId = 'out_' + new Date().getTime() + '_' + Math.random().toString(36).substring(2, 9)
    }

    // Resolver Lead se não fornecido
    let resolvedLeadId = leadId
    if (!resolvedLeadId) {
      try {
        const cleanNum = number.slice(-8)
        const foundLeads = $app.findRecordsByFilter(
          'leads',
          "telefone ~ '" + cleanNum + "'",
          '-created',
          1,
          0,
        )
        if (foundLeads && foundLeads.length > 0) {
          resolvedLeadId = foundLeads[0].id
        }
      } catch (_) {}
    }

    // Salvar mensagem enviada na coleção whatsapp_messages
    const msgCol = $app.findCollectionByNameOrId('whatsapp_messages')
    const record = new Record(msgCol)
    if (resolvedLeadId) {
      record.set('lead', resolvedLeadId)
    }
    record.set('phone_number', number)
    record.set('sender_name', 'CRM (Vendedor)')
    record.set('direction', 'out')
    record.set('content', text)
    record.set('wa_message_id', waMsgId)
    record.set('status', 'sent')
    record.set('unread', false)

    try {
      $app.save(record)
    } catch (saveErr) {
      // Log de erro silencioso para não quebrar retorno de envio
    }

    // Se houver lead associado, atualizar histórico do lead
    if (resolvedLeadId) {
      try {
        const leadRecord = $app.findCollectionByNameOrId('leads')
          ? $app.findFirstRecordByData('leads', 'id', resolvedLeadId)
          : null
        if (leadRecord) {
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
              'Mensagem enviada via WhatsApp para ' +
              number +
              ': "' +
              (text.length > 80 ? text.substring(0, 80) + '...' : text) +
              '"',
          })
          leadRecord.set('historico', JSON.stringify(hist))
          $app.save(leadRecord)
        }
      } catch (_) {}
    }

    return e.json(200, {
      success: true,
      message: 'Mensagem enviada com sucesso!',
      wa_message_id: waMsgId,
      record_id: record.id,
    })
  },
  $apis.requireAuth(),
)
