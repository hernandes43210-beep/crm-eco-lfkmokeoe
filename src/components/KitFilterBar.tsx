import React from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { KitCategoria } from '@/types/crm'
import { FAIXAS_POTENCIA_KITS, TIPOS_ESTRUTURA_FILTRO } from '@/hooks/useKitFilters'

export interface KitFilterBarProps {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  selectedMarcaInversor: string
  onMarcaInversorChange: (value: string) => void
  marcasInversorDisponiveis: string[]
  selectedFaixaPotencia: string
  onFaixaPotenciaChange: (value: string) => void
  selectedEstrutura: string
  onEstruturaChange: (value: string) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  totalKits: number
  filteredCount: number

  // Opcionais para a página Kits Solares
  selectedCategoria?: string
  onCategoriaChange?: (categoria: string) => void
  categoriasList?: KitCategoria[]
  compact?: boolean // Modo compacto para modais
}

export function KitFilterBar({
  searchTerm,
  onSearchTermChange,
  selectedMarcaInversor,
  onMarcaInversorChange,
  marcasInversorDisponiveis,
  selectedFaixaPotencia,
  onFaixaPotenciaChange,
  selectedEstrutura,
  onEstruturaChange,
  hasActiveFilters,
  onClearFilters,
  totalKits,
  filteredCount,
  selectedCategoria,
  onCategoriaChange,
  categoriasList,
  compact = false,
}: KitFilterBarProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5 ${
        compact ? 'p-2.5 text-xs' : 'p-3.5'
      }`}
    >
      {/* Linha 1: Campo de Busca por Texto + Tabs de Categoria (se houver) */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            placeholder={
              compact
                ? 'Buscar kit por nome, inversor, painel...'
                : 'Buscar por nome, inversor, painel ou potência...'
            }
            className={`pl-8 pr-7 border-slate-200 focus-visible:ring-[#0B7A5B] ${
              compact ? 'h-8 text-xs' : 'h-9 text-xs sm:text-sm'
            }`}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchTermChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categorias (apenas quando fornecido) */}
        {onCategoriaChange && categoriasList && selectedCategoria && (
          <div className="flex items-center gap-1 self-start sm:self-auto shrink-0">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs font-medium">
              <button
                type="button"
                onClick={() => onCategoriaChange('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  selectedCategoria === 'all'
                    ? 'bg-white text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({totalKits})
              </button>
              {categoriasList.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onCategoriaChange(cat)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    selectedCategoria === cat
                      ? 'bg-white text-[#0B7A5B] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Linha 2: Dropdowns Combináveis (Inversor, Potência, Estrutura) + Contagem e Limpar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Ícone de filtros */}
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mr-0.5">
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
            <span>Filtros:</span>
          </div>

          {/* 1. Marca do Inversor */}
          <div className="flex items-center gap-1">
            <Label className="text-[11px] text-slate-500 font-medium whitespace-nowrap hidden sm:inline">
              Inversor:
            </Label>
            <select
              value={selectedMarcaInversor}
              onChange={(e) => onMarcaInversorChange(e.target.value)}
              className="h-7 sm:h-8 px-2 text-[11px] sm:text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-md text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#0B7A5B] cursor-pointer transition-colors max-w-[140px] sm:max-w-none truncate"
              title="Filtrar por marca do inversor"
            >
              <option value="all">Todas as marcas</option>
              {marcasInversorDisponiveis.map((marca) => (
                <option key={marca} value={marca}>
                  {marca}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Faixa de Potência (kWp) */}
          <div className="flex items-center gap-1">
            <Label className="text-[11px] text-slate-500 font-medium whitespace-nowrap hidden sm:inline">
              Potência:
            </Label>
            <select
              value={selectedFaixaPotencia}
              onChange={(e) => onFaixaPotenciaChange(e.target.value)}
              className="h-7 sm:h-8 px-2 text-[11px] sm:text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-md text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#0B7A5B] cursor-pointer transition-colors"
              title="Filtrar por faixa de potência do kit"
            >
              <option value="all">Todas as potências</option>
              {FAIXAS_POTENCIA_KITS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Tipo de Estrutura */}
          <div className="flex items-center gap-1">
            <Label className="text-[11px] text-slate-500 font-medium whitespace-nowrap hidden sm:inline">
              Estrutura:
            </Label>
            <select
              value={selectedEstrutura}
              onChange={(e) => onEstruturaChange(e.target.value)}
              className="h-7 sm:h-8 px-2 text-[11px] sm:text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-md text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#0B7A5B] cursor-pointer transition-colors"
              title="Filtrar por tipo de estrutura"
            >
              <option value="all">Todas as estruturas</option>
              {TIPOS_ESTRUTURA_FILTRO.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lado direito: Contagem de resultados e Botão Limpar Filtros */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 whitespace-nowrap">
            {filteredCount === totalKits ? (
              `${totalKits} kits`
            ) : (
              <>
                <strong className="text-[#0B7A5B] font-bold">{filteredCount}</strong> de {totalKits}{' '}
                kits
              </>
            )}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            disabled={!hasActiveFilters}
            className={`h-7 px-2 text-[11px] font-semibold gap-1 transition-all ${
              hasActiveFilters
                ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                : 'text-slate-300 pointer-events-none'
            }`}
            title="Resetar todos os filtros de busca"
          >
            <X className="w-3 h-3" />
            <span>Limpar filtros</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
