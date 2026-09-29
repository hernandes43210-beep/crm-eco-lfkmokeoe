migrate(
  (app) => {
    // 0069_add_pode_supervisionar_engenharia.js
    //
    // Permissão de supervisão para engenheiros no CRM ECO:
    // 1. Adicionar campo booleano 'pode_supervisionar_engenharia' (default false) na coleção users.
    // 2. Atualizar regras de RLS nas coleções:
    //    - 'homologacoes':
    //        listRule, viewRule, updateRule:
    //        Permitir que (@request.auth.role = 'Engenheiro' && (engenheiro = @request.auth.id || @request.auth.pode_supervisionar_engenharia = true))
    //    - 'arquivos_engenharia':
    //        listRule, viewRule, createRule, updateRule:
    //        Permitir que (@request.auth.role = 'Engenheiro' && (homologacao.engenheiro = @request.auth.id || @request.auth.pode_supervisionar_engenharia = true))
    //    - 'dossies_engenharia':
    //        listRule, viewRule:
    //        Permitir que engenheiro supervisor possa ver os dossiês técnicos dos outros engenheiros também.
    //    - 'documentos_lead':
    //        listRule, viewRule:
    //        Permitir que engenheiro supervisor possa ver documentos técnicos dos leads em homologação.

    // 1. Adicionar campo em 'users'
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (!usersCol.fields.getByName('pode_supervisionar_engenharia')) {
        usersCol.fields.add(
          new BoolField({
            name: 'pode_supervisionar_engenharia',
            required: false,
          }),
        )
        app.save(usersCol)
      }
    } catch (err) {
      console.error('[0069] Erro ao adicionar campo pode_supervisionar_engenharia em users:', err)
      throw err
    }

    // 2. Atualizar regras na coleção 'homologacoes'
    try {
      if (app.hasTable('homologacoes')) {
        const homCol = app.findCollectionByNameOrId('homologacoes')

        homCol.listRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && (engenheiro = @request.auth.id || @request.auth.pode_supervisionar_engenharia = true)) || (@request.auth.role = 'Vendedor' && (vendedor = @request.auth.id || lead.proprietario = @request.auth.id)))"

        homCol.viewRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && (engenheiro = @request.auth.id || @request.auth.pode_supervisionar_engenharia = true)) || (@request.auth.role = 'Vendedor' && (vendedor = @request.auth.id || lead.proprietario = @request.auth.id)))"

        homCol.updateRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && (engenheiro = @request.auth.id || @request.auth.pode_supervisionar_engenharia = true)) || (@request.auth.role = 'Vendedor' && (vendedor = @request.auth.id || lead.proprietario = @request.auth.id)))"

        homCol.createRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
        homCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'Admin'"

        app.save(homCol)
      }
    } catch (err) {
      console.error('[0069] Erro ao atualizar regras de homologacoes:', err)
      throw err
    }

    // 3. Atualizar regras na coleção 'arquivos_engenharia'
    try {
      if (app.hasTable('arquivos_engenharia')) {
        const arqCol = app.findCollectionByNameOrId('arquivos_engenharia')

        arqCol.listRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && (homologacao.engenheiro = @request.auth.id || @request.auth.pode_supervisionar_engenharia = true)) || (@request.auth.role = 'Vendedor' && (homologacao.vendedor = @request.auth.id || lead.proprietario = @request.auth.id)) || criado_por = @request.auth.id)"

        arqCol.viewRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && (homologacao.engenheiro = @request.auth.id || @request.auth.pode_supervisionar_engenharia = true)) || (@request.auth.role = 'Vendedor' && (homologacao.vendedor = @request.auth.id || lead.proprietario = @request.auth.id)) || criado_por = @request.auth.id)"

        arqCol.createRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && (homologacao.engenheiro = @request.auth.id || @request.auth.pode_supervisionar_engenharia = true)) || @request.auth.role = 'Vendedor')"

        arqCol.updateRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && (homologacao.engenheiro = @request.auth.id || @request.auth.pode_supervisionar_engenharia = true)) || criado_por = @request.auth.id)"

        arqCol.deleteRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || criado_por = @request.auth.id)"

        app.save(arqCol)
      }
    } catch (err) {
      console.error('[0069] Erro ao atualizar regras de arquivos_engenharia:', err)
      throw err
    }

    // 4. Atualizar regras na coleção 'dossies_engenharia'
    try {
      if (app.hasTable('dossies_engenharia')) {
        const dossiesCol = app.findCollectionByNameOrId('dossies_engenharia')

        dossiesCol.listRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || engenheiro_destino = @request.auth.id || (@request.auth.role = 'Engenheiro' && @request.auth.pode_supervisionar_engenharia = true) || enviado_por = @request.auth.id)"

        dossiesCol.viewRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || engenheiro_destino = @request.auth.id || (@request.auth.role = 'Engenheiro' && @request.auth.pode_supervisionar_engenharia = true) || enviado_por = @request.auth.id)"

        app.save(dossiesCol)
      }
    } catch (err) {
      console.error('[0069] Erro ao atualizar regras de dossies_engenharia:', err)
      throw err
    }

    // 5. Atualizar regras na coleção 'documentos_lead'
    try {
      if (app.hasTable('documentos_lead')) {
        const docsLeadCol = app.findCollectionByNameOrId('documentos_lead')

        docsLeadCol.listRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || engenheiro_destino = @request.auth.id || (@request.auth.role = 'Engenheiro' && @request.auth.pode_supervisionar_engenharia = true) || enviado_por = @request.auth.id)"

        docsLeadCol.viewRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || engenheiro_destino = @request.auth.id || (@request.auth.role = 'Engenheiro' && @request.auth.pode_supervisionar_engenharia = true) || enviado_por = @request.auth.id)"

        app.save(docsLeadCol)
      }
    } catch (err) {
      console.error('[0069] Erro ao atualizar regras de documentos_lead:', err)
      throw err
    }
  },
  (app) => {
    // Rollback para migration 0068
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('pode_supervisionar_engenharia')) {
        usersCol.fields.removeByName('pode_supervisionar_engenharia')
        app.save(usersCol)
      }
    } catch (_) {}

    try {
      if (app.hasTable('homologacoes')) {
        const homCol = app.findCollectionByNameOrId('homologacoes')
        homCol.listRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && engenheiro = @request.auth.id) || (@request.auth.role = 'Vendedor' && (vendedor = @request.auth.id || lead.proprietario = @request.auth.id)))"
        homCol.viewRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && engenheiro = @request.auth.id) || (@request.auth.role = 'Vendedor' && (vendedor = @request.auth.id || lead.proprietario = @request.auth.id)))"
        homCol.updateRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && engenheiro = @request.auth.id) || (@request.auth.role = 'Vendedor' && (vendedor = @request.auth.id || lead.proprietario = @request.auth.id)))"
        app.save(homCol)
      }
    } catch (_) {}

    try {
      if (app.hasTable('arquivos_engenharia')) {
        const arqCol = app.findCollectionByNameOrId('arquivos_engenharia')
        arqCol.listRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && homologacao.engenheiro = @request.auth.id) || (@request.auth.role = 'Vendedor' && (homologacao.vendedor = @request.auth.id || lead.proprietario = @request.auth.id)) || criado_por = @request.auth.id)"
        arqCol.viewRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && homologacao.engenheiro = @request.auth.id) || (@request.auth.role = 'Vendedor' && (homologacao.vendedor = @request.auth.id || lead.proprietario = @request.auth.id)) || criado_por = @request.auth.id)"
        arqCol.createRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && homologacao.engenheiro = @request.auth.id) || @request.auth.role = 'Vendedor')"
        arqCol.updateRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && homologacao.engenheiro = @request.auth.id) || criado_por = @request.auth.id)"
        app.save(arqCol)
      }
    } catch (_) {}

    try {
      if (app.hasTable('dossies_engenharia')) {
        const dossiesCol = app.findCollectionByNameOrId('dossies_engenharia')
        dossiesCol.listRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || engenheiro_destino = @request.auth.id || enviado_por = @request.auth.id)"
        dossiesCol.viewRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || engenheiro_destino = @request.auth.id || enviado_por = @request.auth.id)"
        app.save(dossiesCol)
      }
    } catch (_) {}

    try {
      if (app.hasTable('documentos_lead')) {
        const docsLeadCol = app.findCollectionByNameOrId('documentos_lead')
        docsLeadCol.listRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || engenheiro_destino = @request.auth.id || enviado_por = @request.auth.id)"
        docsLeadCol.viewRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || engenheiro_destino = @request.auth.id || enviado_por = @request.auth.id)"
        app.save(docsLeadCol)
      }
    } catch (_) {}
  },
)
