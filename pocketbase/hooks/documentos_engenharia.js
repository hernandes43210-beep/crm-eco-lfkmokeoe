// Hook para envio de documentos do lead ao engenheiro responsável
// POST /backend/v1/documentos/enviar-engenheiro
//
// Regras e garantias:
// 1. Apenas usuários autenticados (Admin ou Vendedor) podem disparar o envio.
// 2. Cria notificação (sino) na coleção 'notificacoes' para o engenheiro com link para os documentos.
// 3. Envia e-mail transacional ao engenheiro com resumo dos documentos anexados.
// 4. Registra evento no historico do lead: "Documentos enviados ao engenheiro X em dd/mm" (ou reenvio).
// 5. Atualiza os registros em documentos_lead com engenheiro_destino, status_envio ('enviado' ou 'reenviado') e enviado_em.
// 6. Todas as declarações de variáveis e código inline dentro do handler para evitar scoping traps do Goja.

routerAdd(
  'POST',
  '/backend/v1/documentos/enviar-engenheiro',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { success: false, message: 'Usuário não autenticado.' })
    }

    const authRole = auth.getString('role')
    if (authRole === 'Engenheiro') {
      return e.json(403, {
        success: false,
        message: 'Engenheiros não podem enviar documentos para outros engenheiros.',
      })
    }

    const body = e.requestInfo().body || {}
    const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : ''
    const engenheiroId = typeof body.engenheiroId === 'string' ? body.engenheiroId.trim() : ''
    const observacao = typeof body.observacao === 'string' ? body.observacao.trim() : ''
    const isReenvio = !!body.isReenvio

    if (!leadId) {
      return e.json(400, { success: false, message: 'ID do lead é obrigatório.' })
    }

    if (!engenheiroId) {
      return e.json(400, { success: false, message: 'Engenheiro responsável é obrigatório.' })
    }

    // 1. Validar lead
    let leadRecord = null
    try {
      leadRecord = $app.findFirstRecordByData('leads', 'id', leadId)
    } catch (_) {
      return e.json(404, { success: false, message: 'Lead não encontrado.' })
    }

    // 2. Validar engenheiro
    let engRecord = null
    try {
      engRecord = $app.findFirstRecordByData('_pb_users_auth_', 'id', engenheiroId)
    } catch (_) {
      return e.json(404, { success: false, message: 'Engenheiro selecionado não encontrado.' })
    }

    if (engRecord.getString('role') !== 'Engenheiro' && engRecord.getString('role') !== 'Admin') {
      return e.json(400, {
        success: false,
        message: 'O usuário selecionado não possui o papel de Engenheiro.',
      })
    }

    const engNome = engRecord.getString('name') || engRecord.getString('email') || 'Engenheiro(a)'
    const engEmail = engRecord.getString('email')
    const remetenteNome = auth.getString('name') || auth.getString('email') || 'Equipe Comercial'
    const leadNome = leadRecord.getString('nome') || 'Lead sem nome'

    // 3. Buscar documentos do lead
    let docs = []
    try {
      docs = $app.findRecordsByFilter(
        'documentos_lead',
        "lead = '" + leadId + "'",
        '-created',
        200,
        0,
      )
    } catch (docsErr) {
      console.warn('[enviar_engenheiro] Erro ao buscar docs:', docsErr)
    }

    if (!docs || docs.length === 0) {
      return e.json(400, {
        success: false,
        message: 'Nenhum documento anexado para enviar ao engenheiro.',
      })
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const pad = (n) => (n < 10 ? '0' + n : String(n))
    const dataFormatadaPt =
      pad(now.getDate()) +
      '/' +
      pad(now.getMonth() + 1) +
      '/' +
      now.getFullYear() +
      ' às ' +
      pad(now.getHours()) +
      ':' +
      pad(now.getMinutes())
    const dataSimples = pad(now.getDate()) + '/' + pad(now.getMonth() + 1)

    // 4. Atualizar os documentos do lead com engenheiro_destino, status e timestamp
    let docsAtualizadosCount = 0
    const novoStatus = isReenvio ? 'reenviado' : 'enviado'

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]
      doc.set('engenheiro_destino', engenheiroId)
      doc.set('status_envio', novoStatus)
      doc.set('enviado_em', nowIso)
      if (!doc.getString('enviado_por')) {
        doc.set('enviado_por', auth.id)
      }
      try {
        $app.save(doc)
        docsAtualizadosCount++
      } catch (saveDocErr) {
        console.error('[enviar_engenheiro] Erro ao salvar doc ' + doc.id + ':', saveDocErr)
      }
    }

    // 5. Registrar no historico do lead (truncado a 50 eventos)
    try {
      let hist = []
      const rawHist = leadRecord.get('historico')
      if (Array.isArray(rawHist)) {
        hist = rawHist.slice(0)
      } else if (typeof rawHist === 'string') {
        try {
          const parsed = JSON.parse(rawHist)
          if (Array.isArray(parsed)) hist = parsed
        } catch (_) {}
      }

      const tipoEvento = isReenvio ? 'documentos_reenviados' : 'documentos_enviados'
      const descEvento = isReenvio
        ? 'Documentos atualizados/reenviados ao engenheiro ' +
          engNome +
          ' em ' +
          dataSimples +
          ' (' +
          docsAtualizadosCount +
          ' arquivos)' +
          (observacao ? ' — Obs: ' + observacao : '')
        : 'Documentos enviados ao engenheiro ' +
          engNome +
          ' em ' +
          dataSimples +
          ' (' +
          docsAtualizadosCount +
          ' arquivos)' +
          (observacao ? ' — Obs: ' + observacao : '')

      hist.push({
        data: nowIso,
        tipo: 'contato',
        descricao: descEvento,
        autor: auth.id,
        autor_nome: remetenteNome,
      })

      // Manter no máximo 50 eventos para não estourar payload/cron
      if (hist.length > 50) {
        hist = hist.slice(hist.length - 50)
      }

      leadRecord.set('historico', hist)
      $app.save(leadRecord)
    } catch (histErr) {
      console.error('[enviar_engenheiro] Erro ao atualizar historico do lead:', histErr)
    }

    // 6. Criar notificação (sino) para o engenheiro
    try {
      const notifCol = $app.findCollectionByNameOrId('notificacoes')
      const notif = new Record(notifCol)
      notif.set('usuario', engenheiroId)
      notif.set('lead', leadId)
      notif.set(
        'titulo',
        isReenvio ? 'Reenvio de Documentos: ' + leadNome : 'Novos Documentos Técnicos: ' + leadNome,
      )
      notif.set(
        'mensagem',
        remetenteNome +
          ' enviou ' +
          docsAtualizadosCount +
          ' documento(s) do cliente ' +
          leadNome +
          ' para análise técnica e homologação.' +
          (observacao ? ' Nota: ' + observacao : ''),
      )
      notif.set('tipo', 'documentos_engenharia')
      notif.set('lida', false)
      notif.set('lead_nome', leadNome)
      notif.set('lead_cidade', leadRecord.getString('cidade') || '')
      notif.set('lead_telefone', leadRecord.getString('telefone') || '')
      notif.set(
        'metadados',
        JSON.stringify({
          acao: isReenvio ? 'reenvio_documentos' : 'envio_documentos',
          docs_count: docsAtualizadosCount,
          remetente_id: auth.id,
          remetente_nome: remetenteNome,
          enviado_em: nowIso,
        }),
      )
      $app.save(notif)
      console.log('[enviar_engenheiro] Notificação criada no sino para ' + engNome)
    } catch (notifErr) {
      console.error('[enviar_engenheiro] Erro ao criar notificacao sino:', notifErr)
    }

    // 7. Disparar e-mail transacional para o engenheiro
    let emailEnviado = false
    let emailErroMsg = ''
    try {
      const metaSettings = $app.settings().meta || {}
      const senderAddr = metaSettings.senderAddress || 'no-reply@goskip.dev'
      const senderName = metaSettings.senderName || 'Ecosolar Energy CRM'
      const appDocsUrl = 'https://crm-de-vendas-solar-dce30.goskip.app/engenharia'

      // Resumo de categorias
      let countPessoais = 0
      let countConta = 0
      let countDatasheet = 0
      let countProc = 0

      for (let j = 0; j < docs.length; j++) {
        const cat = docs[j].getString('categoria')
        if (cat === 'documentos_pessoais') countPessoais++
        else if (cat === 'conta_energia') countConta++
        else if (cat === 'datasheet_equipamentos') countDatasheet++
        else if (cat === 'procuracao') countProc++
      }

      const htmlBody =
        '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px 16px; background-color: #f8fafc;">' +
        '  <div style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">' +
        '    <div style="background: linear-gradient(135deg, #0B7A5B 0%, #095C44 100%); padding: 26px 24px; text-align: center; color: #ffffff;">' +
        '      <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Ecosolar Energy — Engenharia</h1>' +
        '      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.92; font-weight: 500;">' +
        (isReenvio
          ? 'Atualização de Documentos do Cliente'
          : 'Novos Documentos Recebidos para Análise') +
        '</p>' +
        '    </div>' +
        '    <div style="padding: 24px; color: #1e293b; line-height: 1.6;">' +
        '      <p style="margin-top: 0; font-size: 15px;">Olá, Eng. <strong>' +
        engNome +
        '</strong>!</p>' +
        '      <p style="font-size: 14px; color: #475569;">' +
        remetenteNome +
        (isReenvio
          ? ' atualizou e reenviou os documentos técnicos do lead '
          : ' acabou de enviar os documentos técnicos do lead ') +
        '<strong>' +
        leadNome +
        '</strong> para sua conferência e homologação junto à concessionária.' +
        '      </p>' +
        '      <div style="margin: 18px 0; padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">' +
        '        <div style="font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 8px;">Resumo dos Arquivos Anexados (' +
        docsAtualizadosCount +
        ' total)</div>' +
        '        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #064e3b; line-height: 1.7;">' +
        '          <li>Documentos Pessoais do Cliente: <strong>' +
        countPessoais +
        '</strong> arquivo(s)</li>' +
        '          <li>Conta de Energia Elétrica: <strong>' +
        countConta +
        '</strong> arquivo(s)</li>' +
        '          <li>Datasheet dos Equipamentos: <strong>' +
        countDatasheet +
        '</strong> arquivo(s)</li>' +
        '          <li>Procuração Assinada: <strong>' +
        countProc +
        '</strong> arquivo(s)</li>' +
        '        </ul>' +
        (observacao
          ? '        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #86efac; font-size: 12px; color: #14532d;"><strong>Observações:</strong> ' +
            observacao +
            '</div>'
          : '') +
        '      </div>' +
        '      <div style="margin: 24px 0 16px 0; text-align: center;">' +
        '        <a href="' +
        appDocsUrl +
        '" target="_blank" style="background-color: #0B7A5B; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(11, 122, 91, 0.25);">' +
        '          Acessar Meus Documentos no CRM &rarr;' +
        '        </a>' +
        '      </div>' +
        '      <p style="font-size: 11px; color: #64748b; text-align: center; margin-top: 14px;">' +
        '        Você tem permissão exclusiva para visualizar e baixar todos os documentos anexados.' +
        '      </p>' +
        '    </div>' +
        '    <div style="padding: 14px 20px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">' +
        '      Ecosolar Energy • Módulo de Engenharia Solar • Enviado em ' +
        dataFormatadaPt +
        '    </div>' +
        '  </div>' +
        '</div>'

      if (engEmail) {
        const mailClient = $app.newMailClient()
        const message = new MailerMessage({
          from: {
            address: senderAddr,
            name: senderName,
          },
          to: [{ address: engEmail }],
          subject:
            (isReenvio ? '[REENVIO] ' : '') +
            'Documentos do Lead ' +
            leadNome +
            ' enviados para Engenharia',
          html: htmlBody,
        })
        mailClient.send(message)
        emailEnviado = true
        console.log('[enviar_engenheiro] E-mail enviado com sucesso para ' + engEmail)
      }
    } catch (mailErr) {
      emailEnviado = false
      emailErroMsg = mailErr && mailErr.message ? mailErr.message : String(mailErr)
      console.error('[enviar_engenheiro] Falha ao enviar e-mail:', mailErr)
    }

    return e.json(200, {
      success: true,
      message: isReenvio
        ? 'Documentos reenviados ao engenheiro ' + engNome + ' com sucesso!'
        : 'Documentos enviados ao engenheiro ' + engNome + ' com sucesso!',
      total_documentos: docsAtualizadosCount,
      engenheiro: {
        id: engenheiroId,
        nome: engNome,
        email: engEmail,
      },
      email_enviado: emailEnviado,
      email_erro: emailErroMsg || undefined,
      data_envio: dataFormatadaPt,
    })
  },
  $apis.requireAuth(),
)
