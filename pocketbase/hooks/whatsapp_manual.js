// GET  /backend/v1/whatsapp/manual-config  (Admin)
// POST /backend/v1/whatsapp/manual-config  (Admin) — salva waba_id/phone_number_id/token
// POST /backend/v1/whatsapp/manual-test    (Admin) — teste real contra a API da Meta
// Salva na coleção 'integracoes_config' (chave = 'whatsapp_manual'), mesmo padrão da
// chave Gemini. O token fica no campo api_key; nunca é devolvo inteiro ao frontend.
// NOTA JSVM: toda a lógica inline no callback, sem símbolos de nível de topo.
routerAdd(
  'GET',
  '/backend/v1/whatsapp/manual-config',
  (e) => {
    const auth = e.auth
    if (!auth) return e.json(401, { error: 'Não autenticado' })
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, { error: 'Apenas administradores podem ver a conexão manual.' })
    }

    let rec = null
    try {
      const rs = $app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'whatsapp_manual'",
        '-created',
        1,
        0,
      )
      if (rs && rs.length > 0) rec = rs[0]
    } catch (_) {}

    if (!rec) {
      return e.json(200, { configured: false, waba_id: '', phone_number_id: '', masked_token: '' })
    }

    const token = (rec.getString('api_key') || '').trim()
    const wabaId = (rec.getString('waba_id') || '').trim()
    const phoneNumberId = (rec.getString('phone_number_id') || '').trim()
    let masked = ''
    if (token.length > 8) masked = token.slice(0, 4) + '••••••••' + token.slice(-4)
    else if (token) masked = '••••••••' + token.slice(-2)

    return e.json(200, {
      configured: !!(wabaId && phoneNumberId && token),
      waba_id: wabaId,
      phone_number_id: phoneNumberId,
      masked_token: masked,
      ultimo_teste_status: (rec.getString('ultimo_teste_status') || '').trim(),
      ultimo_teste_mensagem: (rec.getString('ultimo_teste_mensagem') || '').trim(),
      ultimo_teste_em: (rec.getString('ultimo_teste_em') || '').trim(),
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/whatsapp/manual-config',
  (e) => {
    const auth = e.auth
    if (!auth) return e.json(401, { error: 'Não autenticado' })
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, { error: 'Apenas administradores podem alterar a conexão manual.' })
    }

    const body = e.requestInfo().body || {}
    const wabaId = typeof body.waba_id === 'string' ? body.waba_id.trim() : ''
    const phoneNumberId =
      typeof body.phone_number_id === 'string' ? body.phone_number_id.trim() : ''
    const token = typeof body.access_token === 'string' ? body.access_token.trim() : ''

    if (!/^\d{3,30}$/.test(wabaId)) {
      return e.json(400, {
        error: 'WABA ID inválido: informe o número da conta de WhatsApp Business (só dígitos).',
      })
    }
    if (!/^\d{3,30}$/.test(phoneNumberId)) {
      return e.json(400, {
        error: 'Phone Number ID inválido: informe o ID do número de telefone (só dígitos).',
      })
    }
    if (!token) {
      return e.json(400, { error: 'Informe o Access Token da Meta (formato EAAG...).' })
    }

    let rec = null
    try {
      const rs = $app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'whatsapp_manual'",
        '-created',
        1,
        0,
      )
      if (rs && rs.length > 0) rec = rs[0]
    } catch (_) {}

    const col = $app.findCollectionByNameOrId('integracoes_config')
    if (!rec) {
      rec = new Record(col)
      rec.set('chave', 'whatsapp_manual')
      rec.set('descricao', 'Conexão manual do WhatsApp Cloud API (Meta) do CRM')
    }

    rec.set('waba_id', wabaId)
    rec.set('phone_number_id', phoneNumberId)
    rec.set('api_key', token)
    rec.set('ativo', true)

    try {
      $app.save(rec)
    } catch (saveErr) {
      return e.json(500, {
        error:
          'Erro ao salvar a conexão manual no backend: ' +
          (saveErr && saveErr.message ? saveErr.message : 'falha interna.'),
      })
    }

    const saved = (rec.getString('api_key') || '').trim()
    const masked =
      saved.length > 8
        ? saved.slice(0, 4) + '••••••••' + saved.slice(-4)
        : '••••••••' + saved.slice(-2)

    return e.json(200, {
      success: true,
      message: 'Conexão manual do WhatsApp salva com sucesso!',
      configured: true,
      waba_id: wabaId,
      phone_number_id: phoneNumberId,
      masked_token: masked,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/whatsapp/manual-test',
  (e) => {
    const auth = e.auth
    if (!auth) return e.json(401, { error: 'Não autenticado' })
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, { error: 'Apenas administradores podem testar a conexão manual.' })
    }

    const body = e.requestInfo().body || {}
    let wabaId = typeof body.waba_id === 'string' ? body.waba_id.trim() : ''
    let token = typeof body.access_token === 'string' ? body.access_token.trim() : ''

    // Sem valores no corpo: usa o que já está salvo no banco
    let recSalvo = null
    try {
      const rs = $app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'whatsapp_manual'",
        '-created',
        1,
        0,
      )
      if (rs && rs.length > 0) {
        recSalvo = rs[0]
        if (!wabaId) wabaId = (rs[0].getString('waba_id') || '').trim()
        if (!token) token = (rs[0].getString('api_key') || '').trim()
      }
    } catch (_) {}

    if (!wabaId || !token) {
      return e.json(400, {
        success: false,
        status: 'erro_sem_config',
        message: 'Salve o WABA ID e o Access Token antes de testar.',
      })
    }

    // Chamada real à API da Meta: lista os números da WABA. Token SEMPRE no header
    // Authorization (nunca ?access_token= na URL).
    let httpRes = null
    const startTime = new Date().getTime()
    try {
      httpRes = $http.send({
        url:
          'https://graph.facebook.com/v21.0/' +
          wabaId +
          '/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating&limit=10',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        timeout: 15,
      })
    } catch (httpErr) {
      const errMsg =
        'Falha ao conectar com a API da Meta: ' +
        (httpErr && httpErr.message ? httpErr.message : 'tempo limite esgotado.')
      if (recSalvo) {
        try {
          recSalvo.set('ultimo_teste_status', 'erro_conexao')
          recSalvo.set('ultimo_teste_mensagem', errMsg)
          recSalvo.set('ultimo_teste_em', new Date().toISOString())
          $app.save(recSalvo)
        } catch (_) {}
      }
      return e.json(200, { success: false, status: 'erro_conexao', message: errMsg })
    }

    const duration = new Date().getTime() - startTime
    const statusCode = httpRes.statusCode
    const dados = httpRes.json || {}

    if (statusCode >= 200 && statusCode < 300) {
      const lista = Array.isArray(dados.data) ? dados.data : []
      const numeros = []
      for (let i = 0; i < lista.length; i++) {
        const n = lista[i]
        if (n && typeof n === 'object' && typeof n.id === 'string' && n.id) {
          numeros.push({
            id: n.id,
            numero: typeof n.display_phone_number === 'string' ? n.display_phone_number : '',
            nome: typeof n.verified_name === 'string' ? n.verified_name : '',
            qualidade: typeof n.quality_rating === 'string' ? n.quality_rating : '',
          })
        }
      }
      const msg =
        numeros.length > 0
          ? 'Conexão validada! Números encontrados na WABA: ' +
            numeros
              .map(function (n) {
                return n.numero || n.id
              })
              .join(', ')
          : 'Conexão validada (HTTP ' + statusCode + '), mas nenhum número foi retornado pela WABA.'
      if (recSalvo) {
        try {
          recSalvo.set('ultimo_teste_status', 'sucesso')
          recSalvo.set('ultimo_teste_mensagem', msg)
          recSalvo.set('ultimo_teste_em', new Date().toISOString())
          $app.save(recSalvo)
        } catch (_) {}
      }
      return e.json(200, {
        success: true,
        status: 'sucesso',
        http_status: statusCode,
        duration_ms: duration,
        message: msg,
        numeros: numeros,
      })
    }

    // Erro real da Meta: devolve o texto de erro que veio da API
    let detail = ''
    if (dados.error && typeof dados.error.message === 'string') detail = dados.error.message
    else if (typeof dados.error_description === 'string') detail = dados.error_description
    const safeDetail = detail
      .replace(/EAAG[A-Za-z0-9_-]+/g, '[TOKEN_PROTEGIDO]')
      .replace(/EAA[A-Za-z0-9_-]+/g, '[TOKEN_PROTEGIDO]')
    const friendly =
      'Erro da Meta (HTTP ' +
      statusCode +
      '): ' +
      (safeDetail || 'resposta sem detalhe. Verifique o WABA ID e o token.')
    if (recSalvo) {
      try {
        recSalvo.set('ultimo_teste_status', 'erro_' + statusCode)
        recSalvo.set('ultimo_teste_mensagem', friendly)
        recSalvo.set('ultimo_teste_em', new Date().toISOString())
        $app.save(recSalvo)
      } catch (_) {}
    }
    return e.json(200, {
      success: false,
      status: 'erro_' + statusCode,
      http_status: statusCode,
      duration_ms: duration,
      message: friendly,
      raw_error: safeDetail,
    })
  },
  $apis.requireAuth(),
)
