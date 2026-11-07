/// <reference path="../../pb_data/types.d.ts" />
// 0081 — MIGRAÇÃO DE DADOS: migra os kits da coleção antiga "kits" (área antiga
// "Kits Solares") para a coleção nova "kit_gerados" (Gerador de Kit Solar),
// com ativo = true. Idempotente: em banco vazio é no-op e os kits já migrados
// (marcados via campo oculto "origem_kits") são pulados. NÃO apaga nada da
// coleção antiga — o histórico de propostas continua intacto.
migrate(
  (app) => {
    if (!app.hasTable('kits') || !app.hasTable('kit_gerados')) return

    // campo auxiliar para marcar o que já foi migrado (idempotência)
    const colOrigem = app.findCollectionByNameOrId('kits')
    if (!colOrigem.fields.getByName('origem_kits')) {
      colOrigem.fields.add(new TextField({ name: 'origem_kits' }))
      app.save(colOrigem)
    }

    const jaMigrados = new Set(
      app.findRecordsByFilter('kits', "origem_kits != ''", '', 5000, 0).map((r) => r.id),
    )

    const registros = app.findRecordsByFilter('kits', '', '-created', 5000, 0)

    // --------- helpers de parse (coleção antiga guarda json em texto) ---------
    const parseNum = (v) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'))
      return Number.isFinite(n) ? n : 0
    }
    const parseJson = (v, padrao) => {
      if (v == null || v === '') return padrao
      if (typeof v === 'object') return v
      try {
        const parsed = JSON.parse(String(v))
        return parsed ?? padrao
      } catch (_) {
        return padrao
      }
    }
    const extrairQtd = (descricao, regex) => {
      const m = String(descricao || '').match(regex)
      if (!m) return null
      const n = parseInt(m[1], 10)
      return Number.isFinite(n) && n > 0 ? n : null
    }
    const potDeTexto = (texto) => {
      const m = String(texto || '').match(/(\d+(?:[.,]\d+)?)\s*k?W/i)
      if (!m) return 0
      const n = parseNum(m[1])
      // "610 W" painel vs "10 kW" inversor — decide pelo sufixo capturado
      const sufixo = String(m[0]).toLowerCase()
      if (sufixo.includes('kw')) return n
      return n
    }

    // ------------------------- mapeamento -------------------------
    for (const r of registros) {
      if (jaMigrados.has(r.id)) continue

      const nome = r.getString('nome') || 'Kit migrado'
      const custo = parseNum(r.get('custo'))
      const margem = parseNum(r.get('margem'))

      // -------- painel: marca/área podem estar na descrição; qtd também --------
      const marcaPainel = r.getString('marca_painel') || ''
      const modeloPainel = marcaPainel // a coleção antiga não tem modelo separado
      const potenciaPainelW = parseNum(r.get('potencia_painel_w'))
      const qtdPaineis =
        extrairQtd(r.get('descricao'), /(\d+)\s*[x×]\s*(?:m[óo]dulo|painel)/i) ||
        (potenciaPainelW > 0 && parseNum(r.get('potencia_kw')) > 0
          ? Math.round((parseNum(r.get('potencia_kw')) * 1000) / potenciaPainelW)
          : 0)

      // -------- inversor --------
      const marcaInversor = r.getString('marca_inversor') || ''
      const potenciaInversorKw = parseNum(r.get('potencia_inversor_kw'))
      const qtdInversores = extrairQtd(r.get('descricao'), /(\d+)\s*[x×]\s*(?:inversor)/i) || 1

      const descricao = r.getString('descricao') || ''
      const tipoEstrutura = r.getString('tipo_estrutura') || ''
      const tipoInstalacao = tipoEstrutura
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')
        .replace(/^Fibrocimento$/, 'Fibrocimento')
        .replace(/^Solo Monoposte$/, 'Solo monoposte')
        .replace(/^Solo$/, 'Solo')

      // -------- itens: usa a descrição antiga como item único quando existir --------
      const itens = []
      if (descricao) itens.push({ nome: descricao, qtd: 1 })

      // -------- precificação (coleção antiga: margem sobre o custo) --------
      const precoVenda =
        parseNum(r.get('preco_venda')) ||
        (margem < 100 ? Math.round((custo / (1 - margem / 100)) * 100) / 100 : custo)
      const acrescimoPct = custo > 0 ? ((precoVenda - custo) / custo) * 100 : margem
      const precoFinal = precoVenda // sem desconto gravado na coleção antiga
      const lucro = precoFinal - custo
      const margemPct = precoFinal > 0 ? (lucro / precoFinal) * 100 : 0

      // -------- catálogo: reutiliza painel/inversor existente no catálogo --------
      const buscarPainel = () => {
        if (!marcaPainel || !potenciaPainelW) return null
        const filtro = `marca = "${escapar(marcaPainel)}" && potencia_w = ${potenciaPainelW}`
        try {
          return app.findRecordsByFilter('kit_paineis', filtro, '', 1, 0)[0] || null
        } catch (_) {
          return null
        }
      }
      const buscarInversor = () => {
        if (!marcaInversor || !potenciaInversorKw) return null
        const filtro = `marca = "${escapar(marcaInversor)}" && potencia_kw = ${potenciaInversorKw}`
        try {
          return app.findRecordsByFilter('kit_inversores', filtro, '', 1, 0)[0] || null
        } catch (_) {
          return null
        }
      }

      const painelCat = buscarPainel()
      const inversorCat = buscarInversor()

      const painelJson = {
        marca: painelCat ? painelCat.getString('marca') : marcaPainel,
        modelo: painelCat ? painelCat.getString('modelo') : modeloPainel,
        potencia_w: potenciaPainelW,
        area_m2: painelCat ? painelCat.getFloat('area_m2') : 2.79,
        qtd: qtdPaineis,
      }
      const inversorJson = {
        marca: inversorCat ? inversorCat.getString('marca') : marcaInversor,
        modelo: inversorCat ? inversorCat.getString('modelo') : '',
        potencia_kw: potenciaInversorKw,
        tipo: inversorCat ? inversorCat.getString('tipo') : '',
        qtd: qtdInversores,
      }

      const kitNovo = new Record(app.findCollectionByNameOrId('kit_gerados'))
      kitNovo.set('nome', nome)
      kitNovo.set('potencia_kwp', parseNum(r.get('potencia_kw')))
      kitNovo.set('geracao_kwh', 0)
      kitNovo.set('area_m2', qtdPaineis > 0 ? qtdPaineis * painelJson.area_m2 : 0)
      kitNovo.set('tipo_instalacao', tipoInstalacao)
      kitNovo.set('ligacao', '')
      kitNovo.set('distribuidora', '')
      kitNovo.set('painel', JSON.stringify(painelJson))
      kitNovo.set('inversor', JSON.stringify(inversorJson))
      kitNovo.set('itens', JSON.stringify(itens))
      kitNovo.set('custo', custo)
      kitNovo.set('acrescimo_pct', Math.round(acrescimoPct * 100) / 100)
      kitNovo.set('preco_venda', precoVenda)
      kitNovo.set('desconto_tipo', '%')
      kitNovo.set('desconto_valor', 0)
      kitNovo.set('desconto_rs', 0)
      kitNovo.set('preco_final', precoFinal)
      kitNovo.set('lucro', Math.round(lucro * 100) / 100)
      kitNovo.set('margem_pct', Math.round(margemPct * 100) / 100)
      kitNovo.set('ativo', true)
      kitNovo.set('criado_por', r.getString('criado_por') || '')
      app.save(kitNovo)

      // guarda o id do registro novo em kit_gerados (marca de migração + rollback exato)
      r.set('origem_kits', kitNovo.id)
      app.save(r)
    }
  },
  (app) => {
    // rollback: remove os kit_gerados criados pela migração e desmarca a origem
    if (!app.hasTable('kit_gerados') || !app.hasTable('kits')) return
    let col
    try {
      col = app.findCollectionByNameOrId('kits')
    } catch (_) {
      return
    }
    if (!col.fields.getByName('origem_kits')) return
    const migrados = app.findRecordsByFilter('kits', "origem_kits != ''", '', 5000, 0)
    for (const r of migrados) {
      const alvoId = r.getString('origem_kits')
      if (alvoId) {
        try {
          const k = app.findRecordById('kit_gerados', alvoId)
          app.delete(k)
        } catch (_) {
          // já removido
        }
      }
      r.set('origem_kits', '')
      app.save(r)
    }
  },
)

function escapar(valor) {
  return String(valor || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
}
