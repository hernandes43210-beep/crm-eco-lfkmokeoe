import React, { useState, useEffect } from 'react'
import {
  FolderOpen,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  User as UserIcon,
  Search,
  ExternalLink,
  ShieldAlert,
  FileCheck,
  FileText,
  BadgeAlert,
  MapPin,
  Phone,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { DocumentoLead } from '@/types/crm'
import { CATEGORIAS_DOCUMENTOS, LeadDocumentosService } from '@/services/leadDocumentos'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatDateBR, formatDateTimeBR } from '@/lib/solarUtils'

export default function MeusDocumentosEngenharia() {
  const { user, isEngenheiro, isAdmin } = useAuth()
  const [documentos, setDocumentos] = useState<DocumentoLead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todas')
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  const fetchDocumentos = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const docs = await LeadDocumentosService.getDocumentosByEngenheiro(user.id)
      setDocumentos(docs)
    } catch (err) {
      console.error('Erro ao buscar documentos da engenharia:', err)
      toast({
        title: 'Erro ao carregar documentos',
        description: 'Não foi possível carregar os documentos direcionados a você.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocumentos()
  }, [user?.id])

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

  // Filtragem
  const filteredDocs = documentos.filter((doc) => {
    const leadNome = doc.expand?.lead?.nome?.toLowerCase() || ''
    const leadCidade = doc.expand?.lead?.cidade?.toLowerCase() || ''
    const docNome = (doc.nome_original || doc.arquivo || '').toLowerCase()
    const query = search.toLowerCase().trim()

    const matchesSearch =
      !query || leadNome.includes(query) || leadCidade.includes(query) || docNome.includes(query)

    const matchesCategoria = categoriaFilter === 'todas' || doc.categoria === categoriaFilter

    const matchesStatus =
      statusFilter === 'todos' ||
      (statusFilter === 'visualizados' && !!doc.visualizado_em) ||
      (statusFilter === 'novos' && !doc.visualizado_em)

    return matchesSearch && matchesCategoria && matchesStatus
  })

  // Agrupamento por lead para visualização mais limpa
  const groupedByLead = filteredDocs.reduce<Record<string, { lead: any; docs: DocumentoLead[] }>>(
    (acc, doc) => {
      const leadId = doc.lead || 'sem_lead'
      if (!acc[leadId]) {
        acc[leadId] = {
          lead: doc.expand?.lead || {
            nome: 'Lead não identificado',
            cidade: '',
            telefone: '',
          },
          docs: [],
        }
      }
      acc[leadId].docs.push(doc)
      return acc
    },
    {},
  )

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
  const totalNaoVisualizados = documentos.filter((d) => !d.visualizado_em).length

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
                <span>Meus Documentos Recebidos</span>
                <Badge className="bg-emerald-100 text-[#0B7A5B] border-emerald-300 font-semibold hover:bg-emerald-100">
                  Área de Engenharia
                </Badge>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Projetos, contas de energia, datasheets e procurações encaminhados pela equipe
                comercial para homologação
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200/90 shadow-2xs bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0B7A5B] flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total de Documentos</p>
              <h3 className="text-xl font-bold text-slate-900">{documentos.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-2xs bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Novos / Não Visualizados</p>
              <h3 className="text-xl font-bold text-amber-600">{totalNaoVisualizados}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-2xs bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Leads em Homologação</p>
              <h3 className="text-xl font-bold text-slate-900">{leadsList.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do cliente, cidade ou arquivo..."
            className="pl-9 h-9 text-xs border-slate-200"
          />
        </div>

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
      </div>

      {/* Conteúdo Principal: Listagem agrupada por Lead */}
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
          {leadsList.map(({ lead, docs }) => (
            <Card
              key={lead.id || Math.random().toString()}
              className="border-slate-200/90 shadow-2xs bg-white overflow-hidden"
            >
              {/* Header do Lead */}
              <CardHeader className="py-3 px-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center border border-emerald-200 shrink-0">
                    {(lead.nome || 'L').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {lead.nome || 'Cliente sem nome'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      {lead.cidade && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#0B7A5B]" />
                          <span>{lead.cidade}</span>
                        </span>
                      )}
                      {lead.telefone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{lead.telefone}</span>
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
                    {docs.length} {docs.length === 1 ? 'arquivo anexado' : 'arquivos anexados'}
                  </Badge>
                </div>
              </CardHeader>

              {/* Tabela de Arquivos do Lead */}
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
                                    {LeadDocumentosService.formatFileSize(doc.tamanho_bytes)}
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
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
