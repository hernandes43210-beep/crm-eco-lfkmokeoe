import { useMemo, useState } from 'react'
import type { Kit } from '@/types/crm'
import { extrairComponentesKit } from '@/lib/quickKitUtils'

export interface FaixaPotenciaOption {
  id: string
  label: string
  min: number
  max: number
}

export const FAIXAS_POTENCIA_KITS: readonly FaixaPotenciaOption[] = [
  { id: 'ate_5', label: 'Até 5 kWp', min: 0, max: 5 },
  { id: '5_10', label: '5 a 10 kWp', min: 5.0001, max: 10 },
  { id: '10_20', label: '10 a 20 kWp', min: 10.0001, max: 20 },
  { id: '20_plus', label: '20+ kWp', min: 20.0001, max: Infinity },
]

export const TIPOS_ESTRUTURA_FILTRO = [
  { value: 'solo_monoposte', label: 'Solo monoposte' },
  { value: 'mini_trilho', label: 'Mini trilho' },
  { value: 'fibrocimento', label: 'Fibrocimento' },
] as const

/**
 * Obtém a marca do inversor do kit (priorizando kit.marca_inversor ou extraindo dos componentes)
 */
export function getKitMarcaInversor(k: Kit): string {
  if (k.marca_inversor && k.marca_inversor.trim()) {
    return k.marca_inversor.trim()
  }
  const comp = extrairComponentesKit(k)
  return (comp.marcaInversor || '').trim()
}

/**
 * Obtém o tipo de estrutura do kit (campo ou inferido de descrição/nome)
 */
export function getKitEstrutura(k: Kit): string {
  if (k.tipo_estrutura) return k.tipo_estrutura

  const desc = k.descricao || ''
  const nome = k.nome || ''

  if (/monoposte|solo.*monoposte/i.test(desc)) return 'solo_monoposte'
  if (/mini\s*trilho/i.test(desc)) return 'mini_trilho'
  if (/fibrocimento/i.test(desc)) return 'fibrocimento'
  if (/solo/i.test(nome)) return 'solo_monoposte'

  return ''
}

export interface UseKitFiltersOptions {
  includeCategoria?: boolean
}

export function useKitFilters(kits: Kit[], options?: UseKitFiltersOptions) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState<string>('all')
  const [selectedMarcaInversor, setSelectedMarcaInversor] = useState<string>('all')
  const [selectedFaixaPotencia, setSelectedFaixaPotencia] = useState<string>('all')
  const [selectedEstrutura, setSelectedEstrutura] = useState<string>('all')

  // Marcas de inversor únicas presentes nos kits
  const marcasInversorDisponiveis = useMemo(() => {
    const setMarcas = new Set<string>()

    kits.forEach((k) => {
      const marca = getKitMarcaInversor(k)
      if (marca) {
        setMarcas.add(marca)
      }
    })

    return Array.from(setMarcas).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }),
    )
  }, [kits])

  const hasActiveFilters =
    selectedMarcaInversor !== 'all' ||
    selectedFaixaPotencia !== 'all' ||
    selectedEstrutura !== 'all' ||
    (options?.includeCategoria ? selectedCategoria !== 'all' : false) ||
    searchTerm.trim().length > 0

  const handleClearFilters = () => {
    setSelectedMarcaInversor('all')
    setSelectedFaixaPotencia('all')
    setSelectedEstrutura('all')
    if (options?.includeCategoria) {
      setSelectedCategoria('all')
    }
    setSearchTerm('')
  }

  const filteredKits = useMemo(() => {
    return kits.filter((kit) => {
      // 1. Categoria (se habilitada)
      if (options?.includeCategoria && selectedCategoria !== 'all') {
        if (kit.categoria !== selectedCategoria) return false
      }

      // 2. Marca do Inversor
      if (selectedMarcaInversor !== 'all') {
        const marca = getKitMarcaInversor(kit)
        const matchesMarca =
          marca.toLowerCase() === selectedMarcaInversor.toLowerCase() ||
          marca.toLowerCase().includes(selectedMarcaInversor.toLowerCase())
        if (!matchesMarca) return false
      }

      // 3. Faixa de Potência
      if (selectedFaixaPotencia !== 'all') {
        const faixa = FAIXAS_POTENCIA_KITS.find((f) => f.id === selectedFaixaPotencia)
        if (faixa) {
          const pot = Number(kit.potencia_kw) || 0
          if (faixa.id === 'ate_5') {
            if (pot > faixa.max) return false
          } else {
            if (pot < faixa.min || pot > faixa.max) return false
          }
        }
      }

      // 4. Tipo de Estrutura
      if (selectedEstrutura !== 'all') {
        const estKit = getKitEstrutura(kit)
        if (estKit !== selectedEstrutura) return false
      }

      // 5. Busca por texto
      const term = searchTerm.toLowerCase().trim()
      if (term) {
        const matchesTerm =
          kit.nome.toLowerCase().includes(term) ||
          (kit.fabricante && kit.fabricante.toLowerCase().includes(term)) ||
          (kit.descricao && kit.descricao.toLowerCase().includes(term)) ||
          (kit.marca_painel && kit.marca_painel.toLowerCase().includes(term)) ||
          (kit.marca_inversor && kit.marca_inversor.toLowerCase().includes(term)) ||
          (kit.tipo_estrutura && kit.tipo_estrutura.toLowerCase().includes(term)) ||
          `${kit.potencia_kw}`.includes(term)
        if (!matchesTerm) return false
      }

      return true
    })
  }, [
    kits,
    selectedCategoria,
    selectedMarcaInversor,
    selectedFaixaPotencia,
    selectedEstrutura,
    searchTerm,
    options?.includeCategoria,
  ])

  return {
    searchTerm,
    setSearchTerm,
    selectedCategoria,
    setSelectedCategoria,
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
