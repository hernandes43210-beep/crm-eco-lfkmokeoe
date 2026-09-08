// POST /backend/v1/propostas/public/{token}/aceitar
// Endpoint público seguro para o cliente final aceitar a proposta.
// Valida o token, atualiza o status da proposta para "Aceita",
// atualiza o Lead para "Fechado Ganho" (com histórico e data de encerramento)

routerAdd('POST', '/backend/v1/propostas/public/{token}/aceitar', (e) => {
  const token = (e.requestInfo().pathParams.token || '').trim()

  if (!token) {
    return e.json(400, { error: 'Token não fornecido' })
  }

  const body = e.requestInfo().body || {}
  const nomeCliente = (body.nome || '').trim()

  try {
    const list = $app.findRecordsByFilter('propostas', "token_publico = '" + token + "'", '', 1, 0)

    if (!list || list.length === 0) {
      return e.json(404, { error: 'Proposta não encontrada' })
    }

    const proposta = list[0]
    const currentStatus = proposta.getString('status')

    if (currentStatus === 'Aceita') {
      return e.json(200, {
        success: true,
        message: 'Esta proposta já foi aceita anteriormente.',
        status: 'Aceita',
        data_aceite: proposta.getString('data_aceite'),
      })
    }

    // Verificar se já expirou
    const dataValidadeStr = proposta.getString('data_validade')
    if (dataValidadeStr) {
      const validadeDate = new Date(dataValidadeStr)
      const hoje = new Date()
      // Se validadeDate for anterior ao início do dia atual
      hoje.setHours(0, 0, 0, 0)
      if (validadeDate < hoje) {
        return e.json(400, {
          error:
            'Esta proposta expirou a validade e não pode mais ser aceita diretamente. Entre em contato com seu consultor solar.',
        })
      }
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const nowFormatted = nowIso.replace('T', ' ').substring(0, 19) + 'Z'
    const todayDateOnly = nowIso.substring(0, 10)

    const precoVenda = proposta.getFloat('preco_venda')
    const kitNome = proposta.getString('kit_nome')

    // Atualizar proposta
    proposta.set('status', 'Aceita')
    proposta.set('data_aceite', nowFormatted)
    if (nomeCliente) {
      proposta.set('aceito_por_nome', nomeCliente)
    }
    const clientIp = e.requestInfo().remoteIP || ''
    if (clientIp) {
      proposta.set('aceito_por_ip', clientIp)
    }

    $app.save(proposta)

    // Atualizar Lead vinculado
    const leadId = proposta.getString('lead')
    let leadNome = ''
    if (leadId) {
      try {
        const lead = $app.findFirstRecordByData('leads', 'id', leadId)
        leadNome = lead.getString('nome')
        const clientNameFinal = nomeCliente || leadNome || 'Cliente'

        lead.set('status', 'Fechado Ganho')
        lead.set('pr_assinada_ganho', true)
        lead.set('pr_post_encerramento', todayDateOnly)
        if (precoVenda > 0) {
          lead.set('preco_venda', precoVenda)
        }

        let hist = lead.get('historico')
        if (!hist || !Array.isArray(hist)) hist = []
        hist.push({
          data: nowIso,
          tipo: 'fechamento',
          descricao:
            'Proposta comercial (' +
            kitNome +
            ') ACEITA pelo cliente ' +
            clientNameFinal +
            ' via link público! Oportunidade convertida em Fechado Ganho. Valor: R$ ' +
            precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        })
        lead.set('historico', hist)

        $app.save(lead)
      } catch (errLead) {
        console.error('Erro ao atualizar lead após aceite de proposta:', errLead)
      }
    }

    return e.json(200, {
      success: true,
      message: 'Proposta aceita com sucesso!',
      status: 'Aceita',
      data_aceite: nowFormatted,
      lead_nome: leadNome,
    })
  } catch (err) {
    return e.json(500, { error: 'Erro ao processar aceite da proposta: ' + err.message })
  }
})
