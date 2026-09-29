migrate(
  (app) => {
    // 0070_add_ativo_to_users.js
    //
    // Adiciona o campo booleano 'ativo' na coleção de usuários ('users')
    // com padrão true. Usuários existentes recebem ativo = true.
    //
    // Requisito:
    // - Usuário inativo não consegue mais logar e some das seleções
    // - Badge 'Inativo' no card da tela de Equipe
    // - Ação reversível com 'Reativar'

    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (!usersCol.fields.getByName('ativo')) {
        usersCol.fields.add(
          new BoolField({
            name: 'ativo',
            required: false,
          }),
        )
        app.save(usersCol)
      }

      // Garantir que todos os usuários existentes fiquem com ativo = true
      app.db().newQuery('UPDATE users SET ativo = 1 WHERE ativo IS NULL OR ativo = 0').execute()
    } catch (err) {
      console.error('[0070] Erro ao adicionar campo ativo em users:', err)
      throw err
    }
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('ativo')) {
        usersCol.fields.removeByName('ativo')
        app.save(usersCol)
      }
    } catch (_) {}
  },
)
