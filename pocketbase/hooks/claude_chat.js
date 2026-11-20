// POST /backend/v1/integrations/claude/chat
// Proxy backend -> API da Anthropic (Claude Messages). A chave NUNCA vai ao frontend.
// Prioridade da chave: integracoes_config (chave='claude') > $os.getenv('ANTHROPIC_API_KEY')
// Modelo: body.model > modelo salvo pelo Admin (integracoes_config.dados_extras.modelo) >
// padrão. Em caso de 404/400 "modelo não encontrado", cai em cascata para os alternativos.
// Disponível para Admin/CEO/Engenheiro/Corretor/Vendedor (qualquer usuário autenticado do CRM).

routerAdd(
  'POST',
  '/backend/v1/integrations/claude/chat',
  (e) => {
    const CLAUDE_MODELO_PADRAO = 'claude-sonnet-4-5'
    const MODELOS_ALTERNATIVOS = [
      'claude-sonnet-4-5',
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
    ]

    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }

    // Erro amigável em português, sem expor a chave
    function claudeErroAmigavel(statusCode, errData) {
      const detail = errData && errData.error && errData.error.message ? errData.error.message : ''
      const errTipo = errData && errData.error && errData.error.type ? errData.error.type : ''

      if (statusCode === 401 || statusCode === 403) {
        return 'Chave da Claude inválida ou sem permissão. Peça ao Admin para conferir a chave em Integrações.'
      }
      if (statusCode === 429) {
        return 'Limite de uso da Claude atingido temporariamente. Aguarde alguns instantes e tente novamente.'
      }
      if (
        detail.indexOf('credit') !== -1 ||
        detail.indexOf('billing') !== -1 ||
        detail.indexOf('balance') !== -1
      ) {
        return 'A conta da Anthropic está sem crédito/saldo ativo. Peça ao Admin para verificar o faturamento.'
      }
      if (statusCode === 404 || statusCode === 400) {
        return 'A Anthropic rejeitou a requisição (modelo indisponível ou dados inválidos). Peça ao Admin para conferir a integração em Integrações → Claude (Anthropic).'
      }
      if (detail) {
        return (
          'Erro da Claude (' +
          statusCode +
          '): ' +
          detail.replace(/sk-ant-[A-Za-z0-9_-]+/g, '[CHAVE_PROTEGIDA]')
        )
      }
      return 'Erro inesperado ao chamar a Claude (' + statusCode + ').'
    }

    // Chave e modelo: banco > env
    let apiKey = ''
    let source = 'none'
    let modeloConfigurado = ''
    try {
      const records = $app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'claude'",
        '-created',
        1,
        0,
      )
      if (records && records.length > 0) {
        const saved = (records[0].getString('api_key') || '').trim()
        if (saved) {
          apiKey = saved
          source = 'database'
        }
        try {
          const extras = records[0].getString('dados_extras') || ''
          if (extras) {
            const extrasObj = JSON.parse(extras)
            if (extrasObj && typeof extrasObj.modelo === 'string' && extrasObj.modelo.trim()) {
              modeloConfigurado = extrasObj.modelo.trim()
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
    if (!apiKey) {
      try {
        const envKey = ($os.getenv('ANTHROPIC_API_KEY') || '').trim()
        if (envKey) {
          apiKey = envKey
          source = 'env'
        }
      } catch (_) {}
    }

    if (!apiKey) {
      return e.json(400, {
        success: false,
        error: 'claude_nao_configurada',
        message:
          'A Claude não está configurada. Peça ao Admin para salvar a chave da API da Anthropic em Integrações.',
      })
    }

    const body = e.requestInfo().body || {}
    const system = typeof body.system === 'string' ? body.system : ''
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    let maxTokens = typeof body.max_tokens === 'number' ? body.max_tokens : 1024
    if (!(maxTokens > 0) || maxTokens > 4096) {
      maxTokens = 1024
    }
    const modeloPedido =
      typeof body.model === 'string' && body.model.trim() ? body.model.trim() : ''

    if (!prompt) {
      return e.json(400, { success: false, error: 'prompt obrigatório' })
    }

    // Cascade: modelo pedido > modelo salvo pelo Admin > padrão > alternativos (sem repetir)
    const cadeia = []
    function addModelo(m) {
      if (m && cadeia.indexOf(m) === -1) {
        cadeia.push(m)
      }
    }
    addModelo(modeloPedido)
    addModelo(modeloConfigurado)
    addModelo(CLAUDE_MODELO_PADRAO)
    for (let i = 0; i < MODELOS_ALTERNATIVOS.length; i++) {
      addModelo(MODELOS_ALTERNATIVOS[i])
    }

    const startTime = new Date().getTime()
    let httpRes = null
    let modeloUsado = ''
    let ultimoStatusCode = 0
    let ultimoErrData = {}
    try {
      for (let i = 0; i < cadeia.length; i++) {
        const modelo = cadeia[i]
        let res = null
        try {
          res = $http.send({
            url: 'https://api.anthropic.com/v1/messages',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: modelo,
              max_tokens: maxTokens,
              ...(system ? { system: system } : {}),
              messages: [{ role: 'user', content: prompt }],
            }),
            timeout: 90,
          })
        } catch (httpErr) {
          const errMsg =
            'Falha ao conectar com os servidores da Anthropic: ' +
            (httpErr && httpErr.message ? httpErr.message : 'tempo limite esgotado.')
          return e.json(200, { success: false, error: 'erro_conexao', message: errMsg })
        }
        ultimoStatusCode = res.statusCode
        if (res.statusCode >= 200 && res.statusCode < 300) {
          httpRes = res
          modeloUsado = modelo
          break
        }
        ultimoErrData = res.json || {}
        const errTipo =
          ultimoErrData.error && ultimoErrData.error.type ? ultimoErrData.error.type : ''
        const detail =
          ultimoErrData.error && ultimoErrData.error.message ? ultimoErrData.error.message : ''
        // 404, ou 400 apontando para o modelo: tenta o próximo da cadeia
        const podeTentarProximo =
          res.statusCode === 404 ||
          (res.statusCode === 400 &&
            (errTipo === 'not_found_error' || detail.indexOf('model') !== -1))
        if (!podeTentarProximo) {
          break
        }
      }
    } catch (loopErr) {
      return e.json(200, {
        success: false,
        error: 'erro_inesperado',
        message:
          'Erro inesperado ao chamar a Claude: ' +
          (loopErr && loopErr.message ? loopErr.message : ''),
      })
    }

    const duration = new Date().getTime() - startTime
    const statusCode = ultimoStatusCode

    if (statusCode < 200 || statusCode >= 300 || !httpRes) {
      const errData = ultimoErrData || {}
      return e.json(200, {
        success: false,
        error: 'erro_api',
        http_status: statusCode,
        duration_ms: duration,
        message: claudeErroAmigavel(statusCode, errData),
      })
    }

    const data = httpRes.json || {}
    // Resposta da API de Mensagens: content é uma lista de blocos {type, text}
    let texto = ''
    if (Array.isArray(data.content)) {
      const partes = []
      for (let i = 0; i < data.content.length; i++) {
        const bloco = data.content[i]
        if (bloco && bloco.type === 'text' && typeof bloco.text === 'string') {
          partes.push(bloco.text)
        }
      }
      texto = partes.join('\n')
    }

    if (!texto) {
      return e.json(200, {
        success: false,
        error: 'resposta_vazia',
        message: 'A Claude respondeu, mas sem conteúdo de texto. Tente novamente.',
      })
    }

    return e.json(200, {
      success: true,
      texto: texto,
      model: data.model || modeloUsado,
      stop_reason: data.stop_reason || '',
      duration_ms: duration,
      source: source,
    })
  },
  $apis.requireAuth(),
)
