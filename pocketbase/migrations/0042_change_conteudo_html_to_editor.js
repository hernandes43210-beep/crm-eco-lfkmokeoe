migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('formalizacao_documentos')

    // 1. Criar novo campo temporario EditorField
    if (!col.fields.getByName('conteudo_html_temp')) {
      col.fields.add(
        new EditorField({
          name: 'conteudo_html_temp',
          required: false,
        }),
      )
      app.save(col)
    }

    // 2. Copiar dados existentes de conteudo_html para conteudo_html_temp se houver
    app
      .db()
      .newQuery(
        'UPDATE formalizacao_documentos SET conteudo_html_temp = conteudo_html WHERE conteudo_html IS NOT NULL',
      )
      .execute()

    // 3. Remover campo text original conteudo_html
    const colStep2 = app.findCollectionByNameOrId('formalizacao_documentos')
    if (colStep2.fields.getByName('conteudo_html')) {
      colStep2.fields.removeByName('conteudo_html')
      app.save(colStep2)
    }

    // 4. Recriar campo conteudo_html agora como EditorField
    const colStep3 = app.findCollectionByNameOrId('formalizacao_documentos')
    colStep3.fields.add(
      new EditorField({
        name: 'conteudo_html',
        required: false,
      }),
    )
    app.save(colStep3)

    // 5. Copiar de volta os dados preservados
    app
      .db()
      .newQuery(
        'UPDATE formalizacao_documentos SET conteudo_html = conteudo_html_temp WHERE conteudo_html_temp IS NOT NULL',
      )
      .execute()

    // 6. Remover conteudo_html_temp temporário
    const colStep4 = app.findCollectionByNameOrId('formalizacao_documentos')
    if (colStep4.fields.getByName('conteudo_html_temp')) {
      colStep4.fields.removeByName('conteudo_html_temp')
      app.save(colStep4)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('formalizacao_documentos')
    if (!col.fields.getByName('conteudo_html_temp')) {
      col.fields.add(
        new TextField({
          name: 'conteudo_html_temp',
          required: false,
        }),
      )
      app.save(col)
    }
    app
      .db()
      .newQuery(
        'UPDATE formalizacao_documentos SET conteudo_html_temp = conteudo_html WHERE conteudo_html IS NOT NULL',
      )
      .execute()

    const colStep2 = app.findCollectionByNameOrId('formalizacao_documentos')
    if (colStep2.fields.getByName('conteudo_html')) {
      colStep2.fields.removeByName('conteudo_html')
      app.save(colStep2)
    }

    const colStep3 = app.findCollectionByNameOrId('formalizacao_documentos')
    colStep3.fields.add(
      new TextField({
        name: 'conteudo_html',
        required: false,
      }),
    )
    app.save(colStep3)

    app
      .db()
      .newQuery(
        'UPDATE formalizacao_documentos SET conteudo_html = conteudo_html_temp WHERE conteudo_html_temp IS NOT NULL',
      )
      .execute()

    const colStep4 = app.findCollectionByNameOrId('formalizacao_documentos')
    if (colStep4.fields.getByName('conteudo_html_temp')) {
      colStep4.fields.removeByName('conteudo_html_temp')
      app.save(colStep4)
    }
  },
)
