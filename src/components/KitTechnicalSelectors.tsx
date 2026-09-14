import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Zap, Building, Boxes, Calculator } from 'lucide-react'
import {
  MARCAS_PAINEIS_SUGERIDAS,
  MARCAS_INVERSORES_SUGERIDAS,
  POTENCIAS_COMUNS_PAINEIS,
  POTENCIAS_COMUNS_INVERSORES,
  TIPOS_ESTRUTURA_OPCOES,
  formatarPotenciaW,
  formatarPotenciaKw,
  formatarRotuloEstrutura,
  formatarRotuloStringBox,
} from '@/lib/quickKitUtils'

export interface KitTechnicalSelectorsValues {
  qtdPaineis: number | string
  potenciaPainelW: number | string
  marcaPaineis: string
  qtdInversores: number | string
  marcaInversor: string
  potenciaInversorKw: number | string
  tipoEstrutura: string
  stringBox?: string
}

export interface KitTechnicalSelectorsProps {
  values: KitTechnicalSelectorsValues
  onChange: (patch: Partial<KitTechnicalSelectorsValues>) => void
  kwpCalculado?: number
  formattedKwpBR?: string
  showStringBox?: boolean
  onReapplySuggestions?: () => void
  disabled?: boolean
  className?: string
}

export function KitTechnicalSelectors({
  values,
  onChange,
  kwpCalculado,
  formattedKwpBR,
  showStringBox = true,
  onReapplySuggestions,
  disabled = false,
  className = '',
}: KitTechnicalSelectorsProps) {
  const [isCustomPotenciaW, setIsCustomPotenciaW] = React.useState(() => {
    const p = Number(values.potenciaPainelW)
    return p > 0 && !(POTENCIAS_COMUNS_PAINEIS as readonly number[]).includes(p)
  })

  const [isCustomMarcaPainel, setIsCustomMarcaPainel] = React.useState(() => {
    const m = values.marcaPaineis?.trim()
    return Boolean(m && !(MARCAS_PAINEIS_SUGERIDAS as readonly string[]).includes(m))
  })

  const [isCustomPotenciaInversorKw, setIsCustomPotenciaInversorKw] = React.useState(() => {
    const p = Number(values.potenciaInversorKw)
    return p > 0 && !(POTENCIAS_COMUNS_INVERSORES as readonly number[]).includes(p)
  })

  const [isCustomMarcaInversor, setIsCustomMarcaInversor] = React.useState(() => {
    const m = values.marcaInversor?.trim()
    return Boolean(m && !(MARCAS_INVERSORES_SUGERIDAS as readonly string[]).includes(m))
  })

  const kwpExibicao =
    formattedKwpBR ??
    (kwpCalculado !== undefined
      ? kwpCalculado.toLocaleString('pt-BR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 2,
        })
      : null)

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Bloco de Componentes: Painéis e Inversores */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/70 via-white to-amber-50/40 border border-emerald-200/80 shadow-2xs space-y-3.5 animate-fade-in">
        <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0B7A5B] text-white flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Montagem Técnica dos Equipamentos
              </h4>
              <p className="text-[11px] text-slate-500">
                Seleção de marca dos painéis, inversor e cálculo automático de potência pico
              </p>
            </div>
          </div>

          {kwpExibicao && (
            <div className="text-right">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                Potência Pico
              </span>
              <span className="text-base font-extrabold text-[#0B7A5B] font-mono-numbers">
                {kwpExibicao} kWp
              </span>
            </div>
          )}
        </div>

        {/* Painéis: Quantidade, Potência e Marca */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span>Módulos Fotovoltaicos (Painéis)</span>
              {kwpExibicao ? (
                <span className="text-emerald-700 text-[10px] font-normal">
                  ({values.qtdPaineis || 0} × {values.potenciaPainelW || 0}Wp = {kwpExibicao} kWp)
                </span>
              ) : null}
            </Label>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setIsCustomPotenciaW(!isCustomPotenciaW)}
              className="text-[11px] text-[#0B7A5B] hover:underline font-medium disabled:opacity-50"
            >
              {isCustomPotenciaW ? 'Potências comuns' : 'Valor personalizado'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Qtd Painéis */}
            <div className="sm:col-span-3">
              <Label htmlFor="selectorQtdPaineis" className="text-[11px] text-slate-500 block mb-1">
                Qtd. Painéis
              </Label>
              <Input
                id="selectorQtdPaineis"
                type="number"
                min="1"
                step="1"
                disabled={disabled}
                value={values.qtdPaineis}
                onChange={(e) => onChange({ qtdPaineis: e.target.value })}
                placeholder="Ex: 10"
                className="h-9 text-sm font-semibold border-slate-200"
              />
            </div>

            {/* Potência Painel (Wp) */}
            <div className="sm:col-span-4">
              <Label htmlFor="selectorPotPainel" className="text-[11px] text-slate-500 block mb-1">
                Potência (Wp)
              </Label>
              {isCustomPotenciaW ? (
                <Input
                  id="selectorPotPainel"
                  type="number"
                  min="100"
                  step="5"
                  disabled={disabled}
                  value={values.potenciaPainelW}
                  onChange={(e) => onChange({ potenciaPainelW: e.target.value })}
                  placeholder="Ex: 580"
                  className="h-9 text-sm font-semibold border-slate-200"
                />
              ) : (
                <select
                  id="selectorPotPainel"
                  disabled={disabled}
                  value={values.potenciaPainelW}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setIsCustomPotenciaW(true)
                    } else {
                      onChange({ potenciaPainelW: Number(e.target.value) })
                    }
                  }}
                  className="w-full h-9 px-3 text-sm font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B] disabled:bg-slate-100"
                >
                  {POTENCIAS_COMUNS_PAINEIS.map((p) => (
                    <option key={p} value={p}>
                      {p} Wp
                    </option>
                  ))}
                  <option value="custom">Outro (personalizado)...</option>
                </select>
              )}
            </div>

            {/* Marca dos Painéis */}
            <div className="sm:col-span-5">
              <Label
                htmlFor="selectorMarcaPaineis"
                className="text-[11px] text-slate-500 block mb-1"
              >
                Marca dos Painéis
              </Label>
              {isCustomMarcaPainel ? (
                <div className="flex gap-1.5">
                  <Input
                    id="selectorMarcaPaineis"
                    disabled={disabled}
                    value={values.marcaPaineis}
                    onChange={(e) => onChange({ marcaPaineis: e.target.value })}
                    placeholder="Ex: OSDA, DMEGC, TSUN..."
                    className="h-9 text-sm border-slate-200"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => setIsCustomMarcaPainel(false)}
                    className="h-9 px-2 text-[11px]"
                  >
                    Lista
                  </Button>
                </div>
              ) : (
                <select
                  id="selectorMarcaPaineis"
                  disabled={disabled}
                  value={values.marcaPaineis}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setIsCustomMarcaPainel(true)
                    } else {
                      onChange({ marcaPaineis: e.target.value })
                    }
                  }}
                  className="w-full h-9 px-3 text-xs sm:text-sm font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B] disabled:bg-slate-100"
                >
                  <optgroup label="Marcas em Destaque">
                    <option value="OSDA">OSDA</option>
                    <option value="DMEGC">DMEGC</option>
                    <option value="TSUN POWER">TSUN POWER</option>
                  </optgroup>
                  <optgroup label="Outras Marcas Frequentes">
                    {MARCAS_PAINEIS_SUGERIDAS.filter(
                      (m) => !['OSDA', 'DMEGC', 'TSUN POWER'].includes(m),
                    ).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </optgroup>
                  <option value="custom">Outra marca (digitar)...</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Inversor: Quantidade, Potência e Marca */}
        <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span>Inversor Solar</span>
              {values.potenciaInversorKw ? (
                <span className="text-amber-700 text-[10px] font-normal">
                  ({formatarPotenciaKw(values.potenciaInversorKw)})
                </span>
              ) : null}
            </Label>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setIsCustomPotenciaInversorKw(!isCustomPotenciaInversorKw)}
              className="text-[11px] text-[#0B7A5B] hover:underline font-medium disabled:opacity-50"
            >
              {isCustomPotenciaInversorKw ? 'Potências comuns' : 'Potência personalizada'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Qtd Inversores */}
            <div className="sm:col-span-3">
              <Label htmlFor="selectorQtdInv" className="text-[11px] text-slate-500 block mb-1">
                Qtd. Inversores
              </Label>
              <Input
                id="selectorQtdInv"
                type="number"
                min="1"
                step="1"
                disabled={disabled}
                value={values.qtdInversores}
                onChange={(e) => onChange({ qtdInversores: e.target.value })}
                placeholder="1"
                className="h-9 text-sm font-semibold border-slate-200"
              />
            </div>

            {/* Potência Inversor (kW) */}
            <div className="sm:col-span-4">
              <Label htmlFor="selectorPotInv" className="text-[11px] text-slate-500 block mb-1">
                Potência (kW)
              </Label>
              {isCustomPotenciaInversorKw ? (
                <Input
                  id="selectorPotInv"
                  type="number"
                  min="0.5"
                  step="0.1"
                  disabled={disabled}
                  value={values.potenciaInversorKw}
                  onChange={(e) => onChange({ potenciaInversorKw: e.target.value })}
                  placeholder="Ex: 7.5"
                  className="h-9 text-sm font-semibold border-slate-200"
                />
              ) : (
                <select
                  id="selectorPotInv"
                  disabled={disabled}
                  value={values.potenciaInversorKw}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setIsCustomPotenciaInversorKw(true)
                    } else {
                      onChange({ potenciaInversorKw: Number(e.target.value) })
                    }
                  }}
                  className="w-full h-9 px-3 text-sm font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B] disabled:bg-slate-100"
                >
                  {POTENCIAS_COMUNS_INVERSORES.map((p) => (
                    <option key={p} value={p}>
                      {p.toLocaleString('pt-BR')} kW
                    </option>
                  ))}
                  <option value="custom">Outra potência...</option>
                </select>
              )}
            </div>

            {/* Marca do Inversor */}
            <div className="sm:col-span-5">
              <Label htmlFor="selectorMarcaInv" className="text-[11px] text-slate-500 block mb-1">
                Marca / Modelo do Inversor
              </Label>
              {isCustomMarcaInversor ? (
                <div className="flex gap-1.5">
                  <Input
                    id="selectorMarcaInv"
                    disabled={disabled}
                    value={values.marcaInversor}
                    onChange={(e) => onChange({ marcaInversor: e.target.value })}
                    placeholder="Ex: Sungrow, HUAWEI, AUSXOL, PHB..."
                    className="h-9 text-sm border-slate-200"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => setIsCustomMarcaInversor(false)}
                    className="h-9 px-2 text-[11px]"
                  >
                    Lista
                  </Button>
                </div>
              ) : (
                <select
                  id="selectorMarcaInv"
                  disabled={disabled}
                  value={values.marcaInversor}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setIsCustomMarcaInversor(true)
                    } else {
                      onChange({ marcaInversor: e.target.value })
                    }
                  }}
                  className="w-full h-9 px-3 text-xs sm:text-sm font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B] disabled:bg-slate-100"
                >
                  <optgroup label="Marcas em Destaque">
                    <option value="Sungrow">Sungrow</option>
                    <option value="HUAWEI">HUAWEI</option>
                    <option value="AUSXOL">AUSXOL</option>
                    <option value="PHB">PHB</option>
                    <option value="GOODWE">GOODWE</option>
                  </optgroup>
                  <optgroup label="Outras Marcas Frequentes">
                    {MARCAS_INVERSORES_SUGERIDAS.filter(
                      (m) => !['Sungrow', 'HUAWEI', 'AUSXOL', 'PHB', 'GOODWE'].includes(m),
                    ).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </optgroup>
                  <option value="custom">Outra marca (digitar)...</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Resumo da montagem com botão de recarregar sugestões */}
        {onReapplySuggestions && (
          <div className="p-2.5 rounded-lg bg-white/80 border border-emerald-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-emerald-900">
              <Calculator className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Total: <strong>{kwpExibicao || '0'} kWp</strong> ({values.qtdPaineis || 0} painéis ×{' '}
                {values.potenciaPainelW || 0}Wp)
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={onReapplySuggestions}
              className="h-6 px-2 text-[11px] text-[#0B7A5B] hover:text-[#095C44] hover:bg-emerald-50 font-medium"
            >
              Reaplicar sugestões
            </Button>
          </div>
        )}
      </div>

      {/* Seletores Técnicos: Tipo de Estrutura & String Box */}
      <div className={`grid grid-cols-1 ${showStringBox ? 'sm:grid-cols-2' : ''} gap-3`}>
        {/* Seletor Tipo de Estrutura */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="selectorTipoEstrutura"
              className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"
            >
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span>Tipo de Estrutura</span>
            </Label>
            {values.tipoEstrutura && (
              <span className="text-[11px] font-bold text-blue-800 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full">
                {formatarRotuloEstrutura(values.tipoEstrutura)}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Estrutura de sustentação dos módulos:
          </p>
          <select
            id="selectorTipoEstrutura"
            disabled={disabled}
            value={values.tipoEstrutura}
            onChange={(e) => onChange({ tipoEstrutura: e.target.value })}
            className="w-full h-9.5 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B7A5B] disabled:bg-slate-100"
          >
            <option value="">Não especificado</option>
            {TIPOS_ESTRUTURA_OPCOES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Seletor de String Box */}
        {showStringBox && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="selectorStringBox"
                className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"
              >
                <Boxes className="w-3.5 h-3.5 text-amber-600" />
                <span>String Box (Opcional)</span>
              </Label>
              {values.stringBox && (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                  {formatarRotuloStringBox(values.stringBox)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Proteção CC com DPS e disjuntor:
            </p>
            <select
              id="selectorStringBox"
              disabled={disabled}
              value={values.stringBox || ''}
              onChange={(e) => onChange({ stringBox: e.target.value })}
              className="w-full h-9.5 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B7A5B] disabled:bg-slate-100"
            >
              <option value="">Sem string box</option>
              <option value="1_entrada">1 entrada (1E / 1S)</option>
              <option value="2_entradas">2 entradas (2E / 2S)</option>
              <option value="3_entradas">3 entradas (3E / 3S)</option>
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
