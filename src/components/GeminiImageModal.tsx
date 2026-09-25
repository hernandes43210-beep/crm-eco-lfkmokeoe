import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Save,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  Layers,
  Wand2,
  RefreshCw,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  GeminiImageService,
  type GeminiInstalacaoTipo,
  type GenerateGeminiImageResponse,
} from '@/services/geminiImage'
import type { FotoInstitucionalRecord } from '@/types/crm'

interface GeminiImageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

const TIPOS_INSTALACAO: Array<{
  id: GeminiInstalacaoTipo
  titulo: string
  subtitulo: string
  icone: string
  descricao: string
}> = [
  {
    id: 'residencial',
    titulo: 'Telhado Residencial',
    subtitulo: 'Casas e sobrados brasileiros',
    icone: '🏠',
    descricao:
      'Telhado colonial/cerâmico com módulos monocristalinos escuros, acabamento limpo e céu azul.',
  },
  {
    id: 'comercial',
    titulo: 'Comércio / Galpão',
    subtitulo: 'Indústrias e supermercados',
    icone: '🏢',
    descricao:
      'Cobertura metálica de galpão industrial com grande matriz de placas solares alinhadas.',
  },
  {
    id: 'carport',
    titulo: 'Carport Solar',
    subtitulo: 'Garagem solar fotovoltaica',
    icone: '🚗',
    descricao:
      'Estrutura metálica moderna de estacionamento coberta integralmente por painéis solares.',
  },
  {
    id: 'rural',
    titulo: 'Rural / Solo',
    subtitulo: 'Usinas em fazendas e agronegócio',
    icone: '🌾',
    descricao:
      'Usina em solo com estruturas reforçadas e horizonte campestre típico do agronegócio.',
  },
]

export function GeminiImageModal({ open, onOpenChange, onSaved }: GeminiImageModalProps) {
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'gerar' | 'galeria'>('gerar')
  const [tipoSelecionado, setTipoSelecionado] = useState<GeminiInstalacaoTipo>('residencial')
  const [detalheOpcional, setDetalheOpcional] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Resultado da geração atual
  const [generatedResult, setGeneratedResult] = useState<GenerateGeminiImageResponse | null>(null)
  const [editTitulo, setEditTitulo] = useState('')
  const [editLegenda, setEditLegenda] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Galeria institucional do banco
  const [galeria, setGaleria] = useState<FotoInstitucionalRecord[]>([])
  const [loadingGaleria, setLoadingGaleria] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadGaleria = async () => {
    setLoadingGaleria(true)
    try {
      const records = await GeminiImageService.getFotosInstitucionais()
      setGaleria(records || [])
    } catch (err) {
      console.warn('Erro ao listar galeria institucional:', err)
    } finally {
      setLoadingGaleria(false)
    }
  }

  useEffect(() => {
    if (open) {
      setErrorMessage(null)
      loadGaleria()
    }
  }, [open])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setErrorMessage(null)
    setSavedSuccess(false)
    try {
      const res = await GeminiImageService.generateImage({
        tipo: tipoSelecionado,
        detalhe: detalheOpcional.trim() || undefined,
      })
      setGeneratedResult(res)
      setEditTitulo(res.titulo_sugerido)
      setEditLegenda(res.legenda_sugerida)
      toast({
        title: 'Imagem gerada com sucesso!',
        description: 'Pré-visualize e salve na Galeria Institucional para usar nas propostas.',
      })
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível gerar a imagem. Verifique a configuração da chave Gemini.'
      setErrorMessage(msg)
      toast({
        variant: 'destructive',
        title: 'Erro na geração de imagem',
        description: msg,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveToGaleria = async () => {
    if (!generatedResult) return
    setIsSaving(true)
    try {
      await GeminiImageService.saveToGaleriaInstitucional({
        titulo: editTitulo.trim() || generatedResult.titulo_sugerido,
        tipo: generatedResult.tipo,
        legenda: editLegenda.trim() || generatedResult.legenda_sugerida,
        origem: 'ia_gemini',
        prompt_usado: generatedResult.prompt_usado,
        arquivoBase64: generatedResult.image_base64,
      })
      setSavedSuccess(true)
      toast({
        title: 'Salva na Galeria Institucional!',
        description: 'A foto já está disponível no seletor de fotos de propostas comerciais.',
      })
      await loadGaleria()
      if (onSaved) onSaved()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar imagem na galeria.'
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: msg,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeletePhoto = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover esta foto da galeria institucional?')) {
      return
    }
    setDeletingId(id)
    try {
      await GeminiImageService.deleteFotoInstitucional(id)
      toast({
        title: 'Foto removida',
        description: 'A imagem foi excluída da galeria institucional.',
      })
      await loadGaleria()
      if (onSaved) onSaved()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir foto.'
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: msg,
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-white">
        {/* Header Elegante */}
        <div className="p-6 bg-gradient-to-r from-[#0A192F] via-[#163868] to-[#0A192F] text-white border-b border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Google Gemini • Flash Image</span>
              </div>
              <DialogTitle className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Geração de Imagens Profissionais por IA</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-sky-200">
                Gere fotos fotorrealistas de instalações solares brasileiras e salve na galeria
                institucional para usar em propostas comerciais e PDFs.
              </DialogDescription>
            </div>

            {/* Alternador de Abas */}
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl shrink-0 border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('gerar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'gerar'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Gerar Nova</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('galeria')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'galeria'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Galeria ({galeria.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mensagem de Erro Destacada (ex: Chave não configurada) */}
        {errorMessage && (
          <div className="m-6 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3 text-xs leading-relaxed animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-bold text-slate-900">
                Configuração necessária no backend
              </strong>
              <p className="text-slate-700">{errorMessage}</p>
              <div className="pt-1 text-[11px] text-slate-500 flex items-center gap-2">
                <span>Configure a chave no menu</span>
                <a
                  href="/integracoes"
                  className="inline-flex items-center gap-1 font-bold text-[#0B7A5B] hover:underline"
                >
                  <span>Integrações do CRM</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ABA 1: GERAR NOVA IMAGEM */}
        {activeTab === 'gerar' && (
          <div className="p-6 space-y-6">
            {/* 1. Escolha do Tipo de Instalação */}
            <div className="space-y-2.5">
              <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>1. Escolha o Tipo de Instalação Solar</span>
                <span className="text-slate-400 font-normal lowercase">(obrigatório)</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TIPOS_INSTALACAO.map((item) => {
                  const isSelected = tipoSelecionado === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTipoSelecionado(item.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-[#0B7A5B] bg-emerald-50/70 shadow-sm ring-2 ring-[#0B7A5B]/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                      }`}
                    >
                      <span className="text-2xl shrink-0 p-1.5 rounded-lg bg-white shadow-2xs border border-slate-100">
                        {item.icone}
                      </span>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold text-slate-900">{item.titulo}</h4>
                          {isSelected && (
                            <span className="text-[10px] font-black text-[#0B7A5B] uppercase bg-emerald-100 px-1.5 py-0.5 rounded">
                              ✓ Selecionado
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-600">{item.subtitulo}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                          {item.descricao}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Detalhe Opcional */}
            <div className="space-y-1.5">
              <Label htmlFor="detalheOpcional" className="text-xs font-bold text-slate-800">
                2. Detalhe Adicional do Cenário{' '}
                <span className="text-slate-400 font-normal">(opcional)</span>
              </Label>
              <Input
                id="detalheOpcional"
                value={detalheOpcional}
                onChange={(e) => setDetalheOpcional(e.target.value)}
                placeholder="Ex: vista aérea ao pôr do sol, casa térrea em condomínio fechado, inversor visível na parede..."
                disabled={isGenerating}
                className="text-xs h-10 border-slate-200 focus-visible:ring-[#0B7A5B]"
              />
              <p className="text-[11px] text-slate-400">
                A IA sempre gera imagens limpas, profissionais e fotorrealistas sem texto ou valores
                de preços estampados.
              </p>
            </div>

            {/* 3. Botão de Ação: Gerar Imagem */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full h-11 bg-[#0A192F] hover:bg-[#163868] text-amber-400 hover:text-amber-300 font-extrabold text-sm shadow-md gap-2 border border-amber-400/40 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Gerando imagem fotorrealista via IA (aguarde ~15s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Gerar Imagem com IA Agora</span>
                  </>
                )}
              </Button>
            </div>

            {/* 4. Pré-visualização e Salvamento na Galeria Institucional */}
            {generatedResult && (
              <div className="mt-6 pt-6 border-t border-slate-200 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white font-bold text-xs uppercase px-2 py-0.5">
                      ✓ Resultado da IA
                    </Badge>
                    <span className="text-xs font-bold text-slate-700">
                      Proporção 4:3 • Alta Resolução
                    </span>
                  </div>
                  {savedSuccess && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Salvo na Galeria</span>
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  {/* Foto Gerada */}
                  <div className="md:col-span-6 rounded-xl overflow-hidden border-2 border-slate-300 shadow-md bg-slate-950 aspect-4/3 relative group">
                    <img
                      src={generatedResult.data_url}
                      alt={editTitulo || 'Imagem gerada por IA'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="bg-black/75 text-amber-300 font-black text-[10px] uppercase px-2 py-0.5 rounded shadow">
                        IA • {generatedResult.tipo}
                      </span>
                    </div>
                  </div>

                  {/* Metadados para Edição e Salvamento */}
                  <div className="md:col-span-6 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="space-y-1">
                      <Label htmlFor="editTitulo" className="text-xs font-bold text-slate-700">
                        Título para a Galeria
                      </Label>
                      <Input
                        id="editTitulo"
                        value={editTitulo}
                        onChange={(e) => setEditTitulo(e.target.value)}
                        placeholder="Título da instalação"
                        className="text-xs h-9 bg-white border-slate-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="editLegenda" className="text-xs font-bold text-slate-700">
                        Legenda na Proposta / PDF
                      </Label>
                      <Input
                        id="editLegenda"
                        value={editLegenda}
                        onChange={(e) => setEditLegenda(e.target.value)}
                        placeholder="Legenda descritiva"
                        className="text-xs h-9 bg-white border-slate-300"
                      />
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <Button
                        type="button"
                        onClick={handleSaveToGaleria}
                        disabled={isSaving || savedSuccess}
                        className="w-full h-10 bg-[#0B7A5B] hover:bg-[#095C44] text-white font-bold text-xs gap-2 shadow-sm"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Salvando na galeria...</span>
                          </>
                        ) : savedSuccess ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-white" />
                            <span>Salvo com Sucesso!</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Salvar na Galeria Institucional</span>
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full h-8 text-xs text-slate-600 hover:text-slate-900 border-slate-300"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        <span>Gerar Outra Opção</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 2: GALERIA INSTITUCIONAL SALVA NO BANCO */}
        {activeTab === 'galeria' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Fotos Salvas na Galeria Institucional
                </h3>
                <p className="text-xs text-slate-500">
                  Disponíveis automaticamente para seleção nas fotos de propostas comerciais e PDFs.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadGaleria}
                disabled={loadingGaleria}
                className="text-xs gap-1 h-8"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingGaleria ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </Button>
            </div>

            {loadingGaleria ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B7A5B]" />
                <p className="text-xs">Carregando galeria institucional...</p>
              </div>
            ) : galeria.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-3">
                <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">
                  Nenhuma foto institucional salva ainda
                </h4>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Gere fotos com a IA na aba &quot;Gerar Nova&quot; ou salve imagens personalizadas
                  para montar o acervo visual da sua empresa.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setActiveTab('gerar')}
                  className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-bold gap-1.5"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Gerar Primeira Foto com IA</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {galeria.map((photo) => {
                  const url = GeminiImageService.getFotoUrl(photo, '400x300')
                  const isAi = photo.origem === 'ia_gemini'
                  return (
                    <div
                      key={photo.id}
                      className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="relative aspect-4/3 w-full bg-slate-950 overflow-hidden">
                        <img
                          src={url}
                          alt={photo.titulo}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shadow ${
                              isAi ? 'bg-purple-600 text-white' : 'bg-slate-900 text-amber-300'
                            }`}
                          >
                            {isAi ? 'IA Gemini' : 'Institucional'}
                          </span>
                          <span className="bg-black/60 text-white text-[9px] uppercase px-1.5 py-0.5 rounded">
                            {photo.tipo}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                            {photo.titulo}
                          </h4>
                          {photo.legenda && (
                            <p className="text-[11px] text-slate-500 line-clamp-2">
                              {photo.legenda}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#0B7A5B] hover:underline font-semibold inline-flex items-center gap-1"
                          >
                            <span>Ampliar</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === photo.id}
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Excluir foto"
                          >
                            {deletingId === photo.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
