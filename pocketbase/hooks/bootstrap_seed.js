// Hook to trigger idempotent seed on server bootstrap / first request if records don't exist yet
routerAdd('GET', '/backend/v1/health', (e) => {
  return e.json(200, { status: 'ok' })
})

onBootstrap((e) => {
  e.next()
  try {
    const usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
    let adminRecord = null
    try {
      adminRecord = $app.findAuthRecordByEmail('_pb_users_auth_', 'hernandes43210@gmail.com')
      if (adminRecord.getString('role') !== 'Admin') {
        adminRecord.set('role', 'Admin')
        $app.save(adminRecord)
      }
    } catch (_) {
      const rec = new Record(usersCol)
      rec.setEmail('hernandes43210@gmail.com')
      rec.setPassword('Skip@Pass')
      rec.setVerified(true)
      rec.set('name', 'Hernandes Admin')
      rec.set('role', 'Admin')
      $app.save(rec)
      adminRecord = rec
    }

    const adminId = adminRecord ? adminRecord.id : ''

    // Check kits
    const kitsCol = $app.findCollectionByNameOrId('kits')
    const sampleKits = [
      {
        nome: 'Kit Residencial 4,5 kWp',
        fabricante: 'Canadian Solar / Growatt',
        potencia_kw: 4.5,
        categoria: 'Residencial',
        custo: 12500,
        margem: 30,
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
        margem: 30,
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
        margem: 25,
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
        margem: 22,
        preco_venda: 61538.46,
        descricao:
          'Desenvolvido para granjas, pivôs de irrigação e fazendas com ligação rural ou trifásica.',
      },
    ]

    for (let i = 0; i < sampleKits.length; i++) {
      const kit = sampleKits[i]
      try {
        $app.findFirstRecordByData('kits', 'nome', kit.nome)
      } catch (_) {
        const kRec = new Record(kitsCol)
        kRec.set('nome', kit.nome)
        kRec.set('fabricante', kit.fabricante)
        kRec.set('potencia_kw', kit.potencia_kw)
        kRec.set('categoria', kit.categoria)
        kRec.set('custo', kit.custo)
        kRec.set('margem', kit.margem)
        kRec.set('preco_venda', kit.preco_venda)
        kRec.set('descricao', kit.descricao)
        $app.save(kRec)
      }
    }

    // Check leads
    const leadsCol = $app.findCollectionByNameOrId('leads')
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
        sla_offset_days: 5,
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
        sla_offset_days: 1,
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
        sla_offset_days: -2,
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

    for (let i = 0; i < sampleLeads.length; i++) {
      const lead = sampleLeads[i]
      try {
        $app.findFirstRecordByData('leads', 'email', lead.email)
      } catch (_) {
        const lRec = new Record(leadsCol)
        lRec.set('nome', lead.nome)
        lRec.set('email', lead.email)
        lRec.set('telefone', lead.telefone)
        lRec.set('origem', lead.origem)
        lRec.set('consumo_mensal_kwh', lead.consumo_mensal_kwh)
        lRec.set('endereco', lead.endereco)
        lRec.set('cidade', lead.cidade)
        lRec.set('estado', lead.estado)
        lRec.set('status', lead.status)
        lRec.set('sla_dias', lead.sla_dias)

        const slaDate = new Date(now.getTime() + lead.sla_offset_days * 86400000)
        lRec.set('sla_limite', slaDate.toISOString().replace('T', ' ').substring(0, 19) + 'Z')
        lRec.set('preco_venda', lead.preco_venda)
        if (adminId) {
          lRec.set('proprietario', adminId)
        }
        lRec.set('pr_assinada_ganho', lead.pr_assinada_ganho || false)
        lRec.set('historico', lead.historico)
        $app.save(lRec)
      }
    }

    // Check convidados
    const convidadosCol = $app.findCollectionByNameOrId('convidados')
    try {
      $app.findFirstRecordByData('convidados', 'email', 'vendedor.demo@solarcrm.com')
    } catch (_) {
      const inv = new Record(convidadosCol)
      inv.set('nome', 'Lucas Vendedor')
      inv.set('email', 'vendedor.demo@solarcrm.com')
      inv.set('role', 'Vendedor')
      inv.set('codigo_convite', 'SOL789')
      inv.set('ativo', true)
      $app.save(inv)
    }
  } catch (err) {
    console.error('Bootstrap seed error:', err)
  }
})
