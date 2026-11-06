/**
 * Página 5 — COMO VAI SER: etapas 4×2, garantias, incluso/não incluso, pagamentos
 * (espelha pagina5 de proposalPdf.ts).
 */
import type { DadosV2 } from '@/lib/proposalDadosV2'
import { CabecalhoInterno, RodapeInterno, LiV2 } from './v2Bits'

const QUEM_CLASSE: Record<string, string> = { VOCE: 'voce', ECOSOLAR: 'eco', CONCESS: 'conc' }
const QUEM_TXT: Record<string, string> = {
  VOCE: 'Você',
  ECOSOLAR: 'Ecosolar',
  CONCESS: 'Concessionária',
}

export function PaginaComoVaiSer({ d }: { d: DadosV2 }) {
  return (
    <section className="pv-page">
      <CabecalhoInterno d={d} />
      <div className="pv-page-inner pv-pad">
        <div style={{ marginTop: '6mm' }}>
          <span className="pv-sec-tag">3 • Como vai ser</span>
          <h2 className="pv-sec-title" style={{ marginTop: '3mm' }}>
            Do aceite à usina ligada
          </h2>
        </div>

        <div className="pv-etapas" style={{ marginTop: '5mm' }}>
          {d.etapas.map((e, i) => (
            <div className={`pv-etapa ${e.destaque ? 'hl' : ''}`} key={i}>
              <div className="topo">
                <span className="num">{e.n}</span>
                <span className={`quem ${QUEM_CLASSE[e.quem] || 'conc'}`}>
                  {QUEM_TXT[e.quem] || e.quem}
                </span>
              </div>
              <h4>{e.titulo}</h4>
              <p>{e.texto}</p>
            </div>
          ))}
        </div>

        <div className="pv-grid2" style={{ marginTop: '5mm' }}>
          <div className="pv-card">
            <h3>🛡 Garantias</h3>
            <div style={{ marginTop: '2.5mm' }}>
              <LiV2 cor="v">Painéis — 30 anos de garantia de desempenho (produtor).</LiV2>
              {d.garantiaInversorAnos && (
                <LiV2 cor="v">
                  Inversor — {d.garantiaInversorAnos} anos de garantia do fabricante.
                </LiV2>
              )}
              {d.garantiaInstalacaoAnos && (
                <LiV2 cor="v">
                  Instalação — {d.garantiaInstalacaoAnos} anos de garantia de serviço Ecosolar.
                </LiV2>
              )}
              <LiV2 cor="c">
                Suporte e monitoramento acompanhados pela equipe durante toda a vida útil.
              </LiV2>
            </div>
          </div>
          <div className="pv-card">
            <h3>✓ Já está incluso no valor</h3>
            <div style={{ marginTop: '2.5mm' }}>
              <LiV2 cor="v">Equipamentos, estrutura e cabeamento completo.</LiV2>
              <LiV2 cor="v">Projeto, ART, homologação e troca do medidor.</LiV2>
              <LiV2 cor="v">Instalação chave na mão e treinamento no app.</LiV2>
            </div>
            <h3 style={{ marginTop: '3mm' }}>✗ Não incluso</h3>
            <div style={{ marginTop: '1.5mm' }}>
              <LiV2 cor="c">Obras civis maiores (laje nova, reforma elétrica do imóvel).</LiV2>
              <LiV2 cor="c">Bancos de bateria (opcionais, sob consulta).</LiV2>
            </div>
          </div>
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
            FORMAS DE PAGAMENTO
          </div>
          <div className="pv-pagtos" style={{ marginTop: '3mm' }}>
            <div className="pv-pagto">
              <h4>💰 À vista (PIX/TED)</h4>
              <p>
                Melhor condição. {d.precoFinalRS} com desconto já aplicado, programação imediata da
                obra.
              </p>
            </div>
            <div className="pv-pagto">
              <h4>🏦 Financiamento bancário</h4>
              <p>
                Até 84× com carência de 90 dias: você só começa a pagar quando o sistema já está
                gerando economia.
              </p>
            </div>
            <div className="pv-pagto">
              <h4>💳 Cartão de crédito</h4>
              <p>
                Em até 24× conforme a bandeira. Parcelas que cabem no bolso e a obra já é agendada.
              </p>
            </div>
          </div>
          {d.condPagamento && (
            <p style={{ fontSize: '7.6pt', color: '#5b6782', marginTop: '2.5mm' }}>
              {d.condPagamento}
            </p>
          )}
        </div>
      </div>
      <RodapeInterno pagina={5} />
    </section>
  )
}
