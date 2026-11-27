import type { DadosV2 } from '@/lib/proposalDadosV2'
import { CORES_PROPOSTA } from '@/lib/proposalPdfCss'

interface CabecalhoInternoProps {
  d: DadosV2
  pagina: number
}

/** Cabeçalho das páginas internas (não usado na capa). */
export function CabecalhoInterno({ d, pagina }: CabecalhoInternoProps) {
  return (
    <div className="pv-cabecalho">
      <div className="marca">
        ECO<span className="solar">SOLAR</span> ENERGY
      </div>
      <div className="num">
        Proposta nº {String(d.numero).slice(-6).toUpperCase()} · pág. {pagina}
      </div>
    </div>
  )
}

interface RodapeInternoProps {
  d: DadosV2
  pagina: number
}

/** Rodapé fixo das páginas internas. */
export function RodapeInterno({ d, pagina }: RodapeInternoProps) {
  return (
    <div className="pv-rodape">
      <span>
        {d.empresa.nome} · {d.empresa.slogan}
      </span>
      <span className="pg">{pagina}</span>
    </div>
  )
}

interface FotoV2Props {
  d: DadosV2
}

/** Foto de CAPA do kit (única foto permitida — decisão do usuário: nada de fotos de obras). */
export function FotoV2({ d }: FotoV2Props) {
  if (!d.fotoCapa) {
    return (
      <div
        className="pv-capa-foto"
        style={{
          background: `linear-gradient(140deg, ${CORES_PROPOSTA.amarelo}, ${CORES_PROPOSTA.navyEscuro})`,
        }}
      />
    )
  }
  return (
    <div className="pv-capa-foto">
      <img src={d.fotoCapa.url} alt={d.fotoCapa.legenda || 'Imagem do sistema solar proposto'} />
      {d.fotoCapa.legenda ? <div className="legenda">{d.fotoCapa.legenda}</div> : null}
    </div>
  )
}

interface LiV2Props {
  children: React.ReactNode
}

/** Item de lista com marcador amarelo. */
export function LiV2({ children }: LiV2Props) {
  return (
    <li style={{ display: 'flex', gap: '2mm', alignItems: 'flex-start' }}>
      <span style={{ color: CORES_PROPOSTA.amareloEscuro, fontWeight: 900 }}>•</span>
      <span style={{ flex: 1 }}>{children}</span>
    </li>
  )
}
