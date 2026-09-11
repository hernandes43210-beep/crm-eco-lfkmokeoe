// Hook to trigger idempotent seed on server bootstrap / first request if records don't exist yet
routerAdd('GET', '/backend/v1/health', (e) => {
  return e.json(200, { status: 'ok' })
})

onBootstrap((e) => {
  e.next()
  try {
    const usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
    let adminRecord = null
    try {
      adminRecord = $app.findAuthRecordByEmail('_pb_users_auth_', 'hernandes43210@gmail.com')
      if (adminRecord.getString('role') !== 'Admin') {
        adminRecord.set('role', 'Admin')
        $app.save(adminRecord)
      }
    } catch (_) {
      const rec = new Record(usersCol)
      rec.setEmail('hernandes43210@gmail.com')
      rec.setPassword('Skip@Pass')
      rec.setVerified(true)
      rec.set('name', 'Hernandes CEO')
      rec.set('role', 'Admin')
      $app.save(rec)
      adminRecord = rec
    }

    // Nota: Kits de exemplo e convidado vendedor.demo foram permanentemente removidos
    // e NÃO são recriados no bootstrap para permitir exclusão definitiva pelo usuário.
    // Leads de exemplo também permanecem desativados.
  } catch (err) {
    console.error('Bootstrap seed error:', err)
  }
})
