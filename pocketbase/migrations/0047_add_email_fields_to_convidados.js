migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('convidados')

    // 1. Flag booleano de e-mail enviado
    if (!col.fields.getByName('email_enviado')) {
      col.fields.add(
        new BoolField({
          name: 'email_enviado',
          required: false,
        }),
      )
    }

    // 2. Data/hora de envio do e-mail
    if (!col.fields.getByName('email_enviado_em')) {
      col.fields.add(
        new DateField({
          name: 'email_enviado_em',
          required: false,
        }),
      )
    }

    // 3. Destinatário para o qual o e-mail foi enviado
    if (!col.fields.getByName('email_destinatario')) {
      col.fields.add(
        new TextField({
          name: 'email_destinatario',
          required: false,
        }),
      )
    }

    // 4. Último erro de envio (se houver, para auditoria)
    if (!col.fields.getByName('email_erro')) {
      col.fields.add(
        new TextField({
          name: 'email_erro',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('convidados')
    const fieldsToRemove = ['email_enviado', 'email_enviado_em', 'email_destinatario', 'email_erro']

    for (let i = 0; i < fieldsToRemove.length; i++) {
      if (col.fields.getByName(fieldsToRemove[i])) {
        col.fields.removeByName(fieldsToRemove[i])
      }
    }
    app.save(col)
  },
)
