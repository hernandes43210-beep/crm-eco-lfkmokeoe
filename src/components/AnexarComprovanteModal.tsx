import { useState, useRef, useId } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Upload,
  FileCheck2,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Receipt,
  FileImage,
} from 'lucide-react'
import { HomologacaoLead, ComprovantePagamentoTipo } from '@/types/crm'
import { HomologacaoService } from '@/services/homologacao'
import { useToast } from '@/hooks/use-toast'

interface AnexarComprovanteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  homologacao: HomologacaoLead | null
  tipoInicial?: ComprovantePagamentoTipo
  onSuccess?: () => void
}

export function AnexarComprovanteModal({
  open,
  onOpenChange,
  homologacao,
  tipoInicial = 'art',
  onSuccess,
}: AnexarComprovanteModalProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const radioArtId = useId()
  const radioProjetoId = useId()

  const [tipo, setTipo] = useState<ComprovantePagamentoTipo>(tipoInicial)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [observacao, setObservacao] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Reseta estado quando o modal abre ou muda de homologação
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedFile(null)
      setObservacao('')
      setErrorMsg(null)
      setIsUploading(false)
    } else {
      setTipo(tipoInicial)
      setSelectedFile(null)
      setObservacao('')
      setErrorMsg(null)
    }
    onOpenChange(nextOpen)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limite de 30MB coerente com outros anexos
    const MAX_SIZE_MB = 30
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

    if (file.size > MAX_SIZE_BYTES) {
      setErrorMsg(`O arquivo excede o limite máximo de ${MAX_SIZE_MB}MB.`)
      setSelectedFile(null)
      return
    }

    const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!acceptedTypes.includes(file.type)) {
      setErrorMsg('Formato não suportado. Envie um PDF ou imagem (JPG, PNG ou WEBP).')
      setSelectedFile(null)
      return
    }

    setErrorMsg(null)
    setSelectedFile(file)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!homologacao) return

    if (!selectedFile) {
      setErrorMsg('Selecione o arquivo do comprovante (PDF ou imagem).')
      return
    }

    setIsUploading(true)
    setErrorMsg(null)

    try {
      const resp = await HomologacaoService.anexarComprovante({
        homologacaoId: homologacao.id,
        tipo,
        file: selectedFile,
        observacao: observacao.trim() || undefined,
      })

      toast({
        title: 'Comprovante anexado!',
        description:
          resp.message ||
          `Comprovante de pagamento da ${tipo === 'art' ? 'ART' : 'Projeto'} anexado com sucesso.`,
      })

      handleOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível anexar o comprovante. Verifique suas permissões (somente Admin/CEO).'
      setErrorMsg(msg)
      toast({
        title: 'Erro ao anexar comprovante',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const clienteNome = homologacao?.cliente_nome || 'Cliente'
  const temComprovanteArtAnterior = Boolean(homologacao?.comprovante_art_arquivo)
  const temComprovanteProjetoAnterior = Boolean(homologacao?.comprovante_projeto_arquivo)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Anexar Comprovante de Pagamento
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Exclusivo Admin/CEO — Ficha de trabalho: {clienteNome}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <Alert variant="destructive" className="py-2 text-xs">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {/* Seleção do Tipo de Comprovante */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Tipo de Comprovante <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={tipo}
              onValueChange={(val) => setTipo(val as ComprovantePagamentoTipo)}
              className="grid grid-cols-2 gap-3"
            >
              <label
                htmlFor={radioArtId}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  tipo === 'art'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value="art" id={radioArtId} className="mt-0.5 text-emerald-600" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    Comprovante da ART
                    {temComprovanteArtAnterior && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 px-1 rounded font-normal">
                        Já anexado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Marca status como ART Paga e libera o engenheiro.
                  </p>
                </div>
              </label>

              <label
                htmlFor={radioProjetoId}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  tipo === 'projeto'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem
                  value="projeto"
                  id={radioProjetoId}
                  className="mt-0.5 text-blue-600"
                />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    Comprovante do Projeto
                    {temComprovanteProjetoAnterior && (
                      <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 px-1 rounded font-normal">
                        Já anexado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Marca o projeto como pago e notifica a equipe.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Upload do Arquivo */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Arquivo do Comprovante (PDF ou Imagem) <span className="text-red-500">*</span>
            </Label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,image/jpeg,image/png,image/webp"
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-emerald-500 dark:hover:border-emerald-400 bg-muted/20 hover:bg-muted/40 transition-colors rounded-lg p-5 flex flex-col items-center justify-center gap-2 cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Clique para selecionar o comprovante
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    PDF, JPG, PNG ou WEBP até 30MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-md shrink-0">
                    {selectedFile.type === 'application/pdf' ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <FileImage className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type || 'arquivo'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground shrink-0 h-7 px-2"
                >
                  Alterar
                </Button>
              </div>
            )}
          </div>

          {/* Observação Opcional */}
          <div className="space-y-1.5">
            <Label htmlFor="comprovante-obs" className="text-xs font-semibold text-foreground">
              Observação interna (opcional)
            </Label>
            <Textarea
              id="comprovante-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: Pago via PIX pelo Banco do Brasil, autenticação bancária 9841..."
              className="text-xs resize-none min-h-[64px]"
              maxLength={300}
            />
            <p className="text-[10px] text-muted-foreground">
              Essa observação fica registrada no histórico com o nome de quem anexou e data/hora.
            </p>
          </div>

          {/* Aviso informativo de auditoria */}
          <div className="rounded-md bg-muted/50 p-2.5 text-[11px] text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>O que acontece ao anexar:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              <li>
                {tipo === 'art'
                  ? 'A ART é marcada como paga e liberada para o engenheiro no Kanban.'
                  : 'O Projeto é marcado como pago no Kanban e na ficha do cliente.'}
              </li>
              <li>O vendedor pode visualizar o status e baixar o comprovante na ficha do lead.</li>
              <li>O histórico registrará seu usuário, data e hora da anexação.</li>
            </ul>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!selectedFile || isUploading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Anexando comprovante...
                </>
              ) : (
                <>
                  <FileCheck2 className="w-3.5 h-3.5" />
                  Salvar Comprovante
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
