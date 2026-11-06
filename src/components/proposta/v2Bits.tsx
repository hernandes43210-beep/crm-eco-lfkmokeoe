/**
 * Blocos visuais compartilhados entre as 6 páginas da proposta clássica v2 na tela.
 * Espelham os blocos de proposalPdf.ts (header interno, rodapé, foto com placeholder).
 */
import type { DadosV2, FotoProposta } from '@/lib/proposalDadosV2'

export function CabecalhoInterno({ d }: { d: DadosV2 }) {
  return (
    <header className="pv-header">
      <div className="pv-logo">
        <span className="eco">ECO</span>
        <span className="solar">SOLAR</span> <span className="energy">ENERGY</span>
      </div>
      <div className="pv-header-info">
        <div>
          <strong>PROPOSTA Nº {d.numero}</strong>
        </div>
        <div>
          Emissão {d.emissaoBR} • Válida até <strong>{d.validadeBR}</strong>
        </div>
      </div>
    </header>
  )
}

export function RodapeInterno({ pagina }: { pagina: number }) {
  return (
    <footer className="pv-footer">
      <span>
        <strong>Ecosolar Energy</strong> — A energia do futuro, hoje!
      </span>
      <span className="pv-pgnum">Página {pagina}</span>
    </footer>
  )
}

/** Foto com legenda; sem foto, mostra o mesmo placeholder de gradiente do PDF. */
export function FotoV2({ foto, classe = '' }: { foto: FotoProposta | null; classe?: string }) {
  if (!foto) {
    return (
      <div className={`pv-foto ${classe}`}>
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(140deg,#0b1f4d,#1d4290)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffd23f',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 800,
            fontSize: '9pt',
            textAlign: 'center',
            padding: '4mm',
          }}
        >
          ECOSOLAR ENERGY
        </div>
      </div>
    )
  }
  return (
    <figure className={`pv-foto ${classe}`}>
      <img src={foto.url} alt={foto.legenda} />
      <figcaption className="leg">{foto.legenda}</figcaption>
    </figure>
  )
}

/** Item com bolinha colorida (verde = incluso, cinza = observação). */
export function LiV2({ cor = 'v', children }: { cor?: 'v' | 'c'; children: React.ReactNode }) {
  return (
    <div className="pv-li">
      <span className={`bola ${cor}`} />
      <span>{children}</span>
    </div>
  )
}
