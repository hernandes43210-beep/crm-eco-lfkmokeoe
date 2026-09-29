// Hook para exclusão segura com cascade de itens da área de Engenharia (/engenharia)
// Endpoints:
// - POST /backend/v1/engenharia/excluir-homologacao
//     Payload: { homologacaoId: string }
// - POST /backend/v1/engenharia/excluir-dossie
//     Payload: { dossieId: string }
// - POST /backend/v1/engenharia/excluir-documento
//     Payload: { documentoId: string }
// - POST /backend/v1/engenharia/excluir-arquivo
//     Payload: { arquivoId: string }
//
// Regras:
// 1. Apenas usuários autenticados com role === 'Admin' podem executar.
// 2. exclusão de homologação inteira remove:
//    - arquivos_engenharia vinculados a essa homologação (e ao lead se aplicável)
//    - o registro da homologação em si
//    - dossiês e documentos do lead se solicitado ou referenciados
// 3. Exclusão individual de dossiê, documento e arquivo limpa o registro de forma segura.
// 4. Todas as variáveis e funções estritamente dentro dos callbacks para compatibilidade com o pool Goja.

routerAdd('POST', '/backend/v1/engenharia/excluir-homologacao', (e) => {
  const auth = e.auth
  if (!auth) {
    return e.json(401, { success: false, message: 'Usuário não autenticado.' })
  }

  const authRole = auth.getString('role')
  if (authRole !== 'Admin') {
    return e.json(403, {
      success: false,
      message: 'Apenas Administradores podem excluir homologações da engenharia.',
    })
  }

  const body = e.requestInfo().body || {}
  const homologacaoId = typeof body.homologacaoId === 'string' ? body.homologacaoId.trim() : ''

  if (!homologacaoId) {
    return e.json(400, { success: false, message: 'ID da homologação é obrigatório.' })
  }

  let homologacaoRec = null
  try {
    homologacaoRec = $app.findFirstRecordByData('homologacoes', 'id', homologacaoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Homologação não encontrada.' })
  }

  const leadId = homologacaoRec.getString('lead')
  const dossieId = homologacaoRec.getString('dossie')
  const clienteNome = homologacaoRec.getString('cliente_nome') || 'Cliente ' + homologacaoRec.id

  let arquivosRemovidos = 0
  let docsRemovidos = 0
  let dossiesRemovidos = 0

  // 1. Remover arquivos_engenharia vinculados a esta homologação
  try {
    if ($app.hasTable('arquivos_engenharia')) {
      const arquivos = $app.findRecordsByFilter(
        'arquivos_engenharia',
        "homologacao = '" + homologacaoId + "'",
        '',
        500,
        0,
      )
      for (let i = 0; i < (arquivos || []).length; i++) {
        try {
          $app.delete(arquivos[i])
          arquivosRemovidos++
        } catch (delArqErr) {
          console.warn('[excluir_homologacao] Erro ao deletar arquivo:', delArqErr)
        }
      }
    }
  } catch (errArq) {
    console.warn('[excluir_homologacao] Erro ao buscar arquivos_engenharia:', errArq)
  }

  // 2. Se especificado ou se houver dossieId vinculado, remover dossiê
  if (dossieId) {
    try {
      const dossieRec = $app.findFirstRecordByData('dossies_engenharia', 'id', dossieId)
      $app.delete(dossieRec)
      dossiesRemovidos++
    } catch (_) {}
  }

  // Também remover eventuais dossiês adicionais vinculados a este lead se pedido cascade completo
  if (leadId && !!body.removerDossiesLead) {
    try {
      const dossiesLead = $app.findRecordsByFilter(
        'dossies_engenharia',
        "lead = '" + leadId + "'",
        '',
        100,
        0,
      )
      for (let d = 0; d < (dossiesLead || []).length; d++) {
        try {
          $app.delete(dossiesLead[d])
          dossiesRemovidos++
        } catch (_) {}
      }
    } catch (_) {}
  }

  // 3. Remover documentos_lead se requisitado na deleção completa do cliente enviado
  if (leadId && !!body.removerDocumentosLead) {
    try {
      const docsLead = $app.findRecordsByFilter(
        'documentos_lead',
        "lead = '" + leadId + "'",
        '',
        200,
        0,
      )
      for (let k = 0; k < (docsLead || []).length; k++) {
        try {
          $app.delete(docsLead[k])
          docsRemovidos++
        } catch (_) {}
      }
    } catch (_) {}
  }

  // 4. Excluir o registro principal de homologação
  try {
    $app.delete(homologacaoRec)
  } catch (delHomErr) {
    console.error('[excluir_homologacao] Erro ao deletar homologacao:', delHomErr)
    return e.json(500, {
      success: false,
      message: 'Erro ao excluir homologação: ' + delHomErr.message,
    })
  }

  return e.json(200, {
    success: true,
    message: 'Homologação de ' + clienteNome + ' excluída com sucesso.',
    detalhes: {
      arquivosRemovidos: arquivosRemovidos,
      docsRemovidos: docsRemovidos,
      dossiesRemovidos: dossiesRemovidos,
    },
  })
})

routerAdd('POST', '/backend/v1/engenharia/excluir-dossie', (e) => {
  const auth = e.auth
  if (!auth) {
    return e.json(401, { success: false, message: 'Usuário não autenticado.' })
  }

  const authRole = auth.getString('role')
  if (authRole !== 'Admin') {
    return e.json(403, {
      success: false,
      message: 'Apenas Administradores podem excluir dossiês técnicos.',
    })
  }

  const body = e.requestInfo().body || {}
  const dossieId = typeof body.dossieId === 'string' ? body.dossieId.trim() : ''

  if (!dossieId) {
    return e.json(400, { success: false, message: 'ID do dossiê é obrigatório.' })
  }

  let dossieRec = null
  try {
    dossieRec = $app.findFirstRecordByData('dossies_engenharia', 'id', dossieId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Dossiê não encontrado.' })
  }

  // Se houver homologação vinculada com este dossie, desvincular o ponteiro
  try {
    const homols = $app.findRecordsByFilter(
      'homologacoes',
      "dossie = '" + dossieId + "'",
      '',
      10,
      0,
    )
    for (let i = 0; i < (homols || []).length; i++) {
      const h = homols[i]
      h.set('dossie', null)
      try {
        $app.save(h)
      } catch (_) {}
    }
  } catch (_) {}

  try {
    $app.delete(dossieRec)
  } catch (err) {
    return e.json(500, {
      success: false,
      message: 'Erro ao excluir dossiê: ' + err.message,
    })
  }

  return e.json(200, {
    success: true,
    message: 'Dossiê excluído com sucesso.',
  })
})

routerAdd('POST', '/backend/v1/engenharia/excluir-documento', (e) => {
  const auth = e.auth
  if (!auth) {
    return e.json(401, { success: false, message: 'Usuário não autenticado.' })
  }

  const authRole = auth.getString('role')
  if (authRole !== 'Admin') {
    return e.json(403, {
      success: false,
      message: 'Apenas Administradores podem excluir documentos enviados para a engenharia.',
    })
  }

  const body = e.requestInfo().body || {}
  const documentoId = typeof body.documentoId === 'string' ? body.documentoId.trim() : ''

  if (!documentoId) {
    return e.json(400, { success: false, message: 'ID do documento é obrigatório.' })
  }

  let docRec = null
  try {
    docRec = $app.findFirstRecordByData('documentos_lead', 'id', documentoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Documento não encontrado.' })
  }

  try {
    $app.delete(docRec)
  } catch (err) {
    return e.json(500, {
      success: false,
      message: 'Erro ao excluir documento: ' + err.message,
    })
  }

  return e.json(200, {
    success: true,
    message: 'Documento excluído com sucesso.',
  })
})

routerAdd('POST', '/backend/v1/engenharia/excluir-arquivo', (e) => {
  const auth = e.auth
  if (!auth) {
    return e.json(401, { success: false, message: 'Usuário não autenticado.' })
  }

  const authRole = auth.getString('role')
  if (authRole !== 'Admin') {
    return e.json(403, {
      success: false,
      message: 'Apenas Administradores podem excluir arquivos técnicos da engenharia.',
    })
  }

  const body = e.requestInfo().body || {}
  const arquivoId = typeof body.arquivoId === 'string' ? body.arquivoId.trim() : ''

  if (!arquivoId) {
    return e.json(400, { success: false, message: 'ID do arquivo é obrigatório.' })
  }

  let arqRec = null
  try {
    arqRec = $app.findFirstRecordByData('arquivos_engenharia', 'id', arquivoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Arquivo não encontrado.' })
  }

  try {
    $app.delete(arqRec)
  } catch (err) {
    return e.json(500, {
      success: false,
      message: 'Erro ao excluir arquivo de engenharia: ' + err.message,
    })
  }

  return e.json(200, {
    success: true,
    message: 'Arquivo técnico excluído com sucesso.',
  })
})
