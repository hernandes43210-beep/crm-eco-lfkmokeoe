import { CabecalhoInterno, RodapeInterno, LiV2 } from './v2Bits'
import type { DadosV2 } from '@/lib/proposalDadosV2'

interface PaginaApresentacaoProps {
  d: DadosV2
}

/** Página 2 — APRESENTAÇÃO (resumo do cliente e da conta de luz hoje). */
export function PaginaApresentacao({ d }: PaginaApresentacaoProps) {
  return (
    <div className="pv-page">
      <CabecalhoInterno d={d} pagina={2} />
      <div
        className="pv-pad"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6mm' }}
      >
        <div>
          <span className="pv-sec-tag">Apresentação</span>
          <div className="pv-sec-title" style={{ marginTop: '2mm' }}>
            Entenda a sua conta de energia hoje
          </div>
          <p className="pv-sub" style={{ marginTop: '1.5mm' }}>
            Proposta nº {String(d.numero).slice(-6).toUpperCase()} preparada para{' '}
            <strong>{d.clienteNome}</strong> ({d.cidadeUf || 'região a confirmar'}).
          </p>
        </div>

        {/* resumo */}
        <div className="pv-resumo">
          <div className="pv-kpi">
            <div className="k">Consumo mensal</div>
            <div className="v">{d.consumoKwh} kWh</div>
          </div>
          <div className="pv-kpi">
            <div className="k">Conta hoje</div>
            <div className="v">{d.txt.contaHojeRS}</div>
          </div>
          <div className="pv-kpi">
            <div className="k">Conta nova</div>
            <div className="v am">{d.txt.contaNovaRS}</div>
            <div className="n">taxa mínima + Fio B</div>
          </div>
          <div className="pv-kpi hl">
            <div className="k">Economia mensal</div>
            <div className="v">{d.txt.economiaMensalRS}</div>
            <div className="n">valor líquido já descontado</div>
          </div>
        </div>

        {/* fórmula da conta nova */}
        <div className="pv-formula">
          <span style={{ fontSize: '8pt', color: '#C9D4EA' }}>
            Conta nova = taxa mínima ({d.txt.taxaMinimaRS}) + Fio B ({d.txt.fioBRS})
          </span>
          <span className="r">{d.txt.contaNovaRS}</span>
        </div>

        {/* pontos */}
        <div className="pv-card">
          <h3>O que está incluído nesta proposta</h3>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: '1.8mm',
              fontSize: '8.2pt',
              color: '#1A2440',
            }}
          >
            <LiV2>Projeto elétrico e homologação junto à concessionária (chave na mão)</LiV2>
            <LiV2>
              Kit: {d.painelModelo} ({d.painelQtd || '—'} pçs) + {d.inversorModelo} ({d.inversorKw}{' '}
              kW)
            </LiV2>
            <LiV2>Instalação, estruturas, cabeamento e string box</LiV2>
            <LiV2>Monitoramento de geração e suporte pós-instalação</LiV2>
          </ul>
        </div>

        {/* fluxo resumido */}
        <div className="pv-fluxo">
          {d.etapas.slice(0, 4).map((e, i) => (
            <div className="etapa" key={i}>
              <b>{e.quem}</b>
              {e.txt}
            </div>
          ))}
          <div className="seta">→</div>
        </div>
      </div>
      <RodapeInterno d={d} pagina={2} />
    </div>
  )
}
