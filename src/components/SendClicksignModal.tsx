import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lead, FormalizacaoDocumento, FormalizacaoTipo } from '@/types/crm'
import { ClicksignService } from '@/services/clicksign'
import { generatePdfBase64FromHtml } from '@/utils/pdfBase64'
import { consolidateLocation, parseCombinedCoordinates } from '@/utils/locationUtils'
import { useToast } from '@/hooks/use-toast'
import { ESTADOS_BRASILEIROS, obterEnderecoPorEstado } from '@/hooks/useEnderecoAutocomplete'
import {
  Send,
  Loader2,
  FileCheck2,
  UserCheck,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
  MapPin,
  Link as LinkIcon,
  Compass,
  Home,
} from 'lucide-react'

interface SendClicksignModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead
  tipo: FormalizacaoTipo
  documento?: FormalizacaoDocumento | null
  htmlContent?: string
  onSuccess?: () => void
}

export function SendClicksignModal({
  open,
  onOpenChange,
  lead,
  tipo,
  documento,
  htmlContent,
  onSuccess,
}: SendClicksignModalProps) {
  const { toast } = useToast()

  const [nome, setNome] = useState(lead.nome || '')
  const [email, setEmail] = useState(lead.email || '')
  const [cpf, setCpf] = useState(lead.cpf_cnpj || '')
  const [telefone, setTelefone] = useState(lead.telefone || '')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Endereço / localidade do cliente
  const [estadoCliente, setEstadoCliente] = useState(lead.estado || 'RO')
  const [cidadeCliente, setCidadeCliente] = useState(lead.cidade || '')
  const [cepCliente, setCepCliente] = useState(lead.cep || '')

  // Campos de localização (opcionais para envio da documentação)
  const [locMode, setLocMode] = useState<'link' | 'coords'>(() => {
    if (lead.latitude !== undefined && lead.latitude !== null && !lead.localizacao_link) {
      return 'coords'
    }
    return 'link'
  })
  const [locLink, setLocLink] = useState(lead.localizacao_link || lead.localizacao_maps_url || '')
  const [locLat, setLocLat] = useState<string>(
    lead.latitude !== undefined && lead.latitude !== null ? String(lead.latitude) : '',
  )
  const [locLng, setLocLng] = useState<string>(
    lead.longitude !== undefined && lead.longitude !== null ? String(lead.longitude) : '',
  )
  const [locCoordsCombined, setLocCoordsCombined] = useState<string>('')

  // Atualizar formulário quando o modal abrir ou o lead mudar
  React.useEffect(() => {
    if (open) {
      setNome(lead.nome || '')
      setEmail(lead.email || '')
      setCpf(lead.cpf_cnpj || '')
      setTelefone(lead.telefone || '')
      setEstadoCliente(lead.estado || 'RO')
      setCidadeCliente(lead.cidade || '')
      setCepCliente(lead.cep || '')
      setErrorMsg(null)

      const initialLink = lead.localizacao_link || lead.localizacao_maps_url || ''
      const hasCoords = lead.latitude !== undefined && lead.latitude !== null
      setLocMode(hasCoords && !initialLink ? 'coords' : 'link')
      setLocLink(initialLink)
      setLocLat(hasCoords ? String(lead.latitude) : '')
      setLocLng(
        lead.longitude !== undefined && lead.longitude !== null ? String(lead.longitude) : '',
      )
      setLocCoordsCombined('')
    }
  }, [open, lead])

  // Avaliação em tempo real da localização
  const locPreview = React.useMemo(() => {
    return consolidateLocation({
      mode: locMode,
      link: locLink,
      latitude: locLat,
      longitude: locLng,
    })
  }, [locMode, locLink, locLat, locLng])

  const docTituloDisplay =
    tipo === 'procuracao' ? 'Procuração Particular Energisa' : 'Contrato de Prestação de Serviços'

  const envelopeSugerido =
    tipo === 'procuracao'
      ? `Procuração Energisa — ${nome || lead.nome}`
      : `Contrato de Prestação de Serviços — ${nome || lead.nome}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!nome.trim()) {
      setErrorMsg('O nome do cliente é obrigatório.')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Informe um endereço de e-mail válido para o envio da assinatura.')
      return
    }

    // Validação da localização caso preenchida
    const locResult = consolidateLocation({
      mode: locMode,
      link: locLink,
      latitude: locLat,
      longitude: locLng,
    })

    if (!locResult.isValid) {
      setErrorMsg(locResult.errorMessage || 'Verifique os dados de localização do cliente.')
      return
    }

    // Obter conteúdo HTML do documento para gerar o PDF
    const content = htmlContent || documento?.conteudo_html
    if (!content) {
      setErrorMsg(
        'Documento não encontrado ou sem conteúdo gerado. Salve o documento antes de enviar.',
      )
      return
    }

    try {
      setSubmitting(true)

      // 1. Gerar base64 do PDF a partir do HTML oficial com título acentuado
      const pdfBase64 = generatePdfBase64FromHtml(
        tipo === 'procuracao'
          ? `Procuração Energisa Rondônia — ${nome.trim()}`
          : `Contrato de Prestação de Serviços — ${nome.trim()}`,
        content,
      )

      // 2. Chamar endpoint do backend para criar envelope na Clicksign
      const res = await ClicksignService.createEnvelope({
        lead_id: lead.id,
        documento_id: documento?.id,
        tipo_documento: tipo,
        signer_nome: nome.trim(),
        signer_email: email.trim().toLowerCase(),
        signer_cpf: cpf.trim(),
        signer_telefone: telefone.trim(),
        envelope_nome: envelopeSugerido,
        pdf_base64: pdfBase64,
        localizacao_link: locResult.localizacao_link,
        latitude: locResult.latitude,
        longitude: locResult.longitude,
        localizacao_maps_url: locResult.localizacao_maps_url,
        localizacao_cliente: locResult.displayUrl,
      })

      toast({
        title: 'Envelope enviado para assinatura!',
        description: `O link de assinatura foi gerado com sucesso via Clicksign.`,
      })

      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao enviar envelope para Clicksign:', err)
      // Extrair mensagem real retornada pelo backend ou pela Clicksign
      let message = ''
      if (err?.response?.data?.error) {
        message = err.response.data.error
      } else if (err?.data?.error) {
        message = err.data.error
      } else if (err?.response?.error) {
        message = err.response.error
      } else if (
        err?.message &&
        !err.message.includes('ClientResponseError 400') &&
        !err.message.includes('Something went wrong')
      ) {
        message = err.message
      }

      if (!message) {
        message =
          'A Clicksign rejeitou a solicitação de assinatura (HTTP 400). Verifique os dados do signatário (nome completo, e-mail e CPF) e se o documento foi gerado corretamente.'
      }
      setErrorMsg(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-5 bg-gradient-to-r from-[#0A192F] via-[#0F284E] to-[#163868] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white tracking-tight">
                Assinar Digitalmente via Clicksign
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300 mt-0.5">
                Envio do {docTituloDisplay} para assinatura eletrônica do cliente
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <Alert variant="destructive" className="py-2.5 text-xs">
              <AlertCircle className="w-4 h-4 mr-2" />
              <AlertDescription className="font-medium">{errorMsg}</AlertDescription>
            </Alert>
          )}

          {/* Badge informativo */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 block">
                Validade Jurídica Integral (MP 2.200-2/2001)
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                O envelope será criado na Clicksign com 1 documento PDF e 1 signatário. O cliente
                receberá o link seguro por e-mail e você poderá enviá-lo pelo WhatsApp.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#0B7A5B]" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Dados do Signatário (Editáveis)
              </span>
            </div>

            <div className="space-y-1">
              <Label htmlFor="cs-nome" className="text-xs font-semibold text-slate-700">
                Nome Completo do Cliente *
              </Label>
              <Input
                id="cs-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do cliente para o contrato"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cs-email" className="text-xs font-semibold text-slate-700">
                  E-mail do Cliente *
                </Label>
                <Input
                  id="cs-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@exemplo.com.br"
                  className="h-9 text-xs"
                  required
                />
                {!lead.email && (
                  <span className="text-[10px] text-amber-600 font-medium">
                    Lead não possui e-mail no cadastro. Preenchimento obrigatório.
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="cs-cpf" className="text-xs font-semibold text-slate-700">
                  CPF / CNPJ
                </Label>
                <Input
                  id="cs-cpf"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="cs-tel" className="text-xs font-semibold text-slate-700">
                Telefone / WhatsApp (para lembrete)
              </Label>
              <Input
                id="cs-tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(69) 99999-9999"
                className="h-9 text-xs"
              />
            </div>

            {/* Endereço / Localidade do Cliente */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Endereço do Cliente / Localidade
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cs-uf" className="text-xs font-semibold text-slate-700">
                    UF (Estado)
                  </Label>
                  <select
                    id="cs-uf"
                    value={estadoCliente}
                    onChange={(e) => {
                      const novaUf = e.target.value
                      setEstadoCliente(novaUf)
                      const auto = obterEnderecoPorEstado(novaUf, lead)
                      setCidadeCliente(auto.cidade)
                      setCepCliente(auto.cep)
                    }}
                    className="w-full h-9 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
                  >
                    {ESTADOS_BRASILEIROS.map((item) => (
                      <option key={item.sigla} value={item.sigla}>
                        {item.sigla} - {item.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cs-cidade" className="text-xs font-semibold text-slate-700">
                    Cidade
                  </Label>
                  <Input
                    id="cs-cidade"
                    value={cidadeCliente}
                    onChange={(e) => setCidadeCliente(e.target.value)}
                    placeholder="Seringueiras"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cs-cep" className="text-xs font-semibold text-slate-700">
                    CEP
                  </Label>
                  <Input
                    id="cs-cep"
                    value={cepCliente}
                    onChange={(e) => setCepCliente(e.target.value)}
                    placeholder="76934-000"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Bloco: Localização do Cliente / Instalação (Opcional) */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Localização do Cliente / Instalação
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 px-1.5 font-normal text-slate-500"
                >
                  Opcional
                </Badge>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Envie a localização do imóvel para agilizar a vistoria técnica e a mensagem do
                WhatsApp. Você pode colar o <strong>link do Google Maps</strong> ou informar as{' '}
                <strong>coordenadas (lat/lng)</strong>.
              </p>

              {/* Seletor de Modo: Link vs Lat/Lng */}
              <div className="flex rounded-lg bg-slate-100 p-0.5 max-w-xs">
                <button
                  type="button"
                  onClick={() => setLocMode('link')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-semibold transition-all ${
                    locMode === 'link'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LinkIcon className="w-3 h-3 text-emerald-600" />
                  <span>Link do Mapa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocMode('coords')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-semibold transition-all ${
                    locMode === 'coords'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Compass className="w-3 h-3 text-amber-600" />
                  <span>Latitude / Longitude</span>
                </button>
              </div>

              {locMode === 'link' ? (
                <div className="space-y-1">
                  <Label htmlFor="cs-loc-link" className="text-xs font-semibold text-slate-700">
                    Link do Google Maps / Compartilhamento
                  </Label>
                  <Input
                    id="cs-loc-link"
                    value={locLink}
                    onChange={(e) => setLocLink(e.target.value)}
                    placeholder="https://maps.app.goo.gl/... ou https://www.google.com/maps?q=..."
                    className="h-9 text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Aceita links curtos (maps.app.goo.gl) ou links diretos com coordenadas.
                  </span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <Label
                      htmlFor="cs-loc-combined"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Colar "Latitude, Longitude" juntas (Opcional)
                    </Label>
                    <Input
                      id="cs-loc-combined"
                      value={locCoordsCombined}
                      onChange={(e) => {
                        const val = e.target.value
                        setLocCoordsCombined(val)
                        const parsed = parseCombinedCoordinates(val)
                        if (parsed) {
                          setLocLat(String(parsed.latitude))
                          setLocLng(String(parsed.longitude))
                        }
                      }}
                      placeholder="Ex: -11.834123, -62.345123"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="cs-loc-lat" className="text-xs font-semibold text-slate-700">
                        Latitude (-90 a 90)
                      </Label>
                      <Input
                        id="cs-loc-lat"
                        type="text"
                        value={locLat}
                        onChange={(e) => setLocLat(e.target.value)}
                        placeholder="-11.834123"
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cs-loc-lng" className="text-xs font-semibold text-slate-700">
                        Longitude (-180 a 180)
                      </Label>
                      <Input
                        id="cs-loc-lng"
                        type="text"
                        value={locLng}
                        onChange={(e) => setLocLng(e.target.value)}
                        placeholder="-62.345123"
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Preview da Localização com link clicável para abrir mapa */}
              {locPreview.displayUrl && locPreview.isValid && (
                <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate font-mono text-[11px] text-emerald-900">
                      {locPreview.displayUrl}
                    </span>
                  </div>
                  <a
                    href={locPreview.displayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 shrink-0 hover:underline"
                  >
                    <span>Abrir mapa</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {!locPreview.isValid && locPreview.errorMessage && (
                <p className="text-[11px] text-rose-600 font-medium">{locPreview.errorMessage}</p>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
              <span className="font-semibold block">Título do Envelope:</span>
              <span className="text-slate-700 italic block truncate">{envelopeSugerido}</span>
            </div>
          </div>

          <DialogFooter className="p-0 pt-3 border-t border-slate-100 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs h-9"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-[#0A192F] hover:bg-[#0F284E] text-white font-semibold text-xs h-9 gap-1.5 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Enviando para Clicksign...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-amber-400" />
                  <span>Gerar e Enviar para Assinatura</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
