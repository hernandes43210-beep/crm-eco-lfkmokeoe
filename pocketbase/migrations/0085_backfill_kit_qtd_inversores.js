// 0085: backfill de kit_qtd_inversores para propostas criadas antes do campo existir.
// Para cada proposta com kit_qtd_inversores vazio, descobre a quantidade nesta ordem:
//   1. kit_gerados vinculado (relação "kit") → JSON.parse(kit_gerados.inversor).qtd
//   2. kit_descricao da própria proposta → "N× ... inversor..." (ex.: "52× Sungrow MICROINVERSOR ... 2.5 kW")
//   3. Fallback 1 quando nada é encontrado.
// Idempotente: só toca em propostas com o campo vazio/zero. Em banco vazio é no-op.
migrate(
  (app) => {
    const propostas = app.findRecordsByFilter(
      'propostas',
      'kit_qtd_inversores = 0 || kit_qtd_inversores = ""',
      '-created',
      500,
      0,
    )

    const qtdDeDescricao = (descricao) => {
      const m = String(descricao || '').match(/(\d+)\s*[x×]\s*[^\n•;]*inversor/i)
      if (!m) return 0
      const n = parseInt(m[1], 10)
      return Number.isFinite(n) && n > 0 ? n : 0
    }

    let atualizadas = 0
    for (let i = 0; i < propostas.length; i++) {
      const proposta = propostas[i]
      let qtd = 0

      // 1. Kit gerado vinculado
      const kitId = proposta.getString('kit')
      if (kitId) {
        try {
          const kit = app.findFirstRecordByData('kit_gerados', 'id', kitId)
          try {
            const raw = kit.getString('inversor')
            if (raw) {
              const parsed = JSON.parse(raw)
              const qtdKit = parseInt(parsed && parsed.qtd, 10)
              if (!isNaN(qtdKit) && qtdKit > 0) qtd = qtdKit
            }
          } catch (_) {
            // JSON do inversor ilegível — segue para as próximas fontes
          }
        } catch (_) {
          // kit_gerados não encontrado (kit antigo/removido) — segue para as próximas fontes
        }
      }

      // 2. Descrição da proposta ("52× Sungrow MICROINVERSOR ...")
      if (!qtd) {
        qtd = qtdDeDescricao(proposta.getString('kit_descricao'))
      }

      // 3. Fallback
      if (!qtd) qtd = 1

      proposta.set('kit_qtd_inversores', qtd)
      app.save(proposta)
      atualizadas++
    }

    console.log('0085 backfill kit_qtd_inversores: ' + atualizadas + ' proposta(s) atualizada(s)')
  },
  (app) => {
    // down: não remove dados preenchidos (a estrutura do campo é da migration 0084)
  },
)
