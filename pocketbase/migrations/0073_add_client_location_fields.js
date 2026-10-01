/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Atualizar a coleção 'leads' com os campos de localização
    const leadsCol = app.findCollectionByNameOrId('leads')
    if (!leadsCol.fields.getByName('localizacao_link')) {
      leadsCol.fields.add(
        new TextField({
          name: 'localizacao_link',
          required: false,
        }),
      )
    }
    if (!leadsCol.fields.getByName('latitude')) {
      leadsCol.fields.add(
        new NumberField({
          name: 'latitude',
          required: false,
        }),
      )
    }
    if (!leadsCol.fields.getByName('longitude')) {
      leadsCol.fields.add(
        new NumberField({
          name: 'longitude',
          required: false,
        }),
      )
    }
    if (!leadsCol.fields.getByName('localizacao_maps_url')) {
      leadsCol.fields.add(
        new TextField({
          name: 'localizacao_maps_url',
          required: false,
        }),
      )
    }
    app.save(leadsCol)

    // 2. Atualizar a coleção 'assinaturas_envelopes' com localizacao_cliente
    const envelopesCol = app.findCollectionByNameOrId('assinaturas_envelopes')
    if (!envelopesCol.fields.getByName('localizacao_cliente')) {
      envelopesCol.fields.add(
        new TextField({
          name: 'localizacao_cliente',
          required: false,
        }),
      )
    }
    app.save(envelopesCol)
  },
  (app) => {
    try {
      const leadsCol = app.findCollectionByNameOrId('leads')
      leadsCol.fields.removeByName('localizacao_link')
      leadsCol.fields.removeByName('latitude')
      leadsCol.fields.removeByName('longitude')
      leadsCol.fields.removeByName('localizacao_maps_url')
      app.save(leadsCol)
    } catch (_) {}

    try {
      const envelopesCol = app.findCollectionByNameOrId('assinaturas_envelopes')
      envelopesCol.fields.removeByName('localizacao_cliente')
      app.save(envelopesCol)
    } catch (_) {}
  },
)
