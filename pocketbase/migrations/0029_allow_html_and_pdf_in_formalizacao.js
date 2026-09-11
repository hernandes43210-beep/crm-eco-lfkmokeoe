migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('formalizacao_documentos')

    // 1. Atualizar campo arquivo_pdf para aceitar tanto application/pdf quanto text/html
    const arquivoPdfField = col.fields.getByName('arquivo_pdf')
    if (arquivoPdfField) {
      arquivoPdfField.mimeTypes = ['application/pdf', 'text/html']
    }

    // 2. Se criado_por não existir como relation, adicionar
    if (!col.fields.getByName('criado_por')) {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      col.fields.add(
        new RelationField({
          name: 'criado_por',
          collectionId: usersCol.id,
          required: false,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('formalizacao_documentos')
      const arquivoPdfField = col.fields.getByName('arquivo_pdf')
      if (arquivoPdfField) {
        arquivoPdfField.mimeTypes = ['application/pdf']
        app.save(col)
      }
    } catch (_) {}
  },
)
