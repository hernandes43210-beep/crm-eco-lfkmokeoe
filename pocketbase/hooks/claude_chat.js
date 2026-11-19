// POST /backend/v1/integrations/claude/chat
// Proxy backend -> API da Anthropic (Claude Messages). A chave NUNCA vai ao frontend.
// Prioridade da chave: integracoes_config (chave='claude') > $os.getenv('ANTHROPIC_API_KEY')
// Disponível para Admin/CEO/Engenheiro/Corretor/Vendedor (qualquer usuário autenticado do CRM).

const CLAUDE_MODELO_PADRAO = 'claude-sonnet-4-5'

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
    return 'A Anthropic rejeitou a requisição (modelo indisponível ou dados inválidos). Tente novamente ou peça ao Admin para conferir a integração.'
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

routerAdd(
  'POST',
  '/backend/v1/integrations/claude/chat',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }

    // Chave: banco > env
    let apiKey = ''
    let source = 'none'
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
    let model =
      typeof body.model === 'string' && body.model.trim() ? body.model.trim() : CLAUDE_MODELO_PADRAO

    if (!prompt) {
      return e.json(400, { success: false, error: 'prompt obrigatório' })
    }

    const startTime = new Date().getTime()
    let httpRes = null
    try {
      httpRes = $http.send({
        url: 'https://api.anthropic.com/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model,
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

    const duration = new Date().getTime() - startTime
    const statusCode = httpRes.statusCode

    if (statusCode < 200 || statusCode >= 300) {
      const errData = httpRes.json || {}
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
      model: data.model || model,
      stop_reason: data.stop_reason || '',
      duration_ms: duration,
      source: source,
    })
  },
  $apis.requireAuth(),
)
