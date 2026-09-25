migrate(
  (app) => {
    const rows = arrayOf(
      new DynamicModel({
        id: '',
        nome: '',
        len: 0,
      }),
    )
    app
      .db()
      .newQuery(
        'SELECT id, nome, LENGTH(historico) as len FROM leads WHERE historico IS NOT NULL ORDER BY len DESC LIMIT 10',
      )
      .all(rows)
    for (let i = 0; i < rows.length; i++) {
      console.log('[HIST_LEN]', rows[i].id, rows[i].nome, rows[i].len)
    }
  },
  () => {},
)
