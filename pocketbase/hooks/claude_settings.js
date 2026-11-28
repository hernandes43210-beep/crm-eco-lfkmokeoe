// POST /backend/v1/integrations/claude/settings (Admin only)
// Salva ou atualiza a chave da API da Anthropic (Claude), o modelo e o ID do Workspace
// em 'integracoes_config' (chave='claude'); modelo e workspace_id vão em dados_extras JSON.
// NUNCA expõe a chave completa.
//
// '__MANTER_ATUAL__' como api_key = preserva a chave já salva (o frontend nunca tem a
// chave em claro) e atualiza apenas modelo/workspace_id.
//
// ⚠ Compatibilidade JSVM (goja): sem spread de objeto, sem ?. e sem ??;
// todo o corpo protegido por try/catch que responde 500 com a mensagem real do erro
// (em vez de derrubar a rota com status 0 / 400 genérico).

routerAdd(
  'POST',
  '/backend/v1/integrations/claude/settings',
  (e) => {
    try {
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
      const rawApiKey =
        typeof body.api_key === 'string' && body.api_key.trim() !== '__MANTER_ATUAL__'
          ? body.api_key.trim()
          : ''
      const rawModelo = typeof body.modelo === 'string' ? body.modelo.trim() : null
      const rawWorkspaceId = typeof body.workspace_id === 'string' ? body.workspace_id.trim() : null

      if (rawApiKey === '' && rawModelo === null && rawWorkspaceId === null) {
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

      // Preserva dados_extras existentes, atualizando apenas modelo/workspace_id.
      // O campo JSON pode voltar como string, objeto ou null: tratar os três casos.
      let extrasObj = {}
      try {
        const extrasRaw = rec.get('dados_extras')
        if (extrasRaw && typeof extrasRaw === 'string') {
          const parsed = JSON.parse(extrasRaw)
          if (parsed && typeof parsed === 'object') {
            extrasObj = parsed
          }
        } else if (extrasRaw && typeof extrasRaw === 'object') {
          extrasObj = extrasRaw
        }
      } catch (_) {}

      if (!extrasObj || typeof extrasObj !== 'object') {
        extrasObj = {}
      }

      if (rawApiKey) {
        rec.set('api_key', rawApiKey)
      }
      rec.set('ativo', true)
      if (rawModelo) {
        extrasObj.modelo = rawModelo
      }
      if (rawWorkspaceId !== null) {
        // '' remove o workspace configurado (campo opcional)
        extrasObj.workspace_id = rawWorkspaceId
      }
      if (rawModelo || rawWorkspaceId !== null) {
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

      // Workspace efetivo após o save (o que ficou gravado em dados_extras)
      let workspaceEfetivo = ''
      try {
        const w = extrasObj.workspace_id
        if (typeof w === 'string') {
          workspaceEfetivo = w.trim()
        }
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: 'Configurações da Claude salvas com sucesso no backend!',
        configured: true,
        source: 'database',
        masked_key: masked,
        modelo: rawModelo || '',
        workspace_id: workspaceEfetivo,
      })
    } catch (err) {
      return e.json(500, {
        error:
          'Erro inesperado ao salvar as configurações da Claude: ' +
          (err && err.message ? err.message : String(err)),
      })
    }
  },
  $apis.requireAuth(),
)
