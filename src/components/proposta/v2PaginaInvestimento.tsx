/**
 * Página 4 — INVESTIMENTO E RETORNO (espelha pagina4 de proposalPdf.ts):
 * preço com desconto, 4 cartões, comparativo Poupança/CDB/Solar,
 * como calculamos + transparência (Fio B conforme o ano da emissão).
 */
import type { DadosV2 } from '@/lib/proposalDadosV2'
import {
  RENDIMENTO_POUPANCA_AO_ANO as REN_POUP,
  RENDIMENTO_CDB_LIQUIDO_AO_ANO as REN_CDB,
} from '@/lib/proposalCalculos'
import { CabecalhoInterno, RodapeInterno, LiV2 } from './v2Bits'

export function PaginaInvestimento({ d, kitNome = '' }: { d: DadosV2; kitNome?: string }) {
  const maxRend = Math.max(d.rendimentoSolarInt, Math.round(d.calc.rendimentoSolarPct) || 0, 12)
  const largura = (pct: number) => Math.max(6, Math.round((pct / Math.max(maxRend, 1)) * 100))
  const poupancaPct = Math.round(REN_POUP * 100)
  const cdbPct = Math.round(REN_CDB * 100)

  const barras = [
    {
      nome: `Poupança ${String(poupancaPct).replace('.', ',')}% a.a.`,
      pct: poupancaPct,
      cor: '#aab4c9',
    },
    { nome: 'CDB (líquido de IR) ~10% a.a.', pct: cdbPct, cor: '#1d4290' },
    {
      nome: 'Energia solar (economia)',
      pct: d.rendimentoSolarInt,
      cor: '#11845b',
      solar: true,
    },
  ]

  const fioBTexto =
    d.anoEmissao >= 2028
      ? 'em 2028, 90% desse componente'
      : d.anoEmissao === 2027
        ? 'em 2027, 75% desse componente'
        : `em ${d.anoEmissao}, ${d.fioB}% desse componente (2027: 75%, 2028: 90%)`

  void kitNome

  return (
    <section className="pv-page">
      <CabecalhoInterno d={d} />
      <div className="pv-page-inner pv-pad">
        <div style={{ marginTop: '6mm' }}>
          <span className="pv-sec-tag">2 • Investimento e retorno</span>
          <h2 className="pv-sec-title" style={{ marginTop: '3mm' }}>
            Quanto custa e em quanto tempo se paga
          </h2>
        </div>

        <div className="pv-invest" style={{ marginTop: '5mm' }}>
          <div style={{ flex: 1 }}>
            <div className="lbl">Investimento total • chave na mão</div>
            <h3>{d.precoFinalRS}</h3>
            <p>
              Equipamentos + projeto de engenharia com ART + homologação na {d.concessionaria} +
              instalação.
            </p>
            <p style={{ marginTop: '1.5mm' }}>
              Sem custos escondidos: tudo o que está na página anterior já está neste valor.
            </p>
          </div>
          <div className="pv-preco">
            <div>
              <span className="cheio">{d.precoCheioRS}</span>
              <span className="off">-{d.descontoPct}% OFF</span>
            </div>
            <div className="final">{d.precoFinalRS}</div>
            <div className="economiza">Você economiza {d.descontoRS} nesta proposta</div>
          </div>
        </div>

        <div className="pv-cards4" style={{ marginTop: '4mm' }}>
          <div className="pv-inv-card">
            <div className="k">Economia/mês (estimada)</div>
            <div className="v">{d.economiaMensalRS}</div>
            <div className="n">média no primeiro ano</div>
          </div>
          <div className="pv-inv-card">
            <div className="k">Economia/ano</div>
            <div className="v">{d.economiaAnualRS}</div>
            <div className="n">dinheiro que fica com você</div>
          </div>
          <div className="pv-inv-card hl">
            <div className="k">Retorno</div>
            <div className="v">{d.paybackCurtoTxt.replace('≈ ', '')}</div>
            <div className="n">{d.paybackExtensoTxt}</div>
          </div>
          <div className="pv-inv-card">
            <div className="k">Em 25 anos</div>
            <div className="v">R$ {d.economia25Txt}</div>
            <div className="n">sem contar reajustes</div>
          </div>
        </div>

        <div className="pv-card" style={{ marginTop: '4mm' }}>
          <h3>Comparando com deixar o dinheiro aplicado</h3>
          <p className="pv-sub" style={{ marginTop: '1mm' }}>
            Se você colocar {d.precoFinalRS} em uma aplicação, quanto ela devolve por ano? Compare
            com o que o sistema solar devolve em economia:
          </p>
          <div className="pv-barras" style={{ marginTop: '2.5mm' }}>
            {barras.map((b) => (
              <div className="linha" key={b.nome}>
                <span className="nome">{b.nome}</span>
                <span className="faixa">
                  <span
                    className="fill"
                    style={{ width: `${largura(b.pct)}%`, background: b.cor }}
                  />
                </span>
                <span className={`pct ${b.solar ? 'solar' : ''}`}>
                  {String(b.pct).replace('.', ',')}%
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '8.4pt', marginTop: '2.5mm' }}>
            <strong>Em reais, no 1º ano:</strong> aplicação no CDB ≈ {d.cdbNoPrimeiroAnoRS} •
            sistema solar ≈ {d.economiaAnualRS} de economia.
          </p>
          <p className="pv-nota" style={{ marginTop: '1.5mm' }}>
            Rendimentos de referência aproximados, apenas para comparação. A economia na conta de
            luz não paga imposto de renda.
          </p>
        </div>

        <div className="pv-grid2" style={{ marginTop: '4mm' }}>
          <div className="pv-card">
            <h3>Como calculamos a economia</h3>
            <LiV2 cor="v">
              Geração de ~{Math.round(d.calc.geracaoMensalKwh)} kWh/mês, com 20% de perdas já
              descontadas.
            </LiV2>
            <LiV2 cor="v">
              Tarifa média de {d.tarifaRS}/kWh com impostos, a mesma da sua conta.
            </LiV2>
            <LiV2 cor="v">
              Sem considerar aumentos futuros da conta de luz — que historicamente sobem todos os
              anos e deixam a economia ainda maior.
            </LiV2>
            <LiV2 cor="v">
              Em 25 anos já descontamos o leve desgaste natural dos painéis (cerca de 0,4% ao ano).
            </LiV2>
          </div>
          <div className="pv-caixa-am">
            <h4>O que continua aparecendo na sua conta (transparência)</h4>
            <p>
              • A taxa mínima da {d.concessionaria} (custo de disponibilidade), que todo cliente
              conectado à rede paga;
            </p>
            <p>
              • O Fio B (Lei 14.300): uma parte do uso da rede cobrada sobre a energia que vai e
              volta como crédito — {fioBTexto};
            </p>
            <p>• O consumo que passar do que o sistema gera.</p>
            <p style={{ fontWeight: 700 }}>
              Por isso falamos em economia estimada: a conta não zera, mas cai muito.
            </p>
          </div>
        </div>
      </div>
      <RodapeInterno pagina={4} />
    </section>
  )
}
