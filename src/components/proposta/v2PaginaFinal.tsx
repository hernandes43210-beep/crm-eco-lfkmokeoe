/**
 * Página 6 — QUEM FAZ + FAQ + ACEITE: mosaico de fotos, depoimento, FAQ 2 colunas,
 * caixa de aceite (link público + slot do aceite online) e assinaturas
 * (espelha pagina6 de proposalPdf.ts; o card de aceite online é fornecido pela
 * PropostaPublica como children — mantém aceite/status/assinaturas do clássico).
 */
import type { DadosV2, FotoProposta } from '@/lib/proposalDadosV2'
import { CabecalhoInterno, RodapeInterno, FotoV2 } from './v2Bits'

export function PaginaFinal({
  d,
  fotos,
  linkPublico,
  children,
}: {
  d: DadosV2
  fotos: FotoProposta[]
  linkPublico?: string
  /** Card de aceite online da tela (formulário + link), fornecido pela PropostaPublica. */
  children?: React.ReactNode
}) {
  return (
    <section className="pv-page">
      <CabecalhoInterno d={d} />
      <div className="pv-page-inner pv-pad">
        <div style={{ marginTop: '6mm' }}>
          <span className="pv-sec-tag">4 • Quem faz</span>
          <h2 className="pv-sec-title" style={{ marginTop: '3mm' }}>
            Obras reais, feitas pela nossa equipe
          </h2>
        </div>

        <div className="pv-mosaico" style={{ marginTop: '4mm' }}>
          <FotoV2
            foto={fotos[0] || fotos[1] || fotos[2] || fotos[3] || fotos[4] || null}
            classe="grande"
          />
          <FotoV2 foto={fotos[1] || fotos[0] || null} />
          <FotoV2 foto={fotos[2] || fotos[0] || null} />
          <FotoV2 foto={fotos[3] || fotos[0] || null} />
          <FotoV2 foto={fotos[4] || fotos[0] || null} />
        </div>

        <div className="pv-depo" style={{ marginTop: '4mm' }}>
          <div className="aspas">"</div>
          <div>
            <div className="txt">{d.depoimento.texto}</div>
            <div className="autor">{d.depoimento.autor}</div>
          </div>
        </div>

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
          <div
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 800,
              fontSize: '10pt',
              color: '#0b1f4d',
            }}
          >
            Aceite online — rápido e seguro, sem cartório
          </div>
          <p style={{ fontSize: '8.4pt', color: '#5b6782', marginTop: '1.5mm' }}>
            Válida até <strong style={{ color: '#0b1f4d' }}>{d.validadeBR}</strong>. Os valores
            desta proposta ficam garantidos até a data de validade. Para aceitar, use o link abaixo
            ou responda no WhatsApp {d.whatsapp}.
          </p>
          <span className="mono">{linkPublico || ''}</span>
          {children && <div className="pv-aceite-tela">{children}</div>}

          <div className="pv-assina">
            <div className="campo">
              <b>{d.consultorNome}</b>
              <span>Ecosolar Energy • Consultor Técnico</span>
            </div>
            <div className="campo">
              <b>{d.clienteNome}</b>
              <span>Cliente contratante</span>
            </div>
          </div>
        </div>
      </div>
      <RodapeInterno pagina={6} />
    </section>
  )
}
