migrate(
  (app) => {
    // 1. Simular teste chamando lógica ou inserindo e verificando
    // Teste 1: Buscar token do site_form_settings
    const settings = app.findFirstRecordByData('site_form_settings', 'ativo', true)
    if (!settings) {
      throw new Error('site_form_settings não encontrado')
    }
    const token = settings.getString('form_token')

    // Teste 2: Criar lead de teste como o endpoint faz
    const users = app.findRecordsByFilter('_pb_users_auth_', '', '+created', 1, 0)
    const ownerId = users && users.length > 0 ? users[0].id : ''

    const leadsCol = app.findCollectionByNameOrId('leads')
    const testLead = new Record(leadsCol)
    testLead.set('nome', 'TESTE LEAD SITE HORIZONS')
    testLead.set('email', 'teste.site.horizons@leadsolar.crm')
    testLead.set('telefone', '69999990001')
    testLead.set('origem', 'Site')
    testLead.set('status', 'Novo')
    testLead.set('cidade', 'Cacoal')
    testLead.set('tipo_imovel', 'Comercial')
    testLead.set('valor_conta_reais', 1250.5)
    testLead.set('consumo_mensal_kwh', 1359)
    testLead.set('sla_dias', 7)
    testLead.set('proprietario', ownerId)
    testLead.set('historico', [
      {
        data: new Date().toISOString(),
        tipo: 'criacao',
        descricao:
          'Lead recebido via site ecoenergy.net.br. Dados: Cidade: Cacoal | Tipo de Imóvel: Comercial | Valor Médio da Conta: R$ 1250.50 | Consumo: 1359 kWh/mês',
      },
    ])
    app.save(testLead)

    // Validar se foi salvo com SLA e histórico
    const saved = app.findFirstRecordByData('leads', 'email', 'teste.site.horizons@leadsolar.crm')
    if (!saved || saved.getString('status') !== 'Novo' || !saved.getString('sla_limite')) {
      throw new Error('Falha ao validar lead de teste com SLA')
    }

    // Limpar o lead de teste para manter a base 100% limpa conforme solicitado
    app.delete(saved)
  },
  (app) => {},
)
