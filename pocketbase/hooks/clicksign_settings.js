// POST /backend/v1/integrations/clicksign/settings (Admin only)
// Atualiza ou salva o token e parâmetros da Clicksign no banco de dados.
// O token NUNCA é retornado ao cliente.
// POST /backend/v1/integrations/clicksign/test (Admin only)
// Executa teste real e leve contra a API Clicksign v3 com o token ativo e retorna feedback claro.

routerAdd(
  'POST',
  '/backend/v1/integrations/clicksign/settings',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, {
        error: 'Apenas administradores podem alterar as credenciais da Clicksign.',
      })
    }

    const body = e.requestInfo().body || {}
    const rawToken = typeof body.api_token === 'string' ? body.api_token.trim() : null
    const rawUrl = typeof body.api_url === 'string' ? body.api_url.trim() : null
    const rawAmbiente = typeof body.ambiente === 'string' ? body.ambiente.trim() : null

    let rec = null
    try {
      const list = $app.findRecordsByFilter('clicksign_settings', '', '-created', 1, 0)
      if (list && list.length > 0) {
        rec = list[0]
      }
    } catch (_) {}

    const col = $app.findCollectionByNameOrId('clicksign_settings')
    if (!rec) {
      rec = new Record(col)
      rec.set('ativo', true)
    }

    if (rawToken !== null) {
      rec.set('api_token', rawToken)
    }

    if (rawUrl !== null) {
      let cleanUrl = rawUrl
      if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1)
      rec.set('api_url', cleanUrl)
    }

    if (rawAmbiente !== null && (rawAmbiente === 'producao' || rawAmbiente === 'sandbox')) {
      rec.set('ambiente', rawAmbiente)
      if (!rawUrl) {
        rec.set(
          'api_url',
          rawAmbiente === 'sandbox' ? 'https://sandbox.clicksign.com' : 'https://app.clicksign.com',
        )
      }
    }

    try {
      $app.save(rec)
    } catch (saveErr) {
      return e.json(500, {
        error: 'Erro ao salvar configurações da Clicksign: ' + saveErr.message,
      })
    }

    const currentToken = (rec.getString('api_token') || '').trim()
    const isConfigured = !!currentToken
    let masked = null
    if (isConfigured) {
      if (currentToken.length > 8) {
        masked = currentToken.slice(0, 3) + '••••••••' + currentToken.slice(-4)
      } else {
        masked = '••••••••' + currentToken.slice(-2)
      }
    }

    let finalHost = rec.getString('api_url') || 'https://app.clicksign.com'
    if (finalHost.endsWith('/')) finalHost = finalHost.slice(0, -1)
    const finalAmbiente =
      rec.getString('ambiente') || (finalHost.indexOf('sandbox') !== -1 ? 'sandbox' : 'producao')

    return e.json(200, {
      success: true,
      message: 'Token e configurações da Clicksign salvos com sucesso no backend!',
      configured: isConfigured,
      source: 'database',
      ambiente: finalAmbiente,
      host: finalHost,
      masked_token: masked,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/integrations/clicksign/test',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, {
        error: 'Apenas administradores podem testar a conexão com a Clicksign.',
      })
    }

    // 1. Obter token ativo (prioridade banco > env)
    let token = ''
    let baseUrl = ''
    let settingsRec = null
    try {
      const list = $app.findRecordsByFilter('clicksign_settings', '', '-created', 1, 0)
      if (list && list.length > 0) {
        settingsRec = list[0]
        const dbToken = (settingsRec.getString('api_token') || '').trim()
        if (dbToken) token = dbToken
        baseUrl = (settingsRec.getString('api_url') || '').trim()
      }
    } catch (_) {}

    if (!token) {
      try {
        token = ($os.getenv('CLICKSIGN_API_TOKEN') || '').trim()
      } catch (_) {}
    }

    if (!baseUrl) {
      try {
        baseUrl = ($os.getenv('CLICKSIGN_API_URL') || 'https://app.clicksign.com').trim()
      } catch (_) {}
    }
    if (!baseUrl) baseUrl = 'https://app.clicksign.com'
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    if (!token) {
      return e.json(400, {
        success: false,
        status: 'error',
        message: 'Nenhum token configurado no backend. Salve um token antes de testar.',
      })
    }

    // 2. Fazer chamada leve à API Clicksign v3: GET /api/v3/envelopes?page[size]=1
    let httpRes = null
    const startTime = new Date().getTime()
    try {
      httpRes = $http.send({
        url: baseUrl + '/api/v3/envelopes?page[size]=1',
        method: 'GET',
        headers: {
          Authorization: token,
          'Content-Type': 'application/vnd.api+json',
          Accept: 'application/vnd.api+json',
        },
        timeout: 15,
      })
    } catch (httpErr) {
      const errMsg = 'Falha ao conectar com o servidor da Clicksign: ' + httpErr.message
      if (settingsRec) {
        try {
          settingsRec.set('ultimo_teste_status', 'erro_conexao')
          settingsRec.set('ultimo_teste_em', new Date().toISOString())
          $app.save(settingsRec)
        } catch (_) {}
      }
      return e.json(200, {
        success: false,
        status: 'erro_conexao',
        message: errMsg,
        host: baseUrl,
      })
    }

    const duration = new Date().getTime() - startTime
    const statusCode = httpRes.statusCode

    if (statusCode === 200) {
      if (settingsRec) {
        try {
          settingsRec.set('ultimo_teste_status', 'sucesso')
          settingsRec.set('ultimo_teste_em', new Date().toISOString())
          $app.save(settingsRec)
        } catch (_) {}
      }
      return e.json(200, {
        success: true,
        status: 'sucesso',
        message: 'Conexão validada com sucesso com a Clicksign API v3!',
        http_status: 200,
        host: baseUrl,
        duration_ms: duration,
      })
    }

    if (statusCode === 401 || statusCode === 403) {
      if (settingsRec) {
        try {
          settingsRec.set('ultimo_teste_status', 'nao_autorizado')
          settingsRec.set('ultimo_teste_em', new Date().toISOString())
          $app.save(settingsRec)
        } catch (_) {}
      }
      return e.json(200, {
        success: false,
        status: 'nao_autorizado',
        http_status: statusCode,
        message:
          'Token rejeitado pela Clicksign (401/403). Verifique se o token é válido para este ambiente (' +
          baseUrl +
          ').',
        host: baseUrl,
      })
    }

    let detail = 'Retorno HTTP ' + statusCode
    try {
      if (httpRes.json && httpRes.json.errors && httpRes.json.errors[0]) {
        detail = httpRes.json.errors[0].detail || httpRes.json.errors[0].title || detail
      }
    } catch (_) {}

    if (settingsRec) {
      try {
        settingsRec.set('ultimo_teste_status', 'erro_' + statusCode)
        settingsRec.set('ultimo_teste_em', new Date().toISOString())
        $app.save(settingsRec)
      } catch (_) {}
    }

    return e.json(200, {
      success: false,
      status: 'erro_api',
      http_status: statusCode,
      message: 'Resposta inesperada da Clicksign: ' + detail,
      host: baseUrl,
    })
  },
  $apis.requireAuth(),
)
