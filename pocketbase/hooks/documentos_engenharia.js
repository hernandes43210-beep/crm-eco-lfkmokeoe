// Hook para envio de documentos do lead ao engenheiro responsável
// POST /backend/v1/documentos/enviar-engenheiro
//
// Regras e garantias:
// 1. Apenas usuários autenticados (Admin ou Vendedor) podem disparar o envio.
// 2. Cria notificação (sino) na coleção 'notificacoes' para o engenheiro com link para os documentos.
// 3. Envia e-mail transacional ao engenheiro com resumo dos documentos anexados E dados do dossiê técnico negociado.
// 4. Registra evento no historico do lead: "Documentos e Dossiê enviados ao engenheiro X em dd/mm".
// 5. Atualiza os registros em documentos_lead com engenheiro_destino, status_envio ('enviado' ou 'reenviado') e enviado_em.
// 6. Persiste o registro de dossiê técnico na coleção 'dossies_engenharia' com histórico simples de versões.
// 7. Todas as declarações de variáveis e código inline dentro do handler para evitar scoping traps do Goja.

routerAdd(
  'POST',
  '/backend/v1/documentos/enviar-engenheiro',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { success: false, message: 'Usuário não autenticado.' })
    }

    const authRole = auth.getString('role')
    if (authRole === 'Engenheiro') {
      return e.json(403, {
        success: false,
        message: 'Engenheiros não podem enviar documentos para outros engenheiros.',
      })
    }

    const body = e.requestInfo().body || {}
    const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : ''
    const engenheiroId = typeof body.engenheiroId === 'string' ? body.engenheiroId.trim() : ''
    const observacao = typeof body.observacao === 'string' ? body.observacao.trim() : ''
    const isReenvio = !!body.isReenvio
    const dossiePayload = body.dossie && typeof body.dossie === 'object' ? body.dossie : null

    if (!leadId) {
      return e.json(400, { success: false, message: 'ID do lead é obrigatório.' })
    }

    if (!engenheiroId) {
      return e.json(400, { success: false, message: 'Engenheiro responsável é obrigatório.' })
    }

    // 1. Validar lead
    let leadRecord = null
    try {
      leadRecord = $app.findFirstRecordByData('leads', 'id', leadId)
    } catch (_) {
      return e.json(404, { success: false, message: 'Lead não encontrado.' })
    }

    // 2. Validar engenheiro
    let engRecord = null
    try {
      engRecord = $app.findFirstRecordByData('_pb_users_auth_', 'id', engenheiroId)
    } catch (_) {
      return e.json(404, { success: false, message: 'Engenheiro selecionado não encontrado.' })
    }

    if (engRecord.getString('role') !== 'Engenheiro' && engRecord.getString('role') !== 'Admin') {
      return e.json(400, {
        success: false,
        message: 'O usuário selecionado não possui o papel de Engenheiro.',
      })
    }

    const engNome = engRecord.getString('name') || engRecord.getString('email') || 'Engenheiro(a)'
    const engEmail = engRecord.getString('email')
    const remetenteNome = auth.getString('name') || auth.getString('email') || 'Equipe Comercial'
    const leadNome = leadRecord.getString('nome') || 'Lead sem nome'

    // 3. Buscar documentos do lead
    let docs = []
    try {
      docs = $app.findRecordsByFilter(
        'documentos_lead',
        "lead = '" + leadId + "'",
        '-created',
        200,
        0,
      )
    } catch (docsErr) {
      console.warn('[enviar_engenheiro] Erro ao buscar docs:', docsErr)
    }

    if (!docs || docs.length === 0) {
      return e.json(400, {
        success: false,
        message: 'Nenhum documento anexado para enviar ao engenheiro.',
      })
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

    // 4. Atualizar os documentos do lead com engenheiro_destino, status e timestamp
    let docsAtualizadosCount = 0
    const novoStatus = isReenvio ? 'reenviado' : 'enviado'

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]
      doc.set('engenheiro_destino', engenheiroId)
      doc.set('status_envio', novoStatus)
      doc.set('enviado_em', nowIso)
      if (!doc.getString('enviado_por')) {
        doc.set('enviado_por', auth.id)
      }
      try {
        $app.save(doc)
        docsAtualizadosCount++
      } catch (saveDocErr) {
        console.error('[enviar_engenheiro] Erro ao salvar doc ' + doc.id + ':', saveDocErr)
      }
    }

    // 5. Persistir Dossiê Técnico de Engenharia na coleção 'dossies_engenharia'
    let dossieIdSalvo = ''
    let dossieVersaoSalva = 1

    try {
      const dossiesCol = $app.findCollectionByNameOrId('dossies_engenharia')

      // Verificar versão anterior para incrementar
      let versaoAnterior = 0
      try {
        const registrosAntigos = $app.findRecordsByFilter(
          'dossies_engenharia',
          "lead = '" + leadId + "'",
          '-versao',
          1,
          0,
        )
        if (registrosAntigos && registrosAntigos.length > 0) {
          versaoAnterior = Number(registrosAntigos[0].get('versao')) || 0
        }
      } catch (_) {}

      dossieVersaoSalva = versaoAnterior + 1

      const novoDossie = new Record(dossiesCol)
      novoDossie.set('lead', leadId)
      novoDossie.set('engenheiro_destino', engenheiroId)
      novoDossie.set('enviado_por', auth.id)
      novoDossie.set('enviado_em', nowIso)
      novoDossie.set('versao', dossieVersaoSalva)

      if (dossiePayload) {
        if (dossiePayload.cliente_nome)
          novoDossie.set('cliente_nome', String(dossiePayload.cliente_nome).trim())
        else novoDossie.set('cliente_nome', leadNome)

        if (dossiePayload.cliente_telefone)
          novoDossie.set('cliente_telefone', String(dossiePayload.cliente_telefone).trim())
        else novoDossie.set('cliente_telefone', leadRecord.getString('telefone') || '')

        if (dossiePayload.cliente_email)
          novoDossie.set('cliente_email', String(dossiePayload.cliente_email).trim())
        else novoDossie.set('cliente_email', leadRecord.getString('email') || '')

        if (dossiePayload.cliente_cidade)
          novoDossie.set('cliente_cidade', String(dossiePayload.cliente_cidade).trim())
        else novoDossie.set('cliente_cidade', leadRecord.getString('cidade') || '')

        if (dossiePayload.cliente_estado)
          novoDossie.set('cliente_estado', String(dossiePayload.cliente_estado).trim())
        else novoDossie.set('cliente_estado', leadRecord.getString('estado') || '')

        if (dossiePayload.endereco_instalacao)
          novoDossie.set('endereco_instalacao', String(dossiePayload.endereco_instalacao).trim())
        else novoDossie.set('endereco_instalacao', leadRecord.getString('endereco') || '')

        if (dossiePayload.unidade_consumidora)
          novoDossie.set('unidade_consumidora', String(dossiePayload.unidade_consumidora).trim())
        else novoDossie.set('unidade_consumidora', '')

        if (typeof dossiePayload.consumo_medio_kwh === 'number')
          novoDossie.set('consumo_medio_kwh', dossiePayload.consumo_medio_kwh)
        else if (leadRecord.get('consumo_mensal_kwh'))
          novoDossie.set('consumo_medio_kwh', Number(leadRecord.get('consumo_mensal_kwh')))

        if (dossiePayload.kit_nome)
          novoDossie.set('kit_nome', String(dossiePayload.kit_nome).trim())
        if (typeof dossiePayload.potencia_total_kwp === 'number')
          novoDossie.set('potencia_total_kwp', dossiePayload.potencia_total_kwp)

        if (typeof dossiePayload.paineis_quantidade === 'number')
          novoDossie.set('paineis_quantidade', dossiePayload.paineis_quantidade)
        if (dossiePayload.paineis_modelo)
          novoDossie.set('paineis_modelo', String(dossiePayload.paineis_modelo).trim())
        if (typeof dossiePayload.paineis_potencia_w === 'number')
          novoDossie.set('paineis_potencia_w', dossiePayload.paineis_potencia_w)

        if (dossiePayload.inversor_marca)
          novoDossie.set('inversor_marca', String(dossiePayload.inversor_marca).trim())
        if (dossiePayload.inversor_modelo)
          novoDossie.set('inversor_modelo', String(dossiePayload.inversor_modelo).trim())
        if (typeof dossiePayload.inversor_potencia_kw === 'number')
          novoDossie.set('inversor_potencia_kw', dossiePayload.inversor_potencia_kw)
        if (typeof dossiePayload.inversor_quantidade === 'number')
          novoDossie.set('inversor_quantidade', dossiePayload.inversor_quantidade)

        const tipoInst = dossiePayload.tipo_instalacao
        if (tipoInst === 'telhado' || tipoInst === 'solo' || tipoInst === 'outro') {
          novoDossie.set('tipo_instalacao', tipoInst)
        } else {
          novoDossie.set('tipo_instalacao', 'telhado')
        }

        if (dossiePayload.tipo_estrutura_detalhe)
          novoDossie.set(
            'tipo_estrutura_detalhe',
            String(dossiePayload.tipo_estrutura_detalhe).trim(),
          )
        if (dossiePayload.observacoes)
          novoDossie.set('observacoes', String(dossiePayload.observacoes).trim())
        else if (observacao) novoDossie.set('observacoes', observacao)
      } else {
        // Fallback populando com o que tiver no lead
        novoDossie.set('cliente_nome', leadNome)
        novoDossie.set('cliente_telefone', leadRecord.getString('telefone') || '')
        novoDossie.set('cliente_email', leadRecord.getString('email') || '')
        novoDossie.set('cliente_cidade', leadRecord.getString('cidade') || '')
        novoDossie.set('cliente_estado', leadRecord.getString('estado') || '')
        novoDossie.set('endereco_instalacao', leadRecord.getString('endereco') || '')
        if (leadRecord.get('consumo_mensal_kwh'))
          novoDossie.set('consumo_medio_kwh', Number(leadRecord.get('consumo_mensal_kwh')))
        novoDossie.set('tipo_instalacao', 'telhado')
        if (observacao) novoDossie.set('observacoes', observacao)
      }

      $app.save(novoDossie)
      dossieIdSalvo = novoDossie.id
      console.log(
        '[enviar_engenheiro] Dossiê técnico salvo com sucesso id=' +
          dossieIdSalvo +
          ' v' +
          dossieVersaoSalva,
      )
    } catch (dossieErr) {
      console.error('[enviar_engenheiro] Erro ao salvar dossie tecnico:', dossieErr)
    }

    // 5.1 Criar ou atualizar card na coleção 'homologacoes' (Kanban de Homologação)
    let homologacaoIdSalva = ''
    try {
      const homologacoesCol = $app.findCollectionByNameOrId('homologacoes')
      let recHomologacao = null
      let isNovaHomologacao = false

      try {
        recHomologacao = $app.findFirstRecordByData('homologacoes', 'lead', leadId)
      } catch (_) {
        recHomologacao = new Record(homologacoesCol)
        isNovaHomologacao = true
      }

      // Vendedor responsável: proprietário do lead ou o próprio autor do envio
      const vendedorResponsavelId = leadRecord.getString('proprietario') || auth.id

      recHomologacao.set('lead', leadId)
      if (dossieIdSalvo) {
        recHomologacao.set('dossie', dossieIdSalvo)
      }
      recHomologacao.set('engenheiro', engenheiroId)
      recHomologacao.set('vendedor', vendedorResponsavelId)

      // Se for novo, inicia com 'novo_cliente'; se já existir, preserva status atual
      if (isNovaHomologacao || !recHomologacao.getString('status')) {
        recHomologacao.set('status', 'novo_cliente')
      }

      // Se for reenvio e não tiver visualizado_em limpo, marca como pendente de visualização da nova versão
      if (isReenvio) {
        recHomologacao.set('visualizado_em', null)
      }

      // Dados denormalizados do cliente para isolamento comercial
      recHomologacao.set('cliente_nome', dossiePayload?.cliente_nome || leadNome)
      recHomologacao.set(
        'cliente_telefone',
        dossiePayload?.cliente_telefone || leadRecord.getString('telefone') || '',
      )
      recHomologacao.set(
        'cliente_cidade',
        dossiePayload?.cliente_cidade || leadRecord.getString('cidade') || '',
      )
      recHomologacao.set(
        'cliente_estado',
        dossiePayload?.cliente_estado || leadRecord.getString('estado') || '',
      )
      recHomologacao.set(
        'endereco_instalacao',
        dossiePayload?.endereco_instalacao || leadRecord.getString('endereco') || '',
      )
      recHomologacao.set('unidade_consumidora', dossiePayload?.unidade_consumidora || '')

      if (dossiePayload && typeof dossiePayload.potencia_total_kwp === 'number') {
        recHomologacao.set('potencia_total_kwp', dossiePayload.potencia_total_kwp)
      }

      // Kit resumo
      const pSummary =
        dossiePayload && dossiePayload.paineis_quantidade && dossiePayload.paineis_potencia_w
          ? dossiePayload.paineis_quantidade + 'x ' + dossiePayload.paineis_potencia_w + 'W'
          : ''
      const invSummary =
        dossiePayload && dossiePayload.inversor_marca
          ? dossiePayload.inversor_marca +
            (dossiePayload.inversor_potencia_kw
              ? ' ' + dossiePayload.inversor_potencia_kw + 'kW'
              : '')
          : ''
      const kitSummary = [pSummary, invSummary].filter(Boolean).join(' • ')
      recHomologacao.set('kit_resumo', kitSummary)
      recHomologacao.set('versao_dossie', dossieVersaoSalva)

      // Histórico do card de homologação
      let homHist = []
      const rawHomHist = recHomologacao.get('historico')
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
        tipo: isNovaHomologacao ? 'criacao' : 'atualizacao_dossie',
        descricao: isNovaHomologacao
          ? 'Card de homologação criado no status Novo Cliente'
          : 'Dossiê atualizado para v' + dossieVersaoSalva,
        autor_id: auth.id,
        autor_nome: remetenteNome,
      })

      if (homHist.length > 50) {
        homHist = homHist.slice(homHist.length - 50)
      }
      recHomologacao.set('historico', homHist)

      $app.save(recHomologacao)
      homologacaoIdSalva = recHomologacao.id
      console.log(
        '[enviar_engenheiro] Registro de homologação atualizado/criado id=' +
          homologacaoIdSalva +
          ' status=' +
          recHomologacao.getString('status'),
      )
    } catch (homErr) {
      console.error('[enviar_engenheiro] Erro ao salvar homologacao:', homErr)
    }

    // 6. Registrar no historico do lead (truncado a 50 eventos)
    try {
      let hist = []
      const rawHist = leadRecord.get('historico')
      if (Array.isArray(rawHist)) {
        hist = rawHist.slice(0)
      } else if (typeof rawHist === 'string') {
        try {
          const parsed = JSON.parse(rawHist)
          if (Array.isArray(parsed)) hist = parsed
        } catch (_) {}
      }

      const paineisResumo =
        dossiePayload && dossiePayload.paineis_quantidade && dossiePayload.paineis_potencia_w
          ? dossiePayload.paineis_quantidade +
            ' painéis de ' +
            dossiePayload.paineis_potencia_w +
            'W'
          : ''
      const invResumo =
        dossiePayload && dossiePayload.inversor_marca
          ? 'Inversor ' +
            dossiePayload.inversor_marca +
            (dossiePayload.inversor_potencia_kw
              ? ' ' + dossiePayload.inversor_potencia_kw + ' kW'
              : '')
          : ''
      const kitResumo = [paineisResumo, invResumo].filter(Boolean).join(', ')

      const descEvento = isReenvio
        ? 'Dossiê técnico e documentos atualizados/reenviados ao engenheiro ' +
          engNome +
          ' em ' +
          dataSimples +
          ' (' +
          docsAtualizadosCount +
          ' arquivos' +
          (kitResumo ? ' • Kit: ' + kitResumo : '') +
          ')' +
          (observacao ? ' — Obs: ' + observacao : '')
        : 'Dossiê técnico e documentos enviados ao engenheiro ' +
          engNome +
          ' em ' +
          dataSimples +
          ' (' +
          docsAtualizadosCount +
          ' arquivos' +
          (kitResumo ? ' • Kit: ' + kitResumo : '') +
          ')' +
          (observacao ? ' — Obs: ' + observacao : '')

      hist.push({
        data: nowIso,
        tipo: 'contato',
        descricao: descEvento,
        autor: auth.id,
        autor_nome: remetenteNome,
      })

      // Manter no máximo 50 eventos para não estourar payload/cron
      if (hist.length > 50) {
        hist = hist.slice(hist.length - 50)
      }

      leadRecord.set('historico', hist)
      $app.save(leadRecord)
    } catch (histErr) {
      console.error('[enviar_engenheiro] Erro ao atualizar historico do lead:', histErr)
    }

    // 7. Criar notificação (sino) para o engenheiro
    try {
      const notifCol = $app.findCollectionByNameOrId('notificacoes')
      const notif = new Record(notifCol)
      notif.set('usuario', engenheiroId)
      notif.set('lead', leadId)
      notif.set(
        'titulo',
        isReenvio ? 'Reenvio de Dossiê Técnico: ' + leadNome : 'Novo Dossiê Técnico: ' + leadNome,
      )

      let kitNotifInfo = ''
      if (dossiePayload) {
        const pQtd = dossiePayload.paineis_quantidade
        const pPot = dossiePayload.paineis_potencia_w
        const iMarca = dossiePayload.inversor_marca
        const iPot = dossiePayload.inversor_potencia_kw
        const tInst = dossiePayload.tipo_instalacao === 'solo' ? 'Solo' : 'Telhado'

        const parts = []
        if (pQtd && pPot) parts.push(pQtd + ' painéis de ' + pPot + 'W')
        if (iMarca) parts.push('Inversor ' + iMarca + (iPot ? ' ' + iPot + 'kW' : ''))
        parts.push('Instalação em ' + tInst)
        kitNotifInfo = ' [Kit: ' + parts.join(', ') + ']'
      }

      notif.set(
        'mensagem',
        remetenteNome +
          ' enviou o dossiê técnico com ' +
          docsAtualizadosCount +
          ' documento(s) do cliente ' +
          leadNome +
          ' para projeto e homologação.' +
          kitNotifInfo +
          (observacao ? ' Nota: ' + observacao : ''),
      )
      notif.set('tipo', 'documentos_engenharia')
      notif.set('lida', false)
      notif.set('lead_nome', leadNome)
      notif.set('lead_cidade', leadRecord.getString('cidade') || '')
      notif.set('lead_telefone', leadRecord.getString('telefone') || '')
      notif.set(
        'metadados',
        JSON.stringify({
          acao: isReenvio ? 'reenvio_documentos' : 'envio_documentos',
          docs_count: docsAtualizadosCount,
          remetente_id: auth.id,
          remetente_nome: remetenteNome,
          enviado_em: nowIso,
          dossie_id: dossieIdSalvo,
          versao: dossieVersaoSalva,
        }),
      )
      $app.save(notif)
      console.log('[enviar_engenheiro] Notificação criada no sino para ' + engNome)
    } catch (notifErr) {
      console.error('[enviar_engenheiro] Erro ao criar notificacao sino:', notifErr)
    }

    // 8. Disparar e-mail transacional para o engenheiro
    let emailEnviado = false
    let emailErroMsg = ''
    try {
      const metaSettings = $app.settings().meta || {}
      const senderAddr = metaSettings.senderAddress || 'no-reply@goskip.dev'
      const senderName = metaSettings.senderName || 'Ecosolar Energy CRM'
      const appDocsUrl = 'https://crm-de-vendas-solar-dce30.goskip.app/engenharia'

      // Resumo de categorias
      let countPessoais = 0
      let countConta = 0
      let countDatasheet = 0
      let countProc = 0

      for (let j = 0; j < docs.length; j++) {
        const cat = docs[j].getString('categoria')
        if (cat === 'documentos_pessoais') countPessoais++
        else if (cat === 'conta_energia') countConta++
        else if (cat === 'datasheet_equipamentos') countDatasheet++
        else if (cat === 'procuracao') countProc++
      }

      // Bloco HTML do Dossiê Técnico para Projeto
      let dossieHtmlBlock = ''
      if (dossiePayload) {
        const clienteNome = dossiePayload.cliente_nome || leadNome
        const clienteTel =
          dossiePayload.cliente_telefone || leadRecord.getString('telefone') || 'Não informado'
        const clienteEnd =
          dossiePayload.endereco_instalacao ||
          leadRecord.getString('endereco') ||
          leadRecord.getString('cidade') + '/' + leadRecord.getString('estado') ||
          'Não informado'
        const uc = dossiePayload.unidade_consumidora || 'Não informada'
        const consMed = dossiePayload.consumo_medio_kwh
          ? dossiePayload.consumo_medio_kwh + ' kWh/mês'
          : 'Não informado'

        const pDesc =
          (dossiePayload.paineis_quantidade ? dossiePayload.paineis_quantidade + 'x ' : '') +
          (dossiePayload.paineis_modelo ? dossiePayload.paineis_modelo + ' ' : 'Painéis ') +
          (dossiePayload.paineis_potencia_w ? dossiePayload.paineis_potencia_w + 'W' : '')

        const iDesc =
          (dossiePayload.inversor_quantidade ? dossiePayload.inversor_quantidade + 'x ' : '1x ') +
          (dossiePayload.inversor_marca ? dossiePayload.inversor_marca + ' ' : 'Inversor ') +
          (dossiePayload.inversor_modelo ? dossiePayload.inversor_modelo + ' ' : '') +
          (dossiePayload.inversor_potencia_kw
            ? '(' + dossiePayload.inversor_potencia_kw + ' kW)'
            : '')

        const tInstalacao = dossiePayload.tipo_instalacao === 'solo' ? 'Solo' : 'Telhado'
        const tEstrutura = dossiePayload.tipo_estrutura_detalhe
          ? ' (' + dossiePayload.tipo_estrutura_detalhe + ')'
          : ''

        dossieHtmlBlock =
          '      <div style="margin: 18px 0; padding: 16px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">' +
          '        <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">' +
          '          ⚡ Dossiê Técnico para Projeto (Somente o Negociado)' +
          '        </div>' +
          '        <table style="width: 100%; font-size: 13px; color: #334155; line-height: 1.6;">' +
          '          <tr><td style="width: 140px; font-weight: 700; color: #475569;">Cliente:</td><td><strong>' +
          clienteNome +
          '</strong></td></tr>' +
          '          <tr><td style="font-weight: 700; color: #475569;">Contato:</td><td>' +
          clienteTel +
          '</td></tr>' +
          '          <tr><td style="font-weight: 700; color: #475569;">Endereço/Local:</td><td>' +
          clienteEnd +
          '</td></tr>' +
          '          <tr><td style="font-weight: 700; color: #475569;">Unidade Consumidora:</td><td><strong style="color: #0B7A5B;">' +
          uc +
          '</strong></td></tr>' +
          '          <tr><td style="font-weight: 700; color: #475569;">Consumo Médio:</td><td>' +
          consMed +
          '</td></tr>' +
          '          <tr><td style="font-weight: 700; color: #475569; padding-top: 6px; border-top: 1px dashed #e2e8f0;">Painéis:</td><td style="padding-top: 6px; border-top: 1px dashed #e2e8f0;"><strong>' +
          pDesc +
          '</strong></td></tr>' +
          '          <tr><td style="font-weight: 700; color: #475569;">Inversor:</td><td><strong>' +
          iDesc +
          '</strong></td></tr>' +
          '          <tr><td style="font-weight: 700; color: #475569;">Instalação:</td><td><span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-weight: 700;">' +
          tInstalacao +
          tEstrutura +
          '</span></td></tr>' +
          '        </table>' +
          '      </div>'
      }

      const htmlBody =
        '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px 16px; background-color: #f8fafc;">' +
        '  <div style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">' +
        '    <div style="background: linear-gradient(135deg, #0B7A5B 0%, #095C44 100%); padding: 26px 24px; text-align: center; color: #ffffff;">' +
        '      <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Ecosolar Energy — Engenharia</h1>' +
        '      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.92; font-weight: 500;">' +
        (isReenvio
          ? 'Atualização de Dossiê e Documentos do Cliente'
          : 'Novo Dossiê e Documentos para Elaboração de Projeto') +
        '</p>' +
        '    </div>' +
        '    <div style="padding: 24px; color: #1e293b; line-height: 1.6;">' +
        '      <p style="margin-top: 0; font-size: 15px;">Olá, Eng. <strong>' +
        engNome +
        '</strong>!</p>' +
        '      <p style="font-size: 14px; color: #475569;">' +
        remetenteNome +
        (isReenvio
          ? ' atualizou e reenviou as informações negociadas e os documentos do lead '
          : ' acabou de enviar o dossiê técnico e os documentos do lead ') +
        '<strong>' +
        leadNome +
        '</strong> para você elaborar o projeto e solicitar a homologação junto à concessionária.' +
        '      </p>' +
        dossieHtmlBlock +
        '      <div style="margin: 18px 0; padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">' +
        '        <div style="font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 8px;">Arquivos Anexados (' +
        docsAtualizadosCount +
        ' total)</div>' +
        '        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #064e3b; line-height: 1.7;">' +
        '          <li>Documentos Pessoais do Cliente: <strong>' +
        countPessoais +
        '</strong> arquivo(s)</li>' +
        '          <li>Conta de Energia Elétrica: <strong>' +
        countConta +
        '</strong> arquivo(s)</li>' +
        '          <li>Datasheet dos Equipamentos: <strong>' +
        countDatasheet +
        '</strong> arquivo(s)</li>' +
        '          <li>Procuração Assinada: <strong>' +
        countProc +
        '</strong> arquivo(s)</li>' +
        '        </ul>' +
        (observacao
          ? '        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #86efac; font-size: 12px; color: #14532d;"><strong>Observações:</strong> ' +
            observacao +
            '</div>'
          : '') +
        '      </div>' +
        '      <div style="margin: 24px 0 16px 0; text-align: center;">' +
        '        <a href="' +
        appDocsUrl +
        '" target="_blank" style="background-color: #0B7A5B; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(11, 122, 91, 0.25);">' +
        '          Acessar Meus Documentos no CRM &rarr;' +
        '        </a>' +
        '      </div>' +
        '      <p style="font-size: 11px; color: #64748b; text-align: center; margin-top: 14px;">' +
        '        Você tem permissão exclusiva para visualizar o dossiê técnico e baixar todos os documentos anexados.' +
        '      </p>' +
        '    </div>' +
        '    <div style="padding: 14px 20px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">' +
        '      Ecosolar Energy • Módulo de Engenharia Solar • Enviado em ' +
        dataFormatadaPt +
        '    </div>' +
        '  </div>' +
        '</div>'

      if (engEmail) {
        const mailClient = $app.newMailClient()
        const message = new MailerMessage({
          from: {
            address: senderAddr,
            name: senderName,
          },
          to: [{ address: engEmail }],
          subject:
            (isReenvio ? '[REENVIO] ' : '') +
            'Dossiê Técnico & Documentos: ' +
            leadNome +
            ' para Engenharia',
          html: htmlBody,
        })
        mailClient.send(message)
        emailEnviado = true
        console.log('[enviar_engenheiro] E-mail enviado com sucesso para ' + engEmail)
      }
    } catch (mailErr) {
      emailEnviado = false
      emailErroMsg = mailErr && mailErr.message ? mailErr.message : String(mailErr)
      console.error('[enviar_engenheiro] Falha ao enviar e-mail:', mailErr)
    }

    return e.json(200, {
      success: true,
      message: isReenvio
        ? 'Dossiê técnico e documentos reenviados ao engenheiro ' + engNome + ' com sucesso!'
        : 'Dossiê técnico e documentos enviados ao engenheiro ' + engNome + ' com sucesso!',
      total_documentos: docsAtualizadosCount,
      dossie_id: dossieIdSalvo,
      dossie_versao: dossieVersaoSalva,
      engenheiro: {
        id: engenheiroId,
        nome: engNome,
        email: engEmail,
      },
      email_enviado: emailEnviado,
      email_erro: emailErroMsg || undefined,
      data_envio: dataFormatadaPt,
    })
  },
  $apis.requireAuth(),
)
