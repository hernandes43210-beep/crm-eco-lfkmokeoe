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

    if (!col.fields.getByName('ultimo_ip_visualizacao')) {
      col.fields.add(
        new TextField({
          name: 'ultimo_ip_visualizacao',
        }),
      )
    }

    if (!col.fields.getByName('ultimo_user_agent')) {
      col.fields.add(
        new TextField({
          name: 'ultimo_user_agent',
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

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('propostas')
      const fieldsToRemove = [
        'visualizacoes_count',
        'primeira_visualizacao',
        'ultima_visualizacao',
        'ultimo_ip_visualizacao',
        'ultimo_user_agent',
        'historico_acessos',
      ]
      for (let i = 0; i < fieldsToRemove.length; i++) {
        const f = col.fields.getByName(fieldsToRemove[i])
        if (f) {
          col.fields.removeByName(fieldsToRemove[i])
        }
      }
      app.save(col)
    } catch (_) {}
  },
)
