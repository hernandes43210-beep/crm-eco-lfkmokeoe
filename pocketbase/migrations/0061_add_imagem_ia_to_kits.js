migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('kits')

    // 1. Arquivo de imagem gerada por IA para o kit solar
    // Contexto de col.fields.add(...) exige new FileField({...})
    if (!col.fields.getByName('imagem_ia')) {
      col.fields.add(
        new FileField({
          name: 'imagem_ia',
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          required: false,
        }),
      )
    }

    // 2. Prompt utilizado na geração da imagem da IA
    if (!col.fields.getByName('imagem_ia_prompt')) {
      col.fields.add(
        new TextField({
          name: 'imagem_ia_prompt',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('kits')
      if (col.fields.getByName('imagem_ia')) {
        col.fields.removeByName('imagem_ia')
      }
      if (col.fields.getByName('imagem_ia_prompt')) {
        col.fields.removeByName('imagem_ia_prompt')
      }
      app.save(col)
    } catch (_) {}
  },
)
