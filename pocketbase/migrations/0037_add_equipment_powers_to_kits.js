migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('kits')

    // 1. Potência do Painel em Watts (W / Wp) - ex: 630
    if (!col.fields.getByName('potencia_painel_w')) {
      col.fields.add(
        new NumberField({
          name: 'potencia_painel_w',
          required: false,
          min: 0,
        }),
      )
    }

    // 2. Potência do Inversor em Quilowatts (kW) - ex: 7.5
    if (!col.fields.getByName('potencia_inversor_kw')) {
      col.fields.add(
        new NumberField({
          name: 'potencia_inversor_kw',
          required: false,
          min: 0,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('kits')
    if (col.fields.getByName('potencia_painel_w')) {
      col.fields.removeByName('potencia_painel_w')
    }
    if (col.fields.getByName('potencia_inversor_kw')) {
      col.fields.removeByName('potencia_inversor_kw')
    }
    app.save(col)
  },
)
