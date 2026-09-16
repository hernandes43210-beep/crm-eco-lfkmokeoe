migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('propostas')

    if (!col.fields.getByName('desconto_percentual')) {
      col.fields.add(
        new NumberField({
          name: 'desconto_percentual',
          required: false,
          min: 0,
          max: 90,
        }),
      )
    }

    if (!col.fields.getByName('valor_desconto')) {
      col.fields.add(
        new NumberField({
          name: 'valor_desconto',
          required: false,
          min: 0,
        }),
      )
    }

    if (!col.fields.getByName('valor_bruto')) {
      col.fields.add(
        new NumberField({
          name: 'valor_bruto',
          required: false,
          min: 0,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('propostas')
    if (col.fields.getByName('desconto_percentual')) {
      col.fields.removeByName('desconto_percentual')
    }
    if (col.fields.getByName('valor_desconto')) {
      col.fields.removeByName('valor_desconto')
    }
    if (col.fields.getByName('valor_bruto')) {
      col.fields.removeByName('valor_bruto')
    }
    app.save(col)
  },
)
