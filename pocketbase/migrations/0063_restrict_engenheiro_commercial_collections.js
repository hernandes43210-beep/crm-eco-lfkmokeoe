migrate(
  (app) => {
    // Restringir acesso de leitura/escrita do papel 'Engenheiro' às coleções comerciais.
    // O engenheiro deve acessar APENAS a página Meus Documentos (/engenharia) e coleção 'documentos_lead'.
    // Ele NÃO pode ver leads em aberto, negócios em andamento nem listas de clientes em nenhuma página.
    // Ele só vê os dados do cliente que vierem expandidos nos documentos enviados para ele em 'documentos_lead'.

    // 1. Coleção 'leads': negar leitura/escrita para papel 'Engenheiro'
    try {
      const leadsCol = app.findCollectionByNameOrId('leads')
      leadsCol.listRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      leadsCol.viewRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      leadsCol.createRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      leadsCol.updateRule =
        "@request.auth.id != '' && @request.auth.role != 'Engenheiro' && (proprietario = @request.auth.id || @request.auth.role = 'Admin')"
      leadsCol.deleteRule =
        "@request.auth.id != '' && @request.auth.role != 'Engenheiro' && (proprietario = @request.auth.id || @request.auth.role = 'Admin')"
      app.save(leadsCol)
    } catch (err) {
      console.error('[0063_restrict_engenheiro] Erro ao atualizar regras de leads:', err)
      throw err
    }

    // 2. Coleção 'propostas': negar leitura/escrita para papel 'Engenheiro'
    try {
      const propostasCol = app.findCollectionByNameOrId('propostas')
      propostasCol.listRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      propostasCol.viewRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      propostasCol.createRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      propostasCol.updateRule =
        "@request.auth.id != '' && @request.auth.role != 'Engenheiro' && (criado_por = @request.auth.id || lead.proprietario = @request.auth.id || @request.auth.role = 'Admin')"
      propostasCol.deleteRule =
        "@request.auth.id != '' && @request.auth.role != 'Engenheiro' && (criado_por = @request.auth.id || lead.proprietario = @request.auth.id || @request.auth.role = 'Admin')"
      app.save(propostasCol)
    } catch (err) {
      console.error('[0063_restrict_engenheiro] Erro ao atualizar regras de propostas:', err)
      throw err
    }

    // 3. Coleção 'kits': negar leitura para papel 'Engenheiro'
    try {
      const kitsCol = app.findCollectionByNameOrId('kits')
      kitsCol.listRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      kitsCol.viewRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      app.save(kitsCol)
    } catch (err) {
      console.error('[0063_restrict_engenheiro] Erro ao atualizar regras de kits:', err)
      throw err
    }

    // 4. Coleção 'whatsapp_messages': negar para papel 'Engenheiro'
    try {
      const waCol = app.findCollectionByNameOrId('whatsapp_messages')
      waCol.listRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      waCol.viewRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      waCol.createRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      waCol.updateRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      app.save(waCol)
    } catch (err) {
      console.error(
        '[0063_restrict_engenheiro] Erro ao atualizar regras de whatsapp_messages:',
        err,
      )
      throw err
    }

    // 5. Coleção 'formalizacao_documentos': negar para papel 'Engenheiro'
    try {
      const formDocsCol = app.findCollectionByNameOrId('formalizacao_documentos')
      formDocsCol.listRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      formDocsCol.viewRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      formDocsCol.createRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      formDocsCol.updateRule =
        "@request.auth.id != '' && @request.auth.role != 'Engenheiro' && (criado_por = @request.auth.id || @request.auth.role = 'Admin')"
      formDocsCol.deleteRule =
        "@request.auth.id != '' && @request.auth.role != 'Engenheiro' && (criado_por = @request.auth.id || @request.auth.role = 'Admin')"
      app.save(formDocsCol)
    } catch (err) {
      console.error(
        '[0063_restrict_engenheiro] Erro ao atualizar regras de formalizacao_documentos:',
        err,
      )
      throw err
    }

    // 6. Coleção 'lead_photos': negar para papel 'Engenheiro'
    try {
      const photosCol = app.findCollectionByNameOrId('lead_photos')
      photosCol.listRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      photosCol.viewRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      photosCol.createRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      photosCol.updateRule =
        "@request.auth.id != '' && @request.auth.role != 'Engenheiro' && (criado_por = @request.auth.id || @request.auth.role = 'Admin')"
      photosCol.deleteRule =
        "@request.auth.id != '' && @request.auth.role != 'Engenheiro' && (criado_por = @request.auth.id || @request.auth.role = 'Admin')"
      app.save(photosCol)
    } catch (err) {
      console.error('[0063_restrict_engenheiro] Erro ao atualizar regras de lead_photos:', err)
      throw err
    }
  },
  (app) => {
    // Reverter regras para o estado anterior
    try {
      const leadsCol = app.findCollectionByNameOrId('leads')
      leadsCol.listRule = "@request.auth.id != ''"
      leadsCol.viewRule = "@request.auth.id != ''"
      leadsCol.createRule = "@request.auth.id != ''"
      leadsCol.updateRule =
        "@request.auth.id != '' && (proprietario = @request.auth.id || @request.auth.role = 'Admin')"
      leadsCol.deleteRule =
        "@request.auth.id != '' && (proprietario = @request.auth.id || @request.auth.role = 'Admin')"
      app.save(leadsCol)
    } catch (_) {}

    try {
      const propostasCol = app.findCollectionByNameOrId('propostas')
      propostasCol.listRule = "@request.auth.id != ''"
      propostasCol.viewRule = "@request.auth.id != ''"
      propostasCol.createRule = "@request.auth.id != ''"
      propostasCol.updateRule =
        "@request.auth.id != '' && (criado_por = @request.auth.id || lead.proprietario = @request.auth.id || @request.auth.role = 'Admin')"
      propostasCol.deleteRule =
        "@request.auth.id != '' && (criado_por = @request.auth.id || lead.proprietario = @request.auth.id || @request.auth.role = 'Admin')"
      app.save(propostasCol)
    } catch (_) {}

    try {
      const kitsCol = app.findCollectionByNameOrId('kits')
      kitsCol.listRule = "@request.auth.id != ''"
      kitsCol.viewRule = "@request.auth.id != ''"
      app.save(kitsCol)
    } catch (_) {}

    try {
      const waCol = app.findCollectionByNameOrId('whatsapp_messages')
      waCol.listRule = "@request.auth.id != ''"
      waCol.viewRule = "@request.auth.id != ''"
      waCol.createRule = "@request.auth.id != ''"
      waCol.updateRule = "@request.auth.id != ''"
      app.save(waCol)
    } catch (_) {}

    try {
      const formDocsCol = app.findCollectionByNameOrId('formalizacao_documentos')
      formDocsCol.listRule = "@request.auth.id != ''"
      formDocsCol.viewRule = "@request.auth.id != ''"
      formDocsCol.createRule = "@request.auth.id != ''"
      formDocsCol.updateRule =
        "@request.auth.id != '' && (criado_por = @request.auth.id || @request.auth.role = 'Admin')"
      formDocsCol.deleteRule =
        "@request.auth.id != '' && (criado_por = @request.auth.id || @request.auth.role = 'Admin')"
      app.save(formDocsCol)
    } catch (_) {}

    try {
      const photosCol = app.findCollectionByNameOrId('lead_photos')
      photosCol.listRule = "@request.auth.id != ''"
      photosCol.viewRule = "@request.auth.id != ''"
      photosCol.createRule = "@request.auth.id != ''"
      photosCol.updateRule =
        "@request.auth.id != '' && (criado_por = @request.auth.id || @request.auth.role = 'Admin')"
      photosCol.deleteRule =
        "@request.auth.id != '' && (criado_por = @request.auth.id || @request.auth.role = 'Admin')"
      app.save(photosCol)
    } catch (_) {}
  },
)
