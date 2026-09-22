import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Sparkles,
  Sun,
  Check,
  Zap,
  TrendingDown,
  Info,
  Calendar,
  DollarSign,
  Layers,
  SlidersHorizontal,
  Boxes,
} from 'lucide-react'
import { KitsService } from '@/services/kits'
import { ProposalsService } from '@/services/proposals'
import { toPortugueseErrorMessage } from '@/lib/errors'
import type { Kit, Proposta, PropostaStatus, KitTipoEstrutura, KitStringBox } from '@/types/crm'
import { calcularMargemReal } from '@/utils/marginUtils'
import {
  formatBRL,
  formatNumberBR,
  calcularGeracaoMensalKwh,
  calcularGeracaoDiariaKwh,
  calcularEconomiaMensal,
  PARAMETROS_GERACAO_NOTA,
  IRRADIACAO_MEDIA_DIARIA_HORAS,
  FATOR_PERDAS_SISTEMA,
  TARIFA_ENERGIA_KWH,
  PARCELA_COMPENSADA_PERCENTUAL,
} from '@/lib/solarUtils'
import {
  calcularKwpPrePronto,
  sugerirNomeKit,
  sugerirFabricanteKit,
  sugerirDescricaoTecnica,
  aplicarEstruturaAoNomeKit,
  extrairComponentesKit,
} from '@/lib/quickKitUtils'
import {
  KitTechnicalSelectors,
  type KitTechnicalSelectorsValues,
} from '@/components/KitTechnicalSelectors'
import { toast } from '@/hooks/use-toast'
import { useKitFilters } from '@/hooks/useKitFilters'
import { KitFilterBar } from '@/components/KitFilterBar'
import {
  OPCOES_FOTO_INSTALACAO_DESTAQUE,
  type FotoInstalacaoDestaqueTipo,
} from '@/data/socialProofPhotos'
import { Camera, Image as ImageIcon } from 'lucide-react'

interface EditarPropostaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proposta: Proposta | null
  onProposalUpdated: (propostaAtualizada: Proposta) => void
}

export function EditarPropostaModal({
  open,
  onOpenChange,
  proposta,
  onProposalUpdated,
}: EditarPropostaModalProps) {
  const [kits, setKits] = useState<Kit[]>([])
  const [loadingKits, setLoadingKits] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Filtros compartilhados para seleção de kits
  const {
    searchTerm,
    setSearchTerm,
    selectedMarcaInversor,
    setSelectedMarcaInversor,
    selectedFaixaPotencia,
    setSelectedFaixaPotencia,
    selectedEstrutura,
    setSelectedEstrutura,
    marcasInversorDisponiveis,
    hasActiveFilters,
    handleClearFilters,
    filteredKits,
  } = useKitFilters(kits)

  // Form states
  const [selectedKitId, setSelectedKitId] = useState<string>('')
  const [kitNome, setKitNome] = useState('')
  const [kitPotenciaKw, setKitPotenciaKw] = useState<number | string>('')
  const [kitFabricante, setKitFabricante] = useState('')
  const [custo, setCusto] = useState<number | string>('')
  const [margem, setMargem] = useState<number | string>(25)
  const [valorBruto, setValorBruto] = useState<number | string>('')
  const [descontoPercentualStr, setDescontoPercentualStr] = useState<string>('')
  const [precoVenda, setPrecoVenda] = useState<number | string>('')
  const [fotoInstalacaoDestaque, setFotoInstalacaoDestaque] =
    useState<FotoInstalacaoDestaqueTipo>('posto_br')
  const [validadeDias, setValidadeDias] = useState<number>(15)
  const [status, setStatus] = useState<PropostaStatus>('Enviada')
  const [condicoesPagamento, setCondicoesPagamento] = useState('')
  const [observacoes, setObservacoes] = useState('')

  // Equipamentos técnicos do kit (tanto para manual quanto derivados do catálogo)
  const [technicalValues, setTechnicalValues] = useState<KitTechnicalSelectorsValues>({
    qtdPaineis: 10,
    potenciaPainelW: 630,
    marcaPaineis: 'TSUN POWER',
    qtdInversores: 1,
    marcaInversor: 'Sungrow',
    potenciaInversorKw: 7.5,
    tipoEstrutura: 'fibrocimento',
    stringBox: '',
  })
  const [isManualQuickMode, setIsManualQuickMode] = useState(true)

  // Modo custom/manual ativo quando 'custom' ou sem kit catalogado vinculado
  const isCustomMode = selectedKitId === 'custom' || !selectedKitId

  // Cálculos dinâmicos da montagem manual técnica
  const manualKwpInfo = useMemo(() => {
    return calcularKwpPrePronto(technicalValues.qtdPaineis, technicalValues.potenciaPainelW)
  }, [technicalValues.qtdPaineis, technicalValues.potenciaPainelW])

  const manualSuggestedName = useMemo(() => {
    return sugerirNomeKit({
      kwp: manualKwpInfo.kwp,
      marcaPaineis: technicalValues.marcaPaineis,
      marcaInversor: technicalValues.marcaInversor,
      qtdPaineis: technicalValues.qtdPaineis,
      potenciaPainelW: technicalValues.potenciaPainelW,
      tipoEstrutura: technicalValues.tipoEstrutura,
    })
  }, [manualKwpInfo.kwp, technicalValues])

  const manualSuggestedFab = useMemo(() => {
    return sugerirFabricanteKit(technicalValues.marcaPaineis, technicalValues.marcaInversor)
  }, [technicalValues.marcaPaineis, technicalValues.marcaInversor])

  // Carregar catálogo de kits ao abrir o modal
  useEffect(() => {
    if (open) {
      loadKits()
    }
  }, [open])

  // Preencher dados ao abrir com a proposta selecionada
  useEffect(() => {
    if (open && proposta) {
      const kitIdVal = proposta.kit || 'custom'
      setSelectedKitId(kitIdVal)
      setKitNome(proposta.kit_nome || '')
      setKitPotenciaKw(proposta.kit_potencia_kw ?? '')
      setKitFabricante(proposta.kit_fabricante || '')
      setCusto(proposta.custo ?? '')
      setMargem(proposta.margem ?? 25)

      const pBruto = proposta.valor_bruto || proposta.preco_venda || ''
      setValorBruto(pBruto)
      const pDescPct =
        proposta.desconto_percentual !== undefined && proposta.desconto_percentual > 0
          ? String(proposta.desconto_percentual).replace('.', ',')
          : ''
      setDescontoPercentualStr(pDescPct)
      setPrecoVenda(proposta.preco_venda ?? '')
      setFotoInstalacaoDestaque(
        ((proposta as any).foto_instalacao_destaque as FotoInstalacaoDestaqueTipo) || 'posto_br',
      )
      setValidadeDias(proposta.validade_dias || 15)
      setStatus(proposta.status || 'Enviada')
      setCondicoesPagamento(proposta.condicoes_pagamento || '')
      setObservacoes(proposta.observacoes || '')

      // Recuperar valores técnicos da proposta ou decompor do kit/texto
      const kitExpand = proposta.expand?.kit || proposta.kit_expand
      const componentes = extrairComponentesKit({
        nome: proposta.kit_nome,
        potencia_kw: proposta.kit_potencia_kw || 0,
        fabricante: proposta.kit_fabricante,
        descricao: (proposta as any).kit_descricao || kitExpand?.descricao,
        string_box: ((proposta as any).kit_string_box || kitExpand?.string_box) as any,
        marca_painel: (proposta as any).kit_marca_painel || kitExpand?.marca_painel,
        marca_inversor: (proposta as any).kit_marca_inversor || kitExpand?.marca_inversor,
        potencia_painel_w: (proposta as any).kit_potencia_painel_w || kitExpand?.potencia_painel_w,
        potencia_inversor_kw:
          (proposta as any).kit_potencia_inversor_kw || kitExpand?.potencia_inversor_kw,
        tipo_estrutura: ((proposta as any).kit_tipo_estrutura || kitExpand?.tipo_estrutura) as any,
      })

      const potPainelFinal =
        (proposta as any).kit_potencia_painel_w ||
        kitExpand?.potencia_painel_w ||
        componentes.potenciaPainelW ||
        630

      const marcaPainelFinal =
        (proposta as any).kit_marca_painel ||
        kitExpand?.marca_painel ||
        componentes.marcaPaineis ||
        'TSUN POWER'

      const marcaInversorFinal =
        (proposta as any).kit_marca_inversor ||
        kitExpand?.marca_inversor ||
        componentes.marcaInversor ||
        'Sungrow'

      const potInvFinal =
        (proposta as any).kit_potencia_inversor_kw ||
        kitExpand?.potencia_inversor_kw ||
        componentes.potenciaInversorKw ||
        7.5

      const tipoEstruturaFinal =
        (proposta as any).kit_tipo_estrutura ||
        kitExpand?.tipo_estrutura ||
        componentes.tipoEstrutura ||
        'fibrocimento'

      const stringBoxFinal =
        (proposta as any).kit_string_box || kitExpand?.string_box || componentes.stringBox || ''

      setTechnicalValues({
        qtdPaineis: componentes.qtdPaineis || 10,
        potenciaPainelW: potPainelFinal,
        marcaPaineis: marcaPainelFinal,
        qtdInversores: componentes.qtdInversores || 1,
        marcaInversor: marcaInversorFinal,
        potenciaInversorKw: potInvFinal,
        tipoEstrutura: tipoEstruturaFinal,
        stringBox: stringBoxFinal,
      })
      setIsManualQuickMode(true)
    }
  }, [open, proposta])

  const loadKits = async () => {
    try {
      setLoadingKits(true)
      const data = await KitsService.getKits()
      setKits(data)
    } catch (err) {
      console.error('Erro ao carregar kits:', err)
      toast({
        title: 'Erro ao carregar catálogo de kits',
        variant: 'destructive',
      })
    } finally {
      setLoadingKits(false)
    }
  }

  const applyKit = (kit: Kit) => {
    setSelectedKitId(kit.id)
    setKitNome(kit.nome)
    setKitPotenciaKw(kit.potencia_kw)
    const fabFinal =
      kit.fabricante || [kit.marca_painel, kit.marca_inversor].filter(Boolean).join(' / ')
    setKitFabricante(fabFinal)
    setCusto(kit.custo)
    setMargem(kit.margem)

    const componentes = extrairComponentesKit(kit)
    setTechnicalValues({
      qtdPaineis: componentes.qtdPaineis || 10,
      potenciaPainelW: kit.potencia_painel_w || componentes.potenciaPainelW || 630,
      marcaPaineis: kit.marca_painel || componentes.marcaPaineis || 'TSUN POWER',
      qtdInversores: componentes.qtdInversores || 1,
      marcaInversor: kit.marca_inversor || componentes.marcaInversor || 'Sungrow',
      potenciaInversorKw:
        kit.potencia_inversor_kw || componentes.potenciaInversorKw || kit.potencia_kw || 7.5,
      tipoEstrutura: (kit.tipo_estrutura || componentes.tipoEstrutura || 'fibrocimento') as any,
      stringBox: (kit.string_box || componentes.stringBox || '') as any,
    })

    // Preço de venda base do kit
    let baseVenda = kit.preco_venda
    if (!baseVenda && kit.custo && kit.margem < 100) {
      baseVenda = Math.round((kit.custo / (1 - kit.margem / 100)) * 100) / 100
    }
    setValorBruto(baseVenda || '')
    const descPct = parseFloat(descontoPercentualStr.replace(',', '.')) || 0
    if (descPct > 0 && descPct <= 90 && baseVenda) {
      const descVal = Math.round(((baseVenda * descPct) / 100) * 100) / 100
      setPrecoVenda(Math.round((baseVenda - descVal) * 100) / 100)
    } else {
      setPrecoVenda(baseVenda || '')
    }
  }

  const handleKitSelect = (kitId: string) => {
    if (kitId === 'custom') {
      setSelectedKitId('custom')
      return
    }

    const kit = kits.find((k) => k.id === kitId)
    if (kit) {
      applyKit(kit)
    }
  }

  // Atualizar seletores técnicos no kit manual
  const handleTechnicalValuesChange = (patch: Partial<KitTechnicalSelectorsValues>) => {
    setTechnicalValues((prev) => {
      const updated = { ...prev, ...patch }

      if (isCustomMode && isManualQuickMode) {
        const novoKwp = calcularKwpPrePronto(updated.qtdPaineis, updated.potenciaPainelW).kwp
        if (novoKwp > 0) {
          setKitPotenciaKw(novoKwp)
        }

        const novoNome = sugerirNomeKit({
          kwp: novoKwp,
          marcaPaineis: updated.marcaPaineis,
          marcaInversor: updated.marcaInversor,
          qtdPaineis: updated.qtdPaineis,
          potenciaPainelW: updated.potenciaPainelW,
          tipoEstrutura: updated.tipoEstrutura,
        })
        if (novoNome) {
          setKitNome(novoNome)
        }

        const novoFab = sugerirFabricanteKit(updated.marcaPaineis, updated.marcaInversor)
        if (novoFab) {
          setKitFabricante(novoFab)
        }
      } else if (patch.tipoEstrutura && kitNome) {
        const atualizado = aplicarEstruturaAoNomeKit(kitNome, patch.tipoEstrutura)
        if (atualizado) setKitNome(atualizado)
      }

      return updated
    })
  }

  const handleReapplyManualSuggestions = () => {
    if (manualKwpInfo.kwp > 0) {
      setKitPotenciaKw(manualKwpInfo.kwp)
    }
    if (manualSuggestedName) {
      setKitNome(manualSuggestedName)
    }
    if (manualSuggestedFab) {
      setKitFabricante(manualSuggestedFab)
    }
  }

  // Atualiza preço final a partir de valor bruto e desconto em %
  const recalcularValoresComDesconto = (novoBruto: number, novoDescontoStr: string) => {
    const descPct = parseFloat(novoDescontoStr.replace(',', '.')) || 0
    if (descPct > 0 && descPct <= 90 && novoBruto > 0) {
      const descVal = Math.round(((novoBruto * descPct) / 100) * 100) / 100
      setPrecoVenda(Math.round(Math.max(0, novoBruto - descVal) * 100) / 100)
    } else {
      setPrecoVenda(novoBruto > 0 ? novoBruto : '')
    }
  }

  // Recalcular preço de venda quando custo ou margem são alterados
  const handleCustoChange = (val: string) => {
    setCusto(val)
    const numCusto = parseFloat(val) || 0
    const numMargem = parseFloat(String(margem)) || 0
    if (numCusto > 0 && numMargem >= 0 && numMargem < 100) {
      const baseCalc = Math.round((numCusto / (1 - numMargem / 100)) * 100) / 100
      setValorBruto(baseCalc)
      recalcularValoresComDesconto(baseCalc, descontoPercentualStr)
    }
  }

  const handleMargemChange = (val: string) => {
    setMargem(val)
    const numMargem = parseFloat(val) || 0
    const numCusto = parseFloat(String(custo)) || 0
    if (numCusto > 0 && numMargem >= 0 && numMargem < 100) {
      const baseCalc = Math.round((numCusto / (1 - numMargem / 100)) * 100) / 100
      setValorBruto(baseCalc)
      recalcularValoresComDesconto(baseCalc, descontoPercentualStr)
    }
  }

  const handleValorBrutoChange = (val: string) => {
    setValorBruto(val)
    const numBruto = parseFloat(val) || 0
    recalcularValoresComDesconto(numBruto, descontoPercentualStr)
  }

  const handleDescontoPercentualChange = (val: string) => {
    setDescontoPercentualStr(val)
    const numBruto = parseFloat(String(valorBruto)) || parseFloat(String(precoVenda)) || 0
    recalcularValoresComDesconto(numBruto, val)
  }

  // Cálculos solares derivados em tempo real baseados na fórmula oficial:
  // Geração mensal = Potência (kWp) × 4,6 h/dia × 0,80 × 30
  // Economia mensal = Geração mensal (kWh) × R$ 1,15 × 85%
  const potenciaNum = parseFloat(String(kitPotenciaKw)) || 0
  const geracaoDiariaEstimada = useMemo(() => calcularGeracaoDiariaKwh(potenciaNum), [potenciaNum])
  const geracaoMensalEstimada = useMemo(() => calcularGeracaoMensalKwh(potenciaNum), [potenciaNum])
  const economiaMensalEstimada = useMemo(
    () => calcularEconomiaMensal(geracaoMensalEstimada),
    [geracaoMensalEstimada],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proposta) return

    if (!kitNome.trim()) {
      toast({
        title: 'Nome do kit obrigatório',
        description: 'Informe uma identificação para o kit ou selecione um do catálogo.',
        variant: 'destructive',
      })
      return
    }

    const numCusto = parseFloat(String(custo)) || 0
    const numMargem = parseFloat(String(margem)) || 0
    const numPrecoVenda = parseFloat(String(precoVenda)) || 0
    const descPctParsed = parseFloat(descontoPercentualStr.replace(',', '.')) || 0

    if (descontoPercentualStr.trim() !== '') {
      if (isNaN(descPctParsed) || descPctParsed < 0 || descPctParsed > 90) {
        toast({
          title: 'Desconto inválido',
          description: 'O desconto deve ser um valor percentual entre 0% e 90%.',
          variant: 'destructive',
        })
        return
      }
    }

    if (numPrecoVenda <= 0) {
      toast({
        title: 'Preço de venda inválido',
        description: 'O preço de venda da proposta deve ser maior que zero.',
        variant: 'destructive',
      })
      return
    }

    const numBrutoFinal =
      parseFloat(String(valorBruto)) ||
      (descPctParsed > 0
        ? Math.round((numPrecoVenda / (1 - descPctParsed / 100)) * 100) / 100
        : numPrecoVenda)

    const numValorDesconto =
      descPctParsed > 0 ? Math.round(Math.max(0, numBrutoFinal - numPrecoVenda) * 100) / 100 : 0

    try {
      setSubmitting(true)

      // Recalcular data_validade com base no número de dias de validade
      // A partir da data atual ou mantendo a data se dias não foram alterados
      const validadeDiasNum = Math.max(1, Number(validadeDias) || 15)
      const validadeDate = new Date()
      validadeDate.setDate(validadeDate.getDate() + validadeDiasNum)
      const validadeIso = validadeDate.toISOString().replace('T', ' ').substring(0, 19) + 'Z'

      const kitRelId = selectedKitId && selectedKitId !== 'custom' ? selectedKitId : null

      // Descrição técnica derivada da montagem manual se for kit customizado
      const descGerada = isCustomMode
        ? sugerirDescricaoTecnica({
            qtdPaineis: technicalValues.qtdPaineis,
            potenciaPainelW: technicalValues.potenciaPainelW,
            marcaPaineis: technicalValues.marcaPaineis,
            qtdInversores: technicalValues.qtdInversores,
            marcaInversor: technicalValues.marcaInversor,
            potenciaInversorKw: technicalValues.potenciaInversorKw,
            kwp: potenciaNum > 0 ? potenciaNum : manualKwpInfo.kwp,
            stringBox: technicalValues.stringBox || '',
            tipoEstrutura: technicalValues.tipoEstrutura,
          })
        : undefined

      const payload: Partial<Proposta> = {
        kit: kitRelId || undefined,
        kit_nome: kitNome.trim(),
        kit_potencia_kw: potenciaNum > 0 ? potenciaNum : manualKwpInfo.kwp || 0,
        kit_fabricante: kitFabricante.trim() || manualSuggestedFab || undefined,
        custo: numCusto,
        margem: numMargem,
        preco_venda: numPrecoVenda,
        desconto_percentual: descPctParsed > 0 ? descPctParsed : 0,
        valor_desconto: numValorDesconto,
        valor_bruto: numBrutoFinal,
        validade_dias: validadeDiasNum,
        data_validade: validadeIso,
        status,
        kit_marca_painel: technicalValues.marcaPaineis?.trim() || undefined,
        kit_marca_inversor: technicalValues.marcaInversor?.trim() || undefined,
        kit_tipo_estrutura:
          (technicalValues.tipoEstrutura?.trim() as KitTipoEstrutura) || undefined,
        kit_potencia_painel_w: Number(technicalValues.potenciaPainelW) || undefined,
        kit_potencia_inversor_kw: Number(technicalValues.potenciaInversorKw) || undefined,
        kit_string_box: (technicalValues.stringBox?.trim() as KitStringBox) || undefined,
        kit_descricao: descGerada || (proposta as any).kit_descricao || undefined,
        condicoes_pagamento: condicoesPagamento.trim(),
        observacoes: observacoes.trim(),
        foto_instalacao_destaque: fotoInstalacaoDestaque,
      }

      const updated = await ProposalsService.updateProposta(proposta.id, payload, {
        registrarHistoricoLead: true,
        resumoAlteracao: `${kitNome.trim()} • ${formatBRL(numPrecoVenda)} • Validade: ${validadeDiasNum}d`,
      })

      toast({
        title: 'Proposta atualizada com sucesso!',
        description: 'As alterações foram salvas e já refletem no link público e no PDF.',
      })

      onProposalUpdated(updated)
      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Erro ao atualizar proposta:', err)
      const errorMsg = toPortugueseErrorMessage(
        err,
        'Falha ao salvar alterações da proposta. Verifique os dados e tente novamente.',
      )

      toast({
        title: 'Erro ao atualizar proposta',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!proposta) return null

  const isAceita = proposta.status === 'Aceita'

  return (
    <Dialog open={open} onOpenChange={(val) => !submitting && onOpenChange(val)}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#0B7A5B]">
              <Sun className="w-5 h-5 text-amber-500 shrink-0" />
              <DialogTitle className="text-lg font-bold text-slate-900">
                Editar Proposta Comercial
              </DialogTitle>
            </div>
            <Badge
              variant="outline"
              className={
                isAceita
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                  : 'bg-blue-100 text-blue-800 border-blue-300 font-semibold'
              }
            >
              Status: {proposta.status}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            {proposta.expand?.lead?.nome ? (
              <>
                Cliente: <strong className="text-slate-800">{proposta.expand.lead.nome}</strong>
                {proposta.expand.lead.consumo_mensal_kwh ? (
                  <>
                    {' '}
                    • Consumo:{' '}
                    <strong className="text-slate-800">
                      {proposta.expand.lead.consumo_mensal_kwh} kWh/mês
                    </strong>
                  </>
                ) : null}
              </>
            ) : (
              'Altere os dados comerciais, kit solar, condições e prazo de validade.'
            )}
          </DialogDescription>
        </DialogHeader>

        {isAceita && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Atenção: Proposta já aceita pelo cliente!</span>
              <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                Esta proposta já possui formalização digital registrada. Ao editar valores ou
                equipamentos, certifique-se de alinhar com o cliente antes de reenviar o link ou
                PDF.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Seletor de Kit do Catálogo com Filtros Idênticos à aba Kits Solares */}
          <div className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Trocar ou Re-selecionar Kit do Catálogo</span>
              </Label>
              {loadingKits && (
                <span className="text-[11px] text-emerald-700 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Carregando kits...
                </span>
              )}
            </div>

            {/* Barra de Filtros Combináveis: Inversor, Potência, Estrutura, Busca + Contagem e Limpar */}
            <KitFilterBar
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              selectedMarcaInversor={selectedMarcaInversor}
              onMarcaInversorChange={setSelectedMarcaInversor}
              marcasInversorDisponiveis={marcasInversorDisponiveis}
              selectedFaixaPotencia={selectedFaixaPotencia}
              onFaixaPotenciaChange={setSelectedFaixaPotencia}
              selectedEstrutura={selectedEstrutura}
              onEstruturaChange={setSelectedEstrutura}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={handleClearFilters}
              totalKits={kits.length}
              filteredCount={filteredKits.length}
              compact={true}
            />

            <Select value={selectedKitId} onValueChange={handleKitSelect}>
              <SelectTrigger className="h-10 text-xs bg-white border-emerald-200 focus:ring-[#0B7A5B]">
                <SelectValue placeholder="Selecione um kit ou mantenha personalizado..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="custom" className="text-xs font-semibold text-[#0B7A5B]">
                  ★ Personalizado (Digitar dados manualmente)
                </SelectItem>
                {filteredKits.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    <Boxes className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                    <span>Nenhum kit corresponde aos filtros aplicados</span>
                  </div>
                ) : (
                  filteredKits.map((kit) => (
                    <SelectItem key={kit.id} value={kit.id} className="text-xs">
                      {kit.nome} — {kit.potencia_kw} kWp ({kit.categoria}) • Venda:{' '}
                      {formatBRL(kit.preco_venda)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-emerald-800">
              Ao escolher um kit, custo, margem e potência são atualizados mantendo os campos 100%
              editáveis.
            </p>
          </div>

          {/* Seletor Rico para Kit Manual (idêntico ao GerarPropostaModal e Kits Solares) */}
          {isCustomMode && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-1 bg-slate-100 rounded-lg border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsManualQuickMode(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                    isManualQuickMode
                      ? 'bg-white text-[#0B7A5B] shadow-xs border border-slate-200/70'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Montagem Rápida do Kit Manual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualQuickMode(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                    !isManualQuickMode
                      ? 'bg-white text-[#0B7A5B] shadow-xs border border-slate-200/70'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Edição Direta / Livre</span>
                </button>
              </div>

              <KitTechnicalSelectors
                values={technicalValues}
                onChange={handleTechnicalValuesChange}
                kwpCalculado={manualKwpInfo.kwp}
                formattedKwpBR={manualKwpInfo.formattedBR}
                showStringBox={true}
                onReapplySuggestions={handleReapplyManualSuggestions}
              />
            </div>
          )}

          {/* Dados do Kit: Nome, Potência e Fabricante */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="editKitNome" className="text-xs font-semibold text-slate-700">
                  Identificação do Kit / Sistema *
                </Label>
                {technicalValues.tipoEstrutura && (
                  <button
                    type="button"
                    onClick={() => {
                      const comEstrutura = aplicarEstruturaAoNomeKit(
                        kitNome,
                        technicalValues.tipoEstrutura,
                      )
                      if (comEstrutura) setKitNome(comEstrutura)
                    }}
                    className="text-[11px] text-blue-700 hover:text-blue-900 hover:underline font-medium"
                    title="Inclui o tipo de estrutura atual ao nome do kit"
                  >
                    + Incluir estrutura no nome
                  </button>
                )}
              </div>
              <Input
                id="editKitNome"
                value={kitNome}
                onChange={(e) => setKitNome(e.target.value)}
                placeholder="Ex: Kit Solar 6,3 kWp — TSUN POWER + Sungrow — Fibrocimento"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="editPotencia" className="text-xs font-semibold text-slate-700">
                Potência (kWp)
              </Label>
              <Input
                id="editPotencia"
                type="number"
                step="0.01"
                min="0"
                value={kitPotenciaKw}
                onChange={(e) => setKitPotenciaKw(e.target.value)}
                placeholder="Ex: 6.3"
                className="h-9 text-xs font-mono-numbers"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="editFabricante" className="text-xs font-semibold text-slate-700">
                Fabricante dos Módulos / Inversor
              </Label>
              <Input
                id="editFabricante"
                value={kitFabricante}
                onChange={(e) => setKitFabricante(e.target.value)}
                placeholder="Ex: Canadian Solar / Deye / Growatt"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="editStatus" className="text-xs font-semibold text-slate-700">
                Status da Proposta
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PropostaStatus)}>
                <SelectTrigger id="editStatus" className="h-9 text-xs bg-white">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rascunho" className="text-xs">
                    Rascunho
                  </SelectItem>
                  <SelectItem value="Enviada" className="text-xs">
                    Enviada
                  </SelectItem>
                  <SelectItem value="Aceita" className="text-xs">
                    Aceita
                  </SelectItem>
                  <SelectItem value="Recusada" className="text-xs">
                    Recusada
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Card com Recálculo de Geração e Economia */}
          {potenciaNum > 0 && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-0.5">
                <span className="text-[11px] uppercase font-bold text-amber-900 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  Geração Diária
                </span>
                <p className="text-base font-extrabold text-amber-950 font-mono-numbers">
                  ~{formatNumberBR(geracaoDiariaEstimada, 1)} kWh/dia
                </p>
                <span className="text-[10px] text-amber-800">
                  {potenciaNum} kWp × {IRRADIACAO_MEDIA_DIARIA_HORAS}h × {FATOR_PERDAS_SISTEMA}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[11px] uppercase font-bold text-amber-900 flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-600" />
                  Geração Mensal
                </span>
                <p className="text-base font-extrabold text-amber-950 font-mono-numbers">
                  ~{formatNumberBR(geracaoMensalEstimada, 0)} kWh/mês
                </p>
                <span className="text-[10px] text-amber-800">Média para 30 dias comerciais</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[11px] uppercase font-bold text-emerald-900 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                  Economia Estimada
                </span>
                <p className="text-base font-extrabold text-emerald-900 font-mono-numbers">
                  ~{formatBRL(economiaMensalEstimada)}/mês
                </p>
                <span className="text-[10px] text-emerald-800">
                  Tarifa R$ {TARIFA_ENERGIA_KWH.toFixed(2)} •{' '}
                  {Math.round(PARCELA_COMPENSADA_PERCENTUAL * 100)}% comp.
                </span>
              </div>
            </div>
          )}

          {/* Precificação: Custo, Margem, Valor Bruto, Desconto em % e Preço de Venda Final */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Precificação e Condições Comerciais
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Desconto opcional em % com recálculo em tempo real
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="editCusto" className="text-xs font-semibold text-slate-700">
                  Preço de Custo (R$) *
                </Label>
                <Input
                  id="editCusto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={custo}
                  onChange={(e) => handleCustoChange(e.target.value)}
                  placeholder="Ex: 15000"
                  required
                  className="h-9 text-xs font-mono-numbers bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="editMargem" className="text-xs font-semibold text-slate-700">
                  Margem (%)
                </Label>
                <Input
                  id="editMargem"
                  type="number"
                  step="0.1"
                  min="0"
                  max="99"
                  value={margem}
                  onChange={(e) => handleMargemChange(e.target.value)}
                  placeholder="Ex: 25"
                  className="h-9 text-xs font-mono-numbers bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="editValorBruto" className="text-xs font-semibold text-slate-700">
                  Valor Bruto do Kit (R$) *
                </Label>
                <Input
                  id="editValorBruto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorBruto}
                  onChange={(e) => handleValorBrutoChange(e.target.value)}
                  placeholder="Ex: 20000"
                  className="h-9 text-xs font-semibold font-mono-numbers bg-white"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="editDescontoPct"
                    className="text-xs font-semibold text-emerald-900"
                  >
                    Desconto (%)
                  </Label>
                  <span className="text-[10px] text-slate-500">0% a 90%</span>
                </div>
                <Input
                  id="editDescontoPct"
                  type="text"
                  inputMode="decimal"
                  value={descontoPercentualStr}
                  onChange={(e) => handleDescontoPercentualChange(e.target.value)}
                  placeholder="Ex: 5 ou 7,5"
                  className="h-9 text-xs font-mono-numbers bg-white border-emerald-300 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            {/* Painel de Cálculo em Tempo Real do Desconto & Margem Real da Negociação */}
            {(() => {
              const numBruto = parseFloat(String(valorBruto)) || parseFloat(String(precoVenda)) || 0
              const numDescPct = parseFloat(descontoPercentualStr.replace(',', '.')) || 0
              const temDesconto = numDescPct > 0 && numDescPct <= 90
              const numDescReais = temDesconto
                ? Math.round(((numBruto * numDescPct) / 100) * 100) / 100
                : 0
              const numFinal = Math.max(0, numBruto - numDescReais)
              const valorFinalEfetivo = numFinal > 0 ? numFinal : numBruto
              const margemReal = calcularMargemReal(valorFinalEfetivo, custo)

              return (
                <div
                  className={`p-3.5 rounded-xl border transition-all space-y-3 ${
                    temDesconto
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                      : 'bg-slate-50/80 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                        Valor Bruto do Kit
                      </span>
                      <span className="text-sm font-bold font-mono-numbers">
                        {numBruto > 0 ? formatBRL(numBruto) : 'R$ 0,00'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 block">
                        Desconto Aplicado ({temDesconto ? `${descontoPercentualStr}%` : '0%'})
                      </span>
                      <span className="text-sm font-bold text-emerald-700 font-mono-numbers">
                        {temDesconto ? `- ${formatBRL(numDescReais)}` : 'R$ 0,00'}
                      </span>
                    </div>

                    <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 sm:border-l sm:pl-3">
                      <span className="text-[10px] uppercase font-black tracking-wider text-emerald-950 block">
                        VALOR FINAL DA PROPOSTA
                      </span>
                      <span className="text-lg sm:text-xl font-black text-[#0B7A5B] font-mono-numbers block">
                        {formatBRL(valorFinalEfetivo)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {temDesconto ? 'Valor com desconto comercial aplicado' : 'Sem desconto'}
                      </span>
                    </div>
                  </div>

                  {/* Margem Real da Negociação (Custo do Kit vs Valor Final com Desconto) */}
                  <div
                    className={`p-2.5 rounded-lg border bg-white/90 shadow-2xs transition-all ${margemReal.status.borderClass}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${margemReal.status.dotClass}`}
                        />
                        <div>
                          <span className="text-[11px] font-bold text-slate-800 block leading-tight">
                            Margem real da negociação:
                          </span>
                          <span className="text-[10px] text-slate-500 leading-tight">
                            Custo do kit ({formatBRL(Number(custo) || 0)}) vs Valor final com
                            desconto ({formatBRL(valorFinalEfetivo)})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <Badge
                          className={`text-[10px] px-2 py-0.5 font-bold border ${margemReal.status.badgeClass}`}
                        >
                          {margemReal.status.label}
                        </Badge>
                        <span
                          className={`text-sm sm:text-base font-black font-mono-numbers ${margemReal.status.textClass}`}
                        >
                          {margemReal.formatado}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Seletor de Foto de Instalação Real em Destaque */}
          <div className="p-3.5 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/70 via-white to-sky-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="editFotoInstalacao"
                className="text-xs font-bold text-slate-900 flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4 text-amber-600" />
                <span>Foto de Instalação Real em Destaque (Prova Social)</span>
              </Label>
              <Badge className="bg-[#0A192F] text-amber-300 hover:bg-[#0A192F] text-[10px] font-bold px-2 py-0.5">
                Identidade Ecosolar
              </Badge>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Escolha a foto de obra real da Ecosolar a ser exibida com destaque na proposta pública
              e no PDF. Por padrão, o <strong>Posto BR (carport)</strong> vem selecionado.
            </p>

            <Select
              value={fotoInstalacaoDestaque}
              onValueChange={(v) => setFotoInstalacaoDestaque(v as FotoInstalacaoDestaqueTipo)}
            >
              <SelectTrigger
                id="editFotoInstalacao"
                className="h-10 text-xs bg-white border-amber-300 focus:ring-amber-500 font-medium"
              >
                <SelectValue placeholder="Selecione a foto de instalação..." />
              </SelectTrigger>
              <SelectContent>
                {OPCOES_FOTO_INSTALACAO_DESTAQUE.map((opcao) => (
                  <SelectItem key={opcao.id} value={opcao.id} className="text-xs py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-900">
                        {opcao.titulo} {opcao.isPadrao ? '(Padrão Ecosolar)' : ''}
                      </span>
                      <span className="text-[11px] text-slate-500">{opcao.subtitulo}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Prévia da Foto Escolhida */}
            {(() => {
              const fotoSelecionada = OPCOES_FOTO_INSTALACAO_DESTAQUE.find(
                (o) => o.id === fotoInstalacaoDestaque,
              )
              if (!fotoSelecionada || !fotoSelecionada.src) {
                return (
                  <div className="p-2.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[11px] text-slate-500 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      Nenhuma foto de instalação será exibida em destaque na proposta comercial.
                    </span>
                  </div>
                )
              }
              return (
                <div className="p-2.5 rounded-lg border border-amber-200 bg-white flex items-center gap-3">
                  <div className="w-20 h-14 rounded-md overflow-hidden bg-slate-900 shrink-0 border border-amber-300/60 shadow-2xs">
                    <img
                      src={fotoSelecionada.src}
                      alt={fotoSelecionada.legenda}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <strong className="text-slate-900 font-bold leading-tight">
                        {fotoSelecionada.legenda}
                      </strong>
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] px-1.5 py-0 font-semibold">
                        {fotoSelecionada.tag}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {fotoSelecionada.local}
                    </p>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Validade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label
                htmlFor="editValidade"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Prazo de Validade da Proposta (Dias)
              </Label>
              <Input
                id="editValidade"
                type="number"
                min="1"
                max="90"
                value={validadeDias}
                onChange={(e) => setValidadeDias(parseInt(e.target.value) || 15)}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-slate-400">
                Ao alterar a validade, a nova data limite refletirá imediatamente no link público.
              </p>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex flex-col justify-center text-xs text-slate-600">
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#0B7A5B]" />
                Link Público Existente Preservado:
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                O token público da proposta continua o mesmo ({proposta.token_publico?.slice(0, 8)}
                ...), os acessos anteriores são mantidos e a tela pública atualizará os novos
                valores.
              </span>
            </div>
          </div>

          {/* Condições de Pagamento */}
          <div className="space-y-1">
            <Label htmlFor="editCondicoes" className="text-xs font-semibold text-slate-700">
              Condições e Formas de Pagamento
            </Label>
            <Textarea
              id="editCondicoes"
              rows={2}
              value={condicoesPagamento}
              onChange={(e) => setCondicoesPagamento(e.target.value)}
              className="text-xs leading-relaxed"
              placeholder="Ex: À vista com 5% de desconto via TED/PIX ou Financiamento Solar em até 84x..."
            />
          </div>

          {/* Observações / Escopo */}
          <div className="space-y-1">
            <Label htmlFor="editObs" className="text-xs font-semibold text-slate-700">
              Observações e Escopo Técnico Incluso
            </Label>
            <Textarea
              id="editObs"
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="text-xs leading-relaxed"
              placeholder="Ex: Incluso homologação na concessionária local, estrutura em alumínio, cabos e monitoramento Wi-Fi..."
            />
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando Alterações...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Salvar Proposta</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
