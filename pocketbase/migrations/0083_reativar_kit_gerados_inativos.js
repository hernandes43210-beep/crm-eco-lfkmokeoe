migrate(
  (app) => {
    // Reativa kits salvos que ficaram com ativo = false (kits que sumiam da aba "Kits salvos").
    // Idempotente: se não houver nenhum kit inativo, o UPDATE não altera linhas.
    if (!app.hasTable('kit_gerados')) {
      return
    }
    app.db().newQuery('UPDATE kit_gerados SET ativo = 1 WHERE ativo = 0').execute()
  },
  (app) => {
    // Sem reversão: não é possível saber quais kits estavam inativos antes desta migration.
  },
)
