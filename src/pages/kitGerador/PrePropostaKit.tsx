import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sun,
  Zap,
  Building,
  DollarSign,
  Plus,
  Trash2,
  BookmarkCheck,
  RotateCcw,
} from 'lucide-react'
import {
  parsePaineisLinhas,
  parseInversoresLinhas,
  parseOutrosDados,
  type KitGerado,
  type PainelLinha,
  type InversorLinha,
} from '@/services/kitGerador'
import { fmt } from './logica'

export interface PrePropostaKitProps {
  kit: KitGerado
  distribuidora?: string
  tipoInstalacao?: string
  potenciaKwp?: number
  precoSugerido?: number
  onAplicar?: (kit: KitGerado) => void
  aplicado?: boolean
}

export function PrePropostaKit({
  kit,
  distribuidora,
  tipoInstalacao,
  potenciaKwp,
  precoSugerido,
  onAplicar,
  aplicado,
}: PrePropostaKitProps) {
  // Extrai listas de modelos usando os parsers universais
  const paineisLinhasIniciais = useMemo(() => parsePaineisLinhas(kit.painel), [kit.painel])
  const inversoresLinhasIniciais = useMemo(() => parseInversoresLinhas(kit.inversor), [kit.inversor])
  const outrosPaineisInicial = useMemo(() => parseOutrosDados(kit.painel), [kit.painel])
  const outrosInversoresInicial = useMemo(() => parseOutrosDados(kit.inversor), [kit.inversor])

  const [paineis, setPaineis] = useState<PainelLinha[]>(paineisLinhasIniciais)
  const [inversores, setInversores] = useState<InversorLinha[]>(inversoresLinhasIniciais)
  const [outrosPaineis, setOutrosPaineis] = useState(outrosPaineisInicial)
  const [outrosInversores, setOutrosInversores] = useState(outrosInversoresInicial)

  // Totais calculados
  const totalPaineisQtd = paineis.reduce((acc, p) => acc + (p.qtd || 0), 0)
  const totalInversoresQtd = inversores.reduce((acc, i) => acc + (i.qtd || 0), 0)

  const potenciaEfetivaKwp = useMemo(() => {
    if (paineis.length > 0) {
      const somaW = paineis.reduce((acc, p) => acc + (p.qtd || 0) * (p.potencia_w || 0), 0)
      if (somaW > 0) return somaW / 1000
    }
    return potenciaKwp ?? kit.potencia_kwp ?? 0
  }, [paineis, potenciaKwp, kit.potencia_kwp])

  const potenciaInversoresKw = useMemo(() => {
    return inversores.reduce((acc, i) => acc + (i.qtd || 0) * (i.potencia_kw || 0), 0)
  }, [inversores])

  const handleAddPainel = () => {
    setPaineis((prev) => [
      ...prev,
      { marca: 'Genérico', modelo: 'Novo Módulo', potencia_w: 550, qtd: 1, area_m2: 2.79 },
    ])
  }

  const handleRemovePainel = (idx: number) => {
    if (paineis.length <= 1) return
    setPaineis((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleUpdatePainel = (idx: number, campo: keyof PainelLinha, valor: any) => {
    setPaineis((prev) => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [campo]: valor }
      return copy
    })
  }

  const handleAddInversor = () => {
    setInversores((prev) => [
      ...prev,
      { marca: 'Genérico', modelo: 'Novo Inversor', potencia_kw: 5, qtd: 1, tipo: 'Monofásico' },
    ])
  }

  const handleRemoveInversor = (idx: number) => {
    if (inversores.length <= 1) return
    setInversores((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleUpdateInversor = (idx: number, campo: keyof InversorLinha, valor: any) => {
    setInversores((prev) => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [campo]: valor }
      return copy
    })
  }

  const handleReset = () => {
    setPaineis(paineisLinhasIniciais)
    setInversores(inversoresLinhasIniciais)
    setOutrosPaineis(outrosPaineisInicial)
    setOutrosInversores(outrosInversoresInicial)
  }

  const handleAplicar = () => {
    if (!onAplicar) return
    // Serializa de volta no formato moderno com listas e outros_dados
    const novoKit: KitGerado = {
      ...kit,
      painel: JSON.stringify({
        linhas: paineis,
        outros_dados: outrosPaineis.trim(),
      }),
      inversor: JSON.stringify({
        linhas: inversores,
        outros_dados: outrosInversores.trim(),
      }),
      potencia_kwp: potenciaEfetivaKwp,
    }
    onAplicar(novoKit)
  }

  return (
    <Card className="border-[#dfe5f0] shadow-sm">
      <CardHeader className="bg-[#f8fafc] border-b border-[#dfe5f0] pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base text-[#0b1f4d] flex items-center gap-2">
              <Sun className="h-5 w-5 text-[#f1c40f]" />
              {kit.nome || 'Kit Fotovoltaico'}
            </CardTitle>
            <p className="text-xs text-[#8a94a8]">
              {distribuidora || kit.distribuidora || 'Distribuidora'} • {tipoInstalacao || kit.tipo_instalacao || 'Telhado'}
            </p>
          </div>
          <Badge className="bg-[#0b1f4d] text-[#f1c40f] text-xs font-bold px-2.5 py-1">
            {fmt(potenciaEfetivaKwp)} kWp
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Painéis */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-[#0b1f4d] flex items-center gap-1.5">
              <Sun className="h-4 w-4 text-[#f1c40f]" /> Módulos Fotovoltaicos ({totalPaineisQtd} un)
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPainel}
              className="h-7 text-xs border-[#0b1f4d] text-[#0b1f4d]"
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar Modelo
            </Button>
          </div>

          <div className="space-y-2">
            {paineis.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded border border-[#dfe5f0] bg-[#f8fafc] p-2 text-xs"
              >
                <input
                  type="number"
                  min="1"
                  value={p.qtd}
                  onChange={(e) => handleUpdatePainel(idx, 'qtd', Number(e.target.value))}
                  className="w-12 h-7 rounded border border-[#dfe5f0] bg-white text-center font-bold text-[#0b1f4d]"
                />
                <span className="text-[#8a94a8]">×</span>
                <input
                  type="text"
                  placeholder="Marca"
                  value={p.marca}
                  onChange={(e) => handleUpdatePainel(idx, 'marca', e.target.value)}
                  className="flex-1 h-7 rounded border border-[#dfe5f0] bg-white px-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="Modelo"
                  value={p.modelo}
                  onChange={(e) => handleUpdatePainel(idx, 'modelo', e.target.value)}
                  className="flex-1 h-7 rounded border border-[#dfe5f0] bg-white px-2 text-xs"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={p.potencia_w}
                    onChange={(e) => handleUpdatePainel(idx, 'potencia_w', Number(e.target.value))}
                    className="w-16 h-7 rounded border border-[#dfe5f0] bg-white text-right px-1 text-xs"
                  />
                  <span className="text-[11px] text-[#8a94a8]">W</span>
                </div>
                {paineis.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePainel(idx)}
                    className="h-7 w-7 p-0 text-[#c0392b] hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Outros dados módulos */}
          <div className="pt-1">
            <Textarea
              placeholder="Outros dados / observações dos painéis..."
              value={outrosPaineis}
              onChange={(e) => setOutrosPaineis(e.target.value)}
              rows={1}
              className="resize-none text-xs bg-white h-7 py-1"
            />
          </div>
        </div>

        {/* Inversores */}
        <div className="space-y-2 pt-2 border-t border-[#dfe5f0]">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-[#0b1f4d] flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-[#0b1f4d]" /> Inversores ({totalInversoresQtd} un — {fmt(potenciaInversoresKw)} kW)
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddInversor}
              className="h-7 text-xs border-[#0b1f4d] text-[#0b1f4d]"
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar Modelo
            </Button>
          </div>

          <div className="space-y-2">
            {inversores.map((inv, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded border border-[#dfe5f0] bg-[#f8fafc] p-2 text-xs"
              >
                <input
                  type="number"
                  min="1"
                  value={inv.qtd}
                  onChange={(e) => handleUpdateInversor(idx, 'qtd', Number(e.target.value))}
                  className="w-12 h-7 rounded border border-[#dfe5f0] bg-white text-center font-bold text-[#0b1f4d]"
                />
                <span className="text-[#8a94a8]">×</span>
                <input
                  type="text"
                  placeholder="Marca"
                  value={inv.marca}
                  onChange={(e) => handleUpdateInversor(idx, 'marca', e.target.value)}
                  className="flex-1 h-7 rounded border border-[#dfe5f0] bg-white px-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="Modelo"
                  value={inv.modelo}
                  onChange={(e) => handleUpdateInversor(idx, 'modelo', e.target.value)}
                  className="flex-1 h-7 rounded border border-[#dfe5f0] bg-white px-2 text-xs"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={inv.potencia_kw}
                    onChange={(e) => handleUpdateInversor(idx, 'potencia_kw', Number(e.target.value))}
                    className="w-16 h-7 rounded border border-[#dfe5f0] bg-white text-right px-1 text-xs"
                  />
                  <span className="text-[11px] text-[#8a94a8]">kW</span>
                </div>
                {inversores.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveInversor(idx)}
                    className="h-7 w-7 p-0 text-[#c0392b] hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Outros dados inversores */}
          <div className="pt-1">
            <Textarea
              placeholder="Outros dados / observações dos inversores..."
              value={outrosInversores}
              onChange={(e) => setOutrosInversores(e.target.value)}
              rows={1}
              className="resize-none text-xs bg-white h-7 py-1"
            />
          </div>
        </div>

        {/* Rodapé Comercial e Botões */}
        <div className="pt-3 border-t border-[#dfe5f0] flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] text-[#8a94a8] block">Preço Final Estimado</span>
            <span className="font-bold text-sm text-[#0b1f4d]">
              R$ {(precoSugerido ?? kit.preco_final ?? 0).toLocaleString('pt-BR')}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 text-xs text-[#8a94a8]"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reverter
            </Button>
            {onAplicar && (
              <Button
                type="button"
                size="sm"
                onClick={handleAplicar}
                className={
                  aplicado
                    ? 'h-8 bg-emerald-600 text-white text-xs'
                    : 'h-8 bg-[#0b1f4d] text-white text-xs hover:bg-[#122e6f]'
                }
              >
                <BookmarkCheck className="h-3.5 w-3.5 mr-1" />
                {aplicado ? 'Aplicado' : 'Aplicar na Proposta'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
