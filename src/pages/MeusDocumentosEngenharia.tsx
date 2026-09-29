import React, { useState, useEffect, useMemo } from 'react'
import {
  FolderOpen,
  Download,
  CheckCircle2,
  Clock,
  User as UserIcon,
  UserCheck,
  Search,
  FileCheck,
  FileText,
  MapPin,
  Phone,
  RefreshCw,
  SunMedium,
  Zap,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  AlertCircle,
  Kanban,
  FileUp,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { DocumentoLead, DossieTecnicoEngenharia, HomologacaoLead, User } from '@/types/crm'
import { CATEGORIAS_DOCUMENTOS, LeadDocumentosService } from '@/services/leadDocumentos'
import { HomologacaoService } from '@/services/homologacao'
import { KanbanHomologacao } from '@/components/KanbanHomologacao'
import { EnviarArtModal } from '@/components/EnviarArtModal'
import { FichaTrabalhoEngenheiroModal } from '@/components/FichaTrabalhoEngenheiroModal'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatDateBR, formatDateTimeBR } from '@/lib/solarUtils'

export default function MeusDocumentosEngenharia() {
  const { user, isEngenheiro, isAdmin, podeSupervisionarEngenharia } = useAuth()
  const [activeTab, setActiveTab] = useState<'kanban' | 'documentos'>('kanban')
  const [documentos, setDocumentos] = useState<DocumentoLead[]>([])
  const [dossies, setDossies] = useState<DossieTecnicoEngenharia[]>([])
  const [homologacoes, setHomologacoes] = useState<HomologacaoLead[]>([])
  const [engenheirosList, setEngenheirosList] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEscopo, setFiltroEscopo] = useState<'todos' | 'meus'>('todos')
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todas')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [expandedLeads, setExpandedLeads] = useState<Record<string, boolean>>({})

  // Modal Enviar ART
  const [artModalOpen, setArtModalOpen] = useState(false)
  const [selectedHomologacaoForArt, setSelectedHomologacaoForArt] =
    useState<HomologacaoLead | null>(null)

  // Ficha de Trabalho do Engenheiro
  const [fichaModalOpen, setFichaModalOpen] = useState(false)
  const [selectedHomologacaoForFicha, setSelectedHomologacaoForFicha] =
    useState<HomologacaoLead | null>(null)

  const fetchDocumentos = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      // Se for Admin ou Engenheiro Supervisor com podeSupervisionarEngenharia:
      // Traz todos os registros da área técnica permitidos pelo backend RLS.
      // Se não tiver permissão de supervisão, traz estritamente os seus registros vinculados a user.id.
      const podeVerTodos = isAdmin || podeSupervisionarEngenharia
      const [docs, dossiesData, homData, engs] = await Promise.all([
        LeadDocumentosService.getDocumentosByEngenheiro(
          podeVerTodos ? undefined : user.id,
          isAdmin,
          podeSupervisionarEngenharia,
        ),
        LeadDocumentosService.getDossiesByEngenheiro(user.id, isAdmin, podeSupervisionarEngenharia),
        HomologacaoService.getHomologacoes(
          podeVerTodos
            ? { isAdmin, podeSupervisionar: podeSupervisionarEngenharia }
            : { engenheiroId: user.id, isAdmin: false },
        ),
        LeadDocumentosService.getEngenheiros(),
      ])
      setDocumentos(docs)
      setDossies(dossiesData)
      setHomologacoes(homData)
      setEngenheirosList(engs)

      // Por padrão expande todos os cards
      const expMap: Record<string, boolean> = {}
      docs.forEach((d) => {
        const lid = d.lead || 'sem_lead'
        expMap[lid] = true
      })
      dossiesData.forEach((ds) => {
        const lid = ds.lead || 'sem_lead'
        expMap[lid] = true
      })
      setExpandedLeads(expMap)
    } catch (err) {
      console.error('Erro ao buscar documentos e dossiês da engenharia:', err)
      toast({
        title: 'Erro ao carregar documentos',
        description: 'Não foi possível carregar os dados direcionados a você.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocumentos()
  }, [user?.id, podeSupervisionarEngenharia])

  // Mapa de id do engenheiro -> nome legível
  const engenheirosMap = useMemo(() => {
    const map: Record<string, string> = {}
    // Preenche com engenheiros cadastrados no banco
    engenheirosList.forEach((e) => {
      if (e.id) {
        map[e.id] = e.name || e.email || 'Engenheiro'
      }
    })
    // Também adiciona o usuário logado caso seja engenheiro/admin
    if (user?.id) {
      map[user.id] = user.name || user.email || 'Engenheiro'
    }
    // E aproveita expands já resolvidos
    homologacoes.forEach((h) => {
      if (h.engenheiro && h.expand?.engenheiro?.name) {
        map[h.engenheiro] = h.expand.engenheiro.name
      }
    })
    dossies.forEach((ds) => {
      if (ds.engenheiro_destino && ds.expand?.engenheiro_destino?.name) {
        map[ds.engenheiro_destino] = ds.expand.engenheiro_destino.name
      }
    })
    documentos.forEach((dc) => {
      if (dc.engenheiro_destino && dc.expand?.engenheiro_destino?.name) {
        map[dc.engenheiro_destino] = dc.expand.engenheiro_destino.name
      }
    })
    return map
  }, [engenheirosList, user, homologacoes, dossies, documentos])

  const toggleLeadExpanded = (leadId: string) => {
    setExpandedLeads((prev) => ({
      ...prev,
      [leadId]: !prev[leadId],
    }))
  }

  const handleDownload = async (doc: DocumentoLead) => {
    const url = LeadDocumentosService.getFileUrl(doc)
    if (!url) {
      toast({
        title: 'Arquivo indisponível',
        description: 'Não foi possível localizar o arquivo no servidor.',
        variant: 'destructive',
      })
      return
    }

    // Se ainda não foi visualizado, registra no backend
    if (!doc.visualizado_em) {
      try {
        await LeadDocumentosService.marcarComoVisualizado(doc.id)
        setDocumentos((prev) =>
          prev.map((d) =>
            d.id === doc.id ? { ...d, visualizado_em: new Date().toISOString() } : d,
          ),
        )
      } catch (err) {
        console.warn('Erro ao marcar doc como visualizado:', err)
      }
    }

    window.open(url, '_blank')
  }

  // Mapa de dossiês mais recentes por lead
  const dossiePorLead = dossies.reduce<Record<string, DossieTecnicoEngenharia>>((acc, ds) => {
    const lid = ds.lead || 'sem_lead'
    if (!acc[lid]) {
      acc[lid] = ds
    }
    return acc
  }, {})

  // Marcação do dossiê como visualizado pelo engenheiro
  const handleMarcarDossieVisualizado = async (dossieId: string) => {
    try {
      await LeadDocumentosService.marcarDossieComoVisualizado(dossieId)
      setDossies((prev) =>
        prev.map((ds) =>
          ds.id === dossieId ? { ...ds, visualizado_em: new Date().toISOString() } : ds,
        ),
      )
    } catch (err) {
      console.warn('Erro ao marcar dossiê como visualizado:', err)
    }
  }

  // Filtragem
  const filteredDocs = documentos.filter((doc) => {
    const leadNome = doc.expand?.lead?.nome?.toLowerCase() || ''
    const leadCidade = doc.expand?.lead?.cidade?.toLowerCase() || ''
    const docNome = (doc.nome_original || doc.arquivo || '').toLowerCase()
    const ds = dossiePorLead[doc.lead]
    const dsCliente = ds?.cliente_nome?.toLowerCase() || ''
    const dsCidade = ds?.cliente_cidade?.toLowerCase() || ''
    const dsUc = ds?.unidade_consumidora?.toLowerCase() || ''
    const query = search.toLowerCase().trim()

    const matchesSearch =
      !query ||
      leadNome.includes(query) ||
      leadCidade.includes(query) ||
      docNome.includes(query) ||
      dsCliente.includes(query) ||
      dsCidade.includes(query) ||
      dsUc.includes(query)

    const matchesCategoria = categoriaFilter === 'todas' || doc.categoria === categoriaFilter

    const isDocNovo = !doc.visualizado_em
    const isDossieNovo = ds && !ds.visualizado_em
    const matchesStatus =
      statusFilter === 'todos' ||
      (statusFilter === 'visualizados' && !!doc.visualizado_em) ||
      (statusFilter === 'novos' && (isDocNovo || isDossieNovo))

    return matchesSearch && matchesCategoria && matchesStatus
  })

  // Agrupamento por lead combinando documentos e dossiê técnico
  const groupedByLead = filteredDocs.reduce<
    Record<
      string,
      {
        lead: any
        dossie?: DossieTecnicoEngenharia
        docs: DocumentoLead[]
      }
    >
  >((acc, doc) => {
    const leadId = doc.lead || 'sem_lead'
    const ds = dossiePorLead[leadId]
    if (!acc[leadId]) {
      acc[leadId] = {
        lead: doc.expand?.lead || {
          nome: ds?.cliente_nome || 'Lead sem nome',
          cidade: ds?.cliente_cidade || '',
          telefone: ds?.cliente_telefone || '',
        },
        dossie: ds,
        docs: [],
      }
    }
    acc[leadId].docs.push(doc)
    return acc
  }, {})

  // Inclui também leads que tenham dossiê mesmo que os filtros de categoria/status não correspondam a documentos
  if (categoriaFilter === 'todas') {
    dossies.forEach((ds) => {
      const leadId = ds.lead || 'sem_lead'
      const query = search.toLowerCase().trim()
      const matchesSearch =
        !query ||
        (ds.cliente_nome && ds.cliente_nome.toLowerCase().includes(query)) ||
        (ds.cliente_cidade && ds.cliente_cidade.toLowerCase().includes(query)) ||
        (ds.unidade_consumidora && ds.unidade_consumidora.toLowerCase().includes(query))

      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'visualizados' && !!ds.visualizado_em) ||
        (statusFilter === 'novos' && !ds.visualizado_em)

      if (matchesSearch && matchesStatus && !groupedByLead[leadId]) {
        groupedByLead[leadId] = {
          lead: {
            nome: ds.cliente_nome || 'Cliente',
            cidade: ds.cliente_cidade || '',
            telefone: ds.cliente_telefone || '',
          },
          dossie: ds,
          docs: documentos.filter((d) => d.lead === leadId),
        }
      }
    })
  }

  const getCategoryMeta = (categoria: string) => {
    return (
      CATEGORIAS_DOCUMENTOS.find((c) => c.key === categoria) || {
        label: categoria,
        descricao: '',
      }
    )
  }

  const getFileBadge = (filename?: string) => {
    if (!filename) return null
    const ext = filename.split('.').pop()?.toUpperCase() || 'ARQ'
    let style = 'bg-slate-100 text-slate-700 border-slate-300'
    if (ext === 'PDF') style = 'bg-rose-50 text-rose-700 border-rose-300'
    else if (['JPG', 'JPEG', 'PNG', 'WEBP'].includes(ext))
      style = 'bg-blue-50 text-blue-700 border-blue-300'
    return (
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-bold ${style}`}>
        {ext}
      </Badge>
    )
  }

  const leadsList = Object.values(groupedByLead)
  const totalDocsNaoVisualizados = documentos.filter((d) => !d.visualizado_em).length
  const totalDossiesNaoVisualizados = dossies.filter((ds) => !ds.visualizado_em).length
  const totalHomologacoesNovas = homologacoes.filter((h) => !h.visualizado_em).length
  const totalNaoVisualizados = totalDocsNaoVisualizados + totalDossiesNaoVisualizados

  // Total com ART aguardando pagamento
  const totalArtAguardando = homologacoes.filter((h) => h.art_status === 'enviada').length
  const totalArtPaga = homologacoes.filter((h) => h.art_status === 'paga').length

  const handleOpenEnviarArt = (hom: HomologacaoLead) => {
    setSelectedHomologacaoForArt(hom)
    setArtModalOpen(true)
  }

  const handleSelectCard = (hom: HomologacaoLead) => {
    // Ao clicar no card, abre a Ficha de Trabalho completa do cliente para o engenheiro
    setSelectedHomologacaoForFicha(hom)
    setFichaModalOpen(true)
  }

  const handleHomologacaoUpdatedFromFicha = (updatedHom: HomologacaoLead) => {
    setHomologacoes((prev) => prev.map((h) => (h.id === updatedHom.id ? updatedHom : h)))
    setSelectedHomologacaoForFicha(updatedHom)
  }

  // Filtragem no Kanban
  const filteredHomologacoes = homologacoes.filter((hom) => {
    // Filtro de escopo: Meus vs Todos (quando aplicável para supervisor/admin)
    if (filtroEscopo === 'meus' && user?.id && hom.engenheiro !== user.id) {
      return false
    }

    const query = search.toLowerCase().trim()
    if (!query) return true
    const cliente = (hom.cliente_nome || '').toLowerCase()
    const cidade = (hom.cliente_cidade || '').toLowerCase()
    const uc = (hom.unidade_consumidora || '').toLowerCase()
    const kit = (hom.kit_resumo || '').toLowerCase()
    return (
      cliente.includes(query) || cidade.includes(query) || uc.includes(query) || kit.includes(query)
    )
  })

  return (
    <div className="space-y-6 select-none animate-fade-in-up pb-12">
      {/* Header Corporativo Ecosolar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0B7A5B] flex items-center justify-center font-bold">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Engenharia & Homologação Solar</span>
                {isAdmin ? (
                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-semibold hover:bg-amber-100">
                    Visão Geral Admin / CEO
                  </Badge>
                ) : podeSupervisionarEngenharia ? (
                  <Badge className="bg-emerald-100 text-[#0B7A5B] border-emerald-300 font-semibold hover:bg-emerald-100">
                    Engenheiro Supervisor (Todos os Projetos)
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-100 text-[#0B7A5B] border-emerald-300 font-semibold hover:bg-emerald-100">
                    Meus Documentos
                  </Badge>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdmin
                  ? 'Visão consolidada de todas as homologações de todos os engenheiros, fluxo de ART e projetos'
                  : podeSupervisionarEngenharia
                    ? 'Supervisão ativa: acompanhamento e atuação plena nas homologações de toda a equipe de engenharia'
                    : 'Kanban de homologação Energisa, fluxo de ART para pagamento e dossiês técnicos atribuídos a você'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Alternância de Abas: Kanban de Homologação vs Fichas & Documentos */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/80 border border-slate-300/80">
            <button
              type="button"
              onClick={() => setActiveTab('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'kanban'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5 text-[#0B7A5B]" />
              <span>Kanban de Homologação</span>
              {homologacoes.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-[#0B7A5B] font-black">
                  {homologacoes.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('documentos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'documentos'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Dossiês & Arquivos</span>
              {documentos.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-black">
                  {documentos.length}
                </span>
              )}
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchDocumentos}
            disabled={loading}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/90 shadow-2xs bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Kanban className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Projetos no Kanban</p>
              <h3 className="text-xl font-bold text-slate-900">{homologacoes.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-2xs bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">ART Aguardando Pagamento</p>
              <h3 className="text-xl font-bold text-amber-600">{totalArtAguardando}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-2xs bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">ART Paga (Liberadas)</p>
              <h3 className="text-xl font-bold text-emerald-700">{totalArtPaga}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-2xs bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Arquivos & Dossiês</p>
              <h3 className="text-xl font-bold text-slate-900">{documentos.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente, cidade, unidade consumidora, engenheiro ou kit..."
            className="pl-9 h-9 text-xs border-slate-200"
          />
        </div>

        {/* Interruptor de Visão Meus vs Todos para Engenheiros com Supervisão ou Admins */}
        {(isAdmin || podeSupervisionarEngenharia) && (
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setFiltroEscopo('todos')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filtroEscopo === 'todos'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Todos os Projetos ({homologacoes.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroEscopo('meus')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filtroEscopo === 'meus'
                  ? 'bg-white text-[#0B7A5B] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Apenas Meus ({homologacoes.filter((h) => h.engenheiro === user?.id).length})
            </button>
          </div>
        )}

        {activeTab === 'documentos' && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0B7A5B]"
            >
              <option value="todas">Todas as Categorias</option>
              {CATEGORIAS_DOCUMENTOS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0B7A5B]"
            >
              <option value="todos">Todos os Status</option>
              <option value="novos">Apenas Novos (Não baixados)</option>
              <option value="visualizados">Já Visualizados</option>
            </select>
          </div>
        )}
      </div>

      {/* ABA 1: Kanban de Homologação (7 Colunas) */}
      {activeTab === 'kanban' && (
        <div className="space-y-3">
          {loading ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200/90">
              <div className="w-8 h-8 border-2 border-[#0B7A5B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Carregando Kanban de Homologação...</p>
            </div>
          ) : homologacoes.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200/90 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#0B7A5B] flex items-center justify-center mx-auto">
                <Kanban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Nenhum cliente em homologação no momento
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Assim que a equipe comercial anexar os documentos de um cliente e clicar em
                  "Enviar ao Engenheiro", o card entrará automaticamente na coluna{' '}
                  <strong className="text-slate-700">"Novo Cliente"</strong>.
                </p>
              </div>
            </div>
          ) : (
            <KanbanHomologacao
              homologacoes={filteredHomologacoes}
              onHomologacaoUpdated={(updated) => setHomologacoes(updated)}
              onOpenEnviarArt={handleOpenEnviarArt}
              onSelectCard={handleSelectCard}
              engenheirosMap={engenheirosMap}
            />
          )}
        </div>
      )}

      {/* ABA 2: Listagem Detalhada de Dossiês e Arquivos */}
      {activeTab === 'documentos' && (
        <>
          {loading ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200/90">
              <div className="w-8 h-8 border-2 border-[#0B7A5B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Carregando documentos da engenharia...</p>
            </div>
          ) : leadsList.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200/90 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {documentos.length === 0
                    ? 'Nenhum documento recebido até o momento'
                    : 'Nenhum documento corresponde aos filtros'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  {documentos.length === 0
                    ? 'Assim que a equipe comercial anexar os documentos de um cliente e clicar em "Enviar ao Engenheiro", os arquivos aparecerão aqui com notificação em tempo real.'
                    : 'Tente limpar a busca ou mudar os filtros de categoria e status.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {leadsList.map(({ lead, dossie, docs }) => {
                const temDocNaoVisualizado = docs.some((d) => !d.visualizado_em)
                const dossieNaoVisualizado = dossie && !dossie.visualizado_em
                const temNovidades = temDocNaoVisualizado || dossieNaoVisualizado

                return (
                  <Card
                    key={lead.id || Math.random().toString()}
                    className="border-slate-200/90 shadow-2xs bg-white overflow-hidden"
                  >
                    {/* Header do Lead com botão de expandir/recolher */}
                    <CardHeader
                      className={`py-3 px-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none transition-colors ${
                        temNovidades
                          ? 'bg-gradient-to-r from-amber-50/70 via-white to-amber-50/30'
                          : 'bg-gradient-to-r from-slate-50/90 via-white to-slate-50/50'
                      }`}
                      onClick={() => {
                        toggleLeadExpanded(lead.id || 'sem_lead')
                        if (dossie && !dossie.visualizado_em) {
                          handleMarcarDossieVisualizado(dossie.id)
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center border border-emerald-200 shrink-0">
                          {(lead.nome || 'L').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          {/* Nome do Engenheiro Responsável acima do nome do cliente */}
                          {(() => {
                            // Tenta encontrar o engenheiro responsável através do dossiê, da homologação vinculada ao lead ou dos documentos
                            const engId =
                              dossie?.engenheiro_destino ||
                              homologacoes.find((h) => h.lead === (lead.id || 'sem_lead'))
                                ?.engenheiro ||
                              docs.find((d) => d.engenheiro_destino)?.engenheiro_destino

                            const engNome =
                              (engId && engenheirosMap[engId]) ||
                              dossie?.expand?.engenheiro_destino?.name ||
                              docs.find((d) => d.expand?.engenheiro_destino?.name)?.expand
                                ?.engenheiro_destino?.name ||
                              homologacoes.find((h) => h.lead === (lead.id || 'sem_lead'))?.expand
                                ?.engenheiro?.name ||
                              (engId ? 'Engenheiro atribuído' : null)

                            if (!engNome) return null

                            return (
                              <div
                                className="inline-flex items-center gap-1 mb-1 text-[11px] font-medium text-slate-600 bg-white/90 px-2 py-0.5 rounded-md border border-slate-200/90 shadow-2xs"
                                title={`Engenheiro Responsável: ${engNome}`}
                              >
                                <UserCheck className="w-3 h-3 text-[#0B7A5B] shrink-0" />
                                <span className="text-slate-500 font-normal">
                                  Eng. Responsável:
                                </span>
                                <span className="font-bold text-slate-900">{engNome}</span>
                              </div>
                            )
                          })()}

                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 leading-tight">
                              {lead.nome || 'Cliente sem nome'}
                            </h3>
                            {dossie?.versao && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold ${
                                  dossieNaoVisualizado
                                    ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse font-bold'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                v{dossie.versao}
                              </Badge>
                            )}
                            {temNovidades && (
                              <Badge
                                variant="outline"
                                className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold gap-1 animate-pulse"
                              >
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>
                                  {dossieNaoVisualizado && temDocNaoVisualizado
                                    ? 'Versão & Docs Novos'
                                    : dossieNaoVisualizado
                                      ? 'Nova Versão Dossiê'
                                      : 'Novos Documentos'}
                                </span>
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-0.5">
                            {(lead.cidade || dossie?.cliente_cidade) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#0B7A5B]" />
                                <span>{dossie?.cliente_cidade || lead.cidade}</span>
                              </span>
                            )}
                            {(lead.telefone || dossie?.cliente_telefone) && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{dossie?.cliente_telefone || lead.telefone}</span>
                              </span>
                            )}
                            {dossie?.unidade_consumidora && (
                              <span className="flex items-center gap-1 font-semibold text-emerald-800">
                                <span>UC: {dossie.unidade_consumidora}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-semibold"
                        >
                          {docs.length} {docs.length === 1 ? 'arquivo' : 'arquivos'}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-slate-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleLeadExpanded(lead.id || 'sem_lead')
                          }}
                        >
                          {expandedLeads[lead.id || 'sem_lead'] ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>

                    {/* SEÇÃO: Dados para Projeto (Dossiê Técnico Negociado) */}
                    {dossie && (
                      <div className="p-4 bg-slate-50/40 border-b border-slate-200/80 space-y-3">
                        <div className="flex items-center justify-between pb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-emerald-100 text-[#0B7A5B] flex items-center justify-center">
                              <Cpu className="w-3.5 h-3.5" />
                            </div>
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                              Dados para Projeto (Somente o Negociado)
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            {dossie.enviado_em && (
                              <span className="text-[11px] text-slate-400">
                                Enviado em {formatDateTimeBR(dossie.enviado_em)}
                              </span>
                            )}
                            {!dossie.visualizado_em && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarcarDossieVisualizado(dossie.id)}
                                className="h-6 px-2 text-[10px] font-semibold text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                              >
                                Marcar como lido
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {/* Card 1: Cliente & Contato */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Cliente & Contato
                            </span>
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {dossie.cliente_nome || lead.nome}
                            </p>
                            <p className="text-xs text-slate-600 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>
                                {dossie.cliente_telefone || lead.telefone || 'Não informado'}
                              </span>
                            </p>
                            {dossie.cliente_email && (
                              <p
                                className="text-[11px] text-slate-500 truncate"
                                title={dossie.cliente_email}
                              >
                                {dossie.cliente_email}
                              </p>
                            )}
                          </div>

                          {/* Card 2: Local & Unidade Consumidora */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Local & Unidade Consumidora
                            </span>
                            <p
                              className="text-xs text-slate-700 leading-snug line-clamp-2"
                              title={dossie.endereco_instalacao}
                            >
                              <MapPin className="w-3 h-3 text-[#0B7A5B] inline mr-1" />
                              {dossie.endereco_instalacao || lead.cidade || 'Não informado'}
                            </p>
                            <div className="pt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="text-slate-500">UC:</span>
                              <strong className="text-[#0B7A5B] font-mono-numbers">
                                {dossie.unidade_consumidora || 'Não informada'}
                              </strong>
                            </div>
                            {dossie.consumo_medio_kwh !== undefined && (
                              <p className="text-[11px] text-slate-500">
                                Consumo:{' '}
                                <strong className="text-slate-800">
                                  {dossie.consumo_medio_kwh} kWh/mês
                                </strong>
                              </p>
                            )}
                          </div>

                          {/* Card 3: Kit Negociado - Painéis */}
                          <div className="bg-white p-3 rounded-lg border border-amber-200/90 shadow-2xs space-y-1 bg-amber-50/20">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                                <SunMedium className="w-3 h-3 text-amber-600" />
                                Painéis Negociados
                              </span>
                              {dossie.paineis_quantidade && dossie.paineis_potencia_w ? (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 bg-amber-100 text-amber-900 border-amber-300 font-bold font-mono-numbers"
                                >
                                  {Math.round(
                                    (dossie.paineis_quantidade * dossie.paineis_potencia_w) / 10,
                                  ) / 100}{' '}
                                  kWp
                                </Badge>
                              ) : null}
                            </div>

                            <p className="text-xs font-bold text-slate-900">
                              {dossie.paineis_quantidade
                                ? `${dossie.paineis_quantidade}x painéis de ${dossie.paineis_potencia_w || 630}W`
                                : 'Painéis fotovoltaicos'}
                            </p>
                            <p className="text-[11px] text-slate-600 truncate">
                              Modelo: <strong>{dossie.paineis_modelo || 'Padrão fornecido'}</strong>
                            </p>
                          </div>

                          {/* Card 4: Inversor & Estrutura */}
                          <div className="bg-white p-3 rounded-lg border border-blue-200/90 shadow-2xs space-y-1 bg-blue-50/20">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-blue-600" />
                              Inversor & Estrutura
                            </span>

                            <p className="text-xs font-bold text-slate-900">
                              {dossie.inversor_quantidade ? `${dossie.inversor_quantidade}x ` : ''}
                              Inversor {dossie.inversor_marca || 'Sungrow'}
                              {dossie.inversor_potencia_kw
                                ? ` ${dossie.inversor_potencia_kw} kW`
                                : ''}
                            </p>

                            <div className="pt-0.5 flex flex-wrap items-center gap-1 text-[11px]">
                              <span className="text-slate-500">Instalação:</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 font-bold ${
                                  dossie.tipo_instalacao === 'solo'
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                }`}
                              >
                                {dossie.tipo_instalacao === 'solo' ? 'Solo' : 'Telhado'}
                              </Badge>
                              {dossie.tipo_estrutura_detalhe && (
                                <span className="text-[10px] text-slate-500 truncate">
                                  ({dossie.tipo_estrutura_detalhe})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {dossie.observacoes && (
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-slate-900">
                                Observações da equipe comercial:
                              </strong>{' '}
                              <span>{dossie.observacoes}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tabela de Arquivos do Lead */}
                    {expandedLeads[lead.id || 'sem_lead'] && (
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="py-2.5 px-4">Documento</th>
                                <th className="py-2.5 px-4">Categoria Técnica</th>
                                <th className="py-2.5 px-4">Enviado por</th>
                                <th className="py-2.5 px-4">Data Envio</th>
                                <th className="py-2.5 px-4">Status</th>
                                <th className="py-2.5 px-4 text-right">Ação</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {docs.map((doc) => {
                                const meta = getCategoryMeta(doc.categoria)
                                const isVisualizado = !!doc.visualizado_em
                                const remetente =
                                  doc.expand?.enviado_por?.name ||
                                  doc.expand?.enviado_por?.email ||
                                  'Equipe Comercial'

                                return (
                                  <tr
                                    key={doc.id}
                                    className={`hover:bg-slate-50/60 transition-colors ${
                                      !isVisualizado ? 'bg-amber-50/30 font-medium' : ''
                                    }`}
                                  >
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2.5 max-w-sm">
                                        {getFileBadge(doc.nome_original || doc.arquivo)}
                                        <div className="truncate">
                                          <span
                                            className="text-slate-800 font-semibold hover:text-[#0B7A5B] cursor-pointer truncate block"
                                            onClick={() => handleDownload(doc)}
                                            title={doc.nome_original || doc.arquivo}
                                          >
                                            {doc.nome_original || doc.arquivo}
                                          </span>
                                          <span className="text-[10px] text-slate-400">
                                            {LeadDocumentosService.formatFileSize(
                                              doc.tamanho_bytes,
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="py-3 px-4">
                                      <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                                        {meta.label}
                                      </span>
                                    </td>

                                    <td className="py-3 px-4 text-slate-600">
                                      <div className="flex items-center gap-1.5">
                                        <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate max-w-[130px]">{remetente}</span>
                                      </div>
                                    </td>

                                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                      {doc.enviado_em
                                        ? formatDateTimeBR(doc.enviado_em)
                                        : formatDateBR(doc.created)}
                                    </td>

                                    <td className="py-3 px-4">
                                      {isVisualizado ? (
                                        <Badge
                                          variant="outline"
                                          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold gap-1"
                                        >
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span>Visualizado</span>
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold gap-1 animate-pulse"
                                        >
                                          <Clock className="w-3 h-3 text-amber-600" />
                                          <span>Novo</span>
                                        </Badge>
                                      )}
                                    </td>

                                    <td className="py-3 px-4 text-right">
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleDownload(doc)}
                                        className="h-7.5 px-3 text-xs bg-[#0B7A5B] hover:bg-[#095C44] text-white font-semibold gap-1.5 shadow-2xs"
                                        title="Baixar / Visualizar arquivo"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Baixar</span>
                                      </Button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modal de Envio da ART para Pagamento */}
      <EnviarArtModal
        homologacao={selectedHomologacaoForArt}
        open={artModalOpen}
        onOpenChange={setArtModalOpen}
        onSuccess={({ homologacaoId, artStatus, artArquivo }) => {
          setHomologacoes((prev) =>
            prev.map((h) =>
              h.id === homologacaoId
                ? {
                    ...h,
                    art_status: 'enviada',
                    art_arquivo: artArquivo || h.art_arquivo,
                    art_enviada_em: new Date().toISOString(),
                  }
                : h,
            ),
          )
          if (selectedHomologacaoForFicha?.id === homologacaoId) {
            setSelectedHomologacaoForFicha((prev) =>
              prev
                ? {
                    ...prev,
                    art_status: 'enviada',
                    art_arquivo: artArquivo || prev.art_arquivo,
                    art_enviada_em: new Date().toISOString(),
                  }
                : null,
            )
          }
        }}
      />

      {/* Ficha de Trabalho do Engenheiro */}
      {selectedHomologacaoForFicha && (
        <FichaTrabalhoEngenheiroModal
          open={fichaModalOpen}
          onOpenChange={setFichaModalOpen}
          homologacao={selectedHomologacaoForFicha}
          dossie={
            (selectedHomologacaoForFicha.lead
              ? dossiePorLead[selectedHomologacaoForFicha.lead]
              : null) ||
            selectedHomologacaoForFicha.expand?.dossie ||
            null
          }
          documentosCliente={
            selectedHomologacaoForFicha.lead
              ? documentos.filter((d) => d.lead === selectedHomologacaoForFicha.lead)
              : []
          }
          onHomologacaoUpdated={handleHomologacaoUpdatedFromFicha}
          onOpenEnviarArt={(hom) => {
            setSelectedHomologacaoForArt(hom)
            setArtModalOpen(true)
          }}
        />
      )}
    </div>
  )
}
