// Hook: Pagamento do Projeto (Área de Engenharia — coleção 'homologacoes')
//
// IMPORTANTE (JSVM): callbacks rodam em um pool separado de VM — NADA de
// declarações top-level (funções/variáveis) pode ser referenciado dentro dos
// callbacks. Toda a lógica (helpers incluídos) vive INLINE no corpo do callback.
//
// Regras:
//  - Admin/CEO e Engenheiro (responsável pelo dossiê ou supervisor) podem marcar o projeto como pago.
//  - Vendedores NÃO podem marcar nem reverter (403).
//  - A reversão para "não pago" só acontece com o ok de DUAS pessoas diferentes
//    (uma delas pode ser quem marcou como pago). Cada usuário confirma uma única vez.
//
// Endpoints:
//  1. POST /backend/v1/homologacao/marcar-projeto-pago   — marca o projeto como pago
//  2. POST /backend/v1/homologacao/desmarcar-projeto-pago — registra o ok para reverter;
//     com o 2º ok de usuário distinto, a reversão é aplicada.

routerAdd(
  'POST',
  '/backend/v1/homologacao/marcar-projeto-pago',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { success: false, message: 'Usuário não autenticado.' })
    }

    const body = e.requestInfo().body || {}
    const homologacaoId = typeof body.homologacaoId === 'string' ? body.homologacaoId.trim() : ''
    const observacao = typeof body.observacao === 'string' ? body.observacao.trim() : ''

    if (!homologacaoId) {
      return e.json(400, { success: false, message: 'ID da homologação é obrigatório.' })
    }

    let hom = null
    try {
      hom = $app.findFirstRecordByData('homologacoes', 'id', homologacaoId)
    } catch (_) {
      return e.json(404, { success: false, message: 'Registro de homologação não encontrado.' })
    }

    const authRole = auth.getString('role')
    const podeSupervisionar = auth.getBool('pode_supervisionar_engenharia')
    const ehAdmin = authRole === 'Admin'
    const ehEngenheiroAutorizado =
      authRole === 'Engenheiro' && (hom.getString('engenheiro') === auth.id || podeSupervisionar)

    if (!ehAdmin && !ehEngenheiroAutorizado) {
      return e.json(403, {
        success: false,
        message: 'Apenas Admin/CEO ou o Engenheiro responsável pode marcar o projeto como pago.',
      })
    }

    if (hom.getBool('projeto_pago')) {
      return e.json(400, {
        success: false,
        message: 'Este projeto já está marcado como pago.',
      })
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const autorNome = auth.getString('name') || auth.getString('email') || 'Usuário'
    const leadId = hom.getString('lead')

    hom.set('projeto_pago', true)
    hom.set('projeto_pago_em', nowIso)
    hom.set('projeto_pago_por', auth.id)
    hom.set('projeto_pago_confirmacoes', [])
    hom.set('projeto_pago_reversoes', [])

    // Histórico da homologação
    let homHist = []
    const rawHomHist = hom.get('historico')
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
      tipo: 'projeto_pago',
      descricao:
        'Projeto marcado como PAGO por ' + autorNome + (observacao ? ' — Obs: ' + observacao : ''),
      autor_id: auth.id,
      autor_nome: autorNome,
    })
    if (homHist.length > 50) {
      homHist = homHist.slice(homHist.length - 50)
    }
    hom.set('historico', homHist)

    $app.save(hom)

    // Notifica a outra parte (engenheiro / admins)
    const clienteNome = hom.getString('cliente_nome') || 'Cliente'
    const engenheiroId = hom.getString('engenheiro')
    const destinatarios = []
    if (ehAdmin && engenheiroId && engenheiroId !== auth.id) {
      destinatarios.push(engenheiroId)
    }
    if (!ehAdmin) {
      try {
        const admins = $app.findRecordsByFilter('_pb_users_auth_', "role = 'Admin'", 'name', 50, 0)
        for (let a = 0; a < admins.length; a++) {
          const adminId = admins[a].id
          if (adminId !== auth.id && destinatarios.indexOf(adminId) === -1) {
            destinatarios.push(adminId)
          }
        }
      } catch (_) {}
    }

    try {
      const notifCol = $app.findCollectionByNameOrId('notificacoes')
      for (let d = 0; d < destinatarios.length; d++) {
        try {
          const nRec = new Record(notifCol)
          nRec.set('usuario', destinatarios[d])
          if (leadId) nRec.set('lead', leadId)
          nRec.set('titulo', 'Projeto marcado como pago — ' + clienteNome)
          nRec.set(
            'mensagem',
            autorNome +
              ' marcou o projeto do cliente ' +
              clienteNome +
              ' como PAGO. A reversão desse status só acontece com o ok de duas pessoas.',
          )
          nRec.set('tipo', 'homologacao_art')
          nRec.set('lida', false)
          nRec.set('lead_nome', clienteNome)
          nRec.set('lead_cidade', hom.getString('cliente_cidade') || '')
          nRec.set('lead_telefone', hom.getString('cliente_telefone') || '')
          nRec.set(
            'metadados',
            JSON.stringify({
              acao: 'projeto_pago',
              homologacao_id: hom.id,
              lead_id: leadId,
              projeto_pago: true,
              projeto_pago_em: nowIso,
              marcado_por: auth.id,
            }),
          )
          $app.save(nRec)
        } catch (nErr) {
          console.warn('[marcar_projeto_pago] Erro ao criar notificação:', nErr)
        }
      }
    } catch (ncErr) {
      console.warn('[marcar_projeto_pago] Erro geral de notificação:', ncErr)
    }

    return e.json(200, {
      success: true,
      message: 'Projeto marcado como pago com sucesso!',
      homologacao_id: hom.id,
      projeto_pago: true,
      projeto_pago_em: nowIso,
      projeto_pago_por: auth.id,
      projeto_pago_por_nome: autorNome,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/homologacao/desmarcar-projeto-pago',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { success: false, message: 'Usuário não autenticado.' })
    }

    const body = e.requestInfo().body || {}
    const homologacaoId = typeof body.homologacaoId === 'string' ? body.homologacaoId.trim() : ''
    const observacao = typeof body.observacao === 'string' ? body.observacao.trim() : ''

    if (!homologacaoId) {
      return e.json(400, { success: false, message: 'ID da homologação é obrigatório.' })
    }

    let hom = null
    try {
      hom = $app.findFirstRecordByData('homologacoes', 'id', homologacaoId)
    } catch (_) {
      return e.json(404, { success: false, message: 'Registro de homologação não encontrado.' })
    }

    const authRole = auth.getString('role')
    const podeSupervisionar = auth.getBool('pode_supervisionar_engenharia')
    const ehAdmin = authRole === 'Admin'
    const ehEngenheiroAutorizado =
      authRole === 'Engenheiro' && (hom.getString('engenheiro') === auth.id || podeSupervisionar)

    if (!ehAdmin && !ehEngenheiroAutorizado) {
      return e.json(403, {
        success: false,
        message:
          'Apenas Admin/CEO ou o Engenheiro responsável pode confirmar a reversão do pagamento.',
      })
    }

    if (!hom.getBool('projeto_pago')) {
      return e.json(400, {
        success: false,
        message: 'Este projeto não está marcado como pago.',
      })
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const autorNome = auth.getString('name') || auth.getString('email') || 'Usuário'
    const leadId = hom.getString('lead')

    // Oks de reversão já registrados
    let reversoes = []
    const rawReversoes = hom.get('projeto_pago_reversoes')
    if (Array.isArray(rawReversoes)) {
      reversoes = rawReversoes.slice(0)
    } else if (typeof rawReversoes === 'string') {
      try {
        const p = JSON.parse(rawReversoes)
        if (Array.isArray(p)) reversoes = p
      } catch (_) {}
    }

    // Usuário já confirmou? Não conta duas vezes.
    for (let i = 0; i < reversoes.length; i++) {
      if (reversoes[i] && reversoes[i].usuario_id === auth.id) {
        return e.json(200, {
          success: false,
          message:
            'Você já confirmou esta reversão. Falta o ok de mais 1 pessoa (diferente de você) para desfazer o pagamento.',
          homologacao_id: hom.id,
          projeto_pago: true,
          confirmacoes: reversoes,
          faltam: 1,
        })
      }
    }

    reversoes.push({
      usuario_id: auth.id,
      usuario_nome: autorNome,
      data: nowIso,
    })

    // Conta usuários distintos
    const idsUnicos = []
    for (let i = 0; i < reversoes.length; i++) {
      const uid = reversoes[i] && reversoes[i].usuario_id
      if (uid && idsUnicos.indexOf(uid) === -1) idsUnicos.push(uid)
    }

    // Histórico da homologação
    let homHist = []
    const rawHomHist = hom.get('historico')
    if (Array.isArray(rawHomHist)) {
      homHist = rawHomHist.slice(0)
    } else if (typeof rawHomHist === 'string') {
      try {
        const p = JSON.parse(rawHomHist)
        if (Array.isArray(p)) homHist = p
      } catch (_) {}
    }

    if (idsUnicos.length >= 2) {
      // 2º ok: aplica a reversão
      const marcadoPorId = hom.getString('projeto_pago_por')
      const nomesConfirmacoes = []
      const vistos = []
      for (let i = 0; i < reversoes.length; i++) {
        const uid = reversoes[i] && reversoes[i].usuario_id
        if (uid && vistos.indexOf(uid) === -1) {
          vistos.push(uid)
          nomesConfirmacoes.push(reversoes[i].usuario_nome || 'Usuário')
        }
      }

      hom.set('projeto_pago', false)
      hom.set('projeto_pago_em', null)
      hom.set('projeto_pago_por', null)
      hom.set('projeto_pago_confirmacoes', [])
      hom.set('projeto_pago_reversoes', [])

      homHist.push({
        data: nowIso,
        tipo: 'projeto_pago_revertido',
        descricao:
          'Pagamento do projeto REVERTIDO para "não pago" — oks de ' +
          nomesConfirmacoes.join(' e ') +
          (observacao ? ' — Obs: ' + observacao : ''),
        autor_id: auth.id,
        autor_nome: autorNome,
      })
      if (homHist.length > 50) {
        homHist = homHist.slice(homHist.length - 50)
      }
      hom.set('historico', homHist)

      $app.save(hom)

      // Notifica quem havia marcado como pago
      const clienteNome = hom.getString('cliente_nome') || 'Cliente'
      try {
        if (marcadoPorId && marcadoPorId !== auth.id) {
          const notifCol = $app.findCollectionByNameOrId('notificacoes')
          const nRec = new Record(notifCol)
          nRec.set('usuario', marcadoPorId)
          if (leadId) nRec.set('lead', leadId)
          nRec.set('titulo', 'Pagamento do projeto revertido — ' + clienteNome)
          nRec.set(
            'mensagem',
            'O pagamento do projeto do cliente ' +
              clienteNome +
              ' foi revertido para "não pago" com o ok de ' +
              nomesConfirmacoes.join(' e ') +
              '.',
          )
          nRec.set('tipo', 'homologacao_art')
          nRec.set('lida', false)
          nRec.set('lead_nome', clienteNome)
          nRec.set('lead_cidade', hom.getString('cliente_cidade') || '')
          nRec.set('lead_telefone', hom.getString('cliente_telefone') || '')
          nRec.set(
            'metadados',
            JSON.stringify({
              acao: 'projeto_pago_revertido',
              homologacao_id: hom.id,
              projeto_pago: false,
              revertido_em: nowIso,
              confirmacoes: nomesConfirmacoes,
            }),
          )
          $app.save(nRec)
        }
      } catch (nErr) {
        console.warn('[desmarcar_projeto_pago] Erro ao criar notificação:', nErr)
      }

      return e.json(200, {
        success: true,
        message: 'Reversão confirmada por duas pessoas. O projeto voltou para "não pago".',
        homologacao_id: hom.id,
        projeto_pago: false,
        projeto_pago_revertido: true,
        confirmacoes: reversoes,
      })
    }

    // Apenas 1 ok até agora: registra e avisa que falta a segunda pessoa
    hom.set('projeto_pago_reversoes', reversoes)

    homHist.push({
      data: nowIso,
      tipo: 'projeto_pago_reversao_solicitada',
      descricao:
        autorNome +
        ' solicitou a reversão do pagamento do projeto (1/2 oks). Aguardando o ok de uma segunda pessoa.',
      autor_id: auth.id,
      autor_nome: autorNome,
    })
    if (homHist.length > 50) {
      homHist = homHist.slice(homHist.length - 50)
    }
    hom.set('historico', homHist)

    $app.save(hom)

    return e.json(200, {
      success: false,
      message:
        'Reversão registrada, mas ainda NÃO aplicada: falta o ok de 1 segunda pessoa (Admin/CEO ou Engenheiro) para desfazer o pagamento.',
      homologacao_id: hom.id,
      projeto_pago: true,
      confirmacoes: reversoes,
      faltam: 1,
    })
  },
  $apis.requireAuth(),
)
