// Hook de cron job para envio de lembretes automáticos de próximo contato
// Dispara a cada 2 minutos (*/2 * * * *) para garantir precisão temporal
// Envia e-mails para ecosolarenergy2022@gmail.com em 3 momentos:
// 1) 1 dia antes (24h)
// 2) 4 horas antes
// 3) 20 minutos antes
// Com nome do cliente, data/hora agendada e a observação/nota do contato.
// Evita e-mails duplicados registrando flags e histórico no registro do lead.

cronAdd('cron_lembretes_proximo_contato', '*/2 * * * *', () => {
  const DEST_EMAIL = 'ecosolarenergy2022@gmail.com'
  const now = new Date()
  const nowMs = now.getTime()

  // Janela máxima de busca: agendamentos a partir de agora até daqui a 36 horas
  // E também agendamentos com até 2 horas de atraso recente (caso o cron estivesse pausado)
  const minDate = new Date(nowMs - 2 * 60 * 60 * 1000)
  const maxDate = new Date(nowMs + 36 * 60 * 60 * 1000)

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

      // Formatar data e hora para horário amigável no e-mail (UTC -4 para Rondônia/Brasil ou formato ISO legível)
      // Como Date no PocketBase/Goja roda em UTC, geramos formatação completa e explícita:
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

      let lembrete1dEnviado = lead.getBool('lembrete_1d_enviado')
      let lembrete4hEnviado = lead.getBool('lembrete_4h_enviado')
      let lembrete20mEnviado = lead.getBool('lembrete_20m_enviado')

      let updated = false

      // Obter logs atuais
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
          logs = rawLogs
        }
      }

      // Função interna de envio e registro de log
      const enviarLembrete = (tipo, momentoTexto) => {
        const assunto =
          '[' +
          momentoTexto +
          '] Lembrete de Próximo Contato: ' +
          nomeCliente +
          ' - ' +
          dataHoraFormatada

        const htmlContent =
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
            '[cron_lembretes] Email ' +
              tipo +
              ' enviado com sucesso para ' +
              DEST_EMAIL +
              ' (Lead: ' +
              leadId +
              ')',
          )

          logs.push({
            tipo: tipo,
            destinatario: DEST_EMAIL,
            enviado_em: now.toISOString(),
            status: 'sucesso',
          })
          return true
        } catch (mailErr) {
          console.error(
            '[cron_lembretes] Erro ao enviar email ' + tipo + ' para lead ' + leadId + ':',
            mailErr,
          )
          logs.push({
            tipo: tipo,
            destinatario: DEST_EMAIL,
            tentativa_em: now.toISOString(),
            status: 'erro',
            erro: String(mailErr),
          })
          return false
        }
      }

      // 1) Momento: 1 dia antes (24h)
      // Janela: entre 23h30 e 24h30 antes do agendamento (1410 a 1470 minutos)
      // Ou se o agendamento estiver entre 24h e 4h antes e ainda não enviou o de 1d (evita perder se o job atrasou)
      if (!lembrete1dEnviado && diffMinutes <= 1440 && diffMinutes > 240) {
        const sent = enviarLembrete('1d', 'Falta 1 Dia')
        if (sent) {
          lead.set('lembrete_1d_enviado', true)
          updated = true
        }
      }

      // 2) Momento: 4 horas antes
      // Janela: entre 4h e 20 minutos antes do agendamento (diffMinutes <= 240 && diffMinutes > 20)
      if (!lembrete4hEnviado && diffMinutes <= 240 && diffMinutes > 20) {
        const sent = enviarLembrete('4h', 'Faltam 4 Horas')
        if (sent) {
          lead.set('lembrete_4h_enviado', true)
          updated = true
        }
      }

      // 3) Momento: 20 minutos antes
      // Janela: entre 20 minutos antes até 5 minutos depois do horário agendado (diffMinutes <= 20 && diffMinutes >= -5)
      if (!lembrete20mEnviado && diffMinutes <= 20 && diffMinutes >= -5) {
        const sent = enviarLembrete('20m', 'Faltam 20 Minutos')
        if (sent) {
          lead.set('lembrete_20m_enviado', true)
          updated = true
        }
      }

      if (updated) {
        lead.set('lembretes_logs', logs)
        $app.save(lead)
      }
    }
  } catch (err) {
    console.error('Erro na execução do cron_lembretes_proximo_contato:', err)
  }
})
