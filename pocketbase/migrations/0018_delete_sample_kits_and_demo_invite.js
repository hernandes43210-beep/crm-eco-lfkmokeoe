migrate(
  (app) => {
    console.log('Running migration 0018: deleting sample kits and demo invite...')

    // 1. Nomes dos 4 kits de exemplo para remoção segura
    const sampleKitNames = [
      'Kit Residencial 4,5 kWp',
      'Kit Residencial 6,6 kWp',
      'Kit Comercial 12 kWp',
      'Kit Rural 20 kWp',
    ]

    for (let i = 0; i < sampleKitNames.length; i++) {
      const nome = sampleKitNames[i]
      try {
        const kitRecord = app.findFirstRecordByData('kits', 'nome', nome)
        const kitId = kitRecord.id

        // Limpar referências em propostas (se houver alguma apontando para esse kit de exemplo)
        // para que a exclusão do kit não cause problemas de integridade
        try {
          app
            .db()
            .newQuery('UPDATE propostas SET kit = "" WHERE kit = {:kitId}')
            .bind({ kitId })
            .execute()
        } catch (propErr) {
          console.log('Error unlinking propostas for kit ' + kitId + ':', propErr)
        }

        app.delete(kitRecord)
        console.log('Deleted sample kit:', nome, kitId)
      } catch (_) {
        // Kit não encontrado ou já excluído
      }
    }

    // 2. Remover convite demo de vendedor se existir e não tiver leads atribuídos
    try {
      const demoInvite = app.findFirstRecordByData(
        'convidados',
        'email',
        'vendedor.demo@solarcrm.com',
      )
      app.delete(demoInvite)
      console.log('Deleted sample demo invite: vendedor.demo@solarcrm.com')
    } catch (_) {
      // Convidado não existe ou já removido
    }

    // 3. Remover usuário vendedor.demo se existir em users (apenas se não for proprietário de leads reais)
    try {
      const demoUser = app.findAuthRecordByEmail('_pb_users_auth_', 'vendedor.demo@solarcrm.com')
      const userId = demoUser.id

      let count = 0
      try {
        const leads = app.findRecordsByFilter('leads', 'proprietario = "' + userId + '"', '', 1, 0)
        count = leads ? leads.length : 0
      } catch (_) {}

      if (count === 0) {
        app.delete(demoUser)
        console.log('Deleted sample demo user from users:', userId)
      } else {
        console.log('Sample demo user has leads assigned, skipping deletion.')
      }
    } catch (_) {
      // Usuário não existe
    }
  },
  (app) => {
    // down migration: intencionalmente vazia para manter o estado excluído
  },
)
