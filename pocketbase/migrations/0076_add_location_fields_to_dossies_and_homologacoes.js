migrate(
  (app) => {
    // 1. Atualizar dossies_engenharia com campos de localização detalhados
    if (app.hasTable('dossies_engenharia')) {
      const colDossies = app.findCollectionByNameOrId('dossies_engenharia')
      if (!colDossies.fields.getByName('cliente_bairro')) {
        colDossies.fields.add(new TextField({ name: 'cliente_bairro' }))
      }
      if (!colDossies.fields.getByName('cliente_cep')) {
        colDossies.fields.add(new TextField({ name: 'cliente_cep' }))
      }
      if (!colDossies.fields.getByName('latitude')) {
        colDossies.fields.add(new NumberField({ name: 'latitude' }))
      }
      if (!colDossies.fields.getByName('longitude')) {
        colDossies.fields.add(new NumberField({ name: 'longitude' }))
      }
      if (!colDossies.fields.getByName('localizacao_maps_url')) {
        colDossies.fields.add(new TextField({ name: 'localizacao_maps_url' }))
      }
      if (!colDossies.fields.getByName('localizacao_link')) {
        colDossies.fields.add(new TextField({ name: 'localizacao_link' }))
      }
      app.save(colDossies)
    }

    // 2. Atualizar homologacoes com campos de localização detalhados
    if (app.hasTable('homologacoes')) {
      const colHomolog = app.findCollectionByNameOrId('homologacoes')
      if (!colHomolog.fields.getByName('cliente_bairro')) {
        colHomolog.fields.add(new TextField({ name: 'cliente_bairro' }))
      }
      if (!colHomolog.fields.getByName('cliente_cep')) {
        colHomolog.fields.add(new TextField({ name: 'cliente_cep' }))
      }
      if (!colHomolog.fields.getByName('latitude')) {
        colHomolog.fields.add(new NumberField({ name: 'latitude' }))
      }
      if (!colHomolog.fields.getByName('longitude')) {
        colHomolog.fields.add(new NumberField({ name: 'longitude' }))
      }
      if (!colHomolog.fields.getByName('localizacao_maps_url')) {
        colHomolog.fields.add(new TextField({ name: 'localizacao_maps_url' }))
      }
      if (!colHomolog.fields.getByName('localizacao_link')) {
        colHomolog.fields.add(new TextField({ name: 'localizacao_link' }))
      }
      app.save(colHomolog)
    }
  },
  (app) => {
    if (app.hasTable('dossies_engenharia')) {
      const colDossies = app.findCollectionByNameOrId('dossies_engenharia')
      colDossies.fields.removeByName('cliente_bairro')
      colDossies.fields.removeByName('cliente_cep')
      colDossies.fields.removeByName('latitude')
      colDossies.fields.removeByName('longitude')
      colDossies.fields.removeByName('localizacao_maps_url')
      colDossies.fields.removeByName('localizacao_link')
      app.save(colDossies)
    }
    if (app.hasTable('homologacoes')) {
      const colHomolog = app.findCollectionByNameOrId('homologacoes')
      colHomolog.fields.removeByName('cliente_bairro')
      colHomolog.fields.removeByName('cliente_cep')
      colHomolog.fields.removeByName('latitude')
      colHomolog.fields.removeByName('longitude')
      colHomolog.fields.removeByName('localizacao_maps_url')
      colHomolog.fields.removeByName('localizacao_link')
      app.save(colHomolog)
    }
  },
)
