// GET /backend/v1/integrations/clicksign/status
// Retorna o status de conexão da Clicksign (se o token está configurado, o host e o modo)
// Prioridade: token persistido no banco (clicksign_settings) > variável de ambiente (CLICKSIGN_API_TOKEN)
// Requer autenticação do CRM.

routerAdd(
  'GET',
  '/backend/v1/integrations/clicksign/status',
  (e) => {
    let token = ''
    let source = 'none'
    let customHost = ''
    let ambienteConfig = ''
    let ultimoTesteStatus = ''
    let ultimoTesteEm = ''
    let settingsId = ''

    // 1. Tentar ler da coleção persistida clicksign_settings
    try {
      const list = $app.findRecordsByFilter('clicksign_settings', '', '-created', 1, 0)
      if (list && list.length > 0) {
        const rec = list[0]
        settingsId = rec.id
        const savedToken = (rec.getString('api_token') || '').trim()
        if (savedToken) {
          token = savedToken
          source = 'database'
        }
        customHost = (rec.getString('api_url') || '').trim()
        ambienteConfig = (rec.getString('ambiente') || '').trim()
        ultimoTesteStatus = (rec.getString('ultimo_teste_status') || '').trim()
        ultimoTesteEm = (rec.getString('ultimo_teste_em') || '').trim()
      }
    } catch (_) {}

    // 2. Fallback para segredo de ambiente se não houver no banco
    if (!token) {
      try {
        const envToken = ($os.getenv('CLICKSIGN_API_TOKEN') || '').trim()
        if (envToken) {
          token = envToken
          source = 'env'
        }
      } catch (_) {}
    }

    let apiUrl = customHost
    if (!apiUrl) {
      try {
        apiUrl = ($os.getenv('CLICKSIGN_API_URL') || 'https://app.clicksign.com').trim()
      } catch (_) {}
    }
    if (!apiUrl) apiUrl = 'https://app.clicksign.com'
    if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1)

    const isConfigured = !!token && token.length > 0
    let isSandbox = apiUrl.indexOf('sandbox') !== -1
    if (ambienteConfig === 'sandbox') isSandbox = true
    if (ambienteConfig === 'producao') isSandbox = false

    // Gerar máscara segura (nunca o token completo)
    let masked = null
    if (isConfigured) {
      const clean = token.trim()
      if (clean.length > 8) {
        masked = clean.slice(0, 3) + '••••••••' + clean.slice(-4)
      } else {
        masked = '••••••••' + clean.slice(-2)
      }
    }

    return e.json(200, {
      configured: isConfigured,
      source: source, // "database" | "env" | "none"
      host: apiUrl,
      ambiente: isSandbox ? 'sandbox' : 'producao',
      masked_token: masked,
      settings_id: settingsId,
      ultimo_teste_status: ultimoTesteStatus,
      ultimo_teste_em: ultimoTesteEm,
    })
  },
  $apis.requireAuth(),
)
