// POST /backend/v1/integrations/claude/test (Admin only)
// Executa teste real e leve contra a API da Anthropic (Claude) com a chave ativa ou informada.
// Endpoint: POST https://api.anthropic.com/v1/messages (headers x-api-key + anthropic-version)

routerAdd(
  'POST',
  '/backend/v1/integrations/claude/test',
  (e) => {
    const CLAUDE_MODELO_TESTE = 'claude-sonnet-4-5'

    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, {
        error: 'Apenas administradores podem testar a conexão com a Claude.',
      })
    }

    const body = e.requestInfo().body || {}
    const candidata = typeof body.api_key === 'string' ? body.api_key.trim() : ''

    // Carrega a chave ativa: parâmetro > banco (integracoes_config chave='claude') > env
    let testKey = candidata
    let settingsRec = null
    try {
      const records = $app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'claude'",
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
        testKey = ($os.getenv('ANTHROPIC_API_KEY') || '').trim()
      } catch (_) {}
    }

    if (!testKey) {
      return e.json(400, {
        success: false,
        status: 'erro_sem_chave',
        message: 'Nenhuma chave informada ou configurada no backend. Cole a chave antes de testar.',
      })
    }

    // Chamada mínima real à API de Mensagens da Anthropic (8 tokens de saída)
    const startTime = new Date().getTime()
    let httpRes = null
    try {
      httpRes = $http.send({
        url: 'https://api.anthropic.com/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': testKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: CLAUDE_MODELO_TESTE,
          max_tokens: 8,
          messages: [{ role: 'user', content: 'Responda apenas: OK' }],
        }),
        timeout: 20,
      })
    } catch (httpErr) {
      const errMsg =
        'Falha ao conectar com os servidores da Anthropic: ' +
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
      const successMsg =
        'Chave validada com sucesso com a API da Anthropic (Claude ' + CLAUDE_MODELO_TESTE + ')!'
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

    // Tratamento de erros comuns da Anthropic em português claro, sem expor a chave
    const errData = httpRes.json || {}
    let detail = ''
    if (errData.error && errData.error.message) {
      detail = errData.error.message
    }
    const errTipo = errData.error && errData.error.type ? errData.error.type : ''

    let friendlyMsg =
      'Falha na autenticação da chave da Claude. Verifique se a chave está correta no console da Anthropic (console.anthropic.com).'

    if (statusCode === 401 || statusCode === 403) {
      if (errTipo === 'authentication_error' || detail.indexOf('invalid x-api-key') !== -1) {
        friendlyMsg =
          'Chave da Claude inválida ou expirada. Gere uma nova chave no console da Anthropic (console.anthropic.com) e salve em Integrações.'
      } else if (errTipo === 'permission_error') {
        friendlyMsg =
          'Permissão negada (403): essa chave não tem acesso ao modelo ' +
          CLAUDE_MODELO_TESTE +
          '. Verifique permissões/org no console da Anthropic.'
      } else {
        friendlyMsg =
          'Falha de autenticação (' +
          statusCode +
          '): a chave pode estar inválida ou sem permissão. Confira no console da Anthropic.'
      }
    } else if (statusCode === 400 && errTipo === 'invalid_request_error') {
      friendlyMsg =
        'Requisição rejeitada pela Anthropic (400): a chave foi aceita, mas o modelo pode não estar disponível para ela. Verifique o console da Anthropic.'
    } else if (statusCode === 404) {
      friendlyMsg =
        'Modelo ' +
        CLAUDE_MODELO_TESTE +
        ' não encontrado para essa chave (404). Verifique o console da Anthropic.'
    } else if (statusCode === 429) {
      friendlyMsg =
        'Limite de uso (rate limit) atingido na API da Anthropic. A chave é válida, mas aguarde alguns instantes ou revise o plano/créditos.'
    } else if (
      detail.indexOf('credit') !== -1 ||
      detail.indexOf('billing') !== -1 ||
      detail.indexOf('balance') !== -1
    ) {
      friendlyMsg =
        'A chave é válida, mas a conta da Anthropic está sem crédito/saldo ativo. Verifique o faturamento no console da Anthropic.'
    } else if (detail) {
      const sanitizedDetail = detail.replace(/sk-ant-[A-Za-z0-9_-]+/g, '[CHAVE_PROTEGIDA]')
      friendlyMsg = 'Erro retornado pela Anthropic (' + statusCode + '): ' + sanitizedDetail
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
