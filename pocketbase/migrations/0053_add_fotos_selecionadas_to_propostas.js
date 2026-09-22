migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('propostas')

    if (!col.fields.getByName('fotos_selecionadas')) {
      col.fields.add(
        new JSONField({
          name: 'fotos_selecionadas',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('propostas')
    if (col.fields.getByName('fotos_selecionadas')) {
      col.fields.removeByName('fotos_selecionadas')
    }
    app.save(col)
  },
)
