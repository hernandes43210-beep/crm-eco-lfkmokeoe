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
} from 'lucide-react'
import { KitsService } from '@/services/kits'
import { ProposalsService } from '@/services/proposals'
import type { Kit, Proposta, PropostaStatus } from '@/types/crm'
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
import { toast } from '@/hooks/use-toast'

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

  // Form states
  const [selectedKitId, setSelectedKitId] = useState<string>('')
  const [kitNome, setKitNome] = useState('')
  const [kitPotenciaKw, setKitPotenciaKw] = useState<number | string>('')
  const [kitFabricante, setKitFabricante] = useState('')
  const [custo, setCusto] = useState<number | string>('')
  const [margem, setMargem] = useState<number | string>(25)
  const [precoVenda, setPrecoVenda] = useState<number | string>('')
  const [descontoReais, setDescontoReais] = useState<number | string>(0)
  const [validadeDias, setValidadeDias] = useState<number>(15)
  const [status, setStatus] = useState<PropostaStatus>('Enviada')
  const [condicoesPagamento, setCondicoesPagamento] = useState('')
  const [observacoes, setObservacoes] = useState('')

  // Carregar catálogo de kits ao abrir o modal
  useEffect(() => {
    if (open) {
      loadKits()
    }
  }, [open])

  // Preencher dados ao abrir com a proposta selecionada
  useEffect(() => {
    if (open && proposta) {
      setSelectedKitId(proposta.kit || 'custom')
      setKitNome(proposta.kit_nome || '')
      setKitPotenciaKw(proposta.kit_potencia_kw ?? '')
      setKitFabricante(proposta.kit_fabricante || '')
      setCusto(proposta.custo ?? '')
      setMargem(proposta.margem ?? 25)
      setPrecoVenda(proposta.preco_venda ?? '')
      setDescontoReais(0)
      setValidadeDias(proposta.validade_dias || 15)
      setStatus(proposta.status || 'Enviada')
      setCondicoesPagamento(proposta.condicoes_pagamento || '')
      setObservacoes(proposta.observacoes || '')
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
    setKitFabricante(kit.fabricante || '')
    setCusto(kit.custo)
    setMargem(kit.margem)

    // Preço de venda base do kit
    let baseVenda = kit.preco_venda
    if (!baseVenda && kit.custo && kit.margem < 100) {
      baseVenda = Math.round((kit.custo / (1 - kit.margem / 100)) * 100) / 100
    }
    const desc = parseFloat(String(descontoReais)) || 0
    const finalVenda = Math.max(0, (baseVenda || 0) - desc)
    setPrecoVenda(finalVenda)
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

  // Recalcular preço de venda quando custo ou margem são alterados
  const handleCustoChange = (val: string) => {
    setCusto(val)
    const numCusto = parseFloat(val) || 0
    const numMargem = parseFloat(String(margem)) || 0
    const desc = parseFloat(String(descontoReais)) || 0
    if (numCusto > 0 && numMargem >= 0 && numMargem < 100) {
      const baseCalc = numCusto / (1 - numMargem / 100)
      const finalCalc = Math.max(0, baseCalc - desc)
      setPrecoVenda(Math.round(finalCalc * 100) / 100)
    }
  }

  const handleMargemChange = (val: string) => {
    setMargem(val)
    const numMargem = parseFloat(val) || 0
    const numCusto = parseFloat(String(custo)) || 0
    const desc = parseFloat(String(descontoReais)) || 0
    if (numCusto > 0 && numMargem >= 0 && numMargem < 100) {
      const baseCalc = numCusto / (1 - numMargem / 100)
      const finalCalc = Math.max(0, baseCalc - desc)
      setPrecoVenda(Math.round(finalCalc * 100) / 100)
    }
  }

  const handleDescontoChange = (val: string) => {
    setDescontoReais(val)
    const desc = parseFloat(val) || 0
    const numCusto = parseFloat(String(custo)) || 0
    const numMargem = parseFloat(String(margem)) || 0
    if (numCusto > 0 && numMargem >= 0 && numMargem < 100) {
      const baseCalc = numCusto / (1 - numMargem / 100)
      const finalCalc = Math.max(0, baseCalc - desc)
      setPrecoVenda(Math.round(finalCalc * 100) / 100)
    }
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

    if (numPrecoVenda <= 0) {
      toast({
        title: 'Preço de venda inválido',
        description: 'O preço de venda da proposta deve ser maior que zero.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)

      // Recalcular data_validade com base no número de dias de validade
      // A partir da data atual ou mantendo a data se dias não foram alterados
      const validadeDiasNum = Math.max(1, Number(validadeDias) || 15)
      const validadeDate = new Date()
      validadeDate.setDate(validadeDate.getDate() + validadeDiasNum)
      const validadeIso = validadeDate.toISOString().replace('T', ' ').substring(0, 19) + 'Z'

      const kitRelId = selectedKitId && selectedKitId !== 'custom' ? selectedKitId : null

      const payload: Partial<Proposta> = {
        kit: kitRelId || undefined,
        kit_nome: kitNome.trim(),
        kit_potencia_kw: potenciaNum > 0 ? potenciaNum : 0,
        kit_fabricante: kitFabricante.trim() || undefined,
        custo: numCusto,
        margem: numMargem,
        preco_venda: numPrecoVenda,
        validade_dias: validadeDiasNum,
        data_validade: validadeIso,
        status,
        condicoes_pagamento: condicoesPagamento.trim(),
        observacoes: observacoes.trim(),
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
      const errorMsg =
        err &&
        typeof err === 'object' &&
        'status' in err &&
        (err as { status?: number }).status === 403
          ? 'Você não tem permissão para editar esta proposta.'
          : err instanceof Error
            ? err.message
            : 'Falha ao salvar alterações da proposta.'

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
          {/* Seletor de Kit do Catálogo */}
          <div className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-2">
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

            <Select value={selectedKitId} onValueChange={handleKitSelect}>
              <SelectTrigger className="h-10 text-xs bg-white border-emerald-200 focus:ring-[#0B7A5B]">
                <SelectValue placeholder="Selecione um kit ou mantenha personalizado..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom" className="text-xs font-semibold text-[#0B7A5B]">
                  ★ Personalizado (Digitar dados manualmente)
                </SelectItem>
                {kits.map((kit) => (
                  <SelectItem key={kit.id} value={kit.id} className="text-xs">
                    {kit.nome} — {kit.potencia_kw} kWp ({kit.categoria}) • Venda:{' '}
                    {formatBRL(kit.preco_venda)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-emerald-800">
              Ao escolher um kit, custo, margem e potência são atualizados mantendo os campos 100%
              editáveis.
            </p>
          </div>

          {/* Dados do Kit: Nome, Potência e Fabricante */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="editKitNome" className="text-xs font-semibold text-slate-700">
                Identificação do Kit / Sistema *
              </Label>
              <Input
                id="editKitNome"
                value={kitNome}
                onChange={(e) => setKitNome(e.target.value)}
                placeholder="Ex: Kit Solar 5.5 kWp Canadian"
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
                placeholder="Ex: 5.5"
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

          {/* Precificação: Custo, Margem, Desconto e Preço de Venda */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Precificação e Condições Comerciais
              </span>
              <span className="text-[11px] text-slate-400">Valores calculados em R$ (BRL)</span>
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
                <Label htmlFor="editDesconto" className="text-xs font-semibold text-slate-700">
                  Desconto (R$)
                </Label>
                <Input
                  id="editDesconto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={descontoReais}
                  onChange={(e) => handleDescontoChange(e.target.value)}
                  placeholder="Ex: 500"
                  className="h-9 text-xs font-mono-numbers bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="editVenda" className="text-xs font-bold text-emerald-900">
                  Preço de Venda Final (R$) *
                </Label>
                <Input
                  id="editVenda"
                  type="number"
                  step="0.01"
                  min="0"
                  value={precoVenda}
                  onChange={(e) => setPrecoVenda(e.target.value)}
                  placeholder="Ex: 20000"
                  required
                  className="h-9 text-xs font-bold font-mono-numbers bg-white border-emerald-400 text-emerald-900"
                />
              </div>
            </div>
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
