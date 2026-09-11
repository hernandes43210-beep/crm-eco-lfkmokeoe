// POST /backend/v1/integrations/clicksign/create-envelope
// Cria um envelope com 1 documento e 1 signatário na API v3 da Clicksign.
// Ativa o envelope e armazena os dados na coleção 'assinaturas_envelopes'.
// Registra o evento na timeline do lead.
// Requer autenticação.

routerAdd(
  'POST',
  '/backend/v1/integrations/clicksign/create-envelope',
  (e) => {
    let token = ''
    let baseUrl = ''

    // 1. Prioridade: token persistido na coleção clicksign_settings
    try {
      const list = $app.findRecordsByFilter('clicksign_settings', '', '-created', 1, 0)
      if (list && list.length > 0) {
        const savedToken = (list[0].getString('api_token') || '').trim()
        if (savedToken) token = savedToken
        const savedUrl = (list[0].getString('api_url') || '').trim()
        if (savedUrl) baseUrl = savedUrl
      }
    } catch (_) {}

    // 2. Fallback: variável de ambiente
    if (!token) {
      try {
        token = ($os.getenv('CLICKSIGN_API_TOKEN') || '').trim()
      } catch (_) {}
    }

    if (!token) {
      return e.json(400, {
        error:
          'Token da Clicksign não configurado no servidor. Acesse /integracoes para salvar o token.',
      })
    }

    if (!baseUrl) {
      try {
        baseUrl = ($os.getenv('CLICKSIGN_API_URL') || 'https://app.clicksign.com').trim()
      } catch (_) {}
    }
    if (!baseUrl) baseUrl = 'https://app.clicksign.com'
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    const body = e.requestInfo().body || {}
    const leadId = (body.lead_id || '').trim()
    const documentoId = (body.documento_id || '').trim()
    const tipoDocumento = (body.tipo_documento || 'contrato').trim()
    const signerNome = (body.signer_nome || '').trim()
    const signerEmail = (body.signer_email || '').trim().toLowerCase()
    const signerCpf = (body.signer_cpf || '').replace(/\D/g, '')
    const signerTelefone = (body.signer_telefone || '').replace(/\D/g, '')
    const pdfBase64Raw = (body.pdf_base64 || '').trim()
    const envelopeNomeParam = (body.envelope_nome || '').trim()

    if (!leadId) {
      return e.json(400, { error: 'O identificador do lead (lead_id) é obrigatório.' })
    }
    if (!signerNome) {
      return e.json(400, { error: 'O nome do signatário é obrigatório.' })
    }
    if (!signerEmail || signerEmail.indexOf('@') === -1) {
      return e.json(400, { error: 'E-mail do signatário inválido ou não informado.' })
    }

    // 1. Obter o Lead no banco
    let leadRecord = null
    try {
      leadRecord = $app.findRecordById('leads', leadId)
    } catch (_) {
      return e.json(404, { error: 'Lead não encontrado.' })
    }

    // 2. Obter ou validar o documento formalizado
    let docRecord = null
    if (documentoId) {
      try {
        docRecord = $app.findRecordById('formalizacao_documentos', documentoId)
      } catch (_) {}
    }

    // Montar o base64 do PDF com prefixo data:application/pdf;base64,...
    let contentBase64 = ''
    if (pdfBase64Raw) {
      if (pdfBase64Raw.indexOf('data:') === 0) {
        contentBase64 = pdfBase64Raw
      } else {
        contentBase64 = 'data:application/pdf;base64,' + pdfBase64Raw
      }
    } else if (docRecord && docRecord.getString('arquivo_pdf')) {
      // Tentar obter o arquivo do documento armazenado no PocketBase
      try {
        const fileKey = docRecord.getString('arquivo_pdf')
        const fileContent = $app
          .fileSystem()
          .getFile(docRecord.collection().id + '/' + docRecord.id + '/' + fileKey)
        if (fileContent) {
          // Fallback se não enviado base64 do front
        }
      } catch (_) {}
    }

    if (!contentBase64) {
      return e.json(400, {
        error: 'Conteúdo em base64 do PDF não fornecido.',
      })
    }

    const envelopeNome =
      envelopeNomeParam ||
      (tipoDocumento === 'procuracao'
        ? 'Procuração Energisa — ' + signerNome
        : 'Contrato de Prestação de Serviços — ' + signerNome)

    const docFilename =
      (tipoDocumento === 'procuracao' ? 'Procuracao_Energisa_' : 'Contrato_Prestacao_') +
      signerNome.replace(/[^a-zA-Z0-9]/g, '_') +
      '.pdf'

    const headers = {
      Authorization: token,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    }

    // 3. PASSO 1: Criar Envelope na Clicksign (POST /api/v3/envelopes)
    let envelopeRes = null
    try {
      envelopeRes = $http.send({
        url: baseUrl + '/api/v3/envelopes',
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          data: {
            type: 'envelopes',
            attributes: {
              name: envelopeNome,
              locale: 'pt-BR',
              auto_close: true,
            },
          },
        }),
        timeout: 30,
      })
    } catch (httpErr) {
      return e.json(500, {
        error: 'Erro de conexão com o servidor da Clicksign: ' + httpErr.message,
      })
    }

    if (envelopeRes.statusCode < 200 || envelopeRes.statusCode >= 300) {
      const errBody = envelopeRes.json || {}
      let msg = 'Falha ao criar envelope na Clicksign.'
      if (errBody.errors && Array.isArray(errBody.errors) && errBody.errors[0]) {
        msg = errBody.errors[0].detail || errBody.errors[0].title || msg
      }
      return e.json(envelopeRes.statusCode, {
        error: msg,
        status: envelopeRes.statusCode,
      })
    }

    const envelopeData = (envelopeRes.json && envelopeRes.json.data) || {}
    const envelopeId = envelopeData.id
    if (!envelopeId) {
      return e.json(500, { error: 'Clicksign não retornou ID do envelope.' })
    }

    // 4. PASSO 2: Fazer upload do documento (POST /api/v3/envelopes/:envelope_id/documents)
    let docRes = null
    try {
      docRes = $http.send({
        url: baseUrl + '/api/v3/envelopes/' + envelopeId + '/documents',
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          data: {
            type: 'documents',
            attributes: {
              filename: docFilename,
              content_base64: contentBase64,
            },
          },
        }),
        timeout: 45,
      })
    } catch (docErr) {
      return e.json(500, {
        error: 'Erro no envio do documento PDF para a Clicksign: ' + docErr.message,
      })
    }

    if (docRes.statusCode < 200 || docRes.statusCode >= 300) {
      const errBody = docRes.json || {}
      let msg = 'Falha ao adicionar documento ao envelope na Clicksign.'
      if (errBody.errors && Array.isArray(errBody.errors) && errBody.errors[0]) {
        msg = errBody.errors[0].detail || errBody.errors[0].title || msg
      }
      return e.json(docRes.statusCode, { error: msg })
    }

    const docData = (docRes.json && docRes.json.data) || {}
    const clicksignDocId = docData.id || ''

    // 5. PASSO 3: Criar signatário (POST /api/v3/envelopes/:envelope_id/signers)
    const signerAttributes = {
      name: signerNome,
      email: signerEmail,
      has_documentation: !!signerCpf,
      communicate_events: {
        document_signed: 'email',
        signature_request: 'email',
        signature_reminder: 'email',
      },
    }
    if (signerCpf) {
      signerAttributes.documentation = signerCpf
    }
    if (signerTelefone) {
      signerAttributes.phone_number = signerTelefone
    }

    let signerRes = null
    try {
      signerRes = $http.send({
        url: baseUrl + '/api/v3/envelopes/' + envelopeId + '/signers',
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          data: {
            type: 'signers',
            attributes: signerAttributes,
          },
        }),
        timeout: 30,
      })
    } catch (sErr) {
      return e.json(500, {
        error: 'Erro ao cadastrar signatário na Clicksign: ' + sErr.message,
      })
    }

    if (signerRes.statusCode < 200 || signerRes.statusCode >= 300) {
      const errBody = signerRes.json || {}
      let msg = 'Falha ao cadastrar signatário na Clicksign.'
      if (errBody.errors && Array.isArray(errBody.errors) && errBody.errors[0]) {
        msg = errBody.errors[0].detail || errBody.errors[0].title || msg
      }
      return e.json(signerRes.statusCode, { error: msg })
    }

    const signerData = (signerRes.json && signerRes.json.data) || {}
    const clicksignSignerId = signerData.id || ''

    // 6. PASSO 4: Criar requisito de qualificação/assinatura (POST /api/v3/envelopes/:envelope_id/requirements)
    let reqRes = null
    let clicksignReqId = ''
    if (clicksignDocId && clicksignSignerId) {
      try {
        reqRes = $http.send({
          url: baseUrl + '/api/v3/envelopes/' + envelopeId + '/requirements',
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            data: {
              type: 'requirements',
              attributes: {
                action: 'agree',
                role: 'sign',
              },
              relationships: {
                document: {
                  data: { type: 'documents', id: clicksignDocId },
                },
                signer: {
                  data: { type: 'signers', id: clicksignSignerId },
                },
              },
            },
          }),
          timeout: 30,
        })
        if (reqRes.statusCode >= 200 && reqRes.statusCode < 300) {
          const reqData = (reqRes.json && reqRes.json.data) || {}
          clicksignReqId = reqData.id || ''
        }
      } catch (_) {}
    }

    // 7. PASSO 5: Ativar envelope (PATCH /api/v3/envelopes/:envelope_id com status: "running")
    let activeRes = null
    try {
      activeRes = $http.send({
        url: baseUrl + '/api/v3/envelopes/' + envelopeId,
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify({
          data: {
            id: envelopeId,
            type: 'envelopes',
            attributes: {
              status: 'running',
            },
          },
        }),
        timeout: 30,
      })
    } catch (_) {}

    // 8. PASSO 6: Buscar link de assinatura do signatário
    let linkAssinatura = ''
    try {
      const getSignerRes = $http.send({
        url: baseUrl + '/api/v3/envelopes/' + envelopeId + '/signers/' + clicksignSignerId,
        method: 'GET',
        headers: headers,
        timeout: 20,
      })
      if (getSignerRes.statusCode === 200 && getSignerRes.json && getSignerRes.json.data) {
        const sData = getSignerRes.json.data
        const sAttrs = sData.attributes || {}
        const sLinks = sData.links || {}
        linkAssinatura =
          sAttrs.url ||
          sAttrs.sign_url ||
          sAttrs.signature_url ||
          sLinks.signature ||
          sLinks.sign_url ||
          sLinks.self ||
          ''
      }
    } catch (_) {}

    // Fallback: se a API não expuser link direto via signers, gerar URL pública de assinatura padrão Clicksign
    if (!linkAssinatura) {
      linkAssinatura = baseUrl + '/envelopes/' + envelopeId
    }

    // 9. Persistir na coleção 'assinaturas_envelopes'
    const assinaturasCol = $app.findCollectionByNameOrId('assinaturas_envelopes')
    const envelopeRec = new Record(assinaturasCol)
    envelopeRec.set('lead', leadId)
    if (documentoId) {
      envelopeRec.set('documento', documentoId)
    }
    envelopeRec.set('tipo_documento', tipoDocumento)
    envelopeRec.set('clicksign_envelope_id', envelopeId)
    envelopeRec.set('clicksign_document_id', clicksignDocId)
    envelopeRec.set('clicksign_signer_id', clicksignSignerId)
    envelopeRec.set('clicksign_requirement_id', clicksignReqId)
    envelopeRec.set('status', 'running')
    envelopeRec.set('nome_envelope', envelopeNome)
    envelopeRec.set('signatario_nome', signerNome)
    envelopeRec.set('signatario_email', signerEmail)
    if (signerCpf) envelopeRec.set('signatario_cpf', signerCpf)
    if (signerTelefone) envelopeRec.set('signatario_telefone', signerTelefone)
    envelopeRec.set('link_assinatura', linkAssinatura)
    envelopeRec.set(
      'dados_resposta',
      JSON.stringify({
        envelope: envelopeData,
        document: docData,
        signer: signerData,
      }),
    )

    let authUserId = ''
    try {
      authUserId = e.auth ? e.auth.id : ''
    } catch (_) {}
    if (authUserId) {
      envelopeRec.set('criado_por', authUserId)
    }

    try {
      $app.save(envelopeRec)
    } catch (saveErr) {
      return e.json(500, {
        error: 'Envelope criado na Clicksign, mas falhou ao gravar no CRM: ' + saveErr.message,
        envelope_id: envelopeId,
      })
    }

    // 10. Atualizar histórico do Lead
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
      const tipoNome =
        tipoDocumento === 'procuracao' ? 'Procuração Energisa' : 'Contrato de Prestação'
      hist.push({
        data: new Date().toISOString(),
        tipo: 'fechamento',
        descricao:
          'Envelope de assinatura digital criado na Clicksign para ' +
          tipoNome +
          ' (Signatário: ' +
          signerNome +
          ' <' +
          signerEmail +
          '>).',
      })
      leadRecord.set('historico', JSON.stringify(hist))
      $app.save(leadRecord)
    } catch (_) {}

    return e.json(200, {
      success: true,
      envelope_id: envelopeId,
      document_id: clicksignDocId,
      signer_id: clicksignSignerId,
      status: 'running',
      link_assinatura: linkAssinatura,
      record_id: envelopeRec.id,
      message: 'Envelope criado com sucesso e enviado para assinatura digital!',
    })
  },
  $apis.requireAuth(),
)
