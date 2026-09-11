routerAdd('POST', '/backend/v1/custom-diagnose-formalizacao', (e) => {
  let output = {}
  try {
    const col = $app.findCollectionByNameOrId('formalizacao_documentos')
    const fileField = col.fields.getByName('arquivo_pdf')
    output.fileFieldProps = {
      name: fileField ? fileField.name : null,
      type: fileField ? fileField.type() : null,
      mimeTypes: fileField ? fileField.mimeTypes : null,
      maxSize: fileField ? fileField.maxSize : null,
      maxSelect: fileField ? fileField.maxSelect : null,
    }

    const leads = $app.findRecordsByFilter('leads', '', '-created', 1, 0)
    if (leads.length === 0) {
      output.leadError = 'No leads found'
      return e.json(200, output)
    }
    const lead = leads[0]
    output.leadId = lead.id

    const users = $app.findRecordsByFilter('users', '', '-created', 1, 0)
    output.userId = users.length > 0 ? users[0].id : null

    // Simula save sem arquivo via Record
    const rec = new Record(col)
    rec.set('lead', lead.id)
    rec.set('tipo', 'contrato')
    rec.set('titulo', 'Teste Endpoint')
    rec.set('versao', 1)
    rec.set('dados_customizados', { teste: true })
    rec.set('conteudo_html', '<p>ok</p>')
    rec.set('criado_por', output.userId)

    $app.save(rec)
    output.recordCreatedId = rec.id
    $app.delete(rec)
    output.recordDeleted = true
  } catch (err) {
    output.error = String(err)
    if (err && err.data) {
      output.errorData = err.data
    }
  }

  return e.json(200, output)
})
