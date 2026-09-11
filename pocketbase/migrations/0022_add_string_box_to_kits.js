migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('kits')

    // Campo opcional de string box do kit:
    // Permite "1 entrada", "2 entradas", "3 entradas" ou vazio/sem string box
    if (!col.fields.getByName('string_box')) {
      col.fields.add(
        new SelectField({
          name: 'string_box',
          required: false,
          values: ['1_entrada', '2_entradas', '3_entradas'],
          maxSelect: 1,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('kits')
    if (col.fields.getByName('string_box')) {
      col.fields.removeByName('string_box')
      app.save(col)
    }
  },
)
