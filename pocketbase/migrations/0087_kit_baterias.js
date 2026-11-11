// 0087: campos de baterias para o Gerador de Kit Solar.
// kit_gerados.bateria — snapshot JSON das baterias do kit (igual a painel/inversor).
// propostas.kit_baterias — snapshot das baterias gravado ao gerar a proposta.
// Baterias são INFORMATIVAS: não entram no cálculo de preço do kit.
migrate(
  (app) => {
    const kitGerados = app.findCollectionByNameOrId('kit_gerados')
    if (!kitGerados.fields.getByName('bateria')) {
      kitGerados.fields.add(
        new JsonField({
          name: 'bateria',
          required: false,
          maxSize: 2000000,
        }),
      )
    }
    app.save(kitGerados)

    const propostas = app.findCollectionByNameOrId('propostas')
    if (!propostas.fields.getByName('kit_baterias')) {
      propostas.fields.add(
        new JsonField({
          name: 'kit_baterias',
          required: false,
          maxSize: 2000000,
        }),
      )
    }
    app.save(propostas)
  },
  (app) => {
    const propostas = app.findCollectionByNameOrId('propostas')
    if (propostas.fields.getByName('kit_baterias')) {
      propostas.fields.removeByName('kit_baterias')
    }
    app.save(propostas)

    const kitGerados = app.findCollectionByNameOrId('kit_gerados')
    if (kitGerados.fields.getByName('bateria')) {
      kitGerados.fields.removeByName('bateria')
    }
    app.save(kitGerados)
  },
)
