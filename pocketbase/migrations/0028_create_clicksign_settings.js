migrate(
  (app) => {
    // Criar coleção clicksign_settings para armazenar token e configurações de forma segura e restrita a Admin
    if (!app.hasTable('clicksign_settings')) {
      const clicksignSettings = new Collection({
        name: 'clicksign_settings',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        viewRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        createRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        updateRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        fields: [
          { name: 'api_token', type: 'text', required: false },
          { name: 'api_url', type: 'text', required: false },
          {
            name: 'ambiente',
            type: 'select',
            required: false,
            values: ['producao', 'sandbox'],
            maxSelect: 1,
          },
          { name: 'ativo', type: 'bool' },
          { name: 'ultimo_teste_status', type: 'text' },
          { name: 'ultimo_teste_em', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [],
      })
      app.save(clicksignSettings)
    }
  },
  (app) => {
    try {
      const clicksignSettings = app.findCollectionByNameOrId('clicksign_settings')
      app.delete(clicksignSettings)
    } catch (_) {}
  },
)
