// POST /backend/v1/integrations/site-form/submit
// Endpoint público protegido por token para receber leads do formulário do site ecoenergy.net.br (Hostinger Horizons).
// Aceita token por Header ('x-site-token', 'x-token', 'authorization: Bearer <token>') ou query param '?token=' ou no body ('token').
// Aceita tanto application/json quanto application/x-www-form-urlencoded.
//
// Ao receber lead válido:
// 1. Cria lead no estágio "Novo"
// 2. Proprietário = primeiro usuário admin/cadastrado
// 3. Preenche nome, telefone/whatsapp, cidade, consumo_mensal_kwh, valor_conta_reais, tipo_imovel, origem = "Site"
// 4. Inicia SLA de 7 dias
// 5. Registra no histórico: "Lead recebido via site ecoenergy.net.br"
// 6. Registra log em site_form_logs

routerAdd('POST', '/backend/v1/integrations/site-form/submit', (e) => {
  const reqInfo = e.requestInfo()
  const headers = reqInfo.headers || {}
  const query = reqInfo.query || {}
  let rawBody = reqInfo.body || {}

  // 1. Extração do Token
  let token = ''

  // Tentativa 1: Header x-site-token ou x-token
  const rawSiteHeader =
    headers['x-site-token'] || headers['X-Site-Token'] || headers['x-token'] || headers['X-Token']
  if (rawSiteHeader && typeof rawSiteHeader === 'string') {
    token = rawSiteHeader.trim()
  }

  // Tentativa 2: Header Authorization (Bearer ...)
  if (!token) {
    const authHeader = headers['authorization'] || headers['Authorization'] || ''
    if (typeof authHeader === 'string' && authHeader.toLowerCase().indexOf('bearer ') === 0) {
      token = authHeader.substring(7).trim()
    }
  }

  // Tentativa 3: Query param ?token=
  if (!token && query.token) {
    token = String(query.token).trim()
  }

  // Tentativa 4: Campo 'token' no body
  if (!token && rawBody.token) {
    token = String(rawBody.token).trim()
  }

  if (!token) {
    return e.json(401, {
      success: false,
      error:
        'Token de autenticação não fornecido. Envie o token via header x-site-token ou query param ?token=.',
    })
  }

  // 2. Validação do Token no banco
  let tokenValido = false
  try {
    const list = $app.findRecordsByFilter(
      'site_form_settings',
      "form_token = '" + token.replace(/'/g, "''") + "' && ativo = true",
      '',
      1,
      0,
    )
    if (list && list.length > 0) {
      tokenValido = true
    }
  } catch (_) {}

  if (!tokenValido) {
    return e.json(403, {
      success: false,
      error: 'Token inválido ou formulário desativado pelo administrador.',
    })
  }

  // 3. Extração tolerante de campos do payload (JSON ou form-urlencoded)
  // Hostinger Horizons ou custom code pode enviar com variações de maiúsculas/acentos
  const body = rawBody || {}

  // Helper para buscar campo em maiúsculas/minúsculas/variações
  const keys = Object.keys(body)
  const getField = (possibleNames) => {
    for (let i = 0; i < possibleNames.length; i++) {
      const target = possibleNames[i].toLowerCase().replace(/[^a-z0-9]/g, '')
      for (let j = 0; j < keys.length; j++) {
        const k = keys[j]
        const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (
          normK === target &&
          body[k] !== undefined &&
          body[k] !== null &&
          String(body[k]).trim() !== ''
        ) {
          return String(body[k]).trim()
        }
      }
    }
    return ''
  }

  const rawNome = getField(['nome', 'name', 'nome_completo', 'fullname', 'cliente'])
  const rawTelefone = getField([
    'whatsapp',
    'telefone',
    'phone',
    'celular',
    'contato',
    'fone',
    'tel',
    'numero_whatsapp',
  ])
  const rawEmail = getField(['email', 'e-mail', 'mail', 'correio'])
  const rawCidade = getField(['cidade', 'city', 'municipio', 'localidade'])
  const rawEstado = getField(['estado', 'state', 'uf'])
  const rawTipoImovel = getField([
    'tipo_imovel',
    'tipo_de_imovel',
    'imovel',
    'tipo',
    'property_type',
    'tipoimovel',
    'tipo_propriedade',
    'categoria_imovel',
  ])
  const rawValorConta = getField([
    'valor_conta',
    'valor_medio_conta',
    'valor_da_conta',
    'conta_luz',
    'valor_conta_rs',
    'conta',
    'fatura',
    'valorda_conta',
    'valorda_fatura',
    'bill_value',
  ])
  const rawConsumo = getField([
    'consumo',
    'consumo_medio',
    'consumo_kwh',
    'consumo_medio_kwh',
    'kwh',
    'consumo_mensal',
    'consumomensal',
    'energy_consumption',
  ])

  // Validação mínima de campos obrigatórios: precisa ter pelo menos Nome E Telefone/WhatsApp
  const cleanPhone = rawTelefone.replace(/\D/g, '')

  if (!rawNome && !cleanPhone) {
    return e.json(400, {
      success: false,
      error:
        'Campos obrigatórios ausentes: informe pelo menos Nome e WhatsApp/Telefone para contato.',
    })
  }

  const finalNome = rawNome || 'Lead Site ' + (cleanPhone ? cleanPhone.slice(-4) : 's/n')

  // Parsing do Consumo em kWh
  let finalConsumo = 0
  if (rawConsumo) {
    // Trata "500 kWh", "500,50", "1.200"
    const cleanedConsumo = rawConsumo
      .replace(/kwh/gi, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
    const parsed = parseFloat(cleanedConsumo)
    if (!isNaN(parsed) && parsed > 0) {
      finalConsumo = Math.round(parsed)
    }
  }

  // Parsing do Valor da Conta (R$)
  let finalValorConta = 0
  if (rawValorConta) {
    // Trata "R$ 450,00", "450.00", "1.200,50"
    const cleanedValor = rawValorConta
      .replace(/r\$/gi, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
    const parsed = parseFloat(cleanedValor)
    if (!isNaN(parsed) && parsed > 0) {
      finalValorConta = Math.round(parsed * 100) / 100
    }
  }

  // Se informou valor da conta mas não consumo, estimar consumo (tarifa aprox ~R$ 0,92/kWh)
  if (finalConsumo <= 0 && finalValorConta > 0) {
    finalConsumo = Math.max(50, Math.round(finalValorConta / 0.92))
  } else if (finalConsumo <= 0) {
    finalConsumo = 400 // Padrão solar do sistema
  }

  // Gerar e-mail se ausente para satisfazer unicidade e obrigatoriedade da collection leads
  let finalEmail = rawEmail.toLowerCase().trim()
  if (!finalEmail) {
    if (cleanPhone) {
      finalEmail = 'site.' + cleanPhone + '@leadsolar.crm'
    } else {
      finalEmail = 'site.' + Math.floor(Math.random() * 10000000) + '@leadsolar.crm'
    }
  }

  // Evitar conflito de unicidade de e-mail se já existir outro lead com esse e-mail sintético
  try {
    const existing = $app.findFirstRecordByData('leads', 'email', finalEmail)
    if (existing) {
      finalEmail =
        'site.' +
        Math.floor(Math.random() * 10000000) +
        '.' +
        (cleanPhone || 'lead') +
        '@leadsolar.crm'
    }
  } catch (_) {}

  // 4. Buscar primeiro usuário cadastrado para ser o Proprietário
  let ownerId = ''
  try {
    const users = $app.findRecordsByFilter('_pb_users_auth_', '', '+created', 1, 0)
    if (users && users.length > 0) {
      ownerId = users[0].id
    }
  } catch (_) {}

  // 5. Criar o Lead
  let leadId = ''
  let statusProcessamento = 'sucesso'
  let mensagemLog = ''

  try {
    const leadsCol = $app.findCollectionByNameOrId('leads')
    const leadRec = new Record(leadsCol)

    leadRec.set('nome', finalNome)
    leadRec.set('email', finalEmail)
    if (cleanPhone) {
      leadRec.set('telefone', cleanPhone)
    } else if (rawTelefone) {
      leadRec.set('telefone', rawTelefone)
    }
    leadRec.set('origem', 'Site')
    leadRec.set('status', 'Novo')
    leadRec.set('sla_dias', 7)
    leadRec.set('consumo_mensal_kwh', finalConsumo)

    if (rawCidade) leadRec.set('cidade', rawCidade)
    if (rawEstado) {
      let uf = rawEstado.trim().toUpperCase()
      if (uf.length > 2) uf = uf.substring(0, 2)
      leadRec.set('estado', uf)
    }

    if (rawTipoImovel) leadRec.set('tipo_imovel', rawTipoImovel)
    if (finalValorConta > 0) leadRec.set('valor_conta_reais', finalValorConta)

    if (ownerId) leadRec.set('proprietario', ownerId)

    // Detalhes extras para registrar na timeline
    let detalhesLead = []
    if (rawCidade) detalhesLead.push('Cidade: ' + rawCidade)
    if (rawTipoImovel) detalhesLead.push('Tipo de Imóvel: ' + rawTipoImovel)
    if (finalValorConta > 0)
      detalhesLead.push('Valor Médio da Conta: R$ ' + finalValorConta.toFixed(2))
    if (finalConsumo > 0) detalhesLead.push('Consumo: ' + finalConsumo + ' kWh/mês')

    const descHistorico =
      'Lead recebido via site ecoenergy.net.br.' +
      (detalhesLead.length > 0 ? ' Dados: ' + detalhesLead.join(' | ') : '')

    // Formato correto de historico: array serializado ou array direto
    // leads_sla hook cuidará da criação inicial e do sla_limite se historico vier vazio ou pré-preenchido
    leadRec.set('historico', [
      {
        data: new Date().toISOString(),
        tipo: 'criacao',
        descricao: descHistorico,
      },
    ])

    // Salvar o lead. Disparará leads_sla onRecordCreate para calcular sla_limite
    $app.save(leadRec)
    leadId = leadRec.id
    mensagemLog = 'Lead criado com sucesso via site ecoenergy.net.br no estágio "Novo".'
  } catch (err) {
    statusProcessamento = 'erro'
    mensagemLog = 'Erro ao salvar lead do site: ' + err.message
    console.error('Erro ao processar formulário do site:', err)
  }

  // 6. Registrar log em site_form_logs para auditoria
  try {
    const logsCol = $app.findCollectionByNameOrId('site_form_logs')
    const logRec = new Record(logsCol)
    logRec.set('status_processamento', statusProcessamento)
    logRec.set('lead_id', leadId || '')
    logRec.set('lead_nome', finalNome)
    logRec.set('mensagem', mensagemLog)
    logRec.set('payload_bruto', body)

    // IP da requisição
    const clientIp = headers['x-forwarded-for'] || headers['x-real-ip'] || ''
    if (clientIp) {
      logRec.set('origem_ip', String(clientIp).split(',')[0].trim())
    }

    $app.save(logRec)
  } catch (logErr) {
    console.error('Erro ao salvar site_form_log:', logErr)
  }

  if (statusProcessamento === 'erro') {
    return e.json(500, {
      success: false,
      error: 'Ocorreu um erro interno ao processar o formulário. Tente novamente mais tarde.',
    })
  }

  // 7. Resposta 200 rápida para o Hostinger Horizons exibir sucesso ao cliente
  return e.json(200, {
    success: true,
    message: 'Mensagem enviada com sucesso! Em breve nossa equipe entrará em contato.',
    lead_id: leadId,
  })
})
