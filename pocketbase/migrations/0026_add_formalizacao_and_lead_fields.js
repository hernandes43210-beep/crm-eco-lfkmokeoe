migrate(
  (app) => {
    const leadsCol = app.findCollectionByNameOrId('leads')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Adicionar campos novos na collection leads
    if (!leadsCol.fields.getByName('cpf_cnpj')) {
      leadsCol.fields.add(new TextField({ name: 'cpf_cnpj' }))
    }
    if (!leadsCol.fields.getByName('nacionalidade')) {
      leadsCol.fields.add(new TextField({ name: 'nacionalidade' }))
    }
    if (!leadsCol.fields.getByName('estado_civil')) {
      leadsCol.fields.add(new TextField({ name: 'estado_civil' }))
    }
    if (!leadsCol.fields.getByName('profissao')) {
      leadsCol.fields.add(new TextField({ name: 'profissao' }))
    }
    if (!leadsCol.fields.getByName('cep')) {
      leadsCol.fields.add(new TextField({ name: 'cep' }))
    }

    app.save(leadsCol)

    // 2. Criar coleção formalizacao_documentos se ainda não existir
    if (!app.hasTable('formalizacao_documentos')) {
      const formalizacaoCol = new Collection({
        name: 'formalizacao_documentos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule:
          "@request.auth.id != '' && (criado_por = @request.auth.id || @request.auth.role = 'Admin')",
        deleteRule:
          "@request.auth.id != '' && (criado_por = @request.auth.id || @request.auth.role = 'Admin')",
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
            name: 'tipo',
            type: 'select',
            required: true,
            values: ['contrato', 'procuracao'],
            maxSelect: 1,
          },
          {
            name: 'titulo',
            type: 'text',
            required: true,
          },
          {
            name: 'versao',
            type: 'number',
            min: 1,
          },
          {
            name: 'dados_customizados',
            type: 'json',
          },
          {
            name: 'conteudo_html',
            type: 'text',
          },
          {
            name: 'arquivo_pdf',
            type: 'file',
            maxSelect: 1,
            maxSize: 15728640, // 15MB
            mimeTypes: ['application/pdf'],
          },
          {
            name: 'criado_por',
            type: 'relation',
            required: false,
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_formalizacao_lead ON formalizacao_documentos (lead)',
          'CREATE INDEX idx_formalizacao_tipo ON formalizacao_documentos (tipo)',
          'CREATE INDEX idx_formalizacao_created ON formalizacao_documentos (created DESC)',
        ],
      })
      app.save(formalizacaoCol)
    }
  },
  (app) => {
    try {
      const formalizacaoCol = app.findCollectionByNameOrId('formalizacao_documentos')
      app.delete(formalizacaoCol)
    } catch (_) {}

    try {
      const leadsCol = app.findCollectionByNameOrId('leads')
      const fieldsToRemove = ['cpf_cnpj', 'nacionalidade', 'estado_civil', 'profissao', 'cep']
      for (const fieldName of fieldsToRemove) {
        if (leadsCol.fields.getByName(fieldName)) {
          leadsCol.fields.removeByName(fieldName)
        }
      }
      app.save(leadsCol)
    } catch (_) {}
  },
)
