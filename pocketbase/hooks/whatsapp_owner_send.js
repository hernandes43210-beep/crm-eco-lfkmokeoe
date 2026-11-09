// POST /backend/v1/whatsapp/owner-send
// Envia mensagem de texto pela CONTA DE WHATSAPP DO DONO do app via Skip
// Connectors ($connectors.executeAsOwner). Sem Evolution API, sem QR code.
// Corpo: { telefone: "55...", texto: "...", lead?: "id", phone_number_id?: "..." }
// Toda a lógica fica inline no callback (o JSVM do PocketBase não compartilha
// declarações de topo com os callbacks).
routerAdd(
  'POST',
  '/backend/v1/whatsapp/owner-send',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }

    let corpo = {}
    try {
      corpo = e.request.body() || {}
    } catch (_) {
      corpo = {}
    }

    const telefoneBruto = typeof corpo.telefone === 'string' ? corpo.telefone : ''
    const texto = typeof corpo.texto === 'string' ? corpo.texto : ''
    const leadId = typeof corpo.lead === 'string' ? corpo.lead : ''
    const phoneNumberIdInformado =
      typeof corpo.phone_number_id === 'string' ? corpo.phone_number_id : ''

    if (!telefoneBruto.trim()) {
      return e.json(400, { error: 'Informe o número de destino' })
    }
    if (!texto.trim()) {
      return e.json(400, { error: 'Escreva a mensagem' })
    }

    // Normaliza um telefone informado para o formato internacional sem símbolos.
    // Regras do Brasil: 10-11 dígitos (com DDD) => prefixa 55; 12-13 com 55 => mantém.
    let digits = String(telefoneBruto || '').replace(/\D/g, '')
    if (digits.length >= 10 && digits.length <= 11) {
      digits = '55' + digits
    }
    if (digits.length < 10 || digits.length > 13) {
      return e.json(400, { error: 'Número de telefone inválido (informe DDD + número)' })
    }
    const telefone = digits

    // Descobre o phone_number_id da conta do dono (ou usa o informado pelo frontend)
    let phoneNumberId = ''
    if (phoneNumberIdInformado) {
      phoneNumberId = phoneNumberIdInformado.trim()
    } else {
      let execNumeros
      try {
        execNumeros = $connectors.executeAsOwner('whatsapp', 'WHATSAPP_GET_PHONE_NUMBERS', {
          limit: 10,
        })
      } catch (err) {
        return e.json(502, {
          error:
            'Não foi possível usar sua conta de WhatsApp: ' +
            (err && err.message ? err.message : String(err)),
        })
      }
      if (!execNumeros || !execNumeros.successful) {
        return e.json(502, {
          error:
            'WhatsApp do titular não conectado: ' +
            (execNumeros && execNumeros.error
              ? execNumeros.error
              : 'verifique os Conectores no painel Skip'),
        })
      }
      let numeros = []
      const d = execNumeros.data
      if (Array.isArray(d)) numeros = d
      else if (d && Array.isArray(d.data)) numeros = d.data
      else if (d && Array.isArray(d.phone_numbers)) numeros = d.phone_numbers
      for (let i = 0; i < numeros.length; i++) {
        const n = numeros[i]
        if (n && typeof n === 'object' && typeof n.id === 'string' && n.id) {
          phoneNumberId = n.id
          break
        }
      }
      if (!phoneNumberId) {
        return e.json(502, {
          error: 'Nenhum número de WhatsApp encontrado na conta conectada',
        })
      }
    }

    // Envio real pela conta do dono (Skip Connectors, modo owner)
    let exec
    try {
      exec = $connectors.executeAsOwner('whatsapp', 'WHATSAPP_SEND_MESSAGE', {
        text: texto,
        to_number: telefone,
        phone_number_id: phoneNumberId,
      })
    } catch (err) {
      return e.json(502, {
        error:
          'Falha ao enviar pela sua conta de WhatsApp: ' +
          (err && err.message ? err.message : String(err)),
      })
    }

    if (!exec || !exec.successful) {
      return e.json(502, {
        error:
          'A conta de WhatsApp recusou o envio: ' +
          (exec && exec.error
            ? exec.error
            : 'verifique se o número é WhatsApp e já conversou com sua conta nas últimas 24h'),
      })
    }

    const dados = exec.data && typeof exec.data === 'object' ? exec.data : {}
    const mensagens = Array.isArray(dados.messages) ? dados.messages : []
    const primeira = mensagens.length > 0 && typeof mensagens[0] === 'object' ? mensagens[0] : {}
    const waMessageId = typeof primeira.id === 'string' ? primeira.id : ''

    // Registro opcional do envio (coleção whatsapp_messages)
    let registroId = ''
    if (leadId) {
      try {
        const registro = new Record($app.findCollectionByNameOrId('whatsapp_messages'))
        registro.set('lead', leadId)
        registro.set('phone_number', telefone)
        registro.set('direction', 'out')
        registro.set('content', texto)
        registro.set('status', 'sent')
        registro.set('unread', false)
        if (waMessageId) registro.set('wa_message_id', waMessageId)
        $app.save(registro)
        registroId = registro.id
      } catch (err) {
        // Envio OK, só o registro falhou: não falha a resposta, mas sinaliza
        console.log('[whatsapp_owner_send] falha ao registrar mensagem: ' + err.message)
      }
    }

    return e.json(200, {
      ok: true,
      wa_message_id: waMessageId,
      registro_id: registroId,
      para: telefone,
      phone_number_id: phoneNumberId,
    })
  },
  $apis.requireAuth(),
)
