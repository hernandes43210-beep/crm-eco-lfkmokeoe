// Campos de modalidade + formulário FNO, usados em GerarPropostaModal e EditarPropostaModal.

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ModalidadeVenda } from './fnoModalidade'
import { MODALIDADE_ROTULOS } from './fnoModalidade'
import { formatBRL } from '@/lib/solarUtils'

export interface FnoFormularioCampos {
  valor_total: number
  valor_entrada: number
  taxa_anual: number
  prazo_meses: number
  carencia_meses: number
  data_base: string
  dia_vencimento: number
}

interface Props {
  modalidade: ModalidadeVenda
  onModalidade: (m: ModalidadeVenda) => void
  form: FnoFormularioCampos
  onForm: (parcial: Partial<FnoFormularioCampos>) => void
  resultado?: unknown
  calculando?: boolean
  erro?: string
  disabled?: boolean
}

export function PropostaFnoCampos({
  modalidade,
  onModalidade,
  form,
  onForm,
  resultado,
  calculando,
  erro,
  disabled,
}: Props) {
  const valorFinanciado = Math.max(0, form.valor_total - form.valor_entrada)
  return (
    <div className="p-3.5 rounded-lg bg-indigo-50/60 border border-indigo-100 space-y-2.5">
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-indigo-950">Modalidade de Venda</Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(MODALIDADE_ROTULOS) as ModalidadeVenda[]).map((m) => (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => onModalidade(m)}
              className={cn(
                'rounded-md border px-3 py-2 text-xs font-semibold transition-colors',
                modalidade === m
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300',
              )}
            >
              {MODALIDADE_ROTULOS[m]}
            </button>
          ))}
        </div>
      </div>

      {modalidade === 'fno' && (
        <div className="grid grid-cols-2 gap-3 rounded-md border border-indigo-100 p-3 bg-white">
          <div className="space-y-1">
            <Label htmlFor="fno-entrada" className="text-[11px] font-semibold text-slate-700">
              Entrada à vista
            </Label>
            <Input
              id="fno-entrada"
              type="number"
              min={0}
              step="0.01"
              disabled={disabled}
              value={form.valor_entrada || ''}
              onChange={(e) => onForm({ valor_entrada: Number(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
            <p className="text-[11px] text-indigo-700">A financiar: {formatBRL(valorFinanciado)}</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="fno-taxa" className="text-[11px] font-semibold text-slate-700">
              Taxa (% a.a.)
            </Label>
            <Input
              id="fno-taxa"
              type="number"
              step="0.01"
              min={0}
              disabled={disabled}
              value={form.taxa_anual || ''}
              onChange={(e) => onForm({ taxa_anual: Number(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fno-prazo" className="text-[11px] font-semibold text-slate-700">
              Prazo (meses)
            </Label>
            <Input
              id="fno-prazo"
              type="number"
              min={1}
              disabled={disabled}
              value={form.prazo_meses || ''}
              onChange={(e) => onForm({ prazo_meses: Number(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fno-carencia" className="text-[11px] font-semibold text-slate-700">
              Carência (meses)
            </Label>
            <Input
              id="fno-carencia"
              type="number"
              min={0}
              disabled={disabled}
              value={form.carencia_meses || ''}
              onChange={(e) => onForm({ carencia_meses: Number(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fno-database" className="text-[11px] font-semibold text-slate-700">
              Data-base (liberação)
            </Label>
            <Input
              id="fno-database"
              type="date"
              disabled={disabled}
              value={form.data_base || ''}
              onChange={(e) => onForm({ data_base: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fno-venc" className="text-[11px] font-semibold text-slate-700">
              Dia de vencimento
            </Label>
            <Input
              id="fno-venc"
              type="number"
              min={1}
              max={28}
              disabled={disabled}
              value={form.dia_vencimento || 10}
              onChange={(e) => onForm({ dia_vencimento: Number(e.target.value) || 10 })}
              className="h-8 text-xs"
            />
          </div>

          <div className="col-span-2 text-xs">
            {calculando && (
              <p className="flex items-center gap-1.5 text-slate-500">
                <Loader2 className="w-3 h-3 animate-spin" /> Calculando simulação...
              </p>
            )}
            {!calculando && erro && <p className="text-red-600">{erro}</p>}
            {!calculando &&
              !erro &&
              resultado &&
              (() => {
                const r = resultado as { primeira_parcela?: number; total_pago?: number }
                return (
                  <p className="text-emerald-700 font-medium">
                    1ª parcela: {formatBRL(r.primeira_parcela || 0)} • Total pago:{' '}
                    {formatBRL(r.total_pago || 0)}
                  </p>
                )
              })()}
          </div>
        </div>
      )}
    </div>
  )
}
