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
import { Loader2, Sparkles, Sun, Check } from 'lucide-react'
import { KitsService } from '@/services/kits'
import { ProposalsService, type CreatePropostaPayload } from '@/services/proposals'
import { toPortugueseErrorMessage } from '@/lib/errors'
import type { Kit, Lead, Proposta } from '@/types/crm'
import { formatBRL } from '@/lib/solarUtils'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'

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

  // Form states
  const [selectedKitId, setSelectedKitId] = useState<string>('')
  const [kitNome, setKitNome] = useState('')
  const [kitPotenciaKw, setKitPotenciaKw] = useState<number | string>('')
  const [kitFabricante, setKitFabricante] = useState('')
  const [custo, setCusto] = useState<number | string>('')
  const [margem, setMargem] = useState<number | string>(25)
  const [precoVenda, setPrecoVenda] = useState<number | string>('')
  const [validadeDias, setValidadeDias] = useState<number>(15)
  const [condicoesPagamento, setCondicoesPagamento] = useState(
    'À vista com 5% de desconto via TED/PIX ou Financiamento Solar em até 84x (Santander, BV ou Solfácil) com carência de 90 dias.',
  )
  const [observacoes, setObservacoes] = useState(
    'Incluso projeto de engenharia, homologação na concessionária local, estrutura de fixação em alumínio, cabos, proteções CC/CA e monitoramento via Wi-Fi.',
  )

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

  const applyKit = (kit: Kit) => {
    setSelectedKitId(kit.id)
    setKitNome(kit.nome)
    setKitPotenciaKw(kit.potencia_kw)
    const fabFinal =
      kit.fabricante || [kit.marca_painel, kit.marca_inversor].filter(Boolean).join(' / ')
    setKitFabricante(fabFinal)
    setCusto(kit.custo)
    setMargem(kit.margem)

    // Preço de venda
    if (kit.preco_venda) {
      setPrecoVenda(kit.preco_venda)
    } else if (kit.custo && kit.margem < 100) {
      const calc = kit.custo / (1 - kit.margem / 100)
      setPrecoVenda(Math.round(calc * 100) / 100)
    }
  }

  const handleKitSelect = (kitId: string) => {
    if (kitId === 'custom') {
      setSelectedKitId('custom')
      setKitNome(`Kit Solar Personalizado (${lead.consumo_mensal_kwh || 400} kWh)`)
      setKitPotenciaKw(Math.round(((lead.consumo_mensal_kwh || 400) / 120) * 10) / 10)
      setKitFabricante('')
      setCusto(12000)
      setMargem(25)
      setPrecoVenda(16000)
      return
    }

    const kit = kits.find((k) => k.id === kitId)
    if (kit) {
      applyKit(kit)
    }
  }

  // Recalcular preço de venda quando custo ou margem são alterados manualmente
  const handleCustoChange = (val: string) => {
    setCusto(val)
    const numCusto = parseFloat(val) || 0
    const numMargem = parseFloat(String(margem)) || 0
    if (numCusto > 0 && numMargem >= 0 && numMargem < 100) {
      const calc = numCusto / (1 - numMargem / 100)
      setPrecoVenda(Math.round(calc * 100) / 100)
    }
  }

  const handleMargemChange = (val: string) => {
    setMargem(val)
    const numMargem = parseFloat(val) || 0
    const numCusto = parseFloat(String(custo)) || 0
    if (numCusto > 0 && numMargem >= 0 && numMargem < 100) {
      const calc = numCusto / (1 - numMargem / 100)
      setPrecoVenda(Math.round(calc * 100) / 100)
    }
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

      const token = ProposalsService.generateToken()
      const validadeDate = new Date()
      validadeDate.setDate(validadeDate.getDate() + (Number(validadeDias) || 15))
      const validadeIso = validadeDate.toISOString().replace('T', ' ').substring(0, 19) + 'Z'

      const payload: CreatePropostaPayload = {
        lead: lead.id,
        kit: selectedKitId && selectedKitId !== 'custom' ? selectedKitId : undefined,
        criado_por: user?.id,
        kit_nome: kitNome.trim(),
        kit_potencia_kw: parseFloat(String(kitPotenciaKw)) || 0,
        kit_fabricante: kitFabricante.trim() || undefined,
        custo: numCusto,
        margem: numMargem,
        preco_venda: numPrecoVenda,
        validade_dias: Number(validadeDias) || 15,
        data_validade: validadeIso,
        condicoes_pagamento: condicoesPagamento.trim(),
        observacoes: observacoes.trim(),
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
          {/* Selecionar Kit do Catálogo */}
          <div className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-2">
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

            <Select value={selectedKitId} onValueChange={handleKitSelect}>
              <SelectTrigger className="h-10 text-xs bg-white border-emerald-200 focus:ring-[#0B7A5B]">
                <SelectValue placeholder="Selecione um kit ou personalize abaixo..." />
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
              Ao selecionar, os valores de custo, margem e preço de venda são preenchidos
              automaticamente e permanecem 100% editáveis para esta negociação.
            </p>
          </div>

          {/* Dados do Kit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="propKitNome" className="text-xs font-semibold text-slate-700">
                Identificação do Kit / Sistema *
              </Label>
              <Input
                id="propKitNome"
                value={kitNome}
                onChange={(e) => setKitNome(e.target.value)}
                placeholder="Ex: Kit Solar 5.5 kWp Canadian — Fibrocimento"
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
                placeholder="Ex: 5.5"
                className="h-9 text-xs"
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
              placeholder="Ex: Canadian Solar / Deye / Growatt"
              className="h-9 text-xs"
            />
          </div>

          {/* Precificação: Custo, Margem, Preço de Venda */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                Margem Comercial (%)
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
              <Label htmlFor="propVenda" className="text-xs font-bold text-emerald-900">
                Preço de Venda Final (R$) *
              </Label>
              <Input
                id="propVenda"
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
