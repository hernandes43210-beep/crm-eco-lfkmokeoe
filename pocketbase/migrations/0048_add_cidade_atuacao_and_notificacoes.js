migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const leadsCol = app.findCollectionByNameOrId('leads')

    // 1. Adicionar campo cidade_atuacao em users (perfil do vendedor)
    if (!usersCol.fields.getByName('cidade_atuacao')) {
      usersCol.fields.add(
        new TextField({
          name: 'cidade_atuacao',
          required: false,
        }),
      )
      app.save(usersCol)
    }

    // 2. Adicionar campo bairro em leads (se ainda não existir)
    if (!leadsCol.fields.getByName('bairro')) {
      leadsCol.fields.add(
        new TextField({
          name: 'bairro',
          required: false,
        }),
      )
      app.save(leadsCol)
    }

    // 3. Criar collection notificacoes
    if (!app.hasTable('notificacoes')) {
      const notificacoesCol = new Collection({
        name: 'notificacoes',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (usuario = @request.auth.id || @request.auth.role = 'Admin')",
        viewRule:
          "@request.auth.id != '' && (usuario = @request.auth.id || @request.auth.role = 'Admin')",
        createRule: "@request.auth.id != ''",
        updateRule:
          "@request.auth.id != '' && (usuario = @request.auth.id || @request.auth.role = 'Admin')",
        deleteRule:
          "@request.auth.id != '' && (usuario = @request.auth.id || @request.auth.role = 'Admin')",
        fields: [
          {
            name: 'usuario',
            type: 'relation',
            required: true,
            collectionId: usersCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'lead',
            type: 'relation',
            required: false,
            collectionId: leadsCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'titulo',
            type: 'text',
            required: true,
          },
          {
            name: 'mensagem',
            type: 'text',
            required: true,
          },
          {
            name: 'tipo',
            type: 'select',
            required: true,
            values: ['lead_cidade', 'geral', 'sla', 'contato'],
            maxSelect: 1,
          },
          {
            name: 'lida',
            type: 'bool',
            required: false,
          },
          {
            name: 'lead_nome',
            type: 'text',
            required: false,
          },
          {
            name: 'lead_cidade',
            type: 'text',
            required: false,
          },
          {
            name: 'lead_bairro',
            type: 'text',
            required: false,
          },
          {
            name: 'lead_telefone',
            type: 'text',
            required: false,
          },
          {
            name: 'metadados',
            type: 'json',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_notificacoes_usuario ON notificacoes (usuario)',
          'CREATE INDEX idx_notificacoes_lead ON notificacoes (lead)',
          'CREATE INDEX idx_notificacoes_lida ON notificacoes (lida)',
          'CREATE INDEX idx_notificacoes_created ON notificacoes (created DESC)',
        ],
      })
      app.save(notificacoesCol)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('notificacoes')
      app.delete(col)
    } catch (_) {}

    try {
      const leadsCol = app.findCollectionByNameOrId('leads')
      if (leadsCol.fields.getByName('bairro')) {
        leadsCol.fields.removeByName('bairro')
        app.save(leadsCol)
      }
    } catch (_) {}

    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('cidade_atuacao')) {
        usersCol.fields.removeByName('cidade_atuacao')
        app.save(usersCol)
      }
    } catch (_) {}
  },
)
