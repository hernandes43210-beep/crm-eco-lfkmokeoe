// Hooks para integração com Plataforma PHB Solar v1.4.0
// Endpoints:
// GET  /backend/v1/phb/status (Autenticado)
// POST /backend/v1/phb/settings (Admin only)
// POST /backend/v1/phb/testar-conexao (Admin only)
// POST /backend/v1/phb/buscarkits (Autenticado)
// POST /backend/v1/phb/kit-detalhes (Autenticado)
//
// NOTA DE ESCOPO: Todas as funções auxiliares são declaradas inline dentro do corpo de cada callback routerAdd
// para atender às exigências do JSVM do PocketBase (isolamento de pool de VMs).

// 1. GET /backend/v1/phb/status
routerAdd(
  'GET',
  '/backend/v1/phb/status',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }

    let rec = null
    try {
      const records = $app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'phb_solar'",
        '-created',
        1,
        0,
      )
      if (records && records.length > 0) {
        rec = records[0]
      }
    } catch (_) {}

    let token = ''
    let source = 'none'

    if (rec) {
      const dbKey = (rec.getString('api_key') || '').trim()
      if (dbKey) {
        token = dbKey
        source = 'database'
      }
    }

    if (!token) {
      try {
        const envToken = ($os.getenv('PHB_API_TOKEN') || $os.getenv('PHB_SOLAR_TOKEN') || '').trim()
        if (envToken) {
          token = envToken
          source = 'env'
        }
      } catch (_) {}
    }

    let masked = null
    if (token) {
      const clean = token.trim()
      if (clean.length > 10) {
        masked = clean.slice(0, 4) + '••••••••' + clean.slice(-4)
      } else {
        masked = '••••••••' + clean.slice(-2)
      }
    }

    return e.json(200, {
      configured: !!token && token.length > 0,
      source: source,
      masked_token: masked,
      settings_id: rec ? rec.id : null,
      base_url: 'https://plataformaphbsolar.com.br/api/v1',
      ultimo_teste_status: rec ? rec.getString('ultimo_teste_status') : '',
      ultimo_teste_mensagem: rec ? rec.getString('ultimo_teste_mensagem') : '',
      ultimo_teste_em: rec ? rec.getString('ultimo_teste_em') : '',
    })
  },
  $apis.requireAuth(),
)

// 2. POST /backend/v1/phb/settings (Admin only)
routerAdd(
  'POST',
  '/backend/v1/phb/settings',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, {
        error: 'Apenas administradores podem alterar o token da PHB Solar.',
      })
    }

    const body = e.requestInfo().body || {}
    const rawToken =
      typeof body.token === 'string'
        ? body.token.trim()
        : typeof body.api_key === 'string'
          ? body.api_key.trim()
          : null

    if (rawToken === null || rawToken === '') {
      return e.json(400, {
        error: 'O token Bearer da PHB Solar é obrigatório. Cole o token fornecido pela PHB.',
      })
    }

    let rec = null
    try {
      const records = $app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'phb_solar'",
        '-created',
        1,
        0,
      )
      if (records && records.length > 0) {
        rec = records[0]
      }
    } catch (_) {}

    const col = $app.findCollectionByNameOrId('integracoes_config')
    if (!rec) {
      rec = new Record(col)
      rec.set('chave', 'phb_solar')
      rec.set(
        'descricao',
        'Token Bearer da API Plataforma PHB Solar v1.4.0 para busca e importação de kits',
      )
    }

    rec.set('api_key', rawToken)
    rec.set('ativo', true)
    rec.set(
      'dados_extras',
      JSON.stringify({
        base_url: 'https://plataformaphbsolar.com.br/api/v1',
        versao_api: 'v1.4.0',
      }),
    )

    try {
      $app.save(rec)
    } catch (saveErr) {
      return e.json(500, {
        error:
          'Erro ao salvar token da PHB Solar no backend: ' +
          (saveErr && saveErr.message ? saveErr.message : 'falha interna.'),
      })
    }

    let masked = null
    if (rawToken) {
      const clean = rawToken.trim()
      if (clean.length > 10) {
        masked = clean.slice(0, 4) + '••••••••' + clean.slice(-4)
      } else {
        masked = '••••••••' + clean.slice(-2)
      }
    }

    return e.json(200, {
      success: true,
      message: 'Token de acesso da PHB Solar salvo com sucesso no backend!',
      configured: true,
      source: 'database',
      masked_token: masked,
    })
  },
  $apis.requireAuth(),
)

// 3. POST /backend/v1/phb/testar-conexao (Admin only)
routerAdd(
  'POST',
  '/backend/v1/phb/testar-conexao',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, {
        error: 'Apenas administradores podem testar a conexão com a PHB Solar.',
      })
    }

    const body = e.requestInfo().body || {}
    let testToken =
      typeof body.token === 'string'
        ? body.token.trim()
        : typeof body.api_key === 'string'
          ? body.api_key.trim()
          : ''

    let rec = null
    try {
      const records = $app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'phb_solar'",
        '-created',
        1,
        0,
      )
      if (records && records.length > 0) {
        rec = records[0]
      }
    } catch (_) {}

    if (!testToken) {
      if (rec) {
        const dbKey = (rec.getString('api_key') || '').trim()
        if (dbKey) {
          testToken = dbKey
        }
      }
      if (!testToken) {
        try {
          const envToken = (
            $os.getenv('PHB_API_TOKEN') ||
            $os.getenv('PHB_SOLAR_TOKEN') ||
            ''
          ).trim()
          if (envToken) {
            testToken = envToken
          }
        } catch (_) {}
      }
    }

    if (!testToken) {
      return e.json(400, {
        success: false,
        status: 'erro_sem_token',
        message: 'Nenhum token informado ou configurado no backend. Cole o token antes de testar.',
      })
    }

    // Chamada de teste leve: GET https://plataformaphbsolar.com.br/api/v1/modulos
    const testUrl = 'https://plataformaphbsolar.com.br/api/v1/modulos'
    const startTime = new Date().getTime()
    let httpRes = null

    try {
      httpRes = $http.send({
        url: testUrl,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer ' + testToken,
        },
        timeout: 20,
      })
    } catch (httpErr) {
      const errMsg = 'Não foi possível conectar à PHB Solar — tente novamente em instantes.'
      if (rec) {
        try {
          rec.set('ultimo_teste_status', 'erro_conexao')
          rec.set('ultimo_teste_mensagem', errMsg)
          rec.set('ultimo_teste_em', new Date().toISOString())
          $app.save(rec)
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
    const payload = httpRes.json || {}

    if (statusCode >= 200 && statusCode < 300 && payload.status !== 'erro') {
      const totalModulos = Array.isArray(payload.modulos)
        ? payload.modulos.length
        : payload.quantidade || 0
      const successMsg =
        'Conexão OK! Autenticação validada com a Plataforma PHB Solar (' +
        totalModulos +
        ' módulos listados).'

      if (rec) {
        try {
          rec.set('ultimo_teste_status', 'sucesso')
          rec.set('ultimo_teste_mensagem', successMsg)
          rec.set('ultimo_teste_em', new Date().toISOString())
          $app.save(rec)
        } catch (_) {}
      }

      return e.json(200, {
        success: true,
        status: 'sucesso',
        http_status: statusCode,
        duration_ms: duration,
        message: successMsg,
        quantidade_modulos: totalModulos,
      })
    }

    // Tradução e formatação de erros amigáveis
    let friendlyMsg = 'Falha ao autenticar com a PHB Solar.'
    if (statusCode === 401) {
      friendlyMsg = 'Token da PHB Solar inválido ou expirado — verifique na página Integrações.'
    } else if (statusCode === 404) {
      friendlyMsg = 'Recurso não encontrado na plataforma PHB Solar (404).'
    } else if (payload && Array.isArray(payload.erros) && payload.erros.length > 0) {
      friendlyMsg = payload.erros.join('; ')
    } else if (payload && typeof payload.erros === 'string' && payload.erros.trim()) {
      friendlyMsg = payload.erros.trim()
    } else if (payload && typeof payload.mensagem === 'string' && payload.mensagem.trim()) {
      friendlyMsg = payload.mensagem.trim()
    } else if (payload && typeof payload.error === 'string' && payload.error.trim()) {
      friendlyMsg = payload.error.trim()
    } else if (statusCode === 400) {
      friendlyMsg = 'Parâmetros inválidos para a consulta na PHB Solar.'
    } else if (statusCode >= 500) {
      friendlyMsg =
        'Servidor da PHB Solar instável ou fora do ar (HTTP ' +
        statusCode +
        '). Tente novamente mais tarde.'
    }

    if (rec) {
      try {
        rec.set('ultimo_teste_status', 'erro_' + statusCode)
        rec.set('ultimo_teste_mensagem', friendlyMsg)
        rec.set('ultimo_teste_em', new Date().toISOString())
        $app.save(rec)
      } catch (_) {}
    }

    return e.json(200, {
      success: false,
      status: 'erro_' + statusCode,
      http_status: statusCode,
      duration_ms: duration,
      message: friendlyMsg,
      raw_error: payload,
    })
  },
  $apis.requireAuth(),
)

// 4. POST /backend/v1/phb/buscarkits (Autenticado)
// Body: { potencia: number, tensao: string, tipo_estrutura: string }
routerAdd(
  'POST',
  '/backend/v1/phb/buscarkits',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }

    let token = ''
    try {
      const records = $app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'phb_solar'",
        '-created',
        1,
        0,
      )
      if (records && records.length > 0) {
        token = (records[0].getString('api_key') || '').trim()
      }
    } catch (_) {}

    if (!token) {
      try {
        const envToken = ($os.getenv('PHB_API_TOKEN') || $os.getenv('PHB_SOLAR_TOKEN') || '').trim()
        if (envToken) {
          token = envToken
        }
      } catch (_) {}
    }

    if (!token) {
      return e.json(400, {
        error:
          'Token da PHB Solar não configurado no backend. Peça ao Administrador para configurar na tela Integrações.',
        erro_configuracao: true,
      })
    }

    const body = e.requestInfo().body || {}
    const potencia = body.potencia
    const tensao = body.tensao
    const tipoEstrutura = body.tipo_estrutura

    if (!potencia || Number(potencia) <= 0) {
      return e.json(400, {
        error: 'Potência desejada (Wp) é obrigatória e deve ser maior que zero.',
      })
    }
    if (!tensao) {
      return e.json(400, {
        error: 'Tensão da rede é obrigatória (ex: mono_220, tri_220380, mono_127, tri_127220).',
      })
    }
    if (!tipoEstrutura) {
      return e.json(400, {
        error: 'Tipo de estrutura é obrigatório (telhado, solo, solo_monoposte, laje, carport).',
      })
    }

    const queryParams = [
      'potencia=' + encodeURIComponent(potencia),
      'tensao=' + encodeURIComponent(tensao),
      'tipo_estrutura=' + encodeURIComponent(tipoEstrutura),
    ].join('&')

    const url = 'https://plataformaphbsolar.com.br/api/v1/buscarkits?' + queryParams

    let httpRes = null
    try {
      httpRes = $http.send({
        url: url,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer ' + token,
        },
        timeout: 25,
      })
    } catch (httpErr) {
      return e.json(503, {
        error: 'Não foi possível conectar à PHB Solar — tente novamente em instantes.',
        detalhe: httpErr && httpErr.message ? httpErr.message : '',
      })
    }

    const statusCode = httpRes.statusCode
    const payload = httpRes.json || {}

    if (statusCode === 401) {
      return e.json(401, {
        error: 'Token da PHB Solar inválido ou expirado — verifique na página Integrações.',
      })
    }

    if (statusCode >= 200 && statusCode < 300 && payload.status !== 'erro') {
      const kits = Array.isArray(payload.kits) ? payload.kits : []
      return e.json(200, {
        status: 'sucesso',
        quantidade: kits.length,
        kits: kits,
      })
    }

    let friendly = 'Nenhum kit encontrado para esses parâmetros — ajuste a potência ou a estrutura.'
    if (payload && Array.isArray(payload.erros) && payload.erros.length > 0) {
      friendly = payload.erros.join('; ')
    } else if (payload && typeof payload.erros === 'string' && payload.erros.trim()) {
      friendly = payload.erros.trim()
    } else if (payload && typeof payload.mensagem === 'string' && payload.mensagem.trim()) {
      friendly = payload.mensagem.trim()
    } else if (payload && typeof payload.error === 'string' && payload.error.trim()) {
      friendly = payload.error.trim()
    } else if (statusCode >= 500) {
      friendly = 'Não foi possível conectar à PHB Solar — tente novamente em instantes.'
    }

    return e.json(statusCode >= 400 && statusCode < 500 ? statusCode : 400, {
      error: friendly,
      raw: payload,
    })
  },
  $apis.requireAuth(),
)

// 5. POST /backend/v1/phb/kit-detalhes (Autenticado)
// Body: { uid: string }
routerAdd(
  'POST',
  '/backend/v1/phb/kit-detalhes',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }

    let token = ''
    try {
      const records = $app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'phb_solar'",
        '-created',
        1,
        0,
      )
      if (records && records.length > 0) {
        token = (records[0].getString('api_key') || '').trim()
      }
    } catch (_) {}

    if (!token) {
      try {
        const envToken = ($os.getenv('PHB_API_TOKEN') || $os.getenv('PHB_SOLAR_TOKEN') || '').trim()
        if (envToken) {
          token = envToken
        }
      } catch (_) {}
    }

    if (!token) {
      return e.json(400, {
        error:
          'Token da PHB Solar não configurado no backend. Peça ao Administrador para configurar na tela Integrações.',
        erro_configuracao: true,
      })
    }

    const body = e.requestInfo().body || {}
    const uid = typeof body.uid === 'string' ? body.uid.trim() : ''

    if (!uid) {
      return e.json(400, {
        error: 'UID do kit é obrigatório para consultar os detalhes.',
      })
    }

    const url = 'https://plataformaphbsolar.com.br/api/v1/kit/' + encodeURIComponent(uid)

    let httpRes = null
    try {
      httpRes = $http.send({
        url: url,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer ' + token,
        },
        timeout: 25,
      })
    } catch (httpErr) {
      return e.json(503, {
        error: 'Não foi possível conectar à PHB Solar — tente novamente em instantes.',
        detalhe: httpErr && httpErr.message ? httpErr.message : '',
      })
    }

    const statusCode = httpRes.statusCode
    const payload = httpRes.json || {}

    if (statusCode === 401) {
      return e.json(401, {
        error: 'Token da PHB Solar inválido ou expirado — verifique na página Integrações.',
      })
    }

    if (statusCode === 404) {
      return e.json(404, {
        error:
          'Este kit expirou ou não foi encontrado na PHB Solar. A busca é válida por 1 hora — faça uma nova busca.',
      })
    }

    if (statusCode >= 200 && statusCode < 300 && payload.status !== 'erro') {
      return e.json(200, {
        status: 'sucesso',
        kit: payload.kit || payload,
      })
    }

    let friendly = 'Não foi possível obter os detalhes do kit na PHB Solar.'
    if (payload && Array.isArray(payload.erros) && payload.erros.length > 0) {
      friendly = payload.erros.join('; ')
    } else if (payload && typeof payload.erros === 'string' && payload.erros.trim()) {
      friendly = payload.erros.trim()
    } else if (payload && typeof payload.mensagem === 'string' && payload.mensagem.trim()) {
      friendly = payload.mensagem.trim()
    } else if (payload && typeof payload.error === 'string' && payload.error.trim()) {
      friendly = payload.error.trim()
    } else if (statusCode >= 500) {
      friendly = 'Não foi possível conectar à PHB Solar — tente novamente em instantes.'
    }

    return e.json(statusCode >= 400 && statusCode < 500 ? statusCode : 400, {
      error: friendly,
      raw: payload,
    })
  },
  $apis.requireAuth(),
)
