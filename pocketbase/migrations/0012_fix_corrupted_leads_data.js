migrate(
  (app) => {
    // 1. Corrigir preco_venda absurdo em leads (ex: distorcidos por parsing do Luvik > 1.000.000)
    // Sistemas solares residenciais/comerciais típicos não custam dezenas de milhões/trilhões.
    // Para valores absurdos (> 1.000.000), zeramos o preco_venda conforme especificação.
    app
      .db()
      .newQuery(`
      UPDATE leads 
      SET preco_venda = 0 
      WHERE preco_venda > 1000000
    `)
      .execute()

    // 2. Corrigir historico salvo como array de bytes ASCII/UTF-8 em leads
    try {
      const records = app.findRecordsByFilter(
        'leads',
        "origem = 'Outros' || email ~ '@leadsolar.crm'",
        '',
        200,
        0,
      )
      for (let i = 0; i < records.length; i++) {
        const lead = records[i]
        const rawHist = lead.get('historico')
        if (Array.isArray(rawHist) && rawHist.length > 0 && typeof rawHist[0] === 'number') {
          try {
            let str = ''
            for (let b = 0; b < rawHist.length; b++) {
              str += String.fromCharCode(rawHist[b])
            }
            const parsed = JSON.parse(str)
            if (Array.isArray(parsed)) {
              lead.set('historico', parsed)
              app.save(lead)
            }
          } catch (_) {
            // Se não conseguir parsear, atribui array padrão
            lead.set('historico', [
              {
                data: lead.getString('created') || new Date().toISOString(),
                tipo: 'criacao',
                descricao:
                  "Lead criado no sistema com status inicial '" +
                  (lead.getString('status') || 'Novo') +
                  "'.",
              },
            ])
            app.save(lead)
          }
        }
      }
    } catch (err) {
      console.error('Erro na migracao 0012 ao corrigir historico:', err)
    }
  },
  (app) => {},
)
