// GET /backend/v1/integrations/gemini/status
// Retorna o status de configuração da API Google Gemini
// Prioridade: integracoes_config (chave='gemini') > $os.getenv('GEMINI_API_KEY')
// NUNCA expõe a chave completa. Retorna máscara segura (ex: AIza••••••••last4)

routerAdd(
  'GET',
  '/backend/v1/integrations/gemini/status',
  (e) => {
    let apiKey = ''
    let source = 'none'
    let ultimoTesteStatus = ''
    let ultimoTesteMensagem = ''
    let ultimoTesteEm = ''
    let settingsId = ''

    // 1. Tentar ler da coleção integracoes_config
    try {
      const records = $app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'gemini'",
        '-created',
        1,
        0,
      )
      if (records && records.length > 0) {
        const rec = records[0]
        settingsId = rec.id
        const savedKey = (rec.getString('api_key') || '').trim()
        if (savedKey) {
          apiKey = savedKey
          source = 'database'
        }
        ultimoTesteStatus = (rec.getString('ultimo_teste_status') || '').trim()
        ultimoTesteMensagem = (rec.getString('ultimo_teste_mensagem') || '').trim()
        ultimoTesteEm = (rec.getString('ultimo_teste_em') || '').trim()
      }
    } catch (_) {}

    // 2. Fallback para variável de ambiente
    if (!apiKey) {
      try {
        const envKey = ($os.getenv('GEMINI_API_KEY') || '').trim()
        if (envKey) {
          apiKey = envKey
          source = 'env'
        }
      } catch (_) {}
    }

    const isConfigured = !!apiKey && apiKey.length > 0

    // Máscara segura: ex. AIza••••••••ABCD
    let masked = null
    if (isConfigured) {
      const clean = apiKey.trim()
      if (clean.length > 8) {
        masked = clean.slice(0, 4) + '••••••••' + clean.slice(-4)
      } else {
        masked = '••••••••' + clean.slice(-2)
      }
    }

    return e.json(200, {
      configured: isConfigured,
      source: source, // "database" | "env" | "none"
      masked_key: masked,
      settings_id: settingsId,
      model_default: 'imagen-3.0-generate-002',
      ultimo_teste_status: ultimoTesteStatus,
      ultimo_teste_mensagem: ultimoTesteMensagem,
      ultimo_teste_em: ultimoTesteEm,
    })
  },
  $apis.requireAuth(),
)
