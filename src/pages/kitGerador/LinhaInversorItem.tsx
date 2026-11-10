// Linha individual de Inversor com catálogo ou manual
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'
import { QtdStepper, InputNum } from './formControles'
import { fmt, TIPOS_INVERSOR } from './logica'
import type { InversorItemForm } from './formTipos'
import type { InversorCatalogo, TipoInversor } from '@/services/kitGerador'

export function LinhaInversorItem({
  linha,
  index,
  totalLinhas,
  inversores,
  onChange,
  onRemover,
  onGravarCatalogo,
  gravando,
}: {
  linha: InversorItemForm
  index: number
  totalLinhas: number
  inversores: InversorCatalogo[]
  onChange: (atualizado: InversorItemForm) => void
  onRemover: () => void
  onGravarCatalogo: (linha: InversorItemForm) => void
  gravando: boolean
}) {
  const [busca, setBusca] = useState('')

  const inversoresFiltrados = inversores.filter((inv) => {
    if (!busca.trim()) return true
    const t = busca.toLowerCase()
    return (
      inv.marca.toLowerCase().includes(t) ||
      inv.modelo.toLowerCase().includes(t) ||
      String(inv.potencia_kw).includes(t)
    )
  })

  const kwCaLinha = linha.qtd * linha.potenciaKw

  return (
    <div className="rounded-[10px] border border-[#dfe5f0] bg-[#f8fafc] p-3 transition-all">
      <div className="mb-2 flex items-center justify-between border-b border-[#eef2f8] pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0b1f4d] text-[10px] font-bold text-white">
            {index + 1}
          </span>
          <span className="text-xs font-bold text-[#0b1f4d]">
            {linha.marca || 'Inversor'} {linha.modelo ? `• ${linha.modelo}` : ''}
          </span>
          {linha.potenciaKw > 0 && (
            <span className="rounded bg-[#eef2f8] px-1.5 py-0.5 text-[11px] font-semibold text-[#0b1f4d]">
              {fmt(linha.potenciaKw)} kW ({fmt(kwCaLinha)} kW CA)
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
            placeholder="Buscar inversor no catálogo (marca, modelo, potência)..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 text-xs bg-white"
          />
          <div className="max-h-36 overflow-y-auto rounded border border-[#dfe5f0] bg-white p-1 space-y-1">
            {inversoresFiltrados.slice(0, 15).map((inv) => {
              const selecionado =
                linha.marca === inv.marca &&
                linha.modelo === inv.modelo &&
                linha.potenciaKw === inv.potencia_kw
              return (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...linha,
                      marca: inv.marca,
                      modelo: inv.modelo,
                      potenciaKw: inv.potencia_kw,
                      tipo: inv.tipo,
                    })
                  }
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors ${
                    selecionado ? 'bg-[#0b1f4d] text-white' : 'hover:bg-[#eef2f8] text-[#3c4a63]'
                  }`}
                >
                  <span className="font-medium truncate">
                    {inv.marca} {inv.modelo} ({inv.tipo})
                  </span>
                  <span className="shrink-0 font-bold ml-2">{fmt(inv.potencia_kw)} kW</span>
                </button>
              )
            })}
            {inversoresFiltrados.length === 0 && (
              <p className="p-2 text-center text-xs text-[#8a94a8]">Nenhum inversor encontrado</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <Label className="text-[11px]">Marca</Label>
              <Input
                placeholder="Ex.: Sungrow"
                value={linha.marca}
                onChange={(e) => onChange({ ...linha, marca: e.target.value })}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div>
              <Label className="text-[11px]">Modelo</Label>
              <Input
                placeholder="Ex.: SG5.0RS"
                value={linha.modelo}
                onChange={(e) => onChange({ ...linha, modelo: e.target.value })}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div>
              <Label className="text-[11px]">Potência (kW)</Label>
              <InputNum
                valor={linha.potenciaKw}
                onChange={(v) => onChange({ ...linha, potenciaKw: v })}
                placeholder="5"
                className="h-8 text-xs bg-white"
              />
            </div>
            <div>
              <Label className="text-[11px]">Tipo</Label>
              <select
                value={linha.tipo}
                onChange={(e) => onChange({ ...linha, tipo: e.target.value as TipoInversor })}
                className="h-8 w-full rounded-md border border-input bg-white px-2 text-xs"
              >
                {TIPOS_INVERSOR.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
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
