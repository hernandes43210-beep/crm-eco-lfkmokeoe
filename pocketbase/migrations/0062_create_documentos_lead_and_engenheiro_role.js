migrate(
  (app) => {
    // 1. Atualizar SelectField 'role' na coleção 'users' para incluir 'Engenheiro'
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const userRoleField = usersCol.fields.getByName('role')
    if (userRoleField) {
      usersCol.fields.removeByName('role')
    }
    usersCol.fields.add(
      new SelectField({
        name: 'role',
        required: false,
        values: ['Admin', 'Vendedor', 'Engenheiro'],
        maxSelect: 1,
      }),
    )
    app.save(usersCol)

    // 2. Atualizar SelectField 'role' na coleção 'convidados' para incluir 'Engenheiro'
    const convidadosCol = app.findCollectionByNameOrId('convidados')
    const convRoleField = convidadosCol.fields.getByName('role')
    if (convRoleField) {
      convidadosCol.fields.removeByName('role')
    }
    convidadosCol.fields.add(
      new SelectField({
        name: 'role',
        required: true,
        values: ['Admin', 'Vendedor', 'Engenheiro'],
        maxSelect: 1,
      }),
    )
    app.save(convidadosCol)

    // 3. Atualizar SelectField 'tipo' na coleção 'notificacoes' para permitir 'documentos_engenharia'
    const notifCol = app.findCollectionByNameOrId('notificacoes')
    const notifTipoField = notifCol.fields.getByName('tipo')
    if (notifTipoField) {
      notifCol.fields.removeByName('tipo')
    }
    notifCol.fields.add(
      new SelectField({
        name: 'tipo',
        required: false,
        values: ['lead_cidade', 'geral', 'sla', 'contato', 'documentos_engenharia'],
        maxSelect: 1,
      }),
    )
    app.save(notifCol)

    // 4. Criar coleção 'documentos_lead'
    if (!app.hasTable('documentos_lead')) {
      const leadsCol = app.findCollectionByNameOrId('leads')

      const documentosLeadCol = new Collection({
        name: 'documentos_lead',
        type: 'base',
        // RLS:
        // - Usuários autenticados podem ver documentos se forem Admin, Vendedor (ou criador do doc),
        //   OU se forem o engenheiro_destino designado.
        listRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || engenheiro_destino = @request.auth.id || enviado_por = @request.auth.id)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || engenheiro_destino = @request.auth.id || enviado_por = @request.auth.id)",
        createRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || enviado_por = @request.auth.id || engenheiro_destino = @request.auth.id)",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || enviado_por = @request.auth.id)",
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
            name: 'categoria',
            type: 'select',
            required: true,
            values: [
              'documentos_pessoais',
              'conta_energia',
              'datasheet_equipamentos',
              'procuracao',
            ],
            maxSelect: 1,
          },
          {
            name: 'arquivo',
            type: 'file',
            required: true,
            maxSelect: 1,
            maxSize: 31457280, // 30MB
            mimeTypes: [
              'application/pdf',
              'image/jpeg',
              'image/png',
              'image/webp',
              'application/zip',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ],
          },
          {
            name: 'nome_original',
            type: 'text',
            required: false,
          },
          {
            name: 'tamanho_bytes',
            type: 'number',
            required: false,
          },
          {
            name: 'enviado_por',
            type: 'relation',
            required: false,
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'engenheiro_destino',
            type: 'relation',
            required: false,
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'status_envio',
            type: 'select',
            required: false,
            values: ['pendente', 'enviado', 'reenviado'],
            maxSelect: 1,
          },
          {
            name: 'enviado_em',
            type: 'date',
            required: false,
          },
          {
            name: 'visualizado_em',
            type: 'date',
            required: false,
          },
          {
            name: 'observacoes',
            type: 'text',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_docs_lead_lead ON documentos_lead (lead)',
          'CREATE INDEX idx_docs_lead_categoria ON documentos_lead (categoria)',
          'CREATE INDEX idx_docs_lead_engenheiro ON documentos_lead (engenheiro_destino)',
          'CREATE INDEX idx_docs_lead_status ON documentos_lead (status_envio)',
          'CREATE INDEX idx_docs_lead_created ON documentos_lead (created DESC)',
        ],
      })

      app.save(documentosLeadCol)
    }
  },
  (app) => {
    try {
      const documentosLeadCol = app.findCollectionByNameOrId('documentos_lead')
      app.delete(documentosLeadCol)
    } catch (_) {}

    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const userRoleField = usersCol.fields.getByName('role')
      if (userRoleField) {
        usersCol.fields.removeByName('role')
      }
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          required: false,
          values: ['Admin', 'Vendedor'],
          maxSelect: 1,
        }),
      )
      app.save(usersCol)
    } catch (_) {}

    try {
      const convidadosCol = app.findCollectionByNameOrId('convidados')
      const convRoleField = convidadosCol.fields.getByName('role')
      if (convRoleField) {
        convidadosCol.fields.removeByName('role')
      }
      convidadosCol.fields.add(
        new SelectField({
          name: 'role',
          required: true,
          values: ['Admin', 'Vendedor'],
          maxSelect: 1,
        }),
      )
      app.save(convidadosCol)
    } catch (_) {}
  },
)
