// Sync proposal status when lead status changes manually
// Se o vendedor mover o lead manualmente para "Fechado Ganho" ou "Fechado Perdido",
// a proposta vinculada mais recente acompanha.

onRecordUpdate((e) => {
  const lead = e.record
  try {
    const orig = lead.original()
    const origStatus = orig ? orig.getString('status') : ''
    const newStatus = lead.getString('status')

    if (origStatus && newStatus && origStatus !== newStatus) {
      if (newStatus === 'Fechado Ganho' || newStatus === 'Fechado Perdido') {
        const propostas = $app.findRecordsByFilter(
          'propostas',
          "lead = '" + lead.id + "'",
          '-created',
          1,
          0,
        )

        if (propostas && propostas.length > 0) {
          const prop = propostas[0]
          const currentPropStatus = prop.getString('status')

          if (newStatus === 'Fechado Ganho' && currentPropStatus !== 'Aceita') {
            prop.set('status', 'Aceita')
            if (!prop.getString('data_aceite')) {
              const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
              prop.set('data_aceite', nowIso)
            }
            $app.save(prop)
          } else if (newStatus === 'Fechado Perdido' && currentPropStatus !== 'Recusada') {
            prop.set('status', 'Recusada')
            $app.save(prop)
          }
        }
      }
    }
  } catch (err) {
    console.error('Erro em leads_proposta_sync onRecordUpdate:', err)
  }

  e.next()
}, 'leads')
