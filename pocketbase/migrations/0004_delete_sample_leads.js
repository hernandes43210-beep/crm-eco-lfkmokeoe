migrate(
  (app) => {
    console.log('Running migration 0004: deleting sample/seed leads...')

    // E-mails dos 6 leads falsos de exemplo criados no seed inicial
    const sampleEmails = [
      'carlos.menezes@email.com.br',
      'fernanda.lima@advocacia.com.br',
      'roberto.alves@supermercadocentral.com',
      'juliana.castro@clinica.com.br',
      'marcos.pereira@fazendasaopedro.com.br',
      'patricia.rocha@arquitetura.com.br',
    ]

    for (let i = 0; i < sampleEmails.length; i++) {
      const email = sampleEmails[i]
      try {
        const record = app.findFirstRecordByData('leads', 'email', email)
        app.delete(record)
        console.log('Deleted sample lead with email:', email)
      } catch (_) {
        // Record doesn't exist or already deleted
      }
    }
  },
  (app) => {
    // down migration: intentionally left empty to preserve deleted state
  },
)
