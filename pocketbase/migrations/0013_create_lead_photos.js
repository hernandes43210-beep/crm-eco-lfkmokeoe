migrate(
  (app) => {
    const leadsCol = app.findCollectionByNameOrId('leads')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!app.hasTable('lead_photos')) {
      const leadPhotos = new Collection({
        name: 'lead_photos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule:
          "@request.auth.id != '' && (criado_por = @request.auth.id || @request.auth.role = 'Admin')",
        deleteRule:
          "@request.auth.id != '' && (criado_por = @request.auth.id || @request.auth.role = 'Admin')",
        fields: [
          {
            name: 'lead',
            type: 'relation',
            required: true,
            collectionId: leadsCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'criado_por',
            type: 'relation',
            required: false,
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'foto',
            type: 'file',
            required: true,
            maxSelect: 1,
            maxSize: 10485760, // 10MB
            mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          },
          {
            name: 'legenda',
            type: 'text',
          },
          {
            name: 'ordem',
            type: 'number',
            min: 0,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_lead_photos_lead ON lead_photos (lead)',
          'CREATE INDEX idx_lead_photos_created ON lead_photos (created DESC)',
          'CREATE INDEX idx_lead_photos_ordem ON lead_photos (ordem)',
        ],
      })
      app.save(leadPhotos)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('lead_photos')
      app.delete(col)
    } catch (_) {}
  },
)
