migrate(
  (app) => {
    // 1. Adicionar campo luvik_deal_id na coleção leads
    const leadsCol = app.findCollectionByNameOrId('leads')
    if (!leadsCol.fields.getByName('luvik_deal_id')) {
      leadsCol.fields.add(
        new TextField({
          name: 'luvik_deal_id',
          required: false,
        }),
      )
      leadsCol.addIndex('idx_leads_luvik_deal_id', false, 'luvik_deal_id', '')
      app.save(leadsCol)
    }

    // 2. Criar coleção luvik_settings para token e status de webhook
    if (!app.hasTable('luvik_settings')) {
      const luvikSettings = new Collection({
        name: 'luvik_settings',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        viewRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        createRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        updateRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        fields: [
          { name: 'webhook_token', type: 'text', required: true },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_luvik_settings_token ON luvik_settings (webhook_token)'],
      })
      app.save(luvikSettings)

      // Inicializar com um token aleatório seguro
      const token = $security.randomString(32)
      const initialSettings = new Record(luvikSettings)
      initialSettings.set('webhook_token', token)
      initialSettings.set('ativo', true)
      app.save(initialSettings)
    }

    // 3. Criar coleção luvik_logs para histórico de eventos recebidos
    if (!app.hasTable('luvik_logs')) {
      const luvikLogs = new Collection({
        name: 'luvik_logs',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        viewRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        createRule: null, // Apenas hooks do servidor criam logs
        updateRule: null,
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        fields: [
          {
            name: 'evento',
            type: 'select',
            required: true,
            values: ['negocio_criado', 'negocio_ganho', 'negocio_perdido', 'desconhecido'],
            maxSelect: 1,
          },
          {
            name: 'status_processamento',
            type: 'select',
            required: true,
            values: ['sucesso', 'ignorado', 'erro'],
            maxSelect: 1,
          },
          { name: 'lead_id', type: 'text' },
          { name: 'lead_nome', type: 'text' },
          { name: 'deal_id', type: 'text' },
          { name: 'mensagem', type: 'text' },
          { name: 'payload_bruto', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_luvik_logs_created ON luvik_logs (created DESC)',
          'CREATE INDEX idx_luvik_logs_deal_id ON luvik_logs (deal_id)',
          'CREATE INDEX idx_luvik_logs_evento ON luvik_logs (evento)',
        ],
      })
      app.save(luvikLogs)
    }
  },
  (app) => {
    try {
      const luvikLogs = app.findCollectionByNameOrId('luvik_logs')
      app.delete(luvikLogs)
    } catch (_) {}
    try {
      const luvikSettings = app.findCollectionByNameOrId('luvik_settings')
      app.delete(luvikSettings)
    } catch (_) {}
    try {
      const leadsCol = app.findCollectionByNameOrId('leads')
      leadsCol.removeIndex('idx_leads_luvik_deal_id')
      leadsCol.fields.removeByName('luvik_deal_id')
      app.save(leadsCol)
    } catch (_) {}
  },
)
