// Resumo do kit gerado, Catálogo de equipamentos e Lista de kits salvos
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Zap, RotateCcw, Copy, Plus, Trash2, FolderOpen, Sparkles } from 'lucide-react'
import { fmt, TIPOS_INVERSOR, type TipoInstalacao } from './logica'
import { ROTULO_INSTALACAO } from './itensPadrao'
import {
  filtrarPaineis,
  filtrarInversores,
  BarraFiltrosCatalogo,
  type FiltroCatalogo,
  filtroCatalogoVazio,
} from './filtrosCatalogo'
import {
  parsePaineisLinhas,
  parseInversoresLinhas,
  parseBateriasJson,
  parseOutrosDados,
  type PainelCatalogo,
  type InversorCatalogo,
  type DistribuidoraItem,
  type KitGerado,
} from '@/services/kitGerador'
import type { DadosResumo } from './resumoTipos'

export type { DadosResumo, TipoInstalacao }

export function LabelResumo({
  label,
  valor,
  destaque = false,
}: {
  label: string
  valor: string | number
  destaque?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-xs py-1 border-b border-[#eef2f8] last:border-b-0">
      <span className="text-[#8a94a8]">{label}</span>
      <span className={destaque ? 'font-bold text-[#0b1f4d]' : 'font-medium text-[#3c4a63]'}>
        {valor}
      </span>
    </div>
  )
}

// ---------- CARTÃO 6: RESUMO TÉCNICO E COMERCIAL ----------

export function ResumoKit({
  dados,
  onSalvar,
  onCopiar,
  onLimpar,
  salvando,
}: {
  dados: DadosResumo
  onSalvar: () => void
  onCopiar: () => void
  onLimpar: () => void
  salvando: boolean
}) {
  const paineisLinhas = dados.paineisLinhas || []
  const inversoresLinhas = dados.inversoresLinhas || []
  const qtdPaineisTotal = paineisLinhas.reduce((acc, p) => acc + (p.qtd || 0), 0)
  const qtdInversoresTotal = inversoresLinhas.reduce((acc, i) => acc + (i.qtd || 0), 0)

  return (
    <div className="rounded-[14px] border border-[#dfe5f0] bg-white p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-[#dfe5f0] pb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-[#f1c40f]" />
          <h2 className="font-montserrat text-base font-bold text-[#0b1f4d]">Resumo do Kit</h2>
        </div>
        <span className="rounded-full bg-[#f1c40f]/20 px-2.5 py-0.5 text-xs font-bold text-[#b78103]">
          {fmt(dados.kwp)} kWp
        </span>
      </div>

      {/* Bloco de Potência e Geração */}
      <div className="rounded-[10px] bg-[#f8fafc] p-3 border border-[#dfe5f0] space-y-1.5">
        <LabelResumo label="Potência total CC" valor={`${fmt(dados.kwp)} kWp`} destaque />
        <LabelResumo label="Potência total CA" valor={`${fmt(dados.kwCa)} kW`} />
        {dados.relacao !== null && dados.relacao > 0 && (
          <LabelResumo
            label="FDR (Sobrecarga / Overpower)"
            valor={`${Math.round((dados.relacao - 1) * 100)}%`}
            destaque
          />
        )}
        {dados.geracaoMensal && (
          <LabelResumo
            label="Geração mensal estimada"
            valor={`~${dados.geracaoMensal} kWh/mês`}
            destaque
          />
        )}
        {dados.areaM2 > 0 && (
          <LabelResumo label="Área de telhado necessária" valor={`~${fmt(dados.areaM2)} m²`} />
        )}
      </div>

      {/* Modelos de Painéis */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8a94a8]">
            Módulos fotovoltaicos
          </span>
          <span className="text-xs font-semibold text-[#0b1f4d]">Total: {qtdPaineisTotal} un</span>
        </div>
        <div className="space-y-1">
          {paineisLinhas.map((p, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded border border-[#dfe5f0] bg-[#f8fafc] px-2.5 py-1.5 text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-[#0b1f4d]">{p.qtd}×</span>
                <span className="truncate text-[#3c4a63]">
                  {p.marca} {p.modelo || ''}
                </span>
              </div>
              <span className="shrink-0 font-semibold text-[#0b1f4d] ml-2">{p.potencia_w} W</span>
            </div>
          ))}
          {paineisLinhas.length === 0 && (
            <p className="text-xs text-[#8a94a8] italic">Nenhum módulo selecionado</p>
          )}
        </div>
        {dados.outrosDadosPaineis && (
          <div className="rounded bg-[#fffbeb] border border-[#fef3c7] p-2 text-[11px] text-[#92400e]">
            <span className="font-semibold">Obs painéis: </span>
            {dados.outrosDadosPaineis}
          </div>
        )}
      </div>

      {/* Modelos de Inversores */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8a94a8]">
            Inversores
          </span>
          <span className="text-xs font-semibold text-[#0b1f4d]">
            Total: {qtdInversoresTotal} un
          </span>
        </div>
        <div className="space-y-1">
          {inversoresLinhas.map((inv, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded border border-[#dfe5f0] bg-[#f8fafc] px-2.5 py-1.5 text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-[#0b1f4d]">{inv.qtd}×</span>
                <span className="truncate text-[#3c4a63]">
                  {inv.marca} {inv.modelo || ''}
                </span>
              </div>
              <span className="shrink-0 font-semibold text-[#0b1f4d] ml-2">
                {fmt(inv.potencia_kw)} kW
              </span>
            </div>
          ))}
          {inversoresLinhas.length === 0 && (
            <p className="text-xs text-[#8a94a8] italic">Nenhum inversor selecionado</p>
          )}
        </div>
        {dados.outrosDadosInversores && (
          <div className="rounded bg-[#fffbeb] border border-[#fef3c7] p-2 text-[11px] text-[#92400e]">
            <span className="font-semibold">Obs inversores: </span>
            {dados.outrosDadosInversores}
          </div>
        )}
      </div>

      {/* Baterias (informativo) */}
      {bateriasLinhas.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8a94a8]">
              Baterias
            </span>
            <span className="text-xs font-semibold text-[#0b1f4d]">
              Total: {qtdBateriasTotal} un
            </span>
          </div>
          <div className="space-y-1">
            {bateriasLinhas.map((b, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded border border-[#dfe5f0] bg-[#f8fafc] px-2.5 py-1.5 text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-[#0b1f4d]">{b.qtd}×</span>
                  <span className="truncate text-[#3c4a63]">
                    {b.marca} {b.modelo || ''}
                  </span>
                </div>
                <span className="shrink-0 font-semibold text-[#0b1f4d] ml-2">
                  {fmt(b.capacidade_kwh)} kWh{b.tensao ? ` • ${b.tensao}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estrutura e Fornecedor */}
      <div className="rounded-[10px] bg-[#f8fafc] p-3 border border-[#dfe5f0] space-y-1">
        <LabelResumo
          label="Estrutura de fixação"
          valor={ROTULO_INSTALACAO[dados.tipoInstalacao] || dados.tipoInstalacao}
        />
        {dados.distribuidora && (
          <LabelResumo label="Fornecedor / Distribuidora" valor={dados.distribuidora} />
        )}
      </div>

      {/* Bloco Comercial / Preço */}
      <div className="rounded-[10px] bg-[#0b1f4d] p-3.5 text-white space-y-2">
        <div className="flex items-center justify-between text-xs text-[#dfe5f0]">
          <span>Preço final sugerido</span>
          {dados.precoFinal !== null && (
            <span className="text-[11px] font-medium text-[#f1c40f]">
              {fmt(dados.precoFinal / (dados.kwp || 1))} R$/Wp
            </span>
          )}
        </div>
        <div className="font-montserrat text-2xl font-bold text-[#f1c40f]">
          {dados.precoFinal !== null ? `R$ ${dados.precoFinal.toLocaleString('pt-BR')}` : 'R$ 0,00'}
        </div>

        {dados.lucro !== null && (
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-[#dfe5f0]">
            <span>Lucro bruto:</span>
            <span className="font-semibold text-emerald-300">
              R$ {dados.lucro.toLocaleString('pt-BR')} ({Math.round(dados.margemPct || 0)}%)
            </span>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="space-y-2 pt-1">
        <Button
          type="button"
          onClick={onSalvar}
          disabled={salvando}
          className="w-full bg-[#0b1f4d] text-white hover:bg-[#122e6f] font-semibold"
        >
          <Sparkles className="h-4 w-4 mr-1.5 text-[#f1c40f]" />
          Salvar Kit para Propostas
        </Button>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCopiar}
            className="flex-1 text-xs border-[#dfe5f0]"
          >
            <Copy className="h-3.5 w-3.5 mr-1 text-[#0b1f4d]" />
            Copiar Resumo
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onLimpar}
            className="text-xs text-[#8a94a8] hover:text-[#c0392b]"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------- ABA CATÁLOGO GERAL ----------

export function AbaCatalogo({
  paineis,
  inversores,
  distribuidoras,
  onAddPainel,
  onAddInversor,
  onAddDistribuidora,
  onExcluirPainel,
  onExcluirInversor,
  onExcluirDistribuidora,
  carregando: _carregando,
}: {
  paineis: PainelCatalogo[]
  inversores: InversorCatalogo[]
  distribuidoras: DistribuidoraItem[]
  onAddPainel: (p: {
    marca: string
    modelo: string
    potencia_w: number
    area_m2: number
  }) => Promise<void>
  onAddInversor: (i: {
    marca: string
    modelo: string
    potencia_kw: number
    tipo: InversorCatalogo['tipo']
  }) => Promise<void>
  onAddDistribuidora: (nome: string) => Promise<void>
  onExcluirPainel: (id: string) => Promise<void>
  onExcluirInversor: (id: string) => Promise<void>
  onExcluirDistribuidora: (id: string) => Promise<void>
  carregando: boolean
}) {
  const [subAba, setSubAba] = useState<'paineis' | 'inversores' | 'distribuidoras'>('paineis')

  // Filtros de busca
  const [filtroPaineis, setFiltroPaineis] = useState<FiltroCatalogo>(filtroCatalogoVazio)
  const [filtroInversores, setFiltroInversores] = useState<FiltroCatalogo>(filtroCatalogoVazio)

  // Modais de novo item rápido
  const [novoPainel, setNovoPainel] = useState({
    marca: '',
    modelo: '',
    potencia_w: 550,
    area_m2: 2.79,
  })
  const [novoInversor, setNovoInversor] = useState({
    marca: '',
    modelo: '',
    potencia_kw: 5,
    tipo: 'Monofásico' as InversorCatalogo['tipo'],
  })
  const [novaDistribuidora, setNovaDistribuidora] = useState('')

  const paineisFiltrados = useMemo(
    () => filtrarPaineis(paineis, filtroPaineis),
    [paineis, filtroPaineis],
  )
  const inversoresFiltrados = useMemo(
    () => filtrarInversores(inversores, filtroInversores),
    [inversores, filtroInversores],
  )

  return (
    <div className="rounded-[14px] border border-[#dfe5f0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dfe5f0] pb-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={subAba === 'paineis' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSubAba('paineis')}
            className={subAba === 'paineis' ? 'bg-[#0b1f4d] text-white' : ''}
          >
            Painéis ({paineis.length})
          </Button>
          <Button
            type="button"
            variant={subAba === 'inversores' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSubAba('inversores')}
            className={subAba === 'inversores' ? 'bg-[#0b1f4d] text-white' : ''}
          >
            Inversores ({inversores.length})
          </Button>
          <Button
            type="button"
            variant={subAba === 'distribuidoras' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSubAba('distribuidoras')}
            className={subAba === 'distribuidoras' ? 'bg-[#0b1f4d] text-white' : ''}
          >
            Distribuidoras ({distribuidoras.length})
          </Button>
        </div>
      </div>

      {subAba === 'paineis' && (
        <div className="space-y-4">
          <BarraFiltrosCatalogo
            filtro={filtroPaineis}
            onChange={setFiltroPaineis}
            unidade="W"
            exemploPotencia="Ex.: 550"
          />

          {/* Cadastro rápido */}
          <div className="flex flex-wrap items-end gap-2 rounded-[10px] bg-[#f8fafc] p-3 border border-[#dfe5f0]">
            <div className="flex-1 min-w-[120px]">
              <Label className="text-[11px]">Marca</Label>
              <Input
                placeholder="Ex.: Canadian"
                value={novoPainel.marca}
                onChange={(e) => setNovoPainel((p) => ({ ...p, marca: e.target.value }))}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label className="text-[11px]">Modelo</Label>
              <Input
                placeholder="Ex.: CS6W-550MS"
                value={novoPainel.modelo}
                onChange={(e) => setNovoPainel((p) => ({ ...p, modelo: e.target.value }))}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="w-24">
              <Label className="text-[11px]">Potência (W)</Label>
              <Input
                type="number"
                value={novoPainel.potencia_w}
                onChange={(e) =>
                  setNovoPainel((p) => ({ ...p, potencia_w: Number(e.target.value) }))
                }
                className="h-8 text-xs bg-white"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!novoPainel.marca || !novoPainel.modelo) return
                onAddPainel(novoPainel)
                setNovoPainel({ marca: '', modelo: '', potencia_w: 550, area_m2: 2.79 })
              }}
              className="h-8 bg-[#0b1f4d] text-white text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#dfe5f0] text-[#8a94a8]">
                <tr>
                  <th className="py-2">Marca</th>
                  <th className="py-2">Modelo</th>
                  <th className="py-2 text-right">Potência</th>
                  <th className="py-2 text-right">Área</th>
                  <th className="py-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2f8]">
                {paineisFiltrados.map((p) => (
                  <tr key={p.id} className="hover:bg-[#f8fafc]">
                    <td className="py-2 font-semibold text-[#0b1f4d]">{p.marca}</td>
                    <td className="py-2 text-[#3c4a63]">{p.modelo}</td>
                    <td className="py-2 text-right font-bold text-[#0b1f4d]">{p.potencia_w} W</td>
                    <td className="py-2 text-right text-[#8a94a8]">{fmt(p.area_m2)} m²</td>
                    <td className="py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onExcluirPainel(p.id)}
                        className="h-6 w-6 p-0 text-[#c0392b] hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {paineisFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-[#8a94a8]">
                      Nenhum painel cadastrado ou encontrado pelo filtro
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subAba === 'inversores' && (
        <div className="space-y-4">
          <BarraFiltrosCatalogo
            filtro={filtroInversores}
            onChange={setFiltroInversores}
            unidade="kW"
            exemploPotencia="Ex.: 5"
          />

          {/* Cadastro rápido */}
          <div className="flex flex-wrap items-end gap-2 rounded-[10px] bg-[#f8fafc] p-3 border border-[#dfe5f0]">
            <div className="flex-1 min-w-[120px]">
              <Label className="text-[11px]">Marca</Label>
              <Input
                placeholder="Ex.: Sungrow"
                value={novoInversor.marca}
                onChange={(e) => setNovoInversor((i) => ({ ...i, marca: e.target.value }))}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label className="text-[11px]">Modelo</Label>
              <Input
                placeholder="Ex.: SG5.0RS"
                value={novoInversor.modelo}
                onChange={(e) => setNovoInversor((i) => ({ ...i, modelo: e.target.value }))}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="w-24">
              <Label className="text-[11px]">Potência (kW)</Label>
              <Input
                type="number"
                step="0.1"
                value={novoInversor.potencia_kw}
                onChange={(e) =>
                  setNovoInversor((i) => ({ ...i, potencia_kw: Number(e.target.value) }))
                }
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="w-36">
              <Label className="text-[11px]">Tipo</Label>
              <select
                value={novoInversor.tipo}
                onChange={(e) =>
                  setNovoInversor((i) => ({
                    ...i,
                    tipo: e.target.value as InversorCatalogo['tipo'],
                  }))
                }
                className="h-8 w-full rounded border border-input bg-white px-2 text-xs"
              >
                {TIPOS_INVERSOR.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!novoInversor.marca || !novoInversor.modelo) return
                onAddInversor(novoInversor)
                setNovoInversor({ marca: '', modelo: '', potencia_kw: 5, tipo: 'Monofásico' })
              }}
              className="h-8 bg-[#0b1f4d] text-white text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#dfe5f0] text-[#8a94a8]">
                <tr>
                  <th className="py-2">Marca</th>
                  <th className="py-2">Modelo</th>
                  <th className="py-2">Tipo</th>
                  <th className="py-2 text-right">Potência</th>
                  <th className="py-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2f8]">
                {inversoresFiltrados.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#f8fafc]">
                    <td className="py-2 font-semibold text-[#0b1f4d]">{inv.marca}</td>
                    <td className="py-2 text-[#3c4a63]">{inv.modelo}</td>
                    <td className="py-2 text-[#8a94a8]">{inv.tipo}</td>
                    <td className="py-2 text-right font-bold text-[#0b1f4d]">
                      {fmt(inv.potencia_kw)} kW
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onExcluirInversor(inv.id)}
                        className="h-6 w-6 p-0 text-[#c0392b] hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {inversoresFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-[#8a94a8]">
                      Nenhum inversor cadastrado ou encontrado pelo filtro
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subAba === 'distribuidoras' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nome da distribuidora (ex: Fortlev Solar, Aldo, PHB...)"
              value={novaDistribuidora}
              onChange={(e) => setNovaDistribuidora(e.target.value)}
              className="h-8 text-xs flex-1 max-w-sm"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!novaDistribuidora.trim()) return
                onAddDistribuidora(novaDistribuidora.trim())
                setNovaDistribuidora('')
              }}
              className="h-8 bg-[#0b1f4d] text-white text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar Distribuidora
            </Button>
          </div>

          <div className="divide-y divide-[#eef2f8] rounded-[10px] border border-[#dfe5f0] bg-white">
            {distribuidoras.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between p-2.5 text-xs hover:bg-[#f8fafc]"
              >
                <span className="font-semibold text-[#0b1f4d]">{d.nome}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onExcluirDistribuidora(d.id)}
                  className="h-6 w-6 p-0 text-[#c0392b] hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {distribuidoras.length === 0 && (
              <p className="p-4 text-center text-xs text-[#8a94a8]">
                Nenhuma distribuidora cadastrada
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- ABA KITS SALVOS ----------

export function AbaKitsSalvos({
  kits,
  onEditar,
  onExcluir,
  carregando: _carregando,
}: {
  kits: KitGerado[]
  onEditar: (id: string) => void
  onExcluir: (id: string) => void
  carregando: boolean
}) {
  const [busca, setBusca] = useState('')

  const kitsFiltrados = kits.filter((k) => {
    if (!busca.trim()) return true
    const b = busca.toLowerCase()
    return (
      k.nome?.toLowerCase().includes(b) ||
      k.distribuidora?.toLowerCase().includes(b) ||
      String(k.potencia_kwp).includes(b)
    )
  })

  return (
    <div className="rounded-[14px] border border-[#dfe5f0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dfe5f0] pb-3">
        <div>
          <h2 className="font-montserrat text-base font-bold text-[#0b1f4d]">Kits Salvos</h2>
          <p className="text-xs text-[#8a94a8]">
            Kits disponíveis para uso imediato em novas propostas comerciais.
          </p>
        </div>
        <Input
          placeholder="Buscar por nome, distribuidora ou potência..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-8 text-xs max-w-xs"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {kitsFiltrados.map((k) => {
          const paineis = parsePaineisLinhas(k.painel)
          const inversores = parseInversoresLinhas(k.inversor)
          const baterias = parseBateriasJson(k.bateria)
          const outrosPaineis = parseOutrosDados(k.painel)
          const outrosInversores = parseOutrosDados(k.inversor)

          return (
            <div
              key={k.id}
              className="rounded-[10px] border border-[#dfe5f0] bg-[#f8fafc] p-3.5 flex flex-col justify-between hover:border-[#0b1f4d]/40 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-montserrat text-sm font-bold text-[#0b1f4d] leading-snug">
                    {k.nome}
                  </h3>
                  <span className="shrink-0 rounded-full bg-[#f1c40f]/20 px-2 py-0.5 text-xs font-bold text-[#b78103]">
                    {fmt(k.potencia_kwp)} kWp
                  </span>
                </div>

                <div className="text-[11px] text-[#3c4a63] space-y-1">
                  {/* Painéis */}
                  <div>
                    <span className="font-semibold text-[#0b1f4d]">Painéis: </span>
                    {paineis.length > 0 ? (
                      paineis.map((p, idx) => (
                        <span key={idx} className="block pl-2 text-[#5a6a85]">
                          • {p.qtd}× {p.marca} {p.modelo || ''} ({p.potencia_w} W)
                        </span>
                      ))
                    ) : (
                      <span className="text-[#8a94a8]">Não informado</span>
                    )}
                  </div>

                  {/* Inversores */}
                  <div>
                    <span className="font-semibold text-[#0b1f4d]">Inversores: </span>
                    {inversores.length > 0 ? (
                      inversores.map((inv, idx) => (
                        <span key={idx} className="block pl-2 text-[#5a6a85]">
                          • {inv.qtd}× {inv.marca} {inv.modelo || ''} ({fmt(inv.potencia_kw)} kW)
                        </span>
                      ))
                    ) : (
                      <span className="text-[#8a94a8]">Não informado</span>
                    )}
                  </div>

                  {/* Baterias (informativo) */}
                  {baterias.length > 0 && (
                    <div>
                      <span className="font-semibold text-[#0b1f4d]">Baterias: </span>
                      {baterias.map((b, idx) => (
                        <span key={idx} className="block pl-2 text-[#5a6a85]">
                          • {b.qtd}× {b.marca} {b.modelo || ''} ({fmt(b.capacidade_kwh)} kWh
                          {b.tensao ? ` • ${b.tensao}` : ''})
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Outros dados se houver */}
                  {(outrosPaineis || outrosInversores) && (
                    <div className="rounded bg-[#fffbeb] border border-[#fef3c7] p-1.5 text-[10px] text-[#92400e]">
                      {outrosPaineis && <div>Obs painéis: {outrosPaineis}</div>}
                      {outrosInversores && <div>Obs inversores: {outrosInversores}</div>}
                    </div>
                  )}

                  <div className="pt-1 text-[#8a94a8]">
                    Telhado: {k.tipo_instalacao || 'Padrão'}
                    {k.distribuidora ? ` • ${k.distribuidora}` : ''}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#dfe5f0] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#8a94a8] block">Preço Final</span>
                  <span className="font-bold text-xs text-[#0b1f4d]">
                    R$ {(k.preco_final || 0).toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEditar(k.id)}
                    className="h-7 text-xs border-[#0b1f4d] text-[#0b1f4d]"
                  >
                    <FolderOpen className="h-3.5 w-3.5 mr-1" />
                    Abrir no montador
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onExcluir(k.id)}
                    className="h-7 w-7 p-0 text-[#c0392b] hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}

        {kitsFiltrados.length === 0 && (
          <div className="col-span-full py-8 text-center text-xs text-[#8a94a8]">
            Nenhum kit salvo encontrado
          </div>
        )}
      </div>
    </div>
  )
}
