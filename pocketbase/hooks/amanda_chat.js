// Hook POST /backend/v1/amanda/process-lead
// Permite invocar a Amanda para primeiro contato ou resposta de lead, seja pelo CRM ou pelo webhook
routerAdd('POST', '/backend/v1/amanda/process-lead', (e) => {
  const body = e.requestInfo().body || {}
  const leadId = (body.lead_id || '').trim()
  const incomingMessage = (body.message || '').trim()
  const isFirstContact = !!body.first_contact

  if (!leadId) {
    return e.json(400, { success: false, error: 'lead_id é obrigatório.' })
  }

  let lead = null
  try {
    lead = $app.findFirstRecordByData('leads', 'id', leadId)
  } catch (_) {
    return e.json(404, { success: false, error: 'Lead não encontrado.' })
  }

  // 1. Obter usuário de serviço para a Amanda
  let userId = ''
  try {
    const sUser = $app.findAuthRecordByEmail('_pb_users_auth_', 'amanda.sdr@ecosolar.crm')
    if (sUser) userId = sUser.id
  } catch (_) {}
  if (!userId) {
    try {
      const anyUser = $app.findRecordsByFilter('_pb_users_auth_', '', '+created', 1, 0)
      if (anyUser && anyUser.length > 0) userId = anyUser[0].id
    } catch (_) {}
  }
  if (!userId) {
    return e.json(500, {
      success: false,
      error: 'Usuário do sistema não encontrado para vincular ao agente.',
    })
  }

  // 2. Verificar se o lead já foi qualificado pela IA
  const jaQualificada = lead.getBool('qualificada_ia')
  if (jaQualificada && !incomingMessage) {
    return e.json(200, {
      success: true,
      mensagem: 'Lead já qualificado pela Amanda. Primeiro contato já realizado.',
      qualificada: true,
    })
  }

  // 3. Obter ou criar conversation_id
  let conversationId = lead.getString('amanda_conversation_id') || null

  // 4. Montar a mensagem de entrada para o agente Amanda
  let promptToSend = incomingMessage
  const leadNome = lead.getString('nome') || 'Cliente'
  const leadCidade = lead.getString('cidade') || ''
  const leadTelefone = lead.getString('telefone') || ''
  const leadEmail = lead.getString('email') || ''

  if (isFirstContact || !promptToSend) {
    promptToSend =
      '[SISTEMA: Este é um lead novo acabou de entrar no CRM. Nome: ' +
      leadNome +
      (leadCidade ? ', Cidade: ' + leadCidade : '') +
      '. Inicie o contato fazendo sua apresentação como Amanda da Ecosolar e fazendo UMA pergunta curta e educada para iniciar a qualificação (perguntando o consumo atual ou valor médio da conta de luz). Lembre-se: resposta curta, no máximo 2 frases, tom humano brasileiro, sem valores/preços].'
  } else {
    promptToSend =
      '[MENSAGEM DO CLIENTE ' +
      leadNome +
      ']: ' +
      incomingMessage +
      '\n[SISTEMA: Avalie a mensagem do cliente. Responda com simpatia, brevidade extrema e faça a próxima pergunta necessária para coletar os 3 dados (consumo/conta, pretensão de aumento de consumo, local de instalação: cidade/bairro e tipo de imóvel). Se o cliente tiver acabado de fornecer TODOS os 3 dados necessários, inclua na sua resposta a tag exata [LEAD_QUALIFICADO] e finalize com gentileza informando que o consultor solar entrará em contato. Nunca forneça preços ou descontos].'
  }

  // 5. Invocar o agente nativo 'amanda'
  let agentResponse = ''
  let newConvId = conversationId

  try {
    const res = $ai.agent('amanda').chat({
      user_id: userId,
      conversation_id: conversationId,
      message: promptToSend,
    })

    agentResponse = (res.content || '').trim()
    newConvId = res.conversation_id || newConvId
  } catch (aiErr) {
    console.error('[amanda_process_lead] Erro ao conversar com agente nativo amanda:', aiErr)
    return e.json(500, {
      success: false,
      error: 'Erro na resposta da Amanda (IA): ' + (aiErr.message || String(aiErr)),
    })
  }

  // 6. Verificar se o agente detectou a qualificação
  let leadFoiQualificado = false
  let cleanResponseText = agentResponse
  if (cleanResponseText.indexOf('[LEAD_QUALIFICADO]') !== -1) {
    leadFoiQualificado = true
    cleanResponseText = cleanResponseText.replace(/\[LEAD_QUALIFICADO\]/g, '').trim()
  }

  // Fallback heurístico: se a mensagem do cliente tiver informações completas e a conversa já teve turnos
  const msgLower = (incomingMessage || '').toLowerCase()
  const contemConsumo =
    msgLower.indexOf('kwh') !== -1 ||
    msgLower.indexOf('conta') !== -1 ||
    msgLower.indexOf('r$') !== -1 ||
    /\d{2,4}/.test(msgLower)
  const contemAumento =
    msgLower.indexOf('aumentar') !== -1 ||
    msgLower.indexOf('ar-condicionado') !== -1 ||
    msgLower.indexOf('ar condicionado') !== -1 ||
    msgLower.indexOf('manter') !== -1 ||
    msgLower.indexOf('sim') !== -1 ||
    msgLower.indexOf('pretendo') !== -1 ||
    msgLower.indexOf('não') !== -1 ||
    msgLower.indexOf('nao') !== -1
  const contemLocal =
    msgLower.indexOf('casa') !== -1 ||
    msgLower.indexOf('comercio') !== -1 ||
    msgLower.indexOf('comércio') !== -1 ||
    msgLower.indexOf('rural') !== -1 ||
    msgLower.indexOf('sitio') !== -1 ||
    msgLower.indexOf('sítio') !== -1 ||
    msgLower.indexOf('bairro') !== -1 ||
    leadCidade !== ''

  if (contemConsumo && contemAumento && contemLocal) {
    leadFoiQualificado = true
  }

  // 7. Envio por WhatsApp (se configurado e telefone válido)
  let waEnviado = false
  let waErro = ''
  let cleanPhone = leadTelefone.replace(/\D/g, '')
  if (cleanPhone.startsWith('0') && (cleanPhone.length === 11 || cleanPhone.length === 12)) {
    cleanPhone = cleanPhone.slice(1)
  }
  if (!cleanPhone.startsWith('55') && (cleanPhone.length === 10 || cleanPhone.length === 11)) {
    cleanPhone = '55' + cleanPhone
  }

  if (cleanPhone && cleanResponseText) {
    let evoUrl = ''
    let evoKey = ''
    let evoInst = 'ecosolar'
    try {
      evoUrl = ($os.getenv('EVOLUTION_API_URL') || '').trim()
      evoKey = ($os.getenv('EVOLUTION_API_KEY') || '').trim()
      evoInst = ($os.getenv('EVOLUTION_INSTANCE_NAME') || 'ecosolar').trim()
    } catch (_) {}

    if (!evoUrl || !evoKey || evoKey === 'placeholder_api_key') {
      try {
        const waList = $app.findRecordsByFilter('whatsapp_settings', '', '-created', 1, 0)
        if (waList && waList.length > 0) {
          if (!evoUrl) evoUrl = (waList[0].getString('api_url') || '').trim()
          if (!evoKey || evoKey === 'placeholder_api_key')
            evoKey = (waList[0].getString('api_key') || '').trim()
          if (!evoInst || evoInst === 'ecosolar')
            evoInst = (waList[0].getString('instance_name') || 'ecosolar').trim()
        }
      } catch (_) {}
    }

    if (evoUrl && evoKey && evoKey !== 'placeholder_api_key') {
      if (evoUrl.endsWith('/')) evoUrl = evoUrl.slice(0, -1)
      try {
        const evoRes = $http.send({
          url: evoUrl + '/message/sendText/' + encodeURIComponent(evoInst),
          method: 'POST',
          headers: {
            apikey: evoKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: cleanPhone,
            text: cleanResponseText,
          }),
          timeout: 15,
        })
        if (evoRes.statusCode >= 200 && evoRes.statusCode < 300) {
          waEnviado = true
        } else {
          waErro = 'Evolution API retornou status ' + evoRes.statusCode
        }
      } catch (evoErr) {
        waErro = 'Erro de rede Evolution: ' + evoErr.message
      }
    } else {
      waErro = 'Evolution API não configurada'
    }
  } else if (!cleanPhone) {
    waErro = 'Telefone do lead ausente ou inválido'
  }

  // 8. Envio por E-mail (especialmente no primeiro contato ou se WhatsApp não configurado)
  let emailEnviado = false
  let emailErro = ''
  if (leadEmail && !leadEmail.endsWith('@leadsolar.crm')) {
    try {
      const mailClient = $app.newMailClient()
      const metaSettings = $app.settings().meta || {}
      const senderAddr = metaSettings.senderAddress || 'no-reply@goskip.dev'
      const senderName = 'Amanda • Ecosolar Energy'

      const htmlBody =
        '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">' +
        '  <div style="background-color: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden;">' +
        '    <div style="background: linear-gradient(135deg, #0B7A5B 0%, #095C44 100%); padding: 20px; text-align: center; color: #ffffff;">' +
        '      <h2 style="margin: 0; font-size: 18px; font-weight: 800;">Ecosolar Energy</h2>' +
        '      <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Atendimento Especializado</p>' +
        '    </div>' +
        '    <div style="padding: 24px; color: #1e293b; line-height: 1.6; font-size: 14px;">' +
        '      <p style="margin-top: 0;">Olá, <strong>' +
        leadNome +
        '</strong>!</p>' +
        '      <p style="margin: 16px 0; color: #334155; white-space: pre-wrap;">' +
        cleanResponseText +
        '</p>' +
        '      <p style="margin-top: 24px; font-size: 12px; color: #64748b;">' +
        '        Você também pode nos responder diretamente pelo WhatsApp no número cadastrado.' +
        '      </p>' +
        '    </div>' +
        '    <div style="padding: 12px 20px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">' +
        '      Amanda • SDR Ecosolar Energy' +
        '    </div>' +
        '  </div>' +
        '</div>'

      const emailMessage = new MailerMessage({
        from: { address: senderAddr, name: senderName },
        to: [{ address: leadEmail }],
        subject: isFirstContact
          ? 'Amanda da Ecosolar • Primeiro contato sobre seu projeto solar'
          : 'Amanda da Ecosolar • Atendimento ao seu projeto',
        html: htmlBody,
      })
      mailClient.send(emailMessage)
      emailEnviado = true
    } catch (mErr) {
      emailErro = mErr.message || String(mErr)
    }
  }

  // 9. Salvar mensagem na coleção whatsapp_messages (se tiver telefone) para constar na Inbox
  if (cleanPhone && cleanResponseText) {
    try {
      const msgCol = $app.findCollectionByNameOrId('whatsapp_messages')
      const msgRec = new Record(msgCol)
      msgRec.set('lead', lead.id)
      msgRec.set('phone_number', cleanPhone)
      msgRec.set('sender_name', 'Amanda (IA)')
      msgRec.set('direction', 'out')
      msgRec.set('content', cleanResponseText)
      msgRec.set(
        'wa_message_id',
        'amanda_' + new Date().getTime() + '_' + Math.random().toString(36).substring(2, 7),
      )
      msgRec.set('status', waEnviado ? 'sent' : 'error')
      msgRec.set('unread', false)
      $app.save(msgRec)
    } catch (saveMsgErr) {
      console.warn('[amanda_process_lead] Falha ao gravar whatsapp_messages:', saveMsgErr)
    }
  }

  // 10. Atualizar histórico do lead
  let rawHist = lead.get('historico')
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

  const canalDesc =
    waEnviado && emailEnviado
      ? 'WhatsApp e E-mail'
      : waEnviado
        ? 'WhatsApp'
        : emailEnviado
          ? 'E-mail'
          : 'Registro interno (canais de envio indisponíveis: ' + (waErro || 'falha') + ')'

  hist.push({
    data: new Date().toISOString(),
    tipo: 'nota',
    autor: 'Amanda (IA)',
    descricao:
      'Amanda (IA) enviou via ' +
      canalDesc +
      ': "' +
      (cleanResponseText.length > 140
        ? cleanResponseText.substring(0, 140) + '...'
        : cleanResponseText) +
      '"',
  })

  // 11. Se o lead foi qualificado pela Amanda: registrar e direcionar ao vendedor da cidade
  if (leadFoiQualificado && !jaQualificada) {
    hist.push({
      data: new Date().toISOString(),
      tipo: 'qualificacao',
      autor: 'Amanda (IA)',
      descricao:
        'Lead qualificado pela Amanda! Dados coletados: consumo/conta, pretensão de consumo e local de instalação.',
    })

    lead.set('qualificada_ia', true)
    lead.set('status_qualificacao', 'qualificado')
    lead.set('qualificado_em', new Date().toISOString())
    lead.set('status', 'Novo')

    // Direcionar ao vendedor responsável pela cidade de atuação
    const normalizar = (str) => {
      if (!str || typeof str !== 'string') return ''
      let s = str.toLowerCase().trim()
      const mapa = {
        á: 'a',
        à: 'a',
        ã: 'a',
        â: 'a',
        ä: 'a',
        é: 'e',
        è: 'e',
        ê: 'e',
        ë: 'e',
        í: 'i',
        ì: 'i',
        î: 'i',
        ï: 'i',
        ó: 'o',
        ò: 'o',
        õ: 'o',
        ô: 'o',
        ö: 'o',
        ú: 'u',
        ù: 'u',
        û: 'u',
        ü: 'u',
        ç: 'c',
        ñ: 'n',
      }
      for (const k in mapa) {
        s = s.replace(new RegExp(k, 'g'), mapa[k])
      }
      return s.replace(/[^a-z0-9]/g, '')
    }

    const leadCidadeNorm = normalizar(leadCidade)
    let vendedorResponsavel = null
    if (leadCidadeNorm) {
      try {
        const users = $app.findRecordsByFilter(
          '_pb_users_auth_',
          "cidade_atuacao != ''",
          '',
          200,
          0,
        )
        for (let u = 0; u < users.length; u++) {
          const user = users[u]
          const cidadesVendedor = (user.getString('cidade_atuacao') || '').split(/[,;/]+/)
          for (let c = 0; c < cidadesVendedor.length; c++) {
            if (normalizar(cidadesVendedor[c]) === leadCidadeNorm) {
              vendedorResponsavel = user
              break
            }
          }
          if (vendedorResponsavel) break
        }
      } catch (uErr) {
        console.warn('[amanda] Erro ao buscar vendedor da cidade:', uErr)
      }
    }

    if (vendedorResponsavel) {
      lead.set('proprietario', vendedorResponsavel.id)
      lead.set('qualificado_por', vendedorResponsavel.id)

      // Criar notificação no sino para o vendedor responsável
      try {
        const notifCol = $app.findCollectionByNameOrId('notificacoes')
        const notif = new Record(notifCol)
        notif.set('usuario', vendedorResponsavel.id)
        notif.set('lead', lead.id)
        notif.set('titulo', 'Lead Qualificado pela Amanda: ' + leadNome)
        notif.set(
          'mensagem',
          'A Amanda (IA) qualificou ' +
            leadNome +
            ' em ' +
            (leadCidade || 'sua região') +
            ' e direcionou para você. Entre em contato para apresentar a proposta!',
        )
        notif.set('tipo', 'lead_cidade')
        notif.set('lida', false)
        notif.set('lead_nome', leadNome)
        notif.set('lead_cidade', leadCidade)
        notif.set('lead_telefone', leadTelefone)
        notif.set(
          'metadados',
          JSON.stringify({
            qualificado_por_ia: true,
            agente: 'amanda',
            timestamp: new Date().toISOString(),
          }),
        )
        $app.save(notif)
      } catch (notifErr) {
        console.warn('[amanda] Erro ao salvar notificação para vendedor:', notifErr)
      }

      // Enviar e-mail para o vendedor responsável
      const vendEmail = vendedorResponsavel.getString('email')
      if (vendEmail) {
        try {
          const mailClient = $app.newMailClient()
          const metaSettings = $app.settings().meta || {}
          const senderAddr = metaSettings.senderAddress || 'no-reply@goskip.dev'
          const crmLeadUrl = 'https://crm-de-vendas-solar-dce30.goskip.app/leads/' + lead.id

          const htmlNotif =
            '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">' +
            '  <div style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">' +
            '    <div style="background: linear-gradient(135deg, #0B7A5B 0%, #095C44 100%); padding: 22px; text-align: center; color: #ffffff;">' +
            '      <h2 style="margin: 0; font-size: 18px;">Ecosolar Energy CRM</h2>' +
            '      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.92;">Lead Qualificado pela Amanda (SDR IA)</p>' +
            '    </div>' +
            '    <div style="padding: 24px; color: #1e293b; line-height: 1.6;">' +
            '      <p>Olá, <strong>' +
            (vendedorResponsavel.getString('name') || 'Vendedor') +
            '</strong>!</p>' +
            '      <p>A SDR <strong>Amanda</strong> acabou de qualificar um novo lead na sua região e direcionou para o seu atendimento:</p>' +
            '      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 13px;">' +
            '        <p style="margin: 4px 0;"><strong>Nome:</strong> ' +
            leadNome +
            '</p>' +
            '        <p style="margin: 4px 0;"><strong>Cidade:</strong> ' +
            (leadCidade || 'Não informada') +
            '</p>' +
            '        <p style="margin: 4px 0;"><strong>Telefone:</strong> ' +
            leadTelefone +
            '</p>' +
            '        <p style="margin: 4px 0;"><strong>Status:</strong> Qualificado pela IA</p>' +
            '      </div>' +
            '      <div style="text-align: center; margin: 24px 0;">' +
            '        <a href="' +
            crmLeadUrl +
            '" style="background: #0B7A5B; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Abrir Lead no CRM &rarr;</a>' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '</div>'

          const notifMsg = new MailerMessage({
            from: { address: senderAddr, name: 'Ecosolar Energy CRM' },
            to: [{ address: vendEmail }],
            subject:
              '⭐ Lead Qualificado pela Amanda: ' + leadNome + ' (' + (leadCidade || 'Geral') + ')',
            html: htmlNotif,
          })
          mailClient.send(notifMsg)
        } catch (mailVendErr) {
          console.warn('[amanda] Erro ao enviar email para vendedor responsável:', mailVendErr)
        }
      }
    }
  }

  // 12. Persistir lead com novo conversationId e histórico
  if (newConvId) {
    lead.set('amanda_conversation_id', newConvId)
  }
  lead.set('historico', hist)

  try {
    $app.save(lead)
  } catch (leadSaveErr) {
    console.error('[amanda] Erro ao persistir lead após conversa da Amanda:', leadSaveErr)
  }

  return e.json(200, {
    success: true,
    resposta_amanda: cleanResponseText,
    conversation_id: newConvId,
    qualificado: leadFoiQualificado,
    whatsapp_enviado: waEnviado,
    email_enviado: emailEnviado,
  })
})
