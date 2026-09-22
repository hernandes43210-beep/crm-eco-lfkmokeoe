migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('propostas')
    if (col.fields.getByName('foto_instalacao_destaque')) {
      col.fields.removeByName('foto_instalacao_destaque')
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('propostas')
    if (!col.fields.getByName('foto_instalacao_destaque')) {
      col.fields.add(
        new SelectField({
          name: 'foto_instalacao_destaque',
          required: false,
          values: ['posto_br', 'academia', 'nenhuma'],
          maxSelect: 1,
        }),
      )
      app.save(col)
    }
  },
)
