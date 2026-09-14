// Hook de cron job para envio de lembretes automáticos de próximo contato
// Dispara a cada 2 minutos (*/2 * * * *)
// Envia e-mails para ecosolarenergy2022@gmail.com em 3 momentos:
// 1) 1 dia antes (24h)
// 2) 4 horas antes
// 3) 20 minutos antes
//
// GARANTIAS ANTI-DUPLICIDADE E RESILIÊNCIA:
// 1. Cada lembrete é enviado NO MÁXIMO UMA VEZ por agendamento.
// 2. Os flags (lembrete_1d_enviado, etc.) são verificados e persistidos no banco ANTES do envio do e-mail.
// 3. Janelas temporais precisas e estreitas:
//    - Lembrete 1 dia (24h): entre 1440 min (24h) e 1380 min (23h) antes do contato.
//    - Lembrete 4 horas: entre 240 min (4h) e 180 min (3h) antes do contato.
//    - Lembrete 20 minutos: entre 20 min e -10 min (até 10 min pós-horário) do contato.
// 4. Lembretes Logs protegidos com chave de unicidade tipo+data_agendada e SEMPRE salvos como JSON.stringify(logs)
//    (no PocketBase v0.36 / Goja, campos json exigem string JSON para validação: "Must be a valid json value").
// 5. Log explícito de auditoria para cada envio.

cronAdd('cron_lembretes_proximo_contato', '*/2 * * * *', () => {
  const DEST_EMAIL = 'ecosolarenergy2022@gmail.com'
  const now = new Date()
  const nowMs = now.getTime()

  // Janela de busca: agendamentos a partir de 1 hora atrás até daqui a 26 horas
  const minDate = new Date(nowMs - 60 * 60 * 1000)
  const maxDate = new Date(nowMs + 26 * 60 * 60 * 1000)

  const minIso = minDate.toISOString().replace('T', ' ').substring(0, 19) + 'Z'
  const maxIso = maxDate.toISOString().replace('T', ' ').substring(0, 19) + 'Z'

  try {
    // Buscar leads que possuem proximo_contato_data definida dentro do range e que ainda tenham lembretes pendentes
    const leads = $app.findRecordsByFilter(
      'leads',
      "proximo_contato_data != '' && proximo_contato_data >= '" +
        minIso +
        "' && proximo_contato_data <= '" +
        maxIso +
        "' && (lembrete_1d_enviado != true || lembrete_4h_enviado != true || lembrete_20m_enviado != true) && status != 'Fechado Ganho' && status != 'Fechado Perdido'",
      'proximo_contato_data',
      100,
      0,
    )

    if (!leads || leads.length === 0) {
      return
    }

    const mailClient = $app.newMailClient()
    const metaSettings = $app.settings().meta || {}
    const senderAddr = metaSettings.senderAddress || 'no-reply@goskip.dev'
    const senderName = metaSettings.senderName || 'Ecosolar Energy CRM'

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i]
      const scheduledStr = lead.getString('proximo_contato_data')
      if (!scheduledStr) continue

      const scheduledDate = new Date(scheduledStr)
      const scheduledMs = scheduledDate.getTime()
      if (isNaN(scheduledMs)) continue

      const diffMs = scheduledMs - nowMs
      const diffMinutes = Math.round(diffMs / 60000)

      const nomeCliente = lead.getString('nome') || 'Cliente'
      const obsContato =
        lead.getString('proximo_contato_obs') ||
        lead.getString('proximo_contato') ||
        'Nenhuma observação informada.'
      const telefoneCliente = lead.getString('telefone') || 'Não informado'
      const leadEmail = lead.getString('email') || 'Não informado'
      const leadId = lead.id

      // Formatação amigável para exibição no e-mail (horário UTC legível e explícito)
      const scheduledDay = String(scheduledDate.getUTCDate()).padStart(2, '0')
      const scheduledMonth = String(scheduledDate.getUTCMonth() + 1).padStart(2, '0')
      const scheduledYear = scheduledDate.getUTCFullYear()
      const scheduledHour = String(scheduledDate.getUTCHours()).padStart(2, '0')
      const scheduledMin = String(scheduledDate.getUTCMinutes()).padStart(2, '0')
      const dataHoraFormatada =
        scheduledDay +
        '/' +
        scheduledMonth +
        '/' +
        scheduledYear +
        ' às ' +
        scheduledHour +
        ':' +
        scheduledMin +
        ' (horário UTC)'

      const lembrete1dEnviado = lead.getBool('lembrete_1d_enviado')
      const lembrete4hEnviado = lead.getBool('lembrete_4h_enviado')
      const lembrete20mEnviado = lead.getBool('lembrete_20m_enviado')

      // Extração robusta dos logs existentes de lembretes
      let rawLogs = lead.get('lembretes_logs')
      let logs = []
      if (rawLogs) {
        if (typeof rawLogs === 'string') {
          try {
            const parsed = JSON.parse(rawLogs)
            if (Array.isArray(parsed)) logs = parsed
          } catch (_) {
            logs = []
          }
        } else if (Array.isArray(rawLogs)) {
          if (rawLogs.length > 0 && typeof rawLogs[0] === 'number') {
            try {
              let s = ''
              for (let b = 0; b < rawLogs.length; b++) {
                s += String.fromCharCode(rawLogs[b])
              }
              const parsed = JSON.parse(s)
              if (Array.isArray(parsed)) logs = parsed
            } catch (_) {
              logs = []
            }
          } else {
            logs = rawLogs
          }
        }
      }

      // Função de apoio para checar se determinado tipo de lembrete já foi registrado para esta data agendada
      const scheduledIsoKey = scheduledDate.toISOString().substring(0, 16)
      const jaRegistrado = (tipoVerificar) => {
        for (let l = 0; l < logs.length; l++) {
          const item = logs[l]
          if (
            item &&
            item.tipo === tipoVerificar &&
            item.data_agendada &&
            item.data_agendada.substring(0, 16) === scheduledIsoKey
          ) {
            return true
          }
        }
        return false
      }

      const montarHtmlLembrete = (momentoTexto) => {
        return (
          '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">' +
          '<div style="background-color: #0B7A5B; padding: 16px 20px; border-radius: 6px 6px 0 0; color: #ffffff;">' +
          '<h2 style="margin: 0; font-size: 18px; font-weight: bold;">Ecosolar Energy - Lembrete de Contato</h2>' +
          '<p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Aviso de follow-up: ' +
          momentoTexto +
          '</p>' +
          '</div>' +
          '<div style="padding: 20px; color: #1e293b; line-height: 1.6; font-size: 14px;">' +
          '<p style="margin-top: 0;">Você possui um compromisso de contato agendado com o lead abaixo:</p>' +
          '<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">' +
          '<tr><td style="padding: 8px 12px; background-color: #f8fafc; font-weight: bold; width: 35%; border-bottom: 1px solid #e2e8f0;">Cliente:</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 15px; font-weight: 600; color: #0f172a;">' +
          nomeCliente +
          '</td></tr>' +
          '<tr><td style="padding: 8px 12px; background-color: #f8fafc; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Data e Hora Agendada:</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0B7A5B;">' +
          dataHoraFormatada +
          '</td></tr>' +
          '<tr><td style="padding: 8px 12px; background-color: #f8fafc; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Telefone / WhatsApp:</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">' +
          telefoneCliente +
          '</td></tr>' +
          '<tr><td style="padding: 8px 12px; background-color: #f8fafc; font-weight: bold; border-bottom: 1px solid #e2e8f0;">E-mail:</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">' +
          leadEmail +
          '</td></tr>' +
          '<tr><td style="padding: 8px 12px; background-color: #f8fafc; font-weight: bold; vertical-align: top;">Observações do Contato:</td><td style="padding: 8px 12px; background-color: #fffbeb; color: #78350f; font-weight: 500;">' +
          obsContato +
          '</td></tr>' +
          '</table>' +
          '<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">' +
          'ID do Lead: ' +
          leadId +
          ' • Sistema CRM de Vendas Solares Ecosolar Energy' +
          '</div>' +
          '</div>' +
          '</div>'
        )
      }

      // 1) MOMENTO: 1 DIA ANTES (24 horas)
      // Janela temporal: entre 24h e 23h antes (1440 min a 1380 min)
      if (!lembrete1dEnviado && !jaRegistrado('1d') && diffMinutes <= 1440 && diffMinutes >= 1380) {
        const flagName = 'lembrete_1d_enviado'
        const tipo = '1d'
        const momentoTexto = 'Falta 1 Dia'

        // ATOMICALIDADE: persistir flag e log no banco ANTES do envio do e-mail
        lead.set(flagName, true)
        const logItem = {
          tipo: tipo,
          data_agendada: scheduledDate.toISOString(),
          destinatario: DEST_EMAIL,
          enviado_em: now.toISOString(),
          status: 'sucesso',
        }
        logs.push(logItem)
        // Salvar SEMPRE como string JSON para evitar rejeição "Must be a valid json value"
        lead.set('lembretes_logs', JSON.stringify(logs))

        let saveSuccess = false
        try {
          $app.save(lead)
          saveSuccess = true
          console.log(
            '[cron_lembretes] Flag ' +
              flagName +
              ' persistida com sucesso para lead ' +
              leadId +
              ' (' +
              nomeCliente +
              ')',
          )
        } catch (saveErr) {
          console.error(
            '[cron_lembretes] Erro ao salvar flag ' + flagName + ' para lead ' + leadId + ':',
            saveErr,
          )
        }

        // Se persistiu no banco, dispara o e-mail
        if (saveSuccess) {
          const assunto =
            '[' +
            momentoTexto +
            '] Lembrete de Próximo Contato: ' +
            nomeCliente +
            ' - ' +
            dataHoraFormatada
          const htmlContent = montarHtmlLembrete(momentoTexto)

          try {
            const message = new MailerMessage({
              from: {
                address: senderAddr,
                name: senderName,
              },
              to: [{ address: DEST_EMAIL }],
              subject: assunto,
              html: htmlContent,
            })
            mailClient.send(message)
            console.log(
              '[cron_lembretes] E-mail ' +
                tipo +
                ' enviado com sucesso para ' +
                DEST_EMAIL +
                ' (Lead: ' +
                leadId +
                ', Cliente: ' +
                nomeCliente +
                ', Agendamento: ' +
                scheduledStr +
                ')',
            )
          } catch (mailErr) {
            console.error(
              '[cron_lembretes] Erro ao disparar email ' + tipo + ' para lead ' + leadId + ':',
              mailErr,
            )
          }
        }
      }

      // 2) MOMENTO: 4 HORAS ANTES
      // Janela temporal: entre 240 min (4h) e 180 min (3h) antes do contato
      if (!lembrete4hEnviado && !jaRegistrado('4h') && diffMinutes <= 240 && diffMinutes >= 180) {
        const flagName = 'lembrete_4h_enviado'
        const tipo = '4h'
        const momentoTexto = 'Faltam 4 Horas'

        // ATOMICALIDADE: persistir flag e log no banco ANTES do envio do e-mail
        lead.set(flagName, true)
        const logItem = {
          tipo: tipo,
          data_agendada: scheduledDate.toISOString(),
          destinatario: DEST_EMAIL,
          enviado_em: now.toISOString(),
          status: 'sucesso',
        }
        logs.push(logItem)
        lead.set('lembretes_logs', JSON.stringify(logs))

        let saveSuccess = false
        try {
          $app.save(lead)
          saveSuccess = true
          console.log(
            '[cron_lembretes] Flag ' +
              flagName +
              ' persistida com sucesso para lead ' +
              leadId +
              ' (' +
              nomeCliente +
              ')',
          )
        } catch (saveErr) {
          console.error(
            '[cron_lembretes] Erro ao salvar flag ' + flagName + ' para lead ' + leadId + ':',
            saveErr,
          )
        }

        if (saveSuccess) {
          const assunto =
            '[' +
            momentoTexto +
            '] Lembrete de Próximo Contato: ' +
            nomeCliente +
            ' - ' +
            dataHoraFormatada
          const htmlContent = montarHtmlLembrete(momentoTexto)

          try {
            const message = new MailerMessage({
              from: {
                address: senderAddr,
                name: senderName,
              },
              to: [{ address: DEST_EMAIL }],
              subject: assunto,
              html: htmlContent,
            })
            mailClient.send(message)
            console.log(
              '[cron_lembretes] E-mail ' +
                tipo +
                ' enviado com sucesso para ' +
                DEST_EMAIL +
                ' (Lead: ' +
                leadId +
                ', Cliente: ' +
                nomeCliente +
                ', Agendamento: ' +
                scheduledStr +
                ')',
            )
          } catch (mailErr) {
            console.error(
              '[cron_lembretes] Erro ao disparar email ' + tipo + ' para lead ' + leadId + ':',
              mailErr,
            )
          }
        }
      }

      // 3) MOMENTO: 20 MINUTOS ANTES
      // Janela temporal: entre 20 min antes e até 10 min pós-horário (diffMinutes <= 20 && diffMinutes >= -10)
      if (!lembrete20mEnviado && !jaRegistrado('20m') && diffMinutes <= 20 && diffMinutes >= -10) {
        const flagName = 'lembrete_20m_enviado'
        const tipo = '20m'
        const momentoTexto = 'Faltam 20 Minutos'

        // ATOMICALIDADE: persistir flag e log no banco ANTES do envio do e-mail
        lead.set(flagName, true)
        const logItem = {
          tipo: tipo,
          data_agendada: scheduledDate.toISOString(),
          destinatario: DEST_EMAIL,
          enviado_em: now.toISOString(),
          status: 'sucesso',
        }
        logs.push(logItem)
        lead.set('lembretes_logs', JSON.stringify(logs))

        let saveSuccess = false
        try {
          $app.save(lead)
          saveSuccess = true
          console.log(
            '[cron_lembretes] Flag ' +
              flagName +
              ' persistida com sucesso para lead ' +
              leadId +
              ' (' +
              nomeCliente +
              ')',
          )
        } catch (saveErr) {
          console.error(
            '[cron_lembretes] Falha ao salvar flag ' + flagName + ' para lead ' + leadId + ':',
            saveErr,
          )
        }

        if (saveSuccess) {
          const assunto =
            '[' +
            momentoTexto +
            '] Lembrete de Próximo Contato: ' +
            nomeCliente +
            ' - ' +
            dataHoraFormatada
          const htmlContent = montarHtmlLembrete(momentoTexto)

          try {
            const message = new MailerMessage({
              from: {
                address: senderAddr,
                name: senderName,
              },
              to: [{ address: DEST_EMAIL }],
              subject: assunto,
              html: htmlContent,
            })
            mailClient.send(message)
            console.log(
              '[cron_lembretes] E-mail ' +
                tipo +
                ' enviado com sucesso para ' +
                DEST_EMAIL +
                ' (Lead: ' +
                leadId +
                ', Cliente: ' +
                nomeCliente +
                ', Agendamento: ' +
                scheduledStr +
                ')',
            )
          } catch (mailErr) {
            console.error(
              '[cron_lembretes] Erro ao disparar email ' + tipo + ' para lead ' + leadId + ':',
              mailErr,
            )
          }
        }
      }
    }
  } catch (err) {
    console.error('Erro na execução do cron_lembretes_proximo_contato:', err)
  }
})
