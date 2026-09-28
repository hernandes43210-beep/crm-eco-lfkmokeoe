migrate(
  (app) => {
    // 0064_create_dossies_engenharia.js
    // Coleção dedicada para armazenar os dados do dossiê técnico de engenharia enviados pelo comercial.
    // Permite que o Engenheiro veja os dados do cliente, local de instalação e equipamentos negociados
    // sem violar as restrições de isolamento comercial da migration 0063 (que bloqueia 'leads', 'propostas', etc.).

    if (!app.hasTable('dossies_engenharia')) {
      const leadsCol = app.findCollectionByNameOrId('leads')
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

      const dossiesCol = new Collection({
        name: 'dossies_engenharia',
        type: 'base',
        // RLS:
        // - Engenheiro pode listar e visualizar apenas os dossiês direcionados a ele (engenheiro_destino).
        // - Admin e Vendedor podem listar e visualizar dossiês.
        // - Engenheiro NÃO pode criar ou alterar (somente leitura para o papel Engenheiro).
        // - Admin e Vendedor podem criar e atualizar.
        listRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || engenheiro_destino = @request.auth.id || enviado_por = @request.auth.id)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || engenheiro_destino = @request.auth.id || enviado_por = @request.auth.id)",
        createRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || enviado_por = @request.auth.id)",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || enviado_por = @request.auth.id)",
        fields: [
          {
            name: 'lead',
            type: 'relation',
            required: true,
            collectionId: leadsCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'engenheiro_destino',
            type: 'relation',
            required: false,
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'enviado_por',
            type: 'relation',
            required: false,
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          // Dados do Lead / Cliente
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
            name: 'cliente_email',
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
            name: 'consumo_medio_kwh',
            type: 'number',
            required: false,
          },
          // Equipamentos e Kit Negociado
          {
            name: 'kit_nome',
            type: 'text',
            required: false,
          },
          {
            name: 'potencia_total_kwp',
            type: 'number',
            required: false,
          },
          {
            name: 'paineis_quantidade',
            type: 'number',
            required: false,
          },
          {
            name: 'paineis_modelo',
            type: 'text',
            required: false,
          },
          {
            name: 'paineis_potencia_w',
            type: 'number',
            required: false,
          },
          {
            name: 'inversor_marca',
            type: 'text',
            required: false,
          },
          {
            name: 'inversor_modelo',
            type: 'text',
            required: false,
          },
          {
            name: 'inversor_potencia_kw',
            type: 'number',
            required: false,
          },
          {
            name: 'inversor_quantidade',
            type: 'number',
            required: false,
          },
          {
            name: 'tipo_instalacao',
            type: 'select',
            required: false,
            values: ['telhado', 'solo', 'outro'],
            maxSelect: 1,
          },
          {
            name: 'tipo_estrutura_detalhe',
            type: 'text',
            required: false,
          },
          {
            name: 'observacoes',
            type: 'text',
            required: false,
          },
          {
            name: 'versao',
            type: 'number',
            required: false,
          },
          {
            name: 'dados_extras',
            type: 'json',
            required: false,
          },
          {
            name: 'enviado_em',
            type: 'date',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_dossies_lead ON dossies_engenharia (lead)',
          'CREATE INDEX idx_dossies_engenheiro ON dossies_engenharia (engenheiro_destino)',
          'CREATE INDEX idx_dossies_created ON dossies_engenharia (created DESC)',
        ],
      })

      app.save(dossiesCol)
    }
  },
  (app) => {
    try {
      const dossiesCol = app.findCollectionByNameOrId('dossies_engenharia')
      app.delete(dossiesCol)
    } catch (_) {}
  },
)
