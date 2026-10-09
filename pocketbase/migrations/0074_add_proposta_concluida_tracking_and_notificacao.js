migrate(
  (app) => {
    // 0074_add_proposta_concluida_tracking_and_notificacao.js
    //
    // Suporte ao aviso/notificação quando o cliente terminar de visualizar a proposta comercial.
    // 1. Atualizar SelectField 'tipo' na coleção 'notificacoes' para permitir 'proposta_concluida'
    // 2. Adicionar campos em 'propostas':
    //    - visualizacao_concluida_em (date): data/hora em que o cliente atingiu a última tela
    //    - visualizacoes_concluidas_count (number): quantidade de conclusões de visualização
    //    - historico_conclusoes (json): lista com timestamp, formato e ip das conclusões

    // 1. Atualizar coleção 'notificacoes'
    try {
      if (app.hasTable('notificacoes')) {
        const notifCol = app.findCollectionByNameOrId('notificacoes')
        const notifTipoField = notifCol.fields.getByName('tipo')
        if (notifTipoField) {
          notifCol.fields.removeByName('tipo')
        }
        notifCol.fields.add(
          new SelectField({
            name: 'tipo',
            required: false,
            values: [
              'lead_cidade',
              'geral',
              'sla',
              'contato',
              'documentos_engenharia',
              'homologacao_art',
              'comprovante_pagamento',
              'proposta_concluida',
            ],
            maxSelect: 1,
          }),
        )
        app.save(notifCol)
      }
    } catch (notifErr) {
      console.warn('[0074] Erro ao atualizar tipo em notificacoes:', notifErr)
    }

    // 2. Atualizar coleção 'propostas'
    try {
      if (app.hasTable('propostas')) {
        const propCol = app.findCollectionByNameOrId('propostas')

        if (!propCol.fields.getByName('visualizacao_concluida_em')) {
          propCol.fields.add(
            new DateField({
              name: 'visualizacao_concluida_em',
              required: false,
            }),
          )
        }

        if (!propCol.fields.getByName('visualizacoes_concluidas_count')) {
          propCol.fields.add(
            new NumberField({
              name: 'visualizacoes_concluidas_count',
              required: false,
              min: 0,
              onlyInt: true,
            }),
          )
        }

        if (!propCol.fields.getByName('historico_conclusoes')) {
          propCol.fields.add(
            new JSONField({
              name: 'historico_conclusoes',
              required: false,
            }),
          )
        }

        app.save(propCol)
      }
    } catch (propErr) {
      console.warn('[0074] Erro ao adicionar campos em propostas:', propErr)
    }
  },
  (app) => {
    try {
      if (app.hasTable('propostas')) {
        const propCol = app.findCollectionByNameOrId('propostas')
        if (propCol.fields.getByName('visualizacao_concluida_em')) {
          propCol.fields.removeByName('visualizacao_concluida_em')
        }
        if (propCol.fields.getByName('visualizacoes_concluidas_count')) {
          propCol.fields.removeByName('visualizacoes_concluidas_count')
        }
        if (propCol.fields.getByName('historico_conclusoes')) {
          propCol.fields.removeByName('historico_conclusoes')
        }
        app.save(propCol)
      }
    } catch (_) {}
  },
)
