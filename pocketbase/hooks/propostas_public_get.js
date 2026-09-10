// GET /backend/v1/propostas/public/{token}
// Endpoint público para consulta de proposta por token único sem exigir autenticação

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
    let leadData = null
    let kitData = null
    let vendedorData = null

    const leadId = proposta.getString('lead')
    if (leadId) {
      try {
        const leadRec = $app.findCollectionByNameOrId('leads')
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
        }
      } catch (_) {}
    }

    // Buscar fotos de obras já instaladas para prova social no modelo da proposta
    let fotosObra = []
    try {
      // Priorizar fotos do próprio lead (se houver), ou de outros leads com fotos cadastradas
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
      created: proposta.getString('created'),
      lead: leadData,
      kit: kitData,
      vendedor: vendedorData,
      fotos_obra: fotosObra,
    }

    return e.json(200, resp)
  } catch (err) {
    return e.json(500, { error: 'Erro ao consultar proposta: ' + err.message })
  }
})
