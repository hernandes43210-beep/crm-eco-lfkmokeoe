/**
 * Página 4 — INVESTIMENTO E RETORNO (espelha pagina4 de proposalPdf.ts):
 * preço com desconto, cartões de economia, comparativo de rendimento e Fio B.
 */
import type { DadosV2 } from '@/lib/proposalDadosV2'
import { CabecalhoInterno, RodapeInterno, LiV2 } from './v2Bits'

export function PaginaInvestimento({ d, kitNome = '' }: { d: DadosV2; kitNome?: string }) {
  const barras = [
    { nome: 'Poupança', pct: 6.17, cor: '#aab4c9', pctTxt: '6,17%' },
    { nome: 'CDB (~liquido)', pct: 10, cor: '#1d4290', pctTxt: '10%' },
    {
      nome: 'Energia solar',
      pct: d.calc.rendimentoSolarPct,
      cor: '#11845b',
      pctTxt: `${d.rendimentoSolarInt}%`,
      solar: true,
    },
  ]
  const maxPct = Math.max(...barras.map((b) => b.pct), 1)

  return (
    <section className="pv-page">
      <CabecalhoInterno d={d} />
      <div className="pv-page-inner pv-pad">
        <div style={{ marginTop: '6mm' }}>
          <span className="pv-sec-tag">2 • Investimento e retorno</span>
        </div>

        <div className="pv-invest" style={{ marginTop: '4mm' }}>
          <div style={{ flex: 1 }}>
            <div className="lbl">Investimento total</div>
            <h3>Sistema {d.kwpFmt} kWp completo</h3>
            <p>
              {kitNome || 'Kit solar homologado'}
              <br />
              Projeto + ART + homologação + instalação + monitoramento, tudo incluso.
            </p>
          </div>
          <div className="pv-preco">
            {d.descontoPct > 0 && (
              <>
                <span className="cheio">{d.precoCheioRS}</span>
                <span className="off">-{d.descontoPct}% OFF</span>
              </>
            )}
            <div className="final">{d.precoFinalRS}</div>
            <div className="economiza">💡 Você economiza {d.descontoRS}</div>
          </div>
        </div>

        <div className="pv-cards4" style={{ marginTop: '5mm' }}>
          <div className="pv-inv-card">
            <div className="k">Economia por mês</div>
            <div className="v">{d.economiaMensalRS}</div>
            <div className="n">direto na conta de luz</div>
          </div>
          <div className="pv-inv-card">
            <div className="k">Economia por ano</div>
            <div className="v">{d.economiaAnualRS}</div>
            <div className="n">12 meses de geração</div>
          </div>
          <div className="pv-inv-card hl">
            <div className="k">Retorno</div>
            <div className="v">{d.paybackCurtoTxt}</div>
            <div className="n">{d.paybackExtensoTxt || 'tempo para o investimento se pagar'}</div>
          </div>
          <div className="pv-inv-card">
            <div className="k">Em 25 anos</div>
            <div className="v">R$ {d.economia25Txt}</div>
            <div className="n">já descontado o desgaste de 0,4% ao ano</div>
          </div>
        </div>

        <div className="pv-card" style={{ marginTop: '5mm' }}>
          <h3>Comparando com deixar o dinheiro aplicado</h3>
          <div className="pv-barras" style={{ marginTop: '2.5mm' }}>
            {barras.map((b) => (
              <div className="linha" key={b.nome}>
                <span className="nome">{b.nome}</span>
                <span className="faixa">
                  <span
                    className="fill"
                    style={{
                      width: `${(b.pct / maxPct) * 100}%`,
                      background: b.cor,
                      color: b.solar ? '#fff' : '#fff',
                    }}
                  />
                </span>
                <span className={`pct ${b.solar ? 'solar' : ''}`}>{b.pctTxt}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '7.6pt', color: '#5b6782', marginTop: '2.5mm' }}>
            Em reais, no 1º ano: R${' '}
            {Math.round((d.calc.precoFinal * 6.17) / 100).toLocaleString('pt-BR')} (poupança) • R${' '}
            {Math.round(d.calc.precoFinal / 10).toLocaleString('pt-BR')} (CDB) •{' '}
            <strong style={{ color: '#11845b' }}>{d.economiaAnualRS} (energia solar)</strong>
          </p>
          <p className="pv-nota" style={{ marginTop: '1.5mm' }}>
            Referência: poupança e CDB líquidos de IR conforme renda; a energia solar "rende" porque
            substitui uma conta que sempre existiria — e esse rendimento não depende do mercado.
          </p>
        </div>

        <div className="pv-card" style={{ marginTop: '5mm' }}>
          <h3>Como calculamos a economia</h3>
          <LiV2 cor="v">
            Partimos da <strong>geração real do sistema</strong> (
            {Math.round(d.calc.geracaoMensalKwh)} kWh/mês), nunca do consumo total — não prometemos
            mais do que o sistema entrega.
          </LiV2>
          <LiV2 cor="v">
            Geração × tarifa atual ({d.tarifaRS}/kWh) = economia mensal. A conta de hoje (
            {d.contaHojeRS}) serve de referência.
          </LiV2>
          <LiV2 cor="c">
            Não aplicamos reajuste futuro de tarifa: se ela subir, sua economia sobe junto — os
            números aqui são o piso.
          </LiV2>
        </div>

        <div className="pv-caixa-am" style={{ marginTop: '5mm' }}>
          <h4>O que continua aparecendo na sua conta</h4>
          <p>
            <strong>
              Fio B ({d.fioB}% em {d.anoEmissao}):
            </strong>{' '}
            parte da tarifa que paga a rede da {d.concessionaria} mesmo gerando energia própria —
            sobe até 90% em 2028. Também continuam a iluminação pública e a taxa mínima da
            concessionária. Ainda assim, a maior parte da conta deixa de existir.
          </p>
        </div>
      </div>
      <RodapeInterno pagina={4} />
    </section>
  )
}
