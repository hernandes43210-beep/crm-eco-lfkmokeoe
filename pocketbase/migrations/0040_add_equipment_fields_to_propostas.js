migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('propostas')

    if (!col.fields.getByName('kit_marca_painel')) {
      col.fields.add(
        new TextField({
          name: 'kit_marca_painel',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('kit_marca_inversor')) {
      col.fields.add(
        new TextField({
          name: 'kit_marca_inversor',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('kit_tipo_estrutura')) {
      col.fields.add(
        new SelectField({
          name: 'kit_tipo_estrutura',
          required: false,
          values: ['solo_monoposte', 'mini_trilho', 'fibrocimento', 'outro'],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('kit_potencia_painel_w')) {
      col.fields.add(
        new NumberField({
          name: 'kit_potencia_painel_w',
          required: false,
          min: 0,
        }),
      )
    }

    if (!col.fields.getByName('kit_potencia_inversor_kw')) {
      col.fields.add(
        new NumberField({
          name: 'kit_potencia_inversor_kw',
          required: false,
          min: 0,
        }),
      )
    }

    if (!col.fields.getByName('kit_descricao')) {
      col.fields.add(
        new TextField({
          name: 'kit_descricao',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('kit_string_box')) {
      col.fields.add(
        new SelectField({
          name: 'kit_string_box',
          required: false,
          values: ['1_entrada', '2_entradas', '3_entradas'],
          maxSelect: 1,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('propostas')
    if (col.fields.getByName('kit_marca_painel')) {
      col.fields.removeByName('kit_marca_painel')
    }
    if (col.fields.getByName('kit_marca_inversor')) {
      col.fields.removeByName('kit_marca_inversor')
    }
    if (col.fields.getByName('kit_tipo_estrutura')) {
      col.fields.removeByName('kit_tipo_estrutura')
    }
    if (col.fields.getByName('kit_potencia_painel_w')) {
      col.fields.removeByName('kit_potencia_painel_w')
    }
    if (col.fields.getByName('kit_potencia_inversor_kw')) {
      col.fields.removeByName('kit_potencia_inversor_kw')
    }
    if (col.fields.getByName('kit_descricao')) {
      col.fields.removeByName('kit_descricao')
    }
    if (col.fields.getByName('kit_string_box')) {
      col.fields.removeByName('kit_string_box')
    }
    app.save(col)
  },
)
