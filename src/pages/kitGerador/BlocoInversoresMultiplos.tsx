// Bloco de Múltiplos Inversores com Botão Adicionar e Outros Dados
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { LinhaInversorItem } from './LinhaInversorItem'
import { linhaInversorInicial, type InversorItemForm } from './formTipos'
import type { InversorCatalogo } from '@/services/kitGerador'

export function BlocoInversoresMultiplos({
  linhas,
  inversores,
  onChangeLinhas,
  outrosDados,
  onChangeOutrosDados,
  onGravarCatalogo,
  gravando,
}: {
  linhas: InversorItemForm[]
  inversores: InversorCatalogo[]
  onChangeLinhas: (linhas: InversorItemForm[]) => void
  outrosDados: string
  onChangeOutrosDados: (texto: string) => void
  onGravarCatalogo: (linha: InversorItemForm) => void
  gravando: boolean
}) {
  const handleUpdate = (idx: number, atualizado: InversorItemForm) => {
    const novas = [...linhas]
    novas[idx] = atualizado
    onChangeLinhas(novas)
  }

  const handleRemover = (idx: number) => {
    if (linhas.length <= 1) {
      // Se for a única linha, reseta para vazia em vez de remover
      onChangeLinhas([linhaInversorInicial()])
      return
    }
    const novas = linhas.filter((_, i) => i !== idx)
    onChangeLinhas(novas)
  }

  const handleAdicionar = () => {
    onChangeLinhas([...linhas, linhaInversorInicial()])
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {linhas.map((linha, idx) => (
          <LinhaInversorItem
            key={linha.id}
            linha={linha}
            index={idx}
            totalLinhas={linhas.length}
            inversores={inversores}
            onChange={(atualizada) => handleUpdate(idx, atualizada)}
            onRemover={() => handleRemover(idx)}
            onGravarCatalogo={onGravarCatalogo}
            gravando={gravando}
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
          <Plus className="mr-1.5 h-4 w-4" />+ Adicionar modelo de inversor
        </Button>
        <span className="text-xs text-[#8a94a8]">
          {linhas.length} {linhas.length === 1 ? 'modelo' : 'modelos'}
        </span>
      </div>

      {/* Campo Outros Dados */}
      <div className="space-y-1 rounded-[10px] bg-[#f8fafc] p-3 border border-[#dfe5f0]">
        <Label htmlFor="outros-dados-inversores" className="text-xs font-semibold text-[#0b1f4d]">
          Outros dados / Observações dos inversores (opcional)
        </Label>
        <Textarea
          id="outros-dados-inversores"
          placeholder="Ex.: Tensão da rede (220V/380V), inclusão de Smart Meter, módulo Wi-Fi incluso, MPPTs dedicados, etc."
          rows={2}
          value={outrosDados}
          onChange={(e) => onChangeOutrosDados(e.target.value)}
          className="resize-none text-xs bg-white"
        />
      </div>
    </div>
  )
}
