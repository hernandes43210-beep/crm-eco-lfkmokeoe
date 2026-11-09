// 0084: adiciona kit_qtd_inversores em propostas (snapshot do gerador de kit).
// O PDF/clássico precisa exibir a QUANTIDADE de inversores do kit — hoje a proposta
// guarda só marca e potência do inversor, e a tela renderizava sempre "1x".
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('propostas')
    if (!col.fields.getByName('kit_qtd_inversores')) {
      col.fields.add(
        new NumberField({
          name: 'kit_qtd_inversores',
          required: false,
          min: 0,
          onlyInt: true,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('propostas')
    if (col.fields.getByName('kit_qtd_inversores')) {
      col.fields.removeByName('kit_qtd_inversores')
    }
    app.save(col)
  },
)
