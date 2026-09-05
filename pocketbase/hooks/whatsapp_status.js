// GET /backend/v1/whatsapp/status
// Consulta o status da conexão da instância diretamente na Evolution API
routerAdd(
  'GET',
  '/backend/v1/whatsapp/status',
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
      return e.json(200, {
        configured: false,
        status: 'disconnected',
        state: 'close',
        phone_number: '',
      })
    }

    let apiUrl = settings.getString('api_url').trim()
    if (apiUrl.endsWith('/')) {
      apiUrl = apiUrl.slice(0, -1)
    }
    const apiKey = settings.getString('api_key').trim()
    const instanceName = settings.getString('instance_name').trim() || 'solarcrm'

    let state = 'close'
    let ownerNumber = settings.getString('phone_number') || ''

    try {
      const res = $http.send({
        url: apiUrl + '/instance/connectionState/' + encodeURIComponent(instanceName),
        method: 'GET',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10,
      })

      if (res.statusCode === 200 && res.json && res.json.instance) {
        state = res.json.instance.state || 'close'
        if (res.json.instance.owner) {
          ownerNumber = res.json.instance.owner.replace('@s.whatsapp.net', '')
        }
      } else if (res.statusCode === 404) {
        state = 'not_found'
      }
    } catch (err) {
      state = 'error'
    }

    // Tentar buscar informações adicionais da instância se conectado
    if (state === 'open' && !ownerNumber) {
      try {
        const fetchRes = $http.send({
          url: apiUrl + '/instance/fetchInstances?instanceName=' + encodeURIComponent(instanceName),
          method: 'GET',
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10,
        })
        if (fetchRes.statusCode === 200 && fetchRes.json) {
          let instList = Array.isArray(fetchRes.json) ? fetchRes.json : [fetchRes.json]
          for (let i = 0; i < instList.length; i++) {
            const inst = instList[i]
            const name = inst.name || (inst.instance && inst.instance.instanceName)
            if (name === instanceName) {
              if (inst.owner) {
                ownerNumber = inst.owner.replace('@s.whatsapp.net', '')
              } else if (inst.instance && inst.instance.owner) {
                ownerNumber = inst.instance.owner.replace('@s.whatsapp.net', '')
              }
              break
            }
          }
        }
      } catch (_) {}
    }

    const connStatus =
      state === 'open' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected'
    if (
      settings.getString('connection_status') !== connStatus ||
      (ownerNumber && settings.getString('phone_number') !== ownerNumber)
    ) {
      settings.set('connection_status', connStatus)
      if (ownerNumber) {
        settings.set('phone_number', ownerNumber)
      }
      try {
        $app.save(settings)
      } catch (_) {}
    }

    return e.json(200, {
      configured: true,
      instance_name: instanceName,
      status: connStatus,
      state: state,
      phone_number: ownerNumber || settings.getString('phone_number') || '',
    })
  },
  $apis.requireAuth(),
)
