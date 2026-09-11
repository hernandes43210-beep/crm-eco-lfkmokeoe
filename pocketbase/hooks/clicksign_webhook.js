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
        } catch (_) {}
      }
    }
  } catch (_) {}

  return e.json(200, { received: true })
})
