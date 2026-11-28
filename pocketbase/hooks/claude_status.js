// GET /backend/v1/integrations/claude/status
// Retorna o status de configuração da API da Anthropic (Claude)
// Prioridade: integracoes_config (chave='claude') > $os.getenv('ANTHROPIC_API_KEY')
// NUNCA expõe a chave completa. Retorna máscara segura.

routerAdd(
  'GET',
  '/backend/v1/integrations/claude/status',
  (e) => {
    const CLAUDE_MODELO_PADRAO = 'claude-sonnet-5-5'
    const MODELOS_DISPONIVEIS = [
      'claude-sonnet-5-5',
      'claude-sonnet-4-5',
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
    ]

    let apiKey = ''
    let source = 'none'
    let ultimoTesteStatus = ''
    let ultimoTesteMensagem = ''
    let ultimoTesteEm = ''
    let settingsId = ''
    let modeloConfigurado = ''
    let workspaceId = ''

    // 1. Tentar ler da coleção integracoes_config
    try {
      const records = $app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'claude'",
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
        try {
          const extras = rec.getString('dados_extras') || ''
          if (extras) {
            const extrasObj = JSON.parse(extras)
            if (extrasObj && typeof extrasObj.modelo === 'string' && extrasObj.modelo.trim()) {
              modeloConfigurado = extrasObj.modelo.trim()
            }
            if (
              extrasObj &&
              typeof extrasObj.workspace_id === 'string' &&
              extrasObj.workspace_id.trim()
            ) {
              workspaceId = extrasObj.workspace_id.trim()
            }
          }
        } catch (_) {}
      }
    } catch (_) {}

    // 2. Fallback para variável de ambiente
    if (!apiKey) {
      try {
        const envKey = ($os.getenv('ANTHROPIC_API_KEY') || '').trim()
        if (envKey) {
          apiKey = envKey
          source = 'env'
        }
      } catch (_) {}
    }

    const isConfigured = !!apiKey && apiKey.length > 0

    // Máscara segura: ex. sk-ant-••••••••ABCD
    let masked = null
    if (isConfigured) {
      const clean = apiKey.trim()
      if (clean.length > 10) {
        masked = clean.slice(0, 7) + '••••••••' + clean.slice(-4)
      } else {
        masked = '••••••••' + clean.slice(-2)
      }
    }

    return e.json(200, {
      configured: isConfigured,
      source: source, // "database" | "env" | "none"
      masked_key: masked,
      settings_id: settingsId,
      model_default: CLAUDE_MODELO_PADRAO,
      model_configured: modeloConfigurado,
      model_effective: modeloConfigurado || CLAUDE_MODELO_PADRAO,
      workspace_id: workspaceId,
      modelos_disponiveis: MODELOS_DISPONIVEIS,
      ultimo_teste_status: ultimoTesteStatus,
      ultimo_teste_mensagem: ultimoTesteMensagem,
      ultimo_teste_em: ultimoTesteEm,
    })
  },
  $apis.requireAuth(),
)
