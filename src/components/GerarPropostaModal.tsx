import React, { useState, useEffect } from 'react'
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
import { Loader2, Sparkles, Sun, Check, SlidersHorizontal, Boxes } from 'lucide-react'
import { KitsService } from '@/services/kits'
import { ProposalsService, type CreatePropostaPayload } from '@/services/proposals'
import { toPortugueseErrorMessage } from '@/lib/errors'
import type { Kit, Lead, Proposta, KitTipoEstrutura, KitStringBox } from '@/types/crm'
import { formatBRL } from '@/lib/solarUtils'
import { calcularMargemReal } from '@/utils/marginUtils'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'
import {
  KitTechnicalSelectors,
  type KitTechnicalSelectorsValues,
} from '@/components/KitTechnicalSelectors'
import {
  calcularKwpPrePronto,
  sugerirNomeKit,
  sugerirFabricanteKit,
  sugerirDescricaoTecnica,
  aplicarEstruturaAoNomeKit,
  extrairComponentesKit,
} from '@/lib/quickKitUtils'
import { useKitFilters } from '@/hooks/useKitFilters'
import { KitFilterBar } from '@/components/KitFilterBar'

interface GerarPropostaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead
  onProposalCreated: (proposta: Proposta) => void
}

export function GerarPropostaModal({
  open,
  onOpenChange,
  lead,
  onProposalCreated,
}: GerarPropostaModalProps) {
  const { user } = useAuth()
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
  const [validadeDias, setValidadeDias] = useState<number>(15)
  const [condicoesPagamento, setCondicoesPagamento] = useState(
    'À vista com 5% de desconto via TED/PIX ou Financiamento Solar em até 84x (Santander, BV ou Solfácil) com carência de 90 dias.',
  )
  const [observacoes, setObservacoes] = useState(
    'Incluso projeto de engenharia, homologação na concessionária local, estrutura de fixação em alumínio, cabos, proteções CC/CA e monitoramento via Wi-Fi.',
  )

  // Estados dos seletores técnicos do kit manual / selecionado
  const [isManualQuickMode, setIsManualQuickMode] = useState(true)
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

  useEffect(() => {
    if (open) {
      loadKits()
    }
  }, [open])

  const loadKits = async () => {
    try {
      setLoadingKits(true)
      const data = await KitsService.getKits()
      setKits(data)

      // Se o lead tem consumo informado, tentar sugerir o kit mais próximo
      if (data.length > 0) {
        const consumo = lead.consumo_mensal_kwh || 400
        // Regra solar padrão no Brasil: 1 kWp gera ~120 kWh/mês
        const kwpNecessario = consumo / 120

        // Encontrar kit mais próximo da potência necessária
        let bestKit = data[0]
        let minDiff = Math.abs(bestKit.potencia_kw - kwpNecessario)

        for (const k of data) {
          const diff = Math.abs(k.potencia_kw - kwpNecessario)
          if (diff < minDiff) {
            minDiff = diff
            bestKit = k
          }
        }

        applyKit(bestKit)
      }
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

  const isCustomMode = selectedKitId === 'custom'

  // Cálculo automático de potência pico (kWp) em tempo real da montagem pré-pronta manual
  const manualKwpInfo = React.useMemo(() => {
    return calcularKwpPrePronto(technicalValues.qtdPaineis, technicalValues.potenciaPainelW)
  }, [technicalValues.qtdPaineis, technicalValues.potenciaPainelW])

  // Sugestão de nome comercial padrão a partir dos componentes
  const manualSuggestedName = React.useMemo(() => {
    return sugerirNomeKit({
      kwp: manualKwpInfo.kwp,
      marcaPaineis: technicalValues.marcaPaineis,
      marcaInversor: technicalValues.marcaInversor,
      qtdPaineis: technicalValues.qtdPaineis,
      potenciaPainelW: technicalValues.potenciaPainelW,
      tipoEstrutura: technicalValues.tipoEstrutura,
    })
  }, [
    manualKwpInfo.kwp,
    technicalValues.marcaPaineis,
    technicalValues.marcaInversor,
    technicalValues.qtdPaineis,
    technicalValues.potenciaPainelW,
    technicalValues.tipoEstrutura,
  ])

  const manualSuggestedFab = React.useMemo(() => {
    return sugerirFabricanteKit(technicalValues.marcaPaineis, technicalValues.marcaInversor)
  }, [technicalValues.marcaPaineis, technicalValues.marcaInversor])

  const applyKit = (kit: Kit) => {
    setSelectedKitId(kit.id)
    setKitNome(kit.nome)
    setKitPotenciaKw(kit.potencia_kw)
    const fabFinal =
      kit.fabricante || [kit.marca_painel, kit.marca_inversor].filter(Boolean).join(' / ')
    setKitFabricante(fabFinal)
    setCusto(kit.custo)
    setMargem(kit.margem)

    // Extrair componentes do kit selecionado para sincronizar seletores
    const componentes = extrairComponentesKit(kit)
    setTechnicalValues({
      qtdPaineis: componentes.qtdPaineis || 10,
      potenciaPainelW: kit.potencia_painel_w || componentes.potenciaPainelW || 630,
      marcaPaineis: kit.marca_painel || componentes.marcaPaineis || 'TSUN POWER',
      qtdInversores: componentes.qtdInversores || 1,
      marcaInversor: kit.marca_inversor || componentes.marcaInversor || 'Sungrow',
      potenciaInversorKw:
        kit.potencia_inversor_kw ?? componentes.potenciaInversorKw ?? (kit.potencia_kw || 7.5),
      tipoEstrutura: kit.tipo_estrutura || componentes.tipoEstrutura || 'fibrocimento',
      stringBox: kit.string_box || componentes.stringBox || '',
    })

    // Preço bruto e de venda
    let precoBrutoCalc = kit.preco_venda
    if (!precoBrutoCalc && kit.custo && kit.margem < 100) {
      precoBrutoCalc = Math.round((kit.custo / (1 - kit.margem / 100)) * 100) / 100
    }
    setValorBruto(precoBrutoCalc || '')
    const descPct = parseFloat(descontoPercentualStr.replace(',', '.')) || 0
    if (descPct > 0 && descPct <= 90 && precoBrutoCalc) {
      const descVal = Math.round(((precoBrutoCalc * descPct) / 100) * 100) / 100
      setPrecoVenda(Math.round((precoBrutoCalc - descVal) * 100) / 100)
    } else {
      setPrecoVenda(precoBrutoCalc || '')
    }
  }

  const handleKitSelect = (kitId: string) => {
    if (kitId === 'custom') {
      setSelectedKitId('custom')

      const consumo = lead.consumo_mensal_kwh || 400
      const kwpEstimado = Math.max(1, Math.round((consumo / 120) * 10) / 10)
      // Estimar painéis de 630Wp
      const qtdCalc = Math.max(2, Math.round((kwpEstimado * 1000) / 630))
      const kwpReal = calcularKwpPrePronto(qtdCalc, 630).kwp
      const invKw = Math.max(3, Math.round(kwpReal * 10) / 10)

      const initialTech: KitTechnicalSelectorsValues = {
        qtdPaineis: qtdCalc,
        potenciaPainelW: 630,
        marcaPaineis: 'TSUN POWER',
        qtdInversores: 1,
        marcaInversor: 'Sungrow',
        potenciaInversorKw: invKw,
        tipoEstrutura: 'fibrocimento',
        stringBox: '',
      }
      setTechnicalValues(initialTech)
      setIsManualQuickMode(true)

      const suggestedInitialName = sugerirNomeKit({
        kwp: kwpReal,
        marcaPaineis: 'TSUN POWER',
        marcaInversor: 'Sungrow',
        qtdPaineis: qtdCalc,
        potenciaPainelW: 630,
        tipoEstrutura: 'fibrocimento',
      })

      setKitNome(
        suggestedInitialName || `Kit Solar ${kwpReal} kWp — TSUN POWER + Sungrow — Fibrocimento`,
      )
      setKitPotenciaKw(kwpReal)
      setKitFabricante('TSUN POWER / Sungrow')
      setCusto(12000)
      setMargem(25)
      setValorBruto(16000)
      const descPct = parseFloat(descontoPercentualStr.replace(',', '.')) || 0
      if (descPct > 0 && descPct <= 90) {
        const descVal = Math.round(((16000 * descPct) / 100) * 100) / 100
        setPrecoVenda(Math.round((16000 - descVal) * 100) / 100)
      } else {
        setPrecoVenda(16000)
      }
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

      // Se estiver no kit manual e no modo montagem rápida, atualiza nome, kWp e fabricante automaticamente
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
        // Ao alterar apenas a estrutura mesmo com nome personalizado, permite ajustar o sufixo
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

  // Recalcular preço de venda quando custo ou margem são alterados manualmente
  const handleCustoChange = (val: string) => {
    setCusto(val)
    const numCusto = parseFloat(val) || 0
    const numMargem = parseFloat(String(margem)) || 0
    if (numCusto > 0 && numMargem >= 0 && numMargem < 100) {
      const calc = Math.round((numCusto / (1 - numMargem / 100)) * 100) / 100
      setValorBruto(calc)
      recalcularValoresComDesconto(calc, descontoPercentualStr)
    }
  }

  const handleMargemChange = (val: string) => {
    setMargem(val)
    const numMargem = parseFloat(val) || 0
    const numCusto = parseFloat(String(custo)) || 0
    if (numCusto > 0 && numMargem >= 0 && numMargem < 100) {
      const calc = Math.round((numCusto / (1 - numMargem / 100)) * 100) / 100
      setValorBruto(calc)
      recalcularValoresComDesconto(calc, descontoPercentualStr)
    }
  }

  const handleValorBrutoChange = (val: string) => {
    setValorBruto(val)
    const numBruto = parseFloat(val) || 0
    recalcularValoresComDesconto(numBruto, descontoPercentualStr)
  }

  const handleDescontoPercentualChange = (val: string) => {
    // Permite digitação com vírgula ou ponto (ex: 5 ou 7,5)
    setDescontoPercentualStr(val)
    const numBruto = parseFloat(String(valorBruto)) || parseFloat(String(precoVenda)) || 0
    recalcularValoresComDesconto(numBruto, val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

      const token = ProposalsService.generateToken()
      const validadeDate = new Date()
      validadeDate.setDate(validadeDate.getDate() + (Number(validadeDias) || 15))
      const validadeIso = validadeDate.toISOString().replace('T', ' ').substring(0, 19) + 'Z'

      // Descrição técnica derivada da montagem manual se for kit customizado
      const descGerada = isCustomMode
        ? sugerirDescricaoTecnica({
            qtdPaineis: technicalValues.qtdPaineis,
            potenciaPainelW: technicalValues.potenciaPainelW,
            marcaPaineis: technicalValues.marcaPaineis,
            qtdInversores: technicalValues.qtdInversores,
            marcaInversor: technicalValues.marcaInversor,
            potenciaInversorKw: technicalValues.potenciaInversorKw,
            kwp: parseFloat(String(kitPotenciaKw)) || manualKwpInfo.kwp,
            stringBox: technicalValues.stringBox || '',
            tipoEstrutura: technicalValues.tipoEstrutura,
          })
        : undefined

      const payload: CreatePropostaPayload = {
        lead: lead.id,
        kit: selectedKitId && selectedKitId !== 'custom' ? selectedKitId : undefined,
        criado_por: user?.id,
        kit_nome: kitNome.trim(),
        kit_potencia_kw: parseFloat(String(kitPotenciaKw)) || manualKwpInfo.kwp || 0,
        kit_fabricante: kitFabricante.trim() || manualSuggestedFab || undefined,
        custo: numCusto,
        margem: numMargem,
        preco_venda: numPrecoVenda,
        desconto_percentual: descPctParsed > 0 ? descPctParsed : 0,
        valor_desconto: numValorDesconto,
        valor_bruto: numBrutoFinal,
        validade_dias: Number(validadeDias) || 15,
        data_validade: validadeIso,
        condicoes_pagamento: condicoesPagamento.trim(),
        observacoes: observacoes.trim(),
        kit_marca_painel: technicalValues.marcaPaineis?.trim() || undefined,
        kit_marca_inversor: technicalValues.marcaInversor?.trim() || undefined,
        kit_tipo_estrutura: technicalValues.tipoEstrutura?.trim() || undefined,
        kit_potencia_painel_w: Number(technicalValues.potenciaPainelW) || undefined,
        kit_potencia_inversor_kw: Number(technicalValues.potenciaInversorKw) || undefined,
        kit_string_box: technicalValues.stringBox?.trim() || undefined,
        kit_descricao: descGerada || undefined,
        status: 'Enviada',
        token_publico: token,
      }

      const created = await ProposalsService.createProposta(payload)

      toast({
        title: 'Proposta gerada com sucesso!',
        description: 'O link exclusivo já está pronto para envio ao cliente.',
      })

      onProposalCreated(created)
      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Erro ao gerar proposta:', err)
      const msg = toPortugueseErrorMessage(
        err,
        'Falha ao gerar proposta comercial. Verifique os dados e tente novamente.',
      )
      toast({
        title: 'Erro ao gerar proposta',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#0B7A5B]">
            <Sun className="w-5 h-5 text-amber-500" />
            <DialogTitle className="text-lg font-bold text-slate-900">
              Gerar Nova Proposta Comercial Solar
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Cliente: <strong className="text-slate-800">{lead.nome}</strong> • Consumo:{' '}
            <strong className="text-slate-800">{lead.consumo_mensal_kwh} kWh/mês</strong>
            {lead.cidade ? ` • ${lead.cidade}/${lead.estado}` : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Selecionar Kit do Catálogo com Filtros Idênticos à aba Kits Solares */}
          <div className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Escolher Kit Solar do Catálogo</span>
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
                <SelectValue placeholder="Selecione um kit ou personalize abaixo..." />
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
              Ao selecionar, os valores de custo, margem e preço de venda são preenchidos
              automaticamente e permanecem 100% editáveis para esta negociação.
            </p>
          </div>

          {/* Seletor Rico para Kit Manual (exatamente como no gerador normal de Kits Solares) */}
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

          {/* Dados do Kit (Nome, Potência e Fabricante) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="propKitNome" className="text-xs font-semibold text-slate-700">
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
                id="propKitNome"
                value={kitNome}
                onChange={(e) => setKitNome(e.target.value)}
                placeholder="Ex: Kit Solar 6,3 kWp — TSUN POWER + Sungrow — Fibrocimento"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="propPotencia" className="text-xs font-semibold text-slate-700">
                Potência (kWp)
              </Label>
              <Input
                id="propPotencia"
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

          <div className="space-y-1">
            <Label htmlFor="propFabricante" className="text-xs font-semibold text-slate-700">
              Fabricante dos Módulos / Inversor
            </Label>
            <Input
              id="propFabricante"
              value={kitFabricante}
              onChange={(e) => setKitFabricante(e.target.value)}
              placeholder="Ex: TSUN POWER / Sungrow"
              className="h-9 text-xs"
            />
          </div>

          {/* Precificação: Custo, Margem, Valor Bruto do Kit, Desconto em % e Preço de Venda Final */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Precificação e Condições Comerciais
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Desconto opcional em % com recálculo em tempo real
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="propCusto" className="text-xs font-semibold text-slate-700">
                  Preço de Custo (R$) *
                </Label>
                <Input
                  id="propCusto"
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
                <Label htmlFor="propMargem" className="text-xs font-semibold text-slate-700">
                  Margem (%)
                </Label>
                <Input
                  id="propMargem"
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
                <Label htmlFor="propValorBruto" className="text-xs font-semibold text-slate-700">
                  Valor Bruto do Kit (R$) *
                </Label>
                <Input
                  id="propValorBruto"
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
                    htmlFor="propDescontoPct"
                    className="text-xs font-semibold text-emerald-900"
                  >
                    Desconto (%)
                  </Label>
                  <span className="text-[10px] text-slate-500">0% a 90%</span>
                </div>
                <Input
                  id="propDescontoPct"
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

          {/* Validade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="propValidade" className="text-xs font-semibold text-slate-700">
                Prazo de Validade da Proposta (Dias)
              </Label>
              <Input
                id="propValidade"
                type="number"
                min="1"
                max="90"
                value={validadeDias}
                onChange={(e) => setValidadeDias(parseInt(e.target.value) || 15)}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-slate-400">Padrão solar comercial: 15 dias.</p>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex flex-col justify-center text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Geração de Link Público:</span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                Um token seguro de 32 caracteres será gerado para visualização e aceite pelo cliente
                sem necessidade de login.
              </span>
            </div>
          </div>

          {/* Condições de Pagamento */}
          <div className="space-y-1">
            <Label htmlFor="propCondicoes" className="text-xs font-semibold text-slate-700">
              Condições e Formas de Pagamento
            </Label>
            <Textarea
              id="propCondicoes"
              rows={2}
              value={condicoesPagamento}
              onChange={(e) => setCondicoesPagamento(e.target.value)}
              className="text-xs leading-relaxed"
            />
          </div>

          {/* Observações / Escopo */}
          <div className="space-y-1">
            <Label htmlFor="propObs" className="text-xs font-semibold text-slate-700">
              Observações e Escopo Técnico Incluso
            </Label>
            <Textarea
              id="propObs"
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="text-xs leading-relaxed"
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
                  <span>Gerando Proposta...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Gerar e Ativar Link Público</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
