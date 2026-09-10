// Computes sla_limite on leads create / update, and appends history when status changes
onRecordCreate((e) => {
  try {
    const record = e.record
    const statusQualificacao = record.getString('status_qualificacao')

    let slaDias = record.getInt('sla_dias')
    if (!slaDias || slaDias <= 0) {
      slaDias = 7
      record.set('sla_dias', 7)
    }

    // Se o lead estiver aguardando qualificação ou descartado, não inicia o SLA ainda
    if (statusQualificacao === 'aguardando' || statusQualificacao === 'descartado') {
      record.set('sla_limite', '')
    } else {
      const now = new Date()
      const deadline = new Date(now.getTime() + slaDias * 86400000)
      const isoStr = deadline.toISOString().replace('T', ' ').substring(0, 19) + 'Z'
      record.set('sla_limite', isoStr)
    }

    // Handle historico: if string, array, or byte array/object
    let rawHist = record.get('historico')
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
        // Check if rawHist is an array of byte numbers (ASCII/UTF-8 byte codes)
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
    if (!Array.isArray(hist) || hist.length === 0) {
      hist = [
        {
          data: new Date().toISOString(),
          tipo: 'criacao',
          descricao:
            "Lead criado no sistema com status inicial '" +
            (record.getString('status') || 'Novo') +
            "'.",
        },
      ]
    }
    record.set('historico', hist)
  } catch (err) {
    console.error('Erro em leads_sla onRecordCreate:', err)
  }

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

    const origQualif = orig ? orig.getString('status_qualificacao') : ''
    const newQualif = record.getString('status_qualificacao')

    // Se o lead for qualificado agora (mudou de "aguardando" para "qualificado" ou entrou em qualificado)
    const acabouDeQualificar =
      (origQualif === 'aguardando' || !origQualif) && newQualif === 'qualificado'

    if (newQualif === 'aguardando' || newQualif === 'descartado') {
      // Leads aguardando ou descartados não possuem prazo de SLA ativo
      record.set('sla_limite', '')
    } else if (acabouDeQualificar || origStatus !== newStatus || origSlaDias !== newSlaDias) {
      // Inicia ou recalcula SLA a partir de agora
      const days = newSlaDias > 0 ? newSlaDias : 7
      const now = new Date()
      const deadline = new Date(now.getTime() + days * 86400000)
      const isoStr = deadline.toISOString().replace('T', ' ').substring(0, 19) + 'Z'
      record.set('sla_limite', isoStr)
    }

    // Parse existing historico
    let rawHist = record.get('historico')
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

    // If status changed, append to history
    if (origStatus && newStatus && origStatus !== newStatus) {
      hist.push({
        data: new Date().toISOString(),
        tipo: 'status',
        descricao: "Estágio alterado de '" + origStatus + "' para '" + newStatus + "'.",
      })
    }

    record.set('historico', hist)
  } catch (err) {
    console.error('Erro em leads_sla onRecordUpdate:', err)
  }

  e.next()
}, 'leads')
