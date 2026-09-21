migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // Adicionar campo telefone em users (telefone do vendedor / colaborador)
    if (!usersCol.fields.getByName('telefone')) {
      usersCol.fields.add(
        new TextField({
          name: 'telefone',
          required: false,
        }),
      )
      app.save(usersCol)
    }
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('telefone')) {
        usersCol.fields.removeByName('telefone')
        app.save(usersCol)
      }
    } catch (_) {}
  },
)
