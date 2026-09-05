// GET /backend/v1/integrations/luvik/settings (Admin only)
// POST /backend/v1/integrations/luvik/regenerate-token (Admin only)
// GET /backend/v1/integrations/luvik/logs (Admin only)

routerAdd(
  'GET',
  '/backend/v1/integrations/luvik/settings',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, {
        error: 'Apenas administradores podem acessar as configurações de integração.',
      })
    }

    let settings = null
    try {
      const list = $app.findRecordsByFilter('luvik_settings', '', '-created', 1, 0)
      if (list && list.length > 0) {
        settings = list[0]
      }
    } catch (err) {
      return e.json(500, { error: 'Erro ao buscar configurações do Luvik: ' + err.message })
    }

    if (!settings) {
      // Cria registro se não existir
      try {
        const col = $app.findCollectionByNameOrId('luvik_settings')
        settings = new Record(col)
        settings.set('webhook_token', $security.randomString(32))
        settings.set('ativo', true)
        $app.save(settings)
      } catch (createErr) {
        return e.json(500, { error: 'Erro ao inicializar token: ' + createErr.message })
      }
    }

    return e.json(200, {
      id: settings.id,
      webhook_token: settings.getString('webhook_token'),
      ativo: settings.getBool('ativo'),
      created: settings.getString('created'),
      updated: settings.getString('updated'),
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/integrations/luvik/regenerate-token',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, { error: 'Apenas administradores podem regenerar o token.' })
    }

    let settings = null
    try {
      const list = $app.findRecordsByFilter('luvik_settings', '', '-created', 1, 0)
      if (list && list.length > 0) {
        settings = list[0]
      }
    } catch (err) {
      return e.json(500, { error: 'Erro ao buscar configurações: ' + err.message })
    }

    const col = $app.findCollectionByNameOrId('luvik_settings')
    const newToken = $security.randomString(32)

    if (!settings) {
      settings = new Record(col)
      settings.set('ativo', true)
    }

    settings.set('webhook_token', newToken)

    try {
      $app.save(settings)
    } catch (saveErr) {
      return e.json(500, { error: 'Erro ao salvar novo token: ' + saveErr.message })
    }

    return e.json(200, {
      success: true,
      message: 'Token regenerado com sucesso!',
      webhook_token: newToken,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/integrations/luvik/logs',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, { error: 'Apenas administradores podem ver os logs.' })
    }

    try {
      const logs = $app.findRecordsByFilter('luvik_logs', '', '-created', 50, 0)
      const formatted = []
      for (let i = 0; i < logs.length; i++) {
        const item = logs[i]
        formatted.push({
          id: item.id,
          evento: item.getString('evento'),
          status_processamento: item.getString('status_processamento'),
          lead_id: item.getString('lead_id'),
          lead_nome: item.getString('lead_nome'),
          deal_id: item.getString('deal_id'),
          mensagem: item.getString('mensagem'),
          payload_bruto: item.get('payload_bruto'),
          created: item.getString('created'),
        })
      }
      return e.json(200, { logs: formatted })
    } catch (err) {
      return e.json(500, { error: 'Erro ao buscar logs: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
