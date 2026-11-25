import { useEffect, useState } from 'react'
import { Loader2, MapPin, Send, Wrench, AlertCircle, FileText, Plus, Trash2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatEnderecoLead, formatarDataBRInstalacao } from '@/lib/instalacoesUtils'
import {
  InstalacoesService,
  type DatasheetItem,
  type EnviarInstaladorPayload,
} from '@/services/instalacoes'
import type { Lead, User } from '@/types/crm'

interface EnviarInstaladorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead | null
  currentUserId?: string
  onEnviado?: () => void
}

interface LinhaDatasheet {
  nome: string
  especificacao: string
}

export function EnviarInstaladorModal({
  open,
  onOpenChange,
  lead,
  currentUserId,
  onEnviado,
}: EnviarInstaladorModalProps) {
  const [instaladores, setInstaladores] = useState<User[]>([])
  const [instaladorId, setInstaladorId] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [endereco, setEndereco] = useState('')
  const [localizacao, setLocalizacao] = useState('')
  const [datasheets, setDatasheets] = useState<LinhaDatasheet[]>([])
  const [loadingInstaladores, setLoadingInstaladores] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setErro(null)
    setClienteNome(lead?.nome || '')
    setEndereco(formatEnderecoLead(lead))
    setLocalizacao(lead?.localizacao_maps_url || lead?.localizacao_link || '')
    setDatasheets([])
    setLoadingInstaladores(true)
    InstalacoesService.getInstaladores()
      .then((lista) => {
        setInstaladores(lista)
        if (lista.length === 0) {
          setErro(
            'Nenhum usuário com função "Instalador" ativo cadastrado. Cadastre um na página Equipe.',
          )
        }
      })
      .catch(() => {
        setErro('Não foi possível carregar os instaladores.')
      })
      .finally(() => setLoadingInstaladores(false))
  }, [open, lead])

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    if (!lead) return
    if (!instaladorId) {
      setErro('Selecione o instalador que receberá a instalação.')
      return
    }
    if (!endereco.trim()) {
      setErro('Informe o endereço completo da instalação.')
      return
    }
    const datasheetsValidos = datasheets.filter((d) => d.nome.trim() && d.especificacao.trim())
    const payload: EnviarInstaladorPayload = {
      leadId: lead.id,
      instaladorId,
      clienteNome: clienteNome.trim(),
      enderecoCompleto: endereco.trim(),
      localizacao: localizacao.trim(),
      datasheets: datasheetsValidos,
    }
    try {
      setEnviando(true)
      const res = await InstalacoesService.enviar(payload)
      if (!res.success) {
        setErro(res.message || 'Falha ao enviar a instalação.')
        return
      }
      toast({
        title: 'Instalação enviada!',
        description: res.email_enviado
          ? `O instalador recebeu o e-mail com o Contrato de Responsabilidade (12 meses).`
          : `Instalação registrada, mas o e-mail não foi enviado: ${res.email_erro || 'verifique o SMTP do backend.'}`,
      })
      onOpenChange(false)
      onEnviado?.()
    } catch (err: unknown) {
      console.error('Erro ao enviar instalação:', err)
      setErro(err instanceof Error ? err.message : 'Falha na comunicação com o servidor.')
    } finally {
      setEnviando(false)
    }
  }

  const updateLinha = (i: number, campo: keyof LinhaDatasheet, valor: string) => {
    setDatasheets((old) => old.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!enviando) onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-lg bg-white border-slate-200 text-slate-900 shadow-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1 text-[#0B7A5B]">
            <Wrench className="w-5 h-5 text-orange-600" />
            <DialogTitle className="text-lg font-bold text-slate-900">
              Enviar ao Instalador
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            O instalador recebe somente o endereço completo, a localização e os datasheets dos
            equipamentos. <strong>Nenhum documento do cliente é enviado.</strong> Ele também recebe
            por e-mail o Contrato de Responsabilidade (vigência de 12 meses).
          </DialogDescription>
        </DialogHeader>

        {loadingInstaladores ? (
          <div className="py-10 flex items-center justify-center text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleEnviar} className="space-y-4">
            {erro && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{erro}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="instaladorSelect" className="text-xs font-semibold text-slate-700">
                Instalador *
              </Label>
              <select
                id="instaladorSelect"
                value={instaladorId}
                onChange={(e) => setInstaladorId(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
              >
                <option value="">Selecione o instalador…</option>
                {instaladores.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name || i.email} {i.email ? `(${i.email})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instCliente" className="text-xs font-semibold text-slate-700">
                Nome do Cliente *
              </Label>
              <Input
                id="instCliente"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                required
                autoComplete="off"
                className="h-9.5 text-sm border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instEndereco" className="text-xs font-semibold text-slate-700">
                Endereço Completo da Instalação *
              </Label>
              <Textarea
                id="instEndereco"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                required
                rows={2}
                autoComplete="off"
                placeholder="Rua, número, bairro, cidade/UF, CEP"
                className="text-sm border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instLocalizacao" className="text-xs font-semibold text-slate-700">
                Localização (link do Google Maps ou coordenadas)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="instLocalizacao"
                  type="url"
                  value={localizacao}
                  onChange={(e) => setLocalizacao(e.target.value)}
                  autoComplete="off"
                  placeholder="https://maps.google.com/…"
                  className="h-9.5 text-sm border-slate-200"
                />
                {localizacao && (
                  <a
                    href={localizacao}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9.5 px-3 inline-flex items-center gap-1 rounded-lg border border-slate-200 text-xs text-[#0B7A5B] hover:bg-emerald-50"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Abrir
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Datasheets dos Equipamentos
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDatasheets((old) => [...old, { nome: '', especificacao: '' }])}
                  className="h-7 text-[11px] gap-1 text-[#0B7A5B] border-emerald-200 hover:bg-emerald-50"
                >
                  <Plus className="w-3 h-3" /> Adicionar item
                </Button>
              </div>
              {datasheets.length === 0 ? (
                <p className="text-[11px] text-slate-400">
                  Nenhum datasheet informado. Adicione painel, inversor etc. manualmente.
                </p>
              ) : (
                <div className="space-y-2">
                  {datasheets.map((linha, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1.5">
                        <Input
                          value={linha.nome}
                          onChange={(e) => updateLinha(i, 'nome', e.target.value)}
                          placeholder="Equipamento (ex: Painel solar)"
                          aria-label={`Nome do equipamento ${i + 1}`}
                          autoComplete="off"
                          className="h-8.5 text-xs border-slate-200"
                        />
                        <Input
                          value={linha.especificacao}
                          onChange={(e) => updateLinha(i, 'especificacao', e.target.value)}
                          placeholder="Especificação / datasheet (ex: 550W, Xinhui …)"
                          aria-label={`Especificação do equipamento ${i + 1}`}
                          autoComplete="off"
                          className="h-8.5 text-xs border-slate-200"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover equipamento ${i + 1}`}
                        onClick={() => setDatasheets((old) => old.filter((_, idx) => idx !== i))}
                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1 text-[11px] text-slate-600">
              <p className="flex items-center gap-1.5 font-semibold text-slate-800">
                <FileText className="w-3.5 h-3.5 text-[#0B7A5B]" /> Contrato de Responsabilidade
              </p>
              <p>
                O e-mail do instalador levará em anexo o Contrato de Responsabilidade em PDF, com
                vigência de <strong>12 meses</strong> a partir da data de envio.
              </p>
            </div>

            <DialogFooter className="pt-1 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={enviando}
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={enviando}
                className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar ao Instalador</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default EnviarInstaladorModal
