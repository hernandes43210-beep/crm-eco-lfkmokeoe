import React, { useState, useEffect, useRef } from 'react'
import {
  FileText,
  UploadCloud,
  Send,
  Trash2,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  RefreshCw,
  UserCheck,
  Zap,
  Cpu,
  FileSignature,
  FileSpreadsheet,
  Image as ImageIcon,
  Loader2,
  User as UserIcon,
  HelpCircle,
  FolderOpen,
} from 'lucide-react'
import type {
  DocumentoLead,
  DocumentoLeadCategoria,
  DossieTecnicoEngenharia,
  Lead,
  Proposta,
  TipoInstalacaoDossie,
  User,
} from '@/types/crm'
import {
  CATEGORIAS_DOCUMENTOS,
  DossieTecnicoPayload,
  LeadDocumentosService,
} from '@/services/leadDocumentos'
import { extrairComponentesKit } from '@/lib/quickKitUtils'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDateBR, formatDateTimeBR } from '@/lib/solarUtils'

interface LeadDocumentosSectionProps {
  lead: Lead
  propostas?: Proposta[]
  isAdmin: boolean
  currentUserId?: string
  isEngenheiro?: boolean
  onDocumentosChanged?: () => void
}

export function LeadDocumentosSection({
  lead,
  propostas = [],
  isAdmin,
  currentUserId,
  isEngenheiro = false,
  onDocumentosChanged,
}: LeadDocumentosSectionProps) {
  const [documentos, setDocumentos] = useState<DocumentoLead[]>([])
  const [engenheiros, setEngenheiros] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingCategory, setUploadingCategory] = useState<DocumentoLeadCategoria | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [ultimoDossie, setUltimoDossie] = useState<DossieTecnicoEngenharia | null>(null)

  // Modal Enviar / Reenviar ao Engenheiro & Dossiê Técnico
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [selectedEngenheiroId, setSelectedEngenheiroId] = useState('')
  const [observacaoEnvio, setObservacaoEnvio] = useState('')
  const [sendingEngenheiro, setSendingEngenheiro] = useState(false)

  // Campos do Dossiê Técnico para o modal de conferência/edição
  const [dossieForm, setDossieForm] = useState<DossieTecnicoPayload>({
    cliente_nome: '',
    cliente_telefone: '',
    cliente_email: '',
    cliente_cidade: '',
    cliente_estado: '',
    endereco_instalacao: '',
    unidade_consumidora: '',
    consumo_medio_kwh: undefined,
    kit_nome: '',
    potencia_total_kwp: undefined,
    paineis_quantidade: undefined,
    paineis_modelo: '',
    paineis_potencia_w: undefined,
    inversor_marca: '',
    inversor_modelo: '',
    inversor_potencia_kw: undefined,
    inversor_quantidade: 1,
    tipo_instalacao: 'telhado',
    tipo_estrutura_detalhe: '',
    observacoes: '',
  })

  // Input file refs para cada categoria
  const fileInputRefs = {
    documentos_pessoais: useRef<HTMLInputElement>(null),
    conta_energia: useRef<HTMLInputElement>(null),
    datasheet_equipamentos: useRef<HTMLInputElement>(null),
    procuracao: useRef<HTMLInputElement>(null),
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [docs, engs, dossieExistente] = await Promise.all([
        LeadDocumentosService.getDocumentosByLead(lead.id),
        LeadDocumentosService.getEngenheiros(),
        LeadDocumentosService.getLatestDossieByLead(lead.id),
      ])
      setDocumentos(docs)
      setEngenheiros(engs)
      setUltimoDossie(dossieExistente)

      // Se só houver 1 engenheiro cadastrado, pré-seleciona
      const apenasEngs = engs.filter((u) => u.role === 'Engenheiro')
      if (apenasEngs.length === 1) {
        setSelectedEngenheiroId(apenasEngs[0].id)
      } else if (dossieExistente?.engenheiro_destino) {
        setSelectedEngenheiroId(dossieExistente.engenheiro_destino)
      } else if (engs.length > 0 && !selectedEngenheiroId) {
        setSelectedEngenheiroId(engs[0].id)
      }
    } catch (err) {
      console.error('Erro ao carregar documentos do lead:', err)
      toast({
        title: 'Erro ao carregar documentos',
        description: 'Não foi possível carregar a lista de documentos do lead.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (lead?.id) {
      loadData()
    }
  }, [lead?.id])

  // Identifica se já houve envio anterior e se há novos documentos pendentes
  const totalDocumentos = documentos.length
  const documentosEnviados = documentos.filter(
    (d) => d.status_envio === 'enviado' || d.status_envio === 'reenviado',
  )
  const documentosPendentes = documentos.filter(
    (d) => !d.status_envio || d.status_envio === 'pendente',
  )
  const jaEnviadoAnteriormente = documentosEnviados.length > 0
  const temDocsNovosParaReenviar = jaEnviadoAnteriormente && documentosPendentes.length > 0

  // Último engenheiro de destino registrado
  const ultimoEngenheiroDestino = documentos.find((d) => d.engenheiro_destino)?.expand
    ?.engenheiro_destino

  // Tratar upload de múltiplos arquivos por categoria
  const handleFileUpload = async (categoria: DocumentoLeadCategoria, files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploadingCategory(categoria)
    const fileArray = Array.from(files)
    let sucessos = 0
    let erros = 0

    for (const file of fileArray) {
      // Validação de tamanho: máximo 30MB
      if (file.size > 30 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: `O arquivo "${file.name}" excede o limite máximo permitido de 30MB.`,
          variant: 'destructive',
        })
        erros++
        continue
      }

      try {
        await LeadDocumentosService.uploadDocumento({
          leadId: lead.id,
          categoria,
          file,
          userId: currentUserId,
        })
        sucessos++
      } catch (err) {
        console.error('Erro ao fazer upload do documento:', err)
        erros++
      }
    }

    if (sucessos > 0) {
      toast({
        title: 'Upload concluído!',
        description: `${sucessos} documento(s) anexado(s) com sucesso na categoria selecionada.`,
      })
      await loadData()
      if (onDocumentosChanged) onDocumentosChanged()
    }

    if (erros > 0 && sucessos === 0) {
      toast({
        title: 'Falha no upload',
        description:
          'Não foi possível salvar os arquivos anexados. Verifique sua conexão e tente novamente.',
        variant: 'destructive',
      })
    }

    // Reset input
    if (fileInputRefs[categoria]?.current) {
      fileInputRefs[categoria].current.value = ''
    }
    setUploadingCategory(null)
  }

  // Tratar exclusão de arquivo: permitido somente para quem anexou ou Admin
  const handleDeleteDocumento = async (doc: DocumentoLead) => {
    const isOwner = currentUserId && doc.enviado_por === currentUserId
    if (!isAdmin && !isOwner) {
      toast({
        title: 'Ação não permitida',
        description:
          'Você só pode excluir documentos que foram anexados por você mesmo (ou solicite a um Administrador).',
        variant: 'destructive',
      })
      return
    }

    const confirmou = window.confirm(
      `Deseja realmente remover o arquivo "${doc.nome_original || 'este documento'}"?`,
    )
    if (!confirmou) return

    try {
      setDeletingId(doc.id)
      await LeadDocumentosService.deleteDocumento(doc.id)
      toast({
        title: 'Documento excluído',
        description: 'O arquivo foi removido com sucesso.',
      })
      await loadData()
      if (onDocumentosChanged) onDocumentosChanged()
    } catch (err) {
      console.error('Erro ao excluir documento:', err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o documento selecionado.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  // Monta e preenche o Dossiê Técnico a partir do Lead e das Propostas geradas/aceitas
  const montarDossieInicial = (): DossieTecnicoPayload => {
    // 1. Prioriza proposta aceita, ou a mais recente gerada para o lead
    const propAceita = propostas.find((p) => p.status === 'Aceita')
    const propMaisRecente = propAceita || (propostas.length > 0 ? propostas[0] : null)

    // 2. Extrai componentes do kit se houver proposta
    let componentesKit: ReturnType<typeof extrairComponentesKit> | null = null
    if (propMaisRecente) {
      componentesKit = extrairComponentesKit({
        nome: propMaisRecente.kit_nome,
        fabricante: propMaisRecente.kit_fabricante,
        potencia_kw: propMaisRecente.kit_potencia_kw,
        descricao: propMaisRecente.kit_descricao,
      })
    }

    // 3. Inferir tipo de instalação (telhado vs solo)
    let tipoInstalacaoDeduzido: TipoInstalacaoDossie = 'telhado'
    let detalheEstruturaDeduzido = ''

    if (componentesKit?.tipoEstrutura) {
      detalheEstruturaDeduzido = componentesKit.tipoEstrutura
      if (/solo/i.test(componentesKit.tipoEstrutura)) {
        tipoInstalacaoDeduzido = 'solo'
      } else {
        tipoInstalacaoDeduzido = 'telhado'
      }
    } else if (propMaisRecente?.kit_nome && /solo/i.test(propMaisRecente.kit_nome)) {
      tipoInstalacaoDeduzido = 'solo'
      detalheEstruturaDeduzido = 'Solo monoposte'
    }

    // 4. Se já existia um dossiê anterior salvo para este lead, usar como base ou complementar
    if (ultimoDossie) {
      return {
        cliente_nome: ultimoDossie.cliente_nome || lead.nome,
        cliente_telefone: ultimoDossie.cliente_telefone || lead.telefone || '',
        cliente_email: ultimoDossie.cliente_email || lead.email || '',
        cliente_cidade: ultimoDossie.cliente_cidade || lead.cidade || '',
        cliente_estado: ultimoDossie.cliente_estado || lead.estado || '',
        endereco_instalacao:
          ultimoDossie.endereco_instalacao ||
          lead.endereco ||
          (lead.bairro ? `${lead.bairro}, ${lead.cidade || ''}` : lead.cidade || ''),
        unidade_consumidora: ultimoDossie.unidade_consumidora || '',
        consumo_medio_kwh:
          ultimoDossie.consumo_medio_kwh !== undefined
            ? ultimoDossie.consumo_medio_kwh
            : lead.consumo_mensal_kwh || undefined,
        kit_nome:
          ultimoDossie.kit_nome ||
          propMaisRecente?.kit_nome ||
          (componentesKit
            ? `${componentesKit.qtdPaineis} painéis de ${componentesKit.potenciaPainelW}W + Inversor ${componentesKit.marcaInversor}`
            : ''),
        potencia_total_kwp:
          ultimoDossie.potencia_total_kwp ||
          propMaisRecente?.kit_potencia_kw ||
          (componentesKit && componentesKit.qtdPaineis && componentesKit.potenciaPainelW
            ? Math.round((componentesKit.qtdPaineis * componentesKit.potenciaPainelW) / 10) / 100
            : undefined),
        paineis_quantidade:
          ultimoDossie.paineis_quantidade !== undefined
            ? ultimoDossie.paineis_quantidade
            : componentesKit?.qtdPaineis || 10,
        paineis_modelo:
          ultimoDossie.paineis_modelo ||
          (componentesKit
            ? `${componentesKit.marcaPaineis || 'Módulo'} ${componentesKit.potenciaPainelW}W`
            : 'Painel Solar'),
        paineis_potencia_w:
          ultimoDossie.paineis_potencia_w !== undefined
            ? ultimoDossie.paineis_potencia_w
            : componentesKit?.potenciaPainelW || 630,
        inversor_marca: ultimoDossie.inversor_marca || componentesKit?.marcaInversor || 'Sungrow',
        inversor_modelo:
          ultimoDossie.inversor_modelo ||
          (componentesKit?.potenciaInversorKw
            ? `Inversor ${componentesKit.potenciaInversorKw} kW`
            : 'Inversor 5 kW'),
        inversor_potencia_kw:
          ultimoDossie.inversor_potencia_kw !== undefined
            ? ultimoDossie.inversor_potencia_kw
            : componentesKit?.potenciaInversorKw || 5,
        inversor_quantidade: ultimoDossie.inversor_quantidade || 1,
        tipo_instalacao: ultimoDossie.tipo_instalacao || tipoInstalacaoDeduzido,
        tipo_estrutura_detalhe: ultimoDossie.tipo_estrutura_detalhe || detalheEstruturaDeduzido,
        observacoes: ultimoDossie.observacoes || '',
      }
    }

    // Caso novo (sem dossiê anterior salvo)
    const enderecoInicial = [lead.endereco, lead.bairro, lead.cidade, lead.estado]
      .filter(Boolean)
      .join(', ')

    return {
      cliente_nome: lead.nome,
      cliente_telefone: lead.telefone || '',
      cliente_email: lead.email || '',
      cliente_cidade: lead.cidade || '',
      cliente_estado: lead.estado || '',
      endereco_instalacao: enderecoInicial || lead.cidade || '',
      unidade_consumidora: '',
      consumo_medio_kwh: lead.consumo_mensal_kwh || undefined,
      kit_nome:
        propMaisRecente?.kit_nome ||
        (componentesKit
          ? `${componentesKit.qtdPaineis}x ${componentesKit.potenciaPainelW}W + Inversor ${componentesKit.marcaInversor}`
          : ''),
      potencia_total_kwp:
        propMaisRecente?.kit_potencia_kw ||
        (componentesKit && componentesKit.qtdPaineis && componentesKit.potenciaPainelW
          ? Math.round((componentesKit.qtdPaineis * componentesKit.potenciaPainelW) / 10) / 100
          : undefined),
      paineis_quantidade:
        componentesKit?.qtdPaineis ||
        (lead.consumo_mensal_kwh ? Math.max(4, Math.round(lead.consumo_mensal_kwh / 60)) : 10),
      paineis_modelo: componentesKit
        ? `${componentesKit.marcaPaineis || 'Painel'} ${componentesKit.potenciaPainelW}W`
        : 'Painel 630W',
      paineis_potencia_w: componentesKit?.potenciaPainelW || 630,
      inversor_marca: componentesKit?.marcaInversor || 'Sungrow',
      inversor_modelo: componentesKit?.potenciaInversorKw
        ? `Inversor ${componentesKit.marcaInversor || 'Sungrow'} ${componentesKit.potenciaInversorKw} kW`
        : 'Inversor Sungrow 5 kW',
      inversor_potencia_kw: componentesKit?.potenciaInversorKw || 5,
      inversor_quantidade: componentesKit?.qtdInversores || 1,
      tipo_instalacao: tipoInstalacaoDeduzido,
      tipo_estrutura_detalhe:
        detalheEstruturaDeduzido ||
        (tipoInstalacaoDeduzido === 'solo' ? 'Solo monoposte' : 'Telhado (Fibrocimento/Metálico)'),
      observacoes: '',
    }
  }

  // Abrir modal de envio ao engenheiro
  const handleOpenSendModal = () => {
    if (totalDocumentos === 0) {
      toast({
        title: 'Nenhum documento anexado',
        description: 'Anexe ao menos um documento antes de realizar o envio ao engenheiro.',
        variant: 'destructive',
      })
      return
    }

    if (engenheiros.length === 0) {
      toast({
        title: 'Nenhum engenheiro cadastrado',
        description:
          'Cadastre um usuário com o papel "Engenheiro" na página Equipe para receber a documentação técnica.',
        variant: 'destructive',
      })
      return
    }

    // Preenche o formulário do Dossiê Técnico automaticamente com base no lead e proposta negociada
    const dadosIniciais = montarDossieInicial()
    setDossieForm(dadosIniciais)

    // Pré-selecionar o último engenheiro usado ou o primeiro engenheiro exclusivo
    if (!selectedEngenheiroId) {
      if (ultimoDossie?.engenheiro_destino) {
        setSelectedEngenheiroId(ultimoDossie.engenheiro_destino)
      } else {
        const engExclusivo = engenheiros.find((u) => u.role === 'Engenheiro')
        if (engExclusivo) {
          setSelectedEngenheiroId(engExclusivo.id)
        } else if (engenheiros[0]) {
          setSelectedEngenheiroId(engenheiros[0].id)
        }
      }
    }

    setIsSendModalOpen(true)
  }

  // Confirmar envio ao engenheiro
  const handleConfirmSendToEngenheiro = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEngenheiroId) {
      toast({
        title: 'Selecione um engenheiro',
        description:
          'Selecione o profissional de engenharia responsável por receber a documentação.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSendingEngenheiro(true)
      const res = await LeadDocumentosService.enviarAoEngenheiro({
        leadId: lead.id,
        engenheiroId: selectedEngenheiroId,
        observacao: observacaoEnvio.trim() || dossieForm.observacoes?.trim(),
        isReenvio: jaEnviadoAnteriormente,
        dossie: {
          ...dossieForm,
          observacoes: observacaoEnvio.trim() || dossieForm.observacoes?.trim(),
        },
      })

      if (res.success) {
        toast({
          title: jaEnviadoAnteriormente
            ? 'Dossiê técnico e documentos atualizados!'
            : 'Dossiê técnico enviado à Engenharia!',
          description: `${res.total_documentos} documento(s) e o dossiê do projeto foram direcionados para ${res.engenheiro.nome}. Notificação e e-mail disparados.`,
        })
        setIsSendModalOpen(false)
        setObservacaoEnvio('')
        await loadData()
        if (onDocumentosChanged) onDocumentosChanged()
      } else {
        toast({
          title: 'Aviso no envio',
          description: res.message || 'Houve uma falha ao processar o envio.',
          variant: 'destructive',
        })
      }
    } catch (err: unknown) {
      console.error('Erro ao enviar documentos ao engenheiro:', err)
      const msg =
        err instanceof Error ? err.message : 'Não foi possível enviar os documentos ao engenheiro.'
      toast({
        title: 'Erro no envio',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSendingEngenheiro(false)
    }
  }

  const getCategoryIcon = (key: DocumentoLeadCategoria) => {
    switch (key) {
      case 'documentos_pessoais':
        return <UserCheck className="w-4 h-4 text-emerald-600" />
      case 'conta_energia':
        return <Zap className="w-4 h-4 text-amber-500" />
      case 'datasheet_equipamentos':
        return <Cpu className="w-4 h-4 text-blue-600" />
      case 'procuracao':
        return <FileSignature className="w-4 h-4 text-purple-600" />
      default:
        return <FileText className="w-4 h-4 text-slate-500" />
    }
  }

  const getFileExtensionBadge = (filename?: string) => {
    if (!filename) return null
    const ext = filename.split('.').pop()?.toUpperCase() || 'FILE'
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-300'
    if (ext === 'PDF') colorClass = 'bg-rose-50 text-rose-700 border-rose-300'
    else if (['JPG', 'JPEG', 'PNG', 'WEBP'].includes(ext))
      colorClass = 'bg-blue-50 text-blue-700 border-blue-300'
    else if (['XLS', 'XLSX'].includes(ext))
      colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-300'
    else if (['DOC', 'DOCX'].includes(ext))
      colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-300'

    return (
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-bold ${colorClass}`}>
        {ext}
      </Badge>
    )
  }

  return (
    <Card className="border-slate-200/90 shadow-xs bg-white overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/40">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0B7A5B] flex items-center justify-center shrink-0">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Documentos & Anexos para Engenharia</span>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[11px] font-semibold"
                >
                  {totalDocumentos} {totalDocumentos === 1 ? 'arquivo' : 'arquivos'}
                </Badge>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Organize os documentos do cliente e envie tudo automaticamente com notificação ao
                engenheiro responsável
              </p>
            </div>
          </div>
        </div>

        {/* Botão de Envio / Reenvio ao Engenheiro (disponível para Admin e Vendedor) */}
        {!isEngenheiro && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleOpenSendModal}
              disabled={totalDocumentos === 0 || loading}
              className={`text-xs font-semibold h-9 px-4 gap-2 shadow-xs transition-all ${
                temDocsNovosParaReenviar
                  ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                  : jaEnviadoAnteriormente
                    ? 'bg-[#0B7A5B] hover:bg-[#095C44] text-white'
                    : 'bg-[#0B7A5B] hover:bg-[#095C44] text-white'
              }`}
              title={
                totalDocumentos === 0
                  ? 'Anexe documentos para habilitar o envio'
                  : 'Enviar todos os documentos anexados ao engenheiro'
              }
            >
              {temDocsNovosParaReenviar ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Reenviar ao Engenheiro (+{documentosPendentes.length} novos)</span>
                </>
              ) : jaEnviadoAnteriormente ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reenviar ao Engenheiro</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Enviar ao Engenheiro</span>
                </>
              )}
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Banner de Status de Envio */}
        {jaEnviadoAnteriormente && (
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              temDocsNovosParaReenviar
                ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {temDocsNovosParaReenviar ? (
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-[#0B7A5B] mt-0.5 shrink-0" />
              )}
              <div className="text-xs space-y-0.5">
                <div className="font-bold flex items-center gap-1.5">
                  <span>
                    {temDocsNovosParaReenviar
                      ? 'Há novos documentos pendentes de reenvio!'
                      : 'Documentação já enviada ao Engenheiro Responsável'}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${
                      temDocsNovosParaReenviar
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    {temDocsNovosParaReenviar ? 'Reenvio Disponível' : 'Em Análise Técnica'}
                  </Badge>
                </div>
                <p className="opacity-90">
                  {ultimoEngenheiroDestino ? (
                    <>
                      Direcionado para{' '}
                      <strong>
                        {ultimoEngenheiroDestino.name || ultimoEngenheiroDestino.email}
                      </strong>
                      {documentos[0]?.enviado_em
                        ? ` em ${formatDateTimeBR(documentos[0].enviado_em)}.`
                        : '.'}
                    </>
                  ) : (
                    'Documentos notificados por e-mail e sino no sistema.'
                  )}
                  {temDocsNovosParaReenviar && (
                    <span className="block mt-0.5 font-semibold text-amber-800">
                      Você adicionou {documentosPendentes.length} arquivo(s) recente(s). Clique no
                      botão acima para disparar a notificação de reenvio com as novas peças.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4 Categorias de Documentos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {CATEGORIAS_DOCUMENTOS.map((cat) => {
            const docsDaCategoria = documentos.filter((d) => d.categoria === cat.key)
            const isUploadingThis = uploadingCategory === cat.key

            return (
              <div
                key={cat.key}
                className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                {/* Header da Categoria */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        {getCategoryIcon(cat.key)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {cat.label}
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                          {cat.descricao}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold shrink-0 ${
                        docsDaCategoria.length > 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                    >
                      {docsDaCategoria.length} {docsDaCategoria.length === 1 ? 'doc' : 'docs'}
                    </Badge>
                  </div>

                  {/* Input invisível para upload múltiplo */}
                  <input
                    ref={fileInputRefs[cat.key]}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.zip"
                    className="hidden"
                    onChange={(e) => handleFileUpload(cat.key, e.target.files)}
                  />

                  {/* Lista de Documentos da Categoria */}
                  <div className="mt-3 space-y-2">
                    {docsDaCategoria.length === 0 ? (
                      <div className="py-4 px-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-center">
                        <p className="text-xs text-slate-400">
                          Nenhum arquivo anexado nesta categoria.
                        </p>
                        <p className="text-[10px] text-slate-400/80 mt-0.5">
                          Aceita vários arquivos ({cat.exemplos})
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                        {docsDaCategoria.map((doc) => {
                          const fileUrl = LeadDocumentosService.getFileUrl(doc)
                          const isOwner = currentUserId && doc.enviado_por === currentUserId
                          const canDelete = isAdmin || isOwner
                          const isEnviado =
                            doc.status_envio === 'enviado' || doc.status_envio === 'reenviado'

                          return (
                            <div
                              key={doc.id}
                              className="p-2 rounded-lg border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between gap-2 text-xs transition-colors group"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {getFileExtensionBadge(doc.nome_original || doc.arquivo)}
                                <div className="min-w-0 flex-1">
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-medium text-slate-800 hover:text-[#0B7A5B] truncate block"
                                    title={doc.nome_original || doc.arquivo}
                                  >
                                    {doc.nome_original || doc.arquivo}
                                  </a>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                    <span>
                                      {LeadDocumentosService.formatFileSize(doc.tamanho_bytes)}
                                    </span>
                                    <span>•</span>
                                    <span>{formatDateBR(doc.created)}</span>
                                    {isEnviado ? (
                                      <span className="text-emerald-700 font-semibold inline-flex items-center gap-0.5">
                                        • Enviado
                                      </span>
                                    ) : (
                                      <span className="text-amber-700 font-semibold inline-flex items-center gap-0.5">
                                        • Pendente de envio
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Ações: Download e Exclusão */}
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-600 hover:text-[#0B7A5B] hover:bg-emerald-50"
                                  title="Baixar arquivo"
                                  onClick={() => window.open(fileUrl, '_blank')}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </Button>

                                {canDelete && !isEngenheiro && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={deletingId === doc.id}
                                    className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                    title="Excluir arquivo (apenas quem anexou ou Admin)"
                                    onClick={() => handleDeleteDocumento(doc)}
                                  >
                                    {deletingId === doc.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão de Upload da Categoria (Vendedor e Admin) */}
                {!isEngenheiro && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 truncate">{cat.exemplos}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploadingThis}
                      onClick={() => fileInputRefs[cat.key]?.current?.click()}
                      className="text-xs font-semibold h-7.5 px-2.5 gap-1.5 border-slate-200 text-slate-700 hover:text-[#0B7A5B] hover:border-[#0B7A5B] hover:bg-emerald-50/40 shrink-0"
                    >
                      {isUploadingThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B7A5B]" />
                          <span>Anexando...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                          <span>+ Anexar Arquivo(s)</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>

      {/* Modal: Enviar ao Engenheiro Responsável & Montar Dossiê Técnico */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-900 shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1 text-[#0B7A5B]">
              <Send className="w-5 h-5 text-[#0B7A5B]" />
              <DialogTitle className="text-lg font-bold text-slate-900">
                {jaEnviadoAnteriormente
                  ? 'Reenviar Dossiê Técnico & Documentos'
                  : 'Enviar Dossiê Técnico ao Engenheiro'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Envia ao engenheiro <strong>somente o que foi negociado</strong> para a realização do
              projeto (dados do cliente, local de instalação, unidade consumidora e especificações
              do kit fechado: painéis, inversor e estrutura). Você pode conferir e ajustar os campos
              antes de enviar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmSendToEngenheiro} className="space-y-4 pt-1">
            {/* Destinatário */}
            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="selEngenheiro"
                  className="text-xs font-bold text-emerald-950 flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#0B7A5B]" />
                  <span>Engenheiro Responsável pelo Projeto *</span>
                </Label>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                  {totalDocumentos} arquivo(s) anexado(s)
                </Badge>
              </div>

              {engenheiros.length === 0 ? (
                <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Nenhum engenheiro encontrado no sistema. Vá em <strong>Equipe</strong> e
                    adicione um membro com o papel Engenheiro.
                  </span>
                </div>
              ) : (
                <select
                  id="selEngenheiro"
                  value={selectedEngenheiroId}
                  onChange={(e) => setSelectedEngenheiroId(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white border border-emerald-300 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
                  required
                >
                  <option value="" disabled>
                    Selecione o engenheiro...
                  </option>
                  {engenheiros.map((eng) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.name || eng.email} ({eng.role || 'Engenheiro'}) — {eng.email}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* SEÇÃO 1: Dados do Cliente e Local de Instalação */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#0B7A5B]" />
                  1. Dados do Lead & Local de Instalação
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Puxado da ficha</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">
                    Nome do Cliente *
                  </Label>
                  <Input
                    value={dossieForm.cliente_nome || ''}
                    onChange={(e) =>
                      setDossieForm((prev) => ({ ...prev, cliente_nome: e.target.value }))
                    }
                    placeholder="Nome completo do cliente"
                    className="h-8 text-xs bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">
                    Contato / WhatsApp
                  </Label>
                  <Input
                    value={dossieForm.cliente_telefone || ''}
                    onChange={(e) =>
                      setDossieForm((prev) => ({ ...prev, cliente_telefone: e.target.value }))
                    }
                    placeholder="(00) 00000-0000"
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">
                    Endereço Completo / Local de Instalação *
                  </Label>
                  <Input
                    value={dossieForm.endereco_instalacao || ''}
                    onChange={(e) =>
                      setDossieForm((prev) => ({ ...prev, endereco_instalacao: e.target.value }))
                    }
                    placeholder="Rua, número, bairro, cidade - UF, CEP"
                    className="h-8 text-xs bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                    <span>Unidade Consumidora (UC)</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Nº na conta de luz
                    </span>
                  </Label>
                  <Input
                    value={dossieForm.unidade_consumidora || ''}
                    onChange={(e) =>
                      setDossieForm((prev) => ({ ...prev, unidade_consumidora: e.target.value }))
                    }
                    placeholder="Ex: 10/234567-8 ou 72019482"
                    className="h-8 text-xs bg-white font-mono-numbers"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                    <span>Consumo Médio (kWh/mês)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Ficha do lead</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={dossieForm.consumo_medio_kwh ?? ''}
                    onChange={(e) =>
                      setDossieForm((prev) => ({
                        ...prev,
                        consumo_medio_kwh: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    placeholder="Ex: 650"
                    className="h-8 text-xs bg-white font-mono-numbers"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: Somente o que foi negociado (Kit fechado) */}
            <div className="border border-emerald-200 rounded-xl p-3.5 bg-emerald-50/30 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-emerald-200/80">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#0B7A5B]" />
                  2. Somente o Negociado (Kit Fechado para Projeto)
                </span>
                <span className="text-[10px] text-emerald-800 font-medium">
                  Extraído da negociação
                </span>
              </div>

              {/* Linha dos Painéis */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <SunMedium className="w-3.5 h-3.5 text-amber-500" />
                    Painéis Fotovoltaicos
                  </span>
                  {dossieForm.paineis_quantidade && dossieForm.paineis_potencia_w ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono-numbers bg-amber-50 text-amber-800 border-amber-300 font-bold"
                    >
                      {Math.round(
                        (dossieForm.paineis_quantidade * dossieForm.paineis_potencia_w) / 10,
                      ) / 100}{' '}
                      kWp total
                    </Badge>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-600">
                      Quantidade de Painéis
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={dossieForm.paineis_quantidade ?? ''}
                      onChange={(e) =>
                        setDossieForm((prev) => ({
                          ...prev,
                          paineis_quantidade: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      placeholder="Ex: 10"
                      className="h-8 text-xs font-mono-numbers"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-600">
                      Potência por Painel (W)
                    </Label>
                    <Input
                      type="number"
                      min="100"
                      step="5"
                      value={dossieForm.paineis_potencia_w ?? ''}
                      onChange={(e) =>
                        setDossieForm((prev) => ({
                          ...prev,
                          paineis_potencia_w: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      placeholder="Ex: 630"
                      className="h-8 text-xs font-mono-numbers"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-600">
                      Modelo / Marca dos Painéis
                    </Label>
                    <Input
                      value={dossieForm.paineis_modelo || ''}
                      onChange={(e) =>
                        setDossieForm((prev) => ({ ...prev, paineis_modelo: e.target.value }))
                      }
                      placeholder="Ex: Canadian Solar, TSUN 630W..."
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Linha do Inversor */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-blue-600" />
                    Inversor Solar
                  </span>
                  {dossieForm.inversor_potencia_kw ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono-numbers bg-blue-50 text-blue-800 border-blue-300 font-bold"
                    >
                      {dossieForm.inversor_potencia_kw} kW
                    </Badge>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-600">
                      Marca do Inversor
                    </Label>
                    <Input
                      value={dossieForm.inversor_marca || ''}
                      onChange={(e) =>
                        setDossieForm((prev) => ({ ...prev, inversor_marca: e.target.value }))
                      }
                      placeholder="Ex: Sungrow, Growatt, Huawei..."
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-600">
                      Potência do Inversor (kW)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={dossieForm.inversor_potencia_kw ?? ''}
                      onChange={(e) =>
                        setDossieForm((prev) => ({
                          ...prev,
                          inversor_potencia_kw: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      placeholder="Ex: 5"
                      className="h-8 text-xs font-mono-numbers"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-600">
                      Modelo / Detalhes
                    </Label>
                    <Input
                      value={dossieForm.inversor_modelo || ''}
                      onChange={(e) =>
                        setDossieForm((prev) => ({ ...prev, inversor_modelo: e.target.value }))
                      }
                      placeholder="Ex: SG5.0RS Monofásico"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Tipo de Instalação */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Tipo de Instalação (Estrutura de Fixação)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-600">
                      Local da Montagem *
                    </Label>
                    <select
                      value={dossieForm.tipo_instalacao || 'telhado'}
                      onChange={(e) =>
                        setDossieForm((prev) => ({
                          ...prev,
                          tipo_instalacao: e.target.value as TipoInstalacaoDossie,
                        }))
                      }
                      className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
                    >
                      <option value="telhado">
                        Telhado (Telhas cerâmica, fibrocimento ou metálica)
                      </option>
                      <option value="solo">Solo (Monoposte ou biposte no chão)</option>
                      <option value="outro">Outro / Especial (Carport, laje, etc.)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-600">
                      Detalhe da Estrutura
                    </Label>
                    <Input
                      value={dossieForm.tipo_estrutura_detalhe || ''}
                      onChange={(e) =>
                        setDossieForm((prev) => ({
                          ...prev,
                          tipo_estrutura_detalhe: e.target.value,
                        }))
                      }
                      placeholder="Ex: Fibrocimento, Mini trilho ou Solo monoposte"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: Observações Adicionais */}
            <div className="space-y-1.5">
              <Label htmlFor="obsEnvio" className="text-xs font-semibold text-slate-700">
                Observações Especiais para a Engenharia (opcional)
              </Label>
              <Textarea
                id="obsEnvio"
                value={observacaoEnvio}
                onChange={(e) => setObservacaoEnvio(e.target.value)}
                placeholder="Ex: Cliente tem padrão trifásico 60A; telhado já possui reforço; verificar espaço para inversor na garagem..."
                className="text-xs min-h-[60px] border-slate-200 focus-visible:ring-[#0B7A5B]"
              />
            </div>

            {/* Resumo do que será feito */}
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 space-y-1">
              <div className="font-semibold text-slate-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>O que acontece ao clicar em Enviar:</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600">
                <li>O engenheiro recebe notificação em tempo real no sino com o kit negociado;</li>
                <li>Um e-mail transacional é enviado com o dossiê técnico formatado e anexos;</li>
                <li>
                  Os dados do dossiê ficam gravados na tela "Meus Documentos" dele para consulta do
                  projeto;
                </li>
                <li>O histórico do lead registra a versão e o kit exato enviado à engenharia.</li>
              </ul>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={sendingEngenheiro}
                onClick={() => setIsSendModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={sendingEngenheiro || !selectedEngenheiroId || engenheiros.length === 0}
                className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5"
              >
                {sendingEngenheiro ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Disparando Dossiê...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {jaEnviadoAnteriormente
                        ? 'Confirmar Reenvio do Dossiê'
                        : 'Confirmar Envio à Engenharia'}
                    </span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
