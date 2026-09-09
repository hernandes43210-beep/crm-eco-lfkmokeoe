migrate(
  (app) => {
    // 1. Adicionar campos tipo_imovel e valor_conta_reais na coleção leads (se não existirem)
    const leadsCol = app.findCollectionByNameOrId('leads')
    let leadsChanged = false

    if (!leadsCol.fields.getByName('tipo_imovel')) {
      leadsCol.fields.add(
        new TextField({
          name: 'tipo_imovel',
          required: false,
        }),
      )
      leadsChanged = true
    }

    if (!leadsCol.fields.getByName('valor_conta_reais')) {
      leadsCol.fields.add(
        new NumberField({
          name: 'valor_conta_reais',
          required: false,
          min: 0,
        }),
      )
      leadsChanged = true
    }

    if (leadsChanged) {
      app.save(leadsCol)
    }

    // 2. Criar coleção site_form_settings para token e status do formulário do site ecoenergy.net.br
    if (!app.hasTable('site_form_settings')) {
      const siteFormSettings = new Collection({
        name: 'site_form_settings',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        viewRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        createRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        updateRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        fields: [
          { name: 'form_token', type: 'text', required: true },
          { name: 'ativo', type: 'bool' },
          { name: 'site_url', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_site_form_settings_token ON site_form_settings (form_token)',
        ],
      })
      app.save(siteFormSettings)

      // Inicializar com um token aleatório seguro de 32 caracteres
      const token = $security.randomString(32)
      const initialSettings = new Record(siteFormSettings)
      initialSettings.set('form_token', token)
      initialSettings.set('ativo', true)
      initialSettings.set('site_url', 'https://ecoenergy.net.br/')
      app.save(initialSettings)
    }

    // 3. Criar coleção site_form_logs para histórico e auditoria de leads recebidos do site
    if (!app.hasTable('site_form_logs')) {
      const siteFormLogs = new Collection({
        name: 'site_form_logs',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        viewRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        createRule: null, // Apenas hooks do servidor criam logs
        updateRule: null,
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        fields: [
          {
            name: 'status_processamento',
            type: 'select',
            required: true,
            values: ['sucesso', 'ignorado', 'erro'],
            maxSelect: 1,
          },
          { name: 'lead_id', type: 'text' },
          { name: 'lead_nome', type: 'text' },
          { name: 'mensagem', type: 'text' },
          { name: 'payload_bruto', type: 'json' },
          { name: 'origem_ip', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_site_form_logs_created ON site_form_logs (created DESC)',
          'CREATE INDEX idx_site_form_logs_status ON site_form_logs (status_processamento)',
        ],
      })
      app.save(siteFormLogs)
    }
  },
  (app) => {
    try {
      const siteFormLogs = app.findCollectionByNameOrId('site_form_logs')
      app.delete(siteFormLogs)
    } catch (_) {}
    try {
      const siteFormSettings = app.findCollectionByNameOrId('site_form_settings')
      app.delete(siteFormSettings)
    } catch (_) {}
    try {
      const leadsCol = app.findCollectionByNameOrId('leads')
      let changed = false
      if (leadsCol.fields.getByName('tipo_imovel')) {
        leadsCol.fields.removeByName('tipo_imovel')
        changed = true
      }
      if (leadsCol.fields.getByName('valor_conta_reais')) {
        leadsCol.fields.removeByName('valor_conta_reais')
        changed = true
      }
      if (changed) app.save(leadsCol)
    } catch (_) {}
  },
)
