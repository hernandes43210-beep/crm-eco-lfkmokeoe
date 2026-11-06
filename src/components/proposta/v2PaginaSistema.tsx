/**
 * Página 3 — SEU SISTEMA: conta visual, barra de cobertura, tabela do kit
 * (espelha pagina3 de proposalPdf.ts — mesma estrutura e mesmos textos do PDF).
 */
import type { DadosV2 } from '@/lib/proposalDadosV2'
import { CabecalhoInterno, RodapeInterno } from './v2Bits'

export function PaginaSistema({ d }: { d: DadosV2 }) {
  const ger = Math.round(d.calc.geracaoMensalKwh)

  return (
    <section className="pv-page">
      <CabecalhoInterno d={d} />
      <div className="pv-page-inner pv-pad">
        <div style={{ marginTop: '6mm' }}>
          <span className="pv-sec-tag">1 • Seu sistema</span>
          <h2 className="pv-sec-title" style={{ marginTop: '3mm' }}>
            Kit solar {d.kwpFmt} kWp — {d.marcaPainel || 'painéis de alta eficiência'} +{' '}
            {d.marcaInversor || 'inversor homologado'}
          </h2>
          <p className="pv-sub" style={{ marginTop: '2mm' }}>
            Como chegamos a esse tamanho: partimos do seu consumo e da quantidade de sol da região.
          </p>
        </div>

        <div className="pv-conta" style={{ marginTop: '5mm' }}>
          {d.kwpFmt} kWp <span className="op">×</span>{' '}
          {String(d.calc.irradiacaoHoras).replace('.', ',')} h de sol/dia
          <span className="op">×</span> 30 dias <span className="op">×</span> 80% aproveitamento
          real
          <span className="op">=</span> <span className="res">~{ger} kWh/mês</span>
        </div>

        <div style={{ marginTop: '5mm' }}>
          <div style={{ fontWeight: 800, fontSize: '9pt', color: '#0b1f4d' }}>
            Quanto do seu consumo o sistema cobre: {d.calc.coberturaPct}%
          </div>
          <div className="pv-barra" style={{ marginTop: '2mm' }}>
            <div className="g" style={{ width: `${d.calc.coberturaPct}%` }}>
              Gerado pelo sistema: ~{ger} kWh
            </div>
            <div className="r" style={{ width: `${100 - d.calc.coberturaPct}%` }}>
              Restante da rede: ~{d.calc.restanteRedeKwh} kWh
            </div>
          </div>
        </div>

        <div className="pv-info-azul" style={{ marginTop: '5mm' }}>
          <strong>Por que considerar 20% de perdas?</strong> Painel no calor, cabos, sujeira e o
          próprio inversor consomem uma parte da energia. Usamos esse desconto para que a geração
          prometida seja realista — preferimos que você se surpreenda para mais, não para menos.
        </div>

        <div style={{ marginTop: '6mm' }}>
          <div
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 800,
              fontSize: '9pt',
              color: '#1d4290',
              letterSpacing: '1.2px',
            }}
          >
            O QUE VEM NO SEU KIT — E PARA QUE SERVE CADA ITEM
          </div>
          <table className="pv-tabela" style={{ marginTop: '3mm' }}>
            <thead>
              <tr>
                <th style={{ width: '14mm' }}>Qtd.</th>
                <th>Item</th>
                <th>Para que serve</th>
                <th style={{ width: '18mm' }}>Incluso</th>
              </tr>
            </thead>
            <tbody>
              {d.itensKit.map((it, i) => (
                <tr key={i}>
                  <td className="qtd">{it.qtd}</td>
                  <td className="item">{it.item}</td>
                  <td className="para">{it.para}</td>
                  <td className="pv-incluso">✓ Incluso</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pv-kits-fim" style={{ marginTop: 'auto', paddingTop: '5mm' }}>
          <div className="pv-card">
            <div
              style={{
                fontSize: '7.2pt',
                letterSpacing: '.8px',
                textTransform: 'uppercase',
                color: '#5b6782',
                fontWeight: 700,
              }}
            >
              Área no telhado
            </div>
            <div className="v">{d.areaTelhadoM2 ? `~${d.areaTelhadoM2} m²` : '—'}</div>
            <div className="n">estimativa com os painéis deste kit</div>
          </div>
          <div className="pv-card">
            <div
              style={{
                fontSize: '7.2pt',
                letterSpacing: '.8px',
                textTransform: 'uppercase',
                color: '#5b6782',
                fontWeight: 700,
              }}
            >
              Tipo de telhado
            </div>
            <div className="v">{d.tipoTelhado}</div>
            <div className="n">estrutura própria inclusa</div>
          </div>
          <div className="pv-card">
            <div
              style={{
                fontSize: '7.2pt',
                letterSpacing: '.8px',
                textTransform: 'uppercase',
                color: '#5b6782',
                fontWeight: 700,
              }}
            >
              Monitoramento
            </div>
            <div className="v">24 h</div>
            <div className="n">acompanhamento no celular</div>
          </div>
        </div>
      </div>
      <RodapeInterno pagina={3} />
    </section>
  )
}
