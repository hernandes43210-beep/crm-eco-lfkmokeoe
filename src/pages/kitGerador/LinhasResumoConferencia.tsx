// Bloco de linha de equipamento do resumo de conferência (painel / inversor / bateria)
import type { ReactNode } from 'react'
import { Package } from 'lucide-react'
import type { PainelLinha, InversorLinha, BateriaLinha } from '@/services/kitGerador'

function LinhaEquipamento({
  qtd,
  titulo,
  detalhes,
}: {
  qtd: number
  titulo: string
  detalhes: string
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-[#dfe5f0] bg-white px-2 py-1.5 text-xs">
      <span className="min-w-[2rem] rounded bg-[#0b1f4d] px-1.5 py-0.5 text-center text-[11px] font-bold text-white">
        {qtd}×
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[#0b1f4d]">{titulo}</p>
        {detalhes && <p className="truncate text-[11px] text-[#8a94a8]">{detalhes}</p>}
      </div>
      <Package className="h-3.5 w-3.5 shrink-0 text-[#c9d2e3]" />
    </div>
  )
}

export function LinhaResumoPainel({ linha }: { linha: PainelLinha }) {
  const detalhes = [
    `Potência: ${linha.potencia_w || 0} W`,
    linha.area_m2 ? `Área: ${linha.area_m2} m²` : '',
  ]
    .filter(Boolean)
    .join(' • ')
  return (
    <LinhaEquipamento
      qtd={linha.qtd || 0}
      titulo={`${linha.marca} ${linha.modelo}`.trim()}
      detalhes={detalhes}
    />
  )
}

export function LinhaResumoInversor({ linha }: { linha: InversorLinha }) {
  const detalhes = [
    `Potência: ${linha.potencia_kw || 0} kW`,
    linha.tipo ? `Tipo: ${linha.tipo}` : '',
  ]
    .filter(Boolean)
    .join(' • ')
  return (
    <LinhaEquipamento
      qtd={linha.qtd || 0}
      titulo={`${linha.marca} ${linha.modelo}`.trim()}
      detalhes={detalhes}
    />
  )
}

export function LinhaResumoBateria({ linha }: { linha: BateriaLinha }) {
  const detalhes = [
    linha.capacidade_kwh ? `Capacidade: ${linha.capacidade_kwh} kWh` : '',
    linha.tensao ? `Tensão: ${linha.tensao}` : '',
  ]
    .filter(Boolean)
    .join(' • ')
  return (
    <LinhaEquipamento
      qtd={linha.qtd || 0}
      titulo={`${linha.marca} ${linha.modelo}`.trim()}
      detalhes={detalhes}
    />
  )
}

export function SecaoResumo({ titulo, children }: { titulo: string; children: ReactNode }) {
  if (!children || (Array.isArray(children) && children.length === 0)) return null
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a94a8]">{titulo}</p>
      {children}
    </div>
  )
}
