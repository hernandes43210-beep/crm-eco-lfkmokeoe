import React, { useState, useEffect, useRef } from 'react'
import {
  Download,
  Share2,
  Sparkles,
  Maximize2,
  Square,
  Smartphone,
  Check,
  Loader2,
  AlertCircle,
  HelpCircle,
  Layers,
} from 'lucide-react'
import type { Kit } from '@/types/crm'
import {
  generateKitMarketingCanvas,
  downloadMarketingImage,
  shareMarketingOnWhatsApp,
  formatarDadosMarketingKit,
  type MarketingImageFormat,
} from '@/lib/kitMarketingImage'
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

export interface KitMarketingModalProps {
  kit: Kit | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KitMarketingModal({ kit, open, onOpenChange }: KitMarketingModalProps) {
  const [format, setFormat] = useState<MarketingImageFormat>('square')
  const [generating, setGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Gerar o Canvas sempre que o kit ou o formato mudar quando o modal estiver aberto
  useEffect(() => {
    if (!open || !kit) {
      setPreviewUrl(null)
      activeCanvasRef.current = null
      return
    }

    let isMounted = true
    setGenerating(true)
    setErrorMsg(null)

    generateKitMarketingCanvas(kit, format)
      .then((canvas) => {
        if (!isMounted) return
        activeCanvasRef.current = canvas
        const dataUrl = canvas.toDataURL('image/png')
        setPreviewUrl(dataUrl)
      })
      .catch((err) => {
        console.error('Erro ao gerar imagem de marketing:', err)
        if (isMounted) {
          setErrorMsg('Não foi possível renderizar a imagem de marketing. Tente novamente.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setGenerating(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [open, kit, format])

  if (!kit) return null

  const details = formatarDadosMarketingKit(kit)

  const safeFilename = `ecosolar-${(kit.nome || 'kit-solar')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .slice(0, 35)}-${format === 'square' ? 'feed' : 'story'}.png`

  const handleDownload = () => {
    if (!activeCanvasRef.current) return
    try {
      setDownloading(true)
      downloadMarketingImage(activeCanvasRef.current, safeFilename)
      toast({
        title: 'Download iniciado',
        description: `Imagem salva como "${safeFilename}".`,
      })
    } catch (err) {
      console.error('Erro no download:', err)
      toast({
        title: 'Erro ao baixar imagem',
        description: 'Não foi possível salvar o arquivo de imagem.',
        variant: 'destructive',
      })
    } finally {
      setDownloading(false)
    }
  }

  const handleShareWhatsApp = async () => {
    if (!activeCanvasRef.current) return
    try {
      setSharing(true)
      const res = await shareMarketingOnWhatsApp(activeCanvasRef.current, kit)

      if (res.sharedViaApi) {
        toast({
          title: 'Compartilhamento aberto',
          description: 'A imagem e a mensagem foram enviadas para o aplicativo.',
        })
      } else {
        toast({
          title: 'Imagem baixada e WhatsApp aberto',
          description:
            'A imagem em alta resolução foi baixada. Basta anexá-la na conversa com a legenda já preenchida!',
        })
      }
    } catch (err) {
      console.error('Erro ao compartilhar:', err)
      toast({
        title: 'Erro ao compartilhar',
        description: 'Houve uma falha ao abrir o WhatsApp.',
        variant: 'destructive',
      })
    } finally {
      setSharing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-[#0B7A5B]">
                <Sparkles className="w-4 h-4" />
              </span>
              <span>Foto de Marketing do Kit</span>
            </DialogTitle>
            <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-semibold gap-1 text-[11px]">
              Ecosolar Energy Oficial
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Geração instantânea em alta resolução com a identidade visual corporativa da Ecosolar,
            nome comercial real e especificações completas dos equipamentos.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo Técnico do Kit que será inserido na imagem */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Nome Comercial Real
            </span>
            {details.potenciaTotalLinha && (
              <span className="font-extrabold text-[#0B7A5B] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                {details.potenciaTotalLinha}
              </span>
            )}
          </div>
          <p className="font-bold text-slate-900 text-sm leading-snug">{details.nomeComercial}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600 border-t border-slate-200/60">
            <div>
              <span className="text-slate-400 font-medium block">Painéis:</span>
              <span className="font-semibold text-slate-800">{details.paineisLinha}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Inversor:</span>
              <span className="font-semibold text-slate-800">{details.inversorLinha}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Estrutura:</span>
              <span className="font-semibold text-slate-800">{details.estruturaLinha}</span>
            </div>
          </div>
        </div>

        {/* Seleção de Formato: Quadrado (Feed) vs Vertical (Story) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#0B7A5B]" />
            <span>Escolha o Formato da Imagem:</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setFormat('square')}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                format === 'square'
                  ? 'border-[#0B7A5B] bg-emerald-50/60 ring-2 ring-[#0B7A5B]/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  format === 'square' ? 'bg-[#0B7A5B] text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Square className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">Quadrado (1:1)</span>
                  {format === 'square' && <Check className="w-3.5 h-3.5 text-[#0B7A5B]" />}
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Feed Instagram, Facebook e LinkedIn (1080×1080)
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('story')}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                format === 'story'
                  ? 'border-[#0B7A5B] bg-emerald-50/60 ring-2 ring-[#0B7A5B]/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  format === 'story' ? 'bg-[#0B7A5B] text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">Vertical (9:16)</span>
                  {format === 'story' && <Check className="w-3.5 h-3.5 text-[#0B7A5B]" />}
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Stories, WhatsApp Status e Reels (1080×1920)
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Pré-visualização da Imagem Gerada */}
        <div className="relative rounded-2xl bg-slate-950 p-3 sm:p-4 border border-slate-800 flex items-center justify-center overflow-hidden min-h-[300px] sm:min-h-[380px] shadow-inner">
          {generating ? (
            <div className="flex flex-col items-center justify-center text-slate-400 py-12 gap-3">
              <Loader2 className="w-8 h-8 text-[#0B7A5B] animate-spin" />
              <p className="text-xs font-medium text-slate-300">
                Renderizando arte corporativa Ecosolar...
              </p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          ) : previewUrl ? (
            <div className="flex flex-col items-center w-full">
              <div
                className={`relative rounded-xl overflow-hidden shadow-2xl border border-slate-700/60 transition-all ${
                  format === 'square'
                    ? 'w-[280px] h-[280px] sm:w-[360px] sm:h-[360px]'
                    : 'w-[195px] h-[346px] sm:w-[230px] sm:h-[408px]'
                }`}
              >
                <img
                  src={previewUrl}
                  alt={`Arte de marketing para ${details.nomeComercial}`}
                  className="w-full h-full object-contain bg-slate-900 select-none pointer-events-none"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-2 flex items-center gap-1">
                <Maximize2 className="w-3 h-3 text-slate-500" />
                Resolução final:{' '}
                {format === 'square' ? '1080 × 1080 px (1:1)' : '1080 × 1920 px (9:16)'}
              </span>
            </div>
          ) : null}
        </div>

        {/* Dica amigável de compartilhamento WhatsApp */}
        <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/80 flex items-start gap-2 text-[11px] text-amber-900">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Dica para o WhatsApp:</strong> Ao clicar em Compartilhar, a imagem em alta
            definição é salva no seu dispositivo e o WhatsApp é aberto com a legenda pronta contendo
            todos os dados técnicos e chamada comercial para fechar a venda!
          </p>
        </div>

        {/* Botões de Ação */}
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs h-9"
          >
            Fechar
          </Button>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              disabled={generating || !previewUrl || downloading}
              onClick={handleDownload}
              className="text-xs font-semibold gap-1.5 h-9 border-slate-300 hover:bg-slate-100"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-700" />
              )}
              <span>Baixar Imagem PNG</span>
            </Button>

            <Button
              type="button"
              disabled={generating || !previewUrl || sharing}
              onClick={handleShareWhatsApp}
              className="bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs gap-1.5 h-9 shadow-md shadow-[#25D366]/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              {sharing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>Compartilhar no WhatsApp</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
