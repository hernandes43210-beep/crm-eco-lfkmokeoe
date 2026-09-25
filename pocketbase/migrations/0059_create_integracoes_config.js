migrate(
  (app) => {
    // Criação da coleção integracoes_config para armazenar credenciais e configurações de integrações
    // protegida estritamente por regras de acesso de perfil Admin.
    // Usuários sem autenticação ou com perfil Vendedor NUNCA têm permissão de ler ou gravar.
    if (!app.hasTable('integracoes_config')) {
      const col = new Collection({
        name: 'integracoes_config',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        viewRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        createRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        updateRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
        fields: [
          {
            name: 'chave',
            type: 'text',
            required: true,
          },
          {
            name: 'api_key',
            type: 'text',
            required: false,
          },
          {
            name: 'descricao',
            type: 'text',
            required: false,
          },
          {
            name: 'ativo',
            type: 'bool',
          },
          {
            name: 'ultimo_teste_status',
            type: 'text',
            required: false,
          },
          {
            name: 'ultimo_teste_mensagem',
            type: 'text',
            required: false,
          },
          {
            name: 'ultimo_teste_em',
            type: 'date',
            required: false,
          },
          {
            name: 'dados_extras',
            type: 'json',
            required: false,
          },
          {
            name: 'created',
            type: 'autodate',
            onCreate: true,
            onUpdate: false,
          },
          {
            name: 'updated',
            type: 'autodate',
            onCreate: true,
            onUpdate: true,
          },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_integracoes_config_chave ON integracoes_config (chave)'],
      })
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('integracoes_config')
      app.delete(col)
    } catch (_) {}
  },
)
