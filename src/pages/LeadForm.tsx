import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Clock,
  Sparkles,
  Zap,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { LeadsService } from '@/services/leads'
import { useAuth } from '@/context/AuthContext'
import type { Lead, LeadOrigem, LeadStatus } from '@/types/crm'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'
import { formatDateBR } from '@/lib/solarUtils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'

const ORIGENS: LeadOrigem[] = ['Indicação', 'Site', 'Redes Sociais', 'Evento', 'Parceria', 'Outros']

const STATUSES: LeadStatus[] = [
  'Novo',
  'Contato Feito',
  'Proposta Enviada',
  'Negociação',
  'Fechado Ganho',
  'Fechado Perdido',
]

const ESTADOS_BR = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]

export default function LeadForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)
  const [errorBanner, setErrorBanner] = useState('')

  // Form Fields
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [origem, setOrigem] = useState<LeadOrigem>('Site')
  const [consumoMensal, setConsumoMensal] = useState<number | string>(450)
  const [endereco, setEndereco] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('SP')
  const [status, setStatus] = useState<LeadStatus>('Novo')
  const [prPostEncerramento, setPrPostEncerramento] = useState('')
  const [slaDias, setSlaDias] = useState<number>(7)
  const [precoVenda, setPrecoVenda] = useState<number | string>(18000)

  // Load existing lead if editing
  useEffect(() => {
    if (isEditing && id) {
      LeadsService.getLeadById(id)
        .then((lead) => {
          setNome(lead.nome)
          setEmail(lead.email)
          setTelefone(lead.telefone || '')
          setOrigem(lead.origem || 'Site')
          setConsumoMensal(lead.consumo_mensal_kwh || '')
          setEndereco(lead.endereco || '')
          setCidade(lead.cidade || '')
          setEstado(lead.estado || 'SP')
          setStatus(lead.status)
          setPrPostEncerramento(
            lead.pr_post_encerramento ? lead.pr_post_encerramento.substring(0, 10) : '',
          )
          setSlaDias(lead.sla_dias || 7)
          setPrecoVenda(lead.preco_venda || '')
        })
        .catch((err) => {
          console.error('Error loading lead:', err)
          toast({
            title: 'Erro ao carregar',
            description: 'Lead não encontrado ou sem permissão.',
            variant: 'destructive',
          })
          navigate('/leads')
        })
        .finally(() => setLoading(false))
    }
  }, [id, isEditing, navigate])

  // SLA Live preview calculation
  const computedDeadlineDate = React.useMemo(() => {
    const days = Number(slaDias) || 7
    const now = new Date()
    const target = new Date(now.getTime() + days * 86400000)
    return formatDateBR(target.toISOString())
  }, [slaDias])

  const applyRecommendedSla = (days: number) => {
    setSlaDias(days)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBanner('')

    const cleanNome = nome.trim()
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanNome) {
      setErrorBanner('Por favor, preencha o Nome Completo do lead.')
      return
    }

    if (!cleanEmail) {
      setErrorBanner('Por favor, preencha o E-mail do lead.')
      return
    }

    // Validação básica de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      setErrorBanner('Por favor, insira um endereço de e-mail válido (ex: cliente@email.com).')
      return
    }

    const numConsumo = Number(consumoMensal)
    if (isNaN(numConsumo) || numConsumo <= 0) {
      setErrorBanner('Por favor, informe um Consumo Mensal Médio válido em kWh maior que zero.')
      return
    }

    // Formatar estado: max 2 caracteres maiúsculos (ex: 'SP')
    const cleanEstado = estado.trim().toUpperCase().slice(0, 2)

    // Formatar pr_post_encerramento: campo tipo date do PocketBase aceita 'YYYY-MM-DD 00:00:00.000Z' ou 'YYYY-MM-DD'
    let formattedPrPost: string | undefined = undefined
    if (prPostEncerramento && prPostEncerramento.trim()) {
      const dateVal = prPostEncerramento.trim()
      // Se já está no formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
        formattedPrPost = `${dateVal} 00:00:00.000Z`
      } else {
        const d = new Date(dateVal)
        if (!isNaN(d.getTime())) {
          formattedPrPost = d.toISOString().substring(0, 10) + ' 00:00:00.000Z'
        }
      }
    }

    // Obter ID do proprietário
    let ownerId = user?.id || pb.authStore.record?.id || ''

    // Se estiver deslogado ou sem authStore, tentar recuperar token ou avisar
    if (!pb.authStore.isValid || !ownerId) {
      // Tentar refresh rápido de autenticação
      if (pb.authStore.token) {
        try {
          const authData = await pb.collection('users').authRefresh()
          ownerId = authData.record.id
        } catch (_) {
          // Token expirado
        }
      }
    }

    if (!isEditing && !ownerId) {
      setErrorBanner(
        'Sua sessão expirou ou não está identificada. Por favor, acesse a tela de login para se autenticar antes de cadastrar leads.',
      )
      return
    }

    try {
      setSubmitting(true)

      const payload: Record<string, unknown> = {
        nome: cleanNome,
        email: cleanEmail,
        telefone: telefone.trim(),
        origem,
        consumo_mensal_kwh: numConsumo,
        endereco: endereco.trim(),
        cidade: cidade.trim(),
        estado: cleanEstado || 'SP',
        status: status || 'Novo',
        sla_dias: Math.max(1, Number(slaDias) || 7),
        preco_venda: Math.max(0, Number(precoVenda) || 0),
      }

      if (formattedPrPost) {
        payload.pr_post_encerramento = formattedPrPost
      }

      let savedId = id

      if (isEditing && id) {
        await LeadsService.updateLead(id, payload as Partial<Lead>)
        toast({
          title: 'Lead atualizado com sucesso!',
          description: 'As alterações foram salvas com sucesso.',
        })
      } else {
        payload.proprietario = ownerId
        payload.historico = JSON.stringify([
          {
            data: new Date().toISOString(),
            tipo: 'criacao',
            descricao: `Lead cadastrado no sistema com status inicial '${status || 'Novo'}'.`,
          },
        ])
        const created = await LeadsService.createLead(payload as Partial<Lead>)
        savedId = created.id
        toast({
          title: 'Lead cadastrado com sucesso!',
          description: 'Nova oportunidade registrada no funil com SLA ativo.',
        })
      }

      navigate(`/leads/${savedId}`)
    } catch (err: unknown) {
      console.error('Error saving lead:', err)
      const fieldErrors = extractFieldErrors(err)
      const friendlyMsg = getErrorMessage(err)

      // Montar mensagem detalhada caso haja erros de campos específicos
      let displayError = friendlyMsg
      const specificFieldList = Object.entries(fieldErrors)
        .map(([field, msg]) => `• ${msg}`)
        .join('\n')

      if (specificFieldList && !friendlyMsg.includes('•')) {
        displayError = `${friendlyMsg}\n${specificFieldList}`
      }

      setErrorBanner(displayError)
      toast({
        title: 'Erro ao salvar lead',
        description:
          displayError.length > 120 ? displayError.substring(0, 117) + '...' : displayError,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B7A5B] mx-auto mb-2" />
        <p className="text-sm">Carregando dados do lead...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 select-none animate-fade-in-up pb-12">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/leads')}
            className="text-slate-500 hover:text-slate-900 -ml-2 h-9 px-2 gap-1 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Leads</span>
          </Button>
          <div className="h-4 w-px bg-slate-300"></div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {isEditing ? 'Editar Lead' : 'Novo Lead'}
          </h2>
        </div>
      </div>

      {errorBanner && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-sm animate-fade-in-up">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="w-full">
            <p className="font-semibold">Erro ao salvar lead</p>
            <div className="text-xs text-rose-600 mt-1 whitespace-pre-line leading-relaxed">
              {errorBanner}
            </div>
            {errorBanner.includes('sessão') && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="bg-white border-rose-300 text-rose-700 hover:bg-rose-100 text-xs h-8"
                >
                  Ir para página de Login
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Dados do Lead */}
        <Card className="border-slate-200/80 shadow-xs bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-[#0B7A5B]" />
              <span>Dados do Lead</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nome" className="text-xs font-semibold text-slate-700">
                  Nome Completo *
                </Label>
                <Input
                  id="nome"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Carlos Menezes"
                  className="h-10 text-sm border-slate-200 focus-visible:ring-[#0B7A5B]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  E-mail do Lead *
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="carlos@empresa.com.br"
                  className="h-10 text-sm border-slate-200 focus-visible:ring-[#0B7A5B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="telefone" className="text-xs font-semibold text-slate-700">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="h-10 text-sm border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="origem" className="text-xs font-semibold text-slate-700">
                  Origem do Contato
                </Label>
                <select
                  id="origem"
                  value={origem}
                  onChange={(e) => setOrigem(e.target.value as LeadOrigem)}
                  className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
                >
                  {ORIGENS.map((orig) => (
                    <option key={orig} value={orig}>
                      {orig}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Consumo e Endereço */}
        <Card className="border-slate-200/80 shadow-xs bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Consumo Solar & Localização</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="consumo" className="text-xs font-semibold text-slate-700">
                  Consumo Mensal Médio (kWh) *
                </Label>
                <Input
                  id="consumo"
                  type="number"
                  min="0"
                  required
                  value={consumoMensal}
                  onChange={(e) => setConsumoMensal(e.target.value)}
                  placeholder="Ex: 500"
                  className="h-10 text-sm font-semibold border-slate-200 focus-visible:ring-[#0B7A5B]"
                />
                <p className="text-[11px] text-slate-400">
                  Base utilizada para dimensionar o kit solar sugerido.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="precoVenda" className="text-xs font-semibold text-slate-700">
                  Preço de Venda Proposto (R$)
                </Label>
                <Input
                  id="precoVenda"
                  type="number"
                  min="0"
                  step="0.01"
                  value={precoVenda}
                  onChange={(e) => setPrecoVenda(e.target.value)}
                  placeholder="Ex: 18500"
                  className="h-10 text-sm font-semibold border-slate-200 focus-visible:ring-[#0B7A5B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="endereco" className="text-xs font-semibold text-slate-700">
                  Endereço / Logradouro
                </Label>
                <Input
                  id="endereco"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, Número, Bairro"
                  className="h-10 text-sm border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cidade" className="text-xs font-semibold text-slate-700">
                    Cidade
                  </Label>
                  <Input
                    id="cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Campinas"
                    className="h-10 text-sm border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="estado" className="text-xs font-semibold text-slate-700">
                    UF
                  </Label>
                  <select
                    id="estado"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full h-10 px-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
                  >
                    {ESTADOS_BR.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Funil & SLA */}
        <Card className="border-slate-200/80 shadow-xs bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0B7A5B]" />
              <span>Funil & Controle de SLA (Aceleração de Venda)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-semibold text-slate-700">
                  Estágio no Funil
                </Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LeadStatus)}
                  className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
                >
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prPost" className="text-xs font-semibold text-slate-700">
                  Previsão Encerramento Proposta (Opcional)
                </Label>
                <Input
                  id="prPost"
                  type="date"
                  value={prPostEncerramento}
                  onChange={(e) => setPrPostEncerramento(e.target.value)}
                  className="h-10 text-sm border-slate-200"
                />
              </div>
            </div>

            {/* SLA Days & live calculation */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Label htmlFor="slaDias" className="text-xs font-bold text-slate-800">
                    Prazo SLA Máximo (em dias)
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Atrasos após esta janela acionam alertas visuais em vermelho para a equipe.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="slaDias"
                    type="number"
                    min="1"
                    max="90"
                    value={slaDias}
                    onChange={(e) => setSlaDias(Number(e.target.value))}
                    className="w-24 h-10 text-center font-bold font-mono-numbers text-base border-slate-300 bg-white"
                  />
                  <span className="text-xs font-semibold text-slate-600">dias</span>
                </div>
              </div>

              {/* Recommended chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-slate-400 text-[11px] font-semibold uppercase">
                  Recomendados:
                </span>
                <button
                  type="button"
                  onClick={() => applyRecommendedSla(7)}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium"
                >
                  7d (Novo)
                </button>
                <button
                  type="button"
                  onClick={() => applyRecommendedSla(10)}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium"
                >
                  10d (Contato)
                </button>
                <button
                  type="button"
                  onClick={() => applyRecommendedSla(15)}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium"
                >
                  15d (Proposta)
                </button>
                <button
                  type="button"
                  onClick={() => applyRecommendedSla(21)}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium"
                >
                  21d (Negociação)
                </button>
              </div>

              {/* Live computed deadline preview */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-xs">
                <span className="text-slate-600">
                  Data Limite estimada com base no SLA:{' '}
                  <span className="font-bold text-[#0B7A5B] font-mono-numbers">
                    {computedDeadlineDate}
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 italic">
                  Computada automaticamente no salvamento
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/leads')}
            className="text-slate-600 border-slate-200"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="bg-[#0B7A5B] hover:bg-[#095C44] text-white font-semibold shadow-sm shadow-[#0B7A5B]/30 gap-1.5 px-6 h-10 rounded-lg"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Lead</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
