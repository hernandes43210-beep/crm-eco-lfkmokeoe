import React, { useState } from 'react'
import type { HomologacaoLead, HomologacaoStatus } from '@/types/crm'
import { COLUNAS_HOMOLOGACAO, HomologacaoService } from '@/services/homologacao'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Clock,
  CheckCircle2,
  FileUp,
  Download,
  MapPin,
  Zap,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface KanbanHomologacaoProps {
  homologacoes: HomologacaoLead[]
  onHomologacaoUpdated: (updatedList: HomologacaoLead[]) => void
  onOpenEnviarArt: (hom: HomologacaoLead) => void
  onSelectCard: (hom: HomologacaoLead) => void
}

export function KanbanHomologacao({
  homologacoes,
  onHomologacaoUpdated,
  onOpenEnviarArt,
  onSelectCard,
}: KanbanHomologacaoProps) {
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<HomologacaoStatus | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)

  // Mover status via Drag & Drop ou Botão
  const handleMoverStatus = async (homId: string, novoStatus: HomologacaoStatus) => {
    const cardAtual = homologacoes.find((h) => h.id === homId)
    if (!cardAtual || cardAtual.status === novoStatus) return

    // Otimistic update
    const previousList = [...homologacoes]
    const updatedList = homologacoes.map((h) =>
      h.id === homId
        ? {
            ...h,
            status: novoStatus,
            visualizado_em: h.visualizado_em || new Date().toISOString(),
          }
        : h,
    )
    onHomologacaoUpdated(updatedList)

    try {
      setMovingId(homId)
      await HomologacaoService.moverStatus(homId, novoStatus)
      const colMeta = COLUNAS_HOMOLOGACAO.find((c) => c.id === novoStatus)
      toast({
        title: 'Status atualizado',
        description: `Cliente ${cardAtual.cliente_nome || 'Lead'} movido para "${colMeta?.titulo || novoStatus}".`,
      })
    } catch (err: any) {
      console.error('Erro ao mover status no Kanban:', err)
      onHomologacaoUpdated(previousList)
      toast({
        title: 'Erro ao movimentar card',
        description: err?.message || 'Não foi possível atualizar o status.',
        variant: 'destructive',
      })
    } finally {
      setMovingId(null)
    }
  }

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    setDraggedCardId(id)
  }

  const handleDragEnd = () => {
    setDraggedCardId(null)
    setDragOverCol(null)
  }

  const handleDragOver = (e: React.DragEvent, colId: HomologacaoStatus) => {
    e.preventDefault()
    if (dragOverCol !== colId) {
      setDragOverCol(colId)
    }
  }

  const handleDrop = (e: React.DragEvent, targetCol: HomologacaoStatus) => {
    e.preventDefault()
    setDragOverCol(null)
    const cardId = e.dataTransfer.getData('text/plain') || draggedCardId
    if (cardId) {
      handleMoverStatus(cardId, targetCol)
    }
    setDraggedCardId(null)
  }

  const handleDownloadArt = (e: React.MouseEvent, hom: HomologacaoLead) => {
    e.stopPropagation()
    const url = HomologacaoService.getArtDownloadUrl(hom)
    if (url) {
      window.open(url, '_blank')
    } else {
      toast({
        title: 'Arquivo indisponível',
        description: 'O arquivo da ART não foi localizado.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Visualização em 7 Colunas com rolagem horizontal suave */}
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 select-none min-h-[620px] scrollbar-thin">
        {COLUNAS_HOMOLOGACAO.map((col, colIdx) => {
          const cardsDaColuna = homologacoes.filter((h) => h.status === col.id)
          const isOver = dragOverCol === col.id

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col shrink-0 w-[275px] rounded-xl border transition-all duration-200 bg-slate-100/70 ${
                isOver
                  ? 'border-[#0B7A5B] bg-emerald-50/40 ring-2 ring-[#0B7A5B]/30'
                  : 'border-slate-200/90'
              }`}
            >
              {/* Header da Coluna */}
              <div className="p-3 border-b border-slate-200/80 bg-white rounded-t-xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: col.cor }}
                    />
                    <h3 className="text-xs font-extrabold text-slate-800 tracking-tight truncate">
                      {col.titulo}
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold px-1.5 py-0 h-4 bg-slate-100 text-slate-700 border-slate-300"
                  >
                    {cardsDaColuna.length}
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1">{col.descricao}</p>
              </div>

              {/* Lista de Cards da Coluna */}
              <div className="p-2 flex-1 space-y-2.5 overflow-y-auto max-h-[700px]">
                {cardsDaColuna.length === 0 ? (
                  <div className="h-32 border border-dashed border-slate-300/80 rounded-lg flex items-center justify-center p-3 text-center">
                    <span className="text-[11px] text-slate-400">Arraste um cliente para cá</span>
                  </div>
                ) : (
                  cardsDaColuna.map((hom) => {
                    const isNovo = !hom.visualizado_em
                    const isDragging = draggedCardId === hom.id
                    const isArtEnviada = hom.art_status === 'enviada'
                    const isArtPaga = hom.art_status === 'paga'
                    const isMoving = movingId === hom.id

                    return (
                      <Card
                        key={hom.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, hom.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onSelectCard(hom)}
                        className={`group cursor-grab active:cursor-grabbing border bg-white shadow-2xs hover:shadow-md transition-all duration-150 relative overflow-hidden ${
                          isDragging
                            ? 'opacity-40 scale-95 border-[#0B7A5B]'
                            : 'border-slate-200/90'
                        } ${isMoving ? 'pointer-events-none opacity-60' : ''}`}
                      >
                        {/* Faixa decorativa no topo para status da ART */}
                        {isArtEnviada && (
                          <div className="h-1 bg-amber-500 w-full absolute top-0 left-0" />
                        )}
                        {isArtPaga && (
                          <div className="h-1 bg-emerald-500 w-full absolute top-0 left-0" />
                        )}

                        <CardContent className="p-3 space-y-2 text-xs">
                          {/* Top: Badges e Versão */}
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isNovo && (
                                <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-black px-1.5 py-0 animate-pulse">
                                  Novo
                                </Badge>
                              )}
                              {hom.versao_dossie && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-700 border-slate-300 font-bold"
                                >
                                  v{hom.versao_dossie}
                                </Badge>
                              )}
                            </div>

                            {hom.potencia_total_kwp ? (
                              <span className="text-[11px] font-black text-[#0B7A5B] font-mono flex items-center gap-0.5">
                                <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>{hom.potencia_total_kwp} kWp</span>
                              </span>
                            ) : null}
                          </div>

                          {/* Nome do Cliente */}
                          <div>
                            <h4
                              className="font-bold text-slate-900 text-xs leading-snug truncate group-hover:text-[#0B7A5B] transition-colors"
                              title={hom.cliente_nome}
                            >
                              {hom.cliente_nome || 'Cliente sem nome'}
                            </h4>
                            {(hom.cliente_cidade || hom.endereco_instalacao) && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">
                                  {hom.cliente_cidade || hom.endereco_instalacao}
                                </span>
                              </p>
                            )}
                          </div>

                          {/* Resumo do Kit Negociado */}
                          {hom.kit_resumo && (
                            <p
                              className="text-[10px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200/70 truncate"
                              title={hom.kit_resumo}
                            >
                              {hom.kit_resumo}
                            </p>
                          )}

                          {/* Status da ART: Alertas Âmbar / Verde Conforme Especificação */}
                          {isArtEnviada && (
                            <div className="flex items-center justify-between gap-1 p-1.5 rounded-md bg-amber-50 border border-amber-300 text-amber-950 text-[10.5px] font-semibold">
                              <span className="flex items-center gap-1 truncate">
                                <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                <span className="truncate">ART enviada — aguardando pagamento</span>
                              </span>
                              {hom.art_arquivo && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDownloadArt(e, hom)}
                                  className="text-amber-800 hover:text-amber-950 p-0.5 rounded hover:bg-amber-100"
                                  title="Baixar PDF da ART"
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}

                          {isArtPaga && (
                            <div className="flex items-center justify-between gap-1 p-1.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-950 text-[10.5px] font-bold">
                              <span className="flex items-center gap-1 truncate">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>ART paga</span>
                              </span>
                              {hom.art_arquivo && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDownloadArt(e, hom)}
                                  className="text-emerald-800 hover:text-emerald-950 p-0.5 rounded hover:bg-emerald-100"
                                  title="Baixar PDF da ART"
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}

                          {/* Ações Rápidas no Card */}
                          <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-1.5">
                            {/* Ação: Enviar ART para Pagamento */}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenEnviarArt(hom)
                              }}
                              className={`h-7 px-2 text-[10.5px] font-bold gap-1 ${
                                isArtEnviada
                                  ? 'border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100'
                                  : isArtPaga
                                    ? 'border-emerald-300 text-emerald-900 bg-emerald-50 hover:bg-emerald-100'
                                    : 'border-slate-200 text-slate-700 hover:text-[#0B7A5B] hover:border-emerald-300'
                              }`}
                              title="Anexar PDF da ART e enviar para pagamento do cliente/comercial"
                            >
                              <FileUp className="w-3 h-3" />
                              <span>
                                {isArtPaga
                                  ? 'Reenviar ART'
                                  : isArtEnviada
                                    ? 'Reenviar ART'
                                    : 'Enviar ART'}
                              </span>
                            </Button>

                            {/* Navegação entre colunas anterior / próxima (mobile ou atalho) */}
                            <div className="flex items-center gap-1">
                              {colIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMoverStatus(hom.id, COLUNAS_HOMOLOGACAO[colIdx - 1].id)
                                  }}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                  title={`Mover para: ${COLUNAS_HOMOLOGACAO[colIdx - 1].titulo}`}
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                              )}
                              {colIdx < COLUNAS_HOMOLOGACAO.length - 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMoverStatus(hom.id, COLUNAS_HOMOLOGACAO[colIdx + 1].id)
                                  }}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-[#0B7A5B] hover:bg-emerald-50"
                                  title={`Avançar para: ${COLUNAS_HOMOLOGACAO[colIdx + 1].titulo}`}
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
