// POST /backend/v1/integrations/claude/settings (Admin only)
// Salva ou atualiza a chave da API da Anthropic (Claude), o modelo e o ID do Workspace
// em 'integracoes_config' (chave='claude').
// workspace_id: coluna própria de texto (migration 0092) + espelho em dados_extras JSON
// (cortesia para hooks antigos; um falha, o outro mantém o valor).
// NUNCA expõe a chave completa.
//
// '__MANTER_ATUAL__' como api_key = preserva a chave já salva (o frontend nunca tem a
// chave em claro) e atualiza apenas modelo/workspace_id.
//
// ⚠ Compatibilidade JSVM (goja): SEM spread de objeto/array, SEM ?. e SEM ??;
// todo o corpo protegido por try/catch que responde com a mensagem REAL do erro
// (em vez de derrubar a rota com o 400 genérico "Something went wrong...").

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

      let body = {}
      try {
        const info = e.requestInfo()
        if (info && info.body && typeof info.body === 'object') {
          body = info.body
        }
      } catch (_) {}

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

      if (rawApiKey) {
        rec.set('api_key', rawApiKey)
      }
      rec.set('ativo', true)
      if (rawModelo) {
        rec.set('modelo', rawModelo)
      }
      if (rawWorkspaceId !== null) {
        // '' remove o workspace configurado (campo opcional)
        rec.set('workspace_id', rawWorkspaceId)
      }

      // Espelha em dados_extras (JSON) para hooks antigos que ainda leem de lá.
      // Qualquer falha aqui não derruba o save — a coluna própria já tem o valor.
      let espelhoOk = true
      try {
        let extrasObj = {}
        const extrasRaw = rec.get('dados_extras')
        if (extrasRaw && typeof extrasRaw === 'string') {
          const parsed = JSON.parse(extrasRaw)
          if (parsed && typeof parsed === 'object') {
            extrasObj = parsed
          }
        } else if (extrasRaw && typeof extrasRaw === 'object') {
          extrasObj = extrasRaw
        }
        if (!extrasObj || typeof extrasObj !== 'object') {
          extrasObj = {}
        }
        if (rawModelo) {
          extrasObj.modelo = rawModelo
        }
        if (rawWorkspaceId !== null) {
          extrasObj.workspace_id = rawWorkspaceId
        }
        if (rawModelo || rawWorkspaceId !== null) {
          rec.set('dados_extras', JSON.stringify(extrasObj))
        }
      } catch (_) {
        espelhoOk = false
      }

      try {
        $app.save(rec)
      } catch (saveErr) {
        // Retry sem o espelho JSON: se o campo dados_extras for o motivo da falha
        // (ex.: valor não serializável vindo do banco), a coluna própria salva igual.
        if (!espelhoOk) {
          try {
            rec.set('dados_extras', '')
            $app.save(rec)
          } catch (retryErr) {
            return e.json(500, {
              error:
                'Erro ao salvar as configurações da Claude no backend: ' +
                (retryErr && retryErr.message ? retryErr.message : 'falha interna.'),
            })
          }
        } else {
          return e.json(500, {
            error:
              'Erro ao salvar as configurações da Claude no backend: ' +
              (saveErr && saveErr.message ? saveErr.message : 'falha interna.'),
          })
        }
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

      // Workspace efetivo após o save (releitura do registro gravado)
      let workspaceEfetivo = ''
      try {
        const w = rec.getString('workspace_id') || ''
        workspaceEfetivo = w.trim()
        if (!workspaceEfetivo) {
          const extrasRaw = rec.get('dados_extras')
          if (extrasRaw && typeof extrasRaw === 'string' && extrasRaw) {
            const parsed = JSON.parse(extrasRaw)
            if (parsed && typeof parsed.workspace_id === 'string') {
              workspaceEfetivo = parsed.workspace_id.trim()
            }
          }
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
