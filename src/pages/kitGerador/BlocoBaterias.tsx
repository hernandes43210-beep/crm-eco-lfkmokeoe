// Bloco de Baterias (linhas informativas) com botão adicionar/remover
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { LinhaBateriaItem } from './LinhaBateriaItem'
import { linhaBateriaInicial, type BateriaItemForm } from './formTipos'

export function BlocoBaterias({
  linhas,
  onChangeLinhas,
}: {
  linhas: BateriaItemForm[]
  onChangeLinhas: (linhas: BateriaItemForm[]) => void
}) {
  const handleUpdate = (idx: number, atualizado: BateriaItemForm) => {
    const novas = [...linhas]
    novas[idx] = atualizado
    onChangeLinhas(novas)
  }

  const handleRemover = (idx: number) => {
    if (linhas.length <= 1) {
      // Última linha: apenas limpa os campos (mantém a estrutura do montador)
      onChangeLinhas([linhaBateriaInicial()])
      return
    }
    const novas = linhas.filter((_, i) => i !== idx)
    onChangeLinhas(novas)
  }

  const handleAdicionar = () => {
    onChangeLinhas([...linhas, linhaBateriaInicial()])
  }

  const qtdTotal = linhas.reduce((acc, b) => acc + (b.qtd || 0), 0)
  const kwhTotal = linhas.reduce((acc, b) => acc + (b.capacidadeKwh || 0) * (b.qtd || 0), 0)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {linhas.map((linha, idx) => (
          <LinhaBateriaItem
            key={linha.id}
            linha={linha}
            index={idx}
            totalLinhas={linhas.length}
            onChange={(atualizada) => handleUpdate(idx, atualizada)}
            onRemover={() => handleRemover(idx)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-[#dfe5f0] pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdicionar}
          className="border-[#0b1f4d] text-[#0b1f4d] hover:bg-[#eef2f8]"
        >
          <Plus className="mr-1.5 h-4 w-4" />+ Adicionar bateria
        </Button>
        <span className="text-xs text-[#8a94a8]">
          {qtdTotal > 0
            ? `${qtdTotal} un • ${kwhTotal.toFixed(2).replace('.', ',')} kWh total`
            : 'Opcional — sem baterias'}
        </span>
      </div>
    </div>
  )
}
