import { CORES_PROPOSTA } from '@/lib/proposalPdfCss'
import { FotoV2 } from './v2Bits'
import type { DadosV2 } from '@/lib/proposalDadosV2'

interface PaginaCapaProps {
  d: DadosV2
}

/** Página 1 — CAPA (foto só aqui, com legenda — decisão v0.0.79: sem fotos de obras). */
export function PaginaCapa({ d }: PaginaCapaProps) {
  return (
    <div className="pv-page">
      <div className="pv-capa">
        <div className="pv-capa-grid" />
        <div
          className="pv-pad"
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          {/* topo: logo + selo com número */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '8mm',
            }}
          >
            <div className="pv-logo">
              <span className="eco">ECO</span>
              <span className="solar">SOLAR</span> <span className="energy">ENERGY</span>
            </div>
            <span className="pv-selo">PROPOSTA Nº {String(d.numero).slice(-6).toUpperCase()}</span>
          </div>

          {/* meio: título + card do cliente | foto de capa */}
          <div
            style={{
              display: 'flex',
              gap: '8mm',
              alignItems: 'stretch',
              marginTop: '10mm',
              flex: 1,
            }}
          >
            <div style={{ flex: 1.1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 900,
                  fontSize: '22pt',
                  lineHeight: 1.12,
                }}
              >
                Proposta de
                <br />
                <span style={{ color: CORES_PROPOSTA.amarelo }}>Energia Solar</span>
                <br />
                sob medida
              </div>
              <p className="pv-capa-sub" style={{ marginTop: '5mm' }}>
                Um sistema dimensionado para a sua conta de luz, explicado passo a passo: o que você
                recebe, quanto vai economizar e como funciona cada etapa até a usina ligada.
              </p>
              <div className="pv-card-cliente" style={{ marginTop: 'auto' }}>
                <div className="lbl">Preparada especialmente para</div>
                <div className="nome">{d.clienteNome}</div>
                <div className="meta">
                  📍 {d.cidadeUf || 'sua região'} • Consumo médio:{' '}
                  {d.consumoKwh ? `${d.consumoKwh} kWh/mês` : '—'} • Telhado: {d.tipoTelhado}
                </div>
              </div>
            </div>
            <div style={{ flex: 0.9, minWidth: 0 }}>
              <FotoV2 d={d} />
            </div>
          </div>

          {/* base: 4 KPIs */}
          <div className="pv-minis" style={{ marginTop: '9mm' }}>
            <div className="pv-mini">
              <div className="k">Potência</div>
              <div className="v">{d.txt.potenciaTxt}</div>
            </div>
            <div className="pv-mini">
              <div className="k">Geração</div>
              <div className="v">~{d.txt.geracaoTxt}</div>
            </div>
            <div className="pv-mini">
              <div className="k">Economia/mês</div>
              <div className="v am">{d.txt.economiaMensalRS}</div>
            </div>
            <div className="pv-mini">
              <div className="k">Retorno</div>
              <div className="v">{d.txt.paybackCurto}</div>
            </div>
          </div>

          {/* linha institucional */}
          <div
            style={{
              marginTop: '8mm',
              borderTop: '1px solid rgba(255,255,255,.18)',
              paddingTop: '4.5mm',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '2mm',
              fontSize: '8pt',
              color: '#C9D4EA',
            }}
          >
            <span>
              Consultor responsável:{' '}
              <strong style={{ color: '#fff' }}>{d.consultorNome || 'Equipe Ecosolar'}</strong>
            </span>
            <span>
              Emissão:{' '}
              <strong style={{ color: '#fff' }}>{d.dataEmissao.toLocaleDateString('pt-BR')}</strong>{' '}
              • Válida até:{' '}
              <strong style={{ color: '#fff' }}>
                {d.dataValidade.toLocaleDateString('pt-BR')}
              </strong>
            </span>
          </div>
          <div
            style={{
              marginTop: '4mm',
              paddingTop: '4mm',
              borderTop: '1px solid rgba(255,255,255,.18)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '8pt',
              color: '#C9D4EA',
              flexWrap: 'wrap',
              gap: '2mm',
            }}
          >
            <span>
              <strong style={{ color: '#fff' }}>Ecosolar Energy</strong> • Projeto • Homologação •
              Instalação
            </span>
            <span>{d.empresa.instagram || '@ecosolarenergy'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
