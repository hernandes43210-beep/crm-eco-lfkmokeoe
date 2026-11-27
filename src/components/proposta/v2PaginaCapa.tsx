import { CORES_PROPOSTA } from '@/lib/proposalPdfCss'
import { FotoV2 } from './v2Bits'
import type { DadosV2 } from '@/lib/proposalDadosV2'

interface PaginaCapaProps {
  d: DadosV2
}

/** Página 1 — CAPA (foto de capa do kit + dados principais). */
export function PaginaCapa({ d }: PaginaCapaProps) {
  const dataEmissao = d.dataEmissao.toLocaleDateString('pt-BR')
  return (
    <div className="pv-page pv-capa">
      <div className="pv-capa-grid" />
      <div
        className="pv-pad"
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        {/* topo: logo + selo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="pv-logo">
            <span className="eco">ECO</span>
            <span className="solar">SOLAR</span> <span className="energy">ENERGY</span>
          </div>
          <div className="pv-selo">PROPOSTA COMERCIAL · {dataEmissao}</div>
        </div>

        {/* meio: chamada + card cliente + foto */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '8mm',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 900,
                fontSize: '24pt',
                lineHeight: 1.1,
              }}
            >
              Sua energia,
              <br />
              <span style={{ color: CORES_PROPOSTA.amarelo }}>do sol até a conta de luz</span>
            </div>
            <p className="pv-capa-sub" style={{ marginTop: '4mm' }}>
              Proposta de sistema fotovoltaico conectado à rede, projetado para reduzir de forma
              permanente o custo de energia de {d.clientePrimeiroNome} em{' '}
              {d.cidadeUf || 'sua região'}.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6mm', alignItems: 'center' }}>
            <div className="pv-card-cliente" style={{ flex: 1 }}>
              <div className="lbl">Proposta para</div>
              <div className="nome">{d.clienteNome}</div>
              <div className="meta">
                {[d.cidadeUf, d.concessionaria !== 'concessionária local' ? d.concessionaria : null]
                  .filter(Boolean)
                  .join(' · ') || 'Local de instalação a confirmar'}
              </div>
            </div>
            <FotoV2 d={d} />
          </div>
        </div>

        {/* base: miniaturas de números-chave */}
        <div className="pv-minis">
          <div className="pv-mini">
            <div className="k">Potência</div>
            <div className="v am">{d.txt.potenciaTxt}</div>
          </div>
          <div className="pv-mini">
            <div className="k">Geração mensal</div>
            <div className="v">{d.txt.geracaoTxt}</div>
          </div>
          <div className="pv-mini">
            <div className="k">Economia mensal</div>
            <div className="v am">{d.txt.economiaMensalRS}</div>
          </div>
          <div className="pv-mini">
            <div className="k">Retorno</div>
            <div className="v">{d.txt.retornoPctAA}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
