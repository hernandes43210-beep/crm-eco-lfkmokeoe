//
// Adiciona as 4 novas categorias de documentos para engenharia ao select 'categoria'
// da coleção documentos_lead: foto do transformador, foto do local, foto do
// poste/padrão de instalação e contrato de posse do imóvel.
//
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('documentos_lead')
    const field = col.fields.getByName('categoria')
    const novas = [
      'foto_transformador',
      'foto_local_instalacao',
      'foto_poste_padrao',
      'contrato_posse_imovel',
    ]
    for (const v of novas) {
      if (!field.values.includes(v)) {
        field.values.push(v)
      }
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('documentos_lead')
    const field = col.fields.getByName('categoria')
    field.values = field.values.filter(
      (v) =>
        ![
          'foto_transformador',
          'foto_local_instalacao',
          'foto_poste_padrao',
          'contrato_posse_imovel',
        ].includes(v),
    )
    app.save(col)
  },
)
