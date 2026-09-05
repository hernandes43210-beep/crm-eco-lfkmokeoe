// Computes sla_limite on leads create / update, and appends history when status changes
onRecordCreate((e) => {
  const record = e.record
  let slaDias = record.getInt('sla_dias')
  if (!slaDias || slaDias <= 0) {
    slaDias = 7
    record.set('sla_dias', 7)
  }

  const now = new Date()
  const deadline = new Date(now.getTime() + slaDias * 86400000)
  const isoStr = deadline.toISOString().replace('T', ' ').substring(0, 19) + 'Z'
  record.set('sla_limite', isoStr)

  let hist = record.get('historico')
  if (!hist || !Array.isArray(hist)) {
    hist = []
  }
  if (hist.length === 0) {
    hist.push({
      data: new Date().toISOString(),
      tipo: 'criacao',
      descricao: "Lead criado no sistema com status inicial '" + record.getString('status') + "'.",
    })
  }
  record.set('historico', hist)

  e.next()
}, 'leads')

onRecordUpdate((e) => {
  const record = e.record
  try {
    const orig = record.original()
    const origStatus = orig ? orig.getString('status') : ''
    const newStatus = record.getString('status')

    const origSlaDias = orig ? orig.getInt('sla_dias') : 0
    const newSlaDias = record.getInt('sla_dias')

    // If status changed or SLA days changed, recalculate SLA limit
    if (origStatus !== newStatus || origSlaDias !== newSlaDias) {
      const days = newSlaDias > 0 ? newSlaDias : 7
      const now = new Date()
      const deadline = new Date(now.getTime() + days * 86400000)
      const isoStr = deadline.toISOString().replace('T', ' ').substring(0, 19) + 'Z'
      record.set('sla_limite', isoStr)
    }

    // If status changed, append to history
    if (origStatus && newStatus && origStatus !== newStatus) {
      let hist = record.get('historico')
      if (!hist || !Array.isArray(hist)) {
        hist = []
      }
      hist.push({
        data: new Date().toISOString(),
        tipo: 'status',
        descricao: "Estágio alterado de '" + origStatus + "' para '" + newStatus + "'.",
      })
      record.set('historico', hist)
    }
  } catch (_) {}

  e.next()
}, 'leads')
