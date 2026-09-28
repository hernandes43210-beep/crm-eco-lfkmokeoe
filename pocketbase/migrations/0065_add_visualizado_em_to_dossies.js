migrate(
  (app) => {
    // 0065_add_visualizado_em_to_dossies.js
    // Adiciona o campo visualizado_em à coleção dossies_engenharia
    // para permitir que o Engenheiro marque a versão do dossiê como visualizada
    // e o badge "Novo" acenda quando chegar uma versão nova (ou atualização) do dossiê.
    if (app.hasTable('dossies_engenharia')) {
      const col = app.findCollectionByNameOrId('dossies_engenharia')
      if (!col.fields.getByName('visualizado_em')) {
        col.fields.add(
          new DateField({
            name: 'visualizado_em',
            required: false,
          }),
        )
        app.save(col)
      }
    }
  },
  (app) => {
    try {
      if (app.hasTable('dossies_engenharia')) {
        const col = app.findCollectionByNameOrId('dossies_engenharia')
        const field = col.fields.getByName('visualizado_em')
        if (field) {
          col.fields.remove(field)
          app.save(col)
        }
      }
    } catch (_) {}
  },
)
