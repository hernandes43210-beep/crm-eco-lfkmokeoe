import React, { useState, useEffect } from 'react'
import {
  Boxes,
  Plus,
  Edit3,
  Trash2,
  Sun,
  Zap,
  TrendingUp,
  Percent,
  Check,
  AlertCircle,
  MoreVertical,
  Building,
  Home,
  Tractor,
  Loader2,
} from 'lucide-react'
import { KitsService } from '@/services/kits'
import type { Kit, KitCategoria } from '@/types/crm'
import useRealtime from '@/hooks/use-realtime'
import { useAuth } from '@/context/AuthContext'
import { formatBRL } from '@/lib/solarUtils'
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

  const openCreateModal = () => {
    setEditingKit(null)
    setNome('')
    setFabricante('')
    setPotenciaKw(5.0)
    setCategoria('Residencial')
    setCusto(14000)
    setMargem(30)
    setDescricao('')
    setErrorBanner('')
    setIsModalOpen(true)
  }

  const openEditModal = (kit: Kit) => {
    setEditingKit(kit)
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingKit ? 'Editar Kit Solar' : 'Cadastrar Novo Kit Solar'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Insira as especificações técnicas, custo base e margem desejada. O preço de venda é
              calculado em tempo real.
            </DialogDescription>
          </DialogHeader>

          {errorBanner && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs animate-fade-in-up">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorBanner}</span>
            </div>
          )}

          <form onSubmit={handleSaveKit} className="space-y-3.5">
            <div className="space-y-1">
              <Label htmlFor="kitNome" className="text-xs font-semibold text-slate-700">
                Nome do Kit *
              </Label>
              <Input
                id="kitNome"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Kit Residencial 5,5 kWp"
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
                  placeholder="Ex: Canadian / Growatt"
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
                <Label htmlFor="potencia" className="text-xs font-semibold text-slate-700">
                  Potência (kWp) *
                </Label>
                <Input
                  id="potencia"
                  type="number"
                  step="0.1"
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
                placeholder="Ex: 10 painéis bifaciais 550W + Inversor trifásico com 10 anos de garantia..."
                className="text-xs border-slate-200"
              />
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
