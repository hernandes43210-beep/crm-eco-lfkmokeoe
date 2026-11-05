migrate(
  (app) => {
    // 0073_projeto_pago_confirmacoes.js
    //
    // Controle de pagamento do projeto na Área de Engenharia (coleção 'homologacoes'):
    //  - Admin/CEO e Engenheiro podem marcar o projeto como pago.
    //  - A reversão para "não pago" exige o ok de DUAS pessoas diferentes.
    //
    // Novos campos em 'homologacoes':
    //  - projeto_pago_em (date) — quando foi marcado como pago
    //  - projeto_pago_por (relation -> users) — quem marcou como pago
    //  - projeto_pago_confirmacoes (json) — confirmações do estado "pago" (auditoria)
    //  - projeto_pago_reversoes (json) — oks registrados para reverter para "não pago"

    if (app.hasTable('homologacoes')) {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const homCol = app.findCollectionByNameOrId('homologacoes')

      if (!homCol.fields.getByName('projeto_pago_em')) {
        homCol.fields.add(
          new DateField({
            name: 'projeto_pago_em',
            required: false,
          }),
        )
      }

      if (!homCol.fields.getByName('projeto_pago_por')) {
        homCol.fields.add(
          new RelationField({
            name: 'projeto_pago_por',
            required: false,
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          }),
        )
      }

      if (!homCol.fields.getByName('projeto_pago_confirmacoes')) {
        homCol.fields.add(
          new JSONField({
            name: 'projeto_pago_confirmacoes',
            required: false,
          }),
        )
      }

      if (!homCol.fields.getByName('projeto_pago_reversoes')) {
        homCol.fields.add(
          new JSONField({
            name: 'projeto_pago_reversoes',
            required: false,
          }),
        )
      }

      app.save(homCol)
    }
  },
  (app) => {
    try {
      if (app.hasTable('homologacoes')) {
        const homCol = app.findCollectionByNameOrId('homologacoes')
        if (homCol.fields.getByName('projeto_pago_em')) {
          homCol.fields.removeByName('projeto_pago_em')
        }
        if (homCol.fields.getByName('projeto_pago_por')) {
          homCol.fields.removeByName('projeto_pago_por')
        }
        if (homCol.fields.getByName('projeto_pago_confirmacoes')) {
          homCol.fields.removeByName('projeto_pago_confirmacoes')
        }
        if (homCol.fields.getByName('projeto_pago_reversoes')) {
          homCol.fields.removeByName('projeto_pago_reversoes')
        }
        app.save(homCol)
      }
    } catch (_) {}
  },
)
