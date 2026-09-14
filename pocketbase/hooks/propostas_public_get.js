// GET /backend/v1/propostas/public/{token}
// Endpoint público para consulta de proposta por token único sem exigir autenticação
// Registra automaticamente data e hora de acesso, contagem e atualiza o histórico do lead no primeiro acesso.

routerAdd('GET', '/backend/v1/propostas/public/{token}', (e) => {
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

    // Verificar se o acesso é de um membro da equipe autenticado ou se é modo preview
    let isInternalAccess = false

    // 1. Verificar se há sessão de usuário autenticada no request (e.auth)
    if (e.auth && e.auth.id) {
      isInternalAccess = true
    }

    // 2. Verificar se o header Authorization contém token de usuário PocketBase
    if (!isInternalAccess) {
      try {
        const reqHeaders = e.requestInfo().headers || {}
        const authHdr = reqHeaders['authorization'] || reqHeaders['Authorization'] || ''
        if (typeof authHdr === 'string' && authHdr.trim().length > 10) {
          const rawToken = authHdr.replace(/^Bearer\s+/i, '').trim()
          if (rawToken) {
            try {
              // PocketBase v0.36 findAuthRecordByToken
              const authUser = $app.findAuthRecordByToken(rawToken)
              if (authUser && authUser.id) {
                isInternalAccess = true
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }

    // 3. Verificar parâmetro de query (?preview=true ou ?preview=1 ou ?internal=1)
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

    // 4. Verificar header customizado de preview/equipe ('x-crm-internal' ou 'x-preview')
    if (!isInternalAccess) {
      try {
        const reqHeaders = e.requestInfo().headers || {}
        if (reqHeaders['x-crm-internal'] === 'true' || reqHeaders['x-preview'] === 'true') {
          isInternalAccess = true
        }
      } catch (_) {}
    }

    // Rastrear visualização apenas para clientes reais (não autenticados e não preview) com deduplicação de 60s
    const now = new Date()
    const nowIso = now.toISOString()
    const nowFormatted = nowIso.replace('T', ' ').substring(0, 19) + 'Z'

    let deveRegistrar = !isInternalAccess
    if (deveRegistrar) {
      const ultimaVisStr = proposta.getString('ultima_visualizacao')
      if (ultimaVisStr) {
        try {
          const ultDate = new Date(ultimaVisStr)
          const diffMs = now.getTime() - ultDate.getTime()
          // Deduplicar se acessado há menos de 60 segundos (ex: reload rápido da página pelo cliente)
          if (diffMs < 60000 && diffMs >= 0) {
            deveRegistrar = false
          }
        } catch (_) {}
      }
    }

    if (deveRegistrar) {
      try {
        let clientIp = ''
        try {
          clientIp = e.realIP() || e.remoteIP() || ''
        } catch (_) {
          try {
            clientIp = e.requestInfo().remoteIP || ''
          } catch (_) {}
        }

        let userAgent = ''
        try {
          userAgent = e.requestInfo().headers['user-agent'] || ''
          if (userAgent.length > 200) {
            userAgent = userAgent.substring(0, 200)
          }
        } catch (_) {}

        const currentCount = proposta.getInt('visualizacoes_count') || 0
        const isPrimeiraVez = currentCount === 0 || !proposta.getString('primeira_visualizacao')

        proposta.set('visualizacoes_count', currentCount + 1)
        proposta.set('ultima_visualizacao', nowFormatted)
        if (isPrimeiraVez) {
          proposta.set('primeira_visualizacao', nowFormatted)
        }
        if (clientIp) {
          proposta.set('ultimo_ip_visualizacao', clientIp)
        }
        if (userAgent) {
          proposta.set('ultimo_user_agent', userAgent)
        }

        // Histórico de acessos na própria proposta (limite dos últimos 20 acessos)
        let histAcessos = []
        try {
          const rawAcessos = proposta.get('historico_acessos')
          if (rawAcessos) {
            if (typeof rawAcessos === 'string') {
              histAcessos = JSON.parse(rawAcessos)
            } else if (Array.isArray(rawAcessos)) {
              histAcessos = rawAcessos
            }
          }
        } catch (_) {
          histAcessos = []
        }
        if (!Array.isArray(histAcessos)) {
          histAcessos = []
        }
        histAcessos.push({
          data: nowIso,
          ip: clientIp || undefined,
          origem: 'link_publico',
        })
        if (histAcessos.length > 20) {
          histAcessos = histAcessos.slice(-20)
        }
        proposta.set('historico_acessos', JSON.stringify(histAcessos))

        $app.save(proposta)

        // Se for o primeiro acesso da proposta (ou a cada 5 acessos relevantes), registrar no histórico do Lead
        if (leadId && isPrimeiraVez) {
          try {
            const lead = $app.findFirstRecordByData('leads', 'id', leadId)
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
            hist.push({
              data: nowIso,
              tipo: 'proposta',
              descricao:
                'Cliente visualizou a proposta comercial (' +
                kitNome +
                ') pela 1ª vez através do link público.',
            })
            lead.set('historico', JSON.stringify(hist))
            $app.save(lead)
          } catch (errLead) {
            console.error('Erro ao atualizar histórico do lead no primeiro acesso:', errLead)
          }
        }
      } catch (errTracking) {
        console.error('Erro ao registrar rastreamento de proposta:', errTracking)
      }
    }

    let leadData = null
    let kitData = null
    let vendedorData = null

    if (leadId) {
      try {
        const lead = $app.findFirstRecordByData('leads', 'id', leadId)
        leadData = {
          id: lead.id,
          nome: lead.getString('nome'),
          email: lead.getString('email'),
          telefone: lead.getString('telefone'),
          cidade: lead.getString('cidade'),
          estado: lead.getString('estado'),
          endereco: lead.getString('endereco'),
          consumo_mensal_kwh: lead.getInt('consumo_mensal_kwh'),
          status: lead.getString('status'),
        }

        const propId = lead.getString('proprietario')
        if (propId) {
          try {
            const user = $app.findFirstRecordByData('_pb_users_auth_', 'id', propId)
            vendedorData = {
              name: user.getString('name'),
              email: user.getString('email'),
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    const kitId = proposta.getString('kit')
    if (kitId) {
      try {
        const kit = $app.findFirstRecordByData('kits', 'id', kitId)
        kitData = {
          id: kit.id,
          nome: kit.getString('nome'),
          fabricante: kit.getString('fabricante'),
          potencia_kw: kit.getFloat('potencia_kw'),
          categoria: kit.getString('categoria'),
          descricao: kit.getString('descricao'),
          string_box: kit.getString('string_box') || '',
        }
      } catch (_) {}
    }

    // Buscar fotos de obras já instaladas para prova social no modelo da proposta
    let fotosObra = []
    try {
      let photosList = []
      if (leadId) {
        photosList = $app.findRecordsByFilter(
          'lead_photos',
          "lead = '" + leadId + "'",
          'ordem,created',
          4,
          0,
        )
      }
      if (!photosList || photosList.length === 0) {
        photosList = $app.findRecordsByFilter('lead_photos', "foto != ''", '-created', 4, 0)
      }

      if (photosList && photosList.length > 0) {
        for (let i = 0; i < photosList.length; i++) {
          const p = photosList[i]
          const fileName = p.getString('foto')
          if (fileName) {
            fotosObra.push({
              id: p.id,
              collectionId: p.collection().id,
              collectionName: p.collection().name,
              foto: fileName,
              legenda: p.getString('legenda'),
              url: '/api/files/' + p.collection().id + '/' + p.id + '/' + fileName,
            })
          }
        }
      }
    } catch (_) {}

    // Verificar se a proposta está expirada de acordo com o prazo de validade
    const dataValidadeStr = proposta.getString('data_validade')
    let isExpirada = false
    if (dataValidadeStr && proposta.getString('status') !== 'Aceita') {
      try {
        const valDate = new Date(dataValidadeStr)
        const hojeZero = new Date()
        hojeZero.setHours(0, 0, 0, 0)
        // Se a data de validade terminou antes de hoje
        if (valDate < hojeZero) {
          isExpirada = true
        }
      } catch (_) {}
    }

    const resp = {
      id: proposta.id,
      token_publico: proposta.getString('token_publico'),
      status: proposta.getString('status'),
      kit_nome: proposta.getString('kit_nome'),
      kit_potencia_kw: proposta.getFloat('kit_potencia_kw'),
      kit_fabricante: proposta.getString('kit_fabricante'),
      custo: proposta.getFloat('custo'),
      margem: proposta.getFloat('margem'),
      preco_venda: proposta.getFloat('preco_venda'),
      validade_dias: proposta.getInt('validade_dias'),
      data_validade: proposta.getString('data_validade'),
      condicoes_pagamento: proposta.getString('condicoes_pagamento'),
      observacoes: proposta.getString('observacoes'),
      data_aceite: proposta.getString('data_aceite'),
      aceito_por_nome: proposta.getString('aceito_por_nome'),
      visualizacoes_count: proposta.getInt('visualizacoes_count') || 0,
      primeira_visualizacao: proposta.getString('primeira_visualizacao'),
      ultima_visualizacao: proposta.getString('ultima_visualizacao'),
      created: proposta.getString('created'),
      kit_marca_painel: proposta.getString('kit_marca_painel') || undefined,
      kit_marca_inversor: proposta.getString('kit_marca_inversor') || undefined,
      kit_tipo_estrutura: proposta.getString('kit_tipo_estrutura') || undefined,
      kit_potencia_painel_w: proposta.getFloat('kit_potencia_painel_w') || undefined,
      kit_potencia_inversor_kw: proposta.getFloat('kit_potencia_inversor_kw') || undefined,
      kit_descricao: proposta.getString('kit_descricao') || undefined,
      kit_string_box: proposta.getString('kit_string_box') || undefined,
      lead: leadData,
      kit: kitData,
      vendedor: vendedorData,
      fotos_obra: fotosObra,
      is_expirada: isExpirada,
    }

    return e.json(200, resp)
  } catch (err) {
    return e.json(500, { error: 'Erro ao consultar proposta: ' + err.message })
  }
})
