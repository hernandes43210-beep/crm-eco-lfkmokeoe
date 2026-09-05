// POST /backend/v1/integrations/luvik/webhook/{token}
// Endpoint público para receber webhooks do Luvik (negócio criado, ganho, perdido)
// Token na URL valida se a requisição é legítima.
// Query param ?evento=criado|ganho|perdido pode ser passado opcionalmente na URL
// para diferenciar a URL de cada campo do Luvik caso o payload não traga o status explícito.

routerAdd('POST', '/backend/v1/integrations/luvik/webhook/{token}', (e) => {
  const token = e.requestInfo().pathParams.token || ''

  // 1. Validação do Token
  if (!token) {
    return e.json(401, { error: 'Token não fornecido' })
  }

  let valid = false
  try {
    const list = $app.findRecordsByFilter(
      'luvik_settings',
      "webhook_token = '" + token + "' && ativo = true",
      '',
      1,
      0,
    )
    if (list && list.length > 0) {
      valid = true
    }
  } catch (_) {}

  if (!valid) {
    return e.json(401, { error: 'Token inválido ou integração inativa' })
  }

  // 2. Extração tolerante de dados do payload
  const body = e.requestInfo().body || {}
  const queryParams = e.requestInfo().query || {}
  const urlEventHint = (queryParams.evento || '').toLowerCase()

  // Buscar objeto principal (direto ou aninhado em data, deal, negocio, business)
  const root = body.data || body.deal || body.negocio || body.business || body

  // ID do negócio no Luvik
  let dealId = ''
  if (root.id !== undefined && root.id !== null) {
    dealId = String(root.id).trim()
  } else if (body.id !== undefined && body.id !== null) {
    dealId = String(body.id).trim()
  } else if (root.deal_id || root.dealId || root.negocio_id) {
    dealId = String(root.deal_id || root.dealId || root.negocio_id).trim()
  }

  // Identificação do Evento
  // Luvik envia status: "OPEN" (criado), "GAIN" (ganho), "LOSS" (perdido)
  // Ou tipo de evento no body: event, tipo, action
  let rawStatus = (root.status || body.event || body.type || body.action || '').toUpperCase()

  let eventoTipo = 'desconhecido'
  if (
    rawStatus === 'GAIN' ||
    rawStatus === 'GANHO' ||
    rawStatus === 'WON' ||
    urlEventHint === 'ganho'
  ) {
    eventoTipo = 'negocio_ganho'
  } else if (
    rawStatus === 'LOSS' ||
    rawStatus === 'PERDIDO' ||
    rawStatus === 'LOST' ||
    urlEventHint === 'perdido'
  ) {
    eventoTipo = 'negocio_perdido'
  } else if (
    rawStatus === 'OPEN' ||
    rawStatus === 'CRIADO' ||
    rawStatus === 'CREATED' ||
    urlEventHint === 'criado' ||
    (!rawStatus && urlEventHint === 'criado')
  ) {
    eventoTipo = 'negocio_criado'
  } else if (urlEventHint) {
    if (urlEventHint.indexOf('ganh') !== -1) eventoTipo = 'negocio_ganho'
    else if (urlEventHint.indexOf('perd') !== -1) eventoTipo = 'negocio_perdido'
    else if (urlEventHint.indexOf('cria') !== -1) eventoTipo = 'negocio_criado'
  }

  // Se ainda desconhecido, inferir por campos específicos
  if (eventoTipo === 'desconhecido') {
    if (root.soldAt || root.soldPrice) {
      eventoTipo = 'negocio_ganho'
    } else if (root.lossAt || root.lossReason) {
      eventoTipo = 'negocio_perdido'
    } else if (root.createdAt && !root.lossAt && !root.soldAt) {
      eventoTipo = 'negocio_criado'
    } else {
      eventoTipo = 'negocio_criado' // fallback default amigável
    }
  }

  // Extração de dados de contato
  const contact = root.contact || root.contato || body.contact || body.contato || {}

  let nome =
    contact.name ||
    contact.nome ||
    root.contactName ||
    root.nome ||
    root.title ||
    root.description ||
    'Lead Luvik'
  if (typeof nome === 'string') nome = nome.trim()
  if (!nome) nome = 'Lead Luvik' + (dealId ? ' #' + dealId.slice(-4) : '')

  let email = contact.email || root.email || ''
  if (typeof email === 'string') email = email.trim().toLowerCase()

  let rawPhone =
    contact.phone || contact.telefone || contact.whatsapp || root.phone || root.telefone || ''
  if (typeof rawPhone !== 'string') rawPhone = String(rawPhone || '')
  let cleanPhone = rawPhone.replace(/\D/g, '')

  // Endereço
  const address = root.address || root.endereco || {}
  let cidade = address.city || address.cidade || root.cidade || ''
  let estado = address.state || address.estado || address.uf || root.estado || ''
  if (estado && estado.length > 2) estado = estado.substring(0, 2).toUpperCase()
  let enderecoCompleto = [address.street, address.number, address.neighborhood]
    .filter(Boolean)
    .join(', ')

  // Valor da venda / projeto
  let precoVenda = 0
  if (root.soldPrice !== undefined && root.soldPrice !== null) {
    precoVenda = Number(root.soldPrice) || 0
  } else if (root.price || root.valor || root.amount) {
    precoVenda = Number(root.price || root.valor || root.amount) || 0
  }

  // Preencher email sintético se não houver (para respeitar campo obrigatório e único)
  if (!email) {
    if (cleanPhone) {
      email = 'luvik.' + cleanPhone + '@leadsolar.crm'
    } else if (dealId) {
      email = 'luvik.deal.' + dealId.toLowerCase().replace(/[^a-z0-9]/g, '') + '@leadsolar.crm'
    } else {
      email = 'luvik.' + Math.floor(Math.random() * 1000000) + '@leadsolar.crm'
    }
  }

  // 3. Localizar Lead Existente
  // Prioridade:
  // 1) Por luvik_deal_id se disponível
  // 2) Por email
  // 3) Por telefone (últimos 8 dígitos)
  let leadRecord = null
  if (dealId) {
    try {
      const found = $app.findRecordsByFilter(
        'leads',
        "luvik_deal_id = '" + dealId + "'",
        '-created',
        1,
        0,
      )
      if (found && found.length > 0) {
        leadRecord = found[0]
      }
    } catch (_) {}
  }

  if (!leadRecord && email) {
    try {
      leadRecord = $app.findFirstRecordByData('leads', 'email', email)
    } catch (_) {}
  }

  if (!leadRecord && cleanPhone) {
    const searchPart = cleanPhone.length >= 8 ? cleanPhone.slice(-8) : cleanPhone
    try {
      const found = $app.findRecordsByFilter(
        'leads',
        "telefone ~ '" + searchPart + "'",
        '-created',
        1,
        0,
      )
      if (found && found.length > 0) {
        leadRecord = found[0]
      }
    } catch (_) {}
  }

  let processStatus = 'sucesso'
  let logMensagem = ''
  let affectedLeadId = ''
  let affectedLeadNome = nome

  try {
    const leadsCol = $app.findCollectionByNameOrId('leads')

    if (eventoTipo === 'negocio_criado') {
      if (leadRecord) {
        // Atualizar lead existente mantendo consistência
        if (dealId && !leadRecord.getString('luvik_deal_id')) {
          leadRecord.set('luvik_deal_id', dealId)
        }
        if (cidade && !leadRecord.getString('cidade')) leadRecord.set('cidade', cidade)
        if (estado && !leadRecord.getString('estado')) leadRecord.set('estado', estado)
        if (precoVenda > 0 && !leadRecord.getInt('preco_venda'))
          leadRecord.set('preco_venda', precoVenda)

        let hist = leadRecord.get('historico')
        if (!hist || !Array.isArray(hist)) hist = []
        hist.push({
          data: new Date().toISOString(),
          tipo: 'nota',
          descricao:
            'Evento do Luvik recebido: Negócio criado no Luvik (Deal ID: ' +
            (dealId || 'N/A') +
            '). Lead já existia e foi conciliado.',
        })
        leadRecord.set('historico', hist)
        $app.save(leadRecord)

        affectedLeadId = leadRecord.id
        affectedLeadNome = leadRecord.getString('nome')
        logMensagem = 'Lead existente atualizado e conciliado com ID Luvik ' + (dealId || '')
      } else {
        // Criar NOVO lead
        // Obter proprietário padrão: primeiro usuário cadastrado
        let ownerId = ''
        try {
          const users = $app.findRecordsByFilter('_pb_users_auth_', '', '+created', 1, 0)
          if (users && users.length > 0) {
            ownerId = users[0].id
          }
        } catch (_) {}

        // Verificar unicidade de email defensivamente
        let finalEmail = email
        try {
          const emExists = $app.findFirstRecordByData('leads', 'email', finalEmail)
          if (emExists) {
            finalEmail = 'luvik.' + Math.floor(Math.random() * 1000000) + '.' + email
          }
        } catch (_) {}

        const newLead = new Record(leadsCol)
        newLead.set('nome', nome)
        newLead.set('email', finalEmail)
        if (cleanPhone) newLead.set('telefone', cleanPhone)
        newLead.set('origem', 'Outros') // Origem Luvik
        newLead.set('consumo_mensal_kwh', 400) // Padrão inicial solar
        if (cidade) newLead.set('cidade', cidade)
        if (estado) newLead.set('estado', estado)
        if (enderecoCompleto) newLead.set('endereco', enderecoCompleto)
        if (precoVenda > 0) newLead.set('preco_venda', precoVenda)
        if (dealId) newLead.set('luvik_deal_id', dealId)
        if (ownerId) newLead.set('proprietario', ownerId)
        newLead.set('status', 'Novo')
        newLead.set('sla_dias', 7)

        const hist = [
          {
            data: new Date().toISOString(),
            tipo: 'criacao',
            descricao:
              'Lead criado automaticamente via integração Webhook Luvik (Negócio Criado). Deal ID: ' +
              (dealId || 'N/A') +
              '.',
          },
        ]
        newLead.set('historico', hist)

        // $app.save irá disparar o onRecordCreate de leads_sla.js que calcula sla_limite
        $app.save(newLead)
        leadRecord = newLead
        affectedLeadId = newLead.id
        affectedLeadNome = nome
        logMensagem = 'Novo lead criado no estágio "Novo" com SLA ativo.'
      }
    } else if (eventoTipo === 'negocio_ganho') {
      if (leadRecord) {
        leadRecord.set('status', 'Fechado Ganho')
        if (precoVenda > 0) leadRecord.set('preco_venda', precoVenda)
        if (dealId && !leadRecord.getString('luvik_deal_id')) {
          leadRecord.set('luvik_deal_id', dealId)
        }
        leadRecord.set('pr_assinada_ganho', true)
        leadRecord.set('pr_post_encerramento', new Date().toISOString().substring(0, 10))

        let hist = leadRecord.get('historico')
        if (!hist || !Array.isArray(hist)) hist = []
        hist.push({
          data: new Date().toISOString(),
          tipo: 'fechamento',
          descricao:
            'Negócio marcado como GANHO no Luvik. Funil atualizado para "Fechado Ganho".' +
            (precoVenda ? ' Valor: R$ ' + precoVenda : ''),
        })
        leadRecord.set('historico', hist)
        $app.save(leadRecord)

        affectedLeadId = leadRecord.id
        affectedLeadNome = leadRecord.getString('nome')
        logMensagem = 'Lead movido para estágio "Fechado Ganho".'
      } else {
        // Se o lead ainda não existia, criá-lo já como Fechado Ganho para não perder a venda
        let ownerId = ''
        try {
          const users = $app.findRecordsByFilter('_pb_users_auth_', '', '+created', 1, 0)
          if (users && users.length > 0) {
            ownerId = users[0].id
          }
        } catch (_) {}

        const newLead = new Record(leadsCol)
        newLead.set('nome', nome)
        newLead.set('email', email)
        if (cleanPhone) newLead.set('telefone', cleanPhone)
        newLead.set('origem', 'Outros')
        newLead.set('consumo_mensal_kwh', 500)
        if (cidade) newLead.set('cidade', cidade)
        if (estado) newLead.set('estado', estado)
        if (precoVenda > 0) newLead.set('preco_venda', precoVenda)
        if (dealId) newLead.set('luvik_deal_id', dealId)
        if (ownerId) newLead.set('proprietario', ownerId)
        newLead.set('status', 'Fechado Ganho')
        newLead.set('pr_assinada_ganho', true)
        newLead.set('pr_post_encerramento', new Date().toISOString().substring(0, 10))
        newLead.set('sla_dias', 7)

        const hist = [
          {
            data: new Date().toISOString(),
            tipo: 'criacao',
            descricao: 'Lead cadastrado via Webhook Luvik com status direto de "Fechado Ganho".',
          },
        ]
        newLead.set('historico', hist)
        $app.save(newLead)

        affectedLeadId = newLead.id
        affectedLeadNome = nome
        logMensagem = 'Lead criado diretamente no estágio "Fechado Ganho" (origem Luvik).'
      }
    } else if (eventoTipo === 'negocio_perdido') {
      if (leadRecord) {
        leadRecord.set('status', 'Fechado Perdido')
        if (dealId && !leadRecord.getString('luvik_deal_id')) {
          leadRecord.set('luvik_deal_id', dealId)
        }
        leadRecord.set('pr_post_encerramento', new Date().toISOString().substring(0, 10))

        const lossReason =
          root.lossReason || root.lossDetails || body.lossReason || body.lossDetails || ''

        let hist = leadRecord.get('historico')
        if (!hist || !Array.isArray(hist)) hist = []
        hist.push({
          data: new Date().toISOString(),
          tipo: 'perda',
          descricao:
            'Negócio marcado como PERDIDO no Luvik. Funil atualizado para "Fechado Perdido".' +
            (lossReason ? ' Motivo: ' + lossReason : ''),
        })
        leadRecord.set('historico', hist)
        $app.save(leadRecord)

        affectedLeadId = leadRecord.id
        affectedLeadNome = leadRecord.getString('nome')
        logMensagem = 'Lead movido para estágio "Fechado Perdido".'
      } else {
        processStatus = 'ignorado'
        logMensagem =
          'Negócio perdido no Luvik recebido, mas nenhum lead correspondente foi encontrado para atualizar.'
      }
    } else {
      processStatus = 'ignorado'
      logMensagem = 'Evento não identificado ou sem ação configurada.'
    }
  } catch (err) {
    processStatus = 'erro'
    logMensagem = 'Erro ao processar lead: ' + err.message
  }

  // 4. Gravar log em luvik_logs para auditoria e tela do CRM
  try {
    const logsCol = $app.findCollectionByNameOrId('luvik_logs')
    const logRec = new Record(logsCol)
    logRec.set('evento', eventoTipo)
    logRec.set('status_processamento', processStatus)
    logRec.set('lead_id', affectedLeadId)
    logRec.set('lead_nome', affectedLeadNome)
    logRec.set('deal_id', dealId)
    logRec.set('mensagem', logMensagem)
    logRec.set('payload_bruto', body)
    $app.save(logRec)
  } catch (_) {}

  // 5. Sempre responder 200 rápido ao Luvik
  return e.json(200, {
    success: processStatus !== 'erro',
    evento: eventoTipo,
    status: processStatus,
    mensagem: logMensagem,
    lead_id: affectedLeadId || null,
  })
})
