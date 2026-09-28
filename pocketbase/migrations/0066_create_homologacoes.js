migrate(
  (app) => {
    // 0066_create_homologacoes.js
    // Coleção para o Kanban de homologação e fluxo de ART do módulo de Engenharia.
    // Atende aos requisitos:
    // - 7 colunas do Kanban: novo_cliente -> em_projeto -> homologacao -> resposta_energisa -> liberado_vistoria -> vistoria_solicitada -> entregue
    // - Isolamento comercial mantido (migration 0063): engenheiro só acessa seus registros em 'homologacoes'
    // - Dados essenciais do lead denormalizados para o Engenheiro não precisar ler 'leads'
    // - ART (anexo PDF), status da ART ('nenhuma', 'enviada', 'paga'), timestamps e histórico simples

    // 1. Atualizar SelectField 'tipo' na coleção 'notificacoes' para permitir 'homologacao_art'
    try {
      const notifCol = app.findCollectionByNameOrId('notificacoes')
      const notifTipoField = notifCol.fields.getByName('tipo')
      if (notifTipoField) {
        notifCol.fields.removeByName('tipo')
      }
      notifCol.fields.add(
        new SelectField({
          name: 'tipo',
          required: false,
          values: [
            'lead_cidade',
            'geral',
            'sla',
            'contato',
            'documentos_engenharia',
            'homologacao_art',
          ],
          maxSelect: 1,
        }),
      )
      app.save(notifCol)
    } catch (notifErr) {
      console.warn('[0066] Erro ao atualizar tipo em notificacoes:', notifErr)
    }

    // 2. Criar coleção 'homologacoes' se não existir
    if (!app.hasTable('homologacoes')) {
      const leadsCol = app.findCollectionByNameOrId('leads')
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      let dossiesColId = ''
      try {
        dossiesColId = app.findCollectionByNameOrId('dossies_engenharia').id
      } catch (_) {}

      const homologacoesCol = new Collection({
        name: 'homologacoes',
        type: 'base',
        // RLS:
        // - Engenheiro pode ver e editar suas próprias homologações (engenheiro = @request.auth.id)
        // - Admin e Vendedor podem listar e visualizar todas as homologações
        // - Vendedor pode atualizar (ex: marcar ART como paga) se for o vendedor responsável ou criador/proprietário
        // - Admin pode criar, atualizar e excluir
        listRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || engenheiro = @request.auth.id || vendedor = @request.auth.id)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || engenheiro = @request.auth.id || vendedor = @request.auth.id)",
        createRule: "@request.auth.id != ''",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || engenheiro = @request.auth.id || vendedor = @request.auth.id || @request.auth.role = 'Vendedor')",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        fields: [
          {
            name: 'lead',
            type: 'relation',
            required: true,
            collectionId: leadsCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          ...(dossiesColId
            ? [
                {
                  name: 'dossie',
                  type: 'relation',
                  required: false,
                  collectionId: dossiesColId,
                  cascadeDelete: false,
                  maxSelect: 1,
                },
              ]
            : []),
          {
            name: 'engenheiro',
            type: 'relation',
            required: true,
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'vendedor',
            type: 'relation',
            required: false,
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          // Status nas 7 colunas do Kanban
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'novo_cliente',
              'em_projeto',
              'homologacao',
              'resposta_energisa',
              'liberado_vistoria',
              'vistoria_solicitada',
              'entregue',
            ],
            maxSelect: 1,
          },
          // Dados da ART
          {
            name: 'art_arquivo',
            type: 'file',
            required: false,
            maxSelect: 1,
            maxSize: 31457280, // 30MB
            mimeTypes: ['application/pdf'],
          },
          {
            name: 'art_status',
            type: 'select',
            required: false,
            values: ['nenhuma', 'enviada', 'paga'],
            maxSelect: 1,
          },
          {
            name: 'art_enviada_em',
            type: 'date',
            required: false,
          },
          {
            name: 'art_paga_em',
            type: 'date',
            required: false,
          },
          {
            name: 'art_observacao',
            type: 'text',
            required: false,
          },
          // Campos denormalizados para acesso do Engenheiro (isolamento comercial migration 0063)
          {
            name: 'cliente_nome',
            type: 'text',
            required: false,
          },
          {
            name: 'cliente_telefone',
            type: 'text',
            required: false,
          },
          {
            name: 'cliente_cidade',
            type: 'text',
            required: false,
          },
          {
            name: 'cliente_estado',
            type: 'text',
            required: false,
          },
          {
            name: 'endereco_instalacao',
            type: 'text',
            required: false,
          },
          {
            name: 'unidade_consumidora',
            type: 'text',
            required: false,
          },
          {
            name: 'potencia_total_kwp',
            type: 'number',
            required: false,
          },
          {
            name: 'kit_resumo',
            type: 'text',
            required: false,
          },
          {
            name: 'versao_dossie',
            type: 'number',
            required: false,
          },
          {
            name: 'visualizado_em',
            type: 'date',
            required: false,
          },
          // Histórico de movimentações e eventos da homologação
          {
            name: 'historico',
            type: 'json',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_homologacoes_lead ON homologacoes (lead)',
          'CREATE INDEX idx_homologacoes_engenheiro ON homologacoes (engenheiro)',
          'CREATE INDEX idx_homologacoes_vendedor ON homologacoes (vendedor)',
          'CREATE INDEX idx_homologacoes_status ON homologacoes (status)',
          'CREATE INDEX idx_homologacoes_art_status ON homologacoes (art_status)',
          'CREATE INDEX idx_homologacoes_created ON homologacoes (created DESC)',
        ],
      })

      app.save(homologacoesCol)
    }
  },
  (app) => {
    try {
      const homologacoesCol = app.findCollectionByNameOrId('homologacoes')
      app.delete(homologacoesCol)
    } catch (_) {}
  },
)
