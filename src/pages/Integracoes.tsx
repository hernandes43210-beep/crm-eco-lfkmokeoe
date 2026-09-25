import React, { useState, useEffect, useCallback } from 'react'
import {
  Webhook,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  Building2,
  Calendar,
  Code,
  Globe,
  KeyRound,
  Eye,
  EyeOff,
  Terminal,
  Send,
  FileCode2,
  Clock,
  PenTool,
  AlertCircle,
  Shield,
  FileCheck2,
  Save,
  Activity,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'
import { Sparkles } from 'lucide-react'
import { LuvikService, type WebhookUrls } from '@/services/luvik'
import { SiteFormService } from '@/services/siteForm'
import { ClicksignService, type ClicksignStatusResponse } from '@/services/clicksign'
import { GeminiIntegrationService, type GeminiStatusResponse } from '@/services/geminiIntegration'
import { toPortugueseErrorMessage } from '@/lib/errors'
import type { LuvikSettings, LuvikLogItem, SiteFormSettings, SiteFormLogItem } from '@/types/crm'

export default function IntegracoesPage() {
  const { isAdmin } = useAuth()

  // Tab ativa
  const [activeTab, setActiveTab] = useState<'gemini' | 'clicksign' | 'site' | 'luvik'>('gemini')

  // Estado da integração Gemini (Google AI)
  const [geminiStatus, setGeminiStatus] = useState<GeminiStatusResponse | null>(null)
  const [loadingGemini, setLoadingGemini] = useState(false)
  const [savingGeminiKey, setSavingGeminiKey] = useState(false)
  const [testingGemini, setTestingGemini] = useState(false)
  const [geminiInputKey, setGeminiInputKey] = useState('')
  const [showGeminiInputKey, setShowGeminiInputKey] = useState(false)
  const [geminiTestResult, setGeminiTestResult] = useState<{
    success: boolean
    message: string
    http_status?: number
    duration_ms?: number
  } | null>(null)

  // Estado da Clicksign
  const [clicksignStatus, setClicksignStatus] = useState<ClicksignStatusResponse | null>(null)
  const [loadingClicksign, setLoadingClicksign] = useState(false)
  const [savingClicksignToken, setSavingClicksignToken] = useState(false)
  const [testingClicksign, setTestingClicksign] = useState(false)
  const [clicksignInputToken, setClicksignInputToken] = useState('')
  const [showClicksignInputToken, setShowClicksignInputToken] = useState(false)
  const [clicksignAmbienteSelect, setClicksignAmbienteSelect] = useState<'producao' | 'sandbox'>(
    'producao',
  )
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    http_status?: number
    duration_ms?: number
  } | null>(null)

  // Estado do Luvik
  const [luvikSettings, setLuvikSettings] = useState<LuvikSettings | null>(null)
  const [luvikUrls, setLuvikUrls] = useState<WebhookUrls | null>(null)
  const [luvikLogs, setLuvikLogs] = useState<LuvikLogItem[]>([])
  const [loadingLuvik, setLoadingLuvik] = useState(true)
  const [regeneratingLuvik, setRegeneratingLuvik] = useState(false)
  const [confirmRegenerateLuvikOpen, setConfirmRegenerateLuvikOpen] = useState(false)

  // Estado do Formulário do Site
  const [siteSettings, setSiteSettings] = useState<SiteFormSettings | null>(null)
  const [siteLogs, setSiteLogs] = useState<SiteFormLogItem[]>([])
  const [loadingSite, setLoadingSite] = useState(true)
  const [regeneratingSite, setRegeneratingSite] = useState(false)
  const [confirmRegenerateSiteOpen, setConfirmRegenerateSiteOpen] = useState(false)
  const [showSiteToken, setShowSiteToken] = useState(false)

  // Modais de Log Payload
  const [selectedLogPayload, setSelectedLogPayload] = useState<Record<string, unknown> | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const loadLuvikData = useCallback(async () => {
    try {
      setLoadingLuvik(true)
      const data = await LuvikService.getSettings()
      setLuvikSettings(data)
      if (data.webhook_token) {
        setLuvikUrls(LuvikService.buildWebhookUrls(data.webhook_token))
      }
      const logsList = await LuvikService.getLogs()
      setLuvikLogs(logsList)
    } catch (err: unknown) {
      const msg = toPortugueseErrorMessage(err, 'Erro ao carregar configurações do Luvik.')
      toast({
        title: 'Erro de conexão Luvik',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoadingLuvik(false)
    }
  }, [])

  const loadSiteData = useCallback(async () => {
    try {
      setLoadingSite(true)
      const data = await SiteFormService.getSettings()
      setSiteSettings(data)
      const logsList = await SiteFormService.getLogs()
      setSiteLogs(logsList)
    } catch (err: unknown) {
      const msg = toPortugueseErrorMessage(
        err,
        'Erro ao carregar configurações do formulário do site.',
      )
      toast({
        title: 'Erro de conexão Formulário do Site',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoadingSite(false)
    }
  }, [])

  const loadGeminiData = useCallback(async () => {
    try {
      setLoadingGemini(true)
      const data = await GeminiIntegrationService.getStatus()
      setGeminiStatus(data)
    } catch (err: unknown) {
      console.error('Erro ao carregar status do Gemini:', err)
    } finally {
      setLoadingGemini(false)
    }
  }, [])

  const loadClicksignData = useCallback(async () => {
    try {
      setLoadingClicksign(true)
      const data = await ClicksignService.getStatus()
      setClicksignStatus(data)
      if (data.ambiente) {
        setClicksignAmbienteSelect(data.ambiente)
      }
    } catch (err: unknown) {
      console.error('Erro ao carregar status da Clicksign:', err)
    } finally {
      setLoadingClicksign(false)
    }
  }, [])

  const handleSaveGeminiKey = async () => {
    if (!geminiInputKey.trim()) {
      toast({
        title: 'Chave não informada',
        description: 'Cole a chave da API do Gemini (AIza...) para salvar.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSavingGeminiKey(true)
      setGeminiTestResult(null)
      await GeminiIntegrationService.saveSettings({
        api_key: geminiInputKey.trim(),
      })

      toast({
        title: 'Chave do Gemini salva com sucesso!',
        description:
          'A chave foi persistida de forma protegida e já está disponível para geração de fotos.',
      })

      setGeminiInputKey('')
      setShowGeminiInputKey(false)
      await loadGeminiData()
    } catch (err: unknown) {
      const msg = toPortugueseErrorMessage(err, 'Falha ao salvar chave da API do Gemini.')
      toast({
        title: 'Erro ao salvar chave',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSavingGeminiKey(false)
    }
  }

  const handleTestGeminiConnection = async () => {
    try {
      setTestingGemini(true)
      setGeminiTestResult(null)

      // Se o usuário digitou uma chave no input mas não salvou ainda, testa a chave digitada
      const keyToTest = geminiInputKey.trim() || undefined
      const res = await GeminiIntegrationService.testConnection(keyToTest)

      setGeminiTestResult({
        success: res.success,
        message: res.message,
        http_status: res.http_status,
        duration_ms: res.duration_ms,
      })

      if (res.success) {
        toast({
          title: 'Conexão validada!',
          description: res.message,
        })
      } else {
        toast({
          title: 'Falha no teste de conexão',
          description: res.message,
          variant: 'destructive',
        })
      }

      await loadGeminiData()
    } catch (err: unknown) {
      const msg = toPortugueseErrorMessage(err, 'Erro ao testar conexão com o Gemini.')
      setGeminiTestResult({
        success: false,
        message: msg,
      })
      toast({
        title: 'Erro ao testar conexão',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setTestingGemini(false)
    }
  }

  const handleSaveClicksignToken = async () => {
    if (!clicksignInputToken.trim()) {
      toast({
        title: 'Token não informado',
        description: 'Cole o token de acesso da Clicksign para salvar.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSavingClicksignToken(true)
      setTestResult(null)
      const res = await ClicksignService.saveSettings({
        api_token: clicksignInputToken.trim(),
        ambiente: clicksignAmbienteSelect,
      })

      toast({
        title: 'Token Clicksign salvo com sucesso!',
        description: 'O token foi persistido no backend de forma segura e protegida.',
      })

      // Limpar o campo de entrada para segurança
      setClicksignInputToken('')
      setShowClicksignInputToken(false)

      // Atualizar status na interface
      await loadClicksignData()
    } catch (err: unknown) {
      const msg = toPortugueseErrorMessage(err, 'Falha ao salvar token da Clicksign.')
      toast({
        title: 'Erro ao salvar token',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSavingClicksignToken(false)
    }
  }

  const handleTestClicksignConnection = async () => {
    try {
      setTestingClicksign(true)
      setTestResult(null)
      const res = await ClicksignService.testConnection()
      setTestResult({
        success: res.success,
        message: res.message,
        http_status: res.http_status,
        duration_ms: res.duration_ms,
      })

      if (res.success) {
        toast({
          title: 'Conexão validada!',
          description: res.message,
        })
      } else {
        toast({
          title: 'Falha no teste de conexão',
          description: res.message,
          variant: 'destructive',
        })
      }

      await loadClicksignData()
    } catch (err: unknown) {
      const msg = toPortugueseErrorMessage(err, 'Erro ao testar conexão com a Clicksign.')
      setTestResult({
        success: false,
        message: msg,
      })
      toast({
        title: 'Erro ao testar conexão',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setTestingClicksign(false)
    }
  }

  const loadAllData = useCallback(() => {
    loadGeminiData()
    loadSiteData()
    loadLuvikData()
    loadClicksignData()
  }, [loadGeminiData, loadSiteData, loadLuvikData, loadClicksignData])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  const copyToClipboard = (
    text: string,
    keyName: string,
    successTitle = 'Copiado com sucesso!',
  ) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(keyName)
    setTimeout(() => setCopiedKey(null), 2000)
    toast({
      title: successTitle,
      description: 'Conteúdo copiado para a área de transferência.',
    })
  }

  // Regenerar Token do Luvik
  const handleRegenerateLuvikToken = async () => {
    try {
      setRegeneratingLuvik(true)
      const res = await LuvikService.regenerateToken()
      toast({
        title: 'Token Luvik regenerado com sucesso!',
        description: 'Lembre-se de atualizar as URLs no painel do Luvik.',
      })
      setConfirmRegenerateLuvikOpen(false)
      if (res.webhook_token) {
        setLuvikUrls(LuvikService.buildWebhookUrls(res.webhook_token))
      }
      await loadLuvikData()
    } catch (err: unknown) {
      const msg = toPortugueseErrorMessage(err, 'Falha ao regenerar token do Luvik.')
      toast({
        title: 'Erro ao regenerar token',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setRegeneratingLuvik(false)
    }
  }

  // Regenerar Token do Site
  const handleRegenerateSiteToken = async () => {
    try {
      setRegeneratingSite(true)
      const res = await SiteFormService.regenerateToken()
      toast({
        title: 'Token do formulário regenerado com sucesso!',
        description: 'Atualize o token no código ou webhook do Hostinger Horizons.',
      })
      setConfirmRegenerateSiteOpen(false)
      await loadSiteData()
    } catch (err: unknown) {
      const msg = toPortugueseErrorMessage(err, 'Falha ao regenerar token do formulário.')
      toast({
        title: 'Erro ao regenerar token',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setRegeneratingSite(false)
    }
  }

  const getStatusProcessamentoBadge = (status: string) => {
    switch (status) {
      case 'sucesso':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px] gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Sucesso
          </Badge>
        )
      case 'ignorado':
        return (
          <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[11px] gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Ignorado
          </Badge>
        )
      case 'erro':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[11px] gap-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            Erro
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        )
    }
  }

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-'
    const d = new Date(isoString)
    return (
      d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' às ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    )
  }

  // Valores calculados do Site Form
  const siteEndpointUrl = SiteFormService.getEndpointUrl()
  const siteToken = siteSettings?.form_token || ''
  const siteUrlWithToken = siteToken
    ? SiteFormService.buildUrlWithToken(siteToken)
    : siteEndpointUrl

  // Exemplo de JSON para Horizons
  const jsonExample = JSON.stringify(
    {
      nome: 'João da Silva',
      whatsapp: '69999998888',
      cidade: 'Cacoal',
      tipo_imovel: 'Residencial',
      valor_conta: '450,00',
      consumo: '480 kWh',
    },
    null,
    2,
  )

  // Exemplo de Script JavaScript para Horizons Custom Code
  const jsCodeSnippet = `<!-- Código de Integração: Hostinger Horizons -> Ecosolar Energy -->
<script>
(function() {
  // Ajuste o seletor do formulário se necessário (ex: 'form' ou '#contact-form')
  const form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    // Captura os dados preenchidos no formulário
    const formData = new FormData(form);
    const payload = {
      nome: formData.get('nome') || formData.get('name') || '',
      whatsapp: formData.get('whatsapp') || formData.get('telefone') || formData.get('phone') || '',
      cidade: formData.get('cidade') || formData.get('city') || '',
      tipo_imovel: formData.get('tipo_imovel') || formData.get('imovel') || 'Residencial',
      valor_conta: formData.get('valor_conta') || formData.get('valor') || '',
      consumo: formData.get('consumo') || formData.get('kwh') || ''
    };

    try {
      await fetch('${siteEndpointUrl}', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-site-token': '${siteToken || 'SEU_TOKEN_AQUI'}'
        },
        body: JSON.stringify(payload)
      });
      console.log('Lead enviado com sucesso para o CRM Ecosolar Energy');
    } catch (err) {
      console.warn('Erro ao enviar lead:', err);
    }
  });
})();
</script>`

  if (!isAdmin) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Acesso Restrito</h2>
        <p className="text-xs text-slate-500">
          Apenas administradores da Ecosolar Energy têm permissão para acessar e configurar as
          integrações de formulário e webhooks.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0B7A5B] shadow-xs">
            <Webhook className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Integrações & Configurações da API
              </h2>
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 gap-1 font-semibold text-xs py-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {geminiStatus?.configured ? 'Gemini Ativo' : 'Gemini Disponível'} • Clicksign, Site
                & Luvik
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure a chave da API do Google Gemini (IA), Clicksign (Assinatura), formulário do
              site e webhooks do Luvik.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={loadAllData}
            title="Atualizar dados e logs"
            className="h-9 w-9 text-slate-600"
          >
            <RefreshCw
              className={`w-4 h-4 ${loadingSite || loadingLuvik || loadingClicksign || loadingGemini ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      {/* Tabs para alternar entre Gemini, Clicksign, Site Form e Luvik */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'gemini' | 'clicksign' | 'site' | 'luvik')}
        className="space-y-6"
      >
        <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex flex-wrap h-auto gap-1">
          <TabsTrigger
            value="gemini"
            className="data-[state=active]:bg-white data-[state=active]:text-[#0B7A5B] data-[state=active]:shadow-xs font-semibold text-xs py-2 px-4 gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Google Gemini (Imagens IA)</span>
            {geminiStatus?.configured ? (
              <Badge className="bg-emerald-100 text-emerald-800 text-[10px] py-0 px-1.5 ml-1">
                Conectada
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-800 text-[10px] py-0 px-1.5 ml-1">
                Pendente
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="clicksign"
            className="data-[state=active]:bg-white data-[state=active]:text-[#0B7A5B] data-[state=active]:shadow-xs font-semibold text-xs py-2 px-4 gap-2"
          >
            <PenTool className="w-4 h-4 text-emerald-600" />
            <span>Clicksign (Assinatura Digital)</span>
            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] py-0 px-1.5 ml-1">
              Ativo
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="site"
            className="data-[state=active]:bg-white data-[state=active]:text-[#0B7A5B] data-[state=active]:shadow-xs font-semibold text-xs py-2 px-4 gap-2"
          >
            <Globe className="w-4 h-4" />
            <span>Formulário do Site (ecoenergy.net.br)</span>
          </TabsTrigger>
          <TabsTrigger
            value="luvik"
            className="data-[state=active]:bg-white data-[state=active]:text-[#0B7A5B] data-[state=active]:shadow-xs font-semibold text-xs py-2 px-4 gap-2"
          >
            <Building2 className="w-4 h-4" />
            <span>Integração Luvik Solar</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB GEMINI (NOVA - GERAÇÃO DE IMAGENS POR IA) */}
        <TabsContent value="gemini" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-5">
              <Card className="border-slate-200/80 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <span>Gemini — Geração de Imagens com IA</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Geração de fotos fotorrealistas de instalações solares (Google Imagen 3) para
                      propostas comerciais e marketing de kits.
                    </CardDescription>
                  </div>

                  {geminiStatus?.configured ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs gap-1.5 py-1 px-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Conectada</span>
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-300 text-xs gap-1 py-1 px-2.5"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Não Configurada</span>
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                        Modelo de Imagem
                      </span>
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Imagen 3.0 (imagen-3.0-generate-002)
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                        Origem da Chave
                      </span>
                      <span className="font-semibold text-slate-800 text-[11px] truncate block">
                        {geminiStatus?.source === 'database'
                          ? 'Banco de Dados (CRM)'
                          : geminiStatus?.source === 'env'
                            ? 'Variável de Ambiente ($os.getenv)'
                            : 'Nenhuma chave configurada'}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 sm:col-span-2">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                        Chave da API do Gemini (Armazenamento Seguro)
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-800 text-xs font-semibold">
                          {geminiStatus?.masked_key || 'Nenhuma chave configurada'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-white text-emerald-700 border-emerald-300"
                          >
                            Protegido no Servidor
                          </Badge>
                          <Badge variant="outline" className="text-[10px] bg-white text-slate-500">
                            Apenas Admin
                          </Badge>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 pt-0.5">
                        A chave da API fica armazenada com restrição de acesso e nunca é transmitida
                        por completo ao navegador de nenhum usuário.
                      </p>
                    </div>
                  </div>

                  {/* Formulário de Configuração da Chave */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Configurar / Atualizar Chave da API
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Apenas Administradores
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Cole abaixo a chave de API gerada no{' '}
                      <strong className="text-slate-800">Google AI Studio</strong> (geralmente
                      começa com <code className="bg-white px-1 rounded border">AIza...</code>). Ao
                      salvar, o CRM passa a utilizá-la imediatamente para gerar fotos de instalações
                      em marketing e propostas.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Chave da API do Google Gemini (GEMINI_API_KEY)
                        </label>
                        <div className="relative">
                          <input
                            type={showGeminiInputKey ? 'text' : 'password'}
                            value={geminiInputKey}
                            onChange={(e) => setGeminiInputKey(e.target.value)}
                            placeholder={
                              geminiStatus?.configured
                                ? 'Cole uma nova chave para substituir a atual...'
                                : 'Cole aqui sua chave (ex: AIzaSy...)'
                            }
                            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B7A5B] pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowGeminiInputKey(!showGeminiInputKey)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            title={showGeminiInputKey ? 'Ocultar chave' : 'Exibir chave digitada'}
                          >
                            {showGeminiInputKey ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          disabled={savingGeminiKey || !geminiInputKey.trim()}
                          onClick={handleSaveGeminiKey}
                          className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold h-8.5 px-3.5 gap-1.5 shadow-xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingGeminiKey ? 'Salvando...' : 'Salvar Chave'}</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            testingGemini || (!geminiStatus?.configured && !geminiInputKey.trim())
                          }
                          onClick={handleTestGeminiConnection}
                          className="h-8.5 px-3.5 text-xs font-semibold border-slate-300 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 gap-1.5"
                          title="Faz uma chamada leve ao Google AI Studio para verificar se a chave é válida"
                        >
                          <Activity
                            className={`w-3.5 h-3.5 ${testingGemini ? 'animate-spin' : ''}`}
                          />
                          <span>{testingGemini ? 'Testando...' : 'Testar Conexão'}</span>
                        </Button>

                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-[#0B7A5B] hover:text-[#095C44] font-medium hover:underline ml-auto"
                        >
                          <span>Obter chave no Google AI Studio</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* Feedback do Teste de Conexão */}
                      {geminiTestResult && (
                        <div
                          className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                            geminiTestResult.success
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-rose-50 border-rose-200 text-rose-900'
                          }`}
                        >
                          {geminiTestResult.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-0.5">
                            <p className="font-semibold">{geminiTestResult.message}</p>
                            {geminiTestResult.duration_ms && (
                              <p className="text-[11px] opacity-80">
                                Latência da API do Google: {geminiTestResult.duration_ms} ms
                                {geminiTestResult.http_status
                                  ? ` • HTTP ${geminiTestResult.http_status}`
                                  : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-950 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Onde essa integração é usada no CRM?</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-amber-900/90 text-[11px]">
                      <li>
                        <strong>Kits Solares:</strong> no botão &quot;Gerar Imagem com IA&quot; para
                        criar posts promocionais e cards de marketing.
                      </li>
                      <li>
                        <strong>Ficha do Lead:</strong> na seção de Fotos de Instalações, para gerar
                        fotos realistas de telhados residenciais, galpões comerciais, garagens
                        solares e usinas em solo.
                      </li>
                      <li>
                        <strong>Galeria Institucional:</strong> fotos geradas ficam salvas na
                        galeria da Ecosolar e podem ser reutilizadas em qualquer proposta comercial
                        e PDF.
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-5">
              <Card className="border-slate-200/80 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-amber-500" />
                    <span>Como obter a chave no Google AI Studio</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Passo a passo rápido e gratuito (plano free tier)
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-3.5 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <strong className="text-slate-800">Acesse o Google AI Studio</strong>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Entre em{' '}
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-emerald-700 hover:underline"
                        >
                          aistudio.google.com/app/apikey
                        </a>{' '}
                        com sua conta Google.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <strong className="text-slate-800">
                        Clique em &quot;Create API key&quot;
                      </strong>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Selecione seu projeto do Google Cloud ou crie um novo projeto com um clique.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <strong className="text-slate-800">Copie a chave gerada</strong>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        A chave começa com{' '}
                        <code className="bg-slate-100 px-1 rounded">AIza...</code>. Copie para a
                        área de transferência.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0">
                      4
                    </span>
                    <div>
                      <strong className="text-slate-800">
                        Cole no campo ao lado e clique em Salvar
                      </strong>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Depois clique em <em>&quot;Testar Conexão&quot;</em> para certificar-se de
                        que a API está respondendo.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <strong className="text-slate-800 block">Dica de custos:</strong>
                    <p>
                      O Google oferece cota gratuita mensal para testes e uso no Google AI Studio.
                      Nenhuma cobrança é realizada sem ativação explícita de faturamento no Google
                      Cloud.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB CLICKSIGN */}
        <TabsContent value="clicksign" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-5">
              <Card className="border-slate-200/80 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <PenTool className="w-5 h-5 text-emerald-600" />
                      <span>Conexão com Clicksign API v3</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Assinatura digital e eletrônica de Contratos e Procurações com validade
                      jurídica
                    </CardDescription>
                  </div>

                  {clicksignStatus?.configured ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs gap-1.5 py-1 px-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Conectada</span>
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-300 text-xs gap-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Não Configurada</span>
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                        Ambiente da API
                      </span>
                      <span className="font-bold text-slate-900 capitalize flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            clicksignStatus?.ambiente === 'producao'
                              ? 'bg-emerald-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        {clicksignStatus?.ambiente === 'producao'
                          ? 'Produção Oficial'
                          : 'Sandbox (Testes)'}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                        Host Conectado
                      </span>
                      <span className="font-mono text-slate-800 text-[11px] truncate block">
                        {clicksignStatus?.host || 'https://app.clicksign.com'}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 sm:col-span-2">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                        Token da API Clicksign (Armazenamento Seguro)
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-800 text-xs font-semibold">
                          {clicksignStatus?.masked_token || 'Nenhum token configurado'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-white text-emerald-700 border-emerald-300"
                          >
                            {clicksignStatus?.source === 'database'
                              ? 'Salvo no CRM'
                              : clicksignStatus?.source === 'env'
                                ? 'Variável de Ambiente'
                                : 'Não Configurado'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] bg-white text-slate-500">
                            Protegido no Servidor
                          </Badge>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 pt-0.5">
                        O token da API é mantido de forma segura no backend (PocketBase) e nunca é
                        exposto em texto puro para o navegador.
                      </p>
                    </div>
                  </div>

                  {/* Gestão Manual do Token (Admin) */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Configurar / Atualizar Token Manualmente
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Apenas Administradores
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Cole abaixo o token de API gerado na sua conta da Clicksign (em{' '}
                      <em>Configurações &gt; API &gt; Tokens</em>). Ao salvar, ele será armazenado
                      de forma protegida e o status será atualizado imediatamente.
                    </p>

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                            Novo Token da API Clicksign
                          </label>
                          <div className="relative">
                            <input
                              type={showClicksignInputToken ? 'text' : 'password'}
                              value={clicksignInputToken}
                              onChange={(e) => setClicksignInputToken(e.target.value)}
                              placeholder="Cole o token aqui (ex: 8a4b...)"
                              className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B7A5B] pr-9"
                            />
                            <button
                              type="button"
                              onClick={() => setShowClicksignInputToken(!showClicksignInputToken)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              title={
                                showClicksignInputToken ? 'Ocultar token' : 'Exibir token digitado'
                              }
                            >
                              {showClicksignInputToken ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                            Ambiente Alvo
                          </label>
                          <select
                            value={clicksignAmbienteSelect}
                            onChange={(e) =>
                              setClicksignAmbienteSelect(e.target.value as 'producao' | 'sandbox')
                            }
                            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B7A5B]"
                          >
                            <option value="producao">Produção (app.clicksign.com)</option>
                            <option value="sandbox">Sandbox (sandbox.clicksign.com)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          disabled={savingClicksignToken || !clicksignInputToken.trim()}
                          onClick={handleSaveClicksignToken}
                          className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold h-8.5 px-3.5 gap-1.5 shadow-xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingClicksignToken ? 'Salvando...' : 'Salvar Token'}</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={testingClicksign || !clicksignStatus?.configured}
                          onClick={handleTestClicksignConnection}
                          className="h-8.5 px-3.5 text-xs font-semibold border-slate-300 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 gap-1.5"
                          title="Faz uma requisição leve à API da Clicksign para validar se o token atual é aceito"
                        >
                          <Activity
                            className={`w-3.5 h-3.5 ${testingClicksign ? 'animate-spin' : ''}`}
                          />
                          <span>{testingClicksign ? 'Testando...' : 'Testar Conexão'}</span>
                        </Button>
                      </div>

                      {/* Feedback do Teste de Conexão */}
                      {testResult && (
                        <div
                          className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                            testResult.success
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-rose-50 border-rose-200 text-rose-900'
                          }`}
                        >
                          {testResult.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-0.5">
                            <p className="font-semibold">{testResult.message}</p>
                            {testResult.duration_ms && (
                              <p className="text-[11px] opacity-80">
                                Latência da API: {testResult.duration_ms} ms
                                {testResult.http_status ? ` • HTTP ${testResult.http_status}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Aviso de Segurança Discreto */}
                      <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p>
                          <strong>Boas práticas de segurança:</strong> Recomendamos regenerar e
                          atualizar o token da API periodicamente no painel da Clicksign para manter
                          a segurança jurídica dos seus documentos.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-xs text-emerald-950 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-900">
                      <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Fluxo 100% Integrado na Etapa de Formalização</span>
                    </div>
                    <p className="leading-relaxed text-emerald-800 text-[11px]">
                      Quando um lead atinge a etapa <strong>Fechado Ganho</strong>, os cards do{' '}
                      <strong>Contrato de Prestação</strong> e da{' '}
                      <strong>Procuração Energisa</strong> exibem o botão{' '}
                      <em>"Assinar digitalmente"</em>. O sistema gera o envelope com 1 documento e 1
                      signatário, fornece o link de assinatura, permite disparar a mensagem
                      personalizada no WhatsApp e monitora o status do envelope.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-5">
              <Card className="border-slate-200/80 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-emerald-600" />
                    <span>Como Utilizar na Prática</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Passo a passo rápido para envio aos clientes
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-3.5 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <strong className="text-slate-800">Acesse a ficha do lead</strong>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Abra o lead em <strong>/leads/:id</strong> e localize a seção de{' '}
                        <em>Formalização Contratual & Energisa</em>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <strong className="text-slate-800">Clique em "Assinar digitalmente"</strong>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Revise os dados do signatário (nome, e-mail e CPF editáveis antes do
                        disparo).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <strong className="text-slate-800">Envie o link via WhatsApp</strong>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Copie o link gerado ou clique no botão do WhatsApp para abrir a mensagem
                        preenchida com link da Clicksign.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center shrink-0">
                      4
                    </span>
                    <div>
                      <strong className="text-slate-800">Acompanhe e sincronize</strong>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        O status atualiza automaticamente ao abrir a ficha do lead ou pelo botão{' '}
                        <em>"Atualizar status"</em>.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 1: FORMULÁRIO DO SITE (ecoenergy.net.br / Hostinger Horizons) */}
        <TabsContent value="site" className="space-y-6 mt-0">
          {/* Card Principal: Credenciais e Endpoints Protegidos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-5">
              <Card className="border-slate-200/80 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-[#0B7A5B]" />
                      <span>Endpoint Dedicado do Formulário</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Conexão exclusiva e protegida para o site{' '}
                      <strong className="text-slate-700">ecoenergy.net.br</strong>
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmRegenerateSiteOpen(true)}
                    className="text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-300 text-xs h-8 gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerar Token</span>
                  </Button>
                </CardHeader>

                <CardContent className="p-6 space-y-5">
                  {/* URL do Endpoint */}
                  <div className="space-y-1.5 p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 tracking-wide uppercase flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-[#0B7A5B]" />
                        <span>URL do Endpoint (POST)</span>
                      </label>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0">
                        POST HTTP
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Recebe requisições POST com JSON ou Form Data enviado pelo Hostinger Horizons.
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        readOnly
                        value={siteEndpointUrl}
                        className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-none focus:ring-1 focus:ring-[#0B7A5B]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(siteEndpointUrl, 'site_endpoint', 'URL copiada!')
                        }
                        className="h-8.5 px-3 bg-white text-slate-700 hover:bg-slate-50 border-slate-300 text-xs shrink-0 gap-1.5"
                      >
                        {copiedKey === 'site_endpoint' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                            <span className="text-emerald-700 font-semibold">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Token de Proteção */}
                  <div className="space-y-1.5 p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 tracking-wide uppercase flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        <span>Token Secreto do Formulário</span>
                      </label>
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0">
                        Obrigatório
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Protege sua entrada contra spams e robôs. Rejeita automaticamente chamadas não
                      autorizadas.
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="relative flex-1">
                        <input
                          readOnly
                          type={showSiteToken ? 'text' : 'password'}
                          value={siteToken || 'Carregando token...'}
                          className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-none focus:ring-1 focus:ring-[#0B7A5B] pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSiteToken(!showSiteToken)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          title={showSiteToken ? 'Ocultar token' : 'Exibir token'}
                        >
                          {showSiteToken ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(siteToken, 'site_token', 'Token copiado!')}
                        className="h-8.5 px-3 bg-white text-slate-700 hover:bg-slate-50 border-slate-300 text-xs shrink-0 gap-1.5"
                      >
                        {copiedKey === 'site_token' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                            <span className="text-emerald-700 font-semibold">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Token</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* URL Completa com Token Embutido */}
                  <div className="space-y-1.5 p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/40">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-emerald-950 tracking-wide uppercase flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0B7A5B]" />
                        <span>URL Pronta com Token (para Webhook Direto)</span>
                      </label>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] py-0">
                        Mais Fácil
                      </Badge>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Se o Hostinger Horizons tiver campo para colar apenas a URL de Webhook, cole
                      esta URL com o token já embutido:
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        readOnly
                        value={siteUrlWithToken}
                        className="flex-1 bg-white border border-emerald-300 rounded-md px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-none focus:ring-1 focus:ring-[#0B7A5B]"
                      />
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            siteUrlWithToken,
                            'site_full_url',
                            'URL completa copiada!',
                          )
                        }
                        className="h-8.5 px-3 bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs shrink-0 gap-1.5 shadow-xs"
                      >
                        {copiedKey === 'site_full_url' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                            <span className="font-semibold">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar URL+Token</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Informações dos Campos Recebidos */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                    <p className="font-semibold text-slate-800">
                      Mapeamento Inteligente dos Campos do Site:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <strong className="block text-slate-900">Nome</strong>
                        <span className="text-amber-700 font-medium">Aguardando Qualificação</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <strong className="block text-slate-900">WhatsApp / Fone</strong>
                        <span>Telefone (SLA pós-triagem)</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <strong className="block text-slate-900">Cidade</strong>
                        <span>Localização</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <strong className="block text-slate-900">Tipo de Imóvel</strong>
                        <span>Residencial / etc.</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <strong className="block text-slate-900">Valor da Conta (R$)</strong>
                        <span>Valor Médio R$</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <strong className="block text-slate-900">Consumo (kWh)</strong>
                        <span>Dimensionamento</span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-amber-50/80 rounded border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Fluxo de Pré-Qualificação Ativo:</strong> leads preenchidos no site
                        entram na fila "Aguardando Qualificação" fora do funil. O SLA de 7 dias só
                        começa quando você clicar em <em>Qualificar</em>.
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1">
                      O endpoint é tolerante e aceita letras maiúsculas ou minúsculas (ex:{' '}
                      <code className="bg-slate-200/70 px-1 rounded">nome</code>,{' '}
                      <code className="bg-slate-200/70 px-1 rounded">WhatsApp</code>,{' '}
                      <code className="bg-slate-200/70 px-1 rounded">valor_conta</code>, etc.).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Guia Passo a Passo Hostinger Horizons (5 colunas) */}
            <div className="lg:col-span-5 space-y-5">
              <Card className="border-slate-200/80 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-[#0B7A5B]" />
                    <span>Como Conectar no Hostinger Horizons</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Instruções passo a passo para o construtor do site
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3.5 text-xs text-slate-600">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center shrink-0">
                        1
                      </span>
                      <div>
                        <strong className="text-slate-800">
                          Opção A: Webhook Nativo do Formulário
                        </strong>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          No editor do Horizons, clique no formulário de contato &gt;{' '}
                          <strong>Configurações / Integrações / Webhook</strong>. Cole a{' '}
                          <strong>URL Pronta com Token</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div>
                        <strong className="text-slate-800">
                          Opção B: Código Personalizado (Custom Code)
                        </strong>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          Se o construtor só permitir envio via script, adicione um bloco de código
                          HTML/JS ou vá em{' '}
                          <strong>Configurações do Site &gt; Código Personalizado</strong> e cole o
                          script abaixo pronto.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Exemplo de Script Pronto para Copiar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileCode2 className="w-3.5 h-3.5 text-[#0B7A5B]" />
                        <span>Script JavaScript Pronto (Custom Code)</span>
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(jsCodeSnippet, 'js_snippet', 'Script copiado!')
                        }
                        className="h-7 px-2 text-[11px] text-[#0B7A5B] border-[#0B7A5B]/30 hover:bg-emerald-50 gap-1"
                      >
                        {copiedKey === 'js_snippet' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar Script</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 max-h-48 overflow-y-auto">
                      <pre className="text-[10px] font-mono text-emerald-300 whitespace-pre-wrap break-all leading-relaxed">
                        {jsCodeSnippet}
                      </pre>
                    </div>
                  </div>

                  {/* Exemplo do Payload JSON */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5 text-slate-500" />
                        <span>Formato do Payload JSON Aceito</span>
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(jsonExample, 'json_example', 'Exemplo JSON copiado!')
                        }
                        className="h-6 px-1.5 text-[10px] text-slate-600 hover:text-slate-900"
                      >
                        Copiar JSON
                      </Button>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <pre className="text-[10px] font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
                        {jsonExample}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Histórico e Logs de Envios do Site */}
          <Card className="border-slate-200/80 shadow-xs bg-white">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#0B7A5B]" />
                  <span>Últimos Envios Recebidos do Site (ecoenergy.net.br)</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Histórico em tempo real para auditoria de leads que preencheram o formulário
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {siteLogs.length} registro(s)
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadSiteData}
                  className="h-8 text-xs text-slate-600 gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSite ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {siteLogs.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Globe className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    Nenhum envio recebido ainda
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Assim que alguém preencher o formulário no site ou você fizer um teste, o lead
                    entrará automaticamente no funil e o log aparecerá aqui.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Data / Hora</th>
                        <th className="py-3 px-4">Lead Criado</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">IP Origem</th>
                        <th className="py-3 px-4">Mensagem</th>
                        <th className="py-3 px-4 text-right">Payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {siteLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {formatDate(log.created)}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {log.lead_nome || '-'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {getStatusProcessamentoBadge(log.status_processamento)}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {log.origem_ip || 'Site'}
                          </td>
                          <td
                            className="py-3 px-4 text-slate-600 max-w-[280px] truncate"
                            title={log.mensagem}
                          >
                            {log.mensagem || '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {log.payload_bruto ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLogPayload(log.payload_bruto || null)}
                                className="h-7 px-2 text-[11px] text-[#0B7A5B] hover:text-[#095C44] hover:bg-emerald-50 gap-1"
                              >
                                <Code className="w-3 h-3" />
                                <span>Ver JSON</span>
                              </Button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: INTEGRAÇÃO LUVIK */}
        <TabsContent value="luvik" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Card das 3 URLs do Luvik (7 colunas) */}
            <div className="lg:col-span-7 space-y-5">
              <Card className="border-slate-200/80 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[#0B7A5B]" />
                      <span>Webhook&apos;s do Luvik</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Copie cada URL abaixo e cole no campo respectivo da tela de integrações do
                      Luvik.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmRegenerateLuvikOpen(true)}
                    className="text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-300 text-xs h-8 gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerar Token</span>
                  </Button>
                </CardHeader>

                <CardContent className="p-6 space-y-5">
                  {/* Campo 1: QUANDO UM NEGÓCIO FOR CRIADO */}
                  <div className="space-y-1.5 p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                        <label className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                          QUANDO UM NEGÓCIO FOR CRIADO
                        </label>
                      </div>
                      <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] py-0">
                        Cria lead no estágio &quot;Novo&quot; com SLA ativo
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Cadastra o lead no funil solar, preenche dados do contato e inicia o prazo de
                      SLA.
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        readOnly
                        value={luvikUrls?.criado || 'Carregando URL...'}
                        className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-none focus:ring-1 focus:ring-[#0B7A5B]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => luvikUrls && copyToClipboard(luvikUrls.criado, 'criado')}
                        className="h-8.5 px-3 bg-white text-slate-700 hover:bg-slate-50 border-slate-300 text-xs shrink-0 gap-1.5"
                      >
                        {copiedKey === 'criado' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                            <span className="text-emerald-700 font-semibold">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Campo 2: QUANDO UM NEGÓCIO FOR MARCADO COMO GANHO */}
                  <div className="space-y-1.5 p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <label className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                          QUANDO UM NEGÓCIO FOR MARCADO COMO GANHO
                        </label>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] py-0">
                        Move para &quot;Fechado Ganho&quot;
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Atualiza o lead no CRM para venda concluída, salva valor vendido e data de
                      encerramento.
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        readOnly
                        value={luvikUrls?.ganho || 'Carregando URL...'}
                        className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-none focus:ring-1 focus:ring-[#0B7A5B]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => luvikUrls && copyToClipboard(luvikUrls.ganho, 'ganho')}
                        className="h-8.5 px-3 bg-white text-slate-700 hover:bg-slate-50 border-slate-300 text-xs shrink-0 gap-1.5"
                      >
                        {copiedKey === 'ganho' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                            <span className="text-emerald-700 font-semibold">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Campo 3: QUANDO UM NEGÓCIO FOR MARCADO COMO PERDIDO */}
                  <div className="space-y-1.5 p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <label className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                          QUANDO UM NEGÓCIO FOR MARCADO COMO PERDIDO
                        </label>
                      </div>
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] py-0">
                        Move para &quot;Fechado Perdido&quot;
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Move o lead no funil para Fechado Perdido e grava no histórico o motivo da
                      perda.
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        readOnly
                        value={luvikUrls?.perdido || 'Carregando URL...'}
                        className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-none focus:ring-1 focus:ring-[#0B7A5B]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => luvikUrls && copyToClipboard(luvikUrls.perdido, 'perdido')}
                        className="h-8.5 px-3 bg-white text-slate-700 hover:bg-slate-50 border-slate-300 text-xs shrink-0 gap-1.5"
                      >
                        {copiedKey === 'perdido' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                            <span className="text-emerald-700 font-semibold">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Nota de Segurança e Conciliação */}
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0B7A5B] shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-950 space-y-1">
                      <p className="font-semibold">Conciliação Inteligente de Leads</p>
                      <p className="text-emerald-800 leading-relaxed text-[11px]">
                        O endpoint armazena o ID do negócio no Luvik (
                        <code className="bg-emerald-100/80 px-1 py-0.5 rounded font-mono">
                          luvik_deal_id
                        </code>
                        ) no lead e verifica e-mail e telefone antes de criar, evitando
                        duplicidades.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Card Tutorial de Como Configurar no Luvik (5 colunas) */}
            <div className="lg:col-span-5 space-y-5">
              <Card className="border-slate-200/80 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-[#0B7A5B]" />
                    <span>Como configurar no Luvik</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Guia visual e rápido em 4 passos simples
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <ol className="space-y-3.5 text-xs text-slate-600">
                    <li className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center shrink-0">
                        1
                      </span>
                      <div>
                        <strong className="text-slate-800">Acesse o painel do Luvik:</strong>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Faça login na sua conta do Luvik em{' '}
                          <span className="font-mono text-emerald-700">app.luvik.com.br</span>.
                        </p>
                      </div>
                    </li>

                    <li className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div>
                        <strong className="text-slate-800">
                          Navegue até o menu de Integrações:
                        </strong>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          No menu lateral esquerdo, clique no ícone de engrenagem{' '}
                          <strong>Configurações</strong> &gt; <strong>Integrações</strong>.
                        </p>
                      </div>
                    </li>

                    <li className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center shrink-0">
                        3
                      </span>
                      <div>
                        <strong className="text-slate-800">Cole cada URL nos campos:</strong>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Localize a caixa <strong>&quot;Webhook&apos;s do Luvik&quot;</strong> e
                          cole as 3 URLs correspondentes: Negócio Criado, Negócio Ganho e Negócio
                          Perdido.
                        </p>
                      </div>
                    </li>

                    <li className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center shrink-0">
                        4
                      </span>
                      <div>
                        <strong className="text-slate-800">Clique em &quot;Salvar&quot;:</strong>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Pronto! O Luvik passará a enviar requisições automáticas sempre que os
                          eventos ocorrerem.
                        </p>
                      </div>
                    </li>
                  </ol>

                  <div className="pt-2">
                    <a
                      href="https://ajuda.luvik.com.br/integracao-webhook/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#0B7A5B] hover:text-[#095C44] font-semibold hover:underline"
                    >
                      <span>Ver documentação oficial na Central de Ajuda Luvik</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Histórico e Logs Luvik */}
          <Card className="border-slate-200/80 shadow-xs bg-white">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#0B7A5B]" />
                  <span>Últimos Eventos Recebidos do Luvik</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Histórico em tempo real para auditoria dos webhooks Luvik
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {luvikLogs.length} registro(s)
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadLuvikData}
                  className="h-8 text-xs text-slate-600 gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLuvik ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {luvikLogs.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Webhook className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    Nenhum evento recebido ainda
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Assim que você salvar as URLs no Luvik e realizar um teste ou criar um negócio,
                    os dados aparecerão nesta tabela.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Data / Hora</th>
                        <th className="py-3 px-4">Evento</th>
                        <th className="py-3 px-4">Lead Afetado</th>
                        <th className="py-3 px-4">ID Deal Luvik</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Mensagem</th>
                        <th className="py-3 px-4 text-right">Payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {luvikLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {formatDate(log.created)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge variant="outline" className="text-xs font-semibold">
                              {log.evento}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {log.lead_nome || '-'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {log.deal_id || '-'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {getStatusProcessamentoBadge(log.status_processamento)}
                          </td>
                          <td
                            className="py-3 px-4 text-slate-600 max-w-[280px] truncate"
                            title={log.mensagem}
                          >
                            {log.mensagem || '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {log.payload_bruto ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLogPayload(log.payload_bruto || null)}
                                className="h-7 px-2 text-[11px] text-[#0B7A5B] hover:text-[#095C44] hover:bg-emerald-50 gap-1"
                              >
                                <Code className="w-3 h-3" />
                                <span>Ver JSON</span>
                              </Button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Confirmar Regeneração de Token Luvik */}
      <Dialog open={confirmRegenerateLuvikOpen} onOpenChange={setConfirmRegenerateLuvikOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Regenerar Token do Luvik?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed pt-1">
              Atenção: Ao regenerar o token,{' '}
              <strong>as URLs antigas serão invalidadas imediatamente</strong>. Você precisará
              atualizar os campos correspondentes no Luvik.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmRegenerateLuvikOpen(false)}
              disabled={regeneratingLuvik}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleRegenerateLuvikToken}
              disabled={regeneratingLuvik}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regeneratingLuvik ? 'animate-spin' : ''}`} />
              <span>{regeneratingLuvik ? 'Regenerando...' : 'Confirmar e Regenerar'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar Regeneração de Token Site */}
      <Dialog open={confirmRegenerateSiteOpen} onOpenChange={setConfirmRegenerateSiteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Regenerar Token do Formulário do Site?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed pt-1">
              Atenção: Ao regenerar o token, o formulário no site{' '}
              <strong className="text-slate-800">ecoenergy.net.br</strong> precisará ser atualizado
              com o novo token para continuar enviando leads para o CRM.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmRegenerateSiteOpen(false)}
              disabled={regeneratingSite}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleRegenerateSiteToken}
              disabled={regeneratingSite}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regeneratingSite ? 'animate-spin' : ''}`} />
              <span>{regeneratingSite ? 'Regenerando...' : 'Confirmar e Regenerar'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Ver Payload Bruto do Log */}
      <Dialog
        open={!!selectedLogPayload}
        onOpenChange={(open) => !open && setSelectedLogPayload(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Code className="w-5 h-5 text-[#0B7A5B]" />
              <span>Payload Bruto Recebido (JSON)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Dados brutos enviados na requisição
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto my-2 p-3 bg-slate-900 rounded-lg border border-slate-800">
            <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap break-all leading-relaxed">
              {JSON.stringify(selectedLogPayload, null, 2)}
            </pre>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLogPayload(null)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
