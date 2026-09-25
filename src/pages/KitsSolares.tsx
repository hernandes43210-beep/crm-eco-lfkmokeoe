import React, { useState, useEffect, useMemo } from 'react'
import {
  Boxes,
  Plus,
  Edit3,
  Copy,
  Trash2,
  Sun,
  Zap,
  Check,
  AlertCircle,
  MoreVertical,
  Building,
  Home,
  Tractor,
  Loader2,
  Sparkles,
  Calculator,
  SlidersHorizontal,
  Search,
  X,
  Share2,
  Image as ImageIcon,
} from 'lucide-react'
import { KitMarketingModal } from '@/components/KitMarketingModal'
import { KitIaImageModal } from '@/components/KitIaImageModal'
import { SaudacaoModal } from '@/components/SaudacaoModal'
import { GeminiImageModal } from '@/components/GeminiImageModal'
import { KitsService } from '@/services/kits'
import type { Kit, KitCategoria, KitTipoEstrutura } from '@/types/crm'
import useRealtime from '@/hooks/use-realtime'
import { useAuth } from '@/context/AuthContext'
import { toPortugueseErrorMessage } from '@/lib/errors'
import { formatBRL } from '@/lib/solarUtils'
import { calcularMargemReal } from '@/utils/marginUtils'
import {
  POTENCIAS_COMUNS_PAINEIS,
  POTENCIAS_COMUNS_INVERSORES,
  MARCAS_PAINEIS_SUGERIDAS,
  MARCAS_INVERSORES_SUGERIDAS,
  TIPOS_ESTRUTURA_OPCOES,
  calcularKwpPrePronto,
  sugerirNomeKit,
  sugerirFabricanteKit,
  sugerirDescricaoTecnica,
  gerarNomeKitClonado,
  extrairComponentesKit,
  formatarRotuloStringBox,
  formatarRotuloEstrutura,
  formatarPotenciaW,
  formatarPotenciaKw,
  aplicarEstruturaAoNomeKit,
} from '@/lib/quickKitUtils'
import { useKitFilters, getKitEstrutura } from '@/hooks/useKitFilters'
import { KitFilterBar } from '@/components/KitFilterBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/hooks/use-toast'

const CATEGORIAS: KitCategoria[] = ['Residencial', 'Comercial', 'Rural']

export default function KitsSolares() {
  const { isAdmin } = useAuth()
  const [kits, setKits] = useState<Kit[]>([])
  const [loading, setLoading] = useState(true)

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingKit, setEditingKit] = useState<Kit | null>(null)
  const [isCloning, setIsCloning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorBanner, setErrorBanner] = useState('')

  // Marketing modal state
  const [marketingKit, setMarketingKit] = useState<Kit | null>(null)
  const [isMarketingModalOpen, setIsMarketingModalOpen] = useState(false)
  const [iaImageKit, setIaImageKit] = useState<Kit | null>(null)
  const [isIaImageModalOpen, setIsIaImageModalOpen] = useState(false)
  const [isSaudacaoModalOpen, setIsSaudacaoModalOpen] = useState(false)
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false)

  // Form Fields
  const [nome, setNome] = useState('')
  const [fabricante, setFabricante] = useState('')
  const [potenciaKw, setPotenciaKw] = useState<number | string>(6.3)
  const [categoria, setCategoria] = useState<KitCategoria>('Residencial')
  const [custo, setCusto] = useState<number | string>(15000)
  const [margem, setMargem] = useState<number | string>(30)
  const [precoVenda, setPrecoVenda] = useState<number | string>('')
  const [descricao, setDescricao] = useState('')
  const [stringBox, setStringBox] = useState<string>('')
  const [tipoEstrutura, setTipoEstrutura] = useState<string>('solo_monoposte')

  // Modo montagem pré-pronta / rápida
  const [isQuickMode, setIsQuickMode] = useState(true)
  const [qtdPaineis, setQtdPaineis] = useState<number | string>(10)
  const [potenciaPainelW, setPotenciaPainelW] = useState<number | string>(630)
  const [isCustomPotenciaW, setIsCustomPotenciaW] = useState(false)
  const [marcaPaineis, setMarcaPaineis] = useState('TSUN POWER')
  const [isCustomMarcaPainel, setIsCustomMarcaPainel] = useState(false)
  const [qtdInversores, setQtdInversores] = useState<number | string>(1)
  const [marcaInversor, setMarcaInversor] = useState('Sungrow')
  const [isCustomMarcaInversor, setIsCustomMarcaInversor] = useState(false)
  const [potenciaInversorKw, setPotenciaInversorKw] = useState<number | string>(7.5)
  const [isCustomPotenciaInversorKw, setIsCustomPotenciaInversorKw] = useState(false)

  // Delete modal state
  const [deleteKitId, setDeleteKitId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filtros de busca, categoria, marca de inversor, faixa de potência e estrutura via hook compartilhado
  const {
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
  } = useKitFilters(kits, { includeCategoria: true })

  const fetchKits = async () => {
    try {
      const data = await KitsService.getKits()
      setKits(data)
    } catch (err) {
      console.error('Error loading kits:', err)
      toast({
        title: 'Erro ao carregar kits',
        description: toPortugueseErrorMessage(err, 'Não foi possível carregar o catálogo de kits.'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKits()
  }, [])

  // Real-time subscription
  useRealtime<Kit>('kits', () => {
    fetchKits()
  })

  // Cálculo automático de potência pico (kWp) em tempo real da montagem pré-pronta
  const quickKwpInfo = useMemo(() => {
    return calcularKwpPrePronto(qtdPaineis, potenciaPainelW)
  }, [qtdPaineis, potenciaPainelW])

  // Sugestão automática de nome e fabricante a partir dos componentes pré-prontos
  const suggestedName = useMemo(() => {
    return sugerirNomeKit({
      kwp: quickKwpInfo.kwp,
      marcaPaineis,
      marcaInversor,
      qtdPaineis,
      potenciaPainelW,
      tipoEstrutura,
    })
  }, [quickKwpInfo.kwp, marcaPaineis, marcaInversor, qtdPaineis, potenciaPainelW, tipoEstrutura])

  const suggestedFab = useMemo(() => {
    return sugerirFabricanteKit(marcaPaineis, marcaInversor)
  }, [marcaPaineis, marcaInversor])

  // Handlers bidirecionais e cálculo em tempo real entre custo, margem e preço de venda
  const liveCalculatedPriceFromMargin = React.useMemo(() => {
    const numCusto = Number(custo) || 0
    const numMargem = Number(margem) || 0

    if (numCusto <= 0 || numMargem < 0 || numMargem >= 100) {
      return 0
    }
    const calculated = numCusto / (1 - numMargem / 100)
    return Math.round(calculated * 100) / 100
  }, [custo, margem])

  // Preço de venda efetivo: valor digitado no campo precoVenda se presente, senão calculado via markup
  const livePriceCalculated = React.useMemo(() => {
    const numVenda = parseFloat(String(precoVenda))
    if (!isNaN(numVenda) && numVenda > 0) {
      return Math.round(numVenda * 100) / 100
    }
    return liveCalculatedPriceFromMargin
  }, [precoVenda, liveCalculatedPriceFromMargin])

  const handleCustoChange = (val: string) => {
    setCusto(val)
    const numC = parseFloat(val) || 0
    const numM = parseFloat(String(margem)) || 0
    if (numC > 0 && numM >= 0 && numM < 100) {
      const calcVenda = Math.round((numC / (1 - numM / 100)) * 100) / 100
      setPrecoVenda(calcVenda)
    }
  }

  const handleMargemChange = (val: string) => {
    setMargem(val)
    const numM = parseFloat(val) || 0
    const numC = parseFloat(String(custo)) || 0
    if (numC > 0 && numM >= 0 && numM < 100) {
      const calcVenda = Math.round((numC / (1 - numM / 100)) * 100) / 100
      setPrecoVenda(calcVenda)
    }
  }

  const handlePrecoVendaChange = (val: string) => {
    setPrecoVenda(val)
    const numV = parseFloat(val) || 0
    const numC = parseFloat(String(custo)) || 0
    if (numV > 0 && numC > 0 && numV > numC) {
      // margem = (1 - custo / preco_venda) * 100
      const novaMargem = Math.round(((numV - numC) / numV) * 1000) / 10
      if (novaMargem >= 0 && novaMargem < 100) {
        setMargem(novaMargem)
      }
    }
  }

  // Sincroniza campos do kit quando estiver no modo pré-pronto (criação nova padrão, não clonagem)
  useEffect(() => {
    if (isQuickMode && !editingKit && !isCloning) {
      if (quickKwpInfo.kwp > 0) {
        setPotenciaKw(quickKwpInfo.kwp)
      }
      if (suggestedName) {
        setNome(suggestedName)
      }
      if (suggestedFab) {
        setFabricante(suggestedFab)
      }
      const descGerada = sugerirDescricaoTecnica({
        qtdPaineis,
        potenciaPainelW,
        marcaPaineis,
        qtdInversores,
        marcaInversor,
        potenciaInversorKw,
        kwp: quickKwpInfo.kwp,
        stringBox,
        tipoEstrutura,
      })
      setDescricao(descGerada)
    }
  }, [
    isQuickMode,
    editingKit,
    isCloning,
    quickKwpInfo.kwp,
    suggestedName,
    suggestedFab,
    qtdPaineis,
    potenciaPainelW,
    marcaPaineis,
    qtdInversores,
    marcaInversor,
    potenciaInversorKw,
    stringBox,
    tipoEstrutura,
  ])

  const openCreateModal = () => {
    setEditingKit(null)
    setIsCloning(false)
    setIsQuickMode(true)
    setQtdPaineis(10)
    setPotenciaPainelW(630)
    setIsCustomPotenciaW(false)
    setMarcaPaineis('TSUN POWER')
    setIsCustomMarcaPainel(false)
    setQtdInversores(1)
    setMarcaInversor('Sungrow')
    setIsCustomMarcaInversor(false)
    setPotenciaInversorKw(7.5)
    setIsCustomPotenciaInversorKw(false)
    setStringBox('')
    setTipoEstrutura('solo_monoposte')

    const initialKwp = calcularKwpPrePronto(10, 630).kwp
    setNome('Kit Solar 6,3 kWp — TSUN POWER + Sungrow — Solo monoposte')
    setFabricante('TSUN POWER / Sungrow')
    setPotenciaKw(initialKwp)
    setCategoria('Residencial')
    setCusto(14000)
    setMargem(30)
    const initialVenda = Math.round((14000 / (1 - 0.3)) * 100) / 100
    setPrecoVenda(initialVenda)
    setDescricao(
      sugerirDescricaoTecnica({
        qtdPaineis: 10,
        potenciaPainelW: 630,
        marcaPaineis: 'TSUN POWER',
        qtdInversores: 1,
        marcaInversor: 'Sungrow',
        potenciaInversorKw: 7.5,
        kwp: initialKwp,
        stringBox: '',
        tipoEstrutura: 'solo_monoposte',
      }),
    )
    setErrorBanner('')
    setIsModalOpen(true)
  }

  const openEditModal = (kit: Kit) => {
    setEditingKit(kit)
    setIsCloning(false)
    // Na edição, ativa montagem técnica completa por padrão para permitir editar todos os componentes
    setIsQuickMode(true)
    setNome(kit.nome)
    setFabricante(kit.fabricante || '')
    setPotenciaKw(kit.potencia_kw)
    setCategoria(kit.categoria)
    setCusto(kit.custo)
    setMargem(kit.margem)
    const vendaInicial =
      kit.preco_venda ||
      (kit.custo && kit.margem < 100
        ? Math.round((kit.custo / (1 - kit.margem / 100)) * 100) / 100
        : '')
    setPrecoVenda(vendaInicial)
    setDescricao(kit.descricao || '')
    setStringBox(kit.string_box || '')
    setTipoEstrutura(kit.tipo_estrutura || '')

    // Extrair componentes para pré-preenchimento
    const componentes = extrairComponentesKit(kit)
    const qPaineis = componentes.qtdPaineis || 10
    const potP = kit.potencia_painel_w || componentes.potenciaPainelW || 630
    setQtdPaineis(qPaineis)
    setPotenciaPainelW(potP)
    setIsCustomPotenciaW(!(POTENCIAS_COMUNS_PAINEIS as readonly number[]).includes(Number(potP)))

    const mPainel = kit.marca_painel || componentes.marcaPaineis || 'TSUN POWER'
    setMarcaPaineis(mPainel)
    setIsCustomMarcaPainel(!(MARCAS_PAINEIS_SUGERIDAS as readonly string[]).includes(mPainel))

    const qInv = componentes.qtdInversores || 1
    setQtdInversores(qInv)

    const mInv = kit.marca_inversor || componentes.marcaInversor || 'Sungrow'
    setMarcaInversor(mInv)
    setIsCustomMarcaInversor(!(MARCAS_INVERSORES_SUGERIDAS as readonly string[]).includes(mInv))

    const potInvKwVal =
      kit.potencia_inversor_kw ?? componentes.potenciaInversorKw ?? (kit.potencia_kw || 7.5)
    setPotenciaInversorKw(potInvKwVal)
    setIsCustomPotenciaInversorKw(
      !(POTENCIAS_COMUNS_INVERSORES as readonly number[]).includes(Number(potInvKwVal)),
    )

    const estrFinal = kit.tipo_estrutura || componentes.tipoEstrutura || 'solo_monoposte'
    setTipoEstrutura(estrFinal)

    const sbFinal = kit.string_box || componentes.stringBox || ''
    setStringBox(sbFinal)

    setErrorBanner('')
    setIsModalOpen(true)
  }
  /**
   * Abre o formulário clonando todos os dados do kit informado.
   * Não altera o kit original ao salvar; abre o formulário pronto para edição.
   */
  const handleCloneKit = (kit: Kit) => {
    setEditingKit(null) // garante que criará um NOVO kit
    setIsCloning(true)

    // Analisa se o kit tem itens/quantidades compatíveis com a montagem pré-pronta
    const componentes = extrairComponentesKit(kit)

    // Ajusta estado dos componentes pré-prontos
    setQtdPaineis(componentes.qtdPaineis)
    setPotenciaPainelW(componentes.potenciaPainelW)
    const isCustomW = !(POTENCIAS_COMUNS_PAINEIS as readonly number[]).includes(
      componentes.potenciaPainelW,
    )
    setIsCustomPotenciaW(isCustomW)
    const mPainel = kit.marca_painel || componentes.marcaPaineis || 'TSUN POWER'
    setMarcaPaineis(mPainel)
    setIsCustomMarcaPainel(!(MARCAS_PAINEIS_SUGERIDAS as readonly string[]).includes(mPainel))

    setQtdInversores(componentes.qtdInversores)
    const mInv = kit.marca_inversor || componentes.marcaInversor || 'Sungrow'
    setMarcaInversor(mInv)
    setIsCustomMarcaInversor(!(MARCAS_INVERSORES_SUGERIDAS as readonly string[]).includes(mInv))
    const clonPotInvKw =
      kit.potencia_inversor_kw ?? componentes.potenciaInversorKw ?? (kit.potencia_kw || 7.5)
    setPotenciaInversorKw(clonPotInvKw)
    setIsCustomPotenciaInversorKw(
      !(POTENCIAS_COMUNS_INVERSORES as readonly number[]).includes(Number(clonPotInvKw)),
    )

    setStringBox(kit.string_box || componentes.stringBox || '')
    setTipoEstrutura(kit.tipo_estrutura || componentes.tipoEstrutura || 'solo_monoposte')

    // Se o kit puder ser mapeado em pré-pronto, abre em modo pré-pronto; caso contrário modo completo
    setIsQuickMode(componentes.isPrePronto)

    // Campos preenchidos duplicados do kit original com sufixo "— Cópia"
    const novoNome = gerarNomeKitClonado(kit.nome)
    setNome(novoNome)
    setFabricante(kit.fabricante || '')
    setPotenciaKw(kit.potencia_kw)
    setCategoria(kit.categoria)
    setCusto(kit.custo)
    setMargem(kit.margem)
    const clonVenda =
      kit.preco_venda ||
      (kit.custo && kit.margem < 100
        ? Math.round((kit.custo / (1 - kit.margem / 100)) * 100) / 100
        : '')
    setPrecoVenda(clonVenda)
    setDescricao(kit.descricao || '')
    setErrorBanner('')
    setIsModalOpen(true)

    toast({
      title: 'Kit clonado para edição',
      description: `Editando "${novoNome}". Altere os campos e clique em Salvar para criar o novo kit.`,
    })
  }

  const handleSaveKit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBanner('')

    if (!nome.trim() || Number(potenciaKw) <= 0 || Number(custo) <= 0) {
      setErrorBanner('Por favor, preencha os campos obrigatórios com valores válidos.')
      return
    }

    if (Number(margem) >= 100 || Number(margem) < 0) {
      setErrorBanner('A margem de lucro deve ser entre 0% e 99%.')
      return
    }

    const precoVendaFinal = Number(livePriceCalculated) || Number(precoVenda) || 0
    if (precoVendaFinal <= 0) {
      setErrorBanner('O preço de venda do kit deve ser maior que zero.')
      return
    }

    try {
      setSubmitting(true)

      const payload: Partial<Kit> = {
        nome: nome.trim(),
        fabricante: fabricante.trim(),
        potencia_kw: Number(potenciaKw),
        categoria,
        custo: Number(custo),
        margem: Number(margem),
        preco_venda: precoVendaFinal,
        descricao: descricao.trim(),
        string_box: (stringBox as any) || '',
        marca_painel: marcaPaineis.trim(),
        marca_inversor: marcaInversor.trim(),
        potencia_painel_w: Number(potenciaPainelW) || undefined,
        potencia_inversor_kw: Number(potenciaInversorKw) || undefined,
        tipo_estrutura: (tipoEstrutura as KitTipoEstrutura) || '',
      }

      if (editingKit) {
        await KitsService.updateKit(editingKit.id, payload)
        toast({
          title: 'Kit solar atualizado',
          description: 'Alterações salvas com sucesso no catálogo.',
        })
      } else {
        await KitsService.createKit(payload)
        toast({
          title: isCloning ? 'Kit clonado com sucesso!' : 'Kit solar cadastrado',
          description: isCloning
            ? `O kit "${payload.nome}" foi criado como novo registro no catálogo.`
            : 'Novo kit disponível para a equipe de vendas.',
        })
      }

      setIsCloning(false)
      setIsModalOpen(false)
      fetchKits()
    } catch (err: unknown) {
      console.error('Error saving kit:', err)
      const msg = toPortugueseErrorMessage(err, 'Falha ao salvar kit solar. Verifique os dados.')
      setErrorBanner(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteKit = async () => {
    if (!deleteKitId) return
    try {
      setIsDeleting(true)
      await KitsService.deleteKit(deleteKitId)
      toast({
        title: 'Kit removido',
        description: 'O kit foi excluído do catálogo.',
      })
      setDeleteKitId(null)
      fetchKits()
    } catch (err) {
      console.error('Error deleting kit:', err)
      toast({
        title: 'Erro ao excluir kit',
        description: toPortugueseErrorMessage(err, 'Apenas administradores podem excluir kits.'),
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getCategoryIcon = (cat: KitCategoria) => {
    switch (cat) {
      case 'Residencial':
        return <Home className="w-4 h-4 text-emerald-600" />
      case 'Comercial':
        return <Building className="w-4 h-4 text-blue-600" />
      case 'Rural':
        return <Tractor className="w-4 h-4 text-amber-600" />
    }
  }

  return (
    <div className="space-y-6 select-none animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Catálogo de Kits Solares
            </h2>
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold gap-1 hover:bg-amber-100">
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              <span>Precificação Dinâmica</span>
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kits solares pré-prontos com cálculo automático de preço de venda via markup de custo e
            margem
          </p>
        </div>

        {/* Ações do Topo: Gerar imagem com IA + Arte de Saudação com Mascote + Novo Kit */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
          <Button
            type="button"
            onClick={() => setIsGeminiModalOpen(true)}
            size="default"
            className="bg-[#0A192F] hover:bg-[#163868] text-amber-300 hover:text-amber-200 border border-amber-400/40 font-bold gap-2 h-10 px-4 rounded-lg shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            title="Gerar foto fotorrealista de instalação solar com IA do Gemini"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Gerar imagem com IA</span>
            <Badge className="bg-purple-600 text-white text-[10px] px-1.5 py-0 border-0">
              Gemini
            </Badge>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsSaudacaoModalOpen(true)}
            size="default"
            className="border-amber-300/80 bg-amber-50/70 hover:bg-amber-100/90 text-amber-950 font-bold gap-2 h-10 px-4 rounded-lg shadow-2xs transition-all hover:scale-[1.02] active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Arte de Saudação</span>
            <Badge className="bg-amber-200/80 text-amber-900 border-amber-300 text-[10px] px-1.5 py-0">
              Mascote
            </Badge>
          </Button>

          <Button
            onClick={openCreateModal}
            size="default"
            className="bg-[#0B7A5B] hover:bg-[#095C44] text-white font-bold shadow-md shadow-[#0B7A5B]/30 gap-2 h-10 px-5 rounded-lg transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Kit</span>
          </Button>
        </div>
      </div>

      {/* Barra Completa de Filtros Compartilhada */}
      <KitFilterBar
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        selectedMarcaInversor={selectedMarcaInversor}
        onMarcaInversorChange={setSelectedMarcaInversor}
        marcasInversorDisponiveis={marcasInversorDisponiveis}
        selectedFaixaPotencia={selectedFaixaPotencia}
        onFaixaPotenciaChange={setSelectedFaixaPotencia}
        selectedEstrutura={selectedEstrutura}
        onEstruturaChange={setSelectedEstrutura}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        totalKits={kits.length}
        filteredCount={filteredKits.length}
        selectedCategoria={selectedCategoria}
        onCategoriaChange={setSelectedCategoria}
        categoriasList={CATEGORIAS}
      />
      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-[#0B7A5B] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm">Carregando catálogo de kits...</p>
        </div>
      ) : kits.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum kit cadastrado</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Cadastre os kits solares padrão para agilizar as propostas comerciais da equipe.
          </p>
          <Button
            onClick={openCreateModal}
            className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Primeiro Kit</span>
          </Button>
        </div>
      ) : filteredKits.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">Nenhum kit encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 mb-3">
            Nenhum kit solar corresponde aos filtros aplicados.
          </p>
          <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-xs">
            Limpar filtros
          </Button>
        </div>
      ) : (
        /* Responsive Grid of Kit Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredKits.map((kit) => (
            <div
              key={kit.id}
              className="card-lift bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 p-5 flex flex-col justify-between transition-all group"
            >
              <div>
                {/* Header of Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
                      <Sun className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {kit.fabricante || 'Fabricante Padrão'}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-[#0B7A5B] transition-colors leading-tight">
                        {kit.nome}
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 -mr-1.5 -mt-1">
                    {/* Botão Gerar Foto de Marketing direto no header do card */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setMarketingKit(kit)
                        setIsMarketingModalOpen(true)
                      }}
                      title="Gerar foto de marketing deste kit"
                      className="h-7 w-7 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span className="sr-only">Gerar foto de marketing</span>
                    </Button>

                    {/* Botão Clonar direto no card para fácil acesso por qualquer usuário */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCloneKit(kit)}
                      title="Clonar este kit"
                      className="h-7 w-7 text-slate-400 hover:text-[#0B7A5B] hover:bg-emerald-50 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="sr-only">Clonar</span>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-slate-700"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => {
                            setIaImageKit(kit)
                            setIsIaImageModalOpen(true)
                          }}
                          className="font-medium text-slate-800"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-2 text-amber-500" />
                          <span>Gerar imagem do kit (IA)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setMarketingKit(kit)
                            setIsMarketingModalOpen(true)
                          }}
                          className="font-medium text-slate-800"
                        >
                          <ImageIcon className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                          <span>Foto de marketing</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCloneKit(kit)}>
                          <Copy className="w-3.5 h-3.5 mr-2 text-[#0B7A5B]" />
                          <span>Clonar kit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditModal(kit)}>
                          <Edit3 className="w-3.5 h-3.5 mr-2" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem
                            onClick={() => setDeleteKitId(kit.id)}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            <span>Excluir</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>{' '}
                </div>

                {/* Potência & Categoria Badges */}
                <div className="flex items-center flex-wrap gap-2 mt-3.5">
                  <Badge
                    variant="outline"
                    className="bg-slate-50 border-slate-200 text-xs font-semibold gap-1 text-slate-700"
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>{kit.potencia_kw} kWp</span>
                  </Badge>

                  {(kit.potencia_painel_w || extrairComponentesKit(kit).potenciaPainelW > 0) && (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 border-emerald-200 text-emerald-800 text-[11px] font-semibold gap-1"
                    >
                      <span>
                        Painel{' '}
                        {formatarPotenciaW(
                          kit.potencia_painel_w || extrairComponentesKit(kit).potenciaPainelW,
                          'W',
                        )}
                      </span>
                    </Badge>
                  )}

                  {(kit.potencia_inversor_kw || extrairComponentesKit(kit).potenciaInversorKw) && (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 border-amber-200 text-amber-900 text-[11px] font-semibold gap-1"
                    >
                      <span>
                        Inversor{' '}
                        {formatarPotenciaKw(
                          kit.potencia_inversor_kw || extrairComponentesKit(kit).potenciaInversorKw,
                        )}
                      </span>
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="bg-slate-50 border-slate-200 text-xs font-medium gap-1 text-slate-600"
                  >
                    {getCategoryIcon(kit.categoria)}
                    <span>{kit.categoria}</span>
                  </Badge>

                  {kit.string_box && (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 border-amber-300 text-amber-900 text-xs font-semibold gap-1"
                    >
                      <Boxes className="w-3 h-3 text-amber-600" />
                      <span>{formatarRotuloStringBox(kit.string_box)}</span>
                    </Badge>
                  )}

                  {(kit.tipo_estrutura ||
                    (kit.descricao && /solo.*monoposte|monoposte/i.test(kit.descricao)
                      ? 'solo_monoposte'
                      : kit.descricao && /mini\s*trilho/i.test(kit.descricao)
                        ? 'mini_trilho'
                        : kit.descricao && /fibrocimento/i.test(kit.descricao)
                          ? 'fibrocimento'
                          : kit.nome && /solo/i.test(kit.nome)
                            ? 'solo_monoposte'
                            : null)) && (
                    <Badge
                      variant="outline"
                      className="bg-blue-50 border-blue-200 text-blue-800 text-[11px] font-medium"
                    >
                      {formatarRotuloEstrutura(
                        kit.tipo_estrutura ||
                          (kit.descricao && /solo.*monoposte|monoposte/i.test(kit.descricao)
                            ? 'solo_monoposte'
                            : kit.descricao && /mini\s*trilho/i.test(kit.descricao)
                              ? 'mini_trilho'
                              : kit.descricao && /fibrocimento/i.test(kit.descricao)
                                ? 'fibrocimento'
                                : 'solo_monoposte'),
                      )}
                    </Badge>
                  )}
                </div>
                {/* Description */}
                <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                  {kit.descricao ||
                    'Kit completo incluindo módulos fotovoltaicos, inversor e estrutura de fixação.'}
                </p>
              </div>

              {/* Pricing Box at bottom */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Custo do Kit:</span>
                  <span className="font-semibold text-slate-700 font-mono-numbers">
                    {formatBRL(kit.custo)}
                  </span>
                </div>

                {(() => {
                  const mCard = calcularMargemReal(kit.preco_venda, kit.custo)
                  return (
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Margem Real:</span>
                      <span
                        className={`font-bold font-mono-numbers text-[11px] px-1.5 py-0.5 rounded border ${mCard.status.badgeClass}`}
                        title={`Lucro Bruto: ${formatBRL(mCard.margemReais)} (${mCard.margemPercentual.toLocaleString('pt-BR')}%)`}
                      >
                        {formatBRL(mCard.margemReais)} (
                        {mCard.margemPercentual.toLocaleString('pt-BR')}%)
                      </span>
                    </div>
                  )
                })()}

                <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Preço de Venda
                  </span>
                  <span className="text-xl font-extrabold text-[#0B7A5B] font-mono-numbers">
                    {formatBRL(kit.preco_venda)}
                  </span>
                </div>

                {/* Imagem salva no kit (se houver) com preview direto no card */}
                {kit.imagem_ia && (
                  <div className="pt-2">
                    <div
                      onClick={() => {
                        setIaImageKit(kit)
                        setIsIaImageModalOpen(true)
                      }}
                      className="relative h-28 rounded-lg overflow-hidden border border-slate-200 cursor-pointer group bg-slate-100"
                    >
                      <img
                        src={KitsService.getKitImageUrl(kit, '400x200')}
                        alt={`Kit ${kit.nome}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity flex items-end justify-between p-2">
                        <span className="text-[10px] font-semibold text-white flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          Imagem IA salva
                        </span>
                        <span className="text-[10px] text-slate-200 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-xs">
                          Ver / Baixar
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botões de Ação: Gerar Imagem do Kit (IA) + Foto de Marketing */}
                <div className="pt-2 grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIaImageKit(kit)
                      setIsIaImageModalOpen(true)
                    }}
                    className={`w-full h-8 text-xs font-semibold gap-1.5 transition-all ${
                      kit.imagem_ia
                        ? 'bg-emerald-50/70 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-amber-50/80 text-amber-900 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span className="truncate">
                      {kit.imagem_ia ? 'Ver imagem IA' : 'Gerar imagem kit'}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setMarketingKit(kit)
                      setIsMarketingModalOpen(true)
                    }}
                    className="w-full h-8 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200 gap-1.5 transition-all"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">Arte marketing</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Gerar Imagem Fotorrealista por IA do Kit Solar */}
      <KitIaImageModal
        kit={iaImageKit}
        open={isIaImageModalOpen}
        onOpenChange={(open) => {
          setIsIaImageModalOpen(open)
          if (!open) setIaImageKit(null)
        }}
        onKitUpdated={(updated) => {
          setKits((prev) => prev.map((k) => (k.id === updated.id ? { ...k, ...updated } : k)))
          setIaImageKit((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev))
        }}
      />

      {/* Modal de Gerar Foto de Marketing */}
      <KitMarketingModal
        kit={marketingKit}
        open={isMarketingModalOpen}
        onOpenChange={(open) => {
          setIsMarketingModalOpen(open)
          if (!open) setMarketingKit(null)
        }}
      />

      {/* Modal de Gerar Arte de Saudação com Mascote Centralizado */}
      <SaudacaoModal open={isSaudacaoModalOpen} onOpenChange={setIsSaudacaoModalOpen} />

      {/* Modal de Gerar Imagem Fotorrealista com IA Google Gemini & Galeria Institucional */}
      <GeminiImageModal open={isGeminiModalOpen} onOpenChange={setIsGeminiModalOpen} />

      {/* Kit Creation / Editing Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>
                  {editingKit
                    ? 'Editar Kit Solar'
                    : isCloning
                      ? 'Clonar Kit Solar'
                      : 'Novo Kit Solar'}
                </span>
                {isCloning && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold text-[11px] gap-1 hover:bg-amber-100">
                    <Copy className="w-3 h-3 text-amber-700" />
                    <span>Duplicação</span>
                  </Badge>
                )}
                {!editingKit && isQuickMode && (
                  <Badge className="bg-emerald-100 text-[#0B7A5B] border-emerald-300 font-semibold text-[11px] gap-1 hover:bg-emerald-100">
                    <Sparkles className="w-3 h-3 text-[#0B7A5B]" />
                    <span>Montagem Rápida</span>
                  </Badge>
                )}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              {isCloning
                ? 'Kit duplicado com sucesso. Edite os parâmetros desejados abaixo antes de salvar como um novo kit.'
                : isQuickMode
                  ? 'Informe painéis e inversores para calcular a potência pico (kWp) e sugerir o nome do kit automaticamente.'
                  : 'Insira as especificações técnicas, custo base e margem desejada. O preço de venda é calculado em tempo real.'}
            </DialogDescription>
          </DialogHeader>

          {/* Toggle entre Montagem Pré-Pronta e Modo Completo/Manual */}
          <div className="flex items-center justify-between p-1 bg-slate-100 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={() => setIsQuickMode(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                isQuickMode
                  ? 'bg-white text-[#0B7A5B] shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Montagem Pré-Pronta</span>
            </button>
            <button
              type="button"
              onClick={() => setIsQuickMode(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                !isQuickMode
                  ? 'bg-white text-[#0B7A5B] shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Manual / Completo</span>
            </button>
          </div>

          {errorBanner && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs animate-fade-in-up">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorBanner}</span>
            </div>
          )}

          <form onSubmit={handleSaveKit} className="space-y-4">
            {/* Bloco de Montagem Pré-Pronta */}
            {isQuickMode && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/70 via-white to-amber-50/40 border border-emerald-200/80 shadow-2xs space-y-3.5 animate-fade-in">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#0B7A5B] text-white flex items-center justify-center">
                      <Zap className="w-4 h-4 text-amber-300" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Configuração Rápida dos Componentes
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Cálculo automático de kWp por módulos e inversores
                      </p>
                    </div>
                  </div>

                  {/* Badge de Potência ao vivo */}
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                      Potência Pico
                    </span>
                    <span className="text-base font-extrabold text-[#0B7A5B] font-mono-numbers">
                      {quickKwpInfo.formattedBR} kWp
                    </span>
                  </div>
                </div>

                {/* Painéis: Quantidade e Potência */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>Módulos Fotovoltaicos (Painéis)</span>
                      <span className="text-emerald-700 text-[10px] font-normal">
                        ({qtdPaineis || 0} × {potenciaPainelW || 0}Wp = {quickKwpInfo.formattedBR}{' '}
                        kWp)
                      </span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomPotenciaW(!isCustomPotenciaW)
                      }}
                      className="text-[11px] text-[#0B7A5B] hover:underline font-medium"
                    >
                      {isCustomPotenciaW ? 'Potências comuns' : 'Valor personalizado'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Qtd Painéis */}
                    <div className="sm:col-span-3">
                      <Label
                        htmlFor="quickQtdPaineis"
                        className="text-[11px] text-slate-500 block mb-1"
                      >
                        Qtd. Painéis
                      </Label>
                      <Input
                        id="quickQtdPaineis"
                        type="number"
                        min="1"
                        step="1"
                        value={qtdPaineis}
                        onChange={(e) => setQtdPaineis(e.target.value)}
                        placeholder="Ex: 10"
                        className="h-9 text-sm font-semibold border-slate-200"
                      />
                    </div>

                    {/* Potência Painel */}
                    <div className="sm:col-span-4">
                      <Label
                        htmlFor="quickPotPainel"
                        className="text-[11px] text-slate-500 block mb-1"
                      >
                        Potência (Wp)
                      </Label>
                      {isCustomPotenciaW ? (
                        <Input
                          id="quickPotPainel"
                          type="number"
                          min="100"
                          step="5"
                          value={potenciaPainelW}
                          onChange={(e) => setPotenciaPainelW(e.target.value)}
                          placeholder="Ex: 580"
                          className="h-9 text-sm font-semibold border-slate-200"
                        />
                      ) : (
                        <select
                          id="quickPotPainel"
                          value={potenciaPainelW}
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setIsCustomPotenciaW(true)
                            } else {
                              setPotenciaPainelW(Number(e.target.value))
                            }
                          }}
                          className="w-full h-9 px-3 text-sm font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
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

                    {/* Marca Painéis */}
                    <div className="sm:col-span-5">
                      <Label
                        htmlFor="quickMarcaPaineis"
                        className="text-[11px] text-slate-500 block mb-1"
                      >
                        Marca dos Painéis
                      </Label>
                      {isCustomMarcaPainel ? (
                        <div className="flex gap-1.5">
                          <Input
                            id="quickMarcaPaineis"
                            value={marcaPaineis}
                            onChange={(e) => setMarcaPaineis(e.target.value)}
                            placeholder="Ex: OSDA, DMEGC, TSUN..."
                            className="h-9 text-sm border-slate-200"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCustomMarcaPainel(false)}
                            className="h-9 px-2 text-[11px]"
                          >
                            Lista
                          </Button>
                        </div>
                      ) : (
                        <select
                          id="quickMarcaPaineis"
                          value={marcaPaineis}
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setIsCustomMarcaPainel(true)
                            } else {
                              setMarcaPaineis(e.target.value)
                            }
                          }}
                          className="w-full h-9 px-3 text-xs sm:text-sm font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
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

                {/* Inversor: Quantidade, Potência e Marca/Modelo */}
                <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>Inversor Solar</span>
                      {potenciaInversorKw ? (
                        <span className="text-amber-700 text-[10px] font-normal">
                          ({formatarPotenciaKw(potenciaInversorKw)})
                        </span>
                      ) : null}
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomPotenciaInversorKw(!isCustomPotenciaInversorKw)
                      }}
                      className="text-[11px] text-[#0B7A5B] hover:underline font-medium"
                    >
                      {isCustomPotenciaInversorKw ? 'Potências comuns' : 'Potência personalizada'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-3">
                      <Label
                        htmlFor="quickQtdInv"
                        className="text-[11px] text-slate-500 block mb-1"
                      >
                        Qtd. Inversores
                      </Label>
                      <Input
                        id="quickQtdInv"
                        type="number"
                        min="1"
                        step="1"
                        value={qtdInversores}
                        onChange={(e) => setQtdInversores(e.target.value)}
                        placeholder="1"
                        className="h-9 text-sm font-semibold border-slate-200"
                      />
                    </div>

                    {/* Potência do Inversor em kW */}
                    <div className="sm:col-span-4">
                      <Label
                        htmlFor="quickPotInversor"
                        className="text-[11px] text-slate-500 block mb-1"
                      >
                        Potência (kW)
                      </Label>
                      {isCustomPotenciaInversorKw ? (
                        <Input
                          id="quickPotInversor"
                          type="number"
                          min="0.5"
                          step="0.1"
                          value={potenciaInversorKw}
                          onChange={(e) => setPotenciaInversorKw(e.target.value)}
                          placeholder="Ex: 7.5"
                          className="h-9 text-sm font-semibold border-slate-200"
                        />
                      ) : (
                        <select
                          id="quickPotInversor"
                          value={potenciaInversorKw}
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setIsCustomPotenciaInversorKw(true)
                            } else {
                              setPotenciaInversorKw(Number(e.target.value))
                            }
                          }}
                          className="w-full h-9 px-3 text-sm font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
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

                    <div className="sm:col-span-5">
                      <Label
                        htmlFor="quickMarcaInv"
                        className="text-[11px] text-slate-500 block mb-1"
                      >
                        Marca / Modelo do Inversor
                      </Label>
                      {isCustomMarcaInversor ? (
                        <div className="flex gap-1.5">
                          <Input
                            id="quickMarcaInv"
                            value={marcaInversor}
                            onChange={(e) => setMarcaInversor(e.target.value)}
                            placeholder="Ex: Sungrow, HUAWEI, AUSXOL, PHB, GOODWE..."
                            className="h-9 text-sm border-slate-200"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCustomMarcaInversor(false)}
                            className="h-9 px-2 text-[11px]"
                          >
                            Lista
                          </Button>
                        </div>
                      ) : (
                        <select
                          id="quickMarcaInv"
                          value={marcaInversor}
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setIsCustomMarcaInversor(true)
                            } else {
                              setMarcaInversor(e.target.value)
                            }
                          }}
                          className="w-full h-9 px-3 text-xs sm:text-sm font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
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
                <div className="p-2.5 rounded-lg bg-white/80 border border-emerald-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-900">
                    <Calculator className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Total calculado: <strong>{quickKwpInfo.formattedBR} kWp</strong> (
                      {qtdPaineis || 0} painéis × {potenciaPainelW || 0}Wp)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (suggestedName) setNome(suggestedName)
                      if (suggestedFab) setFabricante(suggestedFab)
                      if (quickKwpInfo.kwp > 0) setPotenciaKw(quickKwpInfo.kwp)
                      setDescricao(
                        sugerirDescricaoTecnica({
                          qtdPaineis,
                          potenciaPainelW,
                          marcaPaineis,
                          qtdInversores,
                          marcaInversor,
                          potenciaInversorKw,
                          kwp: quickKwpInfo.kwp,
                          stringBox,
                          tipoEstrutura,
                        }),
                      )
                    }}
                    className="h-6 px-2 text-[11px] text-[#0B7A5B] hover:text-[#095C44] hover:bg-emerald-50 font-medium"
                  >
                    Reaplicar sugestões
                  </Button>
                </div>
              </div>
            )}

            {/* Seletores Técnicos: Tipo de Estrutura & String Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Seletor Tipo de Estrutura */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="kitTipoEstrutura"
                    className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"
                  >
                    <Building className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tipo de Estrutura</span>
                  </Label>
                  {tipoEstrutura && (
                    <span className="text-[11px] font-bold text-blue-800 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full">
                      {formatarRotuloEstrutura(tipoEstrutura)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Defina a estrutura de sustentação dos painéis:
                </p>
                <select
                  id="kitTipoEstrutura"
                  value={tipoEstrutura}
                  onChange={(e) => {
                    const novaEstrut = e.target.value
                    setTipoEstrutura(novaEstrut)
                    if (isQuickMode && !editingKit && !isCloning) {
                      const novoNome = sugerirNomeKit({
                        kwp: quickKwpInfo.kwp,
                        marcaPaineis,
                        marcaInversor,
                        qtdPaineis,
                        potenciaPainelW,
                        tipoEstrutura: novaEstrut,
                      })
                      if (novoNome) setNome(novoNome)
                      setDescricao(
                        sugerirDescricaoTecnica({
                          qtdPaineis,
                          potenciaPainelW,
                          marcaPaineis,
                          qtdInversores,
                          marcaInversor,
                          potenciaInversorKw,
                          kwp: quickKwpInfo.kwp,
                          stringBox,
                          tipoEstrutura: novaEstrut,
                        }),
                      )
                    } else if (novaEstrut && nome) {
                      // Ao mudar a estrutura em modo de edição ou manual, se o usuário quiser, pode atualizar
                      // ou podemos atualizar o nome automaticamente se tiver rótulo de estrutura anterior
                      const atualizado = aplicarEstruturaAoNomeKit(nome, novaEstrut)
                      setNome(atualizado)
                    }
                  }}
                  className="w-full h-9.5 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
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
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="kitStringBox"
                    className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"
                  >
                    <Boxes className="w-3.5 h-3.5 text-amber-600" />
                    <span>String Box (Opcional)</span>
                  </Label>
                  {stringBox && (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                      {formatarRotuloStringBox(stringBox)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Proteção CC com DPS e disjuntor:
                </p>
                <select
                  id="kitStringBox"
                  value={stringBox}
                  onChange={(e) => {
                    const novoSb = e.target.value
                    setStringBox(novoSb)
                    if (isQuickMode && !editingKit && !isCloning) {
                      setDescricao(
                        sugerirDescricaoTecnica({
                          qtdPaineis,
                          potenciaPainelW,
                          marcaPaineis,
                          qtdInversores,
                          marcaInversor,
                          potenciaInversorKw,
                          kwp: quickKwpInfo.kwp,
                          stringBox: novoSb,
                          tipoEstrutura,
                        }),
                      )
                    }
                  }}
                  className="w-full h-9.5 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
                >
                  <option value="">Sem string box</option>
                  <option value="1_entrada">1 entrada (1E / 1S)</option>
                  <option value="2_entradas">2 entradas (2E / 2S)</option>
                  <option value="3_entradas">3 entradas (3E / 3S)</option>
                </select>
              </div>
            </div>
            {/* Campos Principais do Kit (pré-preenchidos ou editáveis) */}
            <div className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="kitNome" className="text-xs font-semibold text-slate-700">
                    Nome Comercial do Kit *
                  </Label>
                  <div className="flex items-center gap-2">
                    {tipoEstrutura && (
                      <button
                        type="button"
                        onClick={() => {
                          const comEstrutura = aplicarEstruturaAoNomeKit(nome, tipoEstrutura)
                          if (comEstrutura) setNome(comEstrutura)
                        }}
                        className="text-[11px] text-blue-700 hover:text-blue-900 hover:underline font-medium"
                        title="Inclui o tipo de estrutura atual ao nome do kit"
                      >
                        + Incluir estrutura no nome
                      </button>
                    )}
                    {isQuickMode && suggestedName && nome !== suggestedName && (
                      <button
                        type="button"
                        onClick={() => setNome(suggestedName)}
                        className="text-[11px] text-[#0B7A5B] hover:underline"
                      >
                        Usar sugestão: &quot;{suggestedName}&quot;
                      </button>
                    )}
                  </div>
                </div>
                <Input
                  id="kitNome"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Kit Solar 6,1 kWp — Canadian Solar + Growatt — Fibrocimento"
                  className="h-9.5 text-sm border-slate-200 focus-visible:ring-[#0B7A5B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="kitFab" className="text-xs font-semibold text-slate-700">
                    Fabricante / Marcas
                  </Label>
                  <Input
                    id="kitFab"
                    value={fabricante}
                    onChange={(e) => setFabricante(e.target.value)}
                    placeholder="Ex: Canadian Solar / Growatt"
                    className="h-9.5 text-sm border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="kitCat" className="text-xs font-semibold text-slate-700">
                    Categoria *
                  </Label>
                  <select
                    id="kitCat"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as KitCategoria)}
                    className="w-full h-9.5 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Valores Comerciais: Potência, Custo, Margem e Preço de Venda Totalmente Editáveis */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label
                    htmlFor="potencia"
                    className="text-xs font-semibold text-slate-700 flex items-center justify-between"
                  >
                    <span>Potência (kWp) *</span>
                    {isQuickMode && (
                      <span className="text-[10px] text-emerald-600 font-normal">Auto</span>
                    )}
                  </Label>
                  <Input
                    id="potencia"
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={potenciaKw}
                    onChange={(e) => setPotenciaKw(e.target.value)}
                    placeholder="5.5"
                    className="h-9.5 text-sm font-semibold border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="custo" className="text-xs font-semibold text-slate-700">
                    Preço de Custo (R$) *
                  </Label>
                  <Input
                    id="custo"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={custo}
                    onChange={(e) => handleCustoChange(e.target.value)}
                    placeholder="15000"
                    className="h-9.5 text-sm font-semibold border-slate-200 font-mono-numbers"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="margem" className="text-xs font-semibold text-slate-700">
                    Margem (%) *
                  </Label>
                  <Input
                    id="margem"
                    type="number"
                    step="0.1"
                    min="0"
                    max="99"
                    required
                    value={margem}
                    onChange={(e) => handleMargemChange(e.target.value)}
                    placeholder="30"
                    className="h-9.5 text-sm font-semibold border-slate-200 font-mono-numbers"
                  />
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="precoVendaInput"
                    className="text-xs font-semibold text-slate-700 flex items-center justify-between"
                  >
                    <span>Preço de Venda (R$) *</span>
                    <span className="text-[10px] text-[#0B7A5B] font-semibold">Editável</span>
                  </Label>
                  <Input
                    id="precoVendaInput"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={precoVenda}
                    onChange={(e) => handlePrecoVendaChange(e.target.value)}
                    placeholder="21428.57"
                    className="h-9.5 text-sm font-bold border-emerald-300 text-[#0B7A5B] focus-visible:ring-[#0B7A5B] font-mono-numbers"
                  />
                </div>
              </div>

              {/* Interactive Live Price Preview Box & Painel de Margem Real do Negócio */}
              {(() => {
                const margemInfo = calcularMargemReal(livePriceCalculated, custo)
                return (
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50/80 via-white to-slate-50 border border-emerald-200 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <Sun className="w-4 h-4 text-emerald-700" />
                        Preço de Venda Atual do Kit:
                      </span>
                      <span className="text-2xl font-extrabold text-[#0B7A5B] font-mono-numbers">
                        {formatBRL(livePriceCalculated)}
                      </span>
                    </div>

                    {/* Painel de Margem Real do Negócio (v0.0.72) com semáforo oficial */}
                    <div className="p-3 rounded-lg bg-white border border-emerald-200/90 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Calculator className="w-3.5 h-3.5 text-[#0B7A5B]" />
                          Margem Real do Negócio (Semáforo de Saúde)
                        </span>
                        <Badge
                          className={`text-[10px] px-2 py-0.5 font-bold border ${margemInfo.status.badgeClass}`}
                        >
                          {margemInfo.status.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center sm:text-left">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-medium">
                            Custo Base
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono-numbers">
                            {formatBRL(Number(custo) || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-medium">
                            Preço de Venda
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono-numbers">
                            {formatBRL(livePriceCalculated)}
                          </span>
                        </div>
                        <div className="sm:text-right">
                          <span className="text-[10px] text-slate-500 block uppercase font-medium">
                            Lucro Bruto (R$ e %)
                          </span>
                          <span
                            className={`text-xs sm:text-sm font-extrabold font-mono-numbers block ${
                              margemInfo.isSaudavel
                                ? 'text-emerald-700'
                                : margemInfo.isApertada
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                            }`}
                          >
                            {margemInfo.formatado}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        Custo e preço de venda são 100% editáveis com recálculo automático da
                        margem.
                      </span>
                      <span className="hidden sm:inline font-mono text-[10px] text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                        Margem = (Venda − Custo) ÷ Venda
                      </span>
                    </div>
                  </div>
                )
              })()}

              <div className="space-y-1">
                <Label htmlFor="kitDesc" className="text-xs font-semibold text-slate-700">
                  Descrição e Componentes
                </Label>
                <Textarea
                  id="kitDesc"
                  rows={2}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: 10 painéis bifaciais 610Wp + Inversor com garantia..."
                  className="text-xs border-slate-200 font-sans"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar Kit Solar</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteKitId} onOpenChange={(open) => !open && setDeleteKitId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Confirmar Exclusão do Kit
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Tem certeza que deseja remover este kit do catálogo de vendas?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteKitId(null)}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteKit}
              disabled={isDeleting}
              className="text-xs bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir Kit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
