migrate(
  (app) => {
    const leadsCol = app.findCollectionByNameOrId('leads')

    // 1. WhatsApp Settings collection
    const whatsappSettings = new Collection({
      name: 'whatsapp_settings',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
      fields: [
        { name: 'api_url', type: 'text', required: true },
        { name: 'api_key', type: 'text', required: true },
        { name: 'instance_name', type: 'text', required: true },
        { name: 'webhook_url', type: 'text' },
        { name: 'phone_number', type: 'text' },
        {
          name: 'connection_status',
          type: 'select',
          required: true,
          values: ['disconnected', 'connecting', 'connected'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_wa_settings_instance ON whatsapp_settings (instance_name)',
      ],
    })
    app.save(whatsappSettings)

    // 2. WhatsApp Messages collection
    const whatsappMessages = new Collection({
      name: 'whatsapp_messages',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
      fields: [
        {
          name: 'lead',
          type: 'relation',
          required: false,
          collectionId: leadsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'phone_number', type: 'text', required: true },
        { name: 'sender_name', type: 'text' },
        {
          name: 'direction',
          type: 'select',
          required: true,
          values: ['in', 'out'],
          maxSelect: 1,
        },
        { name: 'content', type: 'text', required: true },
        { name: 'wa_message_id', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending', 'sent', 'received', 'read', 'error'],
          maxSelect: 1,
        },
        { name: 'unread', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_wa_messages_msg_id ON whatsapp_messages (wa_message_id)',
        'CREATE INDEX idx_wa_messages_phone ON whatsapp_messages (phone_number)',
        'CREATE INDEX idx_wa_messages_lead ON whatsapp_messages (lead)',
        'CREATE INDEX idx_wa_messages_created ON whatsapp_messages (created)',
      ],
    })
    app.save(whatsappMessages)
  },
  (app) => {
    try {
      const whatsappMessages = app.findCollectionByNameOrId('whatsapp_messages')
      app.delete(whatsappMessages)
    } catch (_) {}
    try {
      const whatsappSettings = app.findCollectionByNameOrId('whatsapp_settings')
      app.delete(whatsappSettings)
    } catch (_) {}
  },
)
