migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('leads')

    // Campo motivo_perda: armazena a razão da perda de oportunidade comercial
    // Ex: "Preço / Condições de pagamento", "Concorrência", "Cliente desistiu", etc.
    if (!col.fields.getByName('motivo_perda')) {
      col.fields.add(
        new TextField({
          name: 'motivo_perda',
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('leads')
    const field = col.fields.getByName('motivo_perda')
    if (field) {
      col.fields.removeByName('motivo_perda')
      app.save(col)
    }
  },
)
