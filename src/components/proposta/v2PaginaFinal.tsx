/**
 * Página 6 — QUEM FAZ + FAQ + ACEITE: mosaico de fotos, depoimento configurável,
 * FAQ 2 colunas, caixa de aceite (link público + botão online) e assinaturas
 * (espelha pagina6 de proposalPdf.ts; o botão de aceite online aqui é o MESMO
 * usado pela versão clássica atual — ver integracao em PropostaPublica.tsx).
 */
import type { DadosV2, FotoProposta } from '@/lib/proposalDadosV2'
import { CabecalhoInterno, RodapeInterno, FotoV2, LiV2 } from './v2Bits'

export function PaginaFinal({
  d,
  fotos,
  children,
}: {
  d: DadosV2
  fotos: FotoProposta[]
  /** Slot do aceite online da tela (botão + link), fornecido pela PropostaPublica. */
  children?: React.ReactNode
}) {
  const [g1, g2, g3, g4, g5] = [
    fotos[0] || null,
    fotos[1] || null,
    fotos[2] || null,
    fotos[3] || null,
    fotos[4] || null,
  ]

  return (
    <section className="pv-page">
      <CabecalhoInterno d={d} />
      <div className="pv-page-inner pv-pad">
        <div style={{ marginTop: '6mm' }}>
          <span className="pv-sec-tag">4 • Quem faz</span>
          <h2 className="pv-sec-title" style={{ marginTop: '3mm' }}>
            Obras reais, clientes reais
          </h2>
        </div>

        <div className="pv-mosaico" style={{ marginTop: '4mm' }}>
          <FotoV2 foto={g1} classe="grande" />
          <FotoV2 foto={g2} />
          <FotoV2 foto={g3} />
          <FotoV2 foto={g4} />
          <FotoV2 foto={g5} />
        </div>

        {d.depoimento && (
          <div className="pv-depo" style={{ marginTop: '4mm' }}>
            <div className="aspas">“</div>
            <div>
              <div className="txt">{d.depoimento.texto}</div>
              <div className="autor">— {d.depoimento.autor}</div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '5mm' }}>
          <div
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 800,
              fontSize: '9pt',
              color: '#1d4290',
              letterSpacing: '1.2px',
            }}
          >
            PERGUNTAS FREQUENTES
          </div>
          <div className="pv-faq" style={{ marginTop: '3mm' }}>
            {d.faq.map((f, i) => (
              <div key={i}>
                <div className="q">{f.p}</div>
                <div className="a">{f.r}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pv-aceite" style={{ marginTop: '5mm' }}>
          <h3
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 900,
              fontSize: '11pt',
              color: '#0b1f4d',
            }}
          >
            ✓ ACEITAR ESTA PROPOSTA
          </h3>
          <p style={{ fontSize: '8.2pt', color: '#5b6782', marginTop: '1.5mm' }}>
            Esta proposta é válida até <strong>{d.validadeBR}</strong>. Para aceitar online, use o
            botão abaixo ou copie o link público:
          </p>
          <code className="mono" style={{ marginTop: '2.5mm' }}>
            {d.linkPublico}
          </code>
          {children && <div className="pv-aceite-tela">{children}</div>}
          <div className="pv-assina">
            <div className="campo">
              <b>_______________________________</b>
              <span>Consultor Ecosolar Energy — {d.consultorNome}</span>
            </div>
            <div className="campo">
              <b>_______________________________</b>
              <span>Cliente — {d.clienteNome}</span>
            </div>
          </div>
        </div>
      </div>
      <RodapeInterno pagina={6} />
    </section>
  )
}
