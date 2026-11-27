import { PRAZO_INSTALACAO_DIAS } from '@/lib/proposalCalculos'
import { CabecalhoInterno, RodapeInterno } from './v2Bits'
import type { DadosV2 } from '@/lib/proposalDadosV2'

interface PaginaComoVaiSerProps {
  d: DadosV2
}

const CHIP_COR: Record<string, 'voce' | 'eco' | 'conc'> = {
  Você: 'voce',
  Ecosolar: 'eco',
  Concessionária: 'conc',
}

/** Página 5 — COMO VAI SER (etapas 4×2 com chips, garantias, formas de pagamento). */
export function PaginaComoVaiSer({ d }: PaginaComoVaiSerProps) {
  return (
    <div className="pv-page">
      <CabecalhoInterno d={d} pagina={5} />
      <div
        className="pv-pad"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3.5mm' }}
      >
        <div>
          <span className="pv-sec-tag">Como vai ser</span>
          <div className="pv-sec-title" style={{ marginTop: '2mm' }}>
            Do aceite ao sistema ligado — passo a passo
          </div>
        </div>

        {/* grid 4×2 de etapas */}
        <div className="pv-etapas" style={{ marginTop: '1mm' }}>
          {d.etapas.map((e, i) => (
            <div className="etapa" key={`${e.titulo}-${i}`}>
              <span className={`chip ${CHIP_COR[e.quem] ?? 'voce'}`}>{e.quem}</span>
              <div className="etapa-t">
                {i + 1}. {e.titulo}
              </div>
              <div className="etapa-x">{e.txt}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: '8.5pt', color: '#5A6680', marginTop: '0.5mm' }}>
          Prazo de instalação: até <b style={{ color: '#0B1E4A' }}>{PRAZO_INSTALACAO_DIAS} dias</b>{' '}
          após a aprovação da concessionária.
        </div>

        {/* garantias / incluso / não incluso */}
        <div className="pv-2col" style={{ marginTop: '1mm' }}>
          <div className="col">
            <div className="col-t" style={{ color: '#166534' }}>
              Garantias
            </div>
            <ul>
              {d.garantias.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
          <div className="col destaque">
            <div className="col-t" style={{ color: '#0B1E4A' }}>
              O que está incluso
            </div>
            <ul>
              {d.incluso.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
            <div className="col-t" style={{ color: '#7F1D1D', marginTop: '2.5mm' }}>
              O que NÃO está incluso
              {d.naoIncluso.length === 0 ? ' — nada a pagar além do valor desta proposta' : ''}
            </div>
            <ul>
              {d.naoIncluso.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* formas de pagamento */}
        <div className="pv-pagamentos" style={{ marginTop: '1mm' }}>
          <div className="pt-t">Formas de pagamento</div>
          {d.formasPagamento.map((f, i) => (
            <div className="linha" key={`${f.titulo}-${i}`}>
              <b>{f.titulo}</b>
              <span>{f.descricao}</span>
            </div>
          ))}
        </div>
      </div>
      <RodapeInterno d={d} pagina={5} />
    </div>
  )
}
