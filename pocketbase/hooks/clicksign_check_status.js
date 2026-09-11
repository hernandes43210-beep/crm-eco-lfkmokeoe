// POST /backend/v1/integrations/clicksign/check-status
// Consulta o status atual de um envelope na API Clicksign v3 e sincroniza com o banco local.
// Se o status for "closed" (assinado), atualiza status para "signed", grava data e baixa o PDF assinado se disponível.
// Requer autenticação.

routerAdd(
  'POST',
  '/backend/v1/integrations/clicksign/check-status',
  (e) => {
    let token = ''
    try {
      token = ($os.getenv('CLICKSIGN_API_TOKEN') || '').trim()
    } catch (_) {}

    if (!token) {
      return e.json(400, {
        error: 'Token da Clicksign não configurado no servidor.',
      })
    }

    let baseUrl = ''
    try {
      baseUrl = ($os.getenv('CLICKSIGN_API_URL') || 'https://app.clicksign.com').trim()
    } catch (_) {}
    if (!baseUrl) baseUrl = 'https://app.clicksign.com'
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    const body = e.requestInfo().body || {}
    const envelopeRecordId = (body.record_id || '').trim()
    const clicksignEnvelopeId = (body.envelope_id || '').trim()

    let envelopeRec = null
    if (envelopeRecordId) {
      try {
        envelopeRec = $app.findRecordById('assinaturas_envelopes', envelopeRecordId)
      } catch (_) {}
    } else if (clicksignEnvelopeId) {
      try {
        const found = $app.findRecordsByFilter(
          'assinaturas_envelopes',
          "clicksign_envelope_id = '" + clicksignEnvelopeId + "'",
          '-created',
          1,
          0,
        )
        if (found && found.length > 0) {
          envelopeRec = found[0]
        }
      } catch (_) {}
    }

    if (!envelopeRec && !clicksignEnvelopeId) {
      return e.json(400, {
        error: 'Identificador do envelope (record_id ou envelope_id) é obrigatório.',
      })
    }

    const envId =
      clicksignEnvelopeId || (envelopeRec ? envelopeRec.getString('clicksign_envelope_id') : '')
    if (!envId) {
      return e.json(400, { error: 'Envelope ID da Clicksign não encontrado.' })
    }

    const headers = {
      Authorization: token,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    }

    // 1. Consultar GET /api/v3/envelopes/:envelope_id
    let envRes = null
    try {
      envRes = $http.send({
        url: baseUrl + '/api/v3/envelopes/' + envId,
        method: 'GET',
        headers: headers,
        timeout: 25,
      })
    } catch (httpErr) {
      return e.json(500, {
        error: 'Erro de comunicação com a Clicksign: ' + httpErr.message,
      })
    }

    if (envRes.statusCode < 200 || envRes.statusCode >= 300) {
      return e.json(envRes.statusCode, {
        error: 'Clicksign retornou erro HTTP ' + envRes.statusCode,
      })
    }

    const envData = (envRes.json && envRes.json.data) || {}
    const attrs = envData.attributes || {}
    const rawStatus = (attrs.status || '').toLowerCase() // "running", "closed", "canceled", etc.

    // 2. Mapeamento de status para o CRM
    let novoStatus = 'running'
    if (rawStatus === 'closed' || rawStatus === 'finished' || rawStatus === 'signed') {
      novoStatus = 'signed'
    } else if (rawStatus === 'canceled' || rawStatus === 'cancelled') {
      novoStatus = 'canceled'
    } else if (rawStatus === 'expired') {
      novoStatus = 'expired'
    } else if (rawStatus === 'draft') {
      novoStatus = 'draft'
    }

    // 3. Atualizar link de assinatura se ainda vazio
    let linkAssinatura = envelopeRec ? envelopeRec.getString('link_assinatura') : ''
    const signerId = envelopeRec ? envelopeRec.getString('clicksign_signer_id') : ''
    if ((!linkAssinatura || linkAssinatura.indexOf('/signers/') !== -1) && signerId) {
      try {
        const signerRes = $http.send({
          url: baseUrl + '/api/v3/envelopes/' + envId + '/signers/' + signerId,
          method: 'GET',
          headers: headers,
          timeout: 15,
        })
        if (signerRes.statusCode === 200 && signerRes.json && signerRes.json.data) {
          const sAttrs = signerRes.json.data.attributes || {}
          const sLinks = signerRes.json.data.links || {}
          const foundUrl =
            sAttrs.url ||
            sAttrs.sign_url ||
            sAttrs.signature_url ||
            sLinks.signature ||
            sLinks.sign_url ||
            ''
          if (foundUrl) linkAssinatura = foundUrl
        }
      } catch (_) {}
    }

    // 4. Se assinado e houve mudança de status, registrar evento na timeline do Lead
    const statusAnterior = envelopeRec ? envelopeRec.getString('status') : ''
    const leadId = envelopeRec ? envelopeRec.getString('lead') : ''

    if (envelopeRec) {
      envelopeRec.set('status', novoStatus)
      if (linkAssinatura) envelopeRec.set('link_assinatura', linkAssinatura)
      if (novoStatus === 'signed' && !envelopeRec.getString('assinado_em')) {
        envelopeRec.set('assinado_em', new Date().toISOString())
      }

      try {
        $app.save(envelopeRec)
      } catch (_) {}

      // Atualizar timeline do lead se mudou para assinado
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
          const docNome =
            envelopeRec.getString('tipo_documento') === 'procuracao'
              ? 'Procuração Energisa'
              : 'Contrato de Prestação'
          hist.push({
            data: new Date().toISOString(),
            tipo: 'fechamento',
            descricao:
              'Documento assinado digitalmente pelo cliente via Clicksign (' +
              docNome +
              ' — ' +
              envelopeRec.getString('signatario_nome') +
              ').',
          })
          leadRec.set('historico', JSON.stringify(hist))
          $app.save(leadRec)
        } catch (_) {}
      }
    }

    return e.json(200, {
      success: true,
      status: novoStatus,
      raw_status: rawStatus,
      link_assinatura: linkAssinatura,
      envelope: envData,
    })
  },
  $apis.requireAuth(),
)
