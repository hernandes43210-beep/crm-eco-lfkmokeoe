// GET /backend/v1/integrations/site-form/settings (Admin only)
// POST /backend/v1/integrations/site-form/regenerate-token (Admin only)
// GET /backend/v1/integrations/site-form/logs (Admin only)

routerAdd(
  'GET',
  '/backend/v1/integrations/site-form/settings',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, {
        error: 'Apenas administradores podem acessar as configurações do formulário do site.',
      })
    }

    let settings = null
    try {
      const list = $app.findRecordsByFilter('site_form_settings', '', '-created', 1, 0)
      if (list && list.length > 0) {
        settings = list[0]
      }
    } catch (err) {
      return e.json(500, { error: 'Erro ao buscar configurações do formulário: ' + err.message })
    }

    if (!settings) {
      // Cria registro se não existir
      try {
        const col = $app.findCollectionByNameOrId('site_form_settings')
        settings = new Record(col)
        settings.set('form_token', $security.randomString(32))
        settings.set('ativo', true)
        settings.set('site_url', 'https://ecoenergy.net.br/')
        $app.save(settings)
      } catch (createErr) {
        return e.json(500, {
          error: 'Erro ao inicializar token do formulário: ' + createErr.message,
        })
      }
    }

    return e.json(200, {
      id: settings.id,
      form_token: settings.getString('form_token'),
      ativo: settings.getBool('ativo'),
      site_url: settings.getString('site_url'),
      created: settings.getString('created'),
      updated: settings.getString('updated'),
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/integrations/site-form/regenerate-token',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, { error: 'Apenas administradores podem regenerar o token do formulário.' })
    }

    let settings = null
    try {
      const list = $app.findRecordsByFilter('site_form_settings', '', '-created', 1, 0)
      if (list && list.length > 0) {
        settings = list[0]
      }
    } catch (err) {
      return e.json(500, { error: 'Erro ao buscar configurações: ' + err.message })
    }

    const col = $app.findCollectionByNameOrId('site_form_settings')
    const newToken = $security.randomString(32)

    if (!settings) {
      settings = new Record(col)
      settings.set('ativo', true)
      settings.set('site_url', 'https://ecoenergy.net.br/')
    }

    settings.set('form_token', newToken)

    try {
      $app.save(settings)
    } catch (saveErr) {
      return e.json(500, { error: 'Erro ao salvar novo token: ' + saveErr.message })
    }

    return e.json(200, {
      success: true,
      message: 'Token do formulário do site regenerado com sucesso!',
      form_token: newToken,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/integrations/site-form/logs',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, { error: 'Apenas administradores podem ver os logs do formulário.' })
    }

    try {
      const logs = $app.findRecordsByFilter('site_form_logs', '', '-created', 50, 0)
      const formatted = []
      for (let i = 0; i < logs.length; i++) {
        const item = logs[i]
        formatted.push({
          id: item.id,
          status_processamento: item.getString('status_processamento'),
          lead_id: item.getString('lead_id'),
          lead_nome: item.getString('lead_nome'),
          mensagem: item.getString('mensagem'),
          payload_bruto: item.get('payload_bruto'),
          origem_ip: item.getString('origem_ip'),
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
