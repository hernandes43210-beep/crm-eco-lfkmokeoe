// POST /backend/v1/integrations/clicksign/webhook
// Rota pública para receber webhooks da Clicksign v3 (eventos close, document_closed, etc.)
// Atualiza o envelope local e a timeline do lead quando notificado pela Clicksign.

routerAdd('POST', '/backend/v1/integrations/clicksign/webhook', (e) => {
  const body = e.requestInfo().body || {}
  const eventName = (body.event || body.type || (body.data && body.data.type) || '').toLowerCase()

  // Extrair ID do envelope
  let envelopeId = ''
  if (body.data && body.data.id) {
    envelopeId = body.data.id
  } else if (body.envelope && body.envelope.id) {
    envelopeId = body.envelope.id
  } else if (body.envelope_id) {
    envelopeId = body.envelope_id
  }

  if (!envelopeId) {
    return e.json(200, { received: true, ignored: 'No envelope id' })
  }

  try {
    const list = $app.findRecordsByFilter(
      'assinaturas_envelopes',
      "clicksign_envelope_id = '" + envelopeId + "'",
      '-created',
      1,
      0,
    )
    if (list && list.length > 0) {
      const rec = list[0]
      const statusAnterior = rec.getString('status')
      let novoStatus = statusAnterior

      if (
        eventName.indexOf('close') !== -1 ||
        eventName.indexOf('signed') !== -1 ||
        eventName.indexOf('closed') !== -1
      ) {
        novoStatus = 'signed'
      } else if (eventName.indexOf('cancel') !== -1) {
        novoStatus = 'canceled'
      }

      rec.set('status', novoStatus)
      if (novoStatus === 'signed' && !rec.getString('assinado_em')) {
        rec.set('assinado_em', new Date().toISOString())
      }
      $app.save(rec)

      // Atualizar Lead se assinado
      const leadId = rec.getString('lead')
      if (leadId && statusAnterior !== 'signed' && novoStatus === 'signed') {
        try {
          const leadRec = $app.findRecordById('leads', leadId)
          let rawHist = leadRec.get('historico')
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
            tipo: 'fechamento',
            descricao:
              'Notificação Webhook Clicksign: Documento assinado digitalmente pelo cliente (' +
              rec.getString('signatario_nome') +
              ').',
          })
          leadRec.set('historico', JSON.stringify(hist))
          $app.save(leadRec)

          // Disparo de notificação via WhatsApp para o cliente confirmando a assinatura (best-effort)
          const clienteTelefoneRaw =
            rec.getString('signatario_telefone') || leadRec.getString('telefone') || ''
          const clienteNome =
            rec.getString('signatario_nome') || leadRec.getString('nome') || 'Cliente'

          if (clienteTelefoneRaw) {
            let clienteTelefoneNorm = clienteTelefoneRaw.replace(/\D/g, '')
            if (
              clienteTelefoneNorm.startsWith('0') &&
              (clienteTelefoneNorm.length === 11 || clienteTelefoneNorm.length === 12)
            ) {
              clienteTelefoneNorm = clienteTelefoneNorm.slice(1)
            }
            if (
              !clienteTelefoneNorm.startsWith('55') &&
              (clienteTelefoneNorm.length === 10 || clienteTelefoneNorm.length === 11)
            ) {
              clienteTelefoneNorm = '55' + clienteTelefoneNorm
            }

            if (clienteTelefoneNorm) {
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
                const docTipo =
                  rec.getString('tipo_documento') === 'procuracao'
                    ? 'Procuração Energisa'
                    : 'Contrato de Adesão Solar'
                const msgCliente =
                  '☀️ *Ecosolar Energy — Documento Assinado com Sucesso!*\n\n' +
                  'Olá, ' +
                  clienteNome +
                  '!\n' +
                  'Confirmamos o recebimento da assinatura do seu ' +
                  docTipo +
                  '.\n\n' +
                  'Nossa equipe técnica já foi notificada para dar andamento às próximas etapas do seu projeto solar. Qualquer dúvida, estamos à disposição!\n\n' +
                  'Obrigado pela confiança na Ecosolar Energy! 🌱✨'

                try {
                  const sendRes = $http.send({
                    url: evoUrl + '/message/sendText/' + encodeURIComponent(evoInst),
                    method: 'POST',
                    headers: {
                      apikey: evoKey,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      number: clienteTelefoneNorm,
                      text: msgCliente,
                    }),
                    timeout: 10,
                  })

                  if (sendRes.statusCode >= 200 && sendRes.statusCode < 300) {
                    console.log(
                      '[clicksign_webhook] Confirmação via WhatsApp enviada com sucesso para cliente ' +
                        clienteNome +
                        ' (' +
                        clienteTelefoneNorm +
                        ')',
                    )
                  }
                } catch (sendErr) {
                  console.error(
                    '[clicksign_webhook] Falha no envio de WhatsApp para cliente após assinatura:',
                    sendErr,
                  )
                }
              }
            }
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  return e.json(200, { received: true })
})
