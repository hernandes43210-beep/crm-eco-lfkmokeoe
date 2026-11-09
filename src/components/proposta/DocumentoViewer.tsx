/**
 * Faixa de papel estilo visualizador de PDF: fundo cinza de "leitor" com uma
 * folha branca central (A4), sombra suave e margens — o conteúdo da proposta
 * (páginas v2) vive dentro da folha.
 */
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

/** Largura da folha A4 em pixels a 96dpi (210mm), usada como máximo da folha. */
export const A4_SHEET_MAX_WIDTH = 900

export function PropostaPapel({ children }: Props) {
  return (
    <div className="proposta-doc-leitor min-h-screen bg-slate-200/70 py-6 sm:py-10 px-2 sm:px-6">
      <div
        className="proposta-doc-folha mx-auto w-full bg-white text-slate-900 shadow-[0_10px_45px_rgba(10,25,47,0.18)] ring-1 ring-slate-900/5 rounded-sm"
        style={{ maxWidth: `${A4_SHEET_MAX_WIDTH}px` }}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Cabeçalho da folha documento: logotipo/nome da empresa, número da proposta,
 * emissão e ação de impressão. Fica FORA do fluxo de impressão (a página v2
 * já tem seu próprio cabeçalho interno de documento).
 */
interface CabecalhoDocProps {
  numeroProposta: string
  emissao: string
  onImprimir: () => void
}

export function CabecalhoDoc({ numeroProposta, emissao, onImprimir }: CabecalhoDocProps) {
  return (
    <div className="proposta-doc-topbar sticky top-0 z-20 bg-[#0A192F] text-white border-b-2 border-amber-400 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 border border-white/15 text-[11px] font-black text-amber-300">
          PDF
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-white truncate">
            Proposta Comercial Nº {numeroProposta}
          </p>
          <p className="text-[10.5px] text-slate-300 truncate">
            Emissão: {emissao} • Ecosolar Energy
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onImprimir}
        className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/50 bg-white/10 hover:bg-white/20 px-3 py-1.5 text-[11px] font-bold text-amber-300 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3.5 h-3.5"
        >
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        Imprimir / Salvar PDF
      </button>
    </div>
  )
}
