// Hourly cron job to append "Prazo estourado" to overdue non-closed leads
cronAdd('cron_overdue_sla', '0 * * * *', () => {
  const now = new Date()
  const nowIso = now.toISOString().replace('T', ' ').substring(0, 19) + 'Z'

  try {
    const overdueLeads = $app.findRecordsByFilter(
      'leads',
      "sla_limite < '" + nowIso + "' && status != 'Fechado Ganho' && status != 'Fechado Perdido'",
      '-sla_limite',
      100,
      0,
    )

    for (let i = 0; i < overdueLeads.length; i++) {
      const lead = overdueLeads[i]
      let rawHist = lead.get('historico')
      let hist = []
      if (rawHist) {
        if (typeof rawHist === 'string') {
          try {
            const parsed = JSON.parse(rawHist)
            if (Array.isArray(parsed)) hist = parsed
          } catch (_) {
            hist = []
          }
        } else if (Array.isArray(rawHist)) {
          if (rawHist.length > 0 && typeof rawHist[0] === 'number') {
            try {
              let str = ''
              for (let b = 0; b < rawHist.length; b++) {
                str += String.fromCharCode(rawHist[b])
              }
              const parsed = JSON.parse(str)
              if (Array.isArray(parsed)) hist = parsed
            } catch (_) {
              hist = []
            }
          } else {
            hist = rawHist
          }
        }
      }

      // Check if we already logged overdue today to prevent duplicates
      const todayStr = now.toISOString().substring(0, 10)
      let alreadyLoggedToday = false
      for (let j = 0; j < hist.length; j++) {
        if (hist[j].tipo === 'alerta_sla' && (hist[j].data || '').startsWith(todayStr)) {
          alreadyLoggedToday = true
          break
        }
      }

      if (!alreadyLoggedToday) {
        hist.push({
          data: now.toISOString(),
          tipo: 'alerta_sla',
          descricao: 'Prazo SLA estourado. Lead requer ação imediata da equipe comercial.',
        })
        lead.set('historico', hist)
        $app.save(lead)
      }
    }
  } catch (err) {
    console.error('Erro no cron_overdue_sla:', err)
  }
})
