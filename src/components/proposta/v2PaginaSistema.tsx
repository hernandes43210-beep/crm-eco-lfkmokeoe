/**
 * Página 3 — SEU SISTEMA: conta visual, barra de cobertura, tabela do kit
 * (espelha pagina3 de proposalPdf.ts).
 */
import type { DadosV2 } from '@/lib/proposalDadosV2'
import { CabecalhoInterno, RodapeInterno, LiV2 } from './v2Bits'

export function PaginaSistema({ d }: { d: DadosV2 }) {
  return (
    <section className="pv-page">
      <CabecalhoInterno d={d} />
      <div className="pv-page-inner pv-pad">
        <div style={{ marginTop: '6mm' }}>
          <span className="pv-sec-tag">1 • Seu sistema</span>
          <h2 className="pv-sec-title" style={{ marginTop: '3mm' }}>
            O que você recebe e como chegamos nele
          </h2>
          <p className="pv-sub" style={{ marginTop: '2mm' }}>
            O tamanho do sistema não é chute: ele sai do seu consumo real e do sol da sua região.
          </p>
        </div>

        <div className="pv-conta" style={{ marginTop: '5mm' }}>
          <span className="op">{d.kwpFmt} kWp</span> <span className="op">×</span>{' '}
          <span className="op">{d.calc.irradiacaoHoras.toLocaleString('pt-BR')} h/dia de sol</span>{' '}
          <span className="op">×</span> <span className="op">30 dias</span>{' '}
          <span className="op">×</span> <span className="op">80% (perdas)</span>{' '}
          <span className="op">=</span>{' '}
          <span className="res">~{Math.round(d.calc.geracaoMensalKwh)} kWh/mês</span>
        </div>
        <p style={{ fontSize: '7.6pt', color: '#5b6782', marginTop: '1.5mm', textAlign: 'center' }}>
          h/dia de sol: média diária de sol útil na sua região. 80%: perdas normais do sistema real
          (poeira, calor, cabos).
        </p>

        <div className="pv-card" style={{ marginTop: '5mm' }}>
          <h3 style={{ marginBottom: '2.5mm' }}>
            Sua conta de luz hoje ({d.consumoKwh || '—'} kWh/mês)
          </h3>
          <div className="pv-barra">
            <div className="g" style={{ width: `${Math.min(100, d.calc.coberturaPct)}%` }}>
              {d.calc.coberturaPct >= 8 ? `Gerado ${d.calc.coberturaPct}%` : ''}
            </div>
            <div className="r" style={{ width: `${Math.max(0, 100 - d.calc.coberturaPct)}%` }}>
              {d.calc.coberturaPct <= 92
                ? `Restante na rede ${Math.max(0, 100 - d.calc.coberturaPct)}%`
                : ''}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '6mm',
              marginTop: '2mm',
              fontSize: '7.6pt',
              color: '#5b6782',
            }}
          >
            <span>
              <span style={{ color: '#11845b', fontWeight: 900 }}>■</span> Gerado pelo seu sistema (
              {Math.round(d.calc.geracaoMensalKwh)} kWh)
            </span>
            <span>
              <span style={{ color: '#aab4c9', fontWeight: 900 }}>■</span> Continua vindo da rede (
              {Math.round(d.calc.restanteRedeKwh)} kWh)
            </span>
          </div>
        </div>

        <div className="pv-info-azul" style={{ marginTop: '5mm' }}>
          <strong>Por que considerar 20% de perdas?</strong> Nenhum sistema converte 100% da luz em
          energia: há perdas normais com o calor dos painéis, o comprimento dos cabos, o próprio
          inversor e a sujeira na superfície do vidro. A Ecosolar prefere prometer menos e entregar
          mais — por isso os números desta proposta já descontam essas perdas.
        </div>

        <h3
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 900,
            fontSize: '11.5pt',
            color: '#0b1f4d',
            marginTop: '6mm',
          }}
        >
          O QUE VEM NO SEU KIT — E PARA QUE SERVE CADA ITEM
        </h3>
        <table className="pv-tabela" style={{ marginTop: '3mm' }}>
          <thead>
            <tr>
              <th style={{ width: '14mm' }}>Qtd.</th>
              <th>Item</th>
              <th>Para que serve</th>
              <th style={{ width: '24mm' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {d.itensKit.map((it, i) => (
              <tr key={i}>
                <td className="qtd">{it.qtd}×</td>
                <td className="item">{it.item}</td>
                <td className="para">{it.para}</td>
                <td className="pv-incluso">✓ Incluso</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pv-kits-fim" style={{ marginTop: '5mm' }}>
          <div className="pv-card">
            <div
              style={{
                fontSize: '7.4pt',
                color: '#5b6782',
                textTransform: 'uppercase',
                letterSpacing: '.8px',
                fontWeight: 700,
              }}
            >
              Área ocupada
            </div>
            <div className="v">{d.areaTelhadoM2 ? `${d.areaTelhadoM2} m²` : '—'}</div>
            <div className="n">no telhado ({d.tipoTelhado.toLowerCase()})</div>
          </div>
          <div className="pv-card">
            <div
              style={{
                fontSize: '7.4pt',
                color: '#5b6782',
                textTransform: 'uppercase',
                letterSpacing: '.8px',
                fontWeight: 700,
              }}
            >
              Telhado
            </div>
            <div className="v">{d.tipoTelhado}</div>
            <div className="n">estrutura própria para cada tipo</div>
          </div>
          <div className="pv-card">
            <div
              style={{
                fontSize: '7.4pt',
                color: '#5b6782',
                textTransform: 'uppercase',
                letterSpacing: '.8px',
                fontWeight: 700,
              }}
            >
              Monitoramento
            </div>
            <div className="v">24h</div>
            <div className="n">app no celular, geração e economia em tempo real</div>
          </div>
        </div>

        <div style={{ marginTop: '4mm' }}>
          <LiV2 cor="v">
            Projeto elétrico, ART e homologação na {d.concessionaria} — já inclusos.
          </LiV2>
        </div>
      </div>
      <RodapeInterno pagina={3} />
    </section>
  )
}
