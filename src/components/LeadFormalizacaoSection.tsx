import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileCheck,
  FileText,
  FileSignature,
  Download,
  Printer,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Plus,
  Trash2,
  Calendar,
  UserCheck,
} from 'lucide-react'
import { Lead, Proposta, FormalizacaoDocumento, FormalizacaoTipo } from '@/types/crm'
import { FormalizacaoService } from '@/services/formalizacao'
import { FormalizacaoDocEditorModal } from './FormalizacaoDocEditorModal'
import { formatDateBR, formatDateTimeBR } from '@/lib/solarUtils'
import { useToast } from '@/hooks/use-toast'

interface LeadFormalizacaoSectionProps {
  lead: Lead
  propostas: Proposta[]
  isAdmin: boolean
  currentUserId?: string
  onLeadUpdated?: () => void
}

export function LeadFormalizacaoSection({
  lead,
  propostas,
  isAdmin,
  currentUserId,
  onLeadUpdated,
}: LeadFormalizacaoSectionProps) {
  const { toast } = useToast()
  const [documentos, setDocumentos] = useState<FormalizacaoDocumento[]>([])
  const [loading, setLoading] = useState(true)

  // Modais de edição/geração
  const [activeModalTipo, setActiveModalTipo] = useState<FormalizacaoTipo | null>(null)

  // Carregar documentos de formalização
  const loadDocumentos = React.useCallback(async () => {
    try {
      setLoading(true)
      const list = await FormalizacaoService.listByLead(lead.id)
      setDocumentos(list)
    } catch (err) {
      console.error('Erro ao listar documentos:', err)
    } finally {
      setLoading(false)
    }
  }, [lead.id])

  useEffect(() => {
    loadDocumentos()
  }, [loadDocumentos])

  // Melhor proposta vinculada (prioriza proposta Aceita, ou a mais recente)
  const bestProposal = React.useMemo(() => {
    if (!propostas || propostas.length === 0) return undefined
    const aceita = propostas.find((p) => p.status === 'Aceita')
    if (aceita) return aceita
    return propostas[0]
  }, [propostas])

  // Último contrato gerado
  const latestContrato = React.useMemo(() => {
    return documentos.find((d) => d.tipo === 'contrato')
  }, [documentos])

  // Última procuração gerada
  const latestProcuracao = React.useMemo(() => {
    return documentos.find((d) => d.tipo === 'procuracao')
  }, [documentos])

  // Campos cadastrais do lead para checagem
  const missingLeadFields = React.useMemo(() => {
    const list: string[] = []
    if (!lead.cpf_cnpj) list.push('CPF/CNPJ')
    if (!lead.nacionalidade) list.push('Nacionalidade')
    if (!lead.estado_civil) list.push('Estado Civil')
    if (!lead.profissao) list.push('Profissão')
    if (!lead.endereco) list.push('Endereço')
    if (!lead.cidade) list.push('Cidade')
    if (!lead.cep) list.push('CEP')
    return list
  }, [lead])

  const handleDeleteDoc = async (docId: string, tipo: string) => {
    if (!confirm(`Deseja realmente remover esta versão do ${tipo}?`)) return
    try {
      await FormalizacaoService.deleteDocumento(docId)
      toast({
        title: 'Documento removido',
        description: 'O anexo foi excluído com sucesso.',
      })
      loadDocumentos()
      onLeadUpdated?.()
    } catch {
      toast({
        title: 'Erro ao excluir',
        variant: 'destructive',
      })
    }
  }

  const handleOpenDocPrint = (doc: FormalizacaoDocumento) => {
    if (doc.conteudo_html) {
      FormalizacaoService.openPrintWindow(doc.conteudo_html, doc.titulo)
    } else if (doc.arquivo_pdf) {
      const url = FormalizacaoService.getFileUrl(doc)
      window.open(url, '_blank')
    }
  }

  return (
    <Card className="border-emerald-300 bg-white shadow-xs overflow-hidden ring-1 ring-emerald-200">
      {/* Header Institucional da Formalização */}
      <CardHeader className="p-4 sm:p-5 bg-gradient-to-r from-[#0A192F] via-[#0F284E] to-[#163868] text-white border-b border-amber-400/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300">
                <FileCheck className="w-5 h-5" />
              </span>
              <CardTitle className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Etapa de Formalização Contratual & Energisa</span>
                <Badge className="bg-emerald-500/90 text-white hover:bg-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                  Fechado Ganho
                </Badge>
              </CardTitle>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Gere o <strong>Contrato</strong> e a <strong>Procuração Energisa</strong> com
              substituição automática de dados do cliente, potência do kit, tabela de equipamentos e
              parcelas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => setActiveModalTipo('contrato')}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8.5 gap-1.5 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-slate-950" />
              <span>Gerar Contrato</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setActiveModalTipo('procuracao')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs h-8.5 gap-1.5 shadow-sm"
            >
              <FileSignature className="w-3.5 h-3.5 text-white" />
              <span>Gerar Procuração</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Checklist de Qualificação e Campos para Formalização */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#0B7A5B]" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Dados do Cliente para Emissão
              </span>
            </div>

            {missingLeadFields.length === 0 ? (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                <span>Cadastro Completo para Formalização</span>
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>
                  {missingLeadFields.length} campos ausentes no cadastro (destacados no gerador)
                </span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Nome Completo
              </span>
              <span className="font-bold text-slate-800 truncate block mt-0.5">{lead.nome}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                CPF / CNPJ
              </span>
              <span
                className={`font-bold truncate block mt-0.5 ${lead.cpf_cnpj ? 'text-slate-800' : 'text-amber-600 italic'}`}
              >
                {lead.cpf_cnpj || 'Não informado'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Estado Civil & Profissão
              </span>
              <span className="font-medium text-slate-800 truncate block mt-0.5">
                {[lead.estado_civil, lead.profissao].filter(Boolean).join(' • ') ||
                  'Não informados'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Localidade & CEP
              </span>
              <span className="font-medium text-slate-800 truncate block mt-0.5">
                {[lead.cidade, lead.estado].filter(Boolean).join('-')}{' '}
                {lead.cep ? `(${lead.cep})` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Grade de 2 Cartões: CONTRATO e PROCURAÇÃO ENERGISA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cartão 1: CONTRATO DE PRESTAÇÃO DE SERVIÇOS */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Contrato de Prestação de Serviços
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Modelo integral Ecosolar Energy (6 páginas)
                    </p>
                  </div>
                </div>

                {latestContrato ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[11px] font-semibold gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Versão {latestContrato.versao || 1}</span>
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[11px] text-slate-500 bg-slate-50 border-slate-200"
                  >
                    Pendente
                  </Badge>
                )}
              </div>

              <div className="text-xs text-slate-600 space-y-1.5 pt-1 border-t border-slate-100">
                <p>
                  • <strong>Variáveis inseridas:</strong> Dados do cliente,{' '}
                  {bestProposal?.kit_potencia_kw
                    ? `${bestProposal.kit_potencia_kw} kWp`
                    : 'potência do kit'}
                  , tabela de equipamentos decomposta, valor da proposta e parcelamento.
                </p>
                <p>
                  • <strong>Dados fixos:</strong> H Da Silva Costa Ltda / Ecosolar, Cláusulas 1 a
                  11, Concessionária Energisa e Foro de São Miguel do Guaporé.
                </p>
              </div>

              {latestContrato && (
                <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-900">
                  <span className="font-semibold block">Última versão salva:</span>
                  <span className="text-[11px] text-emerald-700">
                    Em {formatDateTimeBR(latestContrato.created)}
                    {latestContrato.expand?.criado_por?.name
                      ? ` por ${latestContrato.expand.criado_por.name}`
                      : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <Button
                size="sm"
                onClick={() => setActiveModalTipo('contrato')}
                className="bg-[#0A192F] hover:bg-[#0F284E] text-white text-xs font-semibold h-8 gap-1.5 flex-1"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>{latestContrato ? 'Editar / Nova Versão' : 'Gerar Contrato'}</span>
              </Button>

              {latestContrato && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDocPrint(latestContrato)}
                  className="h-8 text-xs font-semibold border-slate-200 text-slate-700 hover:text-blue-600 gap-1"
                  title="Imprimir ou baixar documento em PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </Button>
              )}
            </div>
          </div>

          {/* Cartão 2: PROCURAÇÃO ENERGISA */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                    <FileSignature className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Procuração Energisa Rondônia
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Homologação junto à distribuidora de energia
                    </p>
                  </div>
                </div>

                {latestProcuracao ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[11px] font-semibold gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Versão {latestProcuracao.versao || 1}</span>
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[11px] text-slate-500 bg-slate-50 border-slate-200"
                  >
                    Pendente
                  </Badge>
                )}
              </div>

              <div className="text-xs text-slate-600 space-y-1.5 pt-1 border-t border-slate-100">
                <p>
                  • <strong>Variáveis inseridas:</strong> Qualificação completa do cliente (nome,
                  CPF/CNPJ, nacionalidade, estado civil, profissão, endereço, bairro, município,
                  estado, CEP) e data por extenso com validação de calendário real.
                </p>
                <p>
                  • <strong>Dados fixos:</strong> Outorgados 1º) Willian da Costa Goveia (CREA
                  26000217D RO, Jaru/RO) e 2º) Hernandes da Silva Costa (CEO Ecosolar Energy), 6
                  poderes oficiais Energisa Rondônia, validade de 12 meses e local SERINGUEIRAS –
                  RO.
                </p>
              </div>

              {latestProcuracao && (
                <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-900">
                  <span className="font-semibold block">Última versão salva:</span>
                  <span className="text-[11px] text-emerald-700">
                    Em {formatDateTimeBR(latestProcuracao.created)}
                    {latestProcuracao.expand?.criado_por?.name
                      ? ` por ${latestProcuracao.expand.criado_por.name}`
                      : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <Button
                size="sm"
                onClick={() => setActiveModalTipo('procuracao')}
                className="bg-[#0A192F] hover:bg-[#0F284E] text-white text-xs font-semibold h-8 gap-1.5 flex-1"
              >
                <FileSignature className="w-3.5 h-3.5 text-emerald-400" />
                <span>{latestProcuracao ? 'Editar / Nova Versão' : 'Gerar Procuração'}</span>
              </Button>

              {latestProcuracao && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDocPrint(latestProcuracao)}
                  className="h-8 text-xs font-semibold border-slate-200 text-slate-700 hover:text-blue-600 gap-1"
                  title="Imprimir ou baixar documento em PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Histórico de Anexos Finalizados */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#0B7A5B]" />
              <span>Documentos e Anexos de Formalização do Lead ({documentos.length})</span>
            </h4>
            <span className="text-[11px] text-slate-400">Armazenamento oficial de contratos</span>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 py-3 text-center">Carregando anexos...</p>
          ) : documentos.length === 0 ? (
            <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                Nenhum documento finalizado ainda
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Clique nos botões acima para preencher, revisar e finalizar o Contrato e a
                Procuração.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documentos.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        doc.tipo === 'contrato'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {doc.tipo === 'contrato' ? (
                        <FileText className="w-4 h-4" />
                      ) : (
                        <FileSignature className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate">{doc.titulo}</p>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-bold bg-slate-50 text-slate-700"
                        >
                          v{doc.versao || 1}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Gerado em {formatDateTimeBR(doc.created)}
                        {doc.expand?.criado_por?.name ? ` • por ${doc.expand.criado_por.name}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDocPrint(doc)}
                      className="h-7 px-2.5 text-xs font-semibold border-slate-200 text-slate-700 hover:text-blue-700 gap-1"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Visualizar / PDF</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteDoc(doc.id, doc.tipo)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                      title="Excluir documento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Modal de Edição e Finalização */}
      {activeModalTipo && (
        <FormalizacaoDocEditorModal
          open={!!activeModalTipo}
          onOpenChange={(op) => {
            if (!op) setActiveModalTipo(null)
          }}
          tipo={activeModalTipo}
          lead={lead}
          proposta={bestProposal}
          onSaved={() => {
            loadDocumentos()
            onLeadUpdated?.()
          }}
        />
      )}
    </Card>
  )
}
