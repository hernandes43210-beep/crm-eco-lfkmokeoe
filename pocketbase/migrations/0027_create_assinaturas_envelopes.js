migrate(
  (app) => {
    const leadsCol = app.findCollectionByNameOrId('leads')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const formalizacaoCol = app.findCollectionByNameOrId('formalizacao_documentos')

    if (!app.hasTable('assinaturas_envelopes')) {
      const col = new Collection({
        name: 'assinaturas_envelopes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'lead',
            type: 'relation',
            required: true,
            collectionId: leadsCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'documento',
            type: 'relation',
            required: false,
            collectionId: formalizacaoCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'tipo_documento',
            type: 'select',
            required: true,
            values: ['contrato', 'procuracao'],
            maxSelect: 1,
          },
          {
            name: 'clicksign_envelope_id',
            type: 'text',
            required: true,
          },
          {
            name: 'clicksign_document_id',
            type: 'text',
          },
          {
            name: 'clicksign_signer_id',
            type: 'text',
          },
          {
            name: 'clicksign_requirement_id',
            type: 'text',
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['draft', 'running', 'signed', 'canceled', 'expired', 'error'],
            maxSelect: 1,
          },
          {
            name: 'nome_envelope',
            type: 'text',
            required: true,
          },
          {
            name: 'signatario_nome',
            type: 'text',
            required: true,
          },
          {
            name: 'signatario_email',
            type: 'email',
            required: true,
          },
          {
            name: 'signatario_cpf',
            type: 'text',
          },
          {
            name: 'signatario_telefone',
            type: 'text',
          },
          {
            name: 'link_assinatura',
            type: 'text',
          },
          {
            name: 'arquivo_assinado_pdf',
            type: 'file',
            maxSelect: 1,
            maxSize: 15728640, // 15MB
            mimeTypes: ['application/pdf'],
          },
          {
            name: 'assinado_em',
            type: 'date',
          },
          {
            name: 'dados_resposta',
            type: 'json',
          },
          {
            name: 'mensagem_erro',
            type: 'text',
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
          'CREATE INDEX idx_assinaturas_lead ON assinaturas_envelopes (lead)',
          'CREATE INDEX idx_assinaturas_documento ON assinaturas_envelopes (documento)',
          'CREATE INDEX idx_assinaturas_status ON assinaturas_envelopes (status)',
          'CREATE INDEX idx_assinaturas_envelope_id ON assinaturas_envelopes (clicksign_envelope_id)',
          'CREATE INDEX idx_assinaturas_created ON assinaturas_envelopes (created DESC)',
        ],
      })

      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('assinaturas_envelopes')
      app.delete(col)
    } catch (_) {}
  },
)
