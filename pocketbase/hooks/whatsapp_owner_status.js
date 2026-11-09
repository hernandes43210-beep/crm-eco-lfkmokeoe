// GET /backend/v1/whatsapp/owner-status
// Status da conexão do WhatsApp do DONO do app.
// PRIORIDADE: configuração manual (integracoes_config chave='whatsapp_manual',
// API Cloud da Meta com token próprio) > Skip Connectors ($connectors.executeAsOwner).
// No modo manual busca os números direto na Meta (graph.facebook.com), token sempre
// no header Authorization (nunca ?access_token= na URL). Sem QR code, sem Evolution.
// NOTA JSVM: nenhum símbolo de nível de topo fora do callback — tudo inline.
routerAdd(
  'GET',
  '/backend/v1/whatsapp/owner-status',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }

    // ---------- 1. Conexão manual (API Cloud da Meta) ----------
    let manualConfig = null
    try {
      const rs = $app.findRecordsByFilter(
        'integracoes_config',
        "chave = 'whatsapp_manual'",
        '-created',
        1,
        0,
      )
      if (rs && rs.length > 0) manualConfig = rs[0]
    } catch (_) {}

    if (manualConfig) {
      const wabaId = (manualConfig.getString('waba_id') || '').trim()
      const phoneNumberId = (manualConfig.getString('phone_number_id') || '').trim()
      const token = (manualConfig.getString('api_key') || '').trim()
      const ultimoTesteStatus = (manualConfig.getString('ultimo_teste_status') || '').trim()
      const ultimoTesteMensagem = (manualConfig.getString('ultimo_teste_mensagem') || '').trim()

      if (wabaId && token) {
        let httpRes = null
        try {
          httpRes = $http.send({
            url:
              'https://graph.facebook.com/v21.0/' +
              wabaId +
              '/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating&limit=10',
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + token,
            },
            timeout: 15,
          })
        } catch (httpErr) {
          return e.json(200, {
            connected: false,
            modo: 'manual',
            reason: 'manual_erro_api',
            message:
              'Conexão manual configurada, mas a API da Meta não respondeu: ' +
              (httpErr && httpErr.message ? httpErr.message : 'tempo limite esgotado.'),
            ultimo_teste_status: ultimoTesteStatus,
          })
        }

        if (httpRes.statusCode >= 200 && httpRes.statusCode < 300) {
          const dados = httpRes.json || {}
          const lista = Array.isArray(dados.data) ? dados.data : []
          const mapeados = []
          for (let i = 0; i < lista.length; i++) {
            const n = lista[i]
            if (n && typeof n === 'object' && typeof n.id === 'string' && n.id) {
              mapeados.push({
                id: n.id,
                numero:
                  typeof n.display_phone_number === 'string'
                    ? n.display_phone_number
                    : typeof n.phone_number === 'string'
                      ? n.phone_number
                      : '',
                nome: typeof n.verified_name === 'string' ? n.verified_name : '',
                qualidade: typeof n.quality_rating === 'string' ? n.quality_rating : '',
              })
            }
          }
          return e.json(200, {
            connected: true,
            modo: 'manual',
            numeros: mapeados,
            phone_number_id: phoneNumberId,
          })
        }

        // A Meta recusou (token/ID/permissão): erro explícito, sem fingir sucesso
        const dados = httpRes.json || {}
        let detail = ''
        if (dados.error && typeof dados.error.message === 'string') detail = dados.error.message
        const safe = detail
          .replace(/EAAG[A-Za-z0-9_-]+/g, '[TOKEN_PROTEGIDO]')
          .replace(/EAA[A-Za-z0-9_-]+/g, '[TOKEN_PROTEGIDO]')
        return e.json(200, {
          connected: false,
          modo: 'manual',
          reason: 'manual_erro_' + httpRes.statusCode,
          message:
            'A API da Meta recusou a conexão manual (HTTP ' +
            httpRes.statusCode +
            '): ' +
            (safe || 'verifique o token e o WABA ID salvos.'),
          ultimo_teste_status: ultimoTesteStatus,
          ultimo_teste_mensagem: ultimoTesteMensagem,
        })
      }
    }

    // ---------- 2. Fallback: Skip Connectors (conta do dono) ----------
    let exec
    try {
      exec = $connectors.executeAsOwner('whatsapp', 'WHATSAPP_GET_PHONE_NUMBERS', {
        limit: 10,
      })
    } catch (err) {
      return e.json(200, {
        connected: false,
        modo: 'conector',
        reason: 'conectores_indisponiveis',
        message:
          'Não foi possível consultar os conectores: ' +
          (err && err.message ? err.message : String(err)),
      })
    }

    if (!exec || !exec.successful) {
      const raw = exec && exec.error ? exec.error : 'verifique os Conectores no painel Skip'
      return e.json(200, {
        connected: false,
        modo: 'conector',
        reason: 'nao_conectado',
        message: raw,
      })
    }

    // Formas possíveis de resposta (o conector varia): array direto, {data:[...]}, {phone_numbers:[...]}
    let numeros = []
    const d = exec.data
    if (Array.isArray(d)) {
      numeros = d
    } else if (d && Array.isArray(d.data)) {
      numeros = d.data
    } else if (d && Array.isArray(d.phone_numbers)) {
      numeros = d.phone_numbers
    }

    const mapeados = []
    for (let i = 0; i < numeros.length; i++) {
      const n = numeros[i]
      if (n && typeof n === 'object' && typeof n.id === 'string' && n.id) {
        mapeados.push({
          id: n.id,
          numero:
            typeof n.display_phone_number === 'string'
              ? n.display_phone_number
              : typeof n.phone_number === 'string'
                ? n.phone_number
                : '',
          nome:
            typeof n.verified_name === 'string'
              ? n.verified_name
              : typeof n.display_name === 'string'
                ? n.display_name
                : '',
          qualidade: typeof n.quality_rating === 'string' ? n.quality_rating : '',
        })
      }
    }

    return e.json(200, {
      connected: true,
      modo: 'conector',
      numeros: mapeados,
    })
  },
  $apis.requireAuth(),
)
