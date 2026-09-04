migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Leads collection
    const leads = new Collection({
      name: 'leads',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (proprietario = @request.auth.id || @request.auth.role = 'Admin')",
      deleteRule:
        "@request.auth.id != '' && (proprietario = @request.auth.id || @request.auth.role = 'Admin')",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'telefone', type: 'text' },
        {
          name: 'origem',
          type: 'select',
          required: false,
          values: ['Indicação', 'Site', 'Redes Sociais', 'Evento', 'Parceria', 'Outros'],
          maxSelect: 1,
        },
        { name: 'consumo_mensal_kwh', type: 'number', required: true, min: 0 },
        { name: 'endereco', type: 'text' },
        { name: 'cidade', type: 'text' },
        { name: 'estado', type: 'text', max: 2 },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: [
            'Novo',
            'Contato Feito',
            'Proposta Enviada',
            'Negociação',
            'Fechado Ganho',
            'Fechado Perdido',
          ],
          maxSelect: 1,
        },
        { name: 'pr_post_encerramento', type: 'date' },
        { name: 'sla_dias', type: 'number', min: 1 },
        { name: 'sla_limite', type: 'date' },
        { name: 'pr_assinada_ganho', type: 'bool' },
        {
          name: 'pr_file',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ['application/pdf'],
        },
        { name: 'preco_venda', type: 'number', min: 0 },
        {
          name: 'proprietario',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'historico', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_leads_status ON leads (status)',
        'CREATE INDEX idx_leads_sla_limite ON leads (sla_limite)',
        'CREATE INDEX idx_leads_proprietario ON leads (proprietario)',
        'CREATE UNIQUE INDEX idx_leads_email ON leads (email)',
      ],
    })
    app.save(leads)

    // 2. Kits collection
    const kits = new Collection({
      name: 'kits',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'fabricante', type: 'text' },
        { name: 'potencia_kw', type: 'number', required: true, min: 0 },
        {
          name: 'categoria',
          type: 'select',
          required: true,
          values: ['Residencial', 'Comercial', 'Rural'],
          maxSelect: 1,
        },
        { name: 'custo', type: 'number', required: true, min: 0 },
        { name: 'margem', type: 'number', required: true, min: 0, max: 99 },
        { name: 'preco_venda', type: 'number', min: 0 },
        { name: 'descricao', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_kits_categoria ON kits (categoria)',
        'CREATE INDEX idx_kits_potencia ON kits (potencia_kw)',
      ],
    })
    app.save(kits)

    // 3. Convidados collection
    const convidados = new Collection({
      name: 'convidados',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
      viewRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
      createRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
      fields: [
        { name: 'nome', type: 'text' },
        { name: 'email', type: 'email', required: true },
        {
          name: 'role',
          type: 'select',
          required: true,
          values: ['Admin', 'Vendedor'],
          maxSelect: 1,
        },
        { name: 'codigo_convite', type: 'text', required: true },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_convidados_email ON convidados (email)',
        'CREATE UNIQUE INDEX idx_convidados_codigo ON convidados (codigo_convite)',
      ],
    })
    app.save(convidados)
  },
  (app) => {
    try {
      const convidados = app.findCollectionByNameOrId('convidados')
      app.delete(convidados)
    } catch (_) {}
    try {
      const kits = app.findCollectionByNameOrId('kits')
      app.delete(kits)
    } catch (_) {}
    try {
      const leads = app.findCollectionByNameOrId('leads')
      app.delete(leads)
    } catch (_) {}
  },
)
