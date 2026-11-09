// GET /backend/v1/whatsapp/status
// Verifica o status da conexão com a CONTA DO DONO do CRM (conectada nos
// Conectores do painel Skip, toolkit "whatsapp", modo owner). Sem QR code,
// sem Evolution API: a página só consulta este endpoint.
routerAdd(
  'GET',
  '/backend/v1/whatsapp/status',
  (e) => {
    let conectado = false
    let erro = null

    try {
      const res = $connectors.executeAsOwner('whatsapp', 'WHATSAPP_GET_PHONE_NUMBERS', {})
      if (res && res.successful) {
        const data = res.data || {}
        let numeros = []
        if (Array.isArray(data.data)) {
          numeros = data.data
        } else if (Array.isArray(data.data && data.data.data)) {
          numeros = data.data.data
        } else if (Array.isArray(data)) {
          numeros = data
        }
        conectado = numeros.length > 0
        if (!conectado) {
          erro = 'Nenhum número de WhatsApp encontrado na conta conectada.'
        }
      } else if (res && res.error) {
        erro = String(res.error)
      } else {
        erro = 'Não foi possível verificar a conexão com o WhatsApp.'
      }
    } catch (err) {
      erro = 'Falha ao verificar conexão: ' + (err && err.message ? err.message : String(err))
    }

    return e.json(200, {
      conectado,
      erro,
      fonte: 'skip_connectors',
    })
  },
  $apis.requireAuth(),
)
