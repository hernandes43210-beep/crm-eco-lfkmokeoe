// Hook para criação e envio automatizado de e-mail de convite de membros
// POST /backend/v1/equipe/convidar (Admin only)
// POST /backend/v1/equipe/reenviar-convite (Admin only)
//
// Regras e garantias:
// 1. Acesso restrito a usuários autenticados com role Admin.
// 2. Destinatário: e-mail digitado no formulário ou ecosolarenergy2022@gmail.com se vazio.
// 3. E-mail em português com nome do convidado, código de 6 caracteres em destaque, link completo
//    (https://crm-de-vendas-solar-dce30.goskip.app/cadastro) e instruções passo a passo.
// 4. Se o convite já existir (mesmo e-mail ou mesmo código) e já tiver tido e-mail enviado,
//    evita reenvio inadvertido na criação normal.
// 5. Degradação graciosa: se o envio de e-mail falhar, o convite ainda é criado e retornado
//    com email_enviado: false e mensagem de erro explicativa em português.
// 6. Todas as declarações de variáveis e funções de montagem de HTML estão encapsuladas dentro
//    do handler (evitando scoping traps do PocketBase / Goja).

routerAdd(
  'POST',
  '/backend/v1/equipe/convidar',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { success: false, message: 'Usuário não autenticado.' })
    }

    if (auth.getString('role') !== 'Admin') {
      return e.json(403, {
        success: false,
        message: 'Apenas administradores podem convidar membros para a equipe.',
      })
    }

    const body = e.requestInfo().body || {}
    const rawNome = typeof body.nome === 'string' ? body.nome.trim() : ''
    let rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const rawRole =
      typeof body.role === 'string' &&
      (body.role === 'Admin' || body.role === 'Vendedor' || body.role === 'Engenheiro')
        ? body.role
        : 'Vendedor'
    let rawCodigo =
      typeof body.codigo_convite === 'string' ? body.codigo_convite.trim().toUpperCase() : ''

    // Se o e-mail não for informado no formulário, usar o padrão ecosolarenergy2022@gmail.com
    if (!rawEmail) {
      rawEmail = 'ecosolarenergy2022@gmail.com'
    }

    // Se não forneceu código de 6 caracteres, gerar SOL + 3 alfanuméricos
    if (!rawCodigo || rawCodigo.length !== 6) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let gen = 'SOL'
      for (let c = 0; c < 3; c++) {
        gen += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      rawCodigo = gen
    }

    // 1. Verificar se já existe registro em convidados com esse e-mail ou código
    let existingInvite = null
    try {
      existingInvite = $app.findFirstRecordByData('convidados', 'email', rawEmail)
    } catch (_) {
      try {
        existingInvite = $app.findFirstRecordByData('convidados', 'codigo_convite', rawCodigo)
      } catch (_) {}
    }

    const col = $app.findCollectionByNameOrId('convidados')
    let inviteRecord = existingInvite

    if (!inviteRecord) {
      inviteRecord = new Record(col)
      inviteRecord.set('email', rawEmail)
      inviteRecord.set('codigo_convite', rawCodigo)
      inviteRecord.set('nome', rawNome)
      inviteRecord.set('role', rawRole)
      inviteRecord.set('ativo', true)
      inviteRecord.set('email_enviado', false)
      try {
        $app.save(inviteRecord)
      } catch (saveErr) {
        return e.json(400, {
          success: false,
          message: 'Não foi possível cadastrar o convite: ' + saveErr.message,
        })
      }
    } else {
      // Se o convite já existia, atualizar campos se o usuário estiver recriando/regenerando
      inviteRecord.set('nome', rawNome || inviteRecord.getString('nome'))
      inviteRecord.set('role', rawRole)
      inviteRecord.set('codigo_convite', rawCodigo)
      inviteRecord.set('ativo', true)
      try {
        $app.save(inviteRecord)
      } catch (updErr) {
        return e.json(400, {
          success: false,
          message: 'Erro ao atualizar convite existente: ' + updErr.message,
        })
      }
    }

    const inviteId = inviteRecord.id
    const finalEmail = inviteRecord.getString('email') || rawEmail
    const finalNome = inviteRecord.getString('nome') || rawNome || 'Colaborador(a)'
    const finalCodigo = inviteRecord.getString('codigo_convite') || rawCodigo
    const finalRole = inviteRecord.getString('role') || rawRole

    // Verificação de anti-duplicidade: se este convite já teve e-mail enviado e o flag está ativo
    const jaEnviado = inviteRecord.getBool('email_enviado')
    if (jaEnviado && !body.forcar_reenvio) {
      console.log(
        '[convites] E-mail já enviado anteriormente para convite ' +
          inviteId +
          ' (' +
          finalEmail +
          '). Envio ignorado.',
      )
      return e.json(200, {
        success: true,
        convite: {
          id: inviteId,
          nome: finalNome,
          email: finalEmail,
          role: finalRole,
          codigo_convite: finalCodigo,
          ativo: inviteRecord.getBool('ativo'),
          email_enviado: true,
          email_enviado_em: inviteRecord.getString('email_enviado_em'),
          email_destinatario: inviteRecord.getString('email_destinatario') || finalEmail,
        },
        email_status: 'duplicado_ignorado',
        email_mensagem:
          'O e-mail de convite já havia sido enviado anteriormente para ' + finalEmail + '.',
      })
    }

    // 2. Montar e disparar e-mail transacional
    const metaSettings = $app.settings().meta || {}
    const senderAddr = metaSettings.senderAddress || 'no-reply@goskip.dev'
    const senderName = metaSettings.senderName || 'Ecosolar Energy CRM'
    const cadastroUrl = 'https://crm-de-vendas-solar-dce30.goskip.app/cadastro'

    const htmlBody =
      '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px 16px; background-color: #f8fafc;">' +
      '  <div style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">' +
      '    <div style="background: linear-gradient(135deg, #0B7A5B 0%, #095C44 100%); padding: 28px 24px; text-align: center; color: #ffffff;">' +
      '      <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Ecosolar Energy</h1>' +
      '      <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.92; font-weight: 500;">Convite de Acesso ao CRM de Vendas Solares</p>' +
      '    </div>' +
      '    <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">' +
      '      <p style="margin-top: 0; font-size: 16px;">Olá, <strong>' +
      finalNome +
      '</strong>!</p>' +
      '      <p style="font-size: 14px; color: #475569;">' +
      '        Você foi convidado(a) para fazer parte da equipe comercial da <strong>Ecosolar Energy</strong> no CRM com a função de <strong>' +
      finalRole +
      '</strong>.' +
      '      </p>' +
      '      <div style="margin: 24px 0; padding: 20px; background-color: #f0fdf4; border: 2px dashed #86efac; border-radius: 10px; text-align: center;">' +
      '        <div style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">Seu Código de Convite Exclusivo</div>' +
      '        <div style="font-family: monospace; font-size: 32px; font-weight: 900; color: #064e3b; letter-spacing: 6px; padding: 8px 12px; background: #ffffff; border-radius: 8px; display: inline-block; border: 1px solid #bbf7d0;">' +
      finalCodigo +
      '        </div>' +
      '        <p style="margin: 8px 0 0 0; font-size: 12px; color: #15803d;">Guarde este código para ativar o seu usuário no sistema.</p>' +
      '      </div>' +
      '      <div style="margin-top: 24px; padding: 18px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">' +
      '        <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #0f172a;">Passo a passo para concluir o seu cadastro:</h3>' +
      '        <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.7;">' +
      '          <li>Clique no botão verde abaixo para abrir a página de cadastro oficial;</li>' +
      '          <li>Preencha o seu nome completo e crie uma senha segura (mínimo de 8 caracteres);</li>' +
      '          <li>Cole ou digite o código <strong>' +
      finalCodigo +
      '</strong> no campo <em>"Código de Convite"</em>;</li>' +
      '          <li>Confirme e acesse o CRM imediatamente com todas as ferramentas de vendas liberadas.</li>' +
      '        </ol>' +
      '      </div>' +
      '      <div style="margin: 28px 0 20px 0; text-align: center;">' +
      '        <a href="' +
      cadastroUrl +
      '" target="_blank" style="background-color: #0B7A5B; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(11, 122, 91, 0.25);">' +
      '          Acessar Página de Cadastro &rarr;' +
      '        </a>' +
      '      </div>' +
      '      <p style="font-size: 11px; color: #64748b; text-align: center; word-break: break-all; margin-top: 14px;">' +
      '        Link alternativo direto: <a href="' +
      cadastroUrl +
      '" style="color: #0B7A5B;">' +
      cadastroUrl +
      '</a>' +
      '      </p>' +
      '    </div>' +
      '    <div style="padding: 16px 24px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">' +
      '      Ecosolar Energy • Sistema CRM de Vendas Solares • Mensagem enviada automaticamente para ' +
      finalEmail +
      '    </div>' +
      '  </div>' +
      '</div>'

    let mailSent = false
    let mailErrorMsg = ''

    try {
      const mailClient = $app.newMailClient()
      const message = new MailerMessage({
        from: {
          address: senderAddr,
          name: senderName,
        },
        to: [{ address: finalEmail }],
        subject: 'Convite para o CRM Ecosolar Energy - Código de Acesso: ' + finalCodigo,
        html: htmlBody,
      })

      mailClient.send(message)
      mailSent = true
      console.log(
        '[convites] E-mail de convite enviado com sucesso para ' +
          finalEmail +
          ' (Código: ' +
          finalCodigo +
          ')',
      )
    } catch (mailErr) {
      mailSent = false
      mailErrorMsg = mailErr && mailErr.message ? mailErr.message : String(mailErr)
      console.error(
        '[convites] Falha ao enviar e-mail de convite para ' + finalEmail + ':',
        mailErr,
      )
    }

    const nowIso = new Date().toISOString()
    if (mailSent) {
      inviteRecord.set('email_enviado', true)
      inviteRecord.set('email_enviado_em', nowIso)
      inviteRecord.set('email_destinatario', finalEmail)
      inviteRecord.set('email_erro', '')
    } else {
      inviteRecord.set('email_enviado', false)
      inviteRecord.set('email_erro', mailErrorMsg.slice(0, 500))
    }

    try {
      $app.save(inviteRecord)
    } catch (savePostErr) {
      console.error(
        '[convites] Erro ao persistir status de envio de e-mail no convite:',
        savePostErr,
      )
    }

    if (mailSent) {
      return e.json(200, {
        success: true,
        convite: {
          id: inviteId,
          nome: finalNome,
          email: finalEmail,
          role: finalRole,
          codigo_convite: finalCodigo,
          ativo: inviteRecord.getBool('ativo'),
          email_enviado: true,
          email_enviado_em: nowIso,
          email_destinatario: finalEmail,
        },
        email_status: 'sucesso',
        email_mensagem: 'E-mail de convite enviado com sucesso para ' + finalEmail,
      })
    } else {
      // Degradação graciosa: o código foi criado com sucesso, mas o e-mail falhou
      return e.json(200, {
        success: true,
        convite: {
          id: inviteId,
          nome: finalNome,
          email: finalEmail,
          role: finalRole,
          codigo_convite: finalCodigo,
          ativo: inviteRecord.getBool('ativo'),
          email_enviado: false,
          email_enviado_em: '',
          email_destinatario: finalEmail,
          email_erro: mailErrorMsg,
        },
        email_status: 'erro',
        email_mensagem:
          'Convite gerado com sucesso, porém o envio do e-mail falhou (' +
          (mailErrorMsg || 'serviço indisponível') +
          '). Copie o código manualmente e envie ao colaborador.',
      })
    }
  },
  $apis.requireAuth(),
)

// Endpoint auxiliar para forçar reenvio manual do e-mail do convite
routerAdd(
  'POST',
  '/backend/v1/equipe/reenviar-convite',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { success: false, message: 'Usuário não autenticado.' })
    }

    if (auth.getString('role') !== 'Admin') {
      return e.json(403, {
        success: false,
        message: 'Apenas administradores podem reenviar convites.',
      })
    }

    const body = e.requestInfo().body || {}
    const inviteId = typeof body.id === 'string' ? body.id.trim() : ''

    if (!inviteId) {
      return e.json(400, { success: false, message: 'ID do convite não fornecido.' })
    }

    let inviteRecord = null
    try {
      inviteRecord = $app.findCollectionByNameOrId('convidados')
      inviteRecord = $app.findFirstRecordByData('convidados', 'id', inviteId)
    } catch (_) {
      return e.json(404, { success: false, message: 'Convite não encontrado.' })
    }

    const finalEmail = inviteRecord.getString('email') || 'ecosolarenergy2022@gmail.com'
    const finalNome = inviteRecord.getString('nome') || 'Colaborador(a)'
    const finalCodigo = inviteRecord.getString('codigo_convite')
    const finalRole = inviteRecord.getString('role') || 'Vendedor'

    const metaSettings = $app.settings().meta || {}
    const senderAddr = metaSettings.senderAddress || 'no-reply@goskip.dev'
    const senderName = metaSettings.senderName || 'Ecosolar Energy CRM'
    const cadastroUrl = 'https://crm-de-vendas-solar-dce30.goskip.app/cadastro'

    const htmlBody =
      '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px 16px; background-color: #f8fafc;">' +
      '  <div style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">' +
      '    <div style="background: linear-gradient(135deg, #0B7A5B 0%, #095C44 100%); padding: 28px 24px; text-align: center; color: #ffffff;">' +
      '      <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Ecosolar Energy</h1>' +
      '      <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.92; font-weight: 500;">Reenvio de Convite de Acesso ao CRM</p>' +
      '    </div>' +
      '    <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">' +
      '      <p style="margin-top: 0; font-size: 16px;">Olá, <strong>' +
      finalNome +
      '</strong>!</p>' +
      '      <p style="font-size: 14px; color: #475569;">' +
      '        Lembramos que o seu convite de acesso ao CRM de Vendas Solares da <strong>Ecosolar Energy</strong> (' +
      finalRole +
      ') está disponível.' +
      '      </p>' +
      '      <div style="margin: 24px 0; padding: 20px; background-color: #f0fdf4; border: 2px dashed #86efac; border-radius: 10px; text-align: center;">' +
      '        <div style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">Seu Código de Convite Exclusivo</div>' +
      '        <div style="font-family: monospace; font-size: 32px; font-weight: 900; color: #064e3b; letter-spacing: 6px; padding: 8px 12px; background: #ffffff; border-radius: 8px; display: inline-block; border: 1px solid #bbf7d0;">' +
      finalCodigo +
      '        </div>' +
      '      </div>' +
      '      <div style="margin: 28px 0 20px 0; text-align: center;">' +
      '        <a href="' +
      cadastroUrl +
      '" target="_blank" style="background-color: #0B7A5B; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(11, 122, 91, 0.25);">' +
      '          Acessar Página de Cadastro &rarr;' +
      '        </a>' +
      '      </div>' +
      '    </div>' +
      '    <div style="padding: 16px 24px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">' +
      '      Ecosolar Energy • Mensagem reenviada para ' +
      finalEmail +
      '    </div>' +
      '  </div>' +
      '</div>'

    let mailSent = false
    let mailErrorMsg = ''
    try {
      const mailClient = $app.newMailClient()
      const message = new MailerMessage({
        from: {
          address: senderAddr,
          name: senderName,
        },
        to: [{ address: finalEmail }],
        subject: 'Lembrete de Convite CRM Ecosolar Energy - Código: ' + finalCodigo,
        html: htmlBody,
      })
      mailClient.send(message)
      mailSent = true
      console.log('[convites] E-mail de convite reenviado para ' + finalEmail)
    } catch (err) {
      mailSent = false
      mailErrorMsg = err && err.message ? err.message : String(err)
      console.error('[convites] Falha ao reenviar convite para ' + finalEmail + ':', err)
    }

    const nowIso = new Date().toISOString()
    if (mailSent) {
      inviteRecord.set('email_enviado', true)
      inviteRecord.set('email_enviado_em', nowIso)
      inviteRecord.set('email_destinatario', finalEmail)
      inviteRecord.set('email_erro', '')
      inviteRecord.set('ativo', true)
      try {
        $app.save(inviteRecord)
      } catch (_) {}

      return e.json(200, {
        success: true,
        email_status: 'sucesso',
        email_mensagem: 'Convite reenviado com sucesso para ' + finalEmail,
        convite: {
          id: inviteId,
          email_enviado: true,
          email_enviado_em: nowIso,
          email_destinatario: finalEmail,
        },
      })
    } else {
      inviteRecord.set('email_erro', mailErrorMsg.slice(0, 500))
      try {
        $app.save(inviteRecord)
      } catch (_) {}

      return e.json(200, {
        success: false,
        email_status: 'erro',
        email_mensagem:
          'Não foi possível reenviar o e-mail: ' + (mailErrorMsg || 'serviço indisponível'),
      })
    }
  },
  $apis.requireAuth(),
)
