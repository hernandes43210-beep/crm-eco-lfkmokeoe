migrate(
  (app) => {
    // Verifica se já existe para ser idempotente
    if (app.hasTable('fotos_institucionais')) {
      return
    }

    const collection = new Collection({
      name: 'fotos_institucionais',
      type: 'base',
      listRule: '', // Público para visualização em propostas públicas / PDFs / app
      viewRule: '',
      createRule: "@request.auth.id != ''", // Usuários autenticados podem salvar fotos
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'titulo',
          type: 'text',
          required: true,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['residencial', 'comercial', 'carport', 'rural', 'fundacao', 'solo', 'outro'],
          maxSelect: 1,
        },
        {
          name: 'legenda',
          type: 'text',
        },
        {
          name: 'descricao',
          type: 'text',
        },
        {
          name: 'origem',
          type: 'text', // 'ia_gemini' | 'upload' | 'seed'
        },
        {
          name: 'prompt_usado',
          type: 'text',
        },
        {
          name: 'arquivo',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        },
        {
          name: 'criado_por',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_fotos_inst_tipo ON fotos_institucionais (tipo)',
        'CREATE INDEX idx_fotos_inst_origem ON fotos_institucionais (origem)',
        'CREATE INDEX idx_fotos_inst_created ON fotos_institucionais (created DESC)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('fotos_institucionais')
      app.delete(collection)
    } catch (_) {}
  },
)
