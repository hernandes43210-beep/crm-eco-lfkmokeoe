migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('formalizacao_documentos')
    const arquivoPdfField = col.fields.getByName('arquivo_pdf')
    if (arquivoPdfField) {
      arquivoPdfField.mimeTypes = [
        'application/pdf',
        'text/html',
        'text/html; charset=utf-8',
        'text/html;charset=utf-8',
      ]
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('formalizacao_documentos')
      const arquivoPdfField = col.fields.getByName('arquivo_pdf')
      if (arquivoPdfField) {
        arquivoPdfField.mimeTypes = ['application/pdf', 'text/html']
        app.save(col)
      }
    } catch (_) {}
  },
)
