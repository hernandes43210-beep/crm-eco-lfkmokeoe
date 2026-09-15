import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useKitFilters,
  getKitMarcaInversor,
  getKitEstrutura,
  FAIXAS_POTENCIA_KITS,
} from './useKitFilters'
import type { Kit } from '@/types/crm'

const mockKits: Kit[] = [
  {
    id: 'k1',
    collectionId: 'kits_col',
    collectionName: 'kits',
    nome: 'Kit Solar 4.5 kWp — TSUN + Sungrow — Solo monoposte',
    potencia_kw: 4.5,
    fabricante: 'TSUN / Sungrow',
    marca_inversor: 'Sungrow',
    marca_painel: 'TSUN POWER',
    tipo_estrutura: 'solo_monoposte',
    categoria: 'Residencial',
    custo: 10000,
    margem: 30,
    preco_venda: 14285.71,
    descricao: '10x painéis e inversor Sungrow solo monoposte',
    created: '2025-01-01',
    updated: '2025-01-01',
  },
  {
    id: 'k2',
    collectionId: 'kits_col',
    collectionName: 'kits',
    nome: 'Kit Solar 7.5 kWp — Canadian + Deye — Mini trilho',
    potencia_kw: 7.5,
    fabricante: 'Canadian / Deye',
    marca_inversor: 'Deye',
    marca_painel: 'Canadian Solar',
    tipo_estrutura: 'mini_trilho',
    categoria: 'Residencial',
    custo: 15000,
    margem: 25,
    preco_venda: 20000,
    descricao: '12x painéis e inversor Deye mini trilho',
    created: '2025-01-01',
    updated: '2025-01-01',
  },
  {
    id: 'k3',
    collectionId: 'kits_col',
    collectionName: 'kits',
    nome: 'Kit Solar 15 kWp — JA Solar + Growatt — Fibrocimento',
    potencia_kw: 15.0,
    fabricante: 'JA Solar / Growatt',
    marca_inversor: 'Growatt',
    marca_painel: 'JA Solar',
    tipo_estrutura: 'fibrocimento',
    categoria: 'Comercial',
    custo: 30000,
    margem: 25,
    preco_venda: 40000,
    descricao: '24x painéis e inversor Growatt fibrocimento',
    created: '2025-01-01',
    updated: '2025-01-01',
  },
  {
    id: 'k4',
    collectionId: 'kits_col',
    collectionName: 'kits',
    nome: 'Kit Solar 25 kWp — Trina + Sungrow — Solo monoposte',
    potencia_kw: 25.0,
    fabricante: 'Trina / Sungrow',
    marca_inversor: 'Sungrow',
    marca_painel: 'Trina Solar',
    tipo_estrutura: 'solo_monoposte',
    categoria: 'Rural',
    custo: 50000,
    margem: 20,
    preco_venda: 62500,
    descricao: '40x painéis e inversor Sungrow 25kW solo',
    created: '2025-01-01',
    updated: '2025-01-01',
  },
]

describe('useKitFilters and kit filter utilities', () => {
  it('extrai marca do inversor e tipo de estrutura corretamente', () => {
    expect(getKitMarcaInversor(mockKits[0])).toBe('Sungrow')
    expect(getKitMarcaInversor(mockKits[1])).toBe('Deye')
    expect(getKitEstrutura(mockKits[0])).toBe('solo_monoposte')
    expect(getKitEstrutura(mockKits[1])).toBe('mini_trilho')
    expect(getKitEstrutura(mockKits[2])).toBe('fibrocimento')
  })

  it('infere estrutura da descrição quando kit.tipo_estrutura estiver ausente', () => {
    const kitSemEstrutura: Kit = {
      id: 'k9',
      collectionId: 'kits_col',
      collectionName: 'kits',
      nome: 'Kit Sem Campo',
      potencia_kw: 6.0,
      fabricante: 'Weg',
      custo: 12000,
      margem: 25,
      preco_venda: 16000,
      categoria: 'Residencial',
      descricao: 'Estrutura mini trilho inclusa para fixação',
      created: '2025-01-01',
      updated: '2025-01-01',
    }
    expect(getKitEstrutura(kitSemEstrutura)).toBe('mini_trilho')
  })

  it('lista todas as marcas de inversores sem repetição', () => {
    const { result } = renderHook(() => useKitFilters(mockKits))
    expect(result.current.marcasInversorDisponiveis).toEqual(['Deye', 'Growatt', 'Sungrow'])
  })

  it('filtra por marca do inversor', () => {
    const { result } = renderHook(() => useKitFilters(mockKits))

    act(() => {
      result.current.setSelectedMarcaInversor('Sungrow')
    })

    expect(result.current.filteredKits).toHaveLength(2)
    expect(result.current.filteredKits.map((k) => k.id)).toEqual(['k1', 'k4'])
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('filtra por faixas de potência: Até 5, 5–10, 10–20, 20+ kWp', () => {
    const { result } = renderHook(() => useKitFilters(mockKits))

    // Até 5 kWp (k1: 4.5 kWp)
    act(() => {
      result.current.setSelectedFaixaPotencia('ate_5')
    })
    expect(result.current.filteredKits).toHaveLength(1)
    expect(result.current.filteredKits[0].id).toBe('k1')

    // 5 a 10 kWp (k2: 7.5 kWp)
    act(() => {
      result.current.setSelectedFaixaPotencia('5_10')
    })
    expect(result.current.filteredKits).toHaveLength(1)
    expect(result.current.filteredKits[0].id).toBe('k2')

    // 10 a 20 kWp (k3: 15 kWp)
    act(() => {
      result.current.setSelectedFaixaPotencia('10_20')
    })
    expect(result.current.filteredKits).toHaveLength(1)
    expect(result.current.filteredKits[0].id).toBe('k3')

    // 20+ kWp (k4: 25 kWp)
    act(() => {
      result.current.setSelectedFaixaPotencia('20_plus')
    })
    expect(result.current.filteredKits).toHaveLength(1)
    expect(result.current.filteredKits[0].id).toBe('k4')
  })

  it('filtra por tipo de estrutura', () => {
    const { result } = renderHook(() => useKitFilters(mockKits))

    act(() => {
      result.current.setSelectedEstrutura('solo_monoposte')
    })

    expect(result.current.filteredKits).toHaveLength(2)
    expect(result.current.filteredKits.map((k) => k.id)).toEqual(['k1', 'k4'])

    act(() => {
      result.current.setSelectedEstrutura('fibrocimento')
    })
    expect(result.current.filteredKits).toHaveLength(1)
    expect(result.current.filteredKits[0].id).toBe('k3')
  })

  it('combina múltiplos filtros: marca + faixa + estrutura + busca por texto', () => {
    const { result } = renderHook(() => useKitFilters(mockKits))

    act(() => {
      result.current.setSelectedMarcaInversor('Sungrow')
      result.current.setSelectedEstrutura('solo_monoposte')
      result.current.setSelectedFaixaPotencia('ate_5')
    })

    // Deve bater apenas k1 (4.5 kWp, Sungrow, Solo)
    expect(result.current.filteredKits).toHaveLength(1)
    expect(result.current.filteredKits[0].id).toBe('k1')

    // Adiciona busca textual combinada
    act(() => {
      result.current.setSearchTerm('TSUN')
    })
    expect(result.current.filteredKits).toHaveLength(1)

    // Busca textual que não existe
    act(() => {
      result.current.setSearchTerm('Inexistente')
    })
    expect(result.current.filteredKits).toHaveLength(0)

    // Limpa filtros
    act(() => {
      result.current.handleClearFilters()
    })
    expect(result.current.hasActiveFilters).toBe(false)
    expect(result.current.filteredKits).toHaveLength(4)
    expect(result.current.searchTerm).toBe('')
    expect(result.current.selectedMarcaInversor).toBe('all')
    expect(result.current.selectedFaixaPotencia).toBe('all')
    expect(result.current.selectedEstrutura).toBe('all')
  })

  it('filtra por categoria quando options.includeCategoria for ativado', () => {
    const { result } = renderHook(() => useKitFilters(mockKits, { includeCategoria: true }))

    act(() => {
      result.current.setSelectedCategoria('Comercial')
    })

    expect(result.current.filteredKits).toHaveLength(1)
    expect(result.current.filteredKits[0].id).toBe('k3')

    act(() => {
      result.current.handleClearFilters()
    })
    expect(result.current.selectedCategoria).toBe('all')
    expect(result.current.filteredKits).toHaveLength(4)
  })
})
