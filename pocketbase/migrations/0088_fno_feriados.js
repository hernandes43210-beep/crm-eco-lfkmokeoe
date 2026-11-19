// 0088: Financiamento FNO (BASA).
// fno_feriados — feriados bancários em coleção própria, lidos em tempo de execução
//                pela calculadora de dias úteis (base 252).
// leads.modalidade_venda — 'avista' (padrão) ou 'fno'.
// propostas.modalidade_venda + propostas.fno_simulacao — modalidade e snapshot
//                JSON da simulação gravados junto da proposta.
migrate(
  (app) => {
    // 1) Coleção de feriados bancários (idempotente)
    let feriados = null
    try {
      feriados = app.findCollectionByNameOrId('fno_feriados')
    } catch (_) {
      feriados = null
    }
    if (!feriados) {
      feriados = new Collection({
        name: 'fno_feriados',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          new TextField({ name: 'data', required: true, min: 10, max: 10 }),
          new TextField({ name: 'nome', required: true, max: 200 }),
        ],
        indexes: ['CREATE UNIQUE INDEX idx_fno_feriados_data ON fno_feriados (data)'],
      })
      app.save(feriados)

      // Semente: feriados nacionais bancários 2025–2027 (fixos + móveis).
      const seed = [
        ['2025-01-01', 'Confraternização Universal'],
        ['2025-03-03', 'Carnaval'],
        ['2025-03-04', 'Carnaval'],
        ['2025-04-18', 'Sexta-feira Santa'],
        ['2025-04-21', 'Tiradentes'],
        ['2025-05-01', 'Dia do Trabalho'],
        ['2025-06-19', 'Corpus Christi'],
        ['2025-09-07', 'Independência do Brasil'],
        ['2025-10-12', 'Nossa Senhora Aparecida'],
        ['2025-11-02', 'Finados'],
        ['2025-11-15', 'Proclamação da República'],
        ['2025-11-20', 'Consciência Negra'],
        ['2025-12-25', 'Natal'],
        ['2026-01-01', 'Confraternização Universal'],
        ['2026-02-16', 'Carnaval'],
        ['2026-02-17', 'Carnaval'],
        ['2026-04-03', 'Sexta-feira Santa'],
        ['2026-04-21', 'Tiradentes'],
        ['2026-05-01', 'Dia do Trabalho'],
        ['2026-06-04', 'Corpus Christi'],
        ['2026-09-07', 'Independência do Brasil'],
        ['2026-10-12', 'Nossa Senhora Aparecida'],
        ['2026-11-02', 'Finados'],
        ['2026-11-15', 'Proclamação da República'],
        ['2026-11-20', 'Consciência Negra'],
        ['2026-12-25', 'Natal'],
        ['2027-01-01', 'Confraternização Universal'],
        ['2027-02-08', 'Carnaval'],
        ['2027-02-09', 'Carnaval'],
        ['2027-03-26', 'Sexta-feira Santa'],
        ['2027-04-21', 'Tiradentes'],
        ['2027-05-01', 'Dia do Trabalho'],
        ['2027-05-27', 'Corpus Christi'],
        ['2027-09-07', 'Independência do Brasil'],
        ['2027-10-12', 'Nossa Senhora Aparecida'],
        ['2027-11-02', 'Finados'],
        ['2027-11-15', 'Proclamação da República'],
        ['2027-11-20', 'Consciência Negra'],
        ['2027-12-25', 'Natal'],
      ]
      const collectionFeriados = app.findCollectionByNameOrId('fno_feriados')
      for (const row of seed) {
        const record = new Record(collectionFeriados)
        record.set('data', row[0])
        record.set('nome', row[1])
        app.save(record)
      }
    }

    // 2) leads.modalidade_venda
    const leads = app.findCollectionByNameOrId('leads')
    if (!leads.fields.getByName('modalidade_venda')) {
      leads.fields.add(
        new SelectField({
          name: 'modalidade_venda',
          required: false,
          maxSelect: 1,
          values: ['avista', 'fno'],
        }),
      )
    }
    app.save(leads)

    // 3) propostas.modalidade_venda + propostas.fno_simulacao
    const propostas = app.findCollectionByNameOrId('propostas')
    if (!propostas.fields.getByName('modalidade_venda')) {
      propostas.fields.add(
        new SelectField({
          name: 'modalidade_venda',
          required: false,
          maxSelect: 1,
          values: ['avista', 'fno'],
        }),
      )
    }
    if (!propostas.fields.getByName('fno_simulacao')) {
      propostas.fields.add(
        new JSONField({
          name: 'fno_simulacao',
          required: false,
          maxSize: 2000000,
        }),
      )
    }
    app.save(propostas)
  },
  (app) => {
    const propostas = app.findCollectionByNameOrId('propostas')
    if (propostas.fields.getByName('fno_simulacao')) {
      propostas.fields.removeByName('fno_simulacao')
    }
    if (propostas.fields.getByName('modalidade_venda')) {
      propostas.fields.removeByName('modalidade_venda')
    }
    app.save(propostas)

    const leads = app.findCollectionByNameOrId('leads')
    if (leads.fields.getByName('modalidade_venda')) {
      leads.fields.removeByName('modalidade_venda')
    }
    app.save(leads)

    try {
      const feriados = app.findCollectionByNameOrId('fno_feriados')
      app.delete(feriados)
    } catch (_) {
      // coleção não existe — nada a desfazer
    }
  },
)
