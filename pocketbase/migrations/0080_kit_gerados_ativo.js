/// <reference path="../../pb_data/types.d.ts" />
// 0080: campo "ativo" em kit_gerados (exclusão de kit = desativar, nunca apagar).
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('kit_gerados')
    if (!col.fields.getByName('ativo')) {
      col.fields.add(new BoolField({ name: 'ativo' }))
      app.save(col)
    }
    // kits existentes (se houver) continuam visíveis — preenche o campo
    const recs = app.findRecordsByFilter('kit_gerados', '', '', 500, 0)
    for (const r of recs) {
      if (!r.getBool('ativo')) {
        r.set('ativo', true)
        app.save(r)
      }
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('kit_gerados')
    if (col.fields.getByName('ativo')) {
      col.fields.removeByName('ativo')
      app.save(col)
    }
  },
)
