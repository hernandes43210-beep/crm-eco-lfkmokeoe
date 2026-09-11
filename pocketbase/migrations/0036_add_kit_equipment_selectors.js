migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('kits')

    // 1. Marca dos Painéis (módulos fotovoltaicos)
    if (!col.fields.getByName('marca_painel')) {
      col.fields.add(
        new TextField({
          name: 'marca_painel',
          required: false,
        }),
      )
    }

    // 2. Tipo de Estrutura de fixação
    // Opções pedidas pelo usuário: "solo monoposte", "mini trilho", "fibrocimento"
    if (!col.fields.getByName('tipo_estrutura')) {
      col.fields.add(
        new SelectField({
          name: 'tipo_estrutura',
          required: false,
          values: ['solo_monoposte', 'mini_trilho', 'fibrocimento', 'outro'],
          maxSelect: 1,
        }),
      )
    }

    // 3. Marca do Inversor Solar
    if (!col.fields.getByName('marca_inversor')) {
      col.fields.add(
        new TextField({
          name: 'marca_inversor',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('kits')
    if (col.fields.getByName('marca_painel')) {
      col.fields.removeByName('marca_painel')
    }
    if (col.fields.getByName('tipo_estrutura')) {
      col.fields.removeByName('tipo_estrutura')
    }
    if (col.fields.getByName('marca_inversor')) {
      col.fields.removeByName('marca_inversor')
    }
    app.save(col)
  },
)
