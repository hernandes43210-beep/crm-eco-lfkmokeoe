// Hook para gerenciar membros da equipe: Desativar/Reativar e Excluir com verificação de vínculos
// Endpoints:
// - POST /backend/v1/equipe/toggle-status
//     Payload: { userId: string, ativo: boolean }
// - POST /backend/v1/equipe/excluir
//     Payload: { userId: string, confirmacaoNome: string }
//
// Regras de negócio e segurança:
// 1. Exclusivo para usuários autenticados com role === 'Admin'
// 2. Não permitir desativar ou excluir o próprio usuário logado
// 3. Não permitir desativar ou excluir o último Admin ativo do sistema
// 4. Na exclusão: verificar vínculos em cascata:
//    - leads (proprietario = userId)
//    - homologacoes (engenheiro = userId OR vendedor = userId)
//    - documentos_lead (enviado_por = userId OR engenheiro_destino = userId)
//    - dossies_engenharia (enviado_por = userId OR engenheiro_destino = userId)
//    - arquivos_engenharia (criado_por = userId)
//    Se houver vínculos, BLOQUEAR HTTP 400 orientando a desativar em vez de excluir.
//    Se não houver vínculos, excluir o registro definitivamente.
// 5. Todas as variáveis e funções estritamente dentro de cada callback para evitar escopo Goja.

routerAdd('POST', '/backend/v1/equipe/toggle-status', (e) => {
  const auth = e.auth
  if (!auth) {
    return e.json(401, { success: false, message: 'Usuário não autenticado.' })
  }

  const authRole = auth.getString('role')
  if (authRole !== 'Admin') {
    return e.json(403, {
      success: false,
      message: 'Apenas administradores podem alterar o status de membros da equipe.',
    })
  }

  const body = e.requestInfo().body || {}
  const targetUserId = typeof body.userId === 'string' ? body.userId.trim() : ''
  const novoStatusAtivo = typeof body.ativo === 'boolean' ? body.ativo : !!body.ativo

  if (!targetUserId) {
    return e.json(400, { success: false, message: 'ID do usuário é obrigatório.' })
  }

  // 1. Não permitir desativar a si mesmo
  if (targetUserId === auth.id && !novoStatusAtivo) {
    return e.json(400, {
      success: false,
      message: 'Não é permitido desativar a sua própria conta.',
    })
  }

  // 2. Buscar usuário alvo
  let targetUser = null
  try {
    targetUser = $app.findFirstRecordByData('_pb_users_auth_', 'id', targetUserId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Usuário não encontrado.' })
  }

  // 3. Se for desativar, checar se é o último Admin ativo
  if (!novoStatusAtivo && targetUser.getString('role') === 'Admin') {
    try {
      // Contar quantos admins ativos existem
      const adminsAtivos = $app.findRecordsByFilter(
        '_pb_users_auth_',
        "role = 'Admin' && (ativo = true || ativo = null)",
        '',
        10,
        0,
      )
      // Se houver 1 ou menos e for o targetUser, bloquear
      const outrosAdminsAtivos = (adminsAtivos || []).filter((u) => u.id !== targetUserId)
      if (outrosAdminsAtivos.length === 0) {
        return e.json(400, {
          success: false,
          message: 'Não é permitido desativar o único administrador ativo do sistema.',
        })
      }
    } catch (countErr) {
      console.error('[equipe_actions] Erro ao verificar admins ativos:', countErr)
    }
  }

  // 4. Salvar novo status
  targetUser.set('ativo', novoStatusAtivo)
  try {
    $app.save(targetUser)
  } catch (saveErr) {
    console.error('[equipe_actions] Erro ao atualizar status do usuário:', saveErr)
    return e.json(500, {
      success: false,
      message: 'Erro ao salvar o status do membro da equipe: ' + saveErr.message,
    })
  }

  const acaoTexto = novoStatusAtivo ? 'reativado' : 'desativado'
  return e.json(200, {
    success: true,
    message: 'Membro ' + acaoTexto + ' com sucesso.',
    user: {
      id: targetUser.id,
      name: targetUser.getString('name'),
      email: targetUser.getString('email'),
      role: targetUser.getString('role'),
      ativo: novoStatusAtivo,
    },
  })
})

routerAdd('POST', '/backend/v1/equipe/excluir', (e) => {
  const auth = e.auth
  if (!auth) {
    return e.json(401, { success: false, message: 'Usuário não autenticado.' })
  }

  const authRole = auth.getString('role')
  if (authRole !== 'Admin') {
    return e.json(403, {
      success: false,
      message: 'Apenas administradores podem excluir membros da equipe.',
    })
  }

  const body = e.requestInfo().body || {}
  const targetUserId = typeof body.userId === 'string' ? body.userId.trim() : ''
  const confirmacaoNome =
    typeof body.confirmacaoNome === 'string' ? body.confirmacaoNome.trim() : ''

  if (!targetUserId) {
    return e.json(400, { success: false, message: 'ID do usuário é obrigatório.' })
  }

  // 1. Bloquear excluir a si mesmo
  if (targetUserId === auth.id) {
    return e.json(400, {
      success: false,
      message: 'Não é permitido excluir a sua própria conta de usuário.',
    })
  }

  // 2. Buscar o registro do usuário
  let targetUser = null
  try {
    targetUser = $app.findFirstRecordByData('_pb_users_auth_', 'id', targetUserId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Usuário não encontrado.' })
  }

  const userName = (targetUser.getString('name') || '').trim()
  const userEmail = (targetUser.getString('email') || '').trim()

  // 3. Validar se o nome digitado confere (ou o email se não tiver nome)
  if (confirmacaoNome) {
    const nomeNormalizado = userName.toLowerCase()
    const emailNormalizado = userEmail.toLowerCase()
    const confNormalizada = confirmacaoNome.toLowerCase()
    if (confNormalizada !== nomeNormalizado && confNormalizada !== emailNormalizado) {
      return e.json(400, {
        success: false,
        message: 'O nome de confirmação digitado não confere com o membro da equipe.',
      })
    }
  }

  // 4. Bloquear se for o único administrador ativo
  if (targetUser.getString('role') === 'Admin') {
    try {
      const adminsAtivos = $app.findRecordsByFilter(
        '_pb_users_auth_',
        "role = 'Admin' && (ativo = true || ativo = null)",
        '',
        10,
        0,
      )
      const outrosAdminsAtivos = (adminsAtivos || []).filter((u) => u.id !== targetUserId)
      if (outrosAdminsAtivos.length === 0) {
        return e.json(400, {
          success: false,
          message: 'Não é permitido excluir o único administrador ativo do sistema.',
        })
      }
    } catch (countErr) {
      console.error('[equipe_actions] Erro ao verificar admins ativos:', countErr)
    }
  }

  // 5. Verificação profunda de vínculos:
  // - leads (proprietario)
  // - homologacoes (engenheiro OR vendedor)
  // - documentos_lead (enviado_por OR engenheiro_destino)
  // - dossies_engenharia (enviado_por OR engenheiro_destino)
  // - arquivos_engenharia (criado_por)
  const vinculosEncontrados = []

  // 5.1 Leads
  try {
    const totalLeads = $app.countRecords(
      'leads',
      $dbx.exp('proprietario = {:id}', { id: targetUserId }),
    )
    if (totalLeads > 0) {
      vinculosEncontrados.push(totalLeads + ' lead(s) comercial(is)')
    }
  } catch (errLeads) {
    console.warn('[equipe_actions] Erro ao contar leads:', errLeads)
  }

  // 5.2 Homologações
  try {
    if ($app.hasTable('homologacoes')) {
      const totalHomolog = $app.countRecords(
        'homologacoes',
        $dbx.exp('engenheiro = {:id} OR vendedor = {:id}', { id: targetUserId }),
      )
      if (totalHomolog > 0) {
        vinculosEncontrados.push(totalHomolog + ' homologação(ões)')
      }
    }
  } catch (errHomolog) {
    console.warn('[equipe_actions] Erro ao contar homologacoes:', errHomolog)
  }

  // 5.3 Documentos do Lead
  try {
    if ($app.hasTable('documentos_lead')) {
      const totalDocs = $app.countRecords(
        'documentos_lead',
        $dbx.exp('enviado_por = {:id} OR engenheiro_destino = {:id}', { id: targetUserId }),
      )
      if (totalDocs > 0) {
        vinculosEncontrados.push(totalDocs + ' documento(s) de lead')
      }
    }
  } catch (errDocs) {
    console.warn('[equipe_actions] Erro ao contar documentos_lead:', errDocs)
  }

  // 5.4 Dossiês de Engenharia
  try {
    if ($app.hasTable('dossies_engenharia')) {
      const totalDossies = $app.countRecords(
        'dossies_engenharia',
        $dbx.exp('enviado_por = {:id} OR engenheiro_destino = {:id}', { id: targetUserId }),
      )
      if (totalDossies > 0) {
        vinculosEncontrados.push(totalDossies + ' dossiê(s) técnico(s)')
      }
    }
  } catch (errDossies) {
    console.warn('[equipe_actions] Erro ao contar dossies_engenharia:', errDossies)
  }

  // 5.5 Arquivos de Engenharia
  try {
    if ($app.hasTable('arquivos_engenharia')) {
      const totalArquivos = $app.countRecords(
        'arquivos_engenharia',
        $dbx.exp('criado_por = {:id}', { id: targetUserId }),
      )
      if (totalArquivos > 0) {
        vinculosEncontrados.push(totalArquivos + ' arquivo(s) de engenharia')
      }
    }
  } catch (errArquivos) {
    console.warn('[equipe_actions] Erro ao contar arquivos_engenharia:', errArquivos)
  }

  // Se houver qualquer vínculo, BLOQUEAR e instruir a desativar
  if (vinculosEncontrados.length > 0) {
    const listaVinculos = vinculosEncontrados.join(', ')
    return e.json(400, {
      success: false,
      hasLinks: true,
      message:
        'Não é possível excluir este usuário pois ele possui histórico e vínculos no sistema (' +
        listaVinculos +
        '). Para preservar esses dados e revogar o acesso, utilize a opção "Desativar Membro".',
    })
  }

  // 6. Sem vínculos: excluir de fato
  try {
    $app.delete(targetUser)
  } catch (delErr) {
    console.error('[equipe_actions] Erro ao excluir usuário:', delErr)
    return e.json(500, {
      success: false,
      message: 'Erro ao excluir usuário: ' + delErr.message,
    })
  }

  return e.json(200, {
    success: true,
    message: 'Membro excluído com sucesso do sistema.',
  })
})
