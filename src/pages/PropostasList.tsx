import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Search,
  Filter,
  Sparkles,
  Send,
  FileDown,
  ExternalLink,
  Check,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Users,
  Eye,
  Trash2,
  Edit,
} from 'lucide-react'
import { ProposalsService } from '@/services/proposals'
import { toPortugueseErrorMessage } from '@/lib/errors'
import { DeletePropostaDialog } from '@/components/DeletePropostaDialog'
import { EditarPropostaModal } from '@/components/EditarPropostaModal'
import type { Proposta } from '@/types/crm'
import useRealtime from '@/hooks/use-realtime'
import { formatBRL, formatDateBR, formatDateTimeBR } from '@/lib/solarUtils'
import { calcularMargemReal } from '@/utils/marginUtils'
import { openProposalPDFPrint } from '@/lib/proposalPdf'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'

export default function PropostasList() {
  const navigate = useNavigate()
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [propostaToDelete, setPropostaToDelete] = useState<Proposta | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [propostaToEdit, setPropostaToEdit] = useState<Proposta | null>(null)

  const fetchPropostas = async () => {
    try {
      setLoading(true)
      const res = await ProposalsService.getAllPropostas({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      })
      setPropostas(res.items)
    } catch (err) {
      console.error('Erro ao listar propostas:', err)
      toast({
        title: 'Erro ao carregar propostas',
        description: 'Não foi possível carregar a listagem de propostas comerciais.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPropostas()
  }, [statusFilter])

  // Realtime subscription
  useRealtime<Proposta>('propostas', (e) => {
    if (e.action === 'create') {
      setPropostas((prev) => [e.record, ...prev])
    } else if (e.action === 'update') {
      setPropostas((prev) => prev.map((p) => (p.id === e.record.id ? e.record : p)))
    } else if (e.action === 'delete') {
      setPropostas((prev) => prev.filter((p) => p.id !== e.record.id))
    }
  })

  const handleCopyLink = (token: string) => {
    // Copia o link público oficial limpo para envio ao cliente
    const url = ProposalsService.getPublicUrl(token)
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    toast({
      title: 'Link do cliente copiado!',
      description: 'Link oficial pronto para envio ao cliente via WhatsApp ou e-mail.',
    })
    setTimeout(() => setCopiedToken(null), 3000)
  }
  const handleDeleteProposta = async () => {
    if (!propostaToDelete) return
    const id = propostaToDelete.id
    const kitNome = propostaToDelete.kit_nome

    try {
      setIsDeleting(true)
      await ProposalsService.deleteProposta(id)

      // Atualização otimista imediata na listagem
      setPropostas((prev) => prev.filter((p) => p.id !== id))

      toast({
        title: 'Proposta excluída',
        description: `A proposta "${kitNome}" foi removida com sucesso.`,
      })
      setPropostaToDelete(null)
    } catch (err: unknown) {
      console.error('Erro ao excluir proposta:', err)
      const errorMsg = toPortugueseErrorMessage(
        err,
        'Não foi possível excluir a proposta comercial. Tente novamente mais tarde.',
      )

      toast({
        title: 'Erro ao excluir proposta',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSendWhatsApp = (prop: Proposta) => {
    const leadPhone = (prop.expand?.lead?.telefone || '').replace(/\D/g, '')
    const leadNome = prop.expand?.lead?.nome || 'Cliente'
    const publicUrl = ProposalsService.getPublicUrl(prop.token_publico)
    const msg = `Olá, ${leadNome}! Tudo bem? Segue a proposta comercial do seu sistema solar (${prop.kit_nome}) no valor de ${formatBRL(prop.preco_venda)}. Você pode visualizar todos os detalhes e aprovar online através do link: ${publicUrl}`

    if (leadPhone) {
      window.open(`https://wa.me/55${leadPhone}?text=${encodeURIComponent(msg)}`, '_blank')
    } else {
      navigator.clipboard.writeText(msg)
      toast({
        title: 'Lead sem telefone cadastrado',
        description: 'A mensagem com o link foi copiada para sua área de transferência.',
      })
    }
  }

  const handleDownloadPDF = (prop: Proposta) => {
    const lead = prop.expand?.lead
    openProposalPDFPrint({
      id: prop.id,
      token_publico: prop.token_publico,
      status: prop.status,
      kit_nome: prop.kit_nome,
      kit_potencia_kw: prop.kit_potencia_kw,
      kit_fabricante: prop.kit_fabricante,
      custo: prop.custo,
      margem: prop.margem,
      preco_venda: prop.preco_venda,
      desconto_percentual: prop.desconto_percentual,
      valor_desconto: prop.valor_desconto,
      valor_bruto: prop.valor_bruto,
      validade_dias: prop.validade_dias,
      data_validade: prop.data_validade,
      condicoes_pagamento: prop.condicoes_pagamento,
      observacoes: prop.observacoes,
      data_aceite: prop.data_aceite,
      aceito_por_nome: prop.aceito_por_nome,
      created: prop.created,
      kit_descricao: (prop as any)?.kit_descricao || prop.expand?.kit?.descricao,
      kit_string_box:
        (prop as any)?.kit_string_box || (prop.expand?.kit as any)?.string_box || undefined,
      kit_marca_painel:
        (prop as any)?.kit_marca_painel || (prop.expand?.kit as any)?.marca_painel || undefined,
      kit_marca_inversor:
        (prop as any)?.kit_marca_inversor || (prop.expand?.kit as any)?.marca_inversor || undefined,
      kit_potencia_painel_w:
        (prop as any)?.kit_potencia_painel_w ||
        (prop.expand?.kit as any)?.potencia_painel_w ||
        undefined,
      kit_potencia_inversor_kw:
        (prop as any)?.kit_potencia_inversor_kw ||
        (prop.expand?.kit as any)?.potencia_inversor_kw ||
        undefined,
      kit_tipo_estrutura:
        (prop as any)?.kit_tipo_estrutura || (prop.expand?.kit as any)?.tipo_estrutura || undefined,
      cliente: {
        nome: lead?.nome || 'Cliente',
        email: lead?.email,
        telefone: lead?.telefone,
        cidade: lead?.cidade,
        estado: lead?.estado,
        endereco: lead?.endereco,
        consumo_mensal_kwh: lead?.consumo_mensal_kwh,
      },
      vendedor: {
        name: prop.expand?.criado_por?.name,
        email: prop.expand?.criado_por?.email,
      },
    })
  }

  // Filtragem local por texto de busca
  const filtered = propostas.filter((p) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    const leadNome = (p.expand?.lead?.nome || '').toLowerCase()
    const kitNome = p.kit_nome.toLowerCase()
    const fab = (p.kit_fabricante || '').toLowerCase()
    return leadNome.includes(q) || kitNome.includes(q) || fab.includes(q)
  })

  // Métricas
  const totalValor = filtered.reduce((acc, p) => acc + (p.preco_venda || 0), 0)
  const totalAceitas = filtered.filter((p) => p.status === 'Aceita').length
  const valorAceitas = filtered
    .filter((p) => p.status === 'Aceita')
    .reduce((acc, p) => acc + (p.preco_venda || 0), 0)

  return (
    <div className="space-y-6 select-none animate-fade-in-up pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#0B7A5B]" />
            <span>Gestão de Propostas Comerciais</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Acompanhe propostas geradas, links públicos enviados aos clientes e taxas de aceite
            digital
          </p>
        </div>

        <Button
          onClick={() => navigate('/leads')}
          className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5 h-9 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Nova Proposta a partir de Lead</span>
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs uppercase font-bold text-slate-400">Total em Propostas</p>
            <p className="text-2xl font-black text-slate-900 font-mono-numbers mt-1">
              {formatBRL(totalValor)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {filtered.length} propostas listadas
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-emerald-50/50 border-emerald-200/70 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs uppercase font-bold text-emerald-800">
              Propostas Aceitas (Vendas)
            </p>
            <p className="text-2xl font-black text-emerald-700 font-mono-numbers mt-1">
              {formatBRL(valorAceitas)}
            </p>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              {totalAceitas} contratos fechados via link público
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs uppercase font-bold text-slate-400">Taxa de Conversão</p>
            <p className="text-2xl font-black text-slate-900 font-mono-numbers mt-1">
              {filtered.length > 0
                ? `${Math.round((totalAceitas / filtered.length) * 100)}%`
                : '0%'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Conversão direta de propostas geradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, kit solar ou fabricante..."
            className="pl-9 h-9 text-xs border-slate-200"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-full sm:w-44 border-slate-200">
              <SelectValue placeholder="Status da Proposta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Todos os Status
              </SelectItem>
              <SelectItem value="Enviada" className="text-xs">
                Enviada
              </SelectItem>
              <SelectItem value="Aceita" className="text-xs">
                Aceita
              </SelectItem>
              <SelectItem value="Rascunho" className="text-xs">
                Rascunho
              </SelectItem>
              <SelectItem value="Recusada" className="text-xs">
                Recusada
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de Propostas */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#0B7A5B] mx-auto mb-3" />
          <p className="text-sm">Carregando propostas comerciais...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-slate-200 bg-white">
          <CardContent className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#0B7A5B] flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Nenhuma proposta encontrada</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {search || statusFilter !== 'all'
                ? 'Nenhuma proposta corresponde aos filtros aplicados.'
                : 'Você ainda não gerou propostas comerciais. Acesse qualquer oportunidade em Leads e clique em "Gerar Proposta".'}
            </p>
            <div className="pt-2">
              <Button
                onClick={() => navigate('/leads')}
                className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5"
              >
                <Users className="w-4 h-4" />
                <span>Ir para a Lista de Leads</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((prop) => {
            const lead = prop.expand?.lead
            const publicUrl = ProposalsService.getPublicUrl(prop.token_publico)
            const isAceita = prop.status === 'Aceita'
            const isRecusada = prop.status === 'Recusada'

            return (
              <Card
                key={prop.id}
                className={`transition-all hover:border-slate-300 shadow-xs ${
                  isAceita
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : isRecusada
                      ? 'border-rose-200 bg-rose-50/10'
                      : 'border-slate-200/80 bg-white'
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Bloco de Informações */}
                    <div className="space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 tracking-tight">
                          {prop.kit_nome}
                        </span>

                        <Badge
                          variant="outline"
                          className={`text-xs px-2.5 py-0.5 font-bold ${
                            isAceita
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : prop.status === 'Enviada'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : isRecusada
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {prop.status}
                        </Badge>

                        {prop.kit_potencia_kw && (
                          <span className="text-xs text-slate-500 font-mono-numbers">
                            {prop.kit_potencia_kw} kWp
                          </span>
                        )}
                      </div>

                      {/* Dados do Cliente e Venda */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
                        <span>
                          Cliente:{' '}
                          {lead ? (
                            <button
                              onClick={() => navigate(`/leads/${lead.id}`)}
                              className="font-bold text-[#0B7A5B] hover:underline"
                            >
                              {lead.nome}
                            </button>
                          ) : (
                            <span className="font-semibold text-slate-700">Lead vinculado</span>
                          )}
                          {lead?.cidade ? ` (${lead.cidade}/${lead.estado})` : ''}
                        </span>

                        <div className="inline-flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-500">Valor da Proposta:</span>
                          {prop.desconto_percentual && prop.desconto_percentual > 0 ? (
                            <>
                              <span className="line-through text-slate-400 font-mono-numbers text-xs">
                                {formatBRL(prop.valor_bruto || prop.preco_venda)}
                              </span>
                              <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-1.5 py-0 font-bold">
                                -{prop.desconto_percentual}% OFF
                              </Badge>
                              <strong className="text-slate-900 font-extrabold font-mono-numbers text-sm text-[#0B7A5B]">
                                {formatBRL(prop.preco_venda)}
                              </strong>
                            </>
                          ) : (
                            <strong className="text-slate-900 font-bold font-mono-numbers text-sm text-[#0B7A5B]">
                              {formatBRL(prop.preco_venda)}
                            </strong>
                          )}
                        </div>

                        <span>
                          Margem:{' '}
                          <span className="font-mono-numbers font-semibold">{prop.margem}%</span>
                        </span>

                        {(() => {
                          const precoFinal = prop.preco_venda || prop.valor_bruto || 0
                          const mReal = calcularMargemReal(precoFinal, prop.custo)
                          return (
                            <span className="inline-flex items-center gap-1.5 flex-wrap">
                              <span className="text-slate-500">Margem real:</span>
                              <Badge
                                className={`text-[10px] px-1.5 py-0 font-bold border font-mono-numbers ${mReal.status.badgeClass}`}
                                title={`${mReal.status.label}: ${mReal.status.descricao}`}
                              >
                                {mReal.formatado}
                              </Badge>
                            </span>
                          )
                        })()}

                        <span>
                          Validade:{' '}
                          <strong className="text-slate-800 font-mono-numbers">
                            {formatDateBR(prop.data_validade)}
                          </strong>
                        </span>
                      </div>

                      {/* Rastreamento de visualizações */}
                      <div className="pt-0.5">
                        {prop.visualizacoes_count && prop.visualizacoes_count > 0 ? (
                          <div className="inline-flex flex-wrap items-center gap-1.5 text-xs text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded">
                            <span className="font-semibold text-amber-950">
                              Visualizada {prop.visualizacoes_count}{' '}
                              {prop.visualizacoes_count === 1 ? 'vez' : 'vezes'}
                            </span>
                            {prop.ultima_visualizacao && (
                              <span className="text-amber-800">
                                (última em {formatDateTimeBR(prop.ultima_visualizacao)})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Ainda não visualizada pelo cliente
                          </span>
                        )}
                      </div>

                      {isAceita && (
                        <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5 pt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            Aceita formalmente em{' '}
                            {formatDateTimeBR(prop.data_aceite || prop.updated)}
                            {prop.aceito_por_nome ? ` por ${prop.aceito_por_nome}` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Botões de Ações */}
                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyLink(prop.token_publico)}
                        className="h-8.5 text-xs font-semibold border-slate-200 text-slate-700 hover:text-[#0B7A5B] gap-1.5"
                        title="Copiar link público para o cliente"
                      >
                        {copiedToken === prop.token_publico ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-3.5 h-3.5" />
                            <span>Copiar Link</span>
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleSendWhatsApp(prop)}
                        className="h-8.5 text-xs font-semibold bg-[#25D366] hover:bg-[#20bd5a] text-white gap-1.5 shadow-xs"
                        title="Enviar link formatado via WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPDF(prop)}
                        className="h-8.5 text-xs font-semibold border-slate-200 text-slate-700 hover:text-blue-600 gap-1.5"
                        title="Gerar e imprimir proposta em PDF"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Baixar PDF</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const previewUrl = ProposalsService.getPublicUrl(prop.token_publico, {
                            preview: true,
                          })
                          window.open(previewUrl, '_blank')
                        }}
                        className="h-8.5 text-xs text-slate-600 hover:text-slate-900 gap-1"
                        title="Pré-visualizar proposta como consultor (não conta visualização do cliente)"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir Link</span>
                      </Button>

                      {lead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="h-8.5 text-xs text-[#0B7A5B] hover:bg-emerald-50 gap-1"
                          title="Ver detalhes do lead"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Lead</span>
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPropostaToEdit(prop)}
                        className="h-8.5 text-xs font-semibold border-slate-200 text-slate-700 hover:text-[#0B7A5B] gap-1.5"
                        title="Editar dados e valores da proposta"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPropostaToDelete(prop)}
                        className="h-8.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1.5"
                        title="Excluir proposta permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de edição de proposta */}
      <EditarPropostaModal
        open={!!propostaToEdit}
        onOpenChange={(open) => {
          if (!open) setPropostaToEdit(null)
        }}
        proposta={propostaToEdit}
        onProposalUpdated={(atualizada) => {
          setPropostas((prev) => prev.map((p) => (p.id === atualizada.id ? atualizada : p)))
        }}
      />

      {/* Modal de confirmação de exclusão */}
      <DeletePropostaDialog
        open={!!propostaToDelete}
        onOpenChange={(open) => {
          if (!open) setPropostaToDelete(null)
        }}
        proposta={propostaToDelete}
        isDeleting={isDeleting}
        onConfirm={handleDeleteProposta}
      />
    </div>
  )
}
