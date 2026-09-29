migrate(
  (app) => {
    // 0068_reinforce_engenheiro_rls_homologacoes.js
    //
    // Atende ao Requisito (2):
    // Garantir que, com mais de um engenheiro na equipe, cada engenheiro acessa
    // APENAS as homologações enviadas especificamente para ele (filtro rígido no backend).
    //
    // - Regras RLS na coleção 'homologacoes':
    //   listRule & viewRule:
    //     @request.auth.id != '' && (
    //       @request.auth.role = 'Admin' ||
    //       (@request.auth.role = 'Engenheiro' && engenheiro = @request.auth.id) ||
    //       (@request.auth.role = 'Vendedor' && (vendedor = @request.auth.id || lead.proprietario = @request.auth.id))
    //     )
    //   updateRule:
    //     @request.auth.id != '' && (
    //       @request.auth.role = 'Admin' ||
    //       (@request.auth.role = 'Engenheiro' && engenheiro = @request.auth.id) ||
    //       (@request.auth.role = 'Vendedor' && (vendedor = @request.auth.id || lead.proprietario = @request.auth.id))
    //     )
    //   createRule: @request.auth.id != '' && @request.auth.role != 'Engenheiro'
    //   deleteRule: @request.auth.id != '' && @request.auth.role = 'Admin'
    //
    // - Regras RLS na coleção 'arquivos_engenharia':
    //   listRule & viewRule:
    //     @request.auth.id != '' && (
    //       @request.auth.role = 'Admin' ||
    //       (@request.auth.role = 'Engenheiro' && homologacao.engenheiro = @request.auth.id) ||
    //       (@request.auth.role = 'Vendedor' && (homologacao.vendedor = @request.auth.id || lead.proprietario = @request.auth.id)) ||
    //       criado_por = @request.auth.id
    //     )
    //   createRule:
    //     @request.auth.id != '' && (
    //       @request.auth.role = 'Admin' ||
    //       (@request.auth.role = 'Engenheiro' && homologacao.engenheiro = @request.auth.id) ||
    //       @request.auth.role = 'Vendedor'
    //     )
    //   updateRule:
    //     @request.auth.id != '' && (
    //       @request.auth.role = 'Admin' ||
    //       (@request.auth.role = 'Engenheiro' && homologacao.engenheiro = @request.auth.id) ||
    //       criado_por = @request.auth.id
    //     )
    //   deleteRule:
    //     @request.auth.id != '' && (@request.auth.role = 'Admin' || criado_por = @request.auth.id)

    try {
      const homCol = app.findCollectionByNameOrId('homologacoes')

      homCol.listRule =
        "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && engenheiro = @request.auth.id) || (@request.auth.role = 'Vendedor' && (vendedor = @request.auth.id || lead.proprietario = @request.auth.id)))"

      homCol.viewRule =
        "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && engenheiro = @request.auth.id) || (@request.auth.role = 'Vendedor' && (vendedor = @request.auth.id || lead.proprietario = @request.auth.id)))"

      homCol.updateRule =
        "@request.auth.id != '' && (@request.auth.role = 'Admin' || (@request.auth.role = 'Engenheiro' && engenheiro = @request.auth.id) || (@request.auth.role = 'Vendedor' && (vendedor = @request.auth.id || lead.proprietario = @request.auth.id)))"

      homCol.createRule = "@request.auth.id != '' && @request.auth.role != 'Engenheiro'"
      homCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'Admin'"

      app.save(homCol)
    } catch (err) {
      console.error('[0068] Erro ao atualizar regras de homologacoes:', err)
      throw err
    }

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

        arqCol.deleteRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || criado_por = @request.auth.id)"

        app.save(arqCol)
      }
    } catch (err) {
      console.error('[0068] Erro ao atualizar regras de arquivos_engenharia:', err)
      throw err
    }
  },
  (app) => {
    try {
      const homCol = app.findCollectionByNameOrId('homologacoes')
      homCol.listRule =
        "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || engenheiro = @request.auth.id || vendedor = @request.auth.id)"
      homCol.viewRule =
        "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || engenheiro = @request.auth.id || vendedor = @request.auth.id)"
      homCol.updateRule =
        "@request.auth.id != '' && (@request.auth.role = 'Admin' || engenheiro = @request.auth.id || vendedor = @request.auth.id || @request.auth.role = 'Vendedor')"
      homCol.createRule = "@request.auth.id != ''"
      homCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'Admin'"
      app.save(homCol)
    } catch (_) {}

    try {
      if (app.hasTable('arquivos_engenharia')) {
        const arqCol = app.findCollectionByNameOrId('arquivos_engenharia')
        arqCol.listRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || homologacao.engenheiro = @request.auth.id || criado_por = @request.auth.id)"
        arqCol.viewRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || homologacao.engenheiro = @request.auth.id || criado_por = @request.auth.id)"
        arqCol.createRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Engenheiro' || @request.auth.role = 'Vendedor')"
        arqCol.updateRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || criado_por = @request.auth.id || homologacao.engenheiro = @request.auth.id)"
        arqCol.deleteRule =
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || criado_por = @request.auth.id)"
        app.save(arqCol)
      }
    } catch (_) {}
  },
)
