// POST /backend/v1/integrations/claude/settings (Admin only)
// Salva ou atualiza a chave da API da Anthropic (Claude) e o modelo em 'integracoes_config'
// (chave='claude'); o modelo vai em dados_extras JSON. NUNCA expõe a chave completa.

routerAdd(
  'POST',
  '/backend/v1/integrations/claude/settings',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }
    if (auth.getString('role') !== 'Admin') {
      return e.json(403, {
        error: 'Apenas administradores podem alterar as configurações da API da Claude.',
      })
    }

    const body = e.requestInfo().body || {}
    const rawApiKey = typeof body.api_key === 'string' ? body.api_key.trim() : null
    const rawModelo = typeof body.modelo === 'string' ? body.modelo.trim() : null

    if (rawApiKey === null || (rawApiKey === '' && rawModelo === null)) {
      return e.json(400, {
        error:
          'A chave da API da Claude é obrigatória. Cole a chave obtida no console da Anthropic.',
      })
    }

    let rec = null
    try {
      const records = $app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'claude'",
        '-created',
        1,
        0,
      )
      if (records && records.length > 0) {
        rec = records[0]
      }
    } catch (_) {}

    const col = $app.findCollectionByNameOrId('integracoes_config')
    if (!rec) {
      rec = new Record(col)
      rec.set('chave', 'claude')
      rec.set(
        'descricao',
        'Chave da API Anthropic (Claude) — análise de leads, textos e assistência ao vendedor',
      )
    }

    // Preserva dados_extras existentes, atualizando apenas o modelo
    let extrasObj = {}
    try {
      const extrasRaw = rec.getString('dados_extras') || ''
      if (extrasRaw) {
        extrasObj = JSON.parse(extrasRaw)
      }
    } catch (_) {}

    if (rawApiKey) {
      rec.set('api_key', rawApiKey)
    }
    rec.set('ativo', true)
    if (rawModelo) {
      extrasObj.modelo = rawModelo
      rec.set('dados_extras', JSON.stringify(extrasObj))
    }

    try {
      $app.save(rec)
    } catch (saveErr) {
      return e.json(500, {
        error:
          'Erro ao salvar chave da Claude no backend: ' +
          (saveErr && saveErr.message ? saveErr.message : 'falha interna.'),
      })
    }

    const currentKey = (rec.getString('api_key') || '').trim()
    let masked = null
    if (currentKey) {
      if (currentKey.length > 10) {
        masked = currentKey.slice(0, 7) + '••••••••' + currentKey.slice(-4)
      } else {
        masked = '••••••••' + currentKey.slice(-2)
      }
    }

    return e.json(200, {
      success: true,
      message: 'Configurações da Claude salvas com sucesso no backend!',
      configured: true,
      source: 'database',
      masked_key: masked,
      modelo: rawModelo || '',
    })
  },
  $apis.requireAuth(),
)
