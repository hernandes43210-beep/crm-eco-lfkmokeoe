// POST /backend/v1/gemini/generate-image
// Gera uma imagem fotorrealista profissional de instalação solar usando a API Google Gemini (Imagen).
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

    // 5. Chamada à API Google Gemini Imagen (imagen-3.0-generate-002:predict)
    const apiUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=' +
      geminiApiKey

    const payload = {
      instances: [{ prompt: promptFinal }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '4:3',
        outputMimeType: 'image/jpeg',
      },
    }

    let httpRes = null
    try {
      httpRes = $http.send({
        url: apiUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        timeout: 90,
      })
    } catch (httpErr) {
      return e.json(500, {
        error:
          'Falha na comunicação com a API do Google Gemini: ' +
          (httpErr && httpErr.message ? httpErr.message : 'tempo limite esgotado.'),
      })
    }

    if (httpRes.statusCode < 200 || httpRes.statusCode >= 300) {
      const errData = httpRes.json || {}
      let msg = 'Erro ao gerar imagem na API do Google Gemini.'

      if (errData.error && errData.error.message) {
        msg = errData.error.message
      } else if (errData.message) {
        msg = errData.message
      }

      // Trata erros comuns de chave inválida ou cota
      if (httpRes.statusCode === 400 || httpRes.statusCode === 403) {
        if (msg.indexOf('API key not valid') !== -1 || msg.indexOf('API_KEY_INVALID') !== -1) {
          msg =
            'Chave da API do Gemini inválida — confira no Google AI Studio e atualize em Integrações.'
        }
      } else if (httpRes.statusCode === 429) {
        msg =
          'Limite de requisições do Gemini atingido temporariamente. Tente novamente em instantes.'
      }

      return e.json(httpRes.statusCode, {
        error: msg,
        status: httpRes.statusCode,
        raw_error: errData,
      })
    }

    const resJson = httpRes.json || {}
    const predictions = resJson.predictions || []
    if (!predictions || predictions.length === 0 || !predictions[0]) {
      return e.json(500, {
        error: 'A API do Google Gemini não retornou imagem válida. Tente novamente.',
      })
    }

    const prediction = predictions[0]
    const base64Data = prediction.bytesBase64Encoded || ''
    const mimeType = prediction.mimeType || 'image/jpeg'

    if (!base64Data) {
      return e.json(500, {
        error: 'Bytes da imagem não encontrados no retorno do Gemini.',
      })
    }

    // 6. Retorna a imagem gerada em base64 e metadados para pré-visualização e salvamento
    return e.json(200, {
      success: true,
      tipo: tipoFinal,
      titulo_sugerido: defaultTitulo,
      legenda_sugerida: defaultLegenda,
      prompt_usado: promptFinal,
      mime_type: mimeType,
      image_base64: base64Data,
      data_url: 'data:' + mimeType + ';base64,' + base64Data,
    })
  },
  $apis.requireAuth(),
)
