migrate(
  (app) => {
    // Garante que o registro da integração PHB Solar exista na coleção integracoes_config
    if (app.hasTable('integracoes_config')) {
      let rec = null
      try {
        const records = app.findRecordsByFilter(
          'integracoes_config',
          "chave = 'phb_solar'",
          '-created',
          1,
          0,
        )
        if (records && records.length > 0) {
          rec = records[0]
        }
      } catch (_) {}

      if (!rec) {
        const col = app.findCollectionByNameOrId('integracoes_config')
        const novo = new Record(col)
        novo.set('chave', 'phb_solar')
        novo.set(
          'descricao',
          'Token Bearer da API Plataforma PHB Solar v1.4.0 para busca e importação de kits',
        )
        novo.set('ativo', true)
        novo.set('api_key', '')
        novo.set(
          'dados_extras',
          JSON.stringify({
            base_url: 'https://plataformaphbsolar.com.br/api/v1',
            versao_api: 'v1.4.0',
          }),
        )
        app.save(novo)
      }
    }
  },
  (app) => {
    try {
      const records = app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'phb_solar'",
        '-created',
        1,
        0,
      )
      if (records && records.length > 0) {
        app.delete(records[0])
      }
    } catch (_) {}
  },
)
