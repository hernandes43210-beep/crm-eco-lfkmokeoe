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
  Sun,
  Sunrise,
  Sunset,
  Moon,
  MessageSquare,
  Layers,
} from 'lucide-react'
import {
  generateSaudacaoCanvas,
  downloadSaudacaoImage,
  shareSaudacaoOnWhatsApp,
  SAUDACOES_PREDEFINIDAS,
  type SaudacaoTipo,
  type SaudacaoOptions,
} from '@/lib/saudacaoImage'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'

export interface SaudacaoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SaudacaoModal({ open, onOpenChange }: SaudacaoModalProps) {
  const [tipo, setTipo] = useState<SaudacaoTipo>('bom_dia')
  const [mensagemPersonalizada, setMensagemPersonalizada] = useState('')
  const [format, setFormat] = useState<'square' | 'story'>('square')
  const [generating, setGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Auto-detectar saudação padrão com base no horário do dia ao abrir
  useEffect(() => {
    if (open) {
      const hora = new Date().getHours()
      if (hora >= 5 && hora < 12) {
        setTipo('bom_dia')
      } else if (hora >= 12 && hora < 18) {
        setTipo('boa_tarde')
      } else {
        setTipo('boa_noite')
      }
    }
  }, [open])

  // Gerar o Canvas quando as opções mudarem
  useEffect(() => {
    if (!open) {
      setPreviewUrl(null)
      activeCanvasRef.current = null
      return
    }

    let isMounted = true
    setGenerating(true)
    setErrorMsg(null)

    const options: SaudacaoOptions = {
      tipo,
      mensagemPersonalizada,
      format,
    }

    generateSaudacaoCanvas(options)
      .then((canvas) => {
        if (!isMounted) return
        activeCanvasRef.current = canvas
        setPreviewUrl(canvas.toDataURL('image/png'))
      })
      .catch((err) => {
        console.error('Erro ao gerar arte de saudação:', err)
        if (isMounted) {
          setErrorMsg('Não foi possível renderizar a arte de saudação. Tente novamente.')
        }
      })
      .finally(() => {
        if (isMounted) setGenerating(false)
      })

    return () => {
      isMounted = false
    }
  }, [open, tipo, mensagemPersonalizada, format])

  const safeFilename = `ecosolar-mascote-${tipo}-${format === 'square' ? 'feed' : 'story'}.png`

  const handleDownload = () => {
    if (!activeCanvasRef.current) return
    try {
      setDownloading(true)
      downloadSaudacaoImage(activeCanvasRef.current, safeFilename)
      toast({
        title: 'Download iniciado',
        description: `Arte salva como "${safeFilename}".`,
      })
    } catch (err) {
      console.error('Erro no download:', err)
      toast({
        title: 'Erro ao baixar imagem',
        description: 'Não foi possível salvar a imagem.',
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
      const options: SaudacaoOptions = {
        tipo,
        mensagemPersonalizada,
        format,
      }
      const res = await shareSaudacaoOnWhatsApp(activeCanvasRef.current, options)

      if (res.sharedViaApi) {
        toast({
          title: 'Compartilhamento aberto',
          description: 'A imagem e a saudação foram enviadas com sucesso.',
        })
      } else {
        toast({
          title: 'Imagem salva e WhatsApp aberto',
          description: 'A imagem foi baixada. Basta anexá-la na conversa com a legenda pronta!',
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
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-900">
                <Sun className="w-4 h-4 text-amber-600" />
              </span>
              <span>Arte de Saudação com Mascote</span>
            </DialogTitle>
            <Badge className="bg-emerald-100 text-[#0B7A5B] border-emerald-300 font-semibold gap-1 text-[11px]">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Mascote Oficial Ecosolar
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Crie artes corporativas de engajamento para seus clientes e status do WhatsApp com o
            mascote em destaque e identidade visual solar de alta performance.
          </DialogDescription>
        </DialogHeader>

        {/* Escolha do Tipo de Saudação */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <span>Mensagem de Saudação:</span>
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setTipo('bom_dia')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                tipo === 'bom_dia'
                  ? 'border-[#0B7A5B] bg-emerald-50 text-[#0B7A5B] font-bold shadow-2xs ring-2 ring-[#0B7A5B]/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Sunrise className="w-5 h-5 mb-1 text-amber-500" />
              <span className="text-xs font-bold">Bom dia!</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Manhã</span>
            </button>

            <button
              type="button"
              onClick={() => setTipo('boa_tarde')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                tipo === 'boa_tarde'
                  ? 'border-[#0B7A5B] bg-emerald-50 text-[#0B7A5B] font-bold shadow-2xs ring-2 ring-[#0B7A5B]/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Sun className="w-5 h-5 mb-1 text-amber-600" />
              <span className="text-xs font-bold">Boa tarde!</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Tarde</span>
            </button>

            <button
              type="button"
              onClick={() => setTipo('boa_noite')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                tipo === 'boa_noite'
                  ? 'border-[#0B7A5B] bg-emerald-50 text-[#0B7A5B] font-bold shadow-2xs ring-2 ring-[#0B7A5B]/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Moon className="w-5 h-5 mb-1 text-indigo-500" />
              <span className="text-xs font-bold">Boa noite!</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Noite</span>
            </button>

            <button
              type="button"
              onClick={() => setTipo('personalizado')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                tipo === 'personalizado'
                  ? 'border-[#0B7A5B] bg-emerald-50 text-[#0B7A5B] font-bold shadow-2xs ring-2 ring-[#0B7A5B]/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <MessageSquare className="w-5 h-5 mb-1 text-[#0B7A5B]" />
              <span className="text-xs font-bold">Personalizada</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Livre</span>
            </button>
          </div>
        </div>

        {/* Campo de Mensagem Personalizada */}
        {tipo === 'personalizado' && (
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200 animate-fade-in">
            <Label htmlFor="customMsg" className="text-xs font-bold text-slate-700">
              Digite o texto da sua arte:
            </Label>
            <Textarea
              id="customMsg"
              rows={2}
              value={mensagemPersonalizada}
              onChange={(e) => setMensagemPersonalizada(e.target.value)}
              placeholder="Ex: Feliz semana! Aproveite as melhores condições de energia solar com a Ecosolar Energy."
              className="text-xs bg-white resize-none"
            />
          </div>
        )}

        {/* Escolha do Formato da Arte */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#0B7A5B]" />
            <span>Formato da Imagem:</span>
          </Label>
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
                  Feed Instagram e WhatsApp (1080×1080)
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
                  Stories e WhatsApp Status (1080×1920)
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Visualização da Imagem */}
        <div className="relative rounded-2xl bg-slate-950 p-3 sm:p-4 border border-slate-800 flex items-center justify-center overflow-hidden min-h-[300px] sm:min-h-[380px] shadow-inner">
          {generating ? (
            <div className="flex flex-col items-center justify-center text-slate-400 py-12 gap-3">
              <Loader2 className="w-8 h-8 text-[#0B7A5B] animate-spin" />
              <p className="text-xs font-medium text-slate-300">
                Renderizando mascote e arte corporativa Ecosolar...
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
                  alt={`Arte de saudação - ${tipo}`}
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

        {/* Dica de Envio */}
        <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/80 flex items-start gap-2 text-[11px] text-amber-900">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Dica de Engajamento:</strong> Envie pela manhã ou início da tarde para seus
            leads e clientes no WhatsApp ou poste no Status. Ajuda a manter a marca sempre viva na
            mente do cliente com simpatia e credibilidade.
          </p>
        </div>

        {/* Rodapé e Botões */}
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
