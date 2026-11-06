/**
 * Página 1 — CAPA da proposta clássica v2 (espelha paginaCapa de proposalPdf.ts).
 */
import type { DadosV2, FotoProposta } from '@/lib/proposalDadosV2'
import { FotoV2 } from './v2Bits'

export function PaginaCapa({ d, fotos }: { d: DadosV2; fotos: FotoProposta[] }) {
  const fotoCapa = fotos[0] || null
  return (
    <section className="pv-page">
      <div className="pv-capa">
        <div className="pv-capa-grid" />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '8mm',
            }}
          >
            <div>
              <div className="pv-logo" style={{ fontSize: '21pt' }}>
                <span className="eco">ECO</span>
                <span className="solar">SOLAR</span> <span className="energy">ENERGY</span>
              </div>
              <div className="pv-slogan" style={{ marginTop: '1.5mm' }}>
                A energia do futuro, hoje!
              </div>
            </div>
            <span className="pv-selo">Proposta Nº {d.numero}</span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8mm',
              alignItems: 'stretch',
              marginTop: '10mm',
              flex: 1,
            }}
          >
            <div style={{ flex: '1.1', display: 'flex', flexDirection: 'column' }}>
              <h1>
                Proposta de
                <br />
                <span className="am">Energia Solar</span>
                <br />
                sob medida
              </h1>
              <p className="pv-capa-sub" style={{ marginTop: '5mm' }}>
                Um sistema dimensionado para a sua conta de luz, explicado passo a passo: o que você
                recebe, quanto vai economizar e como funciona cada etapa até a usina ligada.
              </p>
              <div className="pv-card-cliente" style={{ marginTop: 'auto' }}>
                <div className="lbl">Preparada especialmente para</div>
                <div className="nome">{d.clienteNome}</div>
                <div className="meta">
                  📍 {d.localCliente} • Consumo médio:{' '}
                  {d.consumoKwh ? `${d.consumoKwh} kWh/mês` : '—'} • Telhado: {d.tipoTelhado}
                </div>
              </div>
            </div>
            <div style={{ flex: '0.9', minWidth: 0 }}>
              <div className="pv-capa-foto pv-clip">
                <FotoV2 foto={fotoCapa} />
              </div>
            </div>
          </div>

          <div className="pv-minis" style={{ marginTop: '9mm' }}>
            <div className="pv-mini">
              <div className="k">Potência</div>
              <div className="v">{d.kwpFmt} kWp</div>
            </div>
            <div className="pv-mini">
              <div className="k">Geração</div>
              <div className="v">~{Math.round(d.calc.geracaoMensalKwh)} kWh</div>
            </div>
            <div className="pv-mini">
              <div className="k">Economia/mês</div>
              <div className="v am">{d.economiaMensalRS}</div>
            </div>
            <div className="pv-mini">
              <div className="k">Retorno</div>
              <div className="v">{d.paybackCurtoTxt}</div>
            </div>
          </div>

          <div
            className="pv-capaline"
            style={{
              marginTop: '8mm',
              borderTop: '1px solid rgba(255,255,255,.18)',
              paddingTop: '4.5mm',
            }}
          >
            <span>
              Consultor responsável: <strong>{d.consultorNome}</strong>
            </span>
            <span>
              Data de emissão: <strong>{d.emissaoBR}</strong>
            </span>
            <span className="val">
              Válida até: <strong>{d.validadeBR}</strong>
            </span>
          </div>

          <div
            style={{
              marginTop: 'auto',
              borderTop: '1px solid rgba(255,255,255,.18)',
              paddingTop: '4mm',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '8pt',
              color: '#cdd7ec',
              flexWrap: 'wrap',
              gap: '2mm',
            }}
          >
            <span>
              <strong style={{ color: '#fff' }}>Ecosolar Energy</strong> • Projeto • Homologação •
              Instalação
            </span>
            <span>
              WhatsApp {d.whatsapp} • {d.instagram}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
