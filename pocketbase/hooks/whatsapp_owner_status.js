// GET /backend/v1/whatsapp/owner-status
// Status da conexão do WhatsApp do DONO do app (Skip Connectors, modo owner).
// Usa $connectors.executeAsOwner com WHATSAPP_GET_PHONE_NUMBERS: se a conta
// conectada responder, está conectado (nada de QR code nem Evolution API aqui).
// NOTA JSVM: nenhum símbolo de nível de topo fora do callback — tudo inline.
routerAdd(
  'GET',
  '/backend/v1/whatsapp/owner-status',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Não autenticado' })
    }

    let exec
    try {
      exec = $connectors.executeAsOwner('whatsapp', 'WHATSAPP_GET_PHONE_NUMBERS', {
        limit: 10,
      })
    } catch (err) {
      return e.json(200, {
        connected: false,
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
      numeros: mapeados,
    })
  },
  $apis.requireAuth(),
)
