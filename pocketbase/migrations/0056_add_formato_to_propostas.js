migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('propostas')

    if (!col.fields.getByName('formato')) {
      col.fields.add(
        new SelectField({
          name: 'formato',
          required: false,
          values: ['story', 'classica'],
          maxSelect: 1,
        }),
      )
    }

    app.save(col)

    // Atualizar propostas existentes que estiverem sem formato definido para 'classica'
    // mantendo compatibilidade com propostas antigas já enviadas
    try {
      app
        .db()
        .newQuery("UPDATE propostas SET formato = 'classica' WHERE formato IS NULL OR formato = ''")
        .execute()
    } catch (_) {}
  },
  (app) => {
    const col = app.findCollectionByNameOrId('propostas')
    if (col.fields.getByName('formato')) {
      col.fields.removeByName('formato')
    }
    app.save(col)
  },
)
