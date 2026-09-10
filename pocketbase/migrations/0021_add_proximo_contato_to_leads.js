migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('leads')

    // Campo de anotação livre sobre a próxima ação de contato
    if (!col.fields.getByName('proximo_contato')) {
      col.fields.add(
        new TextField({
          name: 'proximo_contato',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('leads')
    if (col.fields.getByName('proximo_contato')) {
      col.fields.removeByName('proximo_contato')
      app.save(col)
    }
  },
)
