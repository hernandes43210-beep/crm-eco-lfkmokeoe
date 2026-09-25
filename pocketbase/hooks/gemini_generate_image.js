// POST /backend/v1/gemini/generate-image
// Gera uma imagem fotorrealista profissional de instalação solar usando a API Google Gemini.
// Autenticação obrigatória (e.auth). A chave GEMINI_API_KEY NUNCA é exposta ao frontend.
// Prioridade da chave:
// 1. Coleção 'integracoes_config' (registro com chave = 'gemini')
// 2. Fallback: variável de ambiente $os.getenv('GEMINI_API_KEY')
// Enquanto a chave não estiver configurada, devolve erro 400 claro em português.

routerAdd(
  'POST',
  '/backend/v1/gemini/generate-image',
  (e) => {
    // 1. Validação de autenticação
    const auth = e.auth
    if (!auth) {
      return e.json(401, {
        error: 'Não autenticado. Faça login para gerar imagens.',
      })
    }

    // 2. Leitura da chave: 1º banco de dados, 2º variável de ambiente
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
          'Geração de imagens indisponível: a chave da API do Gemini não está configurada. Acesse o menu Integrações do CRM para configurá-la.',
        code: 'GEMINI_API_KEY_NOT_CONFIGURED',
      })
    }

    // 3. Leitura e validação dos parâmetros da requisição
    const body = e.requestInfo().body || {}
    const tipo = (body.tipo || 'residencial').trim().toLowerCase()
    const detalheOpcional = (body.detalhe || '').trim()

    // Validação do tipo de instalação
    const tiposPermitidos = ['residencial', 'comercial', 'carport', 'rural']
    const tipoFinal = tiposPermitidos.indexOf(tipo) !== -1 ? tipo : 'residencial'

    // 4. Prompts profissionais fotorrealistas de alta fidelidade para o mercado solar brasileiro
    // Sem preços, sem valores numéricos nas imagens, iluminação natural vibrante
    let promptBase = ''
    let defaultTitulo = ''
    let defaultLegenda = ''

    if (tipoFinal === 'residencial') {
      defaultTitulo = 'Instalação Solar em Telhado Residencial Brasileiro'
      defaultLegenda = 'Telhado residencial com painéis solares de alta performance'
      promptBase =
        'Ultra-realistic professional architectural photograph of a high-end Brazilian residential house featuring a clean and modern rooftop solar photovoltaic system. Dark sleek monocrystalline solar panels neatly mounted on ceramic clay roof tiles, secure aluminum mounting rails, sunny blue sky with soft bright daylight, subtle lush tropical Brazilian garden in the foreground, drone perspective shot, 8k resolution, crisp details, architectural magazine style, no text, no prices, no numbers, photorealistic.'
    } else if (tipoFinal === 'comercial') {
      defaultTitulo = 'Usina Fotovoltaica em Telhado Comercial / Galpão Industrial'
      defaultLegenda = 'Instalação comercial em cobertura metálica de grande porte'
      promptBase =
        'Professional architectural photograph of a large-scale commercial industrial warehouse rooftop in Brazil with an extensive grid of glossy black photovoltaic solar panels. Corrugated metal roof, precision alignment, high-tech industrial solar inverters visible near the edge, bright sunny morning light, professional drone aerial shot, high dynamic range, crisp engineered perfection, no text, no prices, no numbers, photorealistic.'
    } else if (tipoFinal === 'carport') {
      defaultTitulo = 'Carport Solar (Garagem Solar Fotovoltaica)'
      defaultLegenda = 'Estrutura metálica de estacionamento com cobertura solar fotovoltaica'
      promptBase =
        'High-end professional architectural photograph of an engineered solar carport parking canopy in Brazil. Modern dark metallic structural steel beams supporting an overhead roof composed entirely of sleek monocrystalline solar panels. Clean paved parking lot beneath sheltering vehicles, bright daylight, reflections on glass panels, clean landscaping around, 8k resolution, architectural design photography, no text, no prices, no numbers, photorealistic.'
    } else if (tipoFinal === 'rural') {
      defaultTitulo = 'Usina Solar em Solo para Propriedade Rural / Agronegócio'
      defaultLegenda = 'Usinas fotovoltaicas de solo com estrutura reforçada para fazenda'
      promptBase =
        'Breathtaking professional wide-angle landscape photograph of a ground-mounted solar farm on a Brazilian rural farm estate. Long symmetrical rows of glossy black solar panels on galvanized steel ground structures, green pasture and Brazilian cerrado horizon, clear sunny sky with golden sunlight, agricultural solar energy generation, ultra sharp 8k detail, professional commercial photography, no text, no prices, no numbers, photorealistic.'
    }

    // Se o usuário forneceu detalhe opcional, adiciona ao prompt preservando a regra de sem valores/preços
    let promptFinal = promptBase
    if (detalheOpcional) {
      // Remove menções acidentais a preços ou moedas
      const detalheLimpo = detalheOpcional.replace(/R\$\s*[\d.,]+/gi, '').trim()
      if (detalheLimpo) {
        promptFinal = promptFinal + ' Specific detail requested: ' + detalheLimpo + '.'
      }
    }

    // 5. Modelos candidatos para geração de imagem via generateContent
    // O modelo oficial atual do Google AI Studio para geração de imagem nativa é gemini-2.5-flash-image (Nano Banana).
    // Outros candidatos na família Flash Image servem como fallback resiliente.
    const candidateModels = [
      'gemini-2.5-flash-image',
      'gemini-3.1-flash-image',
      'gemini-3.1-flash-lite-image',
    ]

    const generatePayload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: promptFinal }],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    }

    let lastErrorStatus = 500
    let lastErrorMessage = 'Não foi possível gerar a imagem via Google Gemini.'
    let lastRawError = ''
    let lastModelTried = ''

    for (let i = 0; i < candidateModels.length; i++) {
      const modelName = candidateModels[i]
      lastModelTried = modelName
      const apiUrl =
        'https://generativelanguage.googleapis.com/v1beta/models/' + modelName + ':generateContent'

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
          'Falha na comunicação com a API do Google Gemini: ' +
          (httpErr && httpErr.message ? httpErr.message : 'tempo limite esgotado.')
        // Erro de rede/timeout: tenta próximo se houver
        continue
      }

      if (httpRes.statusCode >= 200 && httpRes.statusCode < 300) {
        // Sucesso na resposta HTTP! Extrair candidatos e inlineData
        const resJson = httpRes.json || {}
        const candidates = resJson.candidates || []
        let base64Data = ''
        let mimeType = 'image/jpeg'

        for (let c = 0; c < candidates.length; c++) {
          const content = candidates[c].content || {}
          const parts = content.parts || []
          for (let p = 0; p < parts.length; p++) {
            const part = parts[p]
            // Formato inlineData (camelCase) ou inline_data (snake_case)
            const inlineObj = part.inlineData || part.inline_data
            if (inlineObj && (inlineObj.data || inlineObj.bytesBase64Encoded)) {
              base64Data = (inlineObj.data || inlineObj.bytesBase64Encoded || '').trim()
              mimeType = inlineObj.mimeType || inlineObj.mime_type || 'image/jpeg'
              break
            }
          }
          if (base64Data) break
        }

        if (base64Data) {
          // Imagem gerada com sucesso!
          return e.json(200, {
            success: true,
            model_used: modelName,
            tipo: tipoFinal,
            titulo_sugerido: defaultTitulo,
            legenda_sugerida: defaultLegenda,
            prompt_usado: promptFinal,
            mime_type: mimeType,
            image_base64: base64Data,
            data_url: 'data:' + mimeType + ';base64,' + base64Data,
          })
        }

        // Se o modelo respondeu 200 mas sem partes de imagem (ex: bloqueio de segurança)
        const promptFeedback = resJson.promptFeedback || {}
        let blockReason = promptFeedback.blockReason || ''
        if (candidates.length > 0 && candidates[0].finishReason) {
          blockReason = blockReason || candidates[0].finishReason
        }

        lastErrorStatus = 422
        lastErrorMessage =
          'A IA processou o pedido mas não gerou imagem (motivo: ' +
          (blockReason || 'conteúdo bloqueado ou indisponível') +
          '). Tente ajustar os detalhes da solicitação.'
        continue
      }

      // Tratamento de falha HTTP do modelo
      lastErrorStatus = httpRes.statusCode
      const errData = httpRes.json || {}
      let apiMsg = ''
      if (errData.error && errData.error.message) {
        apiMsg = errData.error.message
      } else if (errData.message) {
        apiMsg = errData.message
      }

      // Sanitiza mensagens da API para nunca expor partes da chave
      apiMsg = (apiMsg || '')
        .replace(/AQ\.[A-Za-z0-9_-]+/g, '[CHAVE_PROTEGIDA]')
        .replace(/AIza[A-Za-z0-9_-]+/g, '[CHAVE_PROTEGIDA]')
      lastRawError = apiMsg

      // 401 ou 403: erro de chave ou permissão geral, não adianta tentar outro modelo
      if (httpRes.statusCode === 401 || httpRes.statusCode === 403) {
        if (
          apiMsg.indexOf('API key not valid') !== -1 ||
          apiMsg.indexOf('API_KEY_INVALID') !== -1 ||
          apiMsg.indexOf('not valid') !== -1
        ) {
          lastErrorMessage =
            'Chave do Google Gemini inválida ou expirada. Acesse Configurações > Integrações e salve uma chave válida do Google AI Studio.'
        } else if (
          apiMsg.indexOf('PERMISSION_DENIED') !== -1 ||
          apiMsg.indexOf('restricted') !== -1 ||
          apiMsg.indexOf('not enabled') !== -1 ||
          apiMsg.indexOf('SERVICE_DISABLED') !== -1
        ) {
          lastErrorMessage =
            'Permissão negada pela API do Google (403): certifique-se de que a Generative Language API está ativada no seu projeto Google Cloud e que a chave não possui restrições que impeçam a chamada.'
        } else {
          lastErrorMessage =
            'Falha de autenticação (' +
            httpRes.statusCode +
            ') com o Google Gemini. A chave pode estar inválida, com restrições ou sem permissão na Generative Language API. Verifique em Configurações > Integrações.'
        }
        break
      }

      // 429: limite de taxa da chave
      if (httpRes.statusCode === 429) {
        lastErrorMessage =
          'Limite de requisições do Gemini atingido temporariamente (429). Aguarde alguns instantes e tente novamente.'
        // Em 429 também não adianta tentar o próximo imediatamente pois a cota é compartilhada pela mesma chave
        break
      }

      // 404: modelo não encontrado ou não suportado para esta chave/versão da API -> tenta próximo da lista
      if (httpRes.statusCode === 404) {
        lastErrorMessage =
          'O modelo de geração de imagem (' +
          modelName +
          ') não está disponível para esta chave de API no Google AI Studio. Verifique se o recurso de geração de imagem está liberado em sua conta do Google AI Studio.'
        continue
      }

      // Outro código de erro (ex 400 Bad Request ou 503 temporário)
      if (httpRes.statusCode === 400 && apiMsg.indexOf('API key not valid') !== -1) {
        lastErrorMessage =
          'Chave da API do Gemini inválida — confira no Google AI Studio e atualize em Configurações > Integrações.'
        break
      }

      lastErrorMessage =
        'Erro na API do Google Gemini (' +
        httpRes.statusCode +
        '): ' +
        (apiMsg || 'Erro desconhecido ao chamar modelo ' + modelName)
    }

    return e.json(lastErrorStatus >= 400 ? lastErrorStatus : 500, {
      error: lastErrorMessage,
      status: lastErrorStatus,
      model_tried: lastModelTried,
      raw_error: lastRawError,
    })
  },
  $apis.requireAuth(),
)
