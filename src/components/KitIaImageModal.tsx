import React, { useState } from 'react'
import {
  Sparkles,
  Download,
  Share2,
  RefreshCw,
  ExternalLink,
  Loader2,
  Check,
  ImageIcon,
  Zap,
  Building,
  Home,
  Tractor,
  Layers,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import type { Kit } from '@/types/crm'
import { KitsService } from '@/services/kits'
import { GeminiImageService, base64ToFile } from '@/services/geminiImage'
import { construirPromptImagemKit } from '@/lib/kitPromptBuilder'
import { formatBRL } from '@/lib/solarUtils'

export interface KitIaImageModalProps {
  kit: Kit | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onKitUpdated?: (updatedKit: Kit) => void
}

export function KitIaImageModal({ kit, open, onOpenChange, onKitUpdated }: KitIaImageModalProps) {
  const [generating, setGenerating] = useState(false)
  const [savingGaleria, setSavingGaleria] = useState(false)
  const [salvoGaleriaOk, setSalvoGaleriaOk] = useState(false)
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null)
  const [promptUsado, setPromptUsado] = useState<string>('')
  const [copiedLink, setCopiedLink] = useState(false)

  if (!kit) return null

  const promptInfo = construirPromptImagemKit(kit)
  const existingImageUrl = KitsService.getKitImageUrl(kit)
  const displayImageUrl = previewDataUrl || existingImageUrl

  const handleGerarImagem = async () => {
    setGenerating(true)
    setSalvoGaleriaOk(false)
    try {
      toast({
        title: 'Gerando imagem do kit com IA...',
        description:
          'Construindo imagem fotorrealista dos módulos e inversores. Aguarde cerca de 15 a 20 segundos.',
      })

      const res = await GeminiImageService.generateImage({
        tipo: promptInfo.tipoInstalacao,
        prompt: promptInfo.promptIngles,
      })

      if (!res.data_url && !res.image_base64) {
        throw new Error('A IA não retornou os dados da imagem gerada.')
      }

      const finalDataUrl = res.data_url || `data:${res.mime_type};base64,${res.image_base64}`
      setPreviewDataUrl(finalDataUrl)
      setPromptUsado(res.prompt_usado || promptInfo.promptIngles)

      // Salva no registro do kit via KitsService / PocketBase
      const updatedRecord = await GeminiImageService.saveImageToKit(
        kit.id,
        finalDataUrl,
        res.prompt_usado || promptInfo.promptIngles,
      )

      toast({
        title: 'Imagem salva no kit solar!',
        description:
          'A imagem fotorrealista do kit já está disponível para propostas Story, proposta clássica e artes de marketing.',
      })

      if (onKitUpdated) {
        onKitUpdated(updatedRecord as unknown as Kit)
      }
    } catch (err: any) {
      console.error('Erro na geração de imagem do kit com IA:', err)
      const rawMsg = err?.message || ''
      let userMsg = 'Não foi possível gerar a imagem via IA. Tente novamente em instantes.'

      if (
        rawMsg.includes('não está configurada') ||
        rawMsg.includes('Configurações > Integrações')
      ) {
        userMsg =
          'A chave do Google Gemini não está configurada ou válida. Acesse o menu Integrações para ativá-la.'
      } else if (rawMsg.includes('429') || rawMsg.includes('limite')) {
        userMsg =
          'Limite temporário de requisições do Google Gemini atingido. Aguarde cerca de 1 minuto e tente novamente.'
      } else if (
        rawMsg.includes('403') ||
        rawMsg.includes('permissão') ||
        rawMsg.includes('PERMISSION_DENIED')
      ) {
        userMsg =
          'Permissão negada pela API do Google Gemini. Verifique a chave no menu Integrações.'
      } else if (rawMsg) {
        userMsg = rawMsg
      }

      toast({
        title: 'Falha na geração da imagem por IA',
        description: userMsg,
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleSalvarNaGaleria = async () => {
    if (!displayImageUrl) return
    setSavingGaleria(true)
    try {
      await GeminiImageService.saveToGaleriaInstitucional({
        titulo: `Kit ${kit.potencia_kw} kWp - ${kit.nome}`,
        tipo: promptInfo.tipoInstalacao,
        legenda: promptInfo.promptResumoPt,
        descricao: `Imagem fotorrealista gerada por IA para o kit solar ${kit.nome}. Potência ${kit.potencia_kw} kWp.`,
        origem: 'ia_gemini',
        prompt_usado: promptUsado || kit.imagem_ia_prompt || promptInfo.promptIngles,
        arquivoBase64: displayImageUrl,
      })

      setSalvoGaleriaOk(true)
      toast({
        title: 'Cópia salva na Galeria Institucional!',
        description: 'A imagem agora também faz parte do acervo institucional da Ecosolar.',
      })
    } catch (err: any) {
      console.error('Erro ao salvar na galeria:', err)
      toast({
        title: 'Erro ao arquivar na galeria',
        description: err?.message || 'Não foi possível salvar na galeria institucional.',
        variant: 'destructive',
      })
    } finally {
      setSavingGaleria(false)
    }
  }

  const handleDownload = () => {
    if (!displayImageUrl) return
    const a = document.createElement('a')
    a.href = displayImageUrl
    a.download = `kit-solar-${kit.potencia_kw}kWp-${Date.now()}.jpg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    toast({
      title: 'Download iniciado',
      description: 'A imagem fotorrealista em alta resolução está sendo baixada.',
    })
  }

  const handleCompartilharWhatsApp = () => {
    const texto = [
      `☀️ *${kit.nome}* (${kit.potencia_kw} kWp)`,
      `⚡ *Preço à vista:* ${formatBRL(kit.preco_venda)}`,
      `🏢 *Estrutura:* ${promptInfo.rotuloInstalacao}`,
      `✨ Imagem fotorrealista do projeto em alta definição gerada pela Ecosolar.`,
      `Solicite uma proposta personalizada sem compromisso!`,
    ].join('\n')

    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Imagem Fotorrealista por IA do Kit Solar</span>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-[#0B7A5B] border-emerald-200 text-[11px] font-semibold"
                >
                  Google Gemini Flash Image
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Gere automaticamente uma cena profissional e limpa, adaptada para o tipo de
                instalação do kit.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Resumo técnico do kit e prompt montado */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-800 line-clamp-1">{kit.nome}</span>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="secondary"
                className="text-[11px] font-semibold gap-1 bg-amber-100 text-amber-900 border-amber-200"
              >
                <Zap className="w-3 h-3 text-amber-600" />
                <span>{kit.potencia_kw} kWp</span>
              </Badge>
              <Badge
                variant="secondary"
                className="text-[11px] font-medium bg-blue-50 text-blue-800 border-blue-200"
              >
                {promptInfo.rotuloInstalacao}
              </Badge>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/60">
            <span className="font-semibold text-slate-700 block mb-0.5">
              Prompt de cena fotográfica calculado:
            </span>
            <span className="text-slate-500">{promptInfo.promptResumoPt}</span>
            <span className="text-[10px] text-slate-400 block mt-1">
              (Sem textos sobrepostos, composição arquitetônica limpa, iluminação solar natural de
              alta fidelidade)
            </span>
          </div>
        </div>

        {/* Área de Visualização da Imagem */}
        <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900/5 aspect-video flex items-center justify-center shadow-inner group">
          {displayImageUrl ? (
            <>
              <img
                src={displayImageUrl}
                alt={`Kit ${kit.nome}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
              />
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                <Badge className="bg-slate-900/80 text-white border-0 text-[10px] backdrop-blur-xs font-medium">
                  {kit.imagem_ia || previewDataUrl ? 'Imagem salva no kit' : 'Visualização'}
                </Badge>
              </div>
            </>
          ) : (
            <div className="text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-400 mx-auto flex items-center justify-center">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                Nenhuma imagem de IA gerada para este kit
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm">
                Clique no botão abaixo para gerar uma imagem fotográfica exclusiva com base nas
                especificações de módulos, potência e estrutura deste kit.
              </p>
            </div>
          )}

          {/* Overlay de carregamento */}
          {generating && (
            <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white text-center animate-fade-in">
              <Loader2 className="w-9 h-9 animate-spin text-amber-400 mb-2.5" />
              <p className="text-sm font-bold">Gerando imagem profissional com IA...</p>
              <p className="text-xs text-slate-300 max-w-xs mt-1">
                Renderizando cena fotorrealista para {promptInfo.rotuloInstalacao}. Isso leva cerca
                de 15 a 20 segundos.
              </p>
            </div>
          )}
        </div>

        {/* Ações disponíveis quando há imagem */}
        {displayImageUrl && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-xs font-semibold gap-1.5 border-slate-200 text-slate-700 hover:text-slate-900"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Baixar Arquivo</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCompartilharWhatsApp}
              className="text-xs font-semibold gap-1.5 border-emerald-200 text-emerald-800 hover:bg-emerald-50"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={savingGaleria || salvoGaleriaOk}
              onClick={handleSalvarNaGaleria}
              className="text-xs font-semibold gap-1.5 border-amber-200 text-amber-900 hover:bg-amber-50"
            >
              {salvoGaleriaOk ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Salvo na Galeria</span>
                </>
              ) : savingGaleria ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span>Cópia na Galeria</span>
                </>
              )}
            </Button>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between sm:items-center pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-500">
            A imagem salva é usada automaticamente na capa/saudação das propostas Story e Clássicas.
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Fechar
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={generating}
              onClick={handleGerarImagem}
              className="bg-gradient-to-r from-amber-500 to-[#0B7A5B] hover:from-amber-600 hover:to-[#09664c] text-white font-semibold text-xs gap-1.5 shadow-sm"
            >
              {generating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Gerando...</span>
                </>
              ) : displayImageUrl ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerar imagem</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>Gerar imagem do kit</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
