// Hook: POST /backend/v1/instalacoes/enviar-instalador
// - Valida o lead e o usuário com role 'Instalador';
// - Cria o registro em 'instalacoes_instalador' (superuser — vendedores não têm create);
// - Gera o PDF do Contrato de Responsabilidade (vigência 12 meses) e envia por e-mail ao instalador;
// - Cria notificação 'instalacao' para o instalador.
// NOTE (JSVM): toda a lógica — inclusive a função pdfDoHtml e seus helpers — vive DENTRO do
// callback do routerAdd. O PocketBase executa callbacks em um pool de VM separado: declarações
// de nível superior não são acessíveis dentro do callback (ReferenceError em runtime).
routerAdd(
  'POST',
  '/backend/v1/instalacoes/enviar-instalador',
  (c) => {
    const auth = c.auth
    if (!auth || (auth.collection().name !== 'users' && auth.collection().name !== 'convidados')) {
      return c.json(401, { success: false, message: 'Não autenticado.' })
    }
    const perfil = String(auth.get('role') || '')
    if (perfil !== 'Admin' && perfil !== 'CEO') {
      return c.json(403, {
        success: false,
        message: 'Apenas Admin/CEO podem enviar ao instalador.',
      })
    }

    const body = c.requestInfo().body
    const leadId = String(body.leadId || '')
    const instaladorId = String(body.instaladorId || '')
    const clienteNome = String(body.clienteNome || '').trim()
    const enderecoCompleto = String(body.enderecoCompleto || '').trim()
    const localizacao = String(body.localizacao || '').trim()
    let datasheetsItens = body.datasheets
    if (!Array.isArray(datasheetsItens)) datasheetsItens = []
    const datasheetsLimpos = []
    for (let i = 0; i < datasheetsItens.length; i++) {
      const nome = String((datasheetsItens[i] || {}).nome || '').trim()
      const espec = String((datasheetsItens[i] || {}).especificacao || '').trim()
      if (nome && espec) datasheetsLimpos.push({ nome: nome, especificacao: espec })
    }

    if (!leadId || !instaladorId || !clienteNome || !enderecoCompleto) {
      return c.json(400, {
        success: false,
        message: 'Campos obrigatórios: leadId, instaladorId, clienteNome, enderecoCompleto.',
      })
    }

    // Valida o lead
    let lead
    try {
      lead = $app.findRecordById('leads', leadId)
    } catch (_) {
      lead = null
    }
    if (!lead) {
      return c.json(404, { success: false, message: 'Lead não encontrado.' })
    }

    // Valida o instalador (usuário ativo com role 'Instalador')
    let instalador
    try {
      instalador = $app.findRecordById('users', instaladorId)
    } catch (_) {
      instalador = null
    }
    if (!instalador || String(instalador.get('role') || '') !== 'Instalador') {
      return c.json(404, {
        success: false,
        message: 'Instalador não encontrado (usuário precisa ter a função "Instalador").',
      })
    }

    const emailInstalador = String(instalador.get('email') || '')
    if (!emailInstalador) {
      return c.json(400, { success: false, message: 'O instalador não possui e-mail cadastrado.' })
    }

    const agora = new Date()
    const dataEnvio = agora.toISOString()
    const dataVigencia = new Date(agora.getTime() + 365 * 24 * 60 * 60 * 1000)

    // Cria o registro (superuser — regra de criação pública é fechada)
    const col = $app.findCollectionByNameOrId('instalacoes_instalador')
    const rec = new Record(col)
    rec.set('lead', leadId)
    rec.set('instalador', instaladorId)
    rec.set('cliente_nome', clienteNome)
    rec.set('endereco_completo', enderecoCompleto)
    rec.set('localizacao', localizacao)
    rec.set('datasheets', JSON.stringify(datasheetsLimpos))
    rec.set('data_envio', dataEnvio)
    rec.set('status', 'pendente')
    rec.set('observacoes', '')
    rec.set('enviado_por', auth.id)
    $app.save(rec)

    // Gera o PDF do Contrato de Responsabilidade
    const esc = (t) =>
      String(t || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    const nomeInstalador = String(instalador.get('name') || emailInstalador)
    const df = (iso) => {
      try {
        const p = String(iso).split('T')[0].split('-')
        return p[2] + '/' + p[1] + '/' + p[0]
      } catch (_) {
        return String(iso || '—')
      }
    }

    const htmlContrato =
      '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">' +
      '<style>body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:12px;line-height:1.5;margin:40px}' +
      'h1{font-size:18px;text-align:center;color:#0B7A5B;margin-bottom:2px}h2{font-size:13px;margin:18px 0 6px;color:#0B7A5B}' +
      '.sub{text-align:center;font-size:11px;color:#6b7280;margin-bottom:24px}.box{border:1px solid #d1d5db;border-radius:6px;padding:10px 12px;margin:8px 0;background:#f9fafb}' +
      'p{margin:6px 0;text-align:justify}.assin{margin-top:48px;display:flex;justify-content:space-between}' +
      '.assin div{width:44%;border-top:1px solid #374151;text-align:center;padding-top:4px;font-size:11px}</style></head><body>' +
      '<h1>CONTRATO DE RESPONSABILIDADE — INSTALAÇÃO SOLAR</h1>' +
      '<p class="sub">Ecosolar Energy • Vigência de 12 (doze) meses</p>' +
      '<h2>1. IDENTIFICAÇÃO DO INSTALADOR</h2>' +
      '<div class="box"><p><strong>Nome:</strong> ' +
      esc(nomeInstalador) +
      '</p>' +
      '<p><strong>E-mail:</strong> ' +
      esc(emailInstalador) +
      '</p></div>' +
      '<h2>2. CLIENTE E LOCAL DA INSTALAÇÃO</h2>' +
      '<div class="box"><p><strong>Cliente:</strong> ' +
      esc(clienteNome) +
      '</p>' +
      '<p><strong>Endereço completo:</strong> ' +
      esc(enderecoCompleto) +
      '</p>' +
      (localizacao ? '<p><strong>Localização:</strong> ' + esc(localizacao) + '</p>' : '') +
      '</div>' +
      '<h2>3. ESCOPO DA INSTALAÇÃO</h2>' +
      '<div class="box">' +
      (datasheetsLimpos.length === 0
        ? '<p>Equipamentos a definir conforme projeto executivo.</p>'
        : (function () {
            let linhas = ''
            for (let j = 0; j < datasheetsLimpos.length; j++) {
              linhas +=
                '<p>• <strong>' +
                esc(datasheetsLimpos[j].nome) +
                ':</strong> ' +
                esc(datasheetsLimpos[j].especificacao) +
                '</p>'
            }
            return linhas
          })()) +
      '</div>' +
      '<h2>4. RESPONSABILIDADES</h2>' +
      '<p>4.1. O instalador é o responsável pela execução da instalação fotovoltaica no endereço indicado, ' +
      'observando as normas técnicas aplicáveis (NBR 5410, NBR 16149/16150 e exigências da concessionária).</p>' +
      '<p>4.2. O instalador responde pela integridade dos equipamentos sob sua guarda a partir do recebimento, ' +
      'bem como pela segurança da equipe e do local de trabalho.</p>' +
      '<p>4.3. O instalador se compromete a manter as informações do cliente confidenciais e a acessar apenas os ' +
      'dados necessários à execução da instalação.</p>' +
      '<p>4.4. Ao concluir a instalação, o instalador deve atualizar o status na plataforma para "Concluída".</p>' +
      '<h2>5. VIGÊNCIA</h2>' +
      '<p>5.1. Este contrato entra em vigor na data do envio (' +
      df(dataEnvio) +
      ') e permanece válido por ' +
      '<strong>12 (doze) meses</strong>, até ' +
      df(dataVigencia.toISOString()) +
      '.</p>' +
      '<div class="assin"><div>' +
      esc(nomeInstalador) +
      '<br/>Instalador</div>' +
      '<div>Ecosolar Energy<br/>Contratante</div></div>' +
      '</body></html>'

    // Gera os bytes de um PDF válido a partir do HTML do contrato (inline — JSVM).
    // O JSVM do PocketBase não tem renderizador HTML->PDF nativo; este gerador
    // constrói o PDF manualmente (vetores de texto quebrados por largura de linha,
    // sem suporte a CSS) — suficiente para o texto do contrato.
    const pdfDoHtml = (html) => {
      // Extrai o texto visível do HTML e o divide em parágrafos
      let texto = String(html || '')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<head[\s\S]*?<\/head>/gi, ' ')
        .replace(/<\/(p|h1|h2|div|li)>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&rarr;/g, '->')
        .replace(/&gt;/g, '>')
      const paragrafos = []
      const partes = texto.split('\n')
      for (let i = 0; i < partes.length; i++) {
        const linha = partes[i].replace(/\s+/g, ' ').trim()
        if (linha) paragrafos.push(linha)
      }

      // Página A4: 595x842 pt, margens de 56 pt
      const larguraPagina = 595.28
      const alturaPagina = 841.89
      const margem = 56
      const larguraUtil = larguraPagina - 2 * margem
      const fontSizeTitulo = 15
      const fontSizeCorpo = 10.5
      const alturaLinhaTitulo = 20
      const alturaLinha = 14.5

      // Largura média por caractere (fonte Helvetica embutida, medida conservadora)
      const larguraAprox = (t, fontSize) => String(t).length * fontSize * 0.52

      // Divide um parágrafo em linhas que caibam na largura útil
      const quebrar = (paragrafo, fontSize) => {
        const palavras = paragrafo.split(' ')
        const linhas = []
        let atual = ''
        for (let w = 0; w < palavras.length; w++) {
          const tentativa = atual ? atual + ' ' + palavras[w] : palavras[w]
          if (larguraAprox(tentativa, fontSize) <= larguraUtil) {
            atual = tentativa
          } else {
            if (atual) linhas.push(atual)
            atual = palavras[w]
          }
        }
        if (atual) linhas.push(atual)
        return linhas
      }

      // Roteiriza o conteúdo em páginas (títulos = parágrafos curtos em MAIÚSCULAS ou numerados)
      const paginas = []
      let paginaAtual = []
      let y = alturaPagina - margem
      const limite = margem + 40
      const novaPagina = () => {
        paginas.push(paginaAtual)
        paginaAtual = []
        y = alturaPagina - margem
      }
      for (let p = 0; p < paragrafos.length; p++) {
        const par = paragrafos[p]
        const ehTitulo = /^(CONTRATO DE RESPONSABILIDADE|[0-9]\.|ECOSOLAR ENERGY)/.test(par)
        const fontSize = ehTitulo ? fontSizeTitulo : fontSizeCorpo
        const alturaLinhaAtual = ehTitulo ? alturaLinhaTitulo : alturaLinha
        const linhasPar = quebrar(par, fontSize)
        for (let l = 0; l < linhasPar.length; l++) {
          if (y - alturaLinhaAtual < limite) novaPagina()
          paginaAtual.push({
            x: margem,
            y: y,
            texto: linhasPar[l],
            fontSize: fontSize,
            titulo: ehTitulo,
          })
          y -= alturaLinhaAtual
        }
        if (ehTitulo) y -= 6
      }
      paginas.push(paginaAtual)

      // Monta os objetos PDF
      const offsets = [0]
      let pdf = '%PDF-1.4\n'
      const escPdf = (t) =>
        String(t).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
      const addObj = (conteudo) => {
        const num = offsets.length
        offsets.push(pdf.length)
        pdf += num + ' 0 obj\n' + conteudo + '\nendobj\n'
        return num
      }

      const numPaginas = paginas.length
      // 1: Catalog, 2: Pages, 3..(2+n): Page, depois: Contents e Font
      const idCatalog = 1
      const idPages = 2
      const primeiroIdPagina = 3
      const idFonteTitulo = primeiroIdPagina + numPaginas
      const idFonteCorpo = idFonteTitulo + 1

      const conteudos = []
      for (let pg = 0; pg < numPaginas; pg++) {
        const ops = []
        const fluxo = paginas[pg]
        for (let k = 0; k < fluxo.length; k++) {
          const el = fluxo[k]
          const fonte = el.titulo
            ? '/F' + '1' + ' ' + el.fontSize + ' Tf'
            : '/F' + '2' + ' ' + el.fontSize + ' Tf'
          ops.push(
            'BT ' +
              fonte +
              ' 1 0 0 1 ' +
              el.x.toFixed(2) +
              ' ' +
              el.y.toFixed(2) +
              ' Tm (' +
              escPdf(el.texto) +
              ') Tj ET',
          )
        }
        conteudos.push(ops.join('\n'))
      }

      // Fonts (Helvetica standard, WinAnsi) — títulos em negrito
      addObj(
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      )
      addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')

      for (let pg2 = 0; pg2 < numPaginas; pg2++) {
        const stream = conteudos[pg2]
        const idConteudo = addObj(
          '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream',
        )
        addObj(
          '<< /Type /Page /Parent ' +
            idPages +
            ' 0 R /MediaBox [0 0 ' +
            larguraPagina.toFixed(2) +
            ' ' +
            alturaPagina.toFixed(2) +
            '] /Resources << /Font << /F1 ' +
            idFonteTitulo +
            ' 0 R /F2 ' +
            idFonteCorpo +
            ' 0 R >> >> /Contents ' +
            idConteudo +
            ' 0 R >>',
        )
      }

      const kids = []
      for (let pg3 = 0; pg3 < numPaginas; pg3++) {
        kids.push(primeiroIdPagina + 1 + pg3 + ' 0 R')
      }
      addObj('<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + numPaginas + ' >>')
      addObj('<< /Type /Catalog /Pages ' + idPages + ' 0 R >>')

      const xrefOffset = pdf.length
      const total = offsets.length - 1
      pdf += 'xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n'
      for (let o = 1; o <= total; o++) {
        let off = String(offsets[o])
        while (off.length < 10) off = '0' + off
        pdf += off + ' 00000 n \n'
      }
      pdf +=
        'trailer\n<< /Size ' +
        (total + 1) +
        ' /Root ' +
        idCatalog +
        ' 0 R >>\nstartxref\n' +
        xrefOffset +
        '\n%%EOF'

      // Converte a string (latin1) em bytes
      const bytes = new Uint8Array(pdf.length)
      for (let b = 0; b < pdf.length; b++) {
        bytes[b] = pdf.charCodeAt(b) & 0xff
      }
      return bytes
    }

    let anexos = {}
    let emailErro = ''
    try {
      const pdfBytes = pdfDoHtml(htmlContrato)
      const pdfFile = $filesystem.fileFromBytes(
        pdfBytes,
        'contrato-responsabilidade-instalador.pdf',
      )
      const reader = pdfFile.reader.open()
      anexos[pdfFile.originalName] = reader

      const message = new MailerMessage({
        from: {
          address: $app.settings().meta.senderAddress,
          name: $app.settings().meta.senderName,
        },
        to: [{ address: emailInstalador }],
        subject: 'Nova instalação atribuída — ' + clienteNome + ' (Contrato em anexo)',
        html:
          '<p>Olá, <strong>' +
          esc(nomeInstalador) +
          '</strong>!</p>' +
          '<p>Uma nova instalação solar foi atribuída a você pela Ecosolar Energy:</p>' +
          '<ul>' +
          '<li><strong>Cliente:</strong> ' +
          esc(clienteNome) +
          '</li>' +
          '<li><strong>Endereço:</strong> ' +
          esc(enderecoCompleto) +
          '</li>' +
          (localizacao
            ? '<li><strong>Localização:</strong> <a href="' +
              esc(localizacao) +
              '">abrir no mapa</a></li>'
            : '') +
          '</ul>' +
          '<p>Em anexo está o <strong>Contrato de Responsabilidade</strong> (vigência de 12 meses) desta atribuição.</p>' +
          '<p>Acesse o CRM &gt; <strong>Minhas Instalações</strong> para ver os detalhes, datasheets e atualizar o status da instalação.</p>' +
          '<p style="color:#6b7280;font-size:11px">Ecosolar Energy — A energia do futuro, hoje!</p>',
        attachments: anexos,
      })
      $app.newMailClient().send(message)
      try {
        reader.close()
      } catch (_) {}
    } catch (mailErr) {
      emailErro = String(mailErr)
      console.error('[enviar-instalador] falha no e-mail/PDF: ' + emailErro)
    }

    // Notificação do tipo 'instalacao' para o instalador
    try {
      const notifCol = $app.findCollectionByNameOrId('notificacoes')
      const notif = new Record(notifCol)
      notif.set('usuario', instaladorId)
      notif.set('tipo', 'instalacao')
      notif.set('titulo', 'Nova instalação atribuída')
      notif.set('mensagem', 'Cliente ' + clienteNome + ' — ' + enderecoCompleto)
      notif.set('lida', false)
      $app.save(notif)
    } catch (notifErr) {
      console.warn('[enviar-instalador] notificação: ' + notifErr)
    }

    return c.json(200, {
      success: true,
      message: emailErro
        ? 'Instalação registrada, mas o e-mail falhou: ' + emailErro
        : 'Instalação enviada ao instalador com o Contrato de Responsabilidade (12 meses).',
      instalacao_id: rec.id,
      instalador: { id: instaladorId, nome: nomeInstalador, email: emailInstalador },
      email_enviado: !emailErro,
      email_erro: emailErro || undefined,
      data_envio: dataEnvio,
    })
  },
  $apis.requireAuth(),
)
