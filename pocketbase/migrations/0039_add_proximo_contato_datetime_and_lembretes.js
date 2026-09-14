migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('leads')

    // 1. Data e hora do próximo contato agendado (formato ISO / datetime string)
    if (!col.fields.getByName('proximo_contato_data')) {
      col.fields.add(
        new DateField({
          name: 'proximo_contato_data',
          required: false,
        }),
      )
    }

    // 2. Observação/nota do contato agendado
    if (!col.fields.getByName('proximo_contato_obs')) {
      col.fields.add(
        new TextField({
          name: 'proximo_contato_obs',
          required: false,
        }),
      )
    }

    // 3. Flags de lembretes enviados para evitar envios duplicados
    if (!col.fields.getByName('lembrete_1d_enviado')) {
      col.fields.add(
        new BoolField({
          name: 'lembrete_1d_enviado',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('lembrete_4h_enviado')) {
      col.fields.add(
        new BoolField({
          name: 'lembrete_4h_enviado',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('lembrete_20m_enviado')) {
      col.fields.add(
        new BoolField({
          name: 'lembrete_20m_enviado',
          required: false,
        }),
      )
    }

    // 4. Registro de log/data dos envios dos lembretes
    if (!col.fields.getByName('lembretes_logs')) {
      col.fields.add(
        new JSONField({
          name: 'lembretes_logs',
          required: false,
        }),
      )
    }

    app.save(col)

    // Índice para otimizar busca no cron de lembretes
    try {
      col.addIndex('idx_leads_proximo_contato_data', false, 'proximo_contato_data', '')
      app.save(col)
    } catch (_) {
      // index already exists or optional
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('leads')
    try {
      col.removeIndex('idx_leads_proximo_contato_data')
    } catch (_) {}

    const fieldsToRemove = [
      'proximo_contato_data',
      'proximo_contato_obs',
      'lembrete_1d_enviado',
      'lembrete_4h_enviado',
      'lembrete_20m_enviado',
      'lembretes_logs',
    ]

    for (let i = 0; i < fieldsToRemove.length; i++) {
      if (col.fields.getByName(fieldsToRemove[i])) {
        col.fields.removeByName(fieldsToRemove[i])
      }
    }
    app.save(col)
  },
)
