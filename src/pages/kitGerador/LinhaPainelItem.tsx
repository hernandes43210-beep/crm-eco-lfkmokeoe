// Linha individual de Painel com catálogo ou manual
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'
import { QtdStepper, InputNum } from './formControles'
import { fmt } from './logica'
import type { PainelItemForm } from './formTipos'
import type { PainelCatalogo } from '@/services/kitGerador'

export function LinhaPainelItem({
  linha,
  index,
  totalLinhas,
  paineis,
  onChange,
  onRemover,
  onGravarCatalogo,
  gravando,
}: {
  linha: PainelItemForm
  index: number
  totalLinhas: number
  paineis: PainelCatalogo[]
  onChange: (atualizado: PainelItemForm) => void
  onRemover: () => void
  onGravarCatalogo: (linha: PainelItemForm) => void
  gravando: boolean
}) {
  const [busca, setBusca] = useState('')

  const paineisFiltrados = paineis.filter((p) => {
    if (!busca.trim()) return true
    const t = busca.toLowerCase()
    return (
      p.marca.toLowerCase().includes(t) ||
      p.modelo.toLowerCase().includes(t) ||
      String(p.potencia_w).includes(t)
    )
  })

  const kwpLinha = (linha.qtd * linha.potenciaW) / 1000

  return (
    <div className="rounded-[10px] border border-[#dfe5f0] bg-[#f8fafc] p-3 transition-all">
      <div className="mb-2 flex items-center justify-between border-b border-[#eef2f8] pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0b1f4d] text-[10px] font-bold text-white">
            {index + 1}
          </span>
          <span className="text-xs font-bold text-[#0b1f4d]">
            {linha.marca || 'Painel'} {linha.modelo ? `• ${linha.modelo}` : ''}
          </span>
          {linha.potenciaW > 0 && (
            <span className="rounded bg-[#eef2f8] px-1.5 py-0.5 text-[11px] font-semibold text-[#0b1f4d]">
              {linha.potenciaW} W ({fmt(kwpLinha)} kWp)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-[#dfe5f0] bg-white p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => onChange({ ...linha, modo: 'catalogo' })}
              className={`rounded px-2 py-0.5 font-medium transition-colors ${
                linha.modo === 'catalogo'
                  ? 'bg-[#0b1f4d] text-white'
                  : 'text-[#8a94a8] hover:text-[#0b1f4d]'
              }`}
            >
              Catálogo
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...linha, modo: 'manual' })}
              className={`rounded px-2 py-0.5 font-medium transition-colors ${
                linha.modo === 'manual'
                  ? 'bg-[#0b1f4d] text-white'
                  : 'text-[#8a94a8] hover:text-[#0b1f4d]'
              }`}
            >
              Outro / Manual
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemover}
            className="h-7 w-7 p-0 text-[#c0392b] hover:bg-red-50 hover:text-red-700"
            title={totalLinhas > 1 ? 'Remover este modelo' : 'Limpar modelo'}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {linha.modo === 'catalogo' ? (
        <div className="space-y-2">
          <Input
            placeholder="Buscar painel no catálogo (marca, modelo, potência)..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 text-xs bg-white"
          />
          <div className="max-h-36 overflow-y-auto rounded border border-[#dfe5f0] bg-white p-1 space-y-1">
            {paineisFiltrados.slice(0, 15).map((p) => {
              const selecionado =
                linha.marca === p.marca &&
                linha.modelo === p.modelo &&
                linha.potenciaW === p.potencia_w
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...linha,
                      marca: p.marca,
                      modelo: p.modelo,
                      potenciaW: p.potencia_w,
                      areaM2: p.area_m2 || 2.79,
                    })
                  }
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors ${
                    selecionado ? 'bg-[#0b1f4d] text-white' : 'hover:bg-[#eef2f8] text-[#3c4a63]'
                  }`}
                >
                  <span className="font-medium truncate">
                    {p.marca} {p.modelo}
                  </span>
                  <span className="shrink-0 font-bold ml-2">{p.potencia_w} W</span>
                </button>
              )
            })}
            {paineisFiltrados.length === 0 && (
              <p className="p-2 text-center text-xs text-[#8a94a8]">Nenhum painel encontrado</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <Label className="text-[11px]">Marca</Label>
              <Input
                placeholder="Ex.: Canadian"
                value={linha.marca}
                onChange={(e) => onChange({ ...linha, marca: e.target.value })}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div>
              <Label className="text-[11px]">Modelo</Label>
              <Input
                placeholder="Ex.: CS6W-550MS"
                value={linha.modelo}
                onChange={(e) => onChange({ ...linha, modelo: e.target.value })}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div>
              <Label className="text-[11px]">Potência (W)</Label>
              <InputNum
                valor={linha.potenciaW}
                onChange={(v) => onChange({ ...linha, potenciaW: v })}
                placeholder="550"
                className="h-8 text-xs bg-white"
              />
            </div>
            <div>
              <Label className="text-[11px]">Área (m²)</Label>
              <InputNum
                valor={linha.areaM2}
                onChange={(v) => onChange({ ...linha, areaM2: v })}
                placeholder="2,79"
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>
          {linha.marca && linha.modelo && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={gravando}
              onClick={() => onGravarCatalogo(linha)}
              className="h-7 text-[11px] border-[#0b1f4d] text-[#0b1f4d]"
            >
              + Salvar este modelo no catálogo geral
            </Button>
          )}
        </div>
      )}

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
