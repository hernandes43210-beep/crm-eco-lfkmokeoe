import React, { useState, useEffect, useMemo } from 'react'
import {
  Boxes,
  Plus,
  Edit3,
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
} from 'lucide-react'
import { KitsService } from '@/services/kits'
import type { Kit, KitCategoria } from '@/types/crm'
import useRealtime from '@/hooks/use-realtime'
import { useAuth } from '@/context/AuthContext'
import { formatBRL } from '@/lib/solarUtils'
import {
  POTENCIAS_COMUNS_PAINEIS,
  calcularKwpPrePronto,
  sugerirNomeKit,
  sugerirFabricanteKit,
  sugerirDescricaoTecnica,
} from '@/lib/quickKitUtils'
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
  const [submitting, setSubmitting] = useState(false)
  const [errorBanner, setErrorBanner] = useState('')

  // Form Fields
  const [nome, setNome] = useState('')
  const [fabricante, setFabricante] = useState('')
  const [potenciaKw, setPotenciaKw] = useState<number | string>(5.5)
  const [categoria, setCategoria] = useState<KitCategoria>('Residencial')
  const [custo, setCusto] = useState<number | string>(15000)
  const [margem, setMargem] = useState<number | string>(30)
  const [descricao, setDescricao] = useState('')

  // Modo montagem pré-pronta / rápida
  const [isQuickMode, setIsQuickMode] = useState(true)
  const [qtdPaineis, setQtdPaineis] = useState<number | string>(10)
  const [potenciaPainelW, setPotenciaPainelW] = useState<number | string>(610)
  const [isCustomPotenciaW, setIsCustomPotenciaW] = useState(false)
  const [marcaPaineis, setMarcaPaineis] = useState('Canadian Solar')
  const [qtdInversores, setQtdInversores] = useState<number | string>(1)
  const [marcaInversor, setMarcaInversor] = useState('Growatt 5000')

  // Delete modal state
  const [deleteKitId, setDeleteKitId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchKits = async () => {
    try {
      const data = await KitsService.getKits()
      setKits(data)
    } catch (err) {
      console.error('Error fetching kits:', err)
      toast({
        title: 'Erro ao carregar kits',
        description: 'Não foi possível listar os kits solares cadastrados.',
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
    })
  }, [quickKwpInfo.kwp, marcaPaineis, marcaInversor, qtdPaineis, potenciaPainelW])

  const suggestedFab = useMemo(() => {
    return sugerirFabricanteKit(marcaPaineis, marcaInversor)
  }, [marcaPaineis, marcaInversor])

  // Live formula calculation: preco_venda = custo / (1 - (margem/100))
  const livePriceCalculated = React.useMemo(() => {
    const numCusto = Number(custo) || 0
    const numMargem = Number(margem) || 0

    if (numCusto <= 0 || numMargem < 0 || numMargem >= 100) {
      return 0
    }
    const calculated = numCusto / (1 - numMargem / 100)
    return Math.round(calculated * 100) / 100
  }, [custo, margem])

  // Sincroniza campos do kit quando estiver no modo pré-pronto (criação)
  useEffect(() => {
    if (isQuickMode && !editingKit) {
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
        kwp: quickKwpInfo.kwp,
      })
      setDescricao(descGerada)
    }
  }, [
    isQuickMode,
    editingKit,
    quickKwpInfo.kwp,
    suggestedName,
    suggestedFab,
    qtdPaineis,
    potenciaPainelW,
    marcaPaineis,
    qtdInversores,
    marcaInversor,
  ])

  const openCreateModal = () => {
    setEditingKit(null)
    setIsQuickMode(true)
    setQtdPaineis(10)
    setPotenciaPainelW(610)
    setIsCustomPotenciaW(false)
    setMarcaPaineis('Canadian Solar')
    setQtdInversores(1)
    setMarcaInversor('Growatt 5000')

    const initialKwp = calcularKwpPrePronto(10, 610).kwp
    setNome('Kit Solar 6,1 kWp — Canadian Solar + Growatt 5000')
    setFabricante('Canadian Solar / Growatt 5000')
    setPotenciaKw(initialKwp)
    setCategoria('Residencial')
    setCusto(14000)
    setMargem(30)
    setDescricao(
      sugerirDescricaoTecnica({
        qtdPaineis: 10,
        potenciaPainelW: 610,
        marcaPaineis: 'Canadian Solar',
        qtdInversores: 1,
        marcaInversor: 'Growatt 5000',
        kwp: initialKwp,
      }),
    )
    setErrorBanner('')
    setIsModalOpen(true)
  }

  const openEditModal = (kit: Kit) => {
    setEditingKit(kit)
    setIsQuickMode(false)
    setNome(kit.nome)
    setFabricante(kit.fabricante || '')
    setPotenciaKw(kit.potencia_kw)
    setCategoria(kit.categoria)
    setCusto(kit.custo)
    setMargem(kit.margem)
    setDescricao(kit.descricao || '')
    setErrorBanner('')
    setIsModalOpen(true)
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

    try {
      setSubmitting(true)

      const payload: Partial<Kit> = {
        nome: nome.trim(),
        fabricante: fabricante.trim(),
        potencia_kw: Number(potenciaKw),
        categoria,
        custo: Number(custo),
        margem: Number(margem),
        preco_venda: livePriceCalculated,
        descricao: descricao.trim(),
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
          title: 'Kit solar cadastrado',
          description: 'Novo kit disponível para a equipe de vendas.',
        })
      }

      setIsModalOpen(false)
      fetchKits()
    } catch (err: unknown) {
      console.error('Error saving kit:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao salvar kit solar.'
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
        description: 'Apenas administradores podem excluir kits.',
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
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

        {isAdmin && (
          <Button
            onClick={openCreateModal}
            className="bg-[#0B7A5B] hover:bg-[#095C44] text-white font-medium shadow-sm shadow-[#0B7A5B]/30 gap-1.5 h-9.5 px-4 rounded-lg self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Kit Solar</span>
          </Button>
        )}
      </div>

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
          {isAdmin && (
            <Button
              onClick={openCreateModal}
              className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Kit</span>
            </Button>
          )}
        </div>
      ) : (
        /* Responsive Grid of Kit Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {kits.map((kit) => (
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

                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-slate-700 -mr-1.5 -mt-1"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => openEditModal(kit)}>
                          <Edit3 className="w-3.5 h-3.5 mr-2" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteKitId(kit.id)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          <span>Excluir</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Potência & Categoria Badges */}
                <div className="flex items-center gap-2 mt-3.5">
                  <Badge
                    variant="outline"
                    className="bg-slate-50 border-slate-200 text-xs font-semibold gap-1 text-slate-700"
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>{kit.potencia_kw} kWp</span>
                  </Badge>

                  <Badge
                    variant="outline"
                    className="bg-slate-50 border-slate-200 text-xs font-medium gap-1 text-slate-600"
                  >
                    {getCategoryIcon(kit.categoria)}
                    <span>{kit.categoria}</span>
                  </Badge>
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

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Margem Aplicada:</span>
                  <span className="font-bold text-emerald-700 font-mono-numbers bg-emerald-50 px-1.5 py-0.5 rounded">
                    {kit.margem}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Preço de Venda
                  </span>
                  <span className="text-xl font-extrabold text-[#0B7A5B] font-mono-numbers">
                    {formatBRL(kit.preco_venda)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kit Creation / Editing Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>{editingKit ? 'Editar Kit Solar' : 'Novo Kit Solar'}</span>
                {!editingKit && isQuickMode && (
                  <Badge className="bg-emerald-100 text-[#0B7A5B] border-emerald-300 font-semibold text-[11px] gap-1 hover:bg-emerald-100">
                    <Sparkles className="w-3 h-3 text-[#0B7A5B]" />
                    <span>Montagem Rápida</span>
                  </Badge>
                )}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              {isQuickMode
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
                      <Input
                        id="quickMarcaPaineis"
                        value={marcaPaineis}
                        onChange={(e) => setMarcaPaineis(e.target.value)}
                        placeholder="Ex: Canadian Solar, TSUN"
                        className="h-9 text-sm border-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Inversor: Quantidade e Marca/Modelo */}
                <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                  <Label className="text-xs font-semibold text-slate-700 block">
                    Inversor Solar
                  </Label>
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
                    <div className="sm:col-span-9">
                      <Label
                        htmlFor="quickMarcaInv"
                        className="text-[11px] text-slate-500 block mb-1"
                      >
                        Marca / Modelo do Inversor
                      </Label>
                      <Input
                        id="quickMarcaInv"
                        value={marcaInversor}
                        onChange={(e) => setMarcaInversor(e.target.value)}
                        placeholder="Ex: Growatt 5000, Sungrow 10kW, Deye"
                        className="h-9 text-sm border-slate-200"
                      />
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
                          kwp: quickKwpInfo.kwp,
                        }),
                      )
                    }}
                    className="h-6 px-2 text-[11px] text-[#0B7A5B] hover:text-[#095C44] hover:bg-emerald-50"
                  >
                    Reaplicar sugestões
                  </Button>
                </div>
              </div>
            )}

            {/* Campos Principais do Kit (pré-preenchidos ou editáveis) */}
            <div className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="kitNome" className="text-xs font-semibold text-slate-700">
                    Nome Comercial do Kit *
                  </Label>
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
                <Input
                  id="kitNome"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Kit Solar 6,1 kWp — Canadian Solar + Growatt"
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

              <div className="grid grid-cols-3 gap-3">
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
                    Custo (R$) *
                  </Label>
                  <Input
                    id="custo"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={custo}
                    onChange={(e) => setCusto(e.target.value)}
                    placeholder="15000"
                    className="h-9.5 text-sm font-semibold border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="margem" className="text-xs font-semibold text-slate-700">
                    Margem (%) *
                  </Label>
                  <Input
                    id="margem"
                    type="number"
                    step="0.5"
                    min="0"
                    max="99"
                    required
                    value={margem}
                    onChange={(e) => setMargem(e.target.value)}
                    placeholder="30"
                    className="h-9.5 text-sm font-semibold border-slate-200"
                  />
                </div>
              </div>

              {/* Interactive Live Price Preview Box */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-emerald-700" />
                    Preço de Venda Sugerido (Ao Vivo):
                  </span>
                  <span className="text-xl font-extrabold text-[#0B7A5B] font-mono-numbers">
                    {formatBRL(livePriceCalculated)}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 font-medium">
                  Fórmula de Precificação Solar:{' '}
                  <code className="bg-emerald-100/80 px-1 py-0.5 rounded font-mono">
                    Preço de venda = custo ÷ (1 − margem)
                  </code>
                </p>
              </div>

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
