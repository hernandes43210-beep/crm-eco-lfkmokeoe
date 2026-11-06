// Hook: VALOR PAGO dos projetos (coleção 'homologacoes') — exclusivo Admin/CEO.
//
// IMPORTANTE (JSVM): callbacks rodam em um pool separado de VM — NADA de
// declarações top-level (funções/variáveis) pode ser referenciado dentro dos
// callbacks. Toda a lógica vive INLINE no corpo do callback.
//
// 1. Endpoint Admin/CEO-only:
//    POST /backend/v1/homologacao/definir-valor-pago
//    Body: { homologacaoId, valor } (valor numérico em R$; 0 ou ausente limpa o valor)
//
// 2. onRecordEnrich: esconde valor_pago / valor_pago_em / valor_pago_por de
//    QUALQUER resposta da API para usuários que não sejam Admin (engenheiro,
//    supervisor, vendedor, anônimo) — inclusive dentro de expand. Assim o
//    engenheiro NUNCA recebe um valor, mesmo que o front bug.

routerAdd(
  'POST',
  '/backend/v1/homologacao/definir-valor-pago',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { success: false, message: 'Usuário não autenticado.' })
    }

    if (auth.getString('role') !== 'Admin') {
      return e.json(403, {
        success: false,
        message: 'Apenas o Admin/CEO pode visualizar ou alterar valores de projetos.',
      })
    }

    const body = e.requestInfo().body || {}
    const homologacaoId = typeof body.homologacaoId === 'string' ? body.homologacaoId.trim() : ''
    if (!homologacaoId) {
      return e.json(400, { success: false, message: 'ID da homologação é obrigatório.' })
    }

    const valorBruto = body.valor
    const valorNumerico =
      typeof valorBruto === 'number'
        ? valorBruto
        : typeof valorBruto === 'string' && valorBruto.trim() !== ''
          ? Number(valorBruto.replace(',', '.'))
          : NaN

    const limpar = !valorBruto || (typeof valorBruto === 'string' && valorBruto.trim() === '')
    if (!limpar && (!isFinite(valorNumerico) || valorNumerico < 0)) {
      return e.json(400, {
        success: false,
        message: 'Informe um valor válido em reais (ex.: 1500,00) ou deixe vazio para remover.',
      })
    }

    let hom = null
    try {
      hom = $app.findFirstRecordByData('homologacoes', 'id', homologacaoId)
    } catch (_) {
      return e.json(404, { success: false, message: 'Registro de homologação não encontrado.' })
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const autorNome = auth.getString('name') || auth.getString('email') || 'Usuário'
    const leadId = hom.getString('lead')
    const valorAnterior = hom.getFloat('valor_pago')

    if (limpar) {
      hom.set('valor_pago', 0)
      hom.set('valor_pago_em', null)
      hom.set('valor_pago_por', null)

      const homHist = lerHistorico(hom)
      homHist.push({
        data: nowIso,
        tipo: 'valor_pago_removido',
        descricao: 'Valor pago do projeto removido por ' + autorNome + '.',
        autor_id: auth.id,
        autor_nome: autorNome,
      })
      hom.set('historico', limitarHistorico(homHist))
      $app.save(hom)

      return e.json(200, {
        success: true,
        message: 'Valor do projeto removido.',
        homologacao_id: hom.id,
        valor_pago: 0,
        valor_pago_em: null,
      })
    }

    const valorArredondado = Math.round(valorNumerico * 100) / 100
    hom.set('valor_pago', valorArredondado)
    hom.set('valor_pago_em', nowIso)
    hom.set('valor_pago_por', auth.id)

    const homHist = lerHistorico(hom)
    const jaTinhaValor = valorAnterior > 0
    homHist.push({
      data: nowIso,
      tipo: jaTinhaValor ? 'valor_pago_atualizado' : 'valor_pago_informado',
      descricao:
        (jaTinhaValor ? 'Valor pago do projeto alterado' : 'Valor pago do projeto informado') +
        ' (' +
        formatarReal(valorArredondado) +
        ') por ' +
        autorNome +
        '.',
      autor_id: auth.id,
      autor_nome: autorNome,
    })
    hom.set('historico', limitarHistorico(homHist))
    $app.save(hom)

    return e.json(200, {
      success: true,
      message: jaTinhaValor
        ? 'Valor do projeto atualizado para ' + formatarReal(valorArredondado) + '.'
        : 'Valor do projeto registrado (' + formatarReal(valorArredondado) + ').',
      homologacao_id: hom.id,
      valor_pago: valorArredondado,
      valor_pago_em: nowIso,
      valor_pago_por: auth.id,
    })

    // Helpers inline no fim do callback (não são top-level, rodam na mesma VM).
    function lerHistorico(rec) {
      let hist = []
      const raw = rec.get('historico')
      if (Array.isArray(raw)) {
        hist = raw.slice(0)
      } else if (typeof raw === 'string') {
        try {
          const p = JSON.parse(raw)
          if (Array.isArray(p)) hist = p
        } catch (_) {}
      }
      return hist
    }
    function limitarHistorico(arr) {
      return arr.length > 50 ? arr.slice(arr.length - 50) : arr
    }
    function formatarReal(v) {
      return (
        'R$ ' +
        v
          .toFixed(2)
          .replace('.', ',')
          .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      )
    }
  },
  $apis.requireAuth(),
)

// onRecordEnrich: esconde os campos de valor para quem não é Admin.
// Roda em TODA serialização de homologacoes (list/view/realtime/expand).
onRecordEnrich((e) => {
  let auth = null
  try {
    const ri = e.requestInfo
    const info = ri && typeof ri === 'function' ? ri() : ri
    auth = info ? info.auth : null
  } catch (_) {}
  const ehAdmin = !!auth && auth.getString('role') === 'Admin'
  if (!ehAdmin) {
    e.record.hide('valor_pago', 'valor_pago_em', 'valor_pago_por')
  }
}, 'homologacoes')
