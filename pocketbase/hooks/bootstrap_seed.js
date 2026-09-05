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

    // Nota: leads de exemplo não são mais recriados no bootstrap para manter a base limpa conforme solicitado.

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
