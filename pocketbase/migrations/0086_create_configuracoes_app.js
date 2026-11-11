// 0086: coleção configuracoes_app — um registro único por app com as
// preferências globais do CRM (cor primária do tema, modelo de proposta
// padrão, margem padrão do Gerador de Kit e observações livres).
// Somente Admin/CEO leem e gravam.
migrate(
  (app) => {
    if (!app.hasTable('configuracoes_app')) {
      const col = new Collection({
        name: 'configuracoes_app',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'CEO')",
        viewRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'CEO')",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'CEO')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'CEO')",
        deleteRule: null,
        fields: [
          {
            name: 'chave',
            type: 'text',
            required: true,
          },
          {
            name: 'cor_primaria',
            type: 'text',
            required: false,
          },
          {
            name: 'modelo_proposta_padrao',
            type: 'select',
            required: false,
            values: ['classica', 'story'],
            maxSelect: 1,
          },
          {
            name: 'margem_padrao_kit',
            type: 'number',
            required: false,
          },
          {
            name: 'observacoes',
            type: 'text',
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
        indexes: ['CREATE UNIQUE INDEX idx_configuracoes_app_chave ON configuracoes_app (chave)'],
      })
      app.save(col)

      // Registro único padrão
      app
        .db()
        .newQuery(
          "INSERT INTO configuracoes_app (chave, cor_primaria, modelo_proposta_padrao, margem_padrao_kit, observacoes) VALUES ('app', '0B7A5B', 'classica', 41, '')",
        )
        .execute()
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('configuracoes_app')
      app.delete(col)
    } catch (_) {}
  },
)
