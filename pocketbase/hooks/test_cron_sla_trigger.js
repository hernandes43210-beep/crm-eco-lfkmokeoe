// Endpoint de teste administrativo para validar a execução do cron SLA sob demanda
routerAdd(
  'POST',
  '/backend/v1/admin/test-cron-sla',
  (e) => {
    const auth = e.auth
    if (!auth || auth.getString('role') !== 'Admin') {
      return e.json(403, { error: 'Apenas administradores' })
    }

    const now = new Date()
    const nowIso = now.toISOString().replace('T', ' ').substring(0, 19) + 'Z'
    const todayStr = now.toISOString().substring(0, 10)

    const rows = arrayOf(
      new DynamicModel({
        id: '',
        historico: '',
      }),
    )

    $app
      .db()
      .select('id', 'historico')
      .from('leads')
      .where(
        $dbx.exp(
          "sla_limite != '' AND sla_limite < {:nowIso} AND status != 'Fechado Ganho' AND status != 'Fechado Perdido' AND (status_qualificacao IS NULL OR (status_qualificacao != 'aguardando' AND status_qualificacao != 'descartado'))",
          { nowIso: nowIso },
        ),
      )
      .orderBy('sla_limite DESC')
      .limit(100)
      .all(rows)

    let updatedCount = 0
    let alreadyLoggedCount = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const leadId = row.id
      let rawHist = row.historico
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

      let alreadyLoggedToday = false
      for (let j = 0; j < hist.length; j++) {
        if (hist[j] && hist[j].tipo === 'alerta_sla' && (hist[j].data || '').startsWith(todayStr)) {
          alreadyLoggedToday = true
          break
        }
      }

      if (alreadyLoggedToday) {
        alreadyLoggedCount++
      } else {
        hist.push({
          data: now.toISOString(),
          tipo: 'alerta_sla',
          descricao: 'Prazo SLA estourado. Lead requer ação imediata da equipe comercial.',
        })

        if (hist.length > 50) {
          hist = hist.slice(-50)
        }

        const updatedJsonStr = JSON.stringify(hist)
        $app
          .db()
          .newQuery('UPDATE leads SET historico = {:hist}, updated = {:updated} WHERE id = {:id}')
          .bind({
            hist: updatedJsonStr,
            updated: nowIso,
            id: leadId,
          })
          .execute()

        updatedCount++
      }
    }

    return e.json(200, {
      success: true,
      found: rows.length,
      updated: updatedCount,
      already_logged: alreadyLoggedCount,
    })
  },
  $apis.requireAuth(),
)
