// POST /backend/v1/propostas/public/{token}/aceitar
// Endpoint público seguro para o cliente final aceitar a proposta.
// Valida o token, atualiza o status da proposta para "Aceita",
// atualiza o Lead para "Fechado Ganho" (com histórico e data de encerramento)

routerAdd('POST', '/backend/v1/propostas/public/{token}/aceitar', (e) => {
  let token = ''
  try {
    token = (e.request.pathValue('token') || '').trim()
  } catch (_) {}
  if (!token) {
    try {
      token = (e.requestInfo().pathParams?.token || '').trim()
    } catch (_) {}
  }

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
    let clientIp = ''
    try {
      clientIp = e.realIP() || e.remoteIP() || ''
    } catch (_) {
      try {
        clientIp = e.requestInfo().remoteIP || ''
      } catch (_) {}
    }
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

        let rawHist = lead.get('historico')
        let hist = []
        if (rawHist) {
          if (typeof rawHist === 'string') {
            try {
              hist = JSON.parse(rawHist)
            } catch (_) {
              hist = []
            }
          } else if (Array.isArray(rawHist)) {
            hist = rawHist
          }
        }
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
        lead.set('historico', JSON.stringify(hist))

        $app.save(lead)

        // Enviar notificação WhatsApp ao cliente confirmando aceite da proposta (best-effort)
        const clienteTelefoneRaw = lead.getString('telefone') || ''
        if (clienteTelefoneRaw) {
          let clienteTelefoneNorm = clienteTelefoneRaw.replace(/\D/g, '')
          if (
            clienteTelefoneNorm.startsWith('0') &&
            (clienteTelefoneNorm.length === 11 || clienteTelefoneNorm.length === 12)
          ) {
            clienteTelefoneNorm = clienteTelefoneNorm.slice(1)
          }
          if (
            !clienteTelefoneNorm.startsWith('55') &&
            (clienteTelefoneNorm.length === 10 || clienteTelefoneNorm.length === 11)
          ) {
            clienteTelefoneNorm = '55' + clienteTelefoneNorm
          }

          if (clienteTelefoneNorm) {
            let evoUrl = ''
            let evoKey = ''
            let evoInst = 'ecosolar'
            try {
              evoUrl = ($os.getenv('EVOLUTION_API_URL') || '').trim()
              evoKey = ($os.getenv('EVOLUTION_API_KEY') || '').trim()
              evoInst = ($os.getenv('EVOLUTION_INSTANCE_NAME') || 'ecosolar').trim()
            } catch (_) {}

            if (!evoUrl || !evoKey || evoKey === 'placeholder_api_key') {
              try {
                const waList = $app.findRecordsByFilter('whatsapp_settings', '', '-created', 1, 0)
                if (waList && waList.length > 0) {
                  if (!evoUrl) evoUrl = (waList[0].getString('api_url') || '').trim()
                  if (!evoKey || evoKey === 'placeholder_api_key')
                    evoKey = (waList[0].getString('api_key') || '').trim()
                  if (!evoInst || evoInst === 'ecosolar')
                    evoInst = (waList[0].getString('instance_name') || 'ecosolar').trim()
                }
              } catch (_) {}
            }

            if (evoUrl && evoKey && evoKey !== 'placeholder_api_key') {
              if (evoUrl.endsWith('/')) evoUrl = evoUrl.slice(0, -1)
              const msgCliente =
                '☀️ *Ecosolar Energy — Proposta Comercial Aceita com Sucesso!*\n\n' +
                'Olá, ' +
                clientNameFinal +
                '!\n' +
                'Recebemos com muita alegria a confirmação do aceite da sua proposta comercial de energia solar (' +
                kitNome +
                ')!\n\n' +
                'Parabéns pela decisão de gerar sua própria energia limpa e economizar. Nosso consultor entrará em contato para os próximos passos.\n\n' +
                'Seja muito bem-vindo(a) à Ecosolar Energy! 🌱✨'

              try {
                $http.send({
                  url: evoUrl + '/message/sendText/' + encodeURIComponent(evoInst),
                  method: 'POST',
                  headers: {
                    apikey: evoKey,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    number: clienteTelefoneNorm,
                    text: msgCliente,
                  }),
                  timeout: 10,
                })
              } catch (_) {}
            }
          }
        }
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
