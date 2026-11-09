import { Search, Contrast, Zap, Building2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FAIXAS_POTENCIA } from '@/hooks/useKitFilters'

export interface KitFilterBarProps {
  searchTerm: string
  onSearchTermChange: (v: string) => void
  selectedMarcaInversor: string
  onMarcaInversorChange: (v: string) => void
  marcasInversorDisponiveis: string[]
  selectedFaixaPotencia: string
  onFaixaPotenciaChange: (v: string) => void
  selectedEstrutura: string
  onEstruturaChange: (v: string) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  totalKits: number
  filteredCount: number
  compact?: boolean
}

const ESTRUTURA_OPCOES = [
  { value: 'fibrocimento', label: 'Fibrocimento' },
  { value: 'ceramico', label: 'Cerâmico' },
  { value: 'mini_trilho', label: 'Mini Trilho (Metálico)' },
  { value: 'solo_monoposte', label: 'Solo (Monoposte)' },
  { value: 'outro', label: 'Outro' },
]

/** Barra de filtros combináveis para seleção de kits nos modais de proposta. */
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
  compact = false,
}: KitFilterBarProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            placeholder="Buscar kit, marca..."
            className="h-9 pl-8 text-xs bg-white"
          />
        </div>

        {/* Marca do inversor */}
        <Select value={selectedMarcaInversor} onValueChange={onMarcaInversorChange}>
          <SelectTrigger className="h-9 text-xs bg-white">
            <div className="flex items-center gap-1.5 min-w-0">
              <Contrast className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <SelectValue placeholder="Marca do inversor (todas)" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              Todas as marcas
            </SelectItem>
            {marcasInversorDisponiveis.map((m) => (
              <SelectItem key={m} value={m} className="text-xs">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Faixa de potência */}
        <Select value={selectedFaixaPotencia} onValueChange={onFaixaPotenciaChange}>
          <SelectTrigger className="h-9 text-xs bg-white">
            <div className="flex items-center gap-1.5 min-w-0">
              <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <SelectValue placeholder="Faixa de potência (todas)" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              Todas as potências
            </SelectItem>
            {FAIXAS_POTENCIA.map((f) => (
              <SelectItem key={f.value} value={f.value} className="text-xs">
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tipo de estrutura */}
        <Select value={selectedEstrutura} onValueChange={onEstruturaChange}>
          <SelectTrigger className="h-9 text-xs bg-white">
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <SelectValue placeholder="Estrutura (todas)" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              Todas as estruturas
            </SelectItem>
            {ESTRUTURA_OPCOES.map((e) => (
              <SelectItem key={e.value} value={e.value} className="text-xs">
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contagem + limpar filtros */}
      <div className="flex items-center justify-between pt-0.5">
        <span className="text-[11px] text-slate-500">
          {filteredCount} de {totalKits} kit{totalKits === 1 ? '' : 's'}
        </span>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-800 gap-1"
          >
            <X className="w-3 h-3" />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  )
}
