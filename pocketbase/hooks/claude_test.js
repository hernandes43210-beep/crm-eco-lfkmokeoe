// POST /backend/v1/integrations/claude/test (Admin only)
// Executa teste real e leve contra a API da Anthropic (Claude) com a chave ativa ou informada.
// Endpoint: POST https://api.anthropic.com/v1/messages (headers x-api-key + anthropic-version)
// O modelo é o salvo pelo Admin em integracoes_config (dados_extras.modelo). Se ele (ou o
// padrão) der 404/400 "model not found", o teste tenta automaticamente os modelos alternativos
// e valida com o primeiro que responder.

routerAdd(
  'POST',
  '/backend/v1/integrations/claude/test',
  (e) => {
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
    // Workspace opcional: parâmetro digitado > salvo no banco (dados_extras.workspace_id)
    const workspaceParam = typeof body.workspace_id === 'string' ? body.workspace_id.trim() : ''

    // Carrega a chave ativa: parâmetro > banco (integracoes_config chave='claude') > env
    let testKey = candidata
    let settingsRec = null
    let modeloConfigurado = ''
    let workspaceId = ''
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
        try {
          const extras = settingsRec.getString('dados_extras') || ''
          if (extras) {
            const extrasObj = JSON.parse(extras)
            if (extrasObj && typeof extrasObj.modelo === 'string' && extrasObj.modelo.trim()) {
              modeloConfigurado = extrasObj.modelo.trim()
            }
            if (workspaceParam) {
              workspaceId = workspaceParam
            } else if (
              extrasObj &&
              typeof extrasObj.workspace_id === 'string' &&
              extrasObj.workspace_id.trim()
            ) {
              workspaceId = extrasObj.workspace_id.trim()
            }
          }
        } catch (_) {}
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

    // Cascade de modelos: o modelo configurado (ou o padrão) primeiro, depois alternativos
    const MODELOS_ALTERNATIVOS = [
      'claude-sonnet-5-5',
      'claude-sonnet-4-5',
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
    ]
    const modelosTentados = []
    if (modeloConfigurado && MODELOS_ALTERNATIVOS.indexOf(modeloConfigurado) === -1) {
      MODELOS_ALTERNATIVOS.unshift(modeloConfigurado)
    }

    function chamarAnthropic(modelo) {
      // Sem spread de objeto ({...x}): o JSVM (goja) não tem os helpers
      // __spreadValues/__spreadProps gerados por bundlers. Usa Object.assign.
      const headersClaude = Object.assign(
        {},
        {
          'Content-Type': 'application/json',
          'x-api-key': testKey,
          'anthropic-version': '2023-06-01',
        },
      )
      // Enviado apenas quando há ID do Workspace configurado (opcional)
      if (workspaceId) {
        headersClaude['anthropic-workspace-id'] = workspaceId
      }
      const payloadClaude = {
        model: modelo,
        max_tokens: 8,
        messages: [{ role: 'user', content: 'Responda apenas: OK' }],
      }
      return $http.send({
        url: 'https://api.anthropic.com/v1/messages',
        method: 'POST',
        headers: headersClaude,
        body: JSON.stringify(payloadClaude),
        timeout: 20,
      })
    }

    // Chamada mínima real à API de Mensagens da Anthropic (8 tokens de saída)
    const startTime = new Date().getTime()
    let httpRes = null
    let modeloFuncionou = ''
    let ultimoStatusCode = 0
    let ultimoErrData = {}
    try {
      for (let i = 0; i < MODELOS_ALTERNATIVOS.length; i++) {
        const modelo = MODELOS_ALTERNATIVOS[i]
        modelosTentados.push(modelo)
        let res = null
        try {
          res = chamarAnthropic(modelo)
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
        ultimoStatusCode = res.statusCode
        if (res.statusCode >= 200 && res.statusCode < 300) {
          httpRes = res
          modeloFuncionou = modelo
          break
        }
        const errData = res.json || {}
        ultimoErrData = errData
        const errTipo = errData.error && errData.error.type ? errData.error.type : ''
        const detail = errData.error && errData.error.message ? errData.error.message : ''
        // 404 (modelo não existe para essa chave) ou 400 not_found: tenta o próximo modelo.
        const notFound =
          res.statusCode === 404 ||
          (res.statusCode === 400 &&
            (errTipo === 'not_found_error' || detail.indexOf('model') !== -1))
        const podeTentarProximo = notFound || res.statusCode === 400
        if (!podeTentarProximo) {
          break
        }
      }
    } catch (loopErr) {
      return e.json(200, {
        success: false,
        status: 'erro_inesperado',
        message:
          'Erro inesperado ao testar a conexão com a Anthropic: ' +
          (loopErr && loopErr.message ? loopErr.message : ''),
      })
    }

    const duration = new Date().getTime() - startTime
    const statusCode = ultimoStatusCode

    if (httpRes && statusCode >= 200 && statusCode < 300) {
      let successMsg =
        'Chave validada com sucesso com a API da Anthropic (modelo ' + modeloFuncionou + ')!'
      if (modeloFuncionou !== modeloConfigurado) {
        successMsg +=
          ' O modelo configurado (' +
          (modeloConfigurado || 'claude-sonnet-5-5') +
          ') não respondeu para essa chave; os testes e o assistente usarão ' +
          modeloFuncionou +
          '. Atualize o campo Modelo em Integrações se desejar fixá-lo.'
      }
      if (settingsRec) {
        try {
          settingsRec.set('ultimo_teste_status', 'sucesso')
          settingsRec.set('ultimo_teste_mensagem', successMsg)
          settingsRec.set('ultimo_teste_em', new Date().toISOString())
          // Memoriza o modelo que funcionou para o assistente usar a partir de agora
          let extrasObj = {}
          try {
            const extrasRaw = settingsRec.getString('dados_extras') || ''
            if (extrasRaw) {
              extrasObj = JSON.parse(extrasRaw)
            }
          } catch (_) {}
          extrasObj.modelo = modeloFuncionou
          settingsRec.set('dados_extras', JSON.stringify(extrasObj))
          $app.save(settingsRec)
        } catch (_) {}
      }
      return e.json(200, {
        success: true,
        status: 'sucesso',
        http_status: statusCode,
        duration_ms: duration,
        modelo: modeloFuncionou,
        modelos_tentados: modelosTentados,
        message: successMsg,
      })
    }

    // Tratamento de erros comuns da Anthropic em português claro, sem expor a chave
    const errData = ultimoErrData || {}
    let detail = ''
    if (errData.error && errData.error.message) {
      detail = errData.error.message
    }
    const errTipo = errData.error && errData.error.type ? errData.error.type : ''
    const modeloTentado =
      modelosTentados.length > 0 ? modelosTentados[modelosTentados.length - 1] : ''

    let friendlyMsg =
      'Falha na autenticação da chave da Claude. Verifique se a chave está correta no console da Anthropic (console.anthropic.com).'

    if (statusCode === 401 || statusCode === 403) {
      if (errTipo === 'authentication_error' || detail.indexOf('invalid x-api-key') !== -1) {
        friendlyMsg =
          'Chave da Claude inválida ou expirada. Gere uma nova chave no console da Anthropic (console.anthropic.com) e salve em Integrações.'
      } else if (errTipo === 'permission_error') {
        friendlyMsg =
          'Permissão negada (403): essa chave não tem acesso ao modelo ' +
          modeloTentado +
          '. Verifique permissões/org no console da Anthropic.'
      } else {
        friendlyMsg =
          'Falha de autenticação (' +
          statusCode +
          '): a chave pode estar inválida ou sem permissão. Confira no console da Anthropic.'
      }
    } else if (statusCode === 404 || statusCode === 400) {
      const listaTentados = modelosTentados.join(', ')
      friendlyMsg =
        'Nenhum modelo respondeu para essa chave (testados: ' +
        listaTentados +
        '). Verifique no console da Anthropic (console.anthropic.com) quais modelos sua conta/workspace tem acesso e escolha um no campo Modelo.'
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
      modelo: modeloTentado,
      modelos_tentados: modelosTentados,
      message: friendlyMsg,
      raw_error: detail,
    })
  },
  $apis.requireAuth(),
)
