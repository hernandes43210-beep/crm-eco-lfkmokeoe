import { useState, useMemo } from 'react'
import type { Kit } from '@/types/crm'
import { normalizarTexto } from '@/components/CidadeFilterInput'

/**
 * Filtros compartilhados de seleção de kits (usados pelos modais de proposta).
 * Permite combinar: busca por nome/marca, marca do inversor, faixa de potência e tipo de estrutura.
 */

export interface UseKitFiltersReturn {
  searchTerm: string
  setSearchTerm: (v: string) => void
  selectedMarcaInversor: string
  setSelectedMarcaInversor: (v: string) => void
  selectedFaixaPotencia: string
  setSelectedFaixaPotencia: (v: string) => void
  selectedEstrutura: string
  setSelectedEstrutura: (v: string) => void
  marcasInversorDisponiveis: string[]
  hasActiveFilters: boolean
  handleClearFilters: () => void
  filteredKits: Kit[]
}

/** Faixas de potência disponíveis nos filtros. */
export const FAIXAS_POTENCIA = [
  { value: 'ate_5', label: 'Até 5 kWp', min: 0, max: 5 },
  { value: '5_10', label: '5 a 10 kWp', min: 5, max: 10 },
  { value: '10_20', label: '10 a 20 kWp', min: 10, max: 20 },
  { value: '20_50', label: '20 a 50 kWp', min: 20, max: 50 },
  { value: '50_mais', label: '50 kWp ou mais', min: 50, max: Infinity },
] as const

export function useKitFilters(kits: Kit[]): UseKitFiltersReturn {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMarcaInversor, setSelectedMarcaInversor] = useState('')
  const [selectedFaixaPotencia, setSelectedFaixaPotencia] = useState('')
  const [selectedEstrutura, setSelectedEstrutura] = useState('')

  // Marcas de inversor disponíveis a partir dos kits carregados
  const marcasInversorDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const kit of kits) {
      const marca = (kit.marca_inversor || '').trim()
      if (marca) set.add(marca)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [kits])

  const hasActiveFilters = Boolean(
    searchTerm.trim() || selectedMarcaInversor || selectedFaixaPotencia || selectedEstrutura,
  )

  const handleClearFilters = () => {
    setSearchTerm('')
    setSelectedMarcaInversor('')
    setSelectedFaixaPotencia('')
    setSelectedEstrutura('')
  }

  const filteredKits = useMemo(() => {
    const term = normalizarTexto(searchTerm.trim())

    return kits.filter((kit) => {
      // Busca textual (nome, fabricante, marcas)
      if (term) {
        const alvo = normalizarTexto(
          `${kit.nome || ''} ${kit.fabricante || ''} ${kit.marca_painel || ''} ${
            kit.marca_inversor || ''
          }`,
        )
        if (!alvo.includes(term)) return false
      }

      // Marca do inversor
      if (selectedMarcaInversor) {
        const marca = (kit.marca_inversor || '').trim()
        if (!marca || normalizarTexto(marca) !== normalizarTexto(selectedMarcaInversor)) {
          return false
        }
      }

      // Faixa de potência
      if (selectedFaixaPotencia) {
        const faixa = FAIXAS_POTENCIA.find((f) => f.value === selectedFaixaPotencia)
        if (faixa) {
          const p = Number(kit.potencia_kw) || 0
          if (p < faixa.min || p >= faixa.max) return false
        }
      }

      // Tipo de estrutura
      if (selectedEstrutura) {
        if ((kit.tipo_estrutura || '') !== selectedEstrutura) return false
      }

      return true
    })
  }, [kits, searchTerm, selectedMarcaInversor, selectedFaixaPotencia, selectedEstrutura])

  return {
    searchTerm,
    setSearchTerm,
    selectedMarcaInversor,
    setSelectedMarcaInversor,
    selectedFaixaPotencia,
    setSelectedFaixaPotencia,
    selectedEstrutura,
    setSelectedEstrutura,
    marcasInversorDisponiveis,
    hasActiveFilters,
    handleClearFilters,
    filteredKits,
  }
}
