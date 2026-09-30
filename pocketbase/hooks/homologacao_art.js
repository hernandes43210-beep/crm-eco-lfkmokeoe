// Hook para envio da ART para pagamento e atualização de status no Kanban de Homologação
// Endpoints:
// 1. POST /backend/v1/homologacao/enviar-art (Engenheiro anexa PDF da ART e envia para pagamento)
// 2. POST /backend/v1/homologacao/marcar-art-paga (Vendedor ou Admin marca a ART como paga)
// 3. POST /backend/v1/homologacao/mover-status (Engenheiro ou Admin move o card entre as 7 colunas)

routerAdd(
  'POST',
  '/backend/v1/homologacao/enviar-art',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { success: false, message: 'Usuário não autenticado.' })
    }

    const authRole = auth.getString('role')
    // Engenheiro ou Admin podem enviar ART
    if (authRole !== 'Engenheiro' && authRole !== 'Admin') {
      return e.json(403, {
        success: false,
        message:
          'Apenas engenheiros responsáveis ou administradores podem enviar ART para pagamento.',
      })
    }

    const homologacaoId = e.requestInfo().body?.homologacaoId || ''
    const observacao = e.requestInfo().body?.observacao || ''

    if (!homologacaoId) {
      return e.json(400, { success: false, message: 'ID da homologação é obrigatório.' })
    }

    // 1. Buscar registro de homologação
    let homRecord = null
    try {
      homRecord = $app.findFirstRecordByData('homologacoes', 'id', homologacaoId)
    } catch (_) {
      return e.json(404, { success: false, message: 'Registro de homologação não encontrado.' })
    }

    // Se for engenheiro comum, validar se é o responsável ou tem permissão de supervisão
    const podeSupervisionarArt = auth.getBool('pode_supervisionar_engenharia')
    if (
      authRole === 'Engenheiro' &&
      homRecord.getString('engenheiro') !== auth.id &&
      !podeSupervisionarArt
    ) {
      return e.json(403, {
        success: false,
        message: 'Você não tem permissão para alterar esta homologação.',
      })
    }

    // 2. Extrair arquivo do multipart form
    let artFiles = []
    try {
      artFiles = e.findUploadedFiles('art_arquivo')
    } catch (_) {}

    if (!artFiles || artFiles.length === 0) {
      // Se já houver art_arquivo gravada no registro, pode apenas atualizar status, mas o requisito pede o envio do arquivo
      const arquivoExistente = homRecord.getString('art_arquivo')
      if (!arquivoExistente) {
        return e.json(400, {
          success: false,
          message: 'O arquivo da ART em PDF é obrigatório para envio.',
        })
      }
    } else {
      homRecord.set('art_arquivo', artFiles[0])
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

    homRecord.set('art_status', 'enviada')
    homRecord.set('art_enviada_em', nowIso)
    if (observacao) {
      homRecord.set('art_observacao', String(observacao).trim())
    }

    // Histórico da homologação
    let homHist = []
    const rawHomHist = homRecord.get('historico')
    if (Array.isArray(rawHomHist)) {
      homHist = rawHomHist.slice(0)
    } else if (typeof rawHomHist === 'string') {
      try {
        const p = JSON.parse(rawHomHist)
        if (Array.isArray(p)) homHist = p
      } catch (_) {}
    }

    const remetenteNome = auth.getString('name') || auth.getString('email') || 'Engenheiro'

    homHist.push({
      data: nowIso,
      tipo: 'art_enviada',
      descricao:
        'ART enviada para pagamento por ' +
        remetenteNome +
        (observacao ? ' — Obs: ' + observacao : ''),
      autor_id: auth.id,
      autor_nome: remetenteNome,
    })

    if (homHist.length > 50) {
      homHist = homHist.slice(homHist.length - 50)
    }
    homRecord.set('historico', homHist)

    $app.save(homRecord)

    const clienteNome = homRecord.getString('cliente_nome') || 'Cliente'
    const leadId = homRecord.getString('lead')
    const vendedorId = homRecord.getString('vendedor')

    // 3. Atualizar histórico do Lead (se lead existir)
    if (leadId) {
      try {
        const leadRecord = $app.findFirstRecordByData('leads', 'id', leadId)
        let leadHist = []
        const rawLeadHist = leadRecord.get('historico')
        if (Array.isArray(rawLeadHist)) {
          leadHist = rawLeadHist.slice(0)
        } else if (typeof rawLeadHist === 'string') {
          try {
            const p = JSON.parse(rawLeadHist)
            if (Array.isArray(p)) leadHist = p
          } catch (_) {}
        }

        leadHist.push({
          data: nowIso,
          tipo: 'nota',
          descricao:
            'ART de homologação enviada para pagamento por ' +
            remetenteNome +
            ' em ' +
            dataSimples +
            (observacao ? ' (Nota: ' + observacao + ')' : ''),
          autor: auth.id,
          autor_nome: remetenteNome,
        })

        if (leadHist.length > 50) {
          leadHist = leadHist.slice(leadHist.length - 50)
        }
        leadRecord.set('historico', leadHist)
        $app.save(leadRecord)
      } catch (lErr) {
        console.warn('[enviar_art] Aviso ao atualizar lead:', lErr)
      }
    }

    // 4. Disparar notificações no Sino para o Vendedor e para os Admins
    const destinatariosNotif = []
    if (vendedorId && vendedorId !== auth.id) {
      destinatariosNotif.push(vendedorId)
    }

    // Buscar Admins
    try {
      const admins = $app.findRecordsByFilter('_pb_users_auth_', "role = 'Admin'", 'name', 50, 0)
      for (let a = 0; a < admins.length; a++) {
        const adminId = admins[a].id
        if (adminId !== auth.id && destinatariosNotif.indexOf(adminId) === -1) {
          destinatariosNotif.push(adminId)
        }
      }
    } catch (_) {}

    const notifCol = $app.findCollectionByNameOrId('notificacoes')
    for (let d = 0; d < destinatariosNotif.length; d++) {
      try {
        const nRec = new Record(notifCol)
        nRec.set('usuario', destinatariosNotif[d])
        if (leadId) nRec.set('lead', leadId)
        nRec.set('titulo', 'Nova ART enviada para pagamento — ' + clienteNome)
        nRec.set(
          'mensagem',
          remetenteNome +
            ' enviou a ART de homologação do cliente ' +
            clienteNome +
            ' para pagamento.' +
            (observacao ? ' Obs: ' + observacao : ''),
        )
        nRec.set('tipo', 'homologacao_art')
        nRec.set('lida', false)
        nRec.set('lead_nome', clienteNome)
        nRec.set('lead_cidade', homRecord.getString('cliente_cidade') || '')
        nRec.set('lead_telefone', homRecord.getString('cliente_telefone') || '')
        nRec.set(
          'metadados',
          JSON.stringify({
            acao: 'art_enviada',
            homologacao_id: homRecord.id,
            lead_id: leadId,
            art_status: 'enviada',
            art_enviada_em: nowIso,
          }),
        )
        $app.save(nRec)
      } catch (nErr) {
        console.warn(
          '[enviar_art] Erro ao salvar notificação para user ' + destinatariosNotif[d],
          nErr,
        )
      }
    }

    // 5. Enviar e-mail para o Vendedor e Admins com link de download da ART
    let emailsEnviados = 0
    try {
      const metaSettings = $app.settings().meta || {}
      const senderAddr = metaSettings.senderAddress || 'no-reply@goskip.dev'
      const senderName = metaSettings.senderName || 'Ecosolar Energy CRM'
      const mailClient = $app.newMailClient()

      const artFileName = homRecord.getString('art_arquivo')
      const fileDownloadUrl =
        'https://crm-de-vendas-solar-dce30.shrd00.internal.goskip.dev/api/files/' +
        homRecord.collection().id +
        '/' +
        homRecord.id +
        '/' +
        artFileName
      const leadDetailUrl = leadId
        ? 'https://crm-de-vendas-solar-dce30.goskip.app/leads/' + leadId
        : 'https://crm-de-vendas-solar-dce30.goskip.app/leads'

      const emailHtml =
        '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px 16px; background-color: #f8fafc;">' +
        '  <div style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">' +
        '    <div style="background: linear-gradient(135deg, #0B7A5B 0%, #095C44 100%); padding: 24px; text-align: center; color: #ffffff;">' +
        '      <h1 style="margin: 0; font-size: 20px; font-weight: 800;">Ecosolar Energy — Engenharia</h1>' +
        '      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.95;">Nova ART Enviada para Pagamento</p>' +
        '    </div>' +
        '    <div style="padding: 24px; color: #1e293b; line-height: 1.6;">' +
        '      <p style="margin-top: 0; font-size: 15px;">Olá!</p>' +
        '      <p style="font-size: 14px; color: #475569;">' +
        '        O engenheiro <strong>' +
        remetenteNome +
        '</strong> anexou e enviou a <strong>ART (Anotação de Responsabilidade Técnica)</strong> para pagamento referente ao cliente:' +
        '      </p>' +
        '      <div style="margin: 18px 0; padding: 16px; background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px;">' +
        '        <table style="width: 100%; font-size: 13px; color: #713f12; line-height: 1.6;">' +
        '          <tr><td style="width: 130px; font-weight: 700;">Cliente:</td><td><strong>' +
        clienteNome +
        '</strong></td></tr>' +
        '          <tr><td style="font-weight: 700;">Cidade:</td><td>' +
        (homRecord.getString('cliente_cidade') || 'Não informada') +
        '</td></tr>' +
        '          <tr><td style="font-weight: 700;">Potência do Kit:</td><td>' +
        (homRecord.get('potencia_total_kwp')
          ? homRecord.get('potencia_total_kwp') + ' kWp'
          : 'Não informada') +
        '</td></tr>' +
        '          <tr><td style="font-weight: 700;">Enviada em:</td><td>' +
        dataFormatadaPt +
        '</td></tr>' +
        '        </table>' +
        (observacao
          ? '        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #fde047; font-size: 12px;"><strong>Observação:</strong> ' +
            observacao +
            '</div>'
          : '') +
        '      </div>' +
        '      <div style="margin: 24px 0 16px 0; text-align: center; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">' +
        '        <a href="' +
        fileDownloadUrl +
        '" target="_blank" style="background-color: #0B7A5B; color: #ffffff; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px; display: inline-block;">' +
        '          📥 Baixar Arquivo da ART (PDF)' +
        '        </a>' +
        '        <a href="' +
        leadDetailUrl +
        '" target="_blank" style="background-color: #0f172a; color: #ffffff; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px; display: inline-block;">' +
        '          Abrir Ficha do Lead no CRM &rarr;' +
        '        </a>' +
        '      </div>' +
        '      <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 14px;">' +
        '        Após efetuar o pagamento da taxa da ART, acesse a ficha do cliente para marcar "ART paga" e liberar a continuidade do fluxo pelo engenheiro.' +
        '      </p>' +
        '    </div>' +
        '  </div>' +
        '</div>'

      // Coletar emails únicos dos destinatários
      const emailsList = []
      for (let u = 0; u < destinatariosNotif.length; u++) {
        try {
          const userRec = $app.findFirstRecordByData('_pb_users_auth_', 'id', destinatariosNotif[u])
          const em = userRec.getString('email')
          if (em && emailsList.indexOf(em) === -1) {
            emailsList.push(em)
          }
        } catch (_) {}
      }

      for (let m = 0; m < emailsList.length; m++) {
        try {
          const message = new MailerMessage({
            from: { address: senderAddr, name: senderName },
            to: [{ address: emailsList[m] }],
            subject: 'Nova ART enviada para pagamento — ' + clienteNome,
            html: emailHtml,
          })
          mailClient.send(message)
          emailsEnviados++
        } catch (sendErr) {
          console.warn('[enviar_art] Falha ao enviar email para ' + emailsList[m], sendErr)
        }
      }
    } catch (mailAllErr) {
      console.warn('[enviar_art] Erro geral ao disparar e-mails:', mailAllErr)
    }

    return e.json(200, {
      success: true,
      message: 'ART enviada para pagamento com sucesso!',
      homologacao_id: homRecord.id,
      art_status: 'enviada',
      art_arquivo: homRecord.getString('art_arquivo'),
      art_enviada_em: nowIso,
      emails_enviados: emailsEnviados,
    })
  },
  $apis.requireAuth(),
)

// Endpoint 2: Marcar ART como Paga (Vendedor ou Admin)
routerAdd(
  'POST',
  '/backend/v1/homologacao/marcar-art-paga',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { success: false, message: 'Usuário não autenticado.' })
    }

    const authRole = auth.getString('role')
    if (authRole === 'Engenheiro') {
      return e.json(403, {
        success: false,
        message:
          'Apenas vendedores responsáveis ou administradores podem confirmar o pagamento da ART.',
      })
    }

    const body = e.requestInfo().body || {}
    const homologacaoId = typeof body.homologacaoId === 'string' ? body.homologacaoId.trim() : ''
    const observacao = typeof body.observacao === 'string' ? body.observacao.trim() : ''

    if (!homologacaoId) {
      return e.json(400, { success: false, message: 'ID da homologação é obrigatório.' })
    }

    let homRecord = null
    try {
      homRecord = $app.findFirstRecordByData('homologacoes', 'id', homologacaoId)
    } catch (_) {
      return e.json(404, { success: false, message: 'Registro de homologação não encontrado.' })
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

    homRecord.set('art_status', 'paga')
    homRecord.set('art_paga_em', nowIso)

    const autorNome = auth.getString('name') || auth.getString('email') || 'Vendedor'

    // Histórico da homologação
    let homHist = []
    const rawHomHist = homRecord.get('historico')
    if (Array.isArray(rawHomHist)) {
      homHist = rawHomHist.slice(0)
    } else if (typeof rawHomHist === 'string') {
      try {
        const p = JSON.parse(rawHomHist)
        if (Array.isArray(p)) homHist = p
      } catch (_) {}
    }

    homHist.push({
      data: nowIso,
      tipo: 'art_paga',
      descricao:
        'ART marcada como paga por ' + autorNome + (observacao ? ' — Obs: ' + observacao : ''),
      autor_id: auth.id,
      autor_nome: autorNome,
    })

    if (homHist.length > 50) {
      homHist = homHist.slice(homHist.length - 50)
    }
    homRecord.set('historico', homHist)
    $app.save(homRecord)

    const clienteNome = homRecord.getString('cliente_nome') || 'Cliente'
    const engenheiroId = homRecord.getString('engenheiro')
    const leadId = homRecord.getString('lead')

    // 1. Atualizar histórico do Lead
    if (leadId) {
      try {
        const leadRecord = $app.findFirstRecordByData('leads', 'id', leadId)
        let leadHist = []
        const rawLeadHist = leadRecord.get('historico')
        if (Array.isArray(rawLeadHist)) {
          leadHist = rawLeadHist.slice(0)
        } else if (typeof rawLeadHist === 'string') {
          try {
            const p = JSON.parse(rawLeadHist)
            if (Array.isArray(p)) leadHist = p
          } catch (_) {}
        }

        leadHist.push({
          data: nowIso,
          tipo: 'nota',
          descricao:
            'ART de homologação marcada como paga por ' +
            autorNome +
            ' em ' +
            dataSimples +
            ' — Liberado para o Engenheiro prosseguir.',
          autor: auth.id,
          autor_nome: autorNome,
        })

        if (leadHist.length > 50) {
          leadHist = leadHist.slice(leadHist.length - 50)
        }
        leadRecord.set('historico', leadHist)
        $app.save(leadRecord)
      } catch (lErr) {
        console.warn('[marcar_art_paga] Aviso ao atualizar histórico do lead:', lErr)
      }
    }

    // 2. Notificação (sino) para o Engenheiro
    if (engenheiroId) {
      try {
        const notifCol = $app.findCollectionByNameOrId('notificacoes')
        const nRec = new Record(notifCol)
        nRec.set('usuario', engenheiroId)
        if (leadId) nRec.set('lead', leadId)
        nRec.set('titulo', 'ART marcada como paga — ' + clienteNome)
        nRec.set(
          'mensagem',
          autorNome +
            ' confirmou o pagamento da taxa da ART do cliente ' +
            clienteNome +
            '. Você pode continuar o processo de homologação junto à concessionária.',
        )
        nRec.set('tipo', 'homologacao_art')
        nRec.set('lida', false)
        nRec.set('lead_nome', clienteNome)
        nRec.set('lead_cidade', homRecord.getString('cliente_cidade') || '')
        nRec.set('lead_telefone', homRecord.getString('cliente_telefone') || '')
        nRec.set(
          'metadados',
          JSON.stringify({
            acao: 'art_paga',
            homologacao_id: homRecord.id,
            lead_id: leadId,
            art_status: 'paga',
            art_paga_em: nowIso,
          }),
        )
        $app.save(nRec)
      } catch (nErr) {
        console.warn('[marcar_art_paga] Erro ao criar notificação de sino:', nErr)
      }

      // 3. E-mail para o Engenheiro
      try {
        const engUser = $app.findFirstRecordByData('_pb_users_auth_', 'id', engenheiroId)
        const engEmail = engUser.getString('email')
        if (engEmail) {
          const metaSettings = $app.settings().meta || {}
          const senderAddr = metaSettings.senderAddress || 'no-reply@goskip.dev'
          const senderName = metaSettings.senderName || 'Ecosolar Energy CRM'
          const mailClient = $app.newMailClient()
          const engenhariaUrl = 'https://crm-de-vendas-solar-dce30.goskip.app/engenharia'

          const emailHtml =
            '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px 16px; background-color: #f8fafc;">' +
            '  <div style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">' +
            '    <div style="background: linear-gradient(135deg, #0B7A5B 0%, #095C44 100%); padding: 24px; text-align: center; color: #ffffff;">' +
            '      <h1 style="margin: 0; font-size: 20px; font-weight: 800;">Ecosolar Energy — Engenharia</h1>' +
            '      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.95;">ART Paga — Fluxo Liberado</p>' +
            '    </div>' +
            '    <div style="padding: 24px; color: #1e293b; line-height: 1.6;">' +
            '      <p style="margin-top: 0; font-size: 15px;">Olá, Eng. <strong>' +
            (engUser.getString('name') || 'Engenheiro(a)') +
            '</strong>!</p>' +
            '      <p style="font-size: 14px; color: #475569;">' +
            '        A taxa da <strong>ART do cliente ' +
            clienteNome +
            '</strong> foi marcada como <strong>PAGA</strong> por ' +
            autorNome +
            ' em ' +
            dataFormatadaPt +
            '.' +
            '      </p>' +
            '      <p style="font-size: 14px; color: #166534; font-weight: 600; background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px;">' +
            '        ✓ O card no Kanban de Homologação foi atualizado para "ART paga". Você pode dar andamento na solicitação de acesso junto à Energisa!' +
            '      </p>' +
            '      <div style="margin: 24px 0 16px 0; text-align: center;">' +
            '        <a href="' +
            engenhariaUrl +
            '" target="_blank" style="background-color: #0B7A5B; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">' +
            '          Acessar Kanban de Homologação &rarr;' +
            '        </a>' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '</div>'

          const message = new MailerMessage({
            from: { address: senderAddr, name: senderName },
            to: [{ address: engEmail }],
            subject: 'ART marcada como paga — ' + clienteNome,
            html: emailHtml,
          })
          mailClient.send(message)
        }
      } catch (mErr) {
        console.warn('[marcar_art_paga] Falha ao enviar e-mail ao engenheiro:', mErr)
      }
    }

    return e.json(200, {
      success: true,
      message: 'ART marcada como paga com sucesso!',
      homologacao_id: homRecord.id,
      art_status: 'paga',
      art_paga_em: nowIso,
    })
  },
  $apis.requireAuth(),
)

// Endpoint 3: Mover card de status no Kanban de Homologação
routerAdd(
  'POST',
  '/backend/v1/homologacao/mover-status',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { success: false, message: 'Usuário não autenticado.' })
    }

    const body = e.requestInfo().body || {}
    const homologacaoId = typeof body.homologacaoId === 'string' ? body.homologacaoId.trim() : ''
    const novoStatus = typeof body.status === 'string' ? body.status.trim() : ''
    const observacao = typeof body.observacao === 'string' ? body.observacao.trim() : ''
    const dadosEtapa = body.dadosEtapa && typeof body.dadosEtapa === 'object' ? body.dadosEtapa : {}

    const STATUS_VALIDOS = [
      'novo_cliente',
      'em_projeto',
      'homologacao',
      'resposta_energisa',
      'liberado_vistoria',
      'vistoria_solicitada',
      'entregue',
    ]

    const labelsMap = {
      novo_cliente: 'Novo Cliente',
      em_projeto: 'Em Projeto',
      homologacao: 'Homologação',
      resposta_energisa: 'Resposta da Energisa',
      liberado_vistoria: 'Liberado para Vistoria',
      vistoria_solicitada: 'Vistoria Solicitada',
      entregue: 'Entregue',
    }

    if (!homologacaoId || !novoStatus) {
      return e.json(400, {
        success: false,
        message: 'homologacaoId e status são obrigatórios.',
      })
    }

    if (STATUS_VALIDOS.indexOf(novoStatus) === -1) {
      return e.json(400, {
        success: false,
        message: 'Status de homologação inválido.',
      })
    }

    let homRecord = null
    try {
      homRecord = $app.findFirstRecordByData('homologacoes', 'id', homologacaoId)
    } catch (_) {
      return e.json(404, { success: false, message: 'Homologação não encontrada.' })
    }

    const authRole = auth.getString('role')
    const podeSupervisionarMover = auth.getBool('pode_supervisionar_engenharia')
    if (
      authRole === 'Engenheiro' &&
      homRecord.getString('engenheiro') !== auth.id &&
      !podeSupervisionarMover
    ) {
      return e.json(403, {
        success: false,
        message: 'Você não tem permissão para movimentar esta homologação.',
      })
    }

    const statusAntigo = homRecord.getString('status')
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
    const autorNome = auth.getString('name') || auth.getString('email') || 'Engenheiro'

    homRecord.set('status', novoStatus)

    // Se estiver em 'novo_cliente' e for movido, marca visualizado_em se ainda não estiver
    if (!homRecord.getString('visualizado_em')) {
      homRecord.set('visualizado_em', nowIso)
    }

    // Persistir dados específicos por etapa
    if (dadosEtapa.energisa_resposta) {
      homRecord.set('energisa_resposta', String(dadosEtapa.energisa_resposta).trim())
    }
    if (dadosEtapa.energisa_resposta_data) {
      homRecord.set('energisa_resposta_data', String(dadosEtapa.energisa_resposta_data).trim())
    }
    if (dadosEtapa.vistoria_data) {
      homRecord.set('vistoria_data', String(dadosEtapa.vistoria_data).trim())
    }
    if (dadosEtapa.vistoria_observacao) {
      homRecord.set('vistoria_observacao', String(dadosEtapa.vistoria_observacao).trim())
    }

    // Estrutura de observações por etapa
    let obsEtapas = []
    const rawObsEtapas = homRecord.get('observacoes_etapas')
    if (Array.isArray(rawObsEtapas)) {
      obsEtapas = rawObsEtapas.slice(0)
    } else if (typeof rawObsEtapas === 'string') {
      try {
        const parsed = JSON.parse(rawObsEtapas)
        if (Array.isArray(parsed)) obsEtapas = parsed
      } catch (_) {}
    }

    if (observacao || Object.keys(dadosEtapa).length > 0) {
      obsEtapas.push({
        etapa: novoStatus,
        etapa_nome: labelsMap[novoStatus] || novoStatus,
        observacao: observacao || '',
        data: nowIso,
        autor_id: auth.id,
        autor_nome: autorNome,
        dados_extras: dadosEtapa,
      })
      if (obsEtapas.length > 50) {
        obsEtapas = obsEtapas.slice(obsEtapas.length - 50)
      }
      homRecord.set('observacoes_etapas', obsEtapas)
    }

    // Histórico geral da homologação
    let homHist = []
    const rawHomHist = homRecord.get('historico')
    if (Array.isArray(rawHomHist)) {
      homHist = rawHomHist.slice(0)
    } else if (typeof rawHomHist === 'string') {
      try {
        const p = JSON.parse(rawHomHist)
        if (Array.isArray(p)) homHist = p
      } catch (_) {}
    }

    const descHist =
      statusAntigo === novoStatus
        ? 'Etapa "' +
          (labelsMap[novoStatus] || novoStatus) +
          '" atualizada por ' +
          autorNome +
          (observacao ? ' — Obs: ' + observacao : '')
        : 'Status alterado de ' +
          (labelsMap[statusAntigo] || statusAntigo) +
          ' para ' +
          (labelsMap[novoStatus] || novoStatus) +
          (observacao ? ' — Obs: ' + observacao : '')

    homHist.push({
      data: nowIso,
      tipo: 'movimentacao_kanban',
      descricao: descHist,
      de: statusAntigo,
      para: novoStatus,
      observacao: observacao || '',
      autor_id: auth.id,
      autor_nome: autorNome,
      dados_etapa: dadosEtapa,
    })

    if (homHist.length > 50) {
      homHist = homHist.slice(homHist.length - 50)
    }
    homRecord.set('historico', homHist)
    $app.save(homRecord)

    // Atualizar no histórico do lead caso exista
    const leadId = homRecord.getString('lead')
    const clienteNome = homRecord.getString('cliente_nome') || 'Cliente'
    const vendedorId = homRecord.getString('vendedor')

    if (leadId) {
      try {
        const leadRecord = $app.findFirstRecordByData('leads', 'id', leadId)
        let leadHist = []
        const rawLeadHist = leadRecord.get('historico')
        if (Array.isArray(rawLeadHist)) {
          leadHist = rawLeadHist.slice(0)
        } else if (typeof rawLeadHist === 'string') {
          try {
            const p = JSON.parse(rawLeadHist)
            if (Array.isArray(p)) leadHist = p
          } catch (_) {}
        }

        leadHist.push({
          data: nowIso,
          tipo: 'status',
          descricao:
            'Engenharia: Homologação avançou para "' +
            (labelsMap[novoStatus] || novoStatus) +
            '" por ' +
            autorNome +
            (observacao ? ' (Obs: ' + observacao + ')' : ''),
          autor: auth.id,
          autor_nome: autorNome,
        })

        if (leadHist.length > 50) {
          leadHist = leadHist.slice(leadHist.length - 50)
        }
        leadRecord.set('historico', leadHist)
        $app.save(leadRecord)
      } catch (lhErr) {
        console.warn('[mover_status] Erro ao sincronizar histórico do lead:', lhErr)
      }
    }

    // Notificações relevantes para o Vendedor e Admins:
    // Disparar se:
    // 1. novoStatus === 'resposta_energisa' (Parecer da concessionária registrado)
    // 2. novoStatus === 'entregue' (Entrega e homologação concluída)
    // 3. novoStatus === 'liberado_vistoria' ou 'vistoria_solicitada'
    const etapasNotificaveis = [
      'resposta_energisa',
      'liberado_vistoria',
      'vistoria_solicitada',
      'entregue',
    ]

    if (etapasNotificaveis.indexOf(novoStatus) !== -1) {
      const destinatarios = []
      if (vendedorId && vendedorId !== auth.id) {
        destinatarios.push(vendedorId)
      }

      try {
        const admins = $app.findRecordsByFilter('_pb_users_auth_', "role = 'Admin'", 'name', 50, 0)
        for (let a = 0; a < admins.length; a++) {
          const aid = admins[a].id
          if (aid !== auth.id && destinatarios.indexOf(aid) === -1) {
            destinatarios.push(aid)
          }
        }
      } catch (_) {}

      const titulosEtapa = {
        resposta_energisa: 'Resposta da Energisa registrada — ' + clienteNome,
        liberado_vistoria: 'Obra liberada para vistoria — ' + clienteNome,
        vistoria_solicitada: 'Vistoria solicitada à Energisa — ' + clienteNome,
        entregue: 'Homologação concluída e entregue! — ' + clienteNome,
      }

      const tituloNotif =
        titulosEtapa[novoStatus] ||
        'Avanço de homologação: ' + (labelsMap[novoStatus] || novoStatus) + ' — ' + clienteNome

      const msgNotif =
        autorNome +
        ' avançou o processo de homologação do cliente ' +
        clienteNome +
        ' para "' +
        (labelsMap[novoStatus] || novoStatus) +
        '".' +
        (observacao ? ' Observação registrada: ' + observacao : '')

      // Salvar sino
      try {
        const notifCol = $app.findCollectionByNameOrId('notificacoes')
        for (let d = 0; d < destinatarios.length; d++) {
          try {
            const nRec = new Record(notifCol)
            nRec.set('usuario', destinatarios[d])
            if (leadId) nRec.set('lead', leadId)
            nRec.set('titulo', tituloNotif)
            nRec.set('mensagem', msgNotif)
            nRec.set('tipo', 'geral')
            nRec.set('lida', false)
            nRec.set('lead_nome', clienteNome)
            nRec.set('lead_cidade', homRecord.getString('cliente_cidade') || '')
            nRec.set('lead_telefone', homRecord.getString('cliente_telefone') || '')
            nRec.set(
              'metadados',
              JSON.stringify({
                acao: 'avanco_etapa_engenharia',
                homologacao_id: homRecord.id,
                lead_id: leadId,
                status: novoStatus,
                observacao: observacao || '',
                atualizado_em: nowIso,
              }),
            )
            $app.save(nRec)
          } catch (nErr) {
            console.warn('[mover_status] Erro ao criar notificação de sino:', nErr)
          }
        }
      } catch (colErr) {
        console.warn('[mover_status] Erro geral ao acessar notificacoes:', colErr)
      }

      // Enviar e-mail quando for 'resposta_energisa' ou 'entregue'
      if (novoStatus === 'resposta_energisa' || novoStatus === 'entregue') {
        try {
          const metaSettings = $app.settings().meta || {}
          const senderAddr = metaSettings.senderAddress || 'no-reply@goskip.dev'
          const senderName = metaSettings.senderName || 'Ecosolar Energy CRM'
          const mailClient = $app.newMailClient()

          const leadDetailUrl = leadId
            ? 'https://crm-de-vendas-solar-dce30.goskip.app/leads/' + leadId
            : 'https://crm-de-vendas-solar-dce30.goskip.app/leads'

          const emailHtml =
            '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px 16px; background-color: #f8fafc;">' +
            '  <div style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">' +
            '    <div style="background: linear-gradient(135deg, #0B7A5B 0%, #095C44 100%); padding: 24px; text-align: center; color: #ffffff;">' +
            '      <h1 style="margin: 0; font-size: 20px; font-weight: 800;">Ecosolar Energy — Engenharia</h1>' +
            '      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.95;">' +
            tituloNotif +
            '</p>' +
            '    </div>' +
            '    <div style="padding: 24px; color: #1e293b; line-height: 1.6;">' +
            '      <p style="margin-top: 0; font-size: 15px;">Olá!</p>' +
            '      <p style="font-size: 14px; color: #475569;">' +
            '        O engenheiro <strong>' +
            autorNome +
            '</strong> atualizou a etapa de homologação do cliente <strong>' +
            clienteNome +
            '</strong> para <strong>"' +
            (labelsMap[novoStatus] || novoStatus) +
            '"</strong>.' +
            '      </p>' +
            '      <div style="margin: 18px 0; padding: 16px; background-color: ' +
            (novoStatus === 'entregue' ? '#f0fdf4' : '#fefce8') +
            '; border: 1px solid ' +
            (novoStatus === 'entregue' ? '#bbf7d0' : '#fef08a') +
            '; border-radius: 8px;">' +
            '        <table style="width: 100%; font-size: 13px; color: #1e293b; line-height: 1.6;">' +
            '          <tr><td style="width: 140px; font-weight: 700;">Cliente:</td><td><strong>' +
            clienteNome +
            '</strong></td></tr>' +
            '          <tr><td style="font-weight: 700;">Nova Etapa:</td><td><strong style="color: #0B7A5B;">' +
            (labelsMap[novoStatus] || novoStatus) +
            '</strong></td></tr>' +
            '          <tr><td style="font-weight: 700;">Data do Registro:</td><td>' +
            dataFormatadaPt +
            '</td></tr>' +
            (dadosEtapa.energisa_resposta_data
              ? '          <tr><td style="font-weight: 700;">Data Resposta Energisa:</td><td>' +
                dadosEtapa.energisa_resposta_data +
                '</td></tr>'
              : '') +
            (dadosEtapa.vistoria_data
              ? '          <tr><td style="font-weight: 700;">Data da Vistoria:</td><td>' +
                dadosEtapa.vistoria_data +
                '</td></tr>'
              : '') +
            '        </table>' +
            (observacao
              ? '        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 12px;"><strong>Observação:</strong> ' +
                observacao +
                '</div>'
              : '') +
            '      </div>' +
            '      <div style="margin: 24px 0 16px 0; text-align: center;">' +
            '        <a href="' +
            leadDetailUrl +
            '" target="_blank" style="background-color: #0B7A5B; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px; display: inline-block;">' +
            '          Ver Cliente no CRM &rarr;' +
            '        </a>' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '</div>'

          // Coletar emails
          const emailsList = []
          for (let u = 0; u < destinatarios.length; u++) {
            try {
              const userRec = $app.findFirstRecordByData('_pb_users_auth_', 'id', destinatarios[u])
              const em = userRec.getString('email')
              if (em && emailsList.indexOf(em) === -1) {
                emailsList.push(em)
              }
            } catch (_) {}
          }

          for (let m = 0; m < emailsList.length; m++) {
            try {
              const msg = new MailerMessage({
                from: { address: senderAddr, name: senderName },
                to: [{ address: emailsList[m] }],
                subject: tituloNotif,
                html: emailHtml,
              })
              mailClient.send(msg)
            } catch (mErr) {
              console.warn('[mover_status] Erro ao enviar email para ' + emailsList[m], mErr)
            }
          }
        } catch (mailErr) {
          console.warn('[mover_status] Erro geral ao enviar email:', mailErr)
        }
      }
    }

    return e.json(200, {
      success: true,
      message: 'Status atualizado com sucesso!',
      homologacao_id: homRecord.id,
      status: novoStatus,
      observacoes_etapas: obsEtapas,
    })
  },
  $apis.requireAuth(),
)

// Endpoint 4: Upload de Arquivo do Processo de Engenharia
// (Projeto elétrico, plantas, processo Energisa, parecer, etc.)
routerAdd(
  'POST',
  '/backend/v1/homologacao/anexar-arquivo',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { success: false, message: 'Usuário não autenticado.' })
    }

    const authRole = auth.getString('role')
    if (authRole !== 'Engenheiro' && authRole !== 'Admin' && authRole !== 'Vendedor') {
      return e.json(403, {
        success: false,
        message: 'Apenas engenheiros e administradores podem anexar arquivos ao processo.',
      })
    }

    const homologacaoId = e.requestInfo().body?.homologacaoId || ''
    const categoria = e.requestInfo().body?.categoria || 'outros'
    const titulo = e.requestInfo().body?.titulo || ''
    const descricao = e.requestInfo().body?.descricao || ''
    const etapaOrigem = e.requestInfo().body?.etapa_origem || ''

    if (!homologacaoId) {
      return e.json(400, { success: false, message: 'ID da homologação é obrigatório.' })
    }

    let homRecord = null
    try {
      homRecord = $app.findFirstRecordByData('homologacoes', 'id', homologacaoId)
    } catch (_) {
      return e.json(404, { success: false, message: 'Homologação não encontrada.' })
    }

    const podeSupervisionarAnexar = auth.getBool('pode_supervisionar_engenharia')
    if (
      authRole === 'Engenheiro' &&
      homRecord.getString('engenheiro') !== auth.id &&
      !podeSupervisionarAnexar
    ) {
      return e.json(403, {
        success: false,
        message: 'Você não tem permissão para anexar arquivos nesta homologação.',
      })
    }

    let files = []
    try {
      files = e.findUploadedFiles('arquivo')
    } catch (_) {}

    if (!files || files.length === 0) {
      return e.json(400, {
        success: false,
        message: 'Nenhum arquivo enviado. Selecione um arquivo válido (até 30MB).',
      })
    }

    const uploadedFile = files[0]
    const leadId = homRecord.getString('lead') || ''
    const autorNome = auth.getString('name') || auth.getString('email') || 'Engenheiro'
    const now = new Date()
    const nowIso = now.toISOString()

    const arqCol = $app.findCollectionByNameOrId('arquivos_engenharia')
    const arqRec = new Record(arqCol)

    arqRec.set('homologacao', homRecord.id)
    if (leadId) arqRec.set('lead', leadId)
    arqRec.set('categoria', categoria)
    arqRec.set('titulo', titulo || uploadedFile.originalName || 'Documento Técnico')
    arqRec.set('arquivo', uploadedFile)
    arqRec.set('nome_original', uploadedFile.originalName || '')
    arqRec.set('tamanho_bytes', uploadedFile.size || 0)
    if (etapaOrigem) arqRec.set('etapa_origem', etapaOrigem)
    if (descricao) arqRec.set('descricao', descricao)
    arqRec.set('criado_por', auth.id)

    $app.save(arqRec)

    // Registrar no histórico da homologação
    let homHist = []
    const rawHomHist = homRecord.get('historico')
    if (Array.isArray(rawHomHist)) {
      homHist = rawHomHist.slice(0)
    } else if (typeof rawHomHist === 'string') {
      try {
        const p = JSON.parse(rawHomHist)
        if (Array.isArray(p)) homHist = p
      } catch (_) {}
    }

    const catLabels = {
      projeto_eletrico: 'Projeto Elétrico',
      plantas: 'Plantas Técnicas',
      processo_energisa: 'Processo da Energisa',
      art_documento: 'ART',
      memorial_descritivo: 'Memorial Descritivo',
      parecer_acesso: 'Parecer de Acesso',
      relatorio_vistoria: 'Relatório de Vistoria',
      outros: 'Arquivo Geral',
    }

    homHist.push({
      data: nowIso,
      tipo: 'anexo_arquivo',
      descricao:
        'Arquivo "' +
        (titulo || uploadedFile.originalName) +
        '" (' +
        (catLabels[categoria] || categoria) +
        ') anexado por ' +
        autorNome,
      arquivo_id: arqRec.id,
      arquivo_nome: uploadedFile.originalName || '',
      categoria: categoria,
      autor_id: auth.id,
      autor_nome: autorNome,
    })

    if (homHist.length > 50) {
      homHist = homHist.slice(homHist.length - 50)
    }
    homRecord.set('historico', homHist)
    $app.save(homRecord)

    return e.json(200, {
      success: true,
      message: 'Arquivo anexado com sucesso ao processo!',
      arquivo: {
        id: arqRec.id,
        titulo: arqRec.getString('titulo'),
        categoria: arqRec.getString('categoria'),
        nome_original: arqRec.getString('nome_original'),
        arquivo: arqRec.getString('arquivo'),
        tamanho_bytes: arqRec.get('tamanho_bytes'),
        created: arqRec.getString('created'),
      },
    })
  },
  $apis.requireAuth(),
)

// Endpoint 5: Anexar Comprovante de Pagamento (ART ou Projeto) — SOMENTE Admin/CEO
routerAdd(
  'POST',
  '/backend/v1/homologacao/anexar-comprovante',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { success: false, message: 'Usuário não autenticado.' })
    }

    const authRole = auth.getString('role')
    // Exclusivo para Admin/CEO (backend check rígido)
    if (authRole !== 'Admin') {
      return e.json(403, {
        success: false,
        message:
          'Apenas Administradores (Admin/CEO) têm permissão para anexar comprovante de pagamento.',
      })
    }

    const homologacaoId = e.requestInfo().body?.homologacaoId || ''
    const tipo = e.requestInfo().body?.tipo || '' // 'art' ou 'projeto'
    const observacao = e.requestInfo().body?.observacao || ''

    if (!homologacaoId) {
      return e.json(400, { success: false, message: 'ID da homologação é obrigatório.' })
    }

    if (tipo !== 'art' && tipo !== 'projeto') {
      return e.json(400, {
        success: false,
        message: 'Tipo de comprovante inválido. Selecione "ART" ou "Projeto".',
      })
    }

    let homRecord = null
    try {
      homRecord = $app.findFirstRecordByData('homologacoes', 'id', homologacaoId)
    } catch (_) {
      return e.json(404, { success: false, message: 'Homologação não encontrada.' })
    }

    let files = []
    try {
      files = e.findUploadedFiles('arquivo')
    } catch (_) {}

    if (!files || files.length === 0) {
      return e.json(400, {
        success: false,
        message:
          'Nenhum arquivo enviado. Selecione o comprovante em PDF ou imagem (JPG, PNG, WEBP).',
      })
    }

    const uploadedFile = files[0]
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
    const autorNome = auth.getString('name') || auth.getString('email') || 'Administrador'
    const leadId = homRecord.getString('lead') || ''
    const clienteNome = homRecord.getString('cliente_nome') || 'Cliente'
    const engenheiroId = homRecord.getString('engenheiro')
    const vendedorId = homRecord.getString('vendedor')

    const tipoLabel = tipo === 'art' ? 'ART' : 'Projeto'

    // 1. Atualizar campos específicos da homologação
    if (tipo === 'art') {
      homRecord.set('comprovante_art_arquivo', uploadedFile)
      homRecord.set('comprovante_art_anexado_em', nowIso)
      homRecord.set('comprovante_art_anexado_por', auth.id)
      // Se a ART ainda não estava marcada como paga, atualiza status para paga
      homRecord.set('art_status', 'paga')
      if (!homRecord.getString('art_paga_em')) {
        homRecord.set('art_paga_em', nowIso)
      }
    } else {
      // tipo === 'projeto'
      homRecord.set('comprovante_projeto_arquivo', uploadedFile)
      homRecord.set('comprovante_projeto_anexado_em', nowIso)
      homRecord.set('comprovante_projeto_anexado_por', auth.id)
      homRecord.set('projeto_pago', true)
    }

    // 2. Registrar no histórico da homologação
    let homHist = []
    const rawHomHist = homRecord.get('historico')
    if (Array.isArray(rawHomHist)) {
      homHist = rawHomHist.slice(0)
    } else if (typeof rawHomHist === 'string') {
      try {
        const p = JSON.parse(rawHomHist)
        if (Array.isArray(p)) homHist = p
      } catch (_) {}
    }

    const descHist =
      'Comprovante de pagamento da ' +
      tipoLabel +
      ' anexado por ' +
      autorNome +
      ' em ' +
      dataFormatadaPt +
      (observacao ? ' — Obs: ' + observacao : '')

    homHist.push({
      data: nowIso,
      tipo: 'comprovante_' + tipo,
      descricao: descHist,
      autor_id: auth.id,
      autor_nome: autorNome,
      arquivo_nome: uploadedFile.originalName || '',
      comprovante_tipo: tipo,
      observacao: observacao || '',
    })

    if (homHist.length > 50) {
      homHist = homHist.slice(homHist.length - 50)
    }
    homRecord.set('historico', homHist)
    $app.save(homRecord)

    // 3. Também salvar uma cópia na coleção 'arquivos_engenharia' com categoria 'comprovante_pagamento'
    // Isso garante persistência histórica de todos os comprovantes anexados
    try {
      const arqCol = $app.findCollectionByNameOrId('arquivos_engenharia')
      const arqRec = new Record(arqCol)
      arqRec.set('homologacao', homRecord.id)
      if (leadId) arqRec.set('lead', leadId)
      arqRec.set('categoria', 'comprovante_pagamento')
      arqRec.set(
        'titulo',
        'Comprovante de Pagamento — ' +
          tipoLabel +
          (uploadedFile.originalName ? ' (' + uploadedFile.originalName + ')' : ''),
      )
      arqRec.set('arquivo', uploadedFile)
      arqRec.set('nome_original', uploadedFile.originalName || '')
      arqRec.set('tamanho_bytes', uploadedFile.size || 0)
      arqRec.set('etapa_origem', homRecord.getString('status') || '')
      arqRec.set(
        'descricao',
        'Comprovante de pagamento da ' +
          tipoLabel +
          ' anexado por ' +
          autorNome +
          (observacao ? ' — ' + observacao : ''),
      )
      arqRec.set('criado_por', auth.id)
      $app.save(arqRec)
    } catch (arqSaveErr) {
      console.warn('[anexar_comprovante] Aviso ao salvar em arquivos_engenharia:', arqSaveErr)
    }

    // 4. Atualizar histórico do Lead se existir
    if (leadId) {
      try {
        const leadRecord = $app.findFirstRecordByData('leads', 'id', leadId)
        let leadHist = []
        const rawLeadHist = leadRecord.get('historico')
        if (Array.isArray(rawLeadHist)) {
          leadHist = rawLeadHist.slice(0)
        } else if (typeof rawLeadHist === 'string') {
          try {
            const p = JSON.parse(rawLeadHist)
            if (Array.isArray(p)) leadHist = p
          } catch (_) {}
        }

        leadHist.push({
          data: nowIso,
          tipo: 'nota',
          descricao:
            'Comprovante de pagamento da ' +
            tipoLabel +
            ' anexado por ' +
            autorNome +
            ' em ' +
            dataSimples +
            (observacao ? ' (Nota: ' + observacao + ')' : ''),
          autor: auth.id,
          autor_nome: autorNome,
        })

        if (leadHist.length > 50) {
          leadHist = leadHist.slice(leadHist.length - 50)
        }
        leadRecord.set('historico', leadHist)
        $app.save(leadRecord)
      } catch (lhErr) {
        console.warn('[anexar_comprovante] Aviso ao atualizar lead:', lhErr)
      }
    }

    // 5. Notificações no sino para o Engenheiro e para o Vendedor
    const destinatariosNotif = []
    if (engenheiroId && engenheiroId !== auth.id) {
      destinatariosNotif.push(engenheiroId)
    }
    if (vendedorId && vendedorId !== auth.id && destinatariosNotif.indexOf(vendedorId) === -1) {
      destinatariosNotif.push(vendedorId)
    }

    try {
      const notifCol = $app.findCollectionByNameOrId('notificacoes')
      for (let d = 0; d < destinatariosNotif.length; d++) {
        try {
          const nRec = new Record(notifCol)
          nRec.set('usuario', destinatariosNotif[d])
          if (leadId) nRec.set('lead', leadId)
          nRec.set('titulo', 'Comprovante de ' + tipoLabel + ' anexado — ' + clienteNome)
          nRec.set(
            'mensagem',
            autorNome +
              ' anexou o comprovante de pagamento da ' +
              tipoLabel +
              ' do cliente ' +
              clienteNome +
              '.' +
              (observacao ? ' Obs: ' + observacao : ''),
          )
          nRec.set('tipo', 'homologacao_art')
          nRec.set('lida', false)
          nRec.set('lead_nome', clienteNome)
          nRec.set('lead_cidade', homRecord.getString('cliente_cidade') || '')
          nRec.set('lead_telefone', homRecord.getString('cliente_telefone') || '')
          nRec.set(
            'metadados',
            JSON.stringify({
              acao: 'comprovante_anexado',
              tipo_comprovante: tipo,
              homologacao_id: homRecord.id,
              lead_id: leadId,
              anexado_em: nowIso,
            }),
          )
          $app.save(nRec)
        } catch (nErr) {
          console.warn('[anexar_comprovante] Erro ao criar notificação:', nErr)
        }
      }
    } catch (notifAllErr) {
      console.warn('[anexar_comprovante] Erro geral ao salvar notificação:', notifAllErr)
    }

    return e.json(200, {
      success: true,
      message: 'Comprovante de pagamento da ' + tipoLabel + ' anexado com sucesso!',
      homologacao_id: homRecord.id,
      tipo: tipo,
      art_status: homRecord.getString('art_status'),
      art_paga_em: homRecord.getString('art_paga_em'),
      projeto_pago: homRecord.getBool('projeto_pago'),
      comprovante_art_arquivo: homRecord.getString('comprovante_art_arquivo'),
      comprovante_art_anexado_em: homRecord.getString('comprovante_art_anexado_em'),
      comprovante_projeto_arquivo: homRecord.getString('comprovante_projeto_arquivo'),
      comprovante_projeto_anexado_em: homRecord.getString('comprovante_projeto_anexado_em'),
    })
  },
  $apis.requireAuth(),
)
