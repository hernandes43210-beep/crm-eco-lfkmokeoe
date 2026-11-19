// 0088: financiamento FNO (BASA) — SAC com carência, juros dias úteis base 252.
// - lead: modalidade_venda ('avista' | 'fno') para o vendedor marcar à vista × financiada.
// - fno_simulacoes: snapshot da simulação gravado junto da proposta.
// - fno_feriados: feriados bancários lidos em tempo de execução pela calculadora.
migrate(
  (app) => {
    // 1) Lead: modalidade de venda
    const leads = app.findCollectionByNameOrId('leads')
    if (!leads.fields.getByName('modalidade_venda')) {
      const f = new SelectField({ name: 'modalidade_venda', values: ['avista', 'fno'] })
      f.required = false
      leads.fields.add(f)
    }
    app.save(leads)

    // 2) Feriados bancários
    let feriados
    try {
      feriados = app.findCollectionByNameOrId('fno_feriados')
    } catch (_) {
      feriados = new Collection({
        name: 'fno_feriados',
        type: 'base',
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          new TextField({ name: 'data', required: true, min: 10, max: 10 }),
          new TextField({ name: 'nome', required: true, max: 200 }),
        ],
        indexes: ['CREATE UNIQUE INDEX idx_fno_feriados_data ON fno_feriados (data)'],
      })
      app.save(feriados)
    }

    // 3) Simulações FNO (snapshot por proposta)
    let sims
    try {
      sims = app.findCollectionByNameOrId('fno_simulacoes')
    } catch (_) {
      sims = new Collection({
        name: 'fno_simulacoes',
        type: 'base',
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          new RelationField({
            name: 'proposta',
            required: true,
            collectionId: '',
            collectionName: 'propostas',
            cascadeDelete: true,
            maxSelect: 1,
          }),
          new NumberField({ name: 'valor_financiado', onlyInt: false }),
          new NumberField({ name: 'valor_entrada', onlyInt: false }),
          new NumberField({ name: 'taxa_anual', onlyInt: false }),
          new NumberField({ name: 'prazo_meses', onlyInt: true }),
          new NumberField({ name: 'carencia_meses', onlyInt: true }),
          new TextField({ name: 'data_base', max: 10 }),
          new TextField({ name: 'primeiro_vencimento', max: 10 }),
          new NumberField({ name: 'total_juros', onlyInt: false }),
          new NumberField({ name: 'total_pago', onlyInt: false }),
          new NumberField({ name: 'parcela_primeiro_mes', onlyInt: false }),
          new JsonField({ name: 'cronograma', maxSize: 4194304 }),
          new TextField({ name: 'gerado_por', max: 200 }),
        ],
      })
      app.save(sims)
    }
  },
  (app) => {
    const drop = (name) => {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch (_) {}
    }
    drop('fno_simulacoes')
    drop('fno_feriados')
    const leads = app.findCollectionByNameOrId('leads')
    if (leads.fields.getByName('modalidade_venda')) {
      leads.fields.removeByName('modalidade_venda')
      app.save(leads)
    }
  },
)
