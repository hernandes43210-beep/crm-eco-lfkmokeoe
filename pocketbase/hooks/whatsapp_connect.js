// POST /backend/v1/whatsapp/connect
// Cria ou verifica instância na Evolution API v2, configura webhook se necessário e retorna QR code
routerAdd(
  'POST',
  '/backend/v1/whatsapp/connect',
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
      return e.json(400, {
        error: 'WhatsApp não configurado. Por favor, preencha a URL e a API Key nas configurações.',
      })
    }

    let apiUrl = settings.getString('api_url').trim()
    if (apiUrl.endsWith('/')) {
      apiUrl = apiUrl.slice(0, -1)
    }
    const apiKey = settings.getString('api_key').trim()
    const instanceName = settings.getString('instance_name').trim() || 'solarcrm'

    // 1. Verificar estado atual da instância
    let stateRes = null
    try {
      stateRes = $http.send({
        url: apiUrl + '/instance/connectionState/' + encodeURIComponent(instanceName),
        method: 'GET',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10,
      })
    } catch (err) {
      // Pode falhar se a instância não existe ainda
    }

    let state = null
    if (stateRes && stateRes.json && stateRes.json.instance) {
      state = stateRes.json.instance.state
    }

    if (state === 'open') {
      settings.set('connection_status', 'connected')
      try {
        $app.save(settings)
      } catch (_) {}
      return e.json(200, {
        status: 'connected',
        message: 'WhatsApp já está conectado!',
        state: 'open',
      })
    }

    // 2. Se a instância não existir (404), criá-la
    let qrcodeData = null
    if (!stateRes || stateRes.statusCode === 404) {
      try {
        const createRes = $http.send({
          url: apiUrl + '/instance/create',
          method: 'POST',
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instanceName: instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
          timeout: 15,
        })

        if (createRes.json) {
          if (createRes.json.qrcode) {
            qrcodeData = createRes.json.qrcode
          } else if (createRes.json.base64) {
            qrcodeData = { base64: createRes.json.base64, code: createRes.json.code }
          }
        }
      } catch (createErr) {
        // continua para tentar o /instance/connect
      }
    }

    // 3. Se ainda não temos QR code, chamar /instance/connect/{instance}
    if (!qrcodeData || !qrcodeData.base64) {
      try {
        const connectRes = $http.send({
          url: apiUrl + '/instance/connect/' + encodeURIComponent(instanceName),
          method: 'GET',
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 15,
        })

        if (connectRes.statusCode === 200 && connectRes.json) {
          if (connectRes.json.instance && connectRes.json.instance.state === 'open') {
            settings.set('connection_status', 'connected')
            try {
              $app.save(settings)
            } catch (_) {}
            return e.json(200, {
              status: 'connected',
              message: 'WhatsApp conectado com sucesso!',
              state: 'open',
            })
          }

          if (connectRes.json.base64) {
            qrcodeData = {
              base64: connectRes.json.base64,
              code: connectRes.json.code || '',
              pairingCode: connectRes.json.pairingCode || '',
            }
          } else if (connectRes.json.qrcode) {
            qrcodeData = connectRes.json.qrcode
          }
        }
      } catch (connectErr) {
        return e.json(502, {
          error: 'Falha ao conectar com a Evolution API: ' + connectErr.message,
        })
      }
    }

    // 4. Configurar Webhook automaticamente na Evolution API se o PocketBase tiver URL configurada
    const webhookUrl = settings.getString('webhook_url')
    if (webhookUrl) {
      try {
        $http.send({
          url: apiUrl + '/webhook/set/' + encodeURIComponent(instanceName),
          method: 'POST',
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: webhookUrl,
              webhookByEvents: false,
              events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
            },
          }),
          timeout: 10,
        })
      } catch (_) {}
    }

    settings.set('connection_status', 'connecting')
    try {
      $app.save(settings)
    } catch (_) {}

    return e.json(200, {
      status: 'connecting',
      instance_name: instanceName,
      qrcode: qrcodeData,
    })
  },
  $apis.requireAuth(),
)
