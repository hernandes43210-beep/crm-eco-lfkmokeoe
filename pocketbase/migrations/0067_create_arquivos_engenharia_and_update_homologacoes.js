migrate(
  (app) => {
    // 0067_create_arquivos_engenharia_and_update_homologacoes.js
    //
    // Suporte à Ficha de Trabalho do Engenheiro no CRM ECO:
    // 1. Campo 'observacoes_etapas' (json) e campos específicos de etapas em 'homologacoes':
    //    - observacoes_etapas: histórico estruturado de notas/observações por etapa
    //    - energisa_resposta: texto da resposta/parecer da concessionária
    //    - energisa_resposta_data: data do parecer
    //    - vistoria_data: data agendada para vistoria
    //    - vistoria_observacao: observações da vistoria
    // 2. Coleção 'arquivos_engenharia' para anexos do processo gerados pelo engenheiro:
    //    - projeto elétrico (diagrama unifilar, memorial descritivo)
    //    - plantas (locação, cobertura, civil)
    //    - processo da Energisa (protocolo de acesso, parecer técnico, aprovação)
    //    - outros documentos de engenharia
    //    - até 30MB por arquivo (PDF, imagens JPG/PNG/WEBP, ZIP, DWG, DXF, docs)
    //    - Engenheiro, Vendedor e Admin têm permissão adequada de leitura/upload.

    // 1. Adicionar campos em 'homologacoes'
    try {
      const homCol = app.findCollectionByNameOrId('homologacoes')

      if (!homCol.fields.getByName('observacoes_etapas')) {
        homCol.fields.add(
          new JSONField({
            name: 'observacoes_etapas',
            required: false,
            maxSize: 1048576, // 1MB
          }),
        )
      }

      if (!homCol.fields.getByName('energisa_resposta')) {
        homCol.fields.add(
          new TextField({
            name: 'energisa_resposta',
            required: false,
          }),
        )
      }

      if (!homCol.fields.getByName('energisa_resposta_data')) {
        homCol.fields.add(
          new DateField({
            name: 'energisa_resposta_data',
            required: false,
          }),
        )
      }

      if (!homCol.fields.getByName('vistoria_data')) {
        homCol.fields.add(
          new DateField({
            name: 'vistoria_data',
            required: false,
          }),
        )
      }

      if (!homCol.fields.getByName('vistoria_observacao')) {
        homCol.fields.add(
          new TextField({
            name: 'vistoria_observacao',
            required: false,
          }),
        )
      }

      app.save(homCol)
    } catch (err) {
      console.error('[0067] Erro ao atualizar campos em homologacoes:', err)
      throw err
    }

    // 2. Criar coleção 'arquivos_engenharia'
    if (!app.hasTable('arquivos_engenharia')) {
      const homologacoesCol = app.findCollectionByNameOrId('homologacoes')
      const leadsCol = app.findCollectionByNameOrId('leads')
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

      const arquivosCol = new Collection({
        name: 'arquivos_engenharia',
        type: 'base',
        // RLS:
        // - Engenheiro pode listar e ver arquivos das suas homologações
        // - Admin e Vendedor podem ver arquivos
        // - Engenheiro e Admin podem criar e atualizar arquivos
        // - Admin e quem fez o upload pode excluir
        listRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || homologacao.engenheiro = @request.auth.id || criado_por = @request.auth.id)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Vendedor' || homologacao.engenheiro = @request.auth.id || criado_por = @request.auth.id)",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Engenheiro' || @request.auth.role = 'Vendedor')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || criado_por = @request.auth.id || homologacao.engenheiro = @request.auth.id)",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || criado_por = @request.auth.id)",
        fields: [
          {
            name: 'homologacao',
            type: 'relation',
            required: true,
            collectionId: homologacoesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'lead',
            type: 'relation',
            required: false,
            collectionId: leadsCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'categoria',
            type: 'select',
            required: true,
            values: [
              'projeto_eletrico',
              'plantas',
              'processo_energisa',
              'art_documento',
              'memorial_descritivo',
              'parecer_acesso',
              'relatorio_vistoria',
              'outros',
            ],
            maxSelect: 1,
          },
          {
            name: 'titulo',
            type: 'text',
            required: true,
          },
          {
            name: 'arquivo',
            type: 'file',
            required: true,
            maxSelect: 1,
            maxSize: 31457280, // 30MB
            mimeTypes: [
              'application/pdf',
              'image/jpeg',
              'image/png',
              'image/webp',
              'application/zip',
              'application/x-zip-compressed',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/acad',
              'application/x-acad',
              'application/autocad_dwg',
              'image/x-dwg',
              'application/dwg',
              'application/x-dwg',
              'application/octet-stream',
            ],
          },
          {
            name: 'nome_original',
            type: 'text',
            required: false,
          },
          {
            name: 'tamanho_bytes',
            type: 'number',
            required: false,
          },
          {
            name: 'etapa_origem',
            type: 'select',
            required: false,
            values: [
              'novo_cliente',
              'em_projeto',
              'homologacao',
              'resposta_energisa',
              'liberado_vistoria',
              'vistoria_solicitada',
              'entregue',
            ],
            maxSelect: 1,
          },
          {
            name: 'descricao',
            type: 'text',
            required: false,
          },
          {
            name: 'criado_por',
            type: 'relation',
            required: false,
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_arq_eng_homologacao ON arquivos_engenharia (homologacao)',
          'CREATE INDEX idx_arq_eng_lead ON arquivos_engenharia (lead)',
          'CREATE INDEX idx_arq_eng_categoria ON arquivos_engenharia (categoria)',
          'CREATE INDEX idx_arq_eng_created ON arquivos_engenharia (created DESC)',
        ],
      })

      app.save(arquivosCol)
    }
  },
  (app) => {
    try {
      const arqCol = app.findCollectionByNameOrId('arquivos_engenharia')
      app.delete(arqCol)
    } catch (_) {}

    try {
      const homCol = app.findCollectionByNameOrId('homologacoes')
      if (homCol.fields.getByName('observacoes_etapas')) {
        homCol.fields.removeByName('observacoes_etapas')
      }
      if (homCol.fields.getByName('energisa_resposta')) {
        homCol.fields.removeByName('energisa_resposta')
      }
      if (homCol.fields.getByName('energisa_resposta_data')) {
        homCol.fields.removeByName('energisa_resposta_data')
      }
      if (homCol.fields.getByName('vistoria_data')) {
        homCol.fields.removeByName('vistoria_data')
      }
      if (homCol.fields.getByName('vistoria_observacao')) {
        homCol.fields.removeByName('vistoria_observacao')
      }
      app.save(homCol)
    } catch (_) {}
  },
)
