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
    // Autenticação via header 'x-goog-api-key' (compatível tanto com chaves clássicas AIza quanto novas AQ.)
    const testUrl = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1'

    const startTime = new Date().getTime()
    let httpRes = null
    try {
      httpRes = $http.send({
        url: testUrl,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': testKey,
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

    // Tratamento de erros comuns da API do Google (401 / 403 / 429) em português claro sem expor a chave
    const errData = httpRes.json || {}
    let detail = ''
    if (errData.error && errData.error.message) {
      detail = errData.error.message
    }

    let friendlyMsg =
      'Falha na autenticação da chave do Gemini. Verifique se a chave está correta no Google AI Studio (aistudio.google.com), se possui restrições de API ou se a Generative Language API está ativada.'

    if (statusCode === 401 || statusCode === 403) {
      if (
        detail.indexOf('API_KEY_INVALID') !== -1 ||
        detail.indexOf('API key not valid') !== -1 ||
        detail.indexOf('not valid') !== -1
      ) {
        friendlyMsg =
          'Chave do Gemini inválida ou expirada. Gere uma nova chave no Google AI Studio (aistudio.google.com) e salve em Integrações.'
      } else if (
        detail.indexOf('PERMISSION_DENIED') !== -1 ||
        detail.indexOf('restricted') !== -1 ||
        detail.indexOf('not enabled') !== -1 ||
        detail.indexOf('SERVICE_DISABLED') !== -1
      ) {
        friendlyMsg =
          'Permissão negada (403): verifique se a Generative Language API está ativada no projeto Google Cloud e se não há restrições de IP/referrer bloqueando a chamada.'
      } else {
        friendlyMsg =
          'Falha de autenticação (' +
          statusCode +
          '): a chave pode estar inválida, com restrições ativadas ou sem permissão na Generative Language API. Confira no Google AI Studio.'
      }
    } else if (statusCode === 429) {
      friendlyMsg =
        'Limite de requisições temporariamente atingido na sua cota do Google AI Studio. Aguarde alguns instantes e tente novamente.'
    } else if (detail) {
      // Sanitiza qualquer fragmento de chave que porventura venha na mensagem do Google
      const sanitizedDetail = detail
        .replace(/AQ\.[A-Za-z0-9_-]+/g, '[CHAVE_PROTEGIDA]')
        .replace(/AIza[A-Za-z0-9_-]+/g, '[CHAVE_PROTEGIDA]')
      friendlyMsg = 'Erro retornado pelo Google (' + statusCode + '): ' + sanitizedDetail
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
