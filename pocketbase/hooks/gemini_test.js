// POST /backend/v1/integrations/gemini/test (Admin only)
// Executa teste real e leve contra a API do Google Gemini com a chave ativa ou informada.
// Chama GET https://generativelanguage.googleapis.com/v1beta/models?key=... (chamada leve de listagem de modelos).

routerAdd(
  'POST',
  '/backend/v1/integrations/gemini/test',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, {
        error: 'Apenas administradores podem testar a conexão com o Gemini.',
      })
    }

    const body = e.requestInfo().body || {}
    let testKey = typeof body.api_key === 'string' ? body.api_key.trim() : ''

    let settingsRec = null
    try {
      const records = $app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'gemini'",
        '-created',
        1,
        0,
      )
      if (records && records.length > 0) {
        settingsRec = records[0]
        if (!testKey) {
          testKey = (settingsRec.getString('api_key') || '').trim()
        }
      }
    } catch (_) {}

    if (!testKey) {
      try {
        testKey = ($os.getenv('GEMINI_API_KEY') || '').trim()
      } catch (_) {}
    }

    if (!testKey) {
      return e.json(400, {
        success: false,
        status: 'erro_sem_chave',
        message: 'Nenhuma chave informada ou configurada no backend. Cole a chave antes de testar.',
      })
    }

    // Chamada leve à API oficial do Google AI: listar modelos v1beta
    const testUrl =
      'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=' + testKey

    const startTime = new Date().getTime()
    let httpRes = null
    try {
      httpRes = $http.send({
        url: testUrl,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })
    } catch (httpErr) {
      const errMsg =
        'Falha ao conectar com os servidores do Google: ' +
        (httpErr && httpErr.message ? httpErr.message : 'tempo limite esgotado.')
      if (settingsRec) {
        try {
          settingsRec.set('ultimo_teste_status', 'erro_conexao')
          settingsRec.set('ultimo_teste_mensagem', errMsg)
          settingsRec.set('ultimo_teste_em', new Date().toISOString())
          $app.save(settingsRec)
        } catch (_) {}
      }
      return e.json(200, {
        success: false,
        status: 'erro_conexao',
        message: errMsg,
      })
    }

    const duration = new Date().getTime() - startTime
    const statusCode = httpRes.statusCode

    if (statusCode >= 200 && statusCode < 300) {
      const successMsg = 'Chave validada com sucesso com a API do Google Gemini!'
      if (settingsRec) {
        try {
          settingsRec.set('ultimo_teste_status', 'sucesso')
          settingsRec.set('ultimo_teste_mensagem', successMsg)
          settingsRec.set('ultimo_teste_em', new Date().toISOString())
          $app.save(settingsRec)
        } catch (_) {}
      }
      return e.json(200, {
        success: true,
        status: 'sucesso',
        http_status: statusCode,
        duration_ms: duration,
        message: successMsg,
      })
    }

    // Tratamento de erros comuns da API do Google
    const errData = httpRes.json || {}
    let detail = ''
    if (errData.error && errData.error.message) {
      detail = errData.error.message
    }

    let friendlyMsg = 'Chave inválida — confira no Google AI Studio.'
    if (
      detail.indexOf('API key not valid') !== -1 ||
      detail.indexOf('API_KEY_INVALID') !== -1 ||
      statusCode === 400 ||
      statusCode === 403
    ) {
      friendlyMsg = 'Chave inválida — confira no Google AI Studio (aistudio.google.com).'
    } else if (statusCode === 429) {
      friendlyMsg =
        'Limite de requisições temporariamente atingido na sua cota do Google AI Studio.'
    } else if (detail) {
      friendlyMsg = 'Erro retornado pelo Google (' + statusCode + '): ' + detail
    }

    if (settingsRec) {
      try {
        settingsRec.set('ultimo_teste_status', 'erro_' + statusCode)
        settingsRec.set('ultimo_teste_mensagem', friendlyMsg)
        settingsRec.set('ultimo_teste_em', new Date().toISOString())
        $app.save(settingsRec)
      } catch (_) {}
    }

    return e.json(200, {
      success: false,
      status: 'erro_' + statusCode,
      http_status: statusCode,
      duration_ms: duration,
      message: friendlyMsg,
      raw_error: detail,
    })
  },
  $apis.requireAuth(),
)
