migrate(
  (app) => {
    const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'hernandes43210@gmail.com')

    const leadsCol = app.findCollectionByNameOrId('leads')
    const testLead = new Record(leadsCol)
    testLead.set('nome', 'Teste Diagnostico 2')
    testLead.set('email', 'teste.diag2@exemplo.com')
    testLead.set('telefone', '11999999999')
    testLead.set('origem', 'Site')
    testLead.set('consumo_mensal_kwh', 450)
    testLead.set('endereco', 'Rua Teste')
    testLead.set('cidade', 'São Paulo')
    testLead.set('estado', 'SP')
    testLead.set('status', 'Novo')
    testLead.set('sla_dias', 7)
    testLead.set('preco_venda', 18000)
    testLead.set('proprietario', admin.id)

    let histVal = testLead.get('historico')
    let histJson = testLead.get('historico')

    app.save(testLead)
    app.delete(testLead)
  },
  (app) => {},
)
