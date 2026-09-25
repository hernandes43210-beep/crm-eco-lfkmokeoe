import React, { useState, useEffect, useRef } from 'react'
import {
  Camera,
  Upload,
  Trash2,
  Sparkles,
  Download,
  Send,
  Loader2,
  CheckCircle2,
  Eye,
  AlertCircle,
  X,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import type { Lead, LeadPhoto, Proposta } from '@/types/crm'
import { LeadPhotosService } from '@/services/leadPhotos'
import { GeminiImageModal } from '@/components/GeminiImageModal'
import {
  generateInstallationMontageCanvas,
  downloadMontageImage,
  shareMontageOnWhatsApp,
} from '@/lib/installationMontage'
import { extractSolarEquipmentFromProposal } from '@/lib/solarEquipmentParser'
import {
  INSTITUTIONAL_INSTALLATION_PHOTOS,
  type InstitutionalInstallationPhoto,
} from '@/data/socialProofPhotos'

interface LeadInstallationPhotosProps {
  lead: Lead
  propostas?: Proposta[]
  isAdmin?: boolean
  currentUserId?: string
}

export const LeadInstallationPhotos: React.FC<LeadInstallationPhotosProps> = ({
  lead,
  propostas = [],
  isAdmin = false,
  currentUserId,
}) => {
  const [photos, setPhotos] = useState<LeadPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Preview / Montagem modal
  const [showMontageModal, setShowMontageModal] = useState(false)
  const [generatingMontage, setGeneratingMontage] = useState(false)
  const [montagePreviewUrl, setMontagePreviewUrl] = useState<string | null>(null)
  const [cachedCanvas, setCachedCanvas] = useState<HTMLCanvasElement | null>(null)
  const [sharingWa, setSharingWa] = useState(false)

  // Zoom de foto individual
  const [viewingPhoto, setViewingPhoto] = useState<LeadPhoto | null>(null)
  const [viewingInstPhoto, setViewingInstPhoto] = useState<InstitutionalInstallationPhoto | null>(
    null,
  )
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false)

  // Campos editáveis da arte do Instagram
  const [modulosInput, setModulosInput] = useState('')
  const [inversorInput, setInversorInput] = useState('')
  const [economiaInput, setEconomiaInput] = useState('')
  const [observacaoInput, setObservacaoInput] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Carrega fotos vinculadas a este lead
  const loadPhotos = async () => {
    try {
      setLoading(true)
      const list = await LeadPhotosService.getPhotosByLead(lead.id)
      setPhotos(list)
    } catch (err) {
      console.error('Erro ao carregar fotos da obra:', err)
      toast({
        title: 'Erro ao carregar fotos',
        description: 'Não foi possível buscar as fotos da instalação.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (lead?.id) {
      loadPhotos()
    }
  }, [lead?.id])

  // Extrai equipamentos reais (Módulos e Inversor), potência e economia da proposta vinculada ao lead
  const extractedEquipment = React.useMemo(() => {
    return extractSolarEquipmentFromProposal(propostas, lead)
  }, [propostas, lead])

  // Obtém potência instalada prioritária da proposta/kit
  const resolvedPotenciaKw = extractedEquipment.potenciaKw

  // Pré-preenche os campos inteligentes com os dados REAIS da proposta/kit ou vazio (sem valores hardcoded de exemplo)
  useEffect(() => {
    setModulosInput(extractedEquipment.modulos || '')
    setInversorInput(extractedEquipment.inversor || '')
    setEconomiaInput(
      extractedEquipment.economiaMensal ? String(extractedEquipment.economiaMensal) : '',
    )
  }, [extractedEquipment])

  // Handler de upload de novas fotos (até 4 no total)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const remainingSlots = 4 - photos.length
    if (remainingSlots <= 0) {
      toast({
        title: 'Limite atingido',
        description: 'O número máximo é de 4 fotos da instalação.',
        variant: 'destructive',
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots)

    try {
      setUploading(true)
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i]
        await LeadPhotosService.uploadPhoto(
          lead.id,
          file,
          currentUserId,
          undefined,
          photos.length + i + 1,
        )
      }

      toast({
        title: 'Fotos enviadas!',
        description: `${filesToUpload.length} foto(s) da instalação anexada(s) com sucesso.`,
      })
      await loadPhotos()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha no envio de fotos.'
      console.error('Erro ao subir foto:', err)
      toast({
        title: 'Erro no upload',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Excluir foto
  const handleDeletePhoto = async (photo: LeadPhoto) => {
    // Permissão: Admin ou dono do registro
    const canDelete = isAdmin || (currentUserId && photo.criado_por === currentUserId)
    if (!canDelete) {
      toast({
        title: 'Permissão negada',
        description: 'Apenas administradores ou quem enviou a foto podem excluí-la.',
        variant: 'destructive',
      })
      return
    }

    if (!confirm('Deseja realmente remover esta foto da instalação?')) return

    try {
      setDeletingId(photo.id)
      await LeadPhotosService.deletePhoto(photo.id)
      toast({
        title: 'Foto excluída',
        description: 'A foto foi removida dos registros da obra.',
      })
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
      // Invalida montagem em cache
      setCachedCanvas(null)
      setMontagePreviewUrl(null)
    } catch (err) {
      console.error('Erro ao excluir foto:', err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível deletar o registro da foto.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  // Gera a montagem promocional no canvas
  const handleGenerateMontage = async () => {
    if (photos.length === 0) {
      toast({
        title: 'Nenhuma foto anexada',
        description: 'Envie ao menos 1 foto da instalação para gerar a montagem promocional.',
        variant: 'destructive',
      })
      return
    }

    try {
      setGeneratingMontage(true)
      setShowMontageModal(true)

      const photoUrls = photos.map((p) => LeadPhotosService.getPhotoUrl(p))

      const canvas = await generateInstallationMontageCanvas({
        photos: photoUrls,
        potenciaKw: resolvedPotenciaKw,
        modulos: modulosInput.trim(),
        inversor: inversorInput.trim(),
        economiaMensal: economiaInput.trim(),
        observacao: observacaoInput.trim(),
        cidade: lead.cidade,
        estado: lead.estado,
        clienteNome: lead.nome,
      })

      setCachedCanvas(canvas)
      setMontagePreviewUrl(canvas.toDataURL('image/png'))
    } catch (err: unknown) {
      console.error('Erro ao gerar montagem no canvas:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao processar imagens.'
      toast({
        title: 'Erro na geração da montagem',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setGeneratingMontage(false)
    }
  }

  // Baixar arquivo PNG da montagem
  const handleDownload = () => {
    if (!cachedCanvas) return
    const safeName = (lead.nome || 'instalacao')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
    downloadMontageImage(cachedCanvas, `instalacao-ecosolar-${safeName}.png`)
    toast({
      title: 'Download iniciado',
      description: 'Imagem promocional em alta resolução (2000px) gerada com sucesso!',
    })
  }

  // Compartilhar WhatsApp
  const handleShareWhatsApp = async () => {
    if (!cachedCanvas) return
    try {
      setSharingWa(true)
      const result = await shareMontageOnWhatsApp(
        cachedCanvas,
        lead.telefone,
        lead.nome,
        lead.cidade,
      )
      if (result.sharedViaApi) {
        toast({
          title: 'Montagem compartilhada!',
          description: 'A imagem foi enviada pelo aplicativo selecionado.',
        })
      } else {
        toast({
          title: 'Montagem baixada e WhatsApp aberto',
          description: 'A imagem foi salva em seu dispositivo e o chat do WhatsApp foi aberto.',
        })
      }
    } catch (err: unknown) {
      console.error('Erro no compartilhamento:', err)
      toast({
        title: 'Erro ao compartilhar',
        description: 'Não foi possível compartilhar a imagem automaticamente.',
        variant: 'destructive',
      })
    } finally {
      setSharingWa(false)
    }
  }

  return (
    <Card className="border-emerald-200/80 shadow-xs bg-gradient-to-b from-white to-emerald-50/20">
      <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0B7A5B] flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <CardTitle className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Fotos da Instalação & Marketing</span>
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-bold tracking-wider">
                Obra Concluída
              </Badge>
            </CardTitle>
          </div>
          <p className="text-xs text-slate-500">
            Anexe até 4 fotos do sistema instalado para comprovação da obra e geração de montagem
            promocional automática para redes sociais e WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading || photos.length >= 4}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || photos.length >= 4}
            className="h-8.5 text-xs font-semibold border-slate-200 text-slate-700 hover:text-[#0B7A5B] gap-1.5"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B7A5B]" />
                <span>Otimizando e Enviando...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Anexar Fotos ({photos.length}/4)</span>
              </>
            )}
          </Button>

          {/* Botão de Montagem Automática */}
          <Button
            type="button"
            size="sm"
            onClick={handleGenerateMontage}
            disabled={photos.length === 0 || generatingMontage}
            className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-bold gap-1.5 h-8.5 shadow-xs"
          >
            {generatingMontage ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                <span>Montando Arte...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Gerar Montagem Promocional</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {loading ? (
          <div className="py-8 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#0B7A5B] mx-auto mb-2" />
            <p className="text-xs">Carregando fotos da obra...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-emerald-200 bg-white/70 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#0B7A5B] flex items-center justify-center mx-auto">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Nenhuma foto da instalação anexada ainda
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-0.5">
                Como este negócio foi Ganho, adicione até 4 fotos dos painéis, inversor e estrutura.
                As imagens serão redimensionadas automaticamente e poderão ser reunidas em uma arte
                exclusiva com a marca da Ecosolar Energy.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              size="sm"
              className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Selecionar Fotos do Computador / Celular</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Grid de Fotos Anexadas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {photos.map((photo, idx) => {
                const url = LeadPhotosService.getPhotoUrl(photo)
                const isDeleting = deletingId === photo.id
                return (
                  <div
                    key={photo.id}
                    className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-square shadow-xs flex items-center justify-center"
                  >
                    <img
                      src={url}
                      alt={`Foto da Instalação ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Badge Ordem */}
                    <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/20">
                      Foto {idx + 1}
                    </span>

                    {/* Overlay de Ações */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewingPhoto(photo)}
                        className="text-white hover:bg-white/20 h-7 w-7 p-0"
                        title="Ampliar foto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isDeleting}
                        onClick={() => handleDeletePhoto(photo)}
                        className="text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 h-7 w-7 p-0"
                        title="Excluir foto"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}

              {/* Slots vazios para incentivar upload até 4 */}
              {Array.from({ length: Math.max(0, 4 - photos.length) }).map((_, slotIdx) => (
                <button
                  key={`empty-slot-${slotIdx}`}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/70 transition-colors aspect-square flex flex-col items-center justify-center p-3 text-center text-emerald-800 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-full bg-white shadow-xs flex items-center justify-center mb-1 text-[#0B7A5B] group-hover:scale-110 transition-transform">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold">Foto {photos.length + slotIdx + 1}</span>
                  <span className="text-[9px] text-slate-500">Clique para adicionar</span>
                </button>
              ))}
            </div>

            {/* Campos Editáveis para a Arte do Post do Instagram */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#3B44AC] text-white flex items-center justify-center font-bold text-xs">
                    IG
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Personalizar Dados do Post de Instagram
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Configure os textos técnicos que aparecem no painel azul do post antes de
                      gerar.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 font-medium">
                  Potência:{' '}
                  <strong className="text-[#3B44AC]">
                    {resolvedPotenciaKw ? `${resolvedPotenciaKw} kWp` : 'Potência do kit'}
                  </strong>{' '}
                  • Local:{' '}
                  <strong className="text-slate-800">
                    {lead.cidade || 'Cidade'}-{lead.estado || 'UF'}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <div className="space-y-1">
                  <Label
                    htmlFor="post-modulos"
                    className="text-[11px] font-semibold text-slate-700"
                  >
                    Módulos Fotovoltaicos
                  </Label>
                  <Input
                    id="post-modulos"
                    value={modulosInput}
                    onChange={(e) => {
                      setModulosInput(e.target.value)
                      setCachedCanvas(null)
                    }}
                    placeholder="Ex: Módulos Winaico 610 Wp"
                    className="h-8.5 text-xs bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="post-inversor"
                    className="text-[11px] font-semibold text-slate-700"
                  >
                    Inversor Solar
                  </Label>
                  <Input
                    id="post-inversor"
                    value={inversorInput}
                    onChange={(e) => {
                      setInversorInput(e.target.value)
                      setCachedCanvas(null)
                    }}
                    placeholder="Ex: Inversor Growatt 5 kW"
                    className="h-8.5 text-xs bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="post-economia"
                    className="text-[11px] font-semibold text-slate-700"
                  >
                    Economia Estimada (R$/mês)
                  </Label>
                  <Input
                    id="post-economia"
                    value={economiaInput}
                    onChange={(e) => {
                      setEconomiaInput(e.target.value)
                      setCachedCanvas(null)
                    }}
                    placeholder="Ex: 700 ou +700 R$/Mês"
                    className="h-8.5 text-xs bg-white border-slate-200 font-mono-numbers"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="post-obs" className="text-[11px] font-semibold text-slate-700">
                    Observação Curta (opcional)
                  </Label>
                  <Input
                    id="post-obs"
                    value={observacaoInput}
                    onChange={(e) => {
                      setObservacaoInput(e.target.value)
                      setCachedCanvas(null)
                    }}
                    placeholder="Ex: Cliente Direto de Portugal"
                    className="h-8.5 text-xs bg-white border-slate-200"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Layout idêntico ao feed @_ecosolar_energy (cabeçalho oficial + painel azul royal
                    + colagem 1:1).
                  </span>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleGenerateMontage}
                  disabled={generatingMontage}
                  className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold h-8 px-3.5 gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Atualizar & Visualizar Post</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Galeria de Prova Social Institucional — Obras Concluídas pela Ecosolar Energy */}
        <div className="pt-4 border-t border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                Galeria Institucional de Obras Realizadas (Prova Social da Empresa)
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setIsGeminiModalOpen(true)}
                className="bg-[#0A192F] hover:bg-[#163868] text-amber-300 hover:text-amber-200 border border-amber-400/40 text-xs font-bold gap-1.5 h-7.5 px-3 rounded-lg shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Gerar foto com IA</span>
              </Button>
              <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
                Fotos reais integradas a todas as propostas
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {INSTITUTIONAL_INSTALLATION_PHOTOS.map((inst) => (
              <div
                key={inst.id}
                onClick={() => setViewingInstPhoto(inst)}
                className="group cursor-pointer rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-[#0A192F] shadow-xs hover:shadow-md transition-all flex flex-col"
              >
                <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-900">
                  <img
                    src={inst.src}
                    alt={inst.legenda}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2">
                    <span className="bg-[#0A192F]/90 text-amber-300 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border border-amber-400/30">
                      {inst.tag}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                    <span className="text-[10px] text-white font-medium flex items-center gap-1">
                      <Eye className="w-3 h-3 text-amber-400" />
                      Clique para ver em tamanho original
                    </span>
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between space-y-1 bg-white">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">
                      {inst.local}
                    </span>
                    <strong className="text-xs font-bold text-slate-900 block leading-tight mt-0.5">
                      {inst.legenda}
                    </strong>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {inst.descricao}
                    </p>
                  </div>
                  <div className="pt-2 text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Engenharia Homologada</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      {/* Modal Zoom Foto Institucional */}
      <Dialog open={!!viewingInstPhoto} onOpenChange={(open) => !open && setViewingInstPhoto(null)}>
        <DialogContent className="sm:max-w-2xl p-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-[#0A192F] text-amber-400 font-bold text-xs uppercase px-2 py-0.5">
                {viewingInstPhoto?.tag}
              </Badge>
              <DialogTitle className="text-sm font-bold text-slate-900">
                {viewingInstPhoto?.titulo}
              </DialogTitle>
            </div>
          </DialogHeader>
          {viewingInstPhoto && (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden bg-black/90 flex items-center justify-center max-h-[65vh]">
                <img
                  src={viewingInstPhoto.src}
                  alt={viewingInstPhoto.legenda}
                  className="max-h-[65vh] w-auto max-w-full object-contain"
                />
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-900">{viewingInstPhoto.legenda}</p>
                <p className="text-[11px] text-slate-500">{viewingInstPhoto.descricao}</p>
                <span className="text-[10px] text-slate-400 block pt-1">
                  Localidade: {viewingInstPhoto.local}
                </span>
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewingInstPhoto(null)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Pré-visualização da Montagem Promocional */}
      <Dialog open={showMontageModal} onOpenChange={setShowMontageModal}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto p-5">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0B7A5B] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Arte Oficial do Post de Instagram da Obra
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Formato quadrado 1:1 (2000x2000px) com cabeçalho oficial, painel azul royal com
                  dados técnicos e fotos em colagem orgânica.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2">
            {generatingMontage ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-10 h-10 animate-spin text-[#0B7A5B] mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  Processando fotos e renderizando arte promocional...
                </p>
                <p className="text-xs text-slate-400">
                  Aplicando cortes simétricos, gradientes corporativos e tipografia da marca.
                </p>
              </div>
            ) : montagePreviewUrl ? (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden border border-slate-300 bg-slate-950 shadow-md aspect-square max-h-[500px] mx-auto flex items-center justify-center">
                  <img
                    src={montagePreviewUrl}
                    alt="Pré-visualização da Montagem"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>Resolução: 2000 x 2000 px (Formato Quadrado / Instagram / WhatsApp)</span>
                  <span className="font-semibold text-emerald-700">✓ Pronta para divulgação</span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                Não foi possível carregar a prévia da montagem.
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMontageModal(false)}
              className="text-xs w-full sm:w-auto"
            >
              Fechar
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!cachedCanvas || generatingMontage}
                className="text-xs font-semibold gap-1.5 border-slate-200 text-slate-700 hover:text-[#0B7A5B] w-full sm:w-auto"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Imagem HD</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleShareWhatsApp}
                disabled={!cachedCanvas || generatingMontage || sharingWa}
                className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold gap-1.5 shadow-xs w-full sm:w-auto"
              >
                {sharingWa ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Compartilhando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar no WhatsApp</span>
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal IA Gemini para geração e gestão da galeria */}
      <GeminiImageModal open={isGeminiModalOpen} onOpenChange={setIsGeminiModalOpen} />

      {/* Modal Zoom Foto Individual */}
      <Dialog open={!!viewingPhoto} onOpenChange={(open) => !open && setViewingPhoto(null)}>
        <DialogContent className="sm:max-w-2xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Foto da Instalação
            </DialogTitle>
          </DialogHeader>
          {viewingPhoto && (
            <div className="rounded-lg overflow-hidden bg-black/90 flex items-center justify-center max-h-[70vh]">
              <img
                src={LeadPhotosService.getPhotoUrl(viewingPhoto)}
                alt="Foto ampliada"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewingPhoto(null)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
