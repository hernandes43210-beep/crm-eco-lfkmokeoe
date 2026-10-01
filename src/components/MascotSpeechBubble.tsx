import React, { useState } from 'react'
import mascotImgUrl from '@/assets/editedimage1777166474816-0d67d.png'
import { Sparkles, Sun } from 'lucide-react'

export interface MascotSpeechBubbleProps {
  fala: string
  titulo?: string
  dica?: string
  posicao?: 'bottom' | 'top' | 'inline'
  tamanhoMascote?: 'sm' | 'md' | 'lg'
  animado?: boolean
  className?: string
  destaqueBadge?: string
  humor?: 'feliz' | 'animado' | 'conselheiro' | 'comemorando'
}

/**
 * Componente amigável do Mascote da Ecosolar Energy.
 * Exibe o personagem oficial de chapéu de palha, óculos escuros e painel solar,
 * acompanhado de um balão de fala moderno e visualmente integrado ao design Story do Instagram,
 * dando vida aos números técnicos da proposta solar de forma descontraída e comercial.
 */
export function MascotSpeechBubble({
  fala,
  titulo = 'Dica do Mascote Ecosolar',
  dica,
  posicao = 'bottom',
  tamanhoMascote = 'md',
  animado = true,
  className = '',
  destaqueBadge,
  humor = 'feliz',
}: MascotSpeechBubbleProps) {
  const [imgError, setImgError] = useState(false)

  // Dimensões do mascote
  const sizeClasses = {
    sm: 'w-12 h-12 min-w-12',
    md: 'w-16 h-16 min-w-16 sm:w-20 sm:h-20 sm:min-w-20',
    lg: 'w-20 h-20 min-w-20 sm:w-24 sm:h-24 sm:min-w-24',
  }[tamanhoMascote]

  const emojiHumor = {
    feliz: '☀️',
    animado: '⚡',
    conselheiro: '💡',
    comemorando: '🚀',
  }[humor]

  return (
    <div
      className={`relative flex items-center gap-3 bg-gradient-to-r from-[#071933]/90 via-[#0C2449]/90 to-[#071933]/90 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-amber-400/40 shadow-xl text-left ${className}`}
    >
      {/* Brilho de fundo solar */}
      <div className="absolute -left-3 -top-3 w-16 h-16 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />

      {/* Mascote com moldura dourada e badge */}
      <div className="relative shrink-0 flex flex-col items-center">
        <div
          className={`relative ${sizeClasses} rounded-full p-1 bg-gradient-to-tr from-amber-500 via-amber-300 to-yellow-100 shadow-lg border-2 border-amber-400 overflow-hidden flex items-center justify-center bg-slate-900 group ${
            animado ? 'transition-transform duration-300 hover:scale-105' : ''
          }`}
        >
          {!imgError ? (
            <img
              src={mascotImgUrl}
              alt="Mascote Ecosolar Energy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-top scale-110 drop-shadow-md select-none pointer-events-none"
              loading="lazy"
            />
          ) : (
            // Fallback vetorial limpo se a imagem falhar
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black">
              <Sun className="w-8 h-8 text-slate-950 animate-spin-slow" />
              <span className="text-[8px] tracking-tighter uppercase font-extrabold">Eco</span>
            </div>
          )}
        </div>

        {/* Tag do Mascote */}
        <span className="mt-1 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[8px] uppercase tracking-wider border border-emerald-400 shadow-xs flex items-center gap-0.5">
          <span>{emojiHumor}</span>
          <span>ECO</span>
        </span>
      </div>

      {/* Balão de Fala do Mascote com setinha lateral */}
      <div className="flex-1 min-w-0 relative">
        {/* Triângulo indicador do balão */}
        <div className="absolute -left-2 top-3 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-white/10 hidden sm:block" />

        <div className="flex items-center justify-between gap-1.5 mb-1">
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">{titulo}</span>
          </span>

          {destaqueBadge && (
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 shrink-0">
              {destaqueBadge}
            </span>
          )}
        </div>

        <p className="text-xs sm:text-[13px] font-medium text-slate-100 leading-snug">{fala}</p>

        {dica && (
          <p className="text-[10px] text-emerald-300 font-semibold mt-1 flex items-center gap-1">
            <span>✓</span>
            <span>{dica}</span>
          </p>
        )}
      </div>
    </div>
  )
}
