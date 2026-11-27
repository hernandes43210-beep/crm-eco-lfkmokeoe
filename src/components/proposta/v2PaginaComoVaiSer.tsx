import { CabecalhoInterno, RodapeInterno } from './v2Bits'
import type { DadosV2 } from '@/lib/proposalDadosV2'

interface PaginaComoVaiSerProps {
  d: DadosV2
}

/** Página 5 — COMO VAI SER (etapas da instalação: quem faz o quê). */
export function PaginaComoVaiSer({ d }: PaginaComoVaiSerProps) {
  const badgeClass = (quem: string) =>
    quem.toLowerCase().startsWith('você') ? 'badge voce' : 'badge ecosolar'

  return (
    <div className="pv-page">
      <CabecalhoInterno d={d} pagina={5} />
      <div
        className="pv-pad"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5mm' }}
      >
        <div>
          <span className="pv-sec-tag">Como vai ser</span>
          <div className="pv-sec-title" style={{ marginTop: '2mm' }}>
            Da assinatura à energia gerando
          </div>
          <p className="pv-sub" style={{ marginTop: '1.5mm' }}>
            Cuidamos de tudo: projeto, homologação, instalação e acompanhamento junto à{' '}
            {d.concessionaria}.
          </p>
        </div>

        <div className="pv-etapas">
          {d.etapas.map((e, i) => (
            <div className="pv-etapa" key={i}>
              <div className="n">{i + 1}</div>
              <span className={badgeClass(e.quem)}>{e.quem}</span>
              <b className="t">{e.txt}</b>
            </div>
          ))}
        </div>

        <div className="pv-card amarelo">
          <h3>O que precisamos de você</h3>
          <p style={{ fontSize: '8pt', color: '#6b5a1e' }}>
            Aceitar a proposta, enviar os documentos (RG/CPF, comprovante de residência e fatura
            atual) e assinar o termo de ligação na {d.concessionaria} — em geral, uma única visita.
          </p>
        </div>
      </div>
      <RodapeInterno d={d} pagina={5} />
    </div>
  )
}
