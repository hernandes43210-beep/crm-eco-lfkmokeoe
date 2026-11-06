/**
 * Página 5 — COMO VAI SER: etapas 4×2 com etiquetas VOCÊ/ECOSOLAR/CONCESSIONÁRIA,
 * garantias, incluso/não incluso e formas de pagamento
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
  const cartoes = d.etapas.map((e, i) => (
    <div className={`pv-etapa${e.destaque ? ' hl' : ''}`} key={i}>
      <div className="topo">
        <div className="num">{e.n}</div>
        <span className={`quem ${QUEM_CLASSE[e.quem] || 'eco'}`}>
          {QUEM_TXT[e.quem] || 'Ecosolar'}
        </span>
      </div>
      <h4>{e.titulo}</h4>
      <p>{e.texto}</p>
    </div>
  ))

  return (
    <section className="pv-page">
      <CabecalhoInterno d={d} />
      <div className="pv-page-inner pv-pad">
        <div style={{ marginTop: '6mm' }}>
          <span className="pv-sec-tag">3 • Como vai ser</span>
          <h2 className="pv-sec-title" style={{ marginTop: '3mm' }}>
            Do &quot;sim&quot; até a usina ligada
          </h2>
          <p className="pv-sub" style={{ marginTop: '2mm' }}>
            Cuidamos de toda a burocracia com a concessionária. Você só participa de duas etapas.
          </p>
        </div>

        <div className="pv-etapas" style={{ marginTop: '5mm' }}>
          {cartoes}
        </div>

        <div className="pv-grid2" style={{ marginTop: '5mm' }}>
          <div className="pv-card">
            <h3>Garantias</h3>
            <LiV2 cor="v">
              Painéis {d.marcaPainel || 'do kit'}: garantia de desempenho linear de 30 anos do
              fabricante.
            </LiV2>
            <LiV2 cor="v">
              Inversor {d.marcaInversor || 'do kit'}: {d.garantiaInversorTxt}.
            </LiV2>
            <LiV2 cor="v">Instalação: {d.garantiaInstalacaoTxt} e suporte técnico pós-venda.</LiV2>
            <LiV2 cor="v">
              Projeto: assinado por engenheiro eletricista, com ART registrada no CREA.
            </LiV2>
          </div>
          <div className="pv-card">
            <h3>Já está incluso no valor</h3>
            <LiV2 cor="v">Todos os equipamentos e a estrutura de fixação</LiV2>
            <LiV2 cor="v">Projeto, ART e homologação na concessionária</LiV2>
            <LiV2 cor="v">Mão de obra de instalação e frete do material</LiV2>
            <LiV2 cor="v">Configuração do monitoramento no seu celular</LiV2>
            <div
              style={{
                marginTop: '3mm',
                paddingTop: '2.5mm',
                borderTop: '1px dashed #dfe5f0',
              }}
            >
              <h3>Não incluso</h3>
              <LiV2 cor="c">
                Adequações no padrão de entrada ou quadro, se a concessionária exigir — avaliadas na
                vistoria e orçadas à parte, antes de qualquer serviço.
              </LiV2>
            </div>
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
            FORMAS DE PAGAMENTO
          </div>
          <div className="pv-pagtos" style={{ marginTop: '3mm' }}>
            {d.formasPagamento.map((f, i) => (
              <div className="pv-pagto" key={i}>
                <h4>{f.titulo}</h4>
                <p>{f.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <RodapeInterno pagina={5} />
    </section>
  )
}
