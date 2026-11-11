import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SecaoPainelProps {
  /** Título sempre visível no cabeçalho clicável da seção */
  titulo: string
  /** Texto de apoio exibido abaixo do título (quando recolhido vira resumo) */
  descricao?: string
  /** Elemento(s) exibidos à direita do cabeçalho, fora do clique (ex: badges) */
  extra?: React.ReactNode
  /** Conteúdo que aparece apenas com a seção expandida */
  children: React.ReactNode
  /** Classe extra para o contêiner (bordas/cores do card) */
  className?: string
}

/**
 * Seção recolhível (accordion) da página de detalhe do lead.
 * Começa FECHADA por padrão: clique no cabeçalho expande, novo clique recolhe.
 * O `extra` (badges/ações resumidas) fica fora do botão, então nada é acionado por engano.
 */
export function SecaoPainel({ titulo, descricao, extra, children, className }: SecaoPainelProps) {
  const [aberta, setAberta] = useState(false)

  return (
    <section
      className={cn(
        'rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden',
        className,
      )}
    >
      {/* div com role="button" (e não <button>): o `extra` pode conter botões reais
          (ex: "Gerar Proposta"), e HTML não permite button dentro de button */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setAberta((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setAberta((v) => !v)
          }
        }}
        aria-expanded={aberta}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left border-b border-slate-100 bg-slate-50/50 hover:bg-slate-100/60 transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B7A5B]/40"
      >
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-[#0b1f4d] uppercase tracking-wider">
            {titulo}
          </span>
          {descricao && (
            <span
              className={cn('block text-xs text-slate-500 mt-0.5 truncate', aberta && 'sr-only')}
            >
              {descricao}
            </span>
          )}
        </span>

        {extra && (
          <span className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {extra}
          </span>
        )}

        <span
          className={cn(
            'w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center shrink-0 transition-transform',
            aberta && 'rotate-180 border-[#0B7A5B]/40 text-[#0B7A5B]',
          )}
          title={aberta ? 'Recolher seção' : 'Expandir seção'}
        >
          <ChevronDown className="w-4 h-4" />
        </span>
      </div>

      {aberta && <div className="p-4 sm:p-5 animate-fade-in">{children}</div>}
    </section>
  )
}
