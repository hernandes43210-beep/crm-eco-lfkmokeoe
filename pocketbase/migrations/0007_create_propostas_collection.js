migrate(
  (app) => {
    const leadsCol = app.findCollectionByNameOrId('leads')
    const kitsCol = app.findCollectionByNameOrId('kits')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Coleção de Propostas
    if (!app.hasTable('propostas')) {
      const propostas = new Collection({
        name: 'propostas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        fields: [
          {
            name: 'lead',
            type: 'relation',
            required: true,
            collectionId: leadsCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'kit',
            type: 'relation',
            required: false,
            collectionId: kitsCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'criado_por',
            type: 'relation',
            required: false,
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'kit_nome', type: 'text', required: true },
          { name: 'kit_potencia_kw', type: 'number', min: 0 },
          { name: 'kit_fabricante', type: 'text' },
          { name: 'custo', type: 'number', required: true, min: 0 },
          { name: 'margem', type: 'number', required: true, min: 0, max: 99 },
          { name: 'preco_venda', type: 'number', required: true, min: 0 },
          { name: 'validade_dias', type: 'number', min: 1 },
          { name: 'data_validade', type: 'date', required: true },
          { name: 'condicoes_pagamento', type: 'text' },
          { name: 'observacoes', type: 'text' },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['Rascunho', 'Enviada', 'Aceita', 'Recusada'],
            maxSelect: 1,
          },
          { name: 'token_publico', type: 'text', required: true },
          { name: 'data_aceite', type: 'date' },
          { name: 'aceito_por_nome', type: 'text' },
          { name: 'aceito_por_ip', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_propostas_token ON propostas (token_publico)',
          'CREATE INDEX idx_propostas_lead ON propostas (lead)',
          'CREATE INDEX idx_propostas_status ON propostas (status)',
          'CREATE INDEX idx_propostas_validade ON propostas (data_validade)',
          'CREATE INDEX idx_propostas_created ON propostas (created DESC)',
        ],
      })
      app.save(propostas)
    }
  },
  (app) => {
    try {
      const propostas = app.findCollectionByNameOrId('propostas')
      app.delete(propostas)
    } catch (_) {}
  },
)
