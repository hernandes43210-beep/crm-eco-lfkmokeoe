// POST /backend/v1/propostas/public/{token}/concluir-visualizacao
// Endpoint público chamado quando o cliente atinge a última tela do Story (ou final da proposta)
// Registra conclusão no histórico do lead e cria notificação in-app (sino) para vendedor e Admins

routerAdd('POST', '/backend/v1/propostas/public/{token}/concluir-visualizacao', (e) => {
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

  try {
    const list = $app.findRecordsByFilter('propostas', "token_publico = '" + token + "'", '', 1, 0)
    if (!list || list.length === 0) {
      return e.json(404, { error: 'Proposta não encontrada' })
    }

    const proposta = list[0]
    const leadId = proposta.getString('lead')

    // Verificar se o acesso é de equipe autenticada ou modo preview
    let isInternalAccess = false
    if (e.auth && e.auth.id) {
      isInternalAccess = true
    }

    if (!isInternalAccess) {
      try {
        const reqHeaders = e.requestInfo().headers || {}
        const authHdr = reqHeaders['authorization'] || reqHeaders['Authorization'] || ''
        if (typeof authHdr === 'string' && authHdr.trim().length > 10) {
          const rawToken = authHdr.replace(/^Bearer\s+/i, '').trim()
          if (rawToken) {
            try {
              const authUser = $app.findAuthRecordByToken(rawToken)
              if (authUser && authUser.id) {
                isInternalAccess = true
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }

    if (!isInternalAccess) {
      try {
        const qParams = e.requestInfo().query || {}
        const previewVal = (qParams.preview || qParams.internal || '')
          .toString()
          .toLowerCase()
          .trim()
        if (previewVal === '1' || previewVal === 'true' || previewVal === 'yes') {
          isInternalAccess = true
        }
      } catch (_) {}
    }

    if (!isInternalAccess) {
      try {
        const reqHeaders = e.requestInfo().headers || {}
        if (reqHeaders['x-crm-internal'] === 'true' || reqHeaders['x-preview'] === 'true') {
          isInternalAccess = true
        }
      } catch (_) {}
    }

    // Se for acesso interno de equipe / preview, não notificar nem poluir histórico
    if (isInternalAccess) {
      return e.json(200, {
        success: true,
        ignored: true,
        motivo: 'Acesso interno da equipe em modo preview',
      })
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const nowFormatted = nowIso.replace('T', ' ').substring(0, 19) + 'Z'

    // Throttle no backend: 15 minutos (900.000 ms) para o mesmo token/cliente
    // Se o cliente já terminou de ver há menos de 15 minutos, atualizamos apenas a data/hora sem duplicar notificação no sino
    const ultimaConclusaoStr = proposta.getString('visualizacao_concluida_em')
    let throttleAtivo = false
    if (ultimaConclusaoStr) {
      try {
        const ultConclDate = new Date(ultimaConclusaoStr)
        const diffMs = now.getTime() - ultConclDate.getTime()
        if (diffMs < 900000 && diffMs >= 0) {
          throttleAtivo = true
        }
      } catch (_) {}
    }

    let clientIp = ''
    try {
      clientIp = e.realIP() || e.remoteIP() || ''
    } catch (_) {
      try {
        clientIp = e.requestInfo().remoteIP || ''
      } catch (_) {}
    }

    const body = e.requestInfo().body || {}
    const formato = body.formato || 'story' // 'story' ou 'classica'

    // 1. Atualizar campos na proposta
    const concluidasCount = proposta.getInt('visualizacoes_concluidas_count') || 0
    proposta.set('visualizacoes_concluidas_count', concluidasCount + 1)
    proposta.set('visualizacao_concluida_em', nowFormatted)

    let histConclusoes = []
    try {
      const rawHistConcl = proposta.get('historico_conclusoes')
      if (rawHistConcl) {
        if (typeof rawHistConcl === 'string') {
          histConclusoes = JSON.parse(rawHistConcl)
        } else if (Array.isArray(rawHistConcl)) {
          histConclusoes = rawHistConcl
        }
      }
    } catch (_) {
      histConclusoes = []
    }
    if (!Array.isArray(histConclusoes)) {
      histConclusoes = []
    }
    histConclusoes.push({
      data: nowIso,
      formato: formato,
      ip: clientIp || undefined,
    })
    if (histConclusoes.length > 50) {
      histConclusoes = histConclusoes.slice(-50)
    }
    proposta.set('historico_conclusoes', JSON.stringify(histConclusoes))
    $app.save(proposta)

    // Se throttle estiver ativo, encerramos aqui para não duplicar avisos e histórico
    if (throttleAtivo) {
      return e.json(200, {
        success: true,
        throttled: true,
        mensagem: 'Visualização concluída atualizada recentemente (throttle ativo).',
      })
    }

    // 2. Buscar dados do Lead
    let lead = null
    let leadNome = 'Cliente'
    let leadCidade = ''
    let leadBairro = ''
    let leadTelefone = ''
    let proprietarioId = ''

    if (leadId) {
      try {
        lead = $app.findFirstRecordByData('leads', 'id', leadId)
        leadNome = lead.getString('nome') || 'Cliente'
        leadCidade = lead.getString('cidade') || ''
        leadBairro = lead.getString('bairro') || ''
        leadTelefone = lead.getString('telefone') || ''
        proprietarioId = lead.getString('proprietario') || ''

        // Garantir que no histórico do Lead haja registro de abertura se ainda não existir
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

        const kitNome = proposta.getString('kit_nome') || 'Sistema Solar'
        const precoVenda = proposta.getFloat('preco_venda') || 0
        const precoFmt =
          precoVenda > 0
            ? 'R$ ' +
              precoVenda.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : ''

        const jaTinhaAbertura = hist.some(
          (item) => item && item.descricao && item.descricao.indexOf('pela 1ª vez') !== -1,
        )
        if (!jaTinhaAbertura) {
          hist.push({
            data: nowIso,
            tipo: 'proposta',
            descricao:
              'Cliente visualizou a proposta comercial (' + kitNome + ') através do link público.',
          })
        }

        // Registrar a conclusão de visualização
        const formatoRotulo = formato === 'story' ? 'formato Story' : 'formato Clássico'
        hist.push({
          data: nowIso,
          tipo: 'proposta',
          descricao:
            'Cliente concluiu a visualização da proposta comercial (' +
            kitNome +
            (precoFmt ? ' • ' + precoFmt : '') +
            ' no ' +
            formatoRotulo +
            '). Chegou à última tela (valor e assinatura digital) — momento ideal para contato!',
        })

        lead.set('historico', JSON.stringify(hist))
        $app.save(lead)
      } catch (leadErr) {
        console.error('[concluir-visualizacao] Erro ao atualizar lead:', leadErr)
      }
    }

    // 3. Criar Notificação in-app (sino) para Vendedor (proprietário) e Admins/CEO
    try {
      const notifCol = $app.findCollectionByNameOrId('notificacoes')

      // Identificar usuários destinatários
      const userIdsParaNotificar = []

      // Vendedor proprietário do lead
      if (proprietarioId) {
        userIdsParaNotificar.push(proprietarioId)
      }

      // Criador da proposta (se diferente do proprietário)
      const criadorId = proposta.getString('criado_por')
      if (criadorId && userIdsParaNotificar.indexOf(criadorId) === -1) {
        userIdsParaNotificar.push(criadorId)
      }

      // Admins ativos
      try {
        const admins = $app.findRecordsByFilter(
          '_pb_users_auth_',
          "role = 'Admin' && (ativo = true || ativo = null)",
          'name',
          50,
          0,
        )
        if (admins && admins.length > 0) {
          for (let i = 0; i < admins.length; i++) {
            const admId = admins[i].id
            if (userIdsParaNotificar.indexOf(admId) === -1) {
              userIdsParaNotificar.push(admId)
            }
          }
        }
      } catch (admErr) {
        console.warn('[concluir-visualizacao] Erro ao buscar admins:', admErr)
      }

      const kitNome = proposta.getString('kit_nome') || 'Sistema Solar'
      const precoVenda = proposta.getFloat('preco_venda') || 0
      const precoFmt =
        precoVenda > 0
          ? 'R$ ' +
            precoVenda.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : ''

      const tituloNotif = 'Proposta vista: ' + leadNome + ' chegou ao fim!'
      const msgNotif =
        'O cliente ' +
        leadNome +
        ' terminou de ver a proposta ' +
        kitNome +
        (precoFmt ? ' (' + precoFmt + ')' : '') +
        ' — bom momento para fazer o follow-up!'

      for (let u = 0; u < userIdsParaNotificar.length; u++) {
        const targetUserId = userIdsParaNotificar[u]
        try {
          const notifRec = new Record(notifCol)
          notifRec.set('usuario', targetUserId)
          if (leadId) {
            notifRec.set('lead', leadId)
          }
          notifRec.set('titulo', tituloNotif)
          notifRec.set('mensagem', msgNotif)
          notifRec.set('tipo', 'proposta_concluida')
          notifRec.set('lida', false)
          notifRec.set('lead_nome', leadNome)
          if (leadCidade) notifRec.set('lead_cidade', leadCidade)
          if (leadBairro) notifRec.set('lead_bairro', leadBairro)
          if (leadTelefone) notifRec.set('lead_telefone', leadTelefone)
          notifRec.set(
            'metadados',
            JSON.stringify({
              proposta_id: proposta.id,
              token_publico: token,
              kit_nome: kitNome,
              preco_venda: precoVenda,
              formato: formato,
              timestamp: nowIso,
            }),
          )
          $app.save(notifRec)
        } catch (saveErr) {
          console.error(
            '[concluir-visualizacao] Erro ao criar notificação para user ' + targetUserId + ':',
            saveErr,
          )
        }
      }
    } catch (notifErr) {
      console.error('[concluir-visualizacao] Erro geral ao processar notificações:', notifErr)
    }

    return e.json(200, {
      success: true,
      message: 'Visualização concluída registrada com sucesso!',
      data: nowFormatted,
    })
  } catch (err) {
    return e.json(500, { error: 'Erro ao registrar conclusão de visualização: ' + err.message })
  }
})
