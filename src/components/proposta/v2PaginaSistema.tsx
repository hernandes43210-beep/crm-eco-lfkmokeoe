import { CabecalhoInterno, RodapeInterno } from './v2Bits'
import { formatNumeroBR } from '@/lib/proposalCalculos'
import type { DadosV2 } from '@/lib/proposalDadosV2'

interface PaginaSistemaProps {
  d: DadosV2
}

/** Página 3 — SISTEMA (dimensionamento, equipamentos e cobertura). */
export function PaginaSistema({ d }: PaginaSistemaProps) {
  const fioBPct = Math.round(d.fioBPct * 100)
  return (
    <div className="pv-page">
      <CabecalhoInterno d={d} pagina={3} />
      <div
        className="pv-pad"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5mm' }}
      >
        <div>
          <span className="pv-sec-tag">O sistema</span>
          <div className="pv-sec-title" style={{ marginTop: '2mm' }}>
            Dimensionamento para {d.cidadeUf || 'sua região'}
          </div>
          <p className="pv-sub" style={{ marginTop: '1.5mm' }}>
            Sistema de {d.txt.potenciaTxt} gerando cerca de {d.txt.geracaoTxt} — área estimada de{' '}
            {formatNumeroBR(d.areaM2, 0)} m² no {d.tipoTelhado}.
          </p>
        </div>

        {/* fórmula de geração */}
        <div className="pv-formula">
          <span className="f">{d.txt.potenciaTxt} × irradiação × rendimento</span>
          <span className="r">{d.txt.geracaoTxt}</span>
        </div>

        {/* cobertura */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '8.5pt', fontWeight: 700, color: '#0B1E4A' }}>
              Cobertura estimada do consumo
            </span>
            <span
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 900,
                fontSize: '13pt',
                color: '#0B1E4A',
              }}
            >
              {d.txt.coberturaPctTxt}
            </span>
          </div>
          <div className="pv-barra-cobertura" style={{ marginTop: '2mm' }}>
            <div
              className="fill"
              style={{
                width: `${Math.min(100, d.calc.coberturaPct)}%`,
                justifyContent: d.calc.coberturaPct > 15 ? 'flex-end' : 'flex-start',
                paddingLeft: d.calc.coberturaPct > 15 ? 0 : '2mm',
              }}
            >
              {d.calc.coberturaPct}%
            </div>
          </div>
          <p className="pv-nota" style={{ marginTop: '1.5mm' }}>
            Energia compensada: {formatNumeroBR(d.calc.energiaCompensadaKwh)} kWh/mês · Fio B da Lei
            14.300 no ano: {fioBPct}% da energia injetada ({d.txt.fioBRS}/mês).
          </p>
        </div>

        {/* tabela de equipamentos */}
        <div>
          <table className="pv-tabela">
            <thead>
              <tr>
                <th>Equipamento</th>
                <th>Modelo</th>
                <th>Qtd.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="qtd">Painel fotovoltaico</td>
                <td>{d.painelModelo}</td>
                <td className="qtd">{d.painelQtd || '—'}</td>
              </tr>
              <tr>
                <td className="qtd">Inversor</td>
                <td>{d.inversorModelo}</td>
                <td className="qtd">
                  {d.inversorQtd} × {d.inversorKw} kW
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* garantias */}
        <div className="pv-grid2">
          <div className="pv-card">
            <h3>Garantia dos painéis</h3>
            <p style={{ fontSize: '8.2pt', color: '#1A2440' }}>
              {d.painelGarantiaProduto} contra defeitos de fabricação e {d.painelGarantiaDesempenho}{' '}
              de desempenho (degradação máxima de 0,4% a.a.).
            </p>
          </div>
          <div className="pv-card">
            <h3>Garantias do serviço</h3>
            <p style={{ fontSize: '8.2pt', color: '#1A2440' }}>
              {d.inversorModelo}: {d.garantiaInversorAnos ?? 10} anos · instalação:{' '}
              {d.garantiaInstalacaoAnos ?? 5} anos.
            </p>
          </div>
        </div>
      </div>
      <RodapeInterno d={d} pagina={3} />
    </div>
  )
}
