// Linha individual de Bateria (informativa — não entra no cálculo de preço)
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'
import { QtdStepper, InputNum } from './formControles'
import type { BateriaItemForm } from './formTipos'

export function LinhaBateriaItem({
  linha,
  index,
  totalLinhas,
  onChange,
  onRemover,
}: {
  linha: BateriaItemForm
  index: number
  totalLinhas: number
  onChange: (atualizado: BateriaItemForm) => void
  onRemover: () => void
}) {
  return (
    <div className="rounded-[10px] border border-[#dfe5f0] bg-[#f8fafc] p-3 transition-all">
      <div className="mb-2 flex items-center justify-between border-b border-[#eef2f8] pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0b1f4d] text-[10px] font-bold text-white">
            {index + 1}
          </span>
          <span className="text-xs font-bold text-[#0b1f4d]">
            {linha.marca || 'Bateria'} {linha.modelo ? `• ${linha.modelo}` : ''}
          </span>
          {linha.capacidadeKwh > 0 && (
            <span className="rounded bg-[#eef2f8] px-1.5 py-0.5 text-[11px] font-semibold text-[#0b1f4d]">
              {linha.capacidadeKwh} kWh
              {linha.tensao ? ` • ${linha.tensao}` : ''}
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemover}
          className="h-7 w-7 p-0 text-[#c0392b] hover:bg-red-50 hover:text-red-700"
          title={totalLinhas > 1 ? 'Remover esta bateria' : 'Limpar bateria'}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <Label className="text-[11px]">Marca</Label>
          <Input
            placeholder="Ex.: BYD"
            value={linha.marca}
            onChange={(e) => onChange({ ...linha, marca: e.target.value })}
            className="h-8 text-xs bg-white"
          />
        </div>
        <div>
          <Label className="text-[11px]">Modelo</Label>
          <Input
            placeholder="Ex.: Battery-Box Premium LVS"
            value={linha.modelo}
            onChange={(e) => onChange({ ...linha, modelo: e.target.value })}
            className="h-8 text-xs bg-white"
          />
        </div>
        <div>
          <Label className="text-[11px]">Capacidade (kWh)</Label>
          <InputNum
            valor={linha.capacidadeKwh}
            onChange={(v) => onChange({ ...linha, capacidadeKwh: v })}
            placeholder="5,12"
            className="h-8 text-xs bg-white"
          />
        </div>
        <div>
          <Label className="text-[11px]">Tensão (opcional)</Label>
          <Input
            placeholder="Ex.: 48 V"
            value={linha.tensao}
            onChange={(e) => onChange({ ...linha, tensao: e.target.value })}
            className="h-8 text-xs bg-white"
          />
        </div>
      </div>

      {/* Quantidade desta linha */}
      <div className="mt-2.5 flex items-center justify-between border-t border-[#eef2f8] pt-2">
        <span className="text-xs font-semibold text-[#3c4a63]">Quantidade deste modelo:</span>
        <QtdStepper
          qtd={linha.qtd}
          setQtd={(novaQtd) => onChange({ ...linha, qtd: Math.max(1, novaQtd) })}
          min={1}
        />
      </div>
    </div>
  )
}
