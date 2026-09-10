migrate(
  (app) => {
    // Parser numérico robusto pt-BR
    const parseNumberSafe = (val, fallback) => {
      if (val === null || val === undefined) return fallback
      if (typeof val === 'number') return isNaN(val) ? fallback : val

      const rawStr = String(val).trim()
      if (!rawStr) return fallback

      const hadR$ = /R\$/i.test(rawStr)
      let str = rawStr.replace(/R\$/gi, '').replace(/[\s\u00A0]/g, '')
      if (!str) return fallback

      const hasComma = str.indexOf(',') !== -1
      const hasDot = str.indexOf('.') !== -1

      if (hasComma && hasDot) {
        const lastComma = str.lastIndexOf(',')
        const lastDot = str.lastIndexOf('.')
        if (lastComma > lastDot) {
          str = str.replace(/\./g, '').replace(',', '.')
        } else {
          str = str.replace(/,/g, '')
        }
      } else if (hasComma) {
        const commaParts = str.split(',')
        if (commaParts.length > 2) {
          str = commaParts.join('')
        } else {
          str = str.replace(',', '.')
        }
      } else if (hasDot) {
        const parts = str.split('.')
        if (parts.length > 2) {
          str = parts.join('')
        } else if (parts.length === 2) {
          if (hadR$ && parts[1].length === 3) {
            str = parts.join('')
          }
        }
      }

      str = str.replace(/[^0-9.-]/g, '')
      const n = parseFloat(str)
      return isNaN(n) ? fallback : n
    }

    const extractConsumoAndValor = (text) => {
      let consumo = 0
      let valor = 0
      if (!text || typeof text !== 'string') return { consumo, valor }

      // Extração de consumo
      const matchRotuloConsumo = text.match(
        /consumo(?:\s+m[eé]dio)?(?:\s+de)?(?:\s*[:=-])?\s*([0-9]+(?:[.,][0-9]+)?|\d{1,3}(?:\.\d{3})+)\s*\+?\s*(?:kwh(?:\s*[\/|\s]m[eê]s)?)?/i,
      )
      if (matchRotuloConsumo && matchRotuloConsumo[1]) {
        const parsed = parseNumberSafe(matchRotuloConsumo[1], 0)
        if (parsed > 0) consumo = Math.round(parsed)
      }

      if (consumo <= 0) {
        const matchKwh = text.match(
          /([0-9]+(?:[.,][0-9]+)?|\d{1,3}(?:\.\d{3})+)\s*\+?\s*kwh(?:\s*[\/|\s]m[eê]s)?/i,
        )
        if (matchKwh && matchKwh[1]) {
          const parsed = parseNumberSafe(matchKwh[1], 0)
          if (parsed > 0) consumo = Math.round(parsed)
        }
      }

      // Extração de valor da conta
      const matchRotuloValor = text.match(
        /(?:valor(?:\s+m[eé]dio)?(?:\s+da)?(?:\s+conta|\s+fatura)?|conta(?:\s+de)?|fatura(?:\s+de)?)\s*[:=-]?\s*(?:r\$\s*)?([0-9]+(?:[.,][0-9]+)?|\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)/i,
      )
      if (matchRotuloValor && matchRotuloValor[1]) {
        const parsed = parseNumberSafe(matchRotuloValor[1], 0)
        if (parsed > 0) valor = Math.round(parsed * 100) / 100
      }

      if (valor <= 0) {
        const matchRS = text.match(
          /r\$\s*([0-9]+(?:[.,][0-9]+)?|\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)/i,
        )
        if (matchRS && matchRS[1]) {
          const parsed = parseNumberSafe(matchRS[1], 0)
          if (parsed > 0) valor = Math.round(parsed * 100) / 100
        }
      }

      if (consumo <= 0 && valor > 0) {
        consumo = Math.max(50, Math.round(valor / 0.92))
      }

      return { consumo, valor }
    }

    // 1. Percorrer todos os logs de site_form_logs e atualizar leads existentes
    if (app.hasTable('site_form_logs')) {
      try {
        const logs = app.findRecordsByFilter('site_form_logs', '', '-created', 500, 0)
        for (let i = 0; i < logs.length; i++) {
          const log = logs[i]
          let payload = log.get('payload_bruto')
          if (typeof payload === 'string') {
            try {
              payload = JSON.parse(payload)
            } catch (_) {
              payload = null
            }
          }

          if (!payload) continue

          const message = payload.message || payload.mensagem || payload.detalhes || ''
          if (!message) continue

          const { consumo, valor } = extractConsumoAndValor(message)
          if (consumo <= 0 && valor <= 0) continue

          const targetLeadId = log.getString('lead_id')
          let leadRecord = null

          if (targetLeadId) {
            try {
              leadRecord = app.findRecordById('leads', targetLeadId)
            } catch (_) {}
          }

          // Se não encontrou por lead_id (ex: excluído ou ID não bateu), tentar por telefone ou nome
          if (!leadRecord) {
            const rawPhone = String(payload.phone || payload.whatsapp || payload.telefone || '')
            const cleanDigits = rawPhone.replace(/\D/g, '')
            if (cleanDigits.length >= 8) {
              const last8 = cleanDigits.slice(-8)
              try {
                const candidates = app.findRecordsByFilter(
                  'leads',
                  "telefone ~ '" + last8 + "'",
                  '-created',
                  5,
                  0,
                )
                if (candidates && candidates.length > 0) {
                  leadRecord = candidates[0]
                }
              } catch (_) {}
            }
          }

          if (!leadRecord) {
            const rawName = String(payload.name || payload.nome || '').trim()
            if (rawName && rawName.length > 3) {
              try {
                const candidates = app.findRecordsByFilter(
                  'leads',
                  "nome ~ '" + rawName.replace(/'/g, "''") + "'",
                  '-created',
                  5,
                  0,
                )
                if (candidates && candidates.length > 0) {
                  leadRecord = candidates[0]
                }
              } catch (_) {}
            }
          }

          // Se encontrou o lead, atualizar apenas se o consumo for 400 (ou <= 0)
          if (leadRecord) {
            const currentConsumo = leadRecord.getInt('consumo_mensal_kwh')
            const currentValor = leadRecord.getFloat('valor_conta_reais')

            let shouldUpdate = false
            if (consumo > 0 && (currentConsumo === 400 || currentConsumo <= 0)) {
              leadRecord.set('consumo_mensal_kwh', consumo)
              shouldUpdate = true
            }

            if (valor > 0 && currentValor <= 0) {
              leadRecord.set('valor_conta_reais', valor)
              shouldUpdate = true
            }

            if (shouldUpdate) {
              // Adicionar registro ao histórico
              let hist = leadRecord.get('historico') || []
              if (typeof hist === 'string') {
                try {
                  hist = JSON.parse(hist)
                } catch (_) {
                  hist = []
                }
              }
              if (!Array.isArray(hist)) hist = []

              hist.push({
                data: new Date().toISOString(),
                tipo: 'nota',
                descricao:
                  'Consumo e valor da conta corrigidos a partir da mensagem do formulário do site (' +
                  (consumo > 0 ? consumo + ' kWh/mês' : '') +
                  (valor > 0 ? (consumo > 0 ? ' | ' : '') + 'R$ ' + valor.toFixed(2) : '') +
                  ').',
              })

              leadRecord.set('historico', hist)
              app.save(leadRecord)
              console.log(
                'Lead ' +
                  leadRecord.id +
                  ' (' +
                  leadRecord.getString('nome') +
                  ') corrigido com sucesso: ' +
                  consumo +
                  ' kWh, R$ ' +
                  valor,
              )
            }
          }
        }
      } catch (errLogs) {
        console.error('Erro ao processar logs do site na migration 0016:', errLogs)
      }
    }

    // 2. Percorrer leads de origem "Site" com consumo == 400 para checar histórico
    try {
      const siteLeads = app.findRecordsByFilter(
        'leads',
        "origem = 'Site' && (consumo_mensal_kwh = 400 || consumo_mensal_kwh = 0)",
        '-created',
        100,
        0,
      )
      for (let j = 0; j < siteLeads.length; j++) {
        const lead = siteLeads[j]
        let hist = lead.get('historico') || []
        if (typeof hist === 'string') {
          try {
            hist = JSON.parse(hist)
          } catch (_) {
            hist = []
          }
        }
        if (!Array.isArray(hist)) continue

        let fullHistText = ''
        for (let k = 0; k < hist.length; k++) {
          if (hist[k] && hist[k].descricao) {
            fullHistText += ' ' + hist[k].descricao
          }
        }

        if (fullHistText) {
          const { consumo, valor } = extractConsumoAndValor(fullHistText)
          let shouldUpdate = false
          if (consumo > 0 && lead.getInt('consumo_mensal_kwh') === 400) {
            lead.set('consumo_mensal_kwh', consumo)
            shouldUpdate = true
          }
          if (valor > 0 && lead.getFloat('valor_conta_reais') <= 0) {
            lead.set('valor_conta_reais', valor)
            shouldUpdate = true
          }

          if (shouldUpdate) {
            hist.push({
              data: new Date().toISOString(),
              tipo: 'nota',
              descricao:
                'Consumo e valor da conta reextraídos do histórico original do site (' +
                consumo +
                ' kWh/mês).',
            })
            lead.set('historico', hist)
            app.save(lead)
          }
        }
      }
    } catch (errSiteLeads) {
      console.error('Erro ao verificar leads do site na migration 0016:', errSiteLeads)
    }
  },
  (app) => {},
)
