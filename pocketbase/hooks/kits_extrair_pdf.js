// POST /backend/v1/kits/extrair-pdf
// Extrai dados comerciais e técnicos de uma cotação/proposta solar em PDF usando a API Google Gemini
// (com fallback ou reforço estruturado).
// Requisitos atendidos:
// - Suporte a multipart ('arquivo' ou 'pdf') ou JSON com { pdf_base64, nome_arquivo }
// - Chave Gemini obtida prioritariamente de 'integracoes_config' (chave='gemini') e fallback $os.getenv('GEMINI_API_KEY')
// - Autenticação com header 'x-goog-api-key' (compatível com chaves 'AQ.' e 'AIza')
// - Validação de tamanho máx. 15 MB e tipo PDF
// - Erros sempre em português com mensagens claras e acionáveis
// - Extração de: nome, descrição, potência_kwp, componentes, fabricante, tipo_estrutura, string_box, frete, valor_total, numero_cotacao, data, distribuidora

routerAdd(
  'POST',
  '/backend/v1/kits/extrair-pdf',
  (e) => {
    // 1. Validação de autenticação
    const auth = e.auth
    if (!auth) {
      return e.json(401, {
        error: 'Não autenticado. Faça login no CRM para extrair dados da cotação.',
        code: 'UNAUTHORIZED',
      })
    }

    // 2. Chave Gemini (prioridade: integracoes_config -> $os.getenv)
    let geminiApiKey = ''
    try {
      const records = $app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'gemini' && ativo = true",
        '-created',
        1,
        0,
      )
      if (records && records.length > 0) {
        const dbKey = (records[0].getString('api_key') || '').trim()
        if (dbKey) {
          geminiApiKey = dbKey
        }
      }
    } catch (_) {}

    if (!geminiApiKey) {
      try {
        geminiApiKey = ($os.getenv('GEMINI_API_KEY') || '').trim()
      } catch (_) {}
    }

    if (!geminiApiKey) {
      return e.json(400, {
        error:
          'Chave da API do Google Gemini não configurada. Acesse o menu Integrações do CRM para configurá-la antes de importar cotações em PDF.',
        code: 'GEMINI_API_KEY_NOT_CONFIGURED',
      })
    }

    // 3. Obtenção do conteúdo em PDF (base64)
    let pdfBase64 = ''
    let nomeArquivo = 'cotacao.pdf'
    let tamanhoBytes = 0

    // 3. Obtenção do conteúdo em PDF (base64) a partir do corpo JSON da requisição
    const reqInfo = e.requestInfo() || {}
    const body = reqInfo.body || {}
    const rawBase64 = (body.pdf_base64 || body.base64 || body.arquivo_base64 || '').trim()

    if (rawBase64) {
      // Remove eventual prefixo data:application/pdf;base64,
      pdfBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '').trim()
      tamanhoBytes = Math.round((pdfBase64.length * 3) / 4)
      if (body.nome_arquivo) {
        nomeArquivo = String(body.nome_arquivo)
      }
    }

    // Fallback: se não veio via body JSON, tenta verificar se veio multipart
    if (!pdfBase64) {
      try {
        let uploadedFiles = e.findUploadedFiles('arquivo')
        if (!uploadedFiles || uploadedFiles.length === 0) {
          uploadedFiles = e.findUploadedFiles('pdf')
        }
        if (!uploadedFiles || uploadedFiles.length === 0) {
          uploadedFiles = e.findUploadedFiles('file')
        }
        if (uploadedFiles && uploadedFiles.length > 0) {
          const fileObj = uploadedFiles[0]
          nomeArquivo = fileObj.name || nomeArquivo
        }
      } catch (_) {}
    }

    if (!pdfBase64) {
      return e.json(400, {
        error:
          'Nenhum arquivo PDF foi recebido. Selecione um arquivo de cotação em PDF para enviar.',
        code: 'MISSING_FILE',
      })
    }

    // 4. Validação de tamanho (máximo ~15 MB = 15 * 1024 * 1024 bytes)
    const MAX_BYTES = 15 * 1024 * 1024
    if (tamanhoBytes > MAX_BYTES) {
      return e.json(400, {
        error: 'PDF muito grande (máximo 15 MB). Envie uma cotação dentro do limite.',
        code: 'FILE_TOO_LARGE',
      })
    }

    // 5. Prompt de extração estruturada para o Gemini
    const systemPrompt =
      'Você é um especialista em engenharia e orçamentos de sistemas de energia solar fotovoltaica no Brasil. ' +
      'Sua tarefa é analisar a cotação/proposta comercial em PDF anexada (como cotações das distribuidoras Belenus, PHB Solar, Fortlev, Genyx, Aldo, Edeltec, WDC, Renovigi, etc.) ' +
      'e extrair com máxima fidelidade todas as informações comerciais e técnicas do kit fotovoltaico.\n\n' +
      'Retorne ESTRITAMENTE um objeto JSON válido (sem comentários, sem texto antes ou depois, sem markdown além de opcional bloco ```json ... ```) com o seguinte esquema:\n' +
      '{\n' +
      '  "distribuidora": "string (ex: Belenus, PHB Solar, etc. Se identificado)",\n' +
      '  "numero_cotacao": "string ou null (ex: 2026.040.043)",\n' +
      '  "data": "string ou null (data da cotação ex: 25/03/2026)",\n' +
      '  "nome": "string comercial sugerida para o kit no padrão Ecosolar: Kit Solar [Potência] kWp — [Marca Painel] + [Marca Inversor] — [Tipo Estrutura]",\n' +
      '  "potencia_kwp": number (potência pico do sistema em kWp, ex: 3.75),\n' +
      '  "fabricante": "string unificada fabricante/marcas ex: DMEGC / HUAWEI",\n' +
      '  "categoria": "Residencial" | "Comercial" | "Rural" (padrão "Residencial"),\n' +
      '  "tipo_estrutura": "solo_monoposte" | "mini_trilho" | "fibrocimento" | "outro",\n' +
      '  "estrutura_detalhe": "string descrevendo as linhas/arranjos de fixação encontrados no PDF (ex: 1 linha de 6 módulos em fibrocimento)",\n' +
      '  "string_box": "" | "1_entrada" | "2_entradas" | "3_entradas",\n' +
      '  "marca_painel": "string (ex: DMEGC, OSDA, TSUN POWER, Canadian Solar, BYD, etc.)",\n' +
      '  "potencia_painel_w": number (potência individual de cada módulo em Wp, ex: 625),\n' +
      '  "qtd_paineis": number (quantidade de módulos, ex: 6),\n' +
      '  "marca_inversor": "string (ex: HUAWEI, Sungrow, AUSXOL, PHB, GOODWE, Growatt, etc.)",\n' +
      '  "potencia_inversor_kw": number (potência nominal do inversor em kW, ex: 3),\n' +
      '  "qtd_inversores": number (quantidade de inversores, ex: 1),\n' +
      '  "frete": number (valor do frete em Reais R$, 0 se CIF ou não informado),\n' +
      '  "valor_total": number (custo total do kit em Reais R$, incluindo frete quando somado),\n' +
      '  "descricao": "string (resumo técnico limpo dos itens inclusos: qtd painéis + potência + marca, inversor + potência + marca, string box se houver, estrutura e cabos)",\n' +
      '  "componentes": [\n' +
      '    {\n' +
      '      "sku": "string ou null",\n' +
      '      "descricao": "string",\n' +
      '      "fabricante": "string",\n' +
      '      "quantidade": number,\n' +
      '      "unidade": "PC" | "UN" | "M" | "PAR" | "CJ" | "KT" | "string",\n' +
      '      "preco_unitario": number (ou 0 se não detalhado individualmente)\n' +
      '    }\n' +
      '  ]\n' +
      '}\n\n' +
      'REGRAS IMPORTANTES:\n' +
      '1. Mapeie tipo_estrutura para uma das chaves exatas: "solo_monoposte" (para solo), "mini_trilho" (para telha metálica/trapezoidal), "fibrocimento" (para telha ondulada/fibrocimento/madeira) ou "outro".\n' +
      '2. Se os módulos forem DMEGC 625W (6 módulos) e inversor HUAWEI 3kW, potencia_kwp deve ser 3.75 (6 * 625 / 1000 = 3.75).\n' +
      '3. O valor_total deve ser o custo final de compra do kit pelo integrador (ex: R$ 4.700,00 -> 4700).\n' +
      '4. Nunca invente dados que não constam no documento. Se não houver frete destacado, frete = 0.\n' +
      '5. Responda APENAS o JSON.'

    // 6. Chamada aos modelos do Gemini via endpoint oficial generateContent com inlineData PDF
    // Modelos candidatos recomendados com suporte nativo a PDF e fallback de versão de API:
    // - gemini-1.5-flash (padrão multimodal estável e rápido para documentos)
    // - gemini-2.0-flash (nova geração do Gemini)
    // - gemini-1.5-flash-latest
    // - gemini-1.5-pro (fallback de alta fidelidade)
    const candidateEndpoints = [
      { version: 'v1beta', model: 'gemini-1.5-flash' },
      { version: 'v1', model: 'gemini-1.5-flash' },
      { version: 'v1beta', model: 'gemini-2.0-flash' },
      { version: 'v1beta', model: 'gemini-1.5-flash-latest' },
      { version: 'v1beta', model: 'gemini-1.5-pro' },
      { version: 'v1', model: 'gemini-1.5-pro' },
    ]

    const generatePayload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: pdfBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }

    let lastErrorStatus = 500
    let lastErrorMessage = 'Não foi possível extrair os dados do PDF com a IA.'
    let lastModelTried = ''
    let rawAiText = ''

    for (let i = 0; i < candidateEndpoints.length; i++) {
      const ep = candidateEndpoints[i]
      const modelName = ep.model
      lastModelTried = modelName
      const apiUrl =
        'https://generativelanguage.googleapis.com/' +
        ep.version +
        '/models/' +
        modelName +
        ':generateContent'

      let httpRes = null
      try {
        httpRes = $http.send({
          url: apiUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiApiKey,
          },
          body: JSON.stringify(generatePayload),
          timeout: 90,
        })
      } catch (httpErr) {
        lastErrorStatus = 500
        lastErrorMessage =
          'Falha na comunicação com o servidor do Google Gemini: ' +
          (httpErr && httpErr.message ? httpErr.message : 'tempo limite esgotado.')
        console.warn('[kits_extrair_pdf] Erro de rede ao chamar ' + apiUrl + ':', httpErr)
        continue
      }

      if (httpRes.statusCode >= 200 && httpRes.statusCode < 300) {
        const resJson = httpRes.json || {}
        const candidates = resJson.candidates || []
        if (candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
          const parts = candidates[0].content.parts
          for (let p = 0; p < parts.length; p++) {
            if (parts[p].text) {
              rawAiText += parts[p].text
            }
          }
        }

        if (rawAiText && rawAiText.trim()) {
          // Sucesso na extração da resposta
          break
        }

        lastErrorStatus = 422
        lastErrorMessage =
          'A IA processou o PDF mas não retornou conteúdo legível. Verifique se o arquivo não está corrompido ou protegido por senha.'
        continue
      }

      // Tratamento de falha HTTP do Gemini
      lastErrorStatus = httpRes.statusCode
      const errData = httpRes.json || {}
      let apiMsg = ''
      if (errData.error && errData.error.message) {
        apiMsg = errData.error.message
      } else if (errData.message) {
        apiMsg = errData.message
      }

      // Sanitiza chaves
      apiMsg = (apiMsg || '')
        .replace(/AQ\.[A-Za-z0-9_-]+/g, '[CHAVE_PROTEGIDA]')
        .replace(/AIza[A-Za-z0-9_-]+/g, '[CHAVE_PROTEGIDA]')

      console.warn(
        '[kits_extrair_pdf] Erro ao chamar ' +
          apiUrl +
          ' (status ' +
          httpRes.statusCode +
          '): ' +
          apiMsg,
      )

      if (httpRes.statusCode === 401 || httpRes.statusCode === 403) {
        lastErrorMessage =
          'Falha de autenticação com a API do Google Gemini. Verifique se a chave configurada em Configurações > Integrações é válida.'
        break
      }

      if (httpRes.statusCode === 429) {
        lastErrorMessage =
          'Limite de requisições do Gemini atingido temporariamente (429). Aguarde alguns instantes e tente novamente.'
        break
      }

      if (httpRes.statusCode === 404) {
        // Modelo ou versão indisponível na chave, tenta o próximo endpoint candidato
        lastErrorMessage =
          'O modelo de IA (' +
          modelName +
          ') não está disponível nesta versão da API do Google Gemini.'
        continue
      }

      lastErrorMessage =
        'Erro na API do Google Gemini (' +
        httpRes.statusCode +
        '): ' +
        (apiMsg || 'Não foi possível analisar o PDF.')
    }

    // 7. Parse tolerante do JSON retornado pelo Gemini
    let parsedData = null
    if (rawAiText) {
      let cleaned = rawAiText.trim()
      // Remove cercas ```json ... ``` ou ``` ... ```
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '')
      cleaned = cleaned.replace(/\s*```$/, '').trim()

      try {
        parsedData = JSON.parse(cleaned)
      } catch (jsonErr) {
        // Tenta localizar o primeiro '{' e o último '}'
        const firstBrace = cleaned.indexOf('{')
        const lastBrace = cleaned.lastIndexOf('}')
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          try {
            parsedData = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1))
          } catch (_) {}
        }
      }
    }

    // 8. Se o Gemini falhou ou não conseguiu parsear o JSON
    if (!parsedData || typeof parsedData !== 'object') {
      // NUNCA retorne 404 daqui: 404 induz o frontend e o SDK a achar que a rota /backend/v1/kits/extrair-pdf não existe
      const statusFinal = lastErrorStatus >= 400 && lastErrorStatus !== 404 ? lastErrorStatus : 422
      return e.json(statusFinal, {
        error:
          lastErrorMessage ||
          'Não foi possível ler o PDF — verifique se é uma cotação válida de kit solar com texto legível.',
        code: 'EXTRACTION_FAILED',
        model_tried: lastModelTried,
      })
    }

    // 9. Normalização e sanitização dos campos extraídos
    const potenciaKwp = Math.round((Number(parsedData.potencia_kwp) || 0) * 100) / 100
    const qtdPaineis = Math.round(Number(parsedData.qtd_paineis) || 0)
    const potPainelW = Math.round(Number(parsedData.potencia_painel_w) || 0)
    const qtdInversores = Math.round(Number(parsedData.qtd_inversores) || 1)
    const potInvKw = Math.round((Number(parsedData.potencia_inversor_kw) || 0) * 10) / 10
    const custoKit = Math.round((Number(parsedData.valor_total) || 0) * 100) / 100
    const frete = Math.round((Number(parsedData.frete) || 0) * 100) / 100

    let tipoEstrutura = (parsedData.tipo_estrutura || '').trim().toLowerCase()
    const tiposPermitidos = ['solo_monoposte', 'mini_trilho', 'fibrocimento', 'outro']
    if (tiposPermitidos.indexOf(tipoEstrutura) === -1) {
      if (/fibrocimento|ondulada|colonial|madeira/i.test(tipoEstrutura)) {
        tipoEstrutura = 'fibrocimento'
      } else if (/mini\s*trilho|met[aá]lic|trapezoidal/i.test(tipoEstrutura)) {
        tipoEstrutura = 'mini_trilho'
      } else if (/solo|monoposte/i.test(tipoEstrutura)) {
        tipoEstrutura = 'solo_monoposte'
      } else {
        tipoEstrutura = 'fibrocimento'
      }
    }

    let stringBox = (parsedData.string_box || '').trim().toLowerCase()
    if (['1_entrada', '2_entradas', '3_entradas'].indexOf(stringBox) === -1) {
      if (/1\s*e|1\s*entrada/i.test(stringBox)) stringBox = '1_entrada'
      else if (/2\s*e|2\s*entradas/i.test(stringBox)) stringBox = '2_entradas'
      else if (/3\s*e|3\s*entradas/i.test(stringBox)) stringBox = '3_entradas'
      else stringBox = ''
    }

    const marcaPainel = (parsedData.marca_painel || '').trim()
    const marcaInversor = (parsedData.marca_inversor || '').trim()
    let fabricante = (parsedData.fabricante || '').trim()
    if (!fabricante && (marcaPainel || marcaInversor)) {
      fabricante = [marcaPainel, marcaInversor].filter(Boolean).join(' / ')
    }

    // Nome comercial formatado no padrão Ecosolar
    let nomeKit = (parsedData.nome || '').trim()
    if (!nomeKit) {
      const kwpStr = potenciaKwp > 0 ? potenciaKwp.toLocaleString('pt-BR') : ''
      const marcasStr = [marcaPainel, marcaInversor].filter(Boolean).join(' + ')
      let estrRotulo = ''
      if (tipoEstrutura === 'fibrocimento') estrRotulo = 'Fibrocimento'
      else if (tipoEstrutura === 'mini_trilho') estrRotulo = 'Mini trilho'
      else if (tipoEstrutura === 'solo_monoposte') estrRotulo = 'Solo monoposte'

      nomeKit =
        'Kit Solar ' +
        (kwpStr ? kwpStr + ' kWp' : '') +
        (marcasStr ? ' — ' + marcasStr : '') +
        (estrRotulo ? ' — ' + estrRotulo : '')
    }

    // Componentes limpos
    const rawComponentes = Array.isArray(parsedData.componentes) ? parsedData.componentes : []
    const componentes = []
    for (let c = 0; c < rawComponentes.length; c++) {
      const it = rawComponentes[c] || {}
      componentes.push({
        sku: (it.sku || '').trim() || null,
        descricao: (it.descricao || '').trim(),
        fabricante: (it.fabricante || '').trim() || null,
        quantidade: Number(it.quantidade) || 1,
        unidade: (it.unidade || 'UN').trim().toUpperCase(),
        preco_unitario: Number(it.preco_unitario) || 0,
      })
    }

    return e.json(200, {
      success: true,
      arquivo: nomeArquivo,
      model_used: lastModelTried,
      distribuidora: (parsedData.distribuidora || '').trim() || 'Belenus',
      numero_cotacao: (parsedData.numero_cotacao || '').trim() || null,
      data_cotacao: (parsedData.data || '').trim() || null,
      nome: nomeKit,
      potencia_kwp: potenciaKwp,
      fabricante: fabricante,
      categoria: parsedData.categoria || 'Residencial',
      tipo_estrutura: tipoEstrutura,
      estrutura_detalhe: (parsedData.estrutura_detalhe || '').trim() || null,
      string_box: stringBox,
      marca_painel: marcaPainel,
      potencia_painel_w: potPainelW,
      qtd_paineis: qtdPaineis,
      marca_inversor: marcaInversor,
      potencia_inversor_kw: potInvKw,
      qtd_inversores: qtdInversores,
      frete: frete,
      valor_total: custoKit,
      custo: custoKit,
      descricao: (parsedData.descricao || '').trim(),
      componentes: componentes,
    })
  },
  $apis.requireAuth(),
)
