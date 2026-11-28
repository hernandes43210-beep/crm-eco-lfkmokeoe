// 0092: campo workspace_id (text) em integracoes_config para a integração Claude.
// O workspace ID da Anthropic (wrkspc_...) ficava embutido em dados_extras (JSON) e o
// save via hook estourava 400 genérico no JSVM. Agora vira coluna própria, com backfill
// idempotente a partir de dados_extras.workspace_id (quando existir).
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('integracoes_config')

    if (!col.fields.getByName('workspace_id')) {
      col.fields.add(new TextField({ name: 'workspace_id' }))
      app.save(col)
    }

    // Backfill: copia dados_extras.workspace_id -> coluna workspace_id (só quando a coluna está vazia)
    const records = app.findRecordsByFilter('integracoes_config', '', '-created', 500, 0)
    for (let i = 0; i < records.length; i++) {
      const rec = records[i]
      try {
        const atual = (rec.getString('workspace_id') || '').trim()
        if (atual) continue
        const extrasRaw = rec.getString('dados_extras') || ''
        if (!extrasRaw) continue
        const extras = JSON.parse(extrasRaw)
        if (
          extras &&
          typeof extras === 'object' &&
          typeof extras.workspace_id === 'string' &&
          extras.workspace_id.trim()
        ) {
          rec.set('workspace_id', extras.workspace_id.trim())
          app.save(rec)
        }
      } catch (_) {}
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('integracoes_config')
    if (col.fields.getByName('workspace_id')) {
      col.fields.removeByName('workspace_id')
      app.save(col)
    }
  },
)
