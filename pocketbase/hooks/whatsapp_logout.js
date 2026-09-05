// POST /backend/v1/whatsapp/logout
// Desconecta a instância da Evolution API (DELETE /instance/logout/{instance})
routerAdd(
  'POST',
  '/backend/v1/whatsapp/logout',
  (e) => {
    let settings = null
    try {
      const list = $app.findRecordsByFilter('whatsapp_settings', '', '-created', 1, 0)
      if (list && list.length > 0) {
        settings = list[0]
      }
    } catch (err) {
      return e.json(500, { error: 'Erro ao carregar configurações: ' + err.message })
    }

    if (!settings || !settings.getString('api_url') || !settings.getString('api_key')) {
      return e.json(400, { error: 'WhatsApp não está configurado.' })
    }

    let apiUrl = settings.getString('api_url').trim()
    if (apiUrl.endsWith('/')) {
      apiUrl = apiUrl.slice(0, -1)
    }
    const apiKey = settings.getString('api_key').trim()
    const instanceName = settings.getString('instance_name').trim() || 'solarcrm'

    let evoRes = null
    try {
      evoRes = $http.send({
        url: apiUrl + '/instance/logout/' + encodeURIComponent(instanceName),
        method: 'DELETE',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })
    } catch (err) {
      // continua para atualizar estado local
    }

    settings.set('connection_status', 'disconnected')
    settings.set('phone_number', '')
    try {
      $app.save(settings)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: 'Instância desconectada com sucesso.',
    })
  },
  $apis.requireAuth(),
)
