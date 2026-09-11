// GET /backend/v1/integrations/clicksign/status
// Retorna o status de conexão da Clicksign (se o token está configurado, o host e o modo)
// Requer autenticação do CRM.

routerAdd(
  'GET',
  '/backend/v1/integrations/clicksign/status',
  (e) => {
    let token = ''
    try {
      token = $os.getenv('CLICKSIGN_API_TOKEN') || ''
    } catch (_) {}

    let apiUrl = ''
    try {
      apiUrl = $os.getenv('CLICKSIGN_API_URL') || 'https://app.clicksign.com'
    } catch (_) {}

    if (!apiUrl) apiUrl = 'https://app.clicksign.com'
    if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1)

    const isConfigured = !!token && token.trim().length > 0
    const isSandbox = apiUrl.indexOf('sandbox') !== -1

    return e.json(200, {
      configured: isConfigured,
      host: apiUrl,
      ambiente: isSandbox ? 'sandbox' : 'producao',
      masked_token: isConfigured
        ? token.trim().slice(0, 4) + '••••••••' + token.trim().slice(-4)
        : null,
    })
  },
  $apis.requireAuth(),
)
