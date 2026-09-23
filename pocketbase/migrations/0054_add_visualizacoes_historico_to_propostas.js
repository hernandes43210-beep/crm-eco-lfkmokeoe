migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('propostas')

    if (!col.fields.getByName('visualizacoes_count')) {
      col.fields.add(
        new NumberField({
          name: 'visualizacoes_count',
          min: 0,
          onlyInt: true,
        }),
      )
    }

    if (!col.fields.getByName('primeira_visualizacao')) {
      col.fields.add(
        new DateField({
          name: 'primeira_visualizacao',
        }),
      )
    }

    if (!col.fields.getByName('ultima_visualizacao')) {
      col.fields.add(
        new DateField({
          name: 'ultima_visualizacao',
        }),
      )
    }

    if (!col.fields.getByName('historico_acessos')) {
      col.fields.add(
        new JSONField({
          name: 'historico_acessos',
        }),
      )
    }

    if (!col.fields.getByName('visualizacoes_historico')) {
      col.fields.add(
        new JSONField({
          name: 'visualizacoes_historico',
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('propostas')
      if (col.fields.getByName('visualizacoes_historico')) {
        col.fields.removeByName('visualizacoes_historico')
        app.save(col)
      }
    } catch (_) {}
  },
)
