/**
 * 0079 — Cria as coleções do GERADOR DE KIT SOLAR:
 *   kit_paineis, kit_inversores, kit_distribuidoras, kit_gerados
 * e carrega os dados iniciais (origem "inicial", ativo).
 */
migrate(
  (app) => {
    // ---------- kit_paineis ----------
    if (!app.hasTable('kit_paineis')) {
      app.save(
        new Collection({
          name: 'kit_paineis',
          listRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
          viewRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
          createRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
          updateRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
          deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
          fields: [
            { name: 'marca', type: 'text', required: true },
            { name: 'modelo', type: 'text', required: true },
            { name: 'potencia_w', type: 'number', required: true },
            { name: 'area_m2', type: 'number' },
            {
              name: 'origem',
              type: 'select',
              required: true,
              values: ['inicial', 'cadastrado'],
              maxSelect: 1,
            },
            { name: 'ativo', type: 'bool' },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: [
            'CREATE INDEX idx_kit_paineis_marca ON kit_paineis (marca)',
            'CREATE INDEX idx_kit_paineis_ativo ON kit_paineis (ativo)',
          ],
        }),
      )
    }

    // ---------- kit_inversores ----------
    if (!app.hasTable('kit_inversores')) {
      app.save(
        new Collection({
          name: 'kit_inversores',
          listRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
          viewRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
          createRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
          updateRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
          deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
          fields: [
            { name: 'marca', type: 'text', required: true },
            { name: 'modelo', type: 'text', required: true },
            { name: 'potencia_kw', type: 'number', required: true },
            {
              name: 'tipo',
              type: 'select',
              required: true,
              values: [
                'Monofásico',
                'Trifásico',
                'Híbrido monofásico',
                'Híbrido trifásico',
                'Eco-híbrido / off-grid',
                'Microinversor',
              ],
              maxSelect: 1,
            },
            {
              name: 'origem',
              type: 'select',
              required: true,
              values: ['inicial', 'cadastrado'],
              maxSelect: 1,
            },
            { name: 'ativo', type: 'bool' },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: [
            'CREATE INDEX idx_kit_inversores_marca ON kit_inversores (marca)',
            'CREATE INDEX idx_kit_inversores_ativo ON kit_inversores (ativo)',
          ],
        }),
      )
    }

    // ---------- kit_distribuidoras ----------
    if (!app.hasTable('kit_distribuidoras')) {
      app.save(
        new Collection({
          name: 'kit_distribuidoras',
          listRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
          viewRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
          createRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
          updateRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
          deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
          fields: [
            { name: 'nome', type: 'text', required: true },
            { name: 'ativo', type: 'bool' },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: ['CREATE INDEX idx_kit_distribuidoras_ativo ON kit_distribuidoras (ativo)'],
        }),
      )
    }

    // ---------- kit_gerados ----------
    if (!app.hasTable('kit_gerados')) {
      app.save(
        new Collection({
          name: 'kit_gerados',
          listRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
          viewRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
          createRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
          updateRule: "@request.auth.id != '' && @request.auth.role != 'Engenheiro'",
          deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
          fields: [
            { name: 'nome', type: 'text', required: true },
            { name: 'potencia_kwp', type: 'number' },
            { name: 'geracao_kwh', type: 'number' },
            { name: 'area_m2', type: 'number' },
            { name: 'tipo_instalacao', type: 'text' },
            {
              name: 'ligacao',
              type: 'select',
              values: ['Monofásica', 'Bifásica', 'Trifásica'],
              maxSelect: 1,
            },
            { name: 'distribuidora', type: 'text' },
            { name: 'painel', type: 'json', maxSize: 2000000 },
            { name: 'inversor', type: 'json', maxSize: 2000000 },
            { name: 'itens', type: 'json', maxSize: 2000000 },
            { name: 'custo', type: 'number' },
            { name: 'acrescimo_pct', type: 'number' },
            { name: 'preco_venda', type: 'number' },
            { name: 'desconto_tipo', type: 'select', values: ['%', 'R$'], maxSelect: 1 },
            { name: 'desconto_valor', type: 'number' },
            { name: 'desconto_rs', type: 'number' },
            { name: 'preco_final', type: 'number' },
            { name: 'lucro', type: 'number' },
            { name: 'margem_pct', type: 'number' },
            { name: 'criado_por', type: 'text' },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: [
            'CREATE INDEX idx_kit_gerados_created ON kit_gerados (created)',
            'CREATE INDEX idx_kit_gerados_distribuidora ON kit_gerados (distribuidora)',
          ],
        }),
      )
    }

    // ================= SEEDS (idempotentes) =================
    const seedDistribuidoras = () => {
      const existentes = app.findRecordsByFilter('kit_distribuidoras', 'ativo = true', '', 500, 0)
      const nomesExistentes = new Set(
        existentes.map((r) => r.getString('nome').trim().toLowerCase()),
      )
      const iniciais = ['Bel Energy', 'PHB', 'Odex Solar']
      for (const nome of iniciais) {
        if (!nomesExistentes.has(nome.toLowerCase())) {
          const rec = new Record(app.findCollectionByNameOrId('kit_distribuidoras'))
          rec.set('nome', nome)
          rec.set('ativo', true)
          app.save(rec)
        }
      }
    }

    const seedPaineis = () => {
      const existentes = app.findRecordsByFilter('kit_paineis', 'ativo = true', '', 500, 0)
      const chave = (marca, modelo, w) =>
        `${marca.trim().toLowerCase()}|${modelo.trim().toLowerCase()}|${w}`
      const set = new Set(
        existentes.map((r) =>
          chave(r.getString('marca'), r.getString('modelo'), r.getInt('potencia_w')),
        ),
      )

      const paineis = [
        ['Astronergy', 'Mono 615 W', 615, 2.79],
        ['Astronergy', 'Mono 610 W', 610, 2.79],
        ['Era Solar', 'Mono 620 W', 620, 2.79],
        ['DMEGC', 'DM610G12RT-B66HSW bifacial N-type', 610, 2.7],
        ['Tongwei', 'Mono 615 W', 615, 2.79],
        ['Tongwei', 'Mono 610 W', 610, 2.79],
        ['OSDA', 'Mono 610 W', 610, 2.79],
        ['Renesola', 'Mono 585 W', 585, 2.58],
      ]
      for (const [marca, modelo, w, area] of paineis) {
        if (!set.has(chave(marca, modelo, w))) {
          const rec = new Record(app.findCollectionByNameOrId('kit_paineis'))
          rec.set('marca', marca)
          rec.set('modelo', modelo)
          rec.set('potencia_w', w)
          rec.set('area_m2', area)
          rec.set('origem', 'inicial')
          rec.set('ativo', true)
          app.save(rec)
        }
      }
    }

    const seedInversores = () => {
      const existentes = app.findRecordsByFilter('kit_inversores', 'ativo = true', '', 500, 0)
      const chave = (marca, modelo, kw) =>
        `${marca.trim().toLowerCase()}|${modelo.trim().toLowerCase()}|${kw}`
      const set = new Set(
        existentes.map((r) =>
          chave(r.getString('marca'), r.getString('modelo'), r.getFloat('potencia_kw')),
        ),
      )

      const inversores = [
        ['HUAWEI', 'SUN2000-2KTL-L1', 2, 'Híbrido monofásico'],
        ['HUAWEI', 'SUN2000-3KTL-L1', 3, 'Híbrido monofásico'],
        ['HUAWEI', 'SUN2000-3.68KTL-L1', 3.68, 'Híbrido monofásico'],
        ['HUAWEI', 'SUN2000-4KTL-L1', 4, 'Híbrido monofásico'],
        ['HUAWEI', 'SUN2000-4.6KTL-L1', 4.6, 'Híbrido monofásico'],
        ['HUAWEI', 'SUN2000-5KTL-L1', 5, 'Híbrido monofásico'],
        ['HUAWEI', 'SUN2000-6KTL-L1', 6, 'Híbrido monofásico'],
        ['HUAWEI', 'SUN2000-3KTL-M1', 3, 'Híbrido trifásico'],
        ['HUAWEI', 'SUN2000-4KTL-M1', 4, 'Híbrido trifásico'],
        ['HUAWEI', 'SUN2000-5KTL-M1', 5, 'Híbrido trifásico'],
        ['HUAWEI', 'SUN2000-6KTL-M1', 6, 'Híbrido trifásico'],
        ['HUAWEI', 'SUN2000-8KTL-M1', 8, 'Híbrido trifásico'],
        ['HUAWEI', 'SUN2000-10KTL-M1', 10, 'Híbrido trifásico'],
        ['Sungrow', 'SG3.0RS', 3, 'Monofásico'],
        ['Sungrow', 'SG3.6RS', 3.6, 'Monofásico'],
        ['Sungrow', 'SG4.0RS', 4, 'Monofásico'],
        ['Sungrow', 'SG5.0RS', 5, 'Monofásico'],
        ['Sungrow', 'SG6.0RS', 6, 'Monofásico'],
        ['Sungrow', 'SG7.5RS-L', 7.5, 'Monofásico'],
        ['Sungrow', 'SG8.0RS-L', 8, 'Monofásico'],
        ['Sungrow', 'SG9.0RS-L', 9, 'Monofásico'],
        ['Sungrow', 'SG10RS-L', 10, 'Monofásico'],
        ['Sungrow', 'SG5.0RT', 5, 'Trifásico'],
        ['Sungrow', 'SG6.0RT', 6, 'Trifásico'],
        ['Sungrow', 'SG8.0RT', 8, 'Trifásico'],
        ['Sungrow', 'SG10RT', 10, 'Trifásico'],
        ['Sungrow', 'SG12RT', 12, 'Trifásico'],
        ['Sungrow', 'SG15RT', 15, 'Trifásico'],
        ['Sungrow', 'SG17RT', 17, 'Trifásico'],
        ['Sungrow', 'SG20RT', 20, 'Trifásico'],
        ['Sungrow', 'SH3.0RS', 3, 'Híbrido monofásico'],
        ['Sungrow', 'SH3.6RS', 3.6, 'Híbrido monofásico'],
        ['Sungrow', 'SH4.0RS', 4, 'Híbrido monofásico'],
        ['Sungrow', 'SH5.0RS', 5, 'Híbrido monofásico'],
        ['Sungrow', 'SH6.0RS', 6, 'Híbrido monofásico'],
        ['Sungrow', 'SH5.0RT', 5, 'Híbrido trifásico'],
        ['Sungrow', 'SH6.0RT', 6, 'Híbrido trifásico'],
        ['Sungrow', 'SH8.0RT', 8, 'Híbrido trifásico'],
        ['Sungrow', 'SH10RT', 10, 'Híbrido trifásico'],
        ['Lux Power', 'LXP-LB-BR 5K', 5, 'Híbrido monofásico'],
        ['Lux Power', 'LXP-LB-BR 10K', 10, 'Híbrido monofásico'],
        ['Lux Power', 'SNA-BR 5K', 5, 'Eco-híbrido / off-grid'],
        ['Lux Power', 'SNA-BR 10K', 10, 'Eco-híbrido / off-grid'],
        ['Lux Power', 'SNA-BR 12K', 12, 'Eco-híbrido / off-grid'],
        ['GoodWe', 'GW6K-DNS-G40', 6, 'Monofásico'],
        ['PHB', 'PHB6000D-WS AFCI', 6, 'Monofásico'],
        ['Livoltek', '7,5 kW', 7.5, 'Monofásico'],
        ['Solis', 'S6-GR1P5K-S', 1.5, 'Monofásico'],
      ]
      for (const [marca, modelo, kw, tipo] of inversores) {
        if (!set.has(chave(marca, modelo, kw))) {
          const rec = new Record(app.findCollectionByNameOrId('kit_inversores'))
          rec.set('marca', marca)
          rec.set('modelo', modelo)
          rec.set('potencia_kw', kw)
          rec.set('tipo', tipo)
          rec.set('origem', 'inicial')
          rec.set('ativo', true)
          app.save(rec)
        }
      }
    }

    seedDistribuidoras()
    seedPaineis()
    seedInversores()
  },
  (app) => {
    for (const nome of ['kit_gerados', 'kit_inversores', 'kit_paineis', 'kit_distribuidoras']) {
      try {
        const col = app.findCollectionByNameOrId(nome)
        app.delete(col)
      } catch (_) {
        // coleção não existe — nada a reverter
      }
    }
  },
)
