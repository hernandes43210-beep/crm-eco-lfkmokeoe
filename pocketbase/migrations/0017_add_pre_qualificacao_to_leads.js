migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('leads')

    // Campo status_qualificacao:
    // - null ou "" para leads normais (diretos / Luvik / planilha / leads antigos do site)
    // - "aguardando": leads recém-chegados do site aguardando triagem
    // - "qualificado": lead avaliado e aprovado para o funil (estágio "Novo")
    // - "descartado": lead avaliado e descartado (fora da região, teste, concorrente, etc.)
    if (!col.fields.getByName('status_qualificacao')) {
      col.fields.add(
        new SelectField({
          name: 'status_qualificacao',
          values: ['aguardando', 'qualificado', 'descartado'],
          maxSelect: 1,
        }),
      )
    }

    // Data em que o lead foi qualificado (quando o SLA passa a contar)
    if (!col.fields.getByName('qualificado_em')) {
      col.fields.add(
        new DateField({
          name: 'qualificado_em',
        }),
      )
    }

    // Usuário que qualificou ou descartou
    if (!col.fields.getByName('qualificado_por')) {
      col.fields.add(
        new RelationField({
          name: 'qualificado_por',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        }),
      )
    }

    // Motivo do descarte (opcional, ex: "Fora da região", "Lead teste", "Concorrente", "Sem contato", "Outro")
    if (!col.fields.getByName('motivo_descarte')) {
      col.fields.add(
        new TextField({
          name: 'motivo_descarte',
        }),
      )
    }

    app.save(col)

    // Criar índice para buscas eficientes na fila de qualificação
    col.addIndex('idx_leads_qualificacao', false, 'status_qualificacao', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('leads')
    try {
      col.removeIndex('idx_leads_qualificacao')
    } catch (_) {}

    const fieldNames = [
      'status_qualificacao',
      'qualificado_em',
      'qualificado_por',
      'motivo_descarte',
    ]
    for (let i = 0; i < fieldNames.length; i++) {
      const f = col.fields.getByName(fieldNames[i])
      if (f) {
        col.fields.removeByName(fieldNames[i])
      }
    }

    app.save(col)
  },
)
