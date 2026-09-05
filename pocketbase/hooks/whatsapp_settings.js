// GET /backend/v1/whatsapp/settings - Retorna configuração do WhatsApp (ocultando parcialmente a api_key)
// POST /backend/v1/whatsapp/settings - Salva ou atualiza a configuração (Admin only)
routerAdd(
  'GET',
  '/backend/v1/whatsapp/settings',
  (e) => {
    let settings = null
    try {
      const list = $app.findRecordsByFilter('whatsapp_settings', '', '-created', 1, 0)
      if (list && list.length > 0) {
        settings = list[0]
      }
    } catch (err) {
      return e.json(500, { error: 'Erro ao buscar configurações: ' + err.message })
    }

    if (!settings) {
      return e.json(200, {
        configured: false,
        api_url: '',
        instance_name: 'solarcrm',
        has_key: false,
        connection_status: 'disconnected',
        phone_number: '',
        webhook_url: '',
      })
    }

    const rawKey = settings.getString('api_key')
    const maskedKey =
      rawKey && rawKey.length > 6
        ? rawKey.substring(0, 3) + '••••••••' + rawKey.substring(rawKey.length - 3)
        : rawKey
          ? '••••••••'
          : ''

    return e.json(200, {
      configured: true,
      id: settings.id,
      api_url: settings.getString('api_url'),
      instance_name: settings.getString('instance_name') || 'solarcrm',
      has_key: !!rawKey,
      masked_key: maskedKey,
      connection_status: settings.getString('connection_status') || 'disconnected',
      phone_number: settings.getString('phone_number') || '',
      webhook_url: settings.getString('webhook_url') || '',
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/whatsapp/settings',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, {
        error: 'Apenas administradores podem alterar as configurações do WhatsApp.',
      })
    }

    const body = e.requestInfo().body || {}
    let apiUrl = (body.api_url || '').trim()
    if (apiUrl.endsWith('/')) {
      apiUrl = apiUrl.slice(0, -1)
    }
    const apiKey = (body.api_key || '').trim()
    const instanceName = (body.instance_name || 'solarcrm').trim() || 'solarcrm'
    const webhookUrl = (body.webhook_url || '').trim()

    if (!apiUrl) {
      return e.json(400, { error: 'A URL da Evolution API é obrigatória.' })
    }

    let settings = null
    try {
      const list = $app.findRecordsByFilter('whatsapp_settings', '', '-created', 1, 0)
      if (list && list.length > 0) {
        settings = list[0]
      }
    } catch (_) {}

    const col = $app.findCollectionByNameOrId('whatsapp_settings')
    if (!settings) {
      if (!apiKey) {
        return e.json(400, {
          error: 'A API Key da Evolution API é obrigatória na primeira configuração.',
        })
      }
      settings = new Record(col)
      settings.set('api_url', apiUrl)
      settings.set('api_key', apiKey)
      settings.set('instance_name', instanceName)
      settings.set('webhook_url', webhookUrl)
      settings.set('connection_status', 'disconnected')
    } else {
      settings.set('api_url', apiUrl)
      if (apiKey) {
        settings.set('api_key', apiKey)
      }
      settings.set('instance_name', instanceName)
      if (webhookUrl !== undefined) {
        settings.set('webhook_url', webhookUrl)
      }
    }

    try {
      $app.save(settings)
    } catch (err) {
      return e.json(500, { error: 'Erro ao salvar configurações: ' + err.message })
    }

    return e.json(200, {
      success: true,
      message: 'Configurações do WhatsApp salvas com sucesso!',
      id: settings.id,
      api_url: settings.getString('api_url'),
      instance_name: settings.getString('instance_name'),
      connection_status: settings.getString('connection_status'),
    })
  },
  $apis.requireAuth(),
)
