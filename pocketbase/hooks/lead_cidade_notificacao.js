// Hook após criação com sucesso de um lead
// Dispara notificações no CRM e e-mail transacional para vendedores com cidade_atuacao compatível
// Regras:
// 1. Dispara em onRecordAfterCreateSuccess('leads')
// 2. Extrai a cidade do lead recém-criado. Se vazia, encerra silenciosamente.
// 3. Normalização case-insensitive e acento-insensitive (remoção de acentos/pontuação).
// 4. Busca todos os usuários ativos com cidade_atuacao preenchida.
// 5. Suporta vendedores com múltiplas cidades separadas por vírgula ou ponto-e-vírgula ou barra.
// 6. Anti-duplicidade: verifica se já existe notificação com tipo 'lead_cidade' para o par (usuario, lead).
// 7. Salva notificação na collection 'notificacoes'.
// 8. Envia e-mail transacional via $app.newMailClient() com o mesmo padrão visual da Ecosolar Energy.
// 9. Resiliente: falhas de envio de e-mail não quebram o fluxo nem o lead.
// 10. Todo o código contido dentro da callback para evitar scoping traps do PocketBase v0.36 / Goja.

onRecordAfterCreateSuccess((e) => {
  try {
    const lead = e.record
    if (!lead) {
      e.next()
      return
    }

    const leadCidadeRaw = lead.getString('cidade') || ''
    if (!leadCidadeRaw || leadCidadeRaw.trim() === '') {
      // Sem cidade informada no lead: silencioso
      e.next()
      return
    }

    // Função interna para normalizar strings (remover acentos, minúsculas, aparar espaços)
    const normalizar = (str) => {
      if (!str || typeof str !== 'string') return ''
      let s = str.toLowerCase().trim()
      // Mapa de substituição de acentos
      const mapaAcentos = {
        á: 'a',
        à: 'a',
        ã: 'a',
        â: 'a',
        ä: 'a',
        é: 'e',
        è: 'e',
        ê: 'e',
        ë: 'e',
        í: 'i',
        ì: 'i',
        î: 'i',
        ï: 'i',
        ó: 'o',
        ò: 'o',
        õ: 'o',
        ô: 'o',
        ö: 'o',
        ú: 'u',
        ù: 'u',
        û: 'u',
        ü: 'u',
        ç: 'c',
        ñ: 'n',
      }
      for (const acento in mapaAcentos) {
        const regex = new RegExp(acento, 'g')
        s = s.replace(regex, mapaAcentos[acento])
      }
      return s.replace(/[^a-z0-9]/g, '')
    }

    const leadCidadeNorm = normalizar(leadCidadeRaw)
    if (!leadCidadeNorm) {
      e.next()
      return
    }

    // Dados informativos do lead
    const leadId = lead.id
    const leadNome = lead.getString('nome') || 'Novo Lead'
    const leadTelefone = lead.getString('telefone') || 'Não informado'
    const leadBairro = lead.getString('bairro') || ''
    const leadValorConta = lead.getFloat('valor_conta_reais') || 0
    const leadConsumo = lead.getFloat('consumo_mensal_kwh') || 0

    // Buscar usuários que possam ter a cidade de atuação configurada
    let users = []
    try {
      users = $app.findRecordsByFilter('_pb_users_auth_', "cidade_atuacao != ''", '', 200, 0)
    } catch (usersErr) {
      console.error(
        '[lead_cidade_notificacao] Erro ao buscar usuários com cidade_atuacao:',
        usersErr,
      )
      e.next()
      return
    }

    if (!users || users.length === 0) {
      e.next()
      return
    }

    // Filtrar usuários cuja cidade_atuacao case/acento-insensitive casa com o lead
    const usuariosCasados = []
    for (let u = 0; u < users.length; u++) {
      const user = users[u]
      const cidadeAtuacaoRaw = user.getString('cidade_atuacao') || ''
      if (!cidadeAtuacaoRaw) continue

      // Pode conter múltiplas cidades separadas por vírgula, ponto-e-vírgula ou barra
      const cidadesVendedor = cidadeAtuacaoRaw.split(/[,;/]+/)
      let casou = false
      for (let c = 0; c < cidadesVendedor.length; c++) {
        const candNorm = normalizar(cidadesVendedor[c])
        if (candNorm && candNorm === leadCidadeNorm) {
          casou = true
          break
        }
      }

      if (casou) {
        usuariosCasados.push(user)
      }
    }

    if (usuariosCasados.length === 0) {
      // Nenhuma cidade casou: silencioso
      e.next()
      return
    }

    console.log(
      '[lead_cidade_notificacao] Encontrado(s) ' +
        usuariosCasados.length +
        ' vendedor(es) para a cidade ' +
        leadCidadeRaw +
        ' (Lead: ' +
        leadId +
        ' - ' +
        leadNome +
        ')',
    )

    // Collection notificacoes
    let notifCol = null
    try {
      notifCol = $app.findCollectionByNameOrId('notificacoes')
    } catch (colErr) {
      console.error(
        '[lead_cidade_notificacao] Coleção notificacoes não encontrada ou migration pendente:',
        colErr,
      )
      e.next()
      return
    }

    // Configurações de e-mail transacional
    const metaSettings = $app.settings().meta || {}
    const senderAddr = metaSettings.senderAddress || 'no-reply@goskip.dev'
    const senderName = metaSettings.senderName || 'Ecosolar Energy CRM'
    const crmLeadUrl = 'https://crm-de-vendas-solar-dce30.goskip.app/leads/' + leadId

    let mailClient = null
    try {
      mailClient = $app.newMailClient()
    } catch (mcErr) {
      console.warn('[lead_cidade_notificacao] Cliente de e-mail indisponível:', mcErr)
    }

    const tituloNotificacao = 'Novo Lead na sua cidade: ' + leadCidadeRaw
    const mensagemNotificacao =
      'O lead ' +
      leadNome +
      ' de ' +
      leadCidadeRaw +
      (leadBairro ? ' (Bairro: ' + leadBairro + ')' : '') +
      ' acabou de entrar no CRM. Entre em contato!'

    // Iterar para cada vendedor correspondente
    for (let idx = 0; idx < usuariosCasados.length; idx++) {
      const vendedor = usuariosCasados[idx]
      const vendedorId = vendedor.id
      const vendedorEmail = vendedor.getString('email') || ''
      const vendedorNome = vendedor.getString('name') || vendedorEmail || 'Vendedor'

      // 1. Anti-duplicidade: verificar se já existe notificação para este par vendedor + lead
      let jaNotificado = false
      try {
        const existentes = $app.findRecordsByFilter(
          'notificacoes',
          "usuario = '" + vendedorId + "' && lead = '" + leadId + "' && tipo = 'lead_cidade'",
          '',
          1,
          0,
        )
        if (existentes && existentes.length > 0) {
          jaNotificado = true
        }
      } catch (_) {}

      if (jaNotificado) {
        console.log(
          '[lead_cidade_notificacao] Vendedor ' +
            vendedorId +
            ' já foi notificado sobre lead ' +
            leadId +
            '. Ignorando duplicata.',
        )
        continue
      }

      // 2. Criar registro de notificação
      try {
        const notifRec = new Record(notifCol)
        notifRec.set('usuario', vendedorId)
        notifRec.set('lead', leadId)
        notifRec.set('titulo', tituloNotificacao)
        notifRec.set('mensagem', mensagemNotificacao)
        notifRec.set('tipo', 'lead_cidade')
        notifRec.set('lida', false)
        notifRec.set('lead_nome', leadNome)
        notifRec.set('lead_cidade', leadCidadeRaw)
        notifRec.set('lead_bairro', leadBairro || 'Não informado')
        notifRec.set('lead_telefone', leadTelefone)
        notifRec.set(
          'metadados',
          JSON.stringify({
            cidade_atuacao_vendedor: vendedor.getString('cidade_atuacao'),
            valor_conta: leadValorConta,
            consumo_kwh: leadConsumo,
            timestamp: new Date().toISOString(),
          }),
        )

        $app.save(notifRec)
        console.log(
          '[lead_cidade_notificacao] Notificação criada com sucesso no CRM para ' +
            vendedorNome +
            ' (' +
            vendedorId +
            ')',
        )
      } catch (saveNotifErr) {
        console.error(
          '[lead_cidade_notificacao] Erro ao salvar notificação para usuário ' + vendedorId + ':',
          saveNotifErr,
        )
      }

      // 3. Disparo de e-mail transacional para o vendedor
      if (mailClient && vendedorEmail) {
        const htmlBody =
          '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px 16px; background-color: #f8fafc;">' +
          '  <div style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">' +
          '    <div style="background: linear-gradient(135deg, #0B7A5B 0%, #095C44 100%); padding: 26px 24px; text-align: center; color: #ffffff;">' +
          '      <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Ecosolar Energy</h1>' +
          '      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.92; font-weight: 500;">Novo Lead na sua Cidade de Atuação</p>' +
          '    </div>' +
          '    <div style="padding: 24px; color: #1e293b; line-height: 1.6;">' +
          '      <p style="margin-top: 0; font-size: 15px;">Olá, <strong>' +
          vendedorNome +
          '</strong>!</p>' +
          '      <p style="font-size: 14px; color: #475569;">' +
          '        Um novo lead compatível com sua cidade de atuação (<strong>' +
          leadCidadeRaw +
          '</strong>) acabou de ser cadastrado no CRM da Ecosolar Energy:' +
          '      </p>' +
          '      <div style="margin: 18px 0; padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">' +
          '        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">' +
          '          <tr><td style="padding: 6px 0; color: #166534; font-weight: bold; width: 35%;">Nome do Lead:</td><td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-size: 14px;">' +
          leadNome +
          '</td></tr>' +
          '          <tr><td style="padding: 6px 0; color: #166534; font-weight: bold;">Cidade / Bairro:</td><td style="padding: 6px 0; color: #0f172a; font-weight: 600;">' +
          leadCidadeRaw +
          (leadBairro ? ' — Bairro ' + leadBairro : '') +
          '</td></tr>' +
          '          <tr><td style="padding: 6px 0; color: #166534; font-weight: bold;">Telefone / WhatsApp:</td><td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 600;">' +
          leadTelefone +
          '</td></tr>' +
          (leadValorConta > 0
            ? '          <tr><td style="padding: 6px 0; color: #166534; font-weight: bold;">Valor Médio da Conta:</td><td style="padding: 6px 0; color: #0B7A5B; font-weight: 700;">R$ ' +
              leadValorConta.toFixed(2) +
              '</td></tr>'
            : '') +
          (leadConsumo > 0
            ? '          <tr><td style="padding: 6px 0; color: #166534; font-weight: bold;">Consumo Estimado:</td><td style="padding: 6px 0; color: #0f172a;">' +
              leadConsumo +
              ' kWh/mês</td></tr>'
            : '') +
          '        </table>' +
          '      </div>' +
          '      <div style="margin: 24px 0 16px 0; text-align: center;">' +
          '        <a href="' +
          crmLeadUrl +
          '" target="_blank" style="background-color: #0B7A5B; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(11, 122, 91, 0.25);">' +
          '          Abrir Lead no CRM &rarr;' +
          '        </a>' +
          '      </div>' +
          '      <p style="font-size: 11px; color: #64748b; text-align: center; margin-top: 14px;">' +
          '        Acesse o CRM para iniciar o primeiro contato, registrar anotações e enviar propostas comerciais.' +
          '      </p>' +
          '    </div>' +
          '    <div style="padding: 14px 20px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">' +
          '      Ecosolar Energy CRM • Notificação automática de direcionamento regional' +
          '    </div>' +
          '  </div>' +
          '</div>'

        try {
          const emailMessage = new MailerMessage({
            from: {
              address: senderAddr,
              name: senderName,
            },
            to: [{ address: vendedorEmail }],
            subject: 'Novo Lead na sua cidade (' + leadCidadeRaw + '): ' + leadNome,
            html: htmlBody,
          })

          mailClient.send(emailMessage)
          console.log(
            '[lead_cidade_notificacao] E-mail de notificação enviado para ' +
              vendedorEmail +
              ' (Lead: ' +
              leadId +
              ')',
          )
        } catch (mailSendErr) {
          console.error(
            '[lead_cidade_notificacao] Falha ao enviar e-mail para ' + vendedorEmail + ':',
            mailSendErr,
          )
        }
      }

      // 4. Disparo opcional de notificação via WhatsApp para o vendedor (best-effort)
      const vendedorTelefoneRaw = vendedor.getString('telefone') || ''
      if (vendedorTelefoneRaw) {
        let vendedorTelefoneNorm = vendedorTelefoneRaw.replace(/\D/g, '')
        if (
          vendedorTelefoneNorm.startsWith('0') &&
          (vendedorTelefoneNorm.length === 11 || vendedorTelefoneNorm.length === 12)
        ) {
          vendedorTelefoneNorm = vendedorTelefoneNorm.slice(1)
        }
        if (
          !vendedorTelefoneNorm.startsWith('55') &&
          (vendedorTelefoneNorm.length === 10 || vendedorTelefoneNorm.length === 11)
        ) {
          vendedorTelefoneNorm = '55' + vendedorTelefoneNorm
        }

        if (vendedorTelefoneNorm) {
          // Obter configurações da Evolution API
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
            const msgTexto =
              '☀️ *Ecosolar CRM — Novo Lead na sua Cidade!*\n\n' +
              'Olá, ' +
              vendedorNome +
              '!\n' +
              'Um novo lead compatível com *' +
              leadCidadeRaw +
              '* acabou de entrar no CRM:\n\n' +
              '👤 *Nome:* ' +
              leadNome +
              '\n' +
              '📍 *Local:* ' +
              leadCidadeRaw +
              (leadBairro ? ' (Bairro: ' + leadBairro + ')' : '') +
              '\n' +
              '📱 *Telefone:* ' +
              leadTelefone +
              '\n' +
              (leadValorConta > 0
                ? '💰 *Conta de Energia:* R$ ' + leadValorConta.toFixed(2) + '\n'
                : '') +
              (leadConsumo > 0 ? '⚡ *Consumo:* ' + leadConsumo + ' kWh/mês\n' : '') +
              '\n🔗 *Acessar no CRM:* ' +
              crmLeadUrl

            try {
              const evoSendRes = $http.send({
                url: evoUrl + '/message/sendText/' + encodeURIComponent(evoInst),
                method: 'POST',
                headers: {
                  apikey: evoKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  number: vendedorTelefoneNorm,
                  text: msgTexto,
                }),
                timeout: 10,
              })

              if (evoSendRes.statusCode >= 200 && evoSendRes.statusCode < 300) {
                console.log(
                  '[lead_cidade_notificacao] WhatsApp enviado com sucesso para vendedor ' +
                    vendedorNome +
                    ' (' +
                    vendedorTelefoneNorm +
                    ')',
                )
              } else {
                console.warn(
                  '[lead_cidade_notificacao] Falha ao enviar WhatsApp para vendedor: Status ' +
                    evoSendRes.statusCode,
                )
              }
            } catch (evoErr) {
              console.error(
                '[lead_cidade_notificacao] Erro de rede ao disparar WhatsApp para vendedor:',
                evoErr,
              )
            }
          } else {
            console.log(
              '[lead_cidade_notificacao] Notificação WhatsApp para vendedor ignorada: Evolution API não configurada.',
            )
          }
        }
      }
    }
  } catch (globalErr) {
    console.error('[lead_cidade_notificacao] Erro não tratado no hook:', globalErr)
  }

  e.next()
}, 'leads')
