import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FolderOpen,
  Download,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileUp,
  FileText,
  MapPin,
  Phone,
  SunMedium,
  Zap,
  Cpu,
  Layers,
  History,
  AlertCircle,
  FileCheck,
  Send,
  Loader2,
  Trash2,
  Calendar,
  Building,
  User as UserIcon,
  Receipt,
  FileCheck2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type {
  HomologacaoLead,
  HomologacaoStatus,
  DossieTecnicoEngenharia,
  DocumentoLead,
  ArquivoEngenharia,
} from '@/types/crm'
import {
  COLUNAS_HOMOLOGACAO,
  CATEGORIAS_ARQUIVOS_ENGENHARIA,
  SEQUENCIA_ETAPAS_HOMOLOGACAO,
  HomologacaoService,
} from '@/services/homologacao'
import { CATEGORIAS_DOCUMENTOS, LeadDocumentosService } from '@/services/leadDocumentos'
import { toast } from '@/hooks/use-toast'
import { formatDateBR, formatDateTimeBR } from '@/lib/solarUtils'

interface FichaTrabalhoEngenheiroModalProps {
  homologacao: HomologacaoLead | null
  dossie?: DossieTecnicoEngenharia | null
  documentosCliente: DocumentoLead[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onHomologacaoUpdated: (updatedHomologacao: HomologacaoLead) => void
  onOpenEnviarArt: (hom: HomologacaoLead) => void
  onOpenAnexarComprovante?: (hom: HomologacaoLead, tipo?: 'art' | 'projeto') => void
}

export function FichaTrabalhoEngenheiroModal({
  homologacao,
  dossie,
  documentosCliente,
  open,
  onOpenChange,
  onHomologacaoUpdated,
  onOpenEnviarArt,
  onOpenAnexarComprovante,
}: FichaTrabalhoEngenheiroModalProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const [activeTab, setActiveTab] = useState<'acoes' | 'dossie' | 'arquivos' | 'historico'>('acoes')

  // Estado para avanço de etapa com observação
  const [observacaoEtapa, setObservacaoEtapa] = useState('')
  const [energisaResposta, setEnergisaResposta] = useState('')
  const [energisaData, setEnergisaData] = useState('')
  const [vistoriaData, setVistoriaData] = useState('')
  const [vistoriaObs, setVistoriaObs] = useState('')
  const [avancando, setAvancando] = useState(false)

  // Estado de upload de arquivos do processo
  const [arquivosProcesso, setArquivosProcesso] = useState<ArquivoEngenharia[]>([])
  const [loadingArquivos, setLoadingArquivos] = useState(false)
  const [arquivoFile, setArquivoFile] = useState<File | null>(null)
  const [arquivoCategoria, setArquivoCategoria] = useState<string>('projeto_eletrico')
  const [arquivoTitulo, setArquivoTitulo] = useState('')
  const [arquivoDescricao, setArquivoDescricao] = useState('')
  const [enviandoArquivo, setEnviandoArquivo] = useState(false)

  useEffect(() => {
    if (homologacao?.id && open) {
      carregarArquivosProcesso(homologacao.id)
      setEnergisaResposta(homologacao.energisa_resposta || '')
      setEnergisaData(homologacao.energisa_resposta_data || '')
      setVistoriaData(homologacao.vistoria_data || '')
      setVistoriaObs(homologacao.vistoria_observacao || '')
      setObservacaoEtapa('')
    }
  }, [homologacao?.id, open])

  const carregarArquivosProcesso = async (homId: string) => {
    try {
      setLoadingArquivos(true)
      const data = await HomologacaoService.getArquivosByHomologacao(homId)
      setArquivosProcesso(data)
    } catch (err) {
      console.warn('Erro ao carregar arquivos da homologação:', err)
    } finally {
      setLoadingArquivos(false)
    }
  }

  if (!homologacao) return null

  // Metadados da etapa atual
  const etapaAtualIndex = SEQUENCIA_ETAPAS_HOMOLOGACAO.findIndex((e) => e.id === homologacao.status)
  const etapaConfig =
    SEQUENCIA_ETAPAS_HOMOLOGACAO[etapaAtualIndex] || SEQUENCIA_ETAPAS_HOMOLOGACAO[0]
  const proximaEtapaId = etapaConfig.proximaEtapa
  const proximaEtapaConfig = SEQUENCIA_ETAPAS_HOMOLOGACAO.find((e) => e.id === proximaEtapaId)
  const colunaAtual = COLUNAS_HOMOLOGACAO.find((c) => c.id === homologacao.status)

  // Função para avançar etapa
  const handleAvancarEtapa = async (destinoStatus?: HomologacaoStatus) => {
    const targetStatus = destinoStatus || proximaEtapaId
    if (!targetStatus) return

    try {
      setAvancando(true)

      const dadosEtapa: Record<string, unknown> = {}
      if (targetStatus === 'resposta_energisa' || homologacao.status === 'homologacao') {
        if (energisaResposta) dadosEtapa.energisa_resposta = energisaResposta
        if (energisaData) dadosEtapa.energisa_resposta_data = energisaData
      }
      if (
        targetStatus === 'liberado_vistoria' ||
        targetStatus === 'vistoria_solicitada' ||
        targetStatus === 'entregue'
      ) {
        if (vistoriaData) dadosEtapa.vistoria_data = vistoriaData
        if (vistoriaObs) dadosEtapa.vistoria_observacao = vistoriaObs
      }

      const res = await HomologacaoService.moverStatus(
        homologacao.id,
        targetStatus,
        observacaoEtapa.trim() || undefined,
        dadosEtapa,
      )

      const novoHistorico = [
        ...(homologacao.historico || []),
        {
          data: new Date().toISOString(),
          tipo: 'movimentacao_kanban',
          descricao: `Avanço para ${targetStatus}${observacaoEtapa ? ` — Obs: ${observacaoEtapa}` : ''}`,
          para: targetStatus,
          de: homologacao.status,
          observacao: observacaoEtapa,
        },
      ]

      const updatedHomologacao: HomologacaoLead = {
        ...homologacao,
        status: targetStatus,
        energisa_resposta:
          (dadosEtapa.energisa_resposta as string) || homologacao.energisa_resposta,
        energisa_resposta_data:
          (dadosEtapa.energisa_resposta_data as string) || homologacao.energisa_resposta_data,
        vistoria_data: (dadosEtapa.vistoria_data as string) || homologacao.vistoria_data,
        vistoria_observacao:
          (dadosEtapa.vistoria_observacao as string) || homologacao.vistoria_observacao,
        historico: novoHistorico,
      }

      onHomologacaoUpdated(updatedHomologacao)

      const nomeDestino =
        SEQUENCIA_ETAPAS_HOMOLOGACAO.find((e) => e.id === targetStatus)?.nome || targetStatus
      toast({
        title: 'Etapa atualizada!',
        description: `Cliente avançou para "${nomeDestino}" com observação registrada.`,
      })

      setObservacaoEtapa('')
    } catch (err: any) {
      console.error('Erro ao avançar etapa:', err)
      toast({
        title: 'Erro ao avançar etapa',
        description: err?.message || 'Não foi possível salvar o avanço da etapa.',
        variant: 'destructive',
      })
    } finally {
      setAvancando(false)
    }
  }

  // Upload de arquivo
  const handleUploadArquivoProcesso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!arquivoFile) {
      toast({
        title: 'Arquivo obrigatório',
        description: 'Selecione um arquivo de até 30MB para anexar.',
        variant: 'destructive',
      })
      return
    }

    try {
      setEnviandoArquivo(true)
      const res = await HomologacaoService.anexarArquivoProcesso({
        homologacaoId: homologacao.id,
        categoria: arquivoCategoria,
        file: arquivoFile,
        titulo: arquivoTitulo.trim() || arquivoFile.name,
        descricao: arquivoDescricao.trim(),
        etapaOrigem: homologacao.status,
      })

      toast({
        title: 'Arquivo anexado com sucesso!',
        description: 'O documento foi adicionado ao processo de engenharia deste cliente.',
      })

      setArquivoFile(null)
      setArquivoTitulo('')
      setArquivoDescricao('')
      await carregarArquivosProcesso(homologacao.id)
    } catch (err: any) {
      console.error('Erro ao anexar arquivo de engenharia:', err)
      toast({
        title: 'Erro no envio do arquivo',
        description: err?.message || 'Não foi possível enviar o documento. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setEnviandoArquivo(false)
    }
  }

  const handleDeleteArquivo = async (arquivoId: string) => {
    if (!confirm('Deseja realmente remover este arquivo do processo?')) return
    try {
      const ok = await HomologacaoService.deleteArquivoProcesso(arquivoId)
      if (ok) {
        setArquivosProcesso((prev) => prev.filter((a) => a.id !== arquivoId))
        toast({
          title: 'Arquivo removido',
          description: 'O documento foi excluído com sucesso.',
        })
      }
    } catch (_) {
      toast({
        title: 'Erro ao remover arquivo',
        description: 'Não foi possível excluir o arquivo selecionado.',
        variant: 'destructive',
      })
    }
  }

  const getFileBadge = (filename?: string) => {
    if (!filename) return null
    const ext = filename.split('.').pop()?.toUpperCase() || 'ARQ'
    let style = 'bg-slate-100 text-slate-700 border-slate-300'
    if (ext === 'PDF') style = 'bg-rose-50 text-rose-700 border-rose-300'
    else if (['JPG', 'JPEG', 'PNG', 'WEBP'].includes(ext))
      style = 'bg-blue-50 text-blue-700 border-blue-300'
    else if (['DWG', 'DXF'].includes(ext)) style = 'bg-amber-50 text-amber-700 border-amber-300'
    return (
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-bold ${style}`}>
        {ext}
      </Badge>
    )
  }

  const isArtEnviada = homologacao.art_status === 'enviada'
  const isArtPaga = homologacao.art_status === 'paga'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 bg-white text-slate-900 border-slate-200 overflow-hidden shadow-2xl">
        {/* Header Corporativo com Status da Homologação */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 border-b border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center font-bold text-sm shrink-0">
                {(homologacao.cliente_nome || 'CL').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-extrabold text-white tracking-tight">
                    {homologacao.cliente_nome || 'Cliente em Homologação'}
                  </h2>
                  <Badge
                    className="text-xs font-bold text-white border-none shadow-2xs"
                    style={{ backgroundColor: colunaAtual?.cor || '#0B7A5B' }}
                  >
                    {colunaAtual?.titulo || homologacao.status}
                  </Badge>
                  {homologacao.versao_dossie && (
                    <Badge
                      variant="outline"
                      className="border-slate-600 text-slate-300 text-[10px]"
                    >
                      Dossiê v{homologacao.versao_dossie}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1">
                  {(homologacao.cliente_cidade || dossie?.cliente_cidade) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{homologacao.cliente_cidade || dossie?.cliente_cidade}</span>
                    </span>
                  )}
                  {(homologacao.cliente_telefone || dossie?.cliente_telefone) && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{homologacao.cliente_telefone || dossie?.cliente_telefone}</span>
                    </span>
                  )}
                  {homologacao.unidade_consumidora && (
                    <span className="flex items-center gap-1 font-semibold text-emerald-300">
                      <span>UC: {homologacao.unidade_consumidora}</span>
                    </span>
                  )}
                  {homologacao.potencia_total_kwp ? (
                    <span className="flex items-center gap-1 font-bold text-amber-300 font-mono">
                      <Zap className="w-3.5 h-3.5" />
                      <span>{homologacao.potencia_total_kwp} kWp</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Ação rápida da ART e Comprovante integrados no cabeçalho */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {isAdmin && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenAnexarComprovante?.(homologacao)}
                  className="text-xs font-bold gap-1.5 bg-emerald-500/10 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/20 hover:text-white"
                  title="Anexar comprovante de pagamento da ART ou do Projeto (Admin/CEO)"
                >
                  <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Anexar Comprovante</span>
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                onClick={() => onOpenEnviarArt(homologacao)}
                className={`text-xs font-bold gap-1.5 shadow-md ${
                  isArtPaga
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : isArtEnviada
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>
                  {isArtPaga
                    ? 'ART Paga (Reenviar se necessário)'
                    : isArtEnviada
                      ? 'ART Enviada (Reenviar)'
                      : 'Enviar ART para Pagamento'}
                </span>
              </Button>
            </div>
          </div>

          {/* Stepper horizontal das 7 etapas */}
          <div className="mt-4 pt-3 border-t border-slate-700/80 overflow-x-auto pb-1 scrollbar-thin">
            <div className="flex items-center gap-1 min-w-[680px]">
              {SEQUENCIA_ETAPAS_HOMOLOGACAO.map((et, idx) => {
                const isPassada = idx < etapaAtualIndex
                const isAtual = idx === etapaAtualIndex
                return (
                  <div key={et.id} className="flex items-center flex-1">
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all w-full ${
                        isAtual
                          ? 'bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-300/60 font-black'
                          : isPassada
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/50'
                            : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 bg-black/20">
                        {idx + 1}
                      </span>
                      <span className="truncate">{et.nome}</span>
                    </div>
                    {idx < SEQUENCIA_ETAPAS_HOMOLOGACAO.length - 1 && (
                      <div
                        className={`w-2 h-0.5 shrink-0 mx-0.5 ${
                          isPassada ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Abas da Ficha de Trabalho */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-5 pt-3 border-b border-slate-200 bg-slate-50/70">
            <TabsList className="bg-slate-200/80 p-1 rounded-xl h-10">
              <TabsTrigger
                value="acoes"
                className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-slate-900"
              >
                <ArrowRight className="w-3.5 h-3.5 text-[#0B7A5B]" />
                <span>Avançar Etapa & Ações</span>
              </TabsTrigger>

              <TabsTrigger
                value="dossie"
                className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-slate-900"
              >
                <Cpu className="w-3.5 h-3.5 text-blue-600" />
                <span>Dados para Projeto & Documentos</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 font-black">
                  {documentosCliente.length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="arquivos"
                className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-slate-900"
              >
                <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Arquivos do Processo (Engenharia)</span>
                {arquivosProcesso.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-black">
                    {arquivosProcesso.length}
                  </span>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="historico"
                className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-slate-900"
              >
                <History className="w-3.5 h-3.5 text-purple-600" />
                <span>Histórico de Movimentações</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* ============================================================== */}
            {/* ABA 1: AVANÇAR ETAPA & AÇÕES REAIS DO ENGENHEIRO               */}
            {/* ============================================================== */}
            <TabsContent value="acoes" className="space-y-5 m-0">
              {/* Card de Ação Principal: Próxima Etapa Sequencial */}
              <Card className="border-emerald-200/90 shadow-2xs bg-gradient-to-br from-emerald-50/50 via-white to-slate-50/50">
                <CardHeader className="pb-3 border-b border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0B7A5B] flex items-center justify-center font-bold">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-extrabold text-slate-900">
                          Ação Recomendada para o Engenheiro
                        </CardTitle>
                        <p className="text-xs text-slate-500">
                          Etapa atual:{' '}
                          <strong className="text-slate-800">{etapaConfig.nome}</strong>
                        </p>
                      </div>
                    </div>

                    {proximaEtapaConfig && (
                      <Badge className="bg-emerald-100 text-[#0B7A5B] border-emerald-300 font-bold text-xs">
                        Próxima: {proximaEtapaConfig.nome}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {proximaEtapaConfig ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
                        <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">
                          O que esta ação faz:
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {etapaConfig.descricaoAcao}. A mudança reflete instantaneamente no Kanban
                          e notifica o vendedor e os administradores.
                        </p>
                      </div>

                      {/* Campos Contextuais Conforme a Etapa */}
                      {/* Caso 1: Registrar Resposta da Energisa */}
                      {(homologacao.status === 'homologacao' ||
                        proximaEtapaId === 'resposta_energisa' ||
                        homologacao.status === 'resposta_energisa') && (
                        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                            <Building className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Dados da Concessionária (Energisa)</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-700">
                                Data do Parecer / Resposta da Energisa
                              </Label>
                              <Input
                                type="date"
                                value={energisaData}
                                onChange={(e) => setEnergisaData(e.target.value)}
                                className="h-8 text-xs bg-white"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-700">
                                Resumo do Parecer Técnico
                              </Label>
                              <Input
                                placeholder="Ex: Parecer de acesso deferido sem obras na rede"
                                value={energisaResposta}
                                onChange={(e) => setEnergisaResposta(e.target.value)}
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Caso 2: Liberar ou Solicitar Vistoria */}
                      {(homologacao.status === 'resposta_energisa' ||
                        homologacao.status === 'liberado_vistoria' ||
                        proximaEtapaId === 'liberado_vistoria' ||
                        proximaEtapaId === 'vistoria_solicitada') && (
                        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                          <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>Agendamento de Vistoria da Concessionária</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-700">
                                Data Prevista / Agendada para Vistoria
                              </Label>
                              <Input
                                type="date"
                                value={vistoriaData}
                                onChange={(e) => setVistoriaData(e.target.value)}
                                className="h-8 text-xs bg-white"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-700">
                                Protocolo / Observações da Vistoria
                              </Label>
                              <Input
                                placeholder="Ex: Protocolo Energisa #892834 — Padrão pronto com DPS"
                                value={vistoriaObs}
                                onChange={(e) => setVistoriaObs(e.target.value)}
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Campo Geral de Observação Registrada Nesta Etapa */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                          <span>Observação Técnica desta Etapa (visível no histórico)</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            Ex: Resposta da concessionária, protocolo, notas de vistoria
                          </span>
                        </Label>
                        <Textarea
                          value={observacaoEtapa}
                          onChange={(e) => setObservacaoEtapa(e.target.value)}
                          placeholder="Digite as observações técnicas desta movimentação (ex.: projeto diagramado conforme NBR 5410, protocolo aberto no portal Energisa)..."
                          className="min-h-[75px] text-xs border-slate-200"
                        />
                      </div>

                      {/* Botão de Avanço Principal */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <p className="text-[11px] text-slate-500">
                          Avança para a coluna <strong>"{proximaEtapaConfig.nome}"</strong>
                        </p>

                        <Button
                          type="button"
                          onClick={() => handleAvancarEtapa()}
                          disabled={avancando}
                          className="bg-[#0B7A5B] hover:bg-[#095C44] text-white font-extrabold text-xs px-5 h-9 gap-2 shadow-sm"
                        >
                          {avancando ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Avançando etapa...</span>
                            </>
                          ) : (
                            <>
                              <span>{etapaConfig.acaoBotao}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-emerald-950">
                        Homologação Totalmente Concluída e Entregue!
                      </h4>
                      <p className="text-xs text-emerald-800 max-w-md mx-auto">
                        O processo passou por todas as 7 etapas e o sistema solar está devidamente
                        ligado e operando na concessionária.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Botões para saltar ou mover para qualquer etapa específica (Flexibilidade do Engenheiro) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Mover Diretamente para Outra Etapa:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COLUNAS_HOMOLOGACAO.map((col) => {
                    const isAtual = col.id === homologacao.status
                    return (
                      <Button
                        key={col.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isAtual || avancando}
                        onClick={() => handleAvancarEtapa(col.id)}
                        className={`h-7 px-2.5 text-[11px] font-semibold gap-1.5 transition-all ${
                          isAtual
                            ? 'bg-slate-200 text-slate-500 cursor-default border-slate-300'
                            : 'bg-white hover:bg-emerald-50 hover:text-[#0B7A5B] hover:border-emerald-300 text-slate-700'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: col.cor }}
                        />
                        <span>{col.titulo}</span>
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Comprovantes de Pagamento da Engenharia (ART e Projeto) */}
              <Card className="border-emerald-200/90 shadow-2xs bg-gradient-to-br from-emerald-50/30 via-white to-blue-50/20">
                <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-700" />
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Comprovantes de Pagamento (Engenharia)
                      </CardTitle>
                    </div>

                    {isAdmin && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onOpenAnexarComprovante?.(homologacao)}
                        className="h-7 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                      >
                        <FileUp className="w-3 h-3" />
                        <span>Anexar Comprovante</span>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Bloco 1: ART */}
                    <div
                      className={`p-3 rounded-xl border transition-all ${
                        isArtPaga || homologacao.comprovante_art_arquivo
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                          Comprovante da ART
                        </span>
                        {isArtPaga ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold h-5">
                            ART Paga
                          </Badge>
                        ) : isArtEnviada ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold h-5 animate-pulse">
                            Aguardando Pagamento
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 text-[10px] h-5">
                            Não enviada
                          </Badge>
                        )}
                      </div>

                      {homologacao.comprovante_art_arquivo ? (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[11px] text-slate-600 leading-snug">
                            Anexado em:{' '}
                            <strong className="text-slate-800">
                              {homologacao.comprovante_art_anexado_em
                                ? formatDateTimeBR(homologacao.comprovante_art_anexado_em)
                                : homologacao.art_paga_em
                                  ? formatDateTimeBR(homologacao.art_paga_em)
                                  : 'Data registrada'}
                            </strong>
                            {homologacao.expand?.comprovante_art_anexado_por && (
                              <>
                                {' '}
                                por{' '}
                                <strong className="text-slate-800">
                                  {homologacao.expand.comprovante_art_anexado_por.name ||
                                    homologacao.expand.comprovante_art_anexado_por.email}
                                </strong>
                              </>
                            )}
                          </p>

                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const url = HomologacaoService.getComprovanteArtUrl(homologacao)
                                if (url) window.open(url, '_blank')
                              }}
                              className="h-7 text-xs font-semibold gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300"
                            >
                              <Download className="w-3 h-3" />
                              <span>Baixar Comprovante ART</span>
                            </Button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => onOpenAnexarComprovante?.(homologacao, 'art')}
                                className="text-[11px] text-slate-500 hover:text-emerald-700 underline"
                              >
                                Substituir
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 pt-1">
                          <p className="text-[11px] text-slate-500 italic">
                            Nenhum comprovante de pagamento da ART anexado.
                          </p>
                          {isAdmin ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => onOpenAnexarComprovante?.(homologacao, 'art')}
                              className="h-6 px-1.5 text-[11px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-bold gap-1 -ml-1.5"
                            >
                              <FileUp className="w-3 h-3" />
                              <span>Anexar comprovante de ART</span>
                            </Button>
                          ) : (
                            <span className="text-[10px] text-slate-400 block">
                              Apenas Admin/CEO pode anexar comprovante.
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bloco 2: PROJETO */}
                    <div
                      className={`p-3 rounded-xl border transition-all ${
                        homologacao.projeto_pago || homologacao.comprovante_projeto_arquivo
                          ? 'border-blue-200 bg-blue-50/40'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-blue-600" />
                          Comprovante do Projeto
                        </span>
                        {homologacao.projeto_pago ? (
                          <Badge className="bg-blue-600 text-white text-[10px] font-bold h-5">
                            Projeto Pago
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 text-[10px] h-5">
                            Pendente
                          </Badge>
                        )}
                      </div>

                      {homologacao.comprovante_projeto_arquivo ? (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[11px] text-slate-600 leading-snug">
                            Anexado em:{' '}
                            <strong className="text-slate-800">
                              {homologacao.comprovante_projeto_anexado_em
                                ? formatDateTimeBR(homologacao.comprovante_projeto_anexado_em)
                                : 'Data registrada'}
                            </strong>
                            {homologacao.expand?.comprovante_projeto_anexado_por && (
                              <>
                                {' '}
                                por{' '}
                                <strong className="text-slate-800">
                                  {homologacao.expand.comprovante_projeto_anexado_por.name ||
                                    homologacao.expand.comprovante_projeto_anexado_por.email}
                                </strong>
                              </>
                            )}
                          </p>

                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const url = HomologacaoService.getComprovanteProjetoUrl(homologacao)
                                if (url) window.open(url, '_blank')
                              }}
                              className="h-7 text-xs font-semibold gap-1 text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-300"
                            >
                              <Download className="w-3 h-3" />
                              <span>Baixar Comprovante Projeto</span>
                            </Button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => onOpenAnexarComprovante?.(homologacao, 'projeto')}
                                className="text-[11px] text-slate-500 hover:text-blue-700 underline"
                              >
                                Substituir
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 pt-1">
                          <p className="text-[11px] text-slate-500 italic">
                            Nenhum comprovante de pagamento do projeto anexado.
                          </p>
                          {isAdmin ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => onOpenAnexarComprovante?.(homologacao, 'projeto')}
                              className="h-6 px-1.5 text-[11px] text-blue-700 hover:text-blue-800 hover:bg-blue-50 font-bold gap-1 -ml-1.5"
                            >
                              <FileUp className="w-3 h-3" />
                              <span>Anexar comprovante de Projeto</span>
                            </Button>
                          ) : (
                            <span className="text-[10px] text-slate-400 block">
                              Apenas Admin/CEO pode anexar comprovante.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status e Ação da ART */}
              <Card className="border-slate-200/90 shadow-2xs">
                <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileUp className="w-4 h-4 text-amber-600" />
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Fluxo da ART (Anotação de Responsabilidade Técnica)
                      </CardTitle>
                    </div>

                    {isArtPaga ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>ART Paga — Fluxo Liberado</span>
                      </Badge>
                    ) : isArtEnviada ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-xs gap-1 animate-pulse">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Aguardando Pagamento</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 text-xs">
                        Nenhuma ART Enviada
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="text-slate-700 leading-relaxed">
                      {isArtPaga
                        ? 'A taxa da ART foi confirmada como paga pelo vendedor/admin. O processo está autorizado a prosseguir na concessionária.'
                        : isArtEnviada
                          ? 'O documento da ART já foi enviado para pagamento pelo comercial/cliente.'
                          : 'Anexe o boleto/documento da ART do CREA/CFT para que a equipe comercial ou o cliente efetue o pagamento.'}
                    </p>
                    {homologacao.art_enviada_em && (
                      <p className="text-[11px] text-slate-400">
                        Último envio em {formatDateTimeBR(homologacao.art_enviada_em)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {homologacao.art_arquivo && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = HomologacaoService.getArtDownloadUrl(homologacao)
                          if (url) window.open(url, '_blank')
                        }}
                        className="h-8 text-xs font-semibold gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Baixar ART Atual</span>
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onOpenEnviarArt(homologacao)}
                      className="bg-[#0B7A5B] hover:bg-[#095C44] text-white h-8 text-xs font-bold gap-1.5"
                    >
                      <FileUp className="w-3.5 h-3.5" />
                      <span>{homologacao.art_arquivo ? 'Reenviar ART' : 'Enviar ART'}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================================== */}
            {/* ABA 2: DADOS PARA PROJETO (DOSSIÊ TÉCNICO) & DOWNLOADS         */}
            {/* ============================================================== */}
            <TabsContent value="dossie" className="space-y-4 m-0">
              {dossie ? (
                <div className="space-y-4">
                  {/* Seção 1: Resumo do Kit Negociado */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Cliente & Local */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Cliente & Contato
                      </span>
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {dossie.cliente_nome || homologacao.cliente_nome}
                      </p>
                      <p className="text-xs text-slate-600 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>
                          {dossie.cliente_telefone ||
                            homologacao.cliente_telefone ||
                            'Não informado'}
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

                    {/* Local & UC */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Local & Unidade Consumidora
                      </span>
                      <p className="text-xs text-slate-700 leading-snug line-clamp-2">
                        <MapPin className="w-3 h-3 text-[#0B7A5B] inline mr-1" />
                        {dossie.endereco_instalacao ||
                          homologacao.endereco_instalacao ||
                          'Não informado'}
                      </p>
                      <div className="pt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-slate-500">UC:</span>
                        <strong className="text-[#0B7A5B] font-mono">
                          {dossie.unidade_consumidora ||
                            homologacao.unidade_consumidora ||
                            'Não informada'}
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

                    {/* Painéis */}
                    <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/90 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                          <SunMedium className="w-3 h-3 text-amber-600" />
                          Painéis Negociados
                        </span>
                        {dossie.potencia_total_kwp ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 bg-amber-100 text-amber-900 border-amber-300 font-bold"
                          >
                            {dossie.potencia_total_kwp} kWp
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

                    {/* Inversor & Estrutura */}
                    <div className="bg-blue-50/40 p-3.5 rounded-xl border border-blue-200/90 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-blue-600" />
                        Inversor & Fixação
                      </span>
                      <p className="text-xs font-bold text-slate-900">
                        {dossie.inversor_quantidade ? `${dossie.inversor_quantidade}x ` : ''}
                        Inversor {dossie.inversor_marca || 'Sungrow'}
                        {dossie.inversor_potencia_kw ? ` ${dossie.inversor_potencia_kw} kW` : ''}
                      </p>
                      <div className="pt-0.5 flex flex-wrap items-center gap-1 text-[11px]">
                        <span className="text-slate-500">Fixação:</span>
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
                    <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <strong>Instruções Comerciais / Observações:</strong>{' '}
                        <span>{dossie.observacoes}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p className="text-xs text-slate-600 font-bold">
                    Dossiê detalhado ainda não sincronizado para este cliente.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Os dados essenciais estão disponíveis no cabeçalho e na seção de documentos.
                  </p>
                </div>
              )}

              {/* Tabela de Documentos Enviados pelo Comercial */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-[#0B7A5B]" />
                    <span>Documentos Recebidos do Comercial para Download</span>
                  </h4>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {documentosCliente.length}{' '}
                    {documentosCliente.length === 1 ? 'arquivo' : 'arquivos'}
                  </Badge>
                </div>

                {documentosCliente.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    Nenhum documento do cliente anexado até o momento.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-4">Documento</th>
                          <th className="py-2.5 px-4">Categoria</th>
                          <th className="py-2.5 px-4">Data Envio</th>
                          <th className="py-2.5 px-4 text-right">Download</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {documentosCliente.map((doc) => {
                          const meta = CATEGORIAS_DOCUMENTOS.find(
                            (c) => c.key === doc.categoria,
                          ) || {
                            label: doc.categoria,
                          }
                          const url = LeadDocumentosService.getFileUrl(doc)

                          return (
                            <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2">
                                  {getFileBadge(doc.nome_original || doc.arquivo)}
                                  <div className="truncate max-w-sm">
                                    <span
                                      className="font-semibold text-slate-800 hover:text-[#0B7A5B] cursor-pointer truncate block"
                                      onClick={() => url && window.open(url, '_blank')}
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

                              <td className="py-2.5 px-4">
                                <span className="font-medium text-slate-700">{meta.label}</span>
                              </td>

                              <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                                {doc.enviado_em
                                  ? formatDateTimeBR(doc.enviado_em)
                                  : formatDateBR(doc.created)}
                              </td>

                              <td className="py-2.5 px-4 text-right">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => url && window.open(url, '_blank')}
                                  className="h-7 px-2.5 text-xs bg-[#0B7A5B] hover:bg-[#095C44] text-white font-semibold gap-1 shadow-2xs"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Baixar</span>
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ============================================================== */}
            {/* ABA 3: ARQUIVOS DO PROCESSO DE ENGENHARIA (ANEXAR PROJETOS)    */}
            {/* ============================================================== */}
            <TabsContent value="arquivos" className="space-y-5 m-0">
              {/* Formulário de Upload de Arquivos */}
              <Card className="border-slate-200/90 shadow-2xs bg-slate-50/50">
                <CardHeader className="py-3 px-4 border-b border-slate-200 bg-white">
                  <div className="flex items-center gap-2">
                    <FileUp className="w-4 h-4 text-[#0B7A5B]" />
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Anexar Novo Arquivo ao Processo (Projeto Elétrico, Plantas, Energisa)
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  <form onSubmit={handleUploadArquivoProcesso} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          Categoria Técnica <span className="text-rose-500">*</span>
                        </Label>
                        <select
                          value={arquivoCategoria}
                          onChange={(e) => setArquivoCategoria(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0B7A5B]"
                        >
                          {CATEGORIAS_ARQUIVOS_ENGENHARIA.map((cat) => (
                            <option key={cat.key} value={cat.key}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          Título / Identificação do Documento
                        </Label>
                        <Input
                          placeholder="Ex: Diagrama Unifilar v1.0, Planta de Cobertura, Protocolo Energisa"
                          value={arquivoTitulo}
                          onChange={(e) => setArquivoTitulo(e.target.value)}
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700">
                        Descrição / Observações Técnicas (opcional)
                      </Label>
                      <Input
                        placeholder="Ex: Planta com disposição de 16 painéis orientados ao Norte a 15 graus..."
                        value={arquivoDescricao}
                        onChange={(e) => setArquivoDescricao(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>

                    {/* Seleção do Arquivo */}
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700">
                        Arquivo (PDF, Imagens, DWG/DXF, ZIP — até 30MB){' '}
                        <span className="text-rose-500">*</span>
                      </Label>
                      <div className="border border-dashed border-slate-300 hover:border-emerald-500 rounded-lg p-3 text-center bg-white transition-colors">
                        <input
                          type="file"
                          id="arquivo-processo-input"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) {
                              if (f.size > 30 * 1024 * 1024) {
                                toast({
                                  title: 'Arquivo muito grande',
                                  description: 'O tamanho máximo permitido é 30MB.',
                                  variant: 'destructive',
                                })
                                e.target.value = ''
                                return
                              }
                              setArquivoFile(f)
                              if (!arquivoTitulo) {
                                setArquivoTitulo(f.name.replace(/\.[^/.]+$/, ''))
                              }
                            }
                          }}
                          className="hidden"
                          disabled={enviandoArquivo}
                        />
                        <label
                          htmlFor="arquivo-processo-input"
                          className="cursor-pointer flex items-center justify-center gap-2 text-xs"
                        >
                          {arquivoFile ? (
                            <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="font-bold truncate max-w-[320px]">
                                {arquivoFile.name}
                              </span>
                              <span className="text-[10px] text-emerald-700 font-mono">
                                ({(arquivoFile.size / (1024 * 1024)).toFixed(2)} MB)
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-600 hover:text-[#0B7A5B]">
                              <FileUp className="w-4 h-4 text-[#0B7A5B]" />
                              <span className="font-semibold">Clique para escolher o arquivo</span>
                              <span className="text-[10px] text-slate-400">
                                (PDF, DWG, DXF, Imagens ou ZIP)
                              </span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={enviandoArquivo || !arquivoFile}
                        className="bg-[#0B7A5B] hover:bg-[#095C44] text-white font-bold text-xs gap-1.5 h-8 px-4"
                      >
                        {enviandoArquivo ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Enviando arquivo...</span>
                          </>
                        ) : (
                          <>
                            <FileUp className="w-3.5 h-3.5" />
                            <span>Anexar Arquivo ao Processo</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Lista de Arquivos do Processo de Engenharia */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-[#0B7A5B]" />
                    <span>Documentos Anexados pela Engenharia ({arquivosProcesso.length})</span>
                  </h4>
                </div>

                {loadingArquivos ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0B7A5B] mb-2" />
                    <p className="text-xs">Carregando documentos do processo...</p>
                  </div>
                ) : arquivosProcesso.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    Nenhum arquivo anexado ainda pelo engenheiro. Use o formulário acima para enviar
                    projetos elétricos, memoriais, plantas e respostas da concessionária.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-4">Documento</th>
                          <th className="py-2.5 px-4">Categoria Técnica</th>
                          <th className="py-2.5 px-4">Data Anexo</th>
                          <th className="py-2.5 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {arquivosProcesso.map((arq) => {
                          const catMeta = CATEGORIAS_ARQUIVOS_ENGENHARIA.find(
                            (c) => c.key === arq.categoria,
                          ) || {
                            label: arq.categoria,
                          }
                          const url = HomologacaoService.getArquivoEngenhariaUrl(arq)

                          return (
                            <tr key={arq.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2">
                                  {getFileBadge(arq.nome_original || arq.arquivo)}
                                  <div className="truncate max-w-sm">
                                    <span
                                      className="font-bold text-slate-900 hover:text-[#0B7A5B] cursor-pointer truncate block"
                                      onClick={() => url && window.open(url, '_blank')}
                                      title={arq.titulo || arq.nome_original}
                                    >
                                      {arq.titulo || arq.nome_original}
                                    </span>
                                    {arq.descricao && (
                                      <span className="text-[10px] text-slate-500 truncate block">
                                        {arq.descricao}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-400">
                                      {LeadDocumentosService.formatFileSize(arq.tamanho_bytes)}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-2.5 px-4">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-slate-100 text-slate-700 border-slate-200 font-semibold"
                                >
                                  {catMeta.label}
                                </Badge>
                              </td>

                              <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                                {formatDateTimeBR(arq.created)}
                              </td>

                              <td className="py-2.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => url && window.open(url, '_blank')}
                                    className="h-7 px-2.5 text-xs bg-[#0B7A5B] hover:bg-[#095C44] text-white font-semibold gap-1 shadow-2xs"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Baixar</span>
                                  </Button>

                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDeleteArquivo(arq.id)}
                                    className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                    title="Remover arquivo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ============================================================== */}
            {/* ABA 4: HISTÓRICO DE MOVIMENTAÇÕES & OBSERVAÇÕES DA FICHA       */}
            {/* ============================================================== */}
            <TabsContent value="historico" className="space-y-3 m-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-purple-600" />
                  <span>Timeline de Movimentações, Observações e Eventos</span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  {homologacao.historico?.length || 0} eventos registrados
                </span>
              </div>

              {(!homologacao.historico || homologacao.historico.length === 0) &&
              (!homologacao.observacoes_etapas || homologacao.observacoes_etapas.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs">
                  Nenhum evento registrado ainda nesta homologação.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {[...(homologacao.historico || [])].reverse().map((item, idx) => {
                    const isMovimentacao = item.tipo === 'movimentacao_kanban'
                    const isArt = item.tipo?.startsWith('art')
                    const isArquivo = item.tipo === 'anexo_arquivo'

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-start gap-3 text-xs"
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isMovimentacao
                              ? 'bg-emerald-100 text-[#0B7A5B]'
                              : isArt
                                ? 'bg-amber-100 text-amber-700'
                                : isArquivo
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {isMovimentacao ? (
                            <ArrowRight className="w-4 h-4" />
                          ) : isArt ? (
                            <FileUp className="w-4 h-4" />
                          ) : isArquivo ? (
                            <FileCheck className="w-4 h-4" />
                          ) : (
                            <History className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 leading-snug">
                              {item.descricao}
                            </span>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                              {formatDateTimeBR(item.data)}
                            </span>
                          </div>

                          {item.autor_nome && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <UserIcon className="w-3 h-3 text-slate-400" />
                              <span>Por {item.autor_nome}</span>
                            </div>
                          )}

                          {item.observacao && (
                            <div className="mt-1 p-2 rounded bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700">
                              <strong className="text-slate-900">Nota registrada:</strong>{' '}
                              <span>{item.observacao}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
