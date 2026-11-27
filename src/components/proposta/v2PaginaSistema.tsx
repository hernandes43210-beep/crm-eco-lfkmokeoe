import { CabecalhoInterno, RodapeInterno } from './v2Bits'
import type { DadosV2 } from '@/lib/proposalDadosV2'

interface PaginaSistemaProps {
  d: DadosV2
}

/** Página 3 — SISTEMA (fórmula tracejada, cobertura, tabela do kit com Qtd./Item/Para que serve/Incluso). */
export function PaginaSistema({ d }: PaginaSistemaProps) {
  return (
    <div className="pv-page">
      <CabecalhoInterno d={d} pagina={3} />
      <div
        className="pv-pad"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3.5mm' }}
      >
        <div>
          <span className="pv-sec-tag">O sistema</span>
          <div className="pv-sec-title" style={{ marginTop: '2mm' }}>
            Como chegamos no tamanho certo
          </div>
        </div>

        {/* fórmula tracejada da geração */}
        <div className="pv-formula">{d.txt.formulaTxt}</div>

        {/* barra de cobertura */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '8pt',
              color: '#5A6680',
              marginBottom: '1.5mm',
            }}
          >
            <span>
              Cobertura estimada do seu consumo:{' '}
              <b style={{ color: '#0B1E4A' }}>{d.txt.coberturaTxt}</b>
            </span>
            <span>
              Geração ~{d.txt.geracaoTxt} • Consumo {d.consumoKwh || '—'} kWh/mês
            </span>
          </div>
          <div className="pv-barra-out">
            <div
              className="pv-barra-in"
              style={{ width: `${Math.max(2, Math.min(100, d.coberturaPct))}%` }}
            />
          </div>
          <div style={{ fontSize: '7.5pt', color: '#5A6680', marginTop: '1.5mm' }}>
            O excedente vira crédito na distribuidora e compensa o consumo noturno e chuvoso (Lei
            14.300).
          </div>
        </div>

        {/* tabela do kit */}
        <div className="pv-tabela-wrap">
          <table className="pv-tabela">
            <thead>
              <tr>
                <th style={{ width: '12mm' }}>Qtd.</th>
                <th style={{ width: '52mm' }}>Item</th>
                <th>Para que serve</th>
                <th style={{ width: '22mm' }}>Incluso</th>
              </tr>
            </thead>
            <tbody>
              {d.itensKit.map((it) => (
                <tr key={it.item}>
                  <td className="qtd">{it.qtd}</td>
                  <td>
                    <b>{it.item}</b>
                  </td>
                  <td className="para">{it.paraQue}</td>
                  <td className="incluso">{it.incluso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* box "Por que considerar 20% de perdas" */}
        <div className="pv-perdas">
          <b>Por que considerar 20% de perdas?</b> Nenhum sistema entrega 100% da potência de
          catálogo: calor, cabos, poeira e a eficiência do inversor consomem parte da energia. As
          contas desta proposta já usam o cenário realista ({d.txt.geracaoTxt} líquidos por mês), e
          não o número otimista do folheto.
        </div>

        {/* 3 KPIs */}
        <div className="pv-kpis3" style={{ marginTop: '1mm' }}>
          <div className="pv-kpi">
            <div className="k">Geração mensal líquida</div>
            <div className="v">~{d.txt.geracaoTxt}</div>
          </div>
          <div className="pv-kpi">
            <div className="k">Cobertura da conta</div>
            <div className="v">{d.txt.coberturaTxt}</div>
          </div>
          <div className="pv-kpi">
            <div className="k">Vida útil do sistema</div>
            <div className="v">25+ anos</div>
          </div>
        </div>
      </div>
      <RodapeInterno d={d} pagina={3} />
    </div>
  )
}
