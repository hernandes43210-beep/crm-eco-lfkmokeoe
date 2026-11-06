// Guarda de integridade do "Projeto Pago" na coleção 'homologacoes'.
//
// Fecha a brecha de PATCH direto: a regra das duas confirmações vive nos
// endpoints de /backend/v1/homologacao/*, mas a regra update da coleção ainda
// permite Vendedor (e Engenheiro) alterar o registro via API normal. Este hook
// bloqueia qualquer alteração dos campos projeto_pago* que não passe pelos
// endpoints (salvas internas do servidor chegam com e.auth vazio e passam).
//
// Regras:
//  - Vendedor: NÃO pode alterar NENHUM campo projeto_pago* (403).
//  - Qualquer usuário autenticado: NÃO pode desmarcar projeto_pago (true→false)
//    nem mexer em projeto_pago_confirmacoes / projeto_pago_reversoes direto —
//    a reversão só vale pelos endpoints com 2 oks.
//  - Admin/CEO: pode alterar livremente (inclusive via endpoints).

onRecordUpdate((e) => {
  const record = e.record
  const auth = e.auth

  // Sem contexto de autenticação = gravação interna (hooks/sistema): permite.
  if (!auth) {
    e.next()
    return
  }

  const authRole = auth.getString('role')

  const camposPago = [
    'projeto_pago',
    'projeto_pago_em',
    'projeto_pago_por',
    'projeto_pago_confirmacoes',
    'projeto_pago_reversoes',
    'valor_pago',
    'valor_pago_em',
    'valor_pago_por',
  ]

  const original = record.original()
  const mudouAlgumCampoPago = camposPago.some(function (campo) {
    const antes = original ? original.get(campo) : undefined
    const depois = record.get(campo)
    const antesStr = antes === undefined || antes === null ? '' : JSON.stringify(antes)
    const depoisStr = depois === undefined || depois === null ? '' : JSON.stringify(depois)
    return antesStr !== depoisStr
  })

  if (!mudouAlgumCampoPago) {
    e.next()
    return
  }

  if (authRole === 'Vendedor') {
    return e.json(
      403,
      'O status de pagamento do projeto só pode ser alterado pelo Admin/CEO ou pelo Engenheiro responsável, pelos botões do sistema (reversão exige o ok de duas pessoas).',
    )
  }

  // Reversão direta (true -> false) e mexer nas listas de confirmação é
  // proibido para todos que não sejam Admin — evita burlar as 2 confirmações.
  const querDesmarcar =
    record.getBool('projeto_pago') === false && original.getBool('projeto_pago') === true
  const mexeuNasListas =
    JSON.stringify(record.get('projeto_pago_confirmacoes')) !==
      JSON.stringify(original.get('projeto_pago_confirmacoes')) ||
    JSON.stringify(record.get('projeto_pago_reversoes')) !==
      JSON.stringify(original.get('projeto_pago_reversoes'))

  if (authRole !== 'Admin' && (querDesmarcar || mexeuNasListas)) {
    return e.json(
      403,
      'A reversão do pagamento do projeto exige o ok de duas pessoas diferentes. Use o botão "Desfazer pagamento" do sistema.',
    )
  }

  e.next()
}, 'homologacoes')
