/// <reference path="../../pb_data/types.d.ts" />
// 0080: campo "ativo" em kit_gerados (exclusão de kit = desativar, nunca apagar).
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('kit_gerados')
    if (!col.fields.getByName('ativo')) {
      col.fields.add(new Field({ name: 'ativo', type: 'bool' }))
      col.save()
      // kits existentes (se houver) continuam visíveis
      const recs = app.findRecordsByFilter('kit_gerados', 'ativo != true', '', 500, 0)
      for (const r of recs) {
        r.set('ativo', true)
        app.save(r)
      }
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('kit_gerados')
    if (col.fields.getByName('ativo')) {
      col.fields.removeByName('ativo')
      col.save()
    }
  },
)
