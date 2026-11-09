// 0082: campos de conexão manual do WhatsApp (API Cloud da Meta) em integracoes_config.
// ADD-ONLY: adiciona waba_id e phone_number_id. O access token fica no campo
// api_key já existente (mesma coleção usada pela chave Gemini). Coleção nunca recriada.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('integracoes_config')
    if (!col.fields.getByName('waba_id')) {
      col.fields.add(new TextField({ name: 'waba_id', max: 64 }))
    }
    if (!col.fields.getByName('phone_number_id')) {
      col.fields.add(new TextField({ name: 'phone_number_id', max: 64 }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('integracoes_config')
    if (col.fields.getByName('waba_id')) col.fields.removeByName('waba_id')
    if (col.fields.getByName('phone_number_id')) col.fields.removeByName('phone_number_id')
    app.save(col)
  },
)
