import React from 'react'

export interface EcosolarLogoProps {
  className?: string
  /**
   * 'sidebar': Logo compacta com mark da logo e texto adaptado ao tema escuro da sidebar (Navy)
   * 'full': Logo completa oficial (painel + sol + bateria + wordmark com "SOLAR" em amarelo + tagline)
   * 'mark-only': Somente o ícone (painel solar, sol e bateria)
   * 'horizontal': Mark ao lado do wordmark e tagline abaixo
   * 'header': Ideal para cabeçalhos de propostas e contratos (fundo claro)
   */
  variant?: 'sidebar' | 'full' | 'mark-only' | 'horizontal' | 'header'
  markHeight?: number | string
  showTagline?: boolean
  subtitle?: string
}

/**
 * Mark vetorial fiel ao design da logo oficial da Ecosolar Energy:
 * - Painel solar azul com grid de células e suporte preto
 * - Raios de sol amarelos (#F5C518 / #FBBF24)
 * - Bateria verde (#22C55E / #16A34A) com raio branco e conectada por cabo
 */
export function EcosolarMark({
  className = 'w-10 h-10',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="Ecosolar Energy Mark"
    >
      <defs>
        {/* Gradiente dos raios solares */}
        <linearGradient id="markSunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#EAB308" />
        </linearGradient>

        {/* Gradiente azul do painel */}
        <linearGradient id="markPanelCellGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>

        {/* Gradiente da bateria verde */}
        <linearGradient id="markBatteryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
      </defs>

      {/* Raios solares amarelos em leque atrás do painel */}
      <g stroke="#F5C518" strokeWidth="4.5" strokeLinecap="round">
        <line x1="82" y1="26" x2="82" y2="10" />
        <line x1="68" y1="30" x2="60" y2="16" />
        <line x1="56" y1="38" x2="44" y2="28" />
        <line x1="46" y1="50" x2="32" y2="44" />
        <line x1="40" y1="64" x2="24" y2="62" />
        <line x1="38" y1="80" x2="22" y2="82" />
        <line x1="40" y1="96" x2="24" y2="102" />
        <line x1="96" y1="28" x2="104" y2="14" />
        <line x1="108" y1="35" x2="120" y2="24" />
      </g>

      {/* Cabo preto curvado conectando a base do painel à bateria verde */}
      <path
        d="M 120 152 C 145 152 155 138 160 115"
        stroke="#0F172A"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Mastro central e base do suporte do painel */}
      <rect x="114" y="142" width="12" height="34" fill="#0F172A" rx="1" />
      <rect x="92" y="172" width="56" height="8" rx="2" fill="#0F172A" />

      {/* Painel Solar em perspectiva trapezoidal */}
      {/* Moldura externa preta com bordas arredondadas */}
      <polygon
        points="86,60 148,60 132,150 64,150"
        fill="#0F172A"
        stroke="#0F172A"
        strokeWidth="7"
        strokeLinejoin="round"
      />

      {/* Superfície azul de células */}
      <polygon points="87,62 147,62 131,148 65,148" fill="#1E3A8A" />

      {/* Linha divisória horizontal preta dividindo as seções superior e inferior */}
      <polygon points="76,104 139,104 139,108 76,108" fill="#0F172A" />

      {/* Grade de células solares - 6 colunas */}
      {/* Superior (grid 6 x 2) */}
      <g stroke="#93C5FD" strokeWidth="1.8" fill="#1D4ED8">
        <polygon points="89,64 99,64 96,103 84,103" />
        <polygon points="100,64 109,64 107,103 97,103" />
        <polygon points="110,64 119,64 118,103 108,103" />
        <polygon points="120,64 128,64 128,103 119,103" />
        <polygon points="129,64 137,64 138,103 129,103" />
        <polygon points="138,64 145,64 147,103 139,103" />
      </g>
      {/* Linhas horizontais intermediárias na seção superior */}
      <path d="M 87 83 L 142 83" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round" />

      {/* Inferior (grid 6 x 2) */}
      <g stroke="#93C5FD" strokeWidth="1.8" fill="#1E40AF">
        <polygon points="82,110 94,110 91,146 72,146" />
        <polygon points="95,110 106,110 104,146 92,146" />
        <polygon points="107,110 117,110 115,146 105,146" />
        <polygon points="118,110 127,110 126,146 116,146" />
        <polygon points="128,110 137,110 137,146 127,146" />
        <polygon points="138,110 146,110 147,146 138,146" />
      </g>
      {/* Linhas horizontais intermediárias na seção inferior */}
      <path d="M 75 128 L 140 128" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round" />

      {/* Bateria Verde em pé à direita */}
      <g id="greenBattery">
        {/* Terminal superior da bateria */}
        <rect x="157" y="47" width="14" height="7" rx="3" fill="#15803D" />
        {/* Corpo principal da bateria */}
        <rect
          x="148"
          y="52"
          width="32"
          height="54"
          rx="6"
          fill="url(#markBatteryGrad)"
          stroke="#166534"
          strokeWidth="1.5"
        />
        {/* Símbolo de raio branco no centro */}
        <path d="M 166 58 L 156 78 L 164 78 L 160 98 L 172 76 L 164 76 Z" fill="#FFFFFF" />
      </g>
    </svg>
  )
}

/**
 * Componente principal da Logo Oficial da Ecosolar Energy
 */
export default function EcosolarLogo({
  className = '',
  variant = 'full',
  markHeight = 56,
  showTagline = true,
  subtitle,
}: EcosolarLogoProps) {
  // 1. Sidebar variante (fundo escuro da sidebar navy #0F172A)
  if (variant === 'sidebar') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* Mark com moldura branca elegante */}
        <div className="bg-white rounded-xl p-1.5 shadow-md shadow-black/30 flex items-center justify-center shrink-0 border border-white/20">
          <EcosolarMark className="w-8 h-8" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1 leading-tight">
            <span className="font-extrabold text-[15px] text-white tracking-tight">ECO</span>
            <span className="font-extrabold text-[15px] text-[#F5C518] tracking-tight">SOLAR</span>
            <span className="font-extrabold text-[15px] text-white tracking-tight ml-0.5">
              ENERGY
            </span>
          </div>
          <p className="text-[10px] text-emerald-400 tracking-normal font-semibold truncate mt-0.5">
            {subtitle || 'A ENERGIA DO FUTURO, HOJE!'}
          </p>
        </div>
      </div>
    )
  }

  // 2. Mark Only
  if (variant === 'mark-only') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <EcosolarMark className="w-full h-full" />
      </div>
    )
  }

  // 3. Horizontal (Mark ao lado do Wordmark — ideal para cabeçalhos compactos ou light-mode)
  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="shrink-0 flex items-center justify-center">
          <EcosolarMark className="w-12 h-12" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ECO
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#F5C518] tracking-tight underline decoration-[#F5C518] decoration-2 underline-offset-4">
              SOLAR
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ENERGY
            </span>
          </div>
          {showTagline && (
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-bold tracking-wider uppercase mt-1">
              {subtitle || 'A ENERGIA DO FUTURO, HOJE!'}
            </p>
          )}
        </div>
      </div>
    )
  }

  // 4. Header (Ideal para documentos, propostas e contratos)
  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-3.5 ${className}`}>
        <div className="bg-white rounded-lg p-1 border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0">
          <EcosolarMark className="w-11 h-11" />
        </div>
        <div>
          <div className="flex items-baseline gap-1 text-slate-900 leading-tight">
            <span className="font-black text-lg tracking-tight">ECO</span>
            <span className="font-black text-lg text-[#F5C518] tracking-tight border-b-2 border-[#F5C518]">
              SOLAR
            </span>
            <span className="font-black text-lg tracking-tight">ENERGY</span>
          </div>
          <p className="text-[9.5px] text-slate-500 font-semibold tracking-wide uppercase">
            A ENERGIA DO FUTURO, HOJE!
          </p>
        </div>
      </div>
    )
  }

  // 5. Full vertical (padrão oficial — usado na Login, Capas, etc.)
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* Mark em destaque com fundo branco translúcido */}
      <div className="bg-white rounded-2xl p-3 shadow-xl border border-white/60 flex items-center justify-center mb-3">
        <EcosolarMark style={{ height: markHeight, width: markHeight }} />
      </div>

      {/* Linha fina opcional "Energia solar" no topo direito */}
      <div className="relative w-full max-w-[280px]">
        <span className="absolute right-0 -top-3 text-[10px] font-normal text-slate-400 tracking-normal">
          Energia solar
        </span>
      </div>

      {/* Wordmark Oficial: ECOSOLAR ENERGY (SOLAR amarelo #F5C518 com barra sublinhada) */}
      <div className="flex items-baseline justify-center gap-1 text-2xl sm:text-3xl font-black tracking-tight leading-none">
        <span className="text-white">ECO</span>
        <span className="text-[#F5C518] relative pb-1">
          SOLAR
          <span className="absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 bg-[#F5C518] rounded-full" />
        </span>
        <span className="text-white ml-0.5">ENERGY</span>
      </div>

      {/* Tagline oficial em cinza/branco */}
      {showTagline && (
        <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-widest uppercase mt-2.5">
          {subtitle || 'A ENERGIA DO FUTURO, HOJE!'}
        </p>
      )}
    </div>
  )
}
