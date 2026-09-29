migrate(
  (app) => {
    // 0071_restrict_delete_rules_engenharia_admin.js
    //
    // Garante que apenas Admin pode excluir registros nas coleções de engenharia:
    // - 'homologacoes': deleteRule = "@request.auth.id != '' && @request.auth.role = 'Admin'"
    // - 'dossies_engenharia': deleteRule = "@request.auth.id != '' && @request.auth.role = 'Admin'"
    // - 'documentos_lead': deleteRule = "@request.auth.id != '' && @request.auth.role = 'Admin'"
    // - 'arquivos_engenharia': deleteRule = "@request.auth.id != '' && @request.auth.role = 'Admin'"
    //
    // Engenheiros comuns e supervisores NÃO podem excluir nenhum documento/arquivo/homologação/dossiê.

    try {
      if (app.hasTable('homologacoes')) {
        const homCol = app.findCollectionByNameOrId('homologacoes')
        homCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'Admin'"
        app.save(homCol)
      }
    } catch (err) {
      console.error('[0071] Erro ao atualizar deleteRule de homologacoes:', err)
      throw err
    }

    try {
      if (app.hasTable('dossies_engenharia')) {
        const dossiesCol = app.findCollectionByNameOrId('dossies_engenharia')
        dossiesCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'Admin'"
        app.save(dossiesCol)
      }
    } catch (err) {
      console.error('[0071] Erro ao atualizar deleteRule de dossies_engenharia:', err)
      throw err
    }

    try {
      if (app.hasTable('documentos_lead')) {
        const docsCol = app.findCollectionByNameOrId('documentos_lead')
        docsCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'Admin'"
        app.save(docsCol)
      }
    } catch (err) {
      console.error('[0071] Erro ao atualizar deleteRule de documentos_lead:', err)
      throw err
    }

    try {
      if (app.hasTable('arquivos_engenharia')) {
        const arqCol = app.findCollectionByNameOrId('arquivos_engenharia')
        arqCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'Admin'"
        app.save(arqCol)
      }
    } catch (err) {
      console.error('[0071] Erro ao atualizar deleteRule de arquivos_engenharia:', err)
      throw err
    }
  },
  (app) => {
    try {
      if (app.hasTable('dossies_engenharia')) {
        const dossiesCol = app.findCollectionByNameOrId('dossies_engenharia')
        dossiesCol.deleteRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || enviado_por = @request.auth.id)"
        app.save(dossiesCol)
      }
    } catch (_) {}

    try {
      if (app.hasTable('documentos_lead')) {
        const docsCol = app.findCollectionByNameOrId('documentos_lead')
        docsCol.deleteRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || enviado_por = @request.auth.id)"
        app.save(docsCol)
      }
    } catch (_) {}

    try {
      if (app.hasTable('arquivos_engenharia')) {
        const arqCol = app.findCollectionByNameOrId('arquivos_engenharia')
        arqCol.deleteRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || criado_por = @request.auth.id)"
        app.save(arqCol)
      }
    } catch (_) {}
  },
)
