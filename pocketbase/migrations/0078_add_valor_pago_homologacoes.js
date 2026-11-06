// 0078_add_valor_pago_homologacoes.js
//
// Campo de VALOR PAGO em cada projeto (coleção 'homologacoes'), exclusivo do
// Admin/CEO. O Engenheiro continua vendo apenas pago/não pago (projeto_pago),
// sem nenhum valor — a ocultação na API é feita pelo hook valor_pago.js
// (onRecordEnrich) e alterações diretas são bloqueadas pelo projeto_pago_guard.
//
// Campos:
//  - valor_pago (number) — valor pago pelo projeto em R$
//  - valor_pago_em (date) — quando o valor foi informado/atualizado
//  - valor_pago_por (relation -> users) — quem informou/atualizou

migrate(
  (app) => {
    if (!app.hasTable('homologacoes')) return

    const homCol = app.findCollectionByNameOrId('homologacoes')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!homCol.fields.getByName('valor_pago')) {
      homCol.fields.add(
        new NumberField({
          name: 'valor_pago',
          required: false,
          onlyInt: false,
          min: 0,
        }),
      )
    }

    if (!homCol.fields.getByName('valor_pago_em')) {
      homCol.fields.add(
        new DateField({
          name: 'valor_pago_em',
          required: false,
        }),
      )
    }

    if (!homCol.fields.getByName('valor_pago_por')) {
      homCol.fields.add(
        new RelationField({
          name: 'valor_pago_por',
          required: false,
          collectionId: usersCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }

    app.save(homCol)
  },
  (app) => {
    try {
      if (!app.hasTable('homologacoes')) return
      const homCol = app.findCollectionByNameOrId('homologacoes')
      if (homCol.fields.getByName('valor_pago')) {
        homCol.fields.removeByName('valor_pago')
      }
      if (homCol.fields.getByName('valor_pago_em')) {
        homCol.fields.removeByName('valor_pago_em')
      }
      if (homCol.fields.getByName('valor_pago_por')) {
        homCol.fields.removeByName('valor_pago_por')
      }
      app.save(homCol)
    } catch (_) {}
  },
)
