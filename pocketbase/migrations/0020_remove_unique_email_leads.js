migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('leads')

    // Remove o índice UNIQUE sobre o campo email
    try {
      col.removeIndex('idx_leads_email')
    } catch (_) {}

    // Cria índice normal (não-único) para consultas rápidas por email
    col.addIndex('idx_leads_email', false, 'email', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('leads')
    try {
      col.removeIndex('idx_leads_email')
    } catch (_) {}

    // Reverte para UNIQUE se necessário
    col.addIndex('idx_leads_email', true, 'email', '')
    app.save(col)
  },
)
