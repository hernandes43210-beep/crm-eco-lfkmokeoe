migrate(
  (app) => {
    console.log('Starting seed migration 0003...')
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Seed initial Admin user
    let adminId = ''
    try {
      const existing = app.findAuthRecordByEmail('_pb_users_auth_', 'hernandes43210@gmail.com')
      adminId = existing.id
      console.log('Admin exists, updating...', adminId)
      existing.set('role', 'Admin')
      existing.set('name', 'Hernandes Admin')
      existing.setVerified(true)
      app.save(existing)
    } catch (e1) {
      console.log('Admin does not exist, creating new...')
      const record = new Record(users)
      record.setEmail('hernandes43210@gmail.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Hernandes Admin')
      record.set('role', 'Admin')
      app.save(record)
      adminId = record.id
      console.log('Admin created with id:', adminId)
    }

    // 2. Seed kits
    const kitsCol = app.findCollectionByNameOrId('kits')
    const sampleKits = [
      {
        nome: 'Kit Residencial 4,5 kWp',
        fabricante: 'Canadian Solar / Growatt',
        potencia_kw: 4.5,
        categoria: 'Residencial',
        custo: 12500,
        margem: 30, // 30% -> custo / (1 - 0.3) = 17857.14
        preco_venda: 17857.14,
        descricao:
          'Ideal para residências com consumo de até 500 kWh/mês. 8 módulos 560W + inversor monofásico 5kW.',
      },
      {
        nome: 'Kit Residencial 6,6 kWp',
        fabricante: 'Jinko Solar / Deye',
        potencia_kw: 6.6,
        categoria: 'Residencial',
        custo: 17000,
        margem: 30, // 17000 / 0.7 = 24285.71
        preco_venda: 24285.71,
        descricao:
          'Atende consumo entre 600 e 800 kWh/mês com geração de alta eficiência. 12 módulos bifaciais.',
      },
      {
        nome: 'Kit Comercial 12 kWp',
        fabricante: 'JA Solar / Sungrow',
        potencia_kw: 12.0,
        categoria: 'Comercial',
        custo: 31000,
        margem: 25, // 31000 / 0.75 = 41333.33
        preco_venda: 41333.33,
        descricao:
          'Voltado para comércios, padarias e clínicas. Inversor trifásico 12kW com monitoramento Wi-Fi integrado.',
      },
      {
        nome: 'Kit Rural 20 kWp',
        fabricante: 'Trina Solar / Huawei',
        potencia_kw: 20.0,
        categoria: 'Rural',
        custo: 48000,
        margem: 22, // 48000 / 0.78 = 61538.46
        preco_venda: 61538.46,
        descricao:
          'Desenvolvido para granjas, pivôs de irrigação e fazendas com ligação rural ou trifásica.',
      },
    ]

    for (const kit of sampleKits) {
      try {
        app.findFirstRecordByData('kits', 'nome', kit.nome)
      } catch (_) {
        const rec = new Record(kitsCol)
        rec.set('nome', kit.nome)
        rec.set('fabricante', kit.fabricante)
        rec.set('potencia_kw', kit.potencia_kw)
        rec.set('categoria', kit.categoria)
        rec.set('custo', kit.custo)
        rec.set('margem', kit.margem)
        rec.set('preco_venda', kit.preco_venda)
        rec.set('descricao', kit.descricao)
        app.save(rec)
      }
    }

    // 3. Seed 6 realistic leads
    const leadsCol = app.findCollectionByNameOrId('leads')
    const now = new Date()

    const sampleLeads = [
      {
        nome: 'Carlos Menezes',
        email: 'carlos.menezes@email.com.br',
        telefone: '(11) 98765-4321',
        origem: 'Site',
        consumo_mensal_kwh: 480,
        endereco: 'Rua das Palmeiras, 142',
        cidade: 'Campinas',
        estado: 'SP',
        status: 'Novo',
        sla_dias: 7,
        sla_offset_days: 5, // 5 days remaining
        preco_venda: 18500,
        historico: [
          {
            data: new Date(now.getTime() - 2 * 86400000).toISOString(),
            tipo: 'criacao',
            descricao: 'Lead recebido através do formulário do site institucional.',
          },
        ],
      },
      {
        nome: 'Fernanda Lima',
        email: 'fernanda.lima@advocacia.com.br',
        telefone: '(21) 97654-3210',
        origem: 'Indicação',
        consumo_mensal_kwh: 620,
        endereco: 'Av. Atlântica, 2200, Apto 501',
        cidade: 'Niterói',
        estado: 'RJ',
        status: 'Contato Feito',
        sla_dias: 10,
        sla_offset_days: 1, // 1 day remaining (amber attention)
        preco_venda: 23900,
        historico: [
          {
            data: new Date(now.getTime() - 9 * 86400000).toISOString(),
            tipo: 'criacao',
            descricao: 'Lead indicado pelo cliente Rodrigo Silva.',
          },
          {
            data: new Date(now.getTime() - 7 * 86400000).toISOString(),
            tipo: 'status',
            descricao: 'Primeiro contato telefônico realizado. Cliente enviou a conta de luz.',
          },
        ],
      },
      {
        nome: 'Roberto Alves',
        email: 'roberto.alves@supermercadocentral.com',
        telefone: '(31) 98555-1234',
        origem: 'Evento',
        consumo_mensal_kwh: 850,
        endereco: 'Rua Goiás, 880',
        cidade: 'Belo Horizonte',
        estado: 'MG',
        status: 'Proposta Enviada',
        sla_dias: 15,
        sla_offset_days: -2, // Overdue by 2 days (red)
        preco_venda: 32000,
        historico: [
          {
            data: new Date(now.getTime() - 17 * 86400000).toISOString(),
            tipo: 'criacao',
            descricao: 'Contato capturado na feira de energia solar ExpoSolar.',
          },
          {
            data: new Date(now.getTime() - 10 * 86400000).toISOString(),
            tipo: 'proposta',
            descricao: 'Proposta formal de 8,5 kWp enviada por e-mail.',
          },
        ],
      },
      {
        nome: 'Juliana Castro',
        email: 'juliana.castro@clinica.com.br',
        telefone: '(41) 99123-9876',
        origem: 'Redes Sociais',
        consumo_mensal_kwh: 720,
        endereco: 'Rua XV de Novembro, 1500',
        cidade: 'Curitiba',
        estado: 'PR',
        status: 'Negociação',
        sla_dias: 21,
        sla_offset_days: 8,
        preco_venda: 27500,
        historico: [
          {
            data: new Date(now.getTime() - 13 * 86400000).toISOString(),
            tipo: 'criacao',
            descricao: 'Lead originado de anúncio no Instagram (clínica odontológica).',
          },
          {
            data: new Date(now.getTime() - 5 * 86400000).toISOString(),
            tipo: 'negociacao',
            descricao:
              'Reunião de alinhamento financeiro realizada. Aguardando aprovação de crédito bancário.',
          },
        ],
      },
      {
        nome: 'Marcos Pereira',
        email: 'marcos.pereira@fazendasaopedro.com.br',
        telefone: '(62) 98432-1100',
        origem: 'Parceria',
        consumo_mensal_kwh: 900,
        endereco: 'Rodovia GO-070, Km 14',
        cidade: 'Goiânia',
        estado: 'GO',
        status: 'Fechado Ganho',
        sla_dias: 15,
        sla_offset_days: 10,
        preco_venda: 35000,
        pr_assinada_ganho: true,
        historico: [
          {
            data: new Date(now.getTime() - 20 * 86400000).toISOString(),
            tipo: 'criacao',
            descricao: 'Parceria com cooperativa de produtores rurais.',
          },
          {
            data: new Date(now.getTime() - 3 * 86400000).toISOString(),
            tipo: 'fechamento',
            descricao:
              'Contrato assinado e entrada confirmada. Projeto encaminhado para homologação na concessionária.',
          },
        ],
      },
      {
        nome: 'Patrícia Rocha',
        email: 'patricia.rocha@arquitetura.com.br',
        telefone: '(85) 99888-7766',
        origem: 'Outros',
        consumo_mensal_kwh: 540,
        endereco: 'Av. Beira Mar, 4100',
        cidade: 'Fortaleza',
        estado: 'CE',
        status: 'Fechado Perdido',
        sla_dias: 7,
        sla_offset_days: -5,
        preco_venda: 20500,
        historico: [
          {
            data: new Date(now.getTime() - 25 * 86400000).toISOString(),
            tipo: 'criacao',
            descricao: 'Contato direto por indicação de construtora parceira.',
          },
          {
            data: new Date(now.getTime() - 8 * 86400000).toISOString(),
            tipo: 'perda',
            descricao: 'Cliente optou por adiar a obra do telhado por tempo indeterminado.',
          },
        ],
      },
    ]

    for (const lead of sampleLeads) {
      try {
        app.findFirstRecordByData('leads', 'email', lead.email)
      } catch (_) {
        const rec = new Record(leadsCol)
        rec.set('nome', lead.nome)
        rec.set('email', lead.email)
        rec.set('telefone', lead.telefone)
        rec.set('origem', lead.origem)
        rec.set('consumo_mensal_kwh', lead.consumo_mensal_kwh)
        rec.set('endereco', lead.endereco)
        rec.set('cidade', lead.cidade)
        rec.set('estado', lead.estado)
        rec.set('status', lead.status)
        rec.set('sla_dias', lead.sla_dias)

        const slaDate = new Date(now.getTime() + lead.sla_offset_days * 86400000)
        rec.set('sla_limite', slaDate.toISOString().replace('T', ' ').substring(0, 19) + 'Z')
        rec.set('preco_venda', lead.preco_venda)
        rec.set('proprietario', adminId)
        rec.set('pr_assinada_ganho', lead.pr_assinada_ganho || false)
        rec.set('historico', lead.historico)
        app.save(rec)
      }
    }

    // 4. Seed sample invite in convidados
    const convidadosCol = app.findCollectionByNameOrId('convidados')
    try {
      app.findFirstRecordByData('convidados', 'email', 'vendedor.demo@solarcrm.com')
    } catch (_) {
      const inv = new Record(convidadosCol)
      inv.set('nome', 'Lucas Vendedor')
      inv.set('email', 'vendedor.demo@solarcrm.com')
      inv.set('role', 'Vendedor')
      inv.set('codigo_convite', 'SOL789')
      inv.set('ativo', true)
      app.save(inv)
    }
  },
  (app) => {
    // down migration
  },
)
