migrate(
  (app) => {
    const propostas = app.findCollectionByNameOrId('propostas')
    propostas.deleteRule =
      "@request.auth.id != '' && (criado_por = @request.auth.id || lead.proprietario = @request.auth.id || @request.auth.role = 'Admin')"
    app.save(propostas)
  },
  (app) => {
    try {
      const propostas = app.findCollectionByNameOrId('propostas')
      propostas.deleteRule = "@request.auth.id != '' && @request.auth.role = 'Admin'"
      app.save(propostas)
    } catch (_) {}
  },
)
