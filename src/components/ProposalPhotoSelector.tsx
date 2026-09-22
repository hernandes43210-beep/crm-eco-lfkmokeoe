import React, { useState, useEffect } from 'react'
import { Check, Image as ImageIcon, Camera, Building2, CheckSquare, Square } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LeadPhotosService } from '@/services/leadPhotos'
import {
  INSTITUTIONAL_INSTALLATION_PHOTOS,
  type InstitutionalInstallationPhoto,
} from '@/data/socialProofPhotos'
import type { LeadPhoto, PropostaFotoSelecionada } from '@/types/crm'

export interface ProposalPhotoOption {
  key: string // `lead:${photo.id}` ou `inst:${inst.id}`
  origem: 'lead' | 'institucional'
  id: string
  titulo: string
  legendaPadrao: string
  previewUrl: string
  tag: string
}

interface ProposalPhotoSelectorProps {
  leadId?: string
  value: PropostaFotoSelecionada[]
  onChange: (value: PropostaFotoSelecionada[]) => void
}

export function ProposalPhotoSelector({ leadId, value, onChange }: ProposalPhotoSelectorProps) {
  const [leadPhotos, setLeadPhotos] = useState<LeadPhoto[]>([])
  const [loadingLeadPhotos, setLoadingLeadPhotos] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    if (leadId) {
      setLoadingLeadPhotos(true)
      LeadPhotosService.getPhotosByLead(leadId)
        .then((photos) => {
          if (isMounted) {
            setLeadPhotos(photos || [])
          }
        })
        .catch((err) => {
          console.warn('Não foi possível carregar fotos do lead para proposta:', err)
          if (isMounted) setLeadPhotos([])
        })
        .finally(() => {
          if (isMounted) setLoadingLeadPhotos(false)
        })
    } else {
      setLeadPhotos([])
    }
    return () => {
      isMounted = false
    }
  }, [leadId])

  // Lista unificada de opções disponíveis
  const options: ProposalPhotoOption[] = React.useMemo(() => {
    const list: ProposalPhotoOption[] = []

    // 1. Fotos do Lead (se houver)
    if (leadPhotos.length > 0) {
      leadPhotos.forEach((lp, idx) => {
        const url = LeadPhotosService.getPhotoUrl(lp, '400x300') || ''
        list.push({
          key: `lead:${lp.id}`,
          origem: 'lead',
          id: lp.id,
          titulo: lp.legenda || `Foto da Obra #${idx + 1}`,
          legendaPadrao: lp.legenda || `Instalação do cliente`,
          previewUrl: url,
          tag: 'Foto do Lead',
        })
      })
    }

    // 2. Fotos Institucionais Ecosolar
    INSTITUTIONAL_INSTALLATION_PHOTOS.forEach((inst: InstitutionalInstallationPhoto) => {
      list.push({
        key: `inst:${inst.id}`,
        origem: 'institucional',
        id: inst.id,
        titulo: inst.titulo,
        legendaPadrao: inst.legenda,
        previewUrl: inst.src,
        tag: inst.tag,
      })
    })

    return list
  }, [leadPhotos])

  const selectedMap = React.useMemo(() => {
    const map = new Map<string, PropostaFotoSelecionada>()
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item && item.origem && item.id) {
          map.set(`${item.origem}:${item.id}`, item)
        }
      })
    }
    return map
  }, [value])

  const toggleSelect = (opt: ProposalPhotoOption) => {
    const isSelected = selectedMap.has(opt.key)
    if (isSelected) {
      const next = value.filter((v) => !(v.origem === opt.origem && v.id === opt.id))
      onChange(next)
      if (editingKey === opt.key) {
        setEditingKey(null)
      }
    } else {
      const next = [
        ...value,
        {
          origem: opt.origem,
          id: opt.id,
          legenda: opt.legendaPadrao,
        },
      ]
      onChange(next)
    }
  }

  const handleSelectAll = () => {
    const all: PropostaFotoSelecionada[] = options.map((opt) => {
      const existing = selectedMap.get(opt.key)
      return {
        origem: opt.origem,
        id: opt.id,
        legenda: existing?.legenda || opt.legendaPadrao,
      }
    })
    onChange(all)
  }

  const handleClearAll = () => {
    onChange([])
    setEditingKey(null)
  }

  const handleLegendaChange = (opt: ProposalPhotoOption, newLegenda: string) => {
    const next = value.map((v) => {
      if (v.origem === opt.origem && v.id === opt.id) {
        return { ...v, legenda: newLegenda }
      }
      return v
    })
    onChange(next)
  }

  const selectedCount = value.length

  return (
    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3">
      {/* Cabeçalho com ações de marcar todas / limpar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-xs font-bold text-slate-800">
              Fotos da Proposta (Prova Social)
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-semibold px-1.5 py-0 bg-white text-slate-700 border-slate-200"
            >
              {selectedCount === 0
                ? 'Nenhuma selecionada (exibe padrão)'
                : `${selectedCount} selecionada${selectedCount > 1 ? 's' : ''}`}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Escolha nenhuma, uma ou várias fotos para exibir na galeria discreta de miniaturas da
            proposta e do PDF.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-[11px] font-semibold text-[#0B7A5B] hover:text-[#095C44] px-2 py-1 rounded bg-white hover:bg-emerald-50 border border-slate-200 transition-colors flex items-center gap-1"
          >
            <CheckSquare className="w-3 h-3" />
            <span>Marcar todas ({options.length})</span>
          </button>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-semibold text-slate-600 hover:text-red-600 px-2 py-1 rounded bg-white hover:bg-red-50 border border-slate-200 transition-colors flex items-center gap-1"
            >
              <Square className="w-3 h-3" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {loadingLeadPhotos && (
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 py-1">
          <ImageIcon className="w-3.5 h-3.5 animate-pulse text-slate-400" />
          <span>Verificando fotos anexadas ao lead...</span>
        </div>
      )}

      {/* Grid de Miniaturas Clicáveis */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-1">
        {options.map((opt) => {
          const isSelected = selectedMap.has(opt.key)
          const currentItem = selectedMap.get(opt.key)
          const isEditing = editingKey === opt.key
          const currentLegenda = currentItem?.legenda ?? opt.legendaPadrao

          return (
            <div
              key={opt.key}
              className={`relative rounded-lg border overflow-hidden bg-white transition-all flex flex-col ${
                isSelected
                  ? 'border-[#0B7A5B] ring-2 ring-[#0B7A5B]/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'
              }`}
            >
              {/* Imagem clicável com badge de origem e checkbox */}
              <div
                onClick={() => toggleSelect(opt)}
                className="relative aspect-4/3 w-full bg-slate-900 cursor-pointer overflow-hidden group"
                title={`Clique para ${isSelected ? 'desmarcar' : 'marcar'} esta foto`}
              >
                <img
                  src={opt.previewUrl}
                  alt={opt.titulo}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Checkbox visual no canto superior esquerdo */}
                <div
                  className={`absolute top-1.5 left-1.5 w-5 h-5 rounded flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#0B7A5B] text-white shadow-xs'
                      : 'bg-white/90 text-transparent border border-slate-300 group-hover:border-slate-400'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>

                {/* Tag discreta no canto superior direito */}
                <div className="absolute top-1.5 right-1.5">
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shadow-2xs ${
                      opt.origem === 'lead'
                        ? 'bg-blue-600/90 text-white'
                        : 'bg-slate-900/80 text-amber-300'
                    }`}
                  >
                    {opt.origem === 'lead' ? 'Lead' : 'Inst.'}
                  </span>
                </div>
              </div>

              {/* Informações da foto e legenda opcional */}
              <div className="p-2 flex-1 flex flex-col justify-between text-left space-y-1 bg-white">
                <div>
                  <p
                    className="text-[11px] font-semibold text-slate-900 leading-tight line-clamp-1"
                    title={opt.titulo}
                  >
                    {opt.titulo}
                  </p>
                  <p className="text-[10px] text-slate-400 line-clamp-1">
                    {opt.origem === 'lead' ? 'Anexo do lead' : opt.tag}
                  </p>
                </div>

                {/* Legenda editável se selecionada */}
                {isSelected && (
                  <div className="pt-1 border-t border-slate-100 space-y-1">
                    {isEditing ? (
                      <div className="space-y-1">
                        <Input
                          value={currentLegenda}
                          onChange={(e) => handleLegendaChange(opt, e.target.value)}
                          placeholder="Legenda da foto..."
                          className="h-6 text-[10px] px-1.5 py-0"
                          autoFocus
                          onBlur={() => setEditingKey(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingKey(null)
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setEditingKey(null)}
                          className="text-[9px] text-[#0B7A5B] font-semibold hover:underline"
                        >
                          Concluir legenda
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span
                          className="text-slate-600 line-clamp-1 italic text-[10px]"
                          title={currentLegenda}
                        >
                          &ldquo;{currentLegenda}&rdquo;
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingKey(opt.key)}
                          className="text-[#0B7A5B] hover:underline font-semibold shrink-0 text-[10px]"
                        >
                          Editar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
