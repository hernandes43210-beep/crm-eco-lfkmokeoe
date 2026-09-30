import React, { useState } from 'react'
import type { HomologacaoLead } from '@/types/crm'
import { COLUNAS_HOMOLOGACAO, HomologacaoService } from '@/services/homologacao'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Kanban,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  User as UserIcon,
  Zap,
  Receipt,
  FileCheck2,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { formatDateTimeBR } from '@/lib/solarUtils'

interface LeadHomologacaoSectionProps {
  homologacao: HomologacaoLead | null
  loading?: boolean
  isAdmin: boolean
  isVendedor: boolean
  onHomologacaoUpdated: (updated: HomologacaoLead) => void
}

export function LeadHomologacaoSection({
  homologacao,
  loading,
  isAdmin,
  isVendedor,
  onHomologacaoUpdated,
}: LeadHomologacaoSectionProps) {
  const [markingPaga, setMarkingPaga] = useState(false)

  if (loading) {
    return (
      <Card className="border-slate-200/80 shadow-xs bg-white">
        <CardContent className="p-6 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-[#0B7A5B] mx-auto mb-2" />
          <p className="text-xs">Carregando status de homologação da engenharia...</p>
        </CardContent>
      </Card>
    )
  }

  if (!homologacao) {
    return (
      <Card className="border-slate-200/80 shadow-xs bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0B7A5B] flex items-center justify-center font-bold">
              <Kanban className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Homologação na Engenharia & Status da ART
              </CardTitle>
              <p className="text-xs text-slate-500">
                Acompanhe o andamento técnico da homologação junto à Energisa
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center space-y-1.5">
            <p className="text-xs font-semibold text-slate-700">
              Projeto ainda não encaminhado para a Engenharia
            </p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Anexe os documentos do cliente na seção abaixo e clique em{' '}
              <strong>"Enviar ao Engenheiro"</strong> para abrir o card automaticamente no Kanban de
              Homologação.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const colMeta = COLUNAS_HOMOLOGACAO.find((c) => c.id === homologacao.status) || {
    titulo: homologacao.status,
    cor: '#0B7A5B',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    descricao: '',
  }

  const isArtEnviada = homologacao.art_status === 'enviada'
  const isArtPaga = homologacao.art_status === 'paga'
  const isProjetoPago = Boolean(homologacao.projeto_pago)
  const temComprovanteArt = Boolean(homologacao.comprovante_art_arquivo)
  const temComprovanteProjeto = Boolean(homologacao.comprovante_projeto_arquivo)
  const artUrl = HomologacaoService.getArtDownloadUrl(homologacao)

  const handleMarcarPaga = async () => {
    if (!isAdmin && !isVendedor) {
      toast({
        title: 'Acesso restrito',
        description: 'Apenas vendedores ou administradores podem marcar a ART como paga.',
        variant: 'destructive',
      })
      return
    }

    try {
      setMarkingPaga(true)
      const res = await HomologacaoService.marcarArtPaga(homologacao.id)
      toast({
        title: 'ART marcada como paga!',
        description:
          'O engenheiro foi notificado no sino e por e-mail para prosseguir com o fluxo.',
      })
      onHomologacaoUpdated({
        ...homologacao,
        art_status: 'paga',
        art_paga_em: res.art_paga_em || new Date().toISOString(),
      })
    } catch (err: any) {
      console.error('Erro ao marcar ART como paga:', err)
      toast({
        title: 'Erro ao marcar ART como paga',
        description: err?.message || 'Não foi possível confirmar o pagamento da ART.',
        variant: 'destructive',
      })
    } finally {
      setMarkingPaga(false)
    }
  }

  const handleDownloadArt = () => {
    if (artUrl) {
      window.open(artUrl, '_blank')
    } else {
      toast({
        title: 'Arquivo indisponível',
        description: 'O PDF da ART ainda não foi disponibilizado.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
      {/* Top Banner Informativo se ART estiver aguardando */}
      {isArtEnviada && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-950 animate-pulse" />
            <span>Ação requerida: ART enviada pelo Engenheiro — aguardando pagamento da taxa</span>
          </div>
          <span className="text-[11px] font-mono opacity-90 hidden sm:inline">
            {homologacao.art_enviada_em ? formatDateTimeBR(homologacao.art_enviada_em) : ''}
          </span>
        </div>
      )}

      {isArtPaga && (
        <div className="bg-emerald-600 text-white px-4 py-1.5 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4" />
          <span>Taxa da ART Paga — Fluxo de Homologação em andamento com a Engenharia</span>
        </div>
      )}

      <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0B7A5B] flex items-center justify-center font-bold">
            <Kanban className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                Homologação na Engenharia & ART
              </CardTitle>
              <Badge
                variant="outline"
                className={`text-xs px-2 py-0.5 font-bold ${colMeta.badgeClass}`}
              >
                {colMeta.titulo}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Etapa atual no Kanban do Engenheiro: <strong>{colMeta.titulo}</strong>
            </p>
          </div>
        </div>

        {/* Status da ART no Header */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isArtEnviada ? (
              <Badge
                variant="outline"
                className="text-xs bg-amber-50 text-amber-900 border-amber-300 font-bold gap-1 animate-pulse"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>ART aguardando pagamento</span>
              </Badge>
            ) : isArtPaga ? (
              <Badge
                variant="outline"
                className="text-xs bg-emerald-50 text-emerald-900 border-emerald-300 font-bold gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>ART paga</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-slate-500 bg-slate-50">
                ART ainda não emitida
              </Badge>
            )}

            {isProjetoPago && (
              <Badge
                variant="outline"
                className="text-xs bg-blue-50 text-blue-900 border-blue-300 font-bold gap-1"
              >
                <Receipt className="w-3.5 h-3.5 text-blue-700" />
                <span>Projeto pago</span>
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Painel com 7 etapas em linha indicando onde o lead está */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Progresso do Kanban de Homologação
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 pt-1">
            {COLUNAS_HOMOLOGACAO.map((col, idx) => {
              const isCurrent = col.id === homologacao.status
              const currentIndex = COLUNAS_HOMOLOGACAO.findIndex((c) => c.id === homologacao.status)
              const isPassed = idx < currentIndex

              return (
                <div
                  key={col.id}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    isCurrent
                      ? 'border-[#0B7A5B] bg-emerald-50/80 shadow-xs ring-1 ring-[#0B7A5B]'
                      : isPassed
                        ? 'border-slate-200 bg-slate-50/90 text-slate-500'
                        : 'border-slate-200/60 bg-white text-slate-400 opacity-60'
                  }`}
                >
                  <span className="text-[9px] font-mono font-bold block mb-0.5 text-slate-400">
                    Etapa {idx + 1}
                  </span>
                  <p
                    className={`text-[11px] font-bold truncate ${
                      isCurrent ? 'text-[#0B7A5B]' : isPassed ? 'text-slate-700' : 'text-slate-400'
                    }`}
                    title={col.titulo}
                  >
                    {col.titulo}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bloco de Informações da ART & Download / Pagamento */}
        <div
          className={`p-4 rounded-xl border ${
            isArtEnviada
              ? 'bg-amber-50/40 border-amber-300'
              : isArtPaga
                ? 'bg-emerald-50/30 border-emerald-300'
                : 'bg-slate-50/50 border-slate-200'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <FileText
                  className={`w-5 h-5 ${
                    isArtEnviada
                      ? 'text-amber-600'
                      : isArtPaga
                        ? 'text-emerald-700'
                        : 'text-slate-400'
                  }`}
                />
                <h4 className="text-sm font-bold text-slate-900">
                  Documento da ART (Anotação de Responsabilidade Técnica)
                </h4>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                {homologacao.art_enviada_em && (
                  <span>
                    Enviada em:{' '}
                    <strong className="text-slate-800">
                      {formatDateTimeBR(homologacao.art_enviada_em)}
                    </strong>
                  </span>
                )}
                {homologacao.art_paga_em && (
                  <span className="text-emerald-800 font-semibold">
                    • Confirmada paga em: {formatDateTimeBR(homologacao.art_paga_em)}
                  </span>
                )}
                {homologacao.expand?.engenheiro?.name && (
                  <span>
                    • Engenheiro:{' '}
                    <strong className="text-slate-800">{homologacao.expand.engenheiro.name}</strong>
                  </span>
                )}
              </div>

              {homologacao.art_observacao && (
                <p className="text-xs text-slate-700 bg-white/80 p-2 rounded-md border border-slate-200 mt-1">
                  <strong>Instruções do Engenheiro:</strong> {homologacao.art_observacao}
                </p>
              )}
            </div>

            {/* Ações Comerciais: Baixar ART e Marcar ART como Paga */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
              {homologacao.art_arquivo && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadArt}
                  className="h-9 text-xs font-bold border-slate-300 text-slate-800 hover:text-[#0B7A5B] gap-1.5 bg-white shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar ART (PDF)</span>
                </Button>
              )}

              {/* Botão Marcar ART como Paga: exclusivo para Vendedor / Admin */}
              {(isAdmin || isVendedor) && isArtEnviada && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleMarcarPaga}
                  disabled={markingPaga}
                  className="h-9 text-xs font-bold bg-[#0B7A5B] hover:bg-[#095C44] text-white gap-1.5 shadow-xs"
                >
                  {markingPaga ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Confirmando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Marcar ART como Paga</span>
                    </>
                  )}
                </Button>
              )}

              {isArtPaga && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs px-2.5 py-1 font-bold gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Pagamento Confirmado</span>
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Bloco de Comprovantes de Pagamento (Visualização e Download pelo Vendedor/Equipe) */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Comprovantes de Pagamento Anexados pela Engenharia / Diretoria
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Comprovante da ART */}
            <div
              className={`p-3 rounded-lg border text-xs ${
                temComprovanteArt || isArtPaga
                  ? 'border-emerald-200 bg-emerald-50/30'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                  Comprovante da ART
                </span>
                {isArtPaga ? (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-bold h-5">
                    ART Paga
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-slate-500 h-5">
                    Pendente
                  </Badge>
                )}
              </div>

              {temComprovanteArt ? (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] text-slate-600">
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
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const url = HomologacaoService.getComprovanteArtUrl(homologacao)
                      if (url) window.open(url, '_blank')
                    }}
                    className="h-7 text-xs font-semibold gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 shadow-2xs"
                  >
                    <Download className="w-3 h-3" />
                    <span>Baixar Comprovante ART</span>
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic pt-1">
                  Nenhum comprovante de pagamento da ART anexado até o momento.
                </p>
              )}
            </div>

            {/* Comprovante do Projeto */}
            <div
              className={`p-3 rounded-lg border text-xs ${
                temComprovanteProjeto || isProjetoPago
                  ? 'border-blue-200 bg-blue-50/30'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-blue-600" />
                  Comprovante do Projeto
                </span>
                {isProjetoPago ? (
                  <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] font-bold h-5">
                    Projeto Pago
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-slate-500 h-5">
                    Pendente
                  </Badge>
                )}
              </div>

              {temComprovanteProjeto ? (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] text-slate-600">
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
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const url = HomologacaoService.getComprovanteProjetoUrl(homologacao)
                      if (url) window.open(url, '_blank')
                    }}
                    className="h-7 text-xs font-semibold gap-1.5 border-blue-300 text-blue-800 hover:bg-blue-50 shadow-2xs"
                  >
                    <Download className="w-3 h-3" />
                    <span>Baixar Comprovante Projeto</span>
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic pt-1">
                  Nenhum comprovante de pagamento do projeto anexado até o momento.
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
