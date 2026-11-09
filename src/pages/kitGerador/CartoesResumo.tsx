// Cartão "Resumo do kit" (direita), aba Catálogo e aba Kits salvos.
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { BarraFiltrosCatalogo, filtrarPaineis, filtrarInversores } from './filtrosCatalogo'
import type { FiltroCatalogo } from './filtrosCatalogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  fmt,
  fmtInt,
  fmtBRL,
  classificarRelacao,
  MENSAGENS_RELACAO,
  type TipoInstalacao,
} from './logica'
import {
  parsePainelJson,
  parseInversorJson,
  type PainelCatalogoRow,
  type InversorCatalogoRow,
  type DistribuidoraRow,
  type KitGerado,
  type ItemListaKit,
} from '@/services/kitGerador'
import type { EstadoForm } from './CartoesForm'
import { TIPOS_INVERSOR } from './logica'

const CORES = {
  azul: '#0b1f4d',
  amarelo: '#ffd23f',
  amareloEscuro: '#f5b800',
  verde: '#11845b',
  vermelho: '#c0392b',
}

// ---------- Cartão RESUMO DO KIT ----------

export interface DadosResumo {
  nome: string
  kwp: number
  linhaPainel: string
  geracaoMensal: number | null
  coberturaPct: number | null
  linhaInversor: string
  kwCa: number
  areaM2: number
  tipoInstalacao: string
  relacao: number | null
  sobrecargaPct: number
  itens: ItemListaKit[]
  distribuidora: string
  custo: number
  precoVenda: number | null
  descontoRs: number
  precoFinal: number | null
  lucro: number
  margemPct: number
}

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
  const cls = dados.relacao !== null ? classificarRelacao(dados.relacao, dados.sobrecargaPct) : null
  const corBarra =
    cls === 'verde' ? CORES.verde : cls === 'vermelho' ? CORES.vermelho : CORES.amareloEscuro
  const pctBarra =
    dados.relacao !== null ? Math.min(100, Math.max(4, (dados.relacao / 2) * 100)) : 0

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#dfe5f0] bg-[#0b1f4d] text-white shadow-lg">
      <div className="h-1 w-full bg-[#ffd23f]" />
      <div className="p-4">
        <p className="font-montserrat text-xs font-bold uppercase tracking-widest text-[#ffd23f]">
          Resumo do kit
        </p>
        <h2 className="mt-1 font-montserrat text-lg font-bold leading-snug">
          {dados.nome.split(' kWp')[0] && dados.kwp > 0 ? (
            <>
              {dados.nome.split(/(\d+,\d+ kWp)/).map((parte, i) =>
                /\d+,\d+ kWp/.test(parte) ? (
                  <span key={i} className="text-[#ffd23f]">
                    {parte}
                  </span>
                ) : (
                  <span key={i}>{parte}</span>
                ),
              )}
            </>
          ) : (
            dados.nome || 'Kit sem nome'
          )}
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-[10px] bg-[#13306b] p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9fb0d8]">Potência</p>
            <p className="font-montserrat text-xl font-bold text-[#ffd23f]">{fmt(dados.kwp)} kWp</p>
            <p className="truncate text-[11px] text-[#c8d4ef]">{dados.linhaPainel}</p>
          </div>
          <div className="rounded-[10px] bg-[#13306b] p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9fb0d8]">Geração</p>
            <p className="font-montserrat text-xl font-bold text-[#ffd23f]">
              {dados.geracaoMensal !== null ? `~${fmtInt(dados.geracaoMensal)} kWh` : '—'}
            </p>
            <p className="truncate text-[11px] text-[#c8d4ef]">
              {dados.coberturaPct !== null
                ? `cobre ${fmtInt(dados.coberturaPct)}% do consumo`
                : 'por mês'}
            </p>
          </div>
          <div className="rounded-[10px] bg-[#13306b] p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9fb0d8]">Inversor</p>
            <p className="font-montserrat text-xl font-bold text-[#ffd23f]">
              {fmt(dados.kwCa)} kW CA
            </p>
            <p className="truncate text-[11px] text-[#c8d4ef]">{dados.linhaInversor}</p>
          </div>
          <div className="rounded-[10px] bg-[#13306b] p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9fb0d8]">Área</p>
            <p className="font-montserrat text-xl font-bold text-[#ffd23f]">
              ~{fmtInt(dados.areaM2)} m²
            </p>
            <p className="truncate text-[11px] text-[#c8d4ef]">{dados.tipoInstalacao}</p>
          </div>
        </div>

        {dados.relacao !== null && cls && (
          <div className="mt-4 rounded-[10px] bg-[#13306b] p-3">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#9fb0d8]">
                Relação painéis ÷ inversor
              </p>
              <p className="font-montserrat text-lg font-bold text-[#ffd23f]">
                {fmt(dados.relacao)}×
                <span className="ml-1 text-xs">
                  ({dados.relacao >= 1 ? '+' : '−'}
                  {fmtInt(Math.abs((dados.relacao - 1) * 100))}%)
                </span>
              </p>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-[#0b1f4d]">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${pctBarra}%`, backgroundColor: corBarra }}
              />
            </div>
            <p className="mt-2 text-[11px] leading-snug text-[#c8d4ef]">{MENSAGENS_RELACAO[cls]}</p>
          </div>
        )}

        <div className="mt-4 rounded-[10px] bg-white p-3 text-[#0b1f4d]">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#8a94a8]">
            Itens incluídos
          </p>
          <ul className="space-y-1">
            {dados.itens.length === 0 && (
              <li className="text-xs text-[#8a94a8]">Nenhum item incluído.</li>
            )}
            {dados.itens.map((item, i) => (
              <li key={i} className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate">{item.nome}</span>
                <span className="shrink-0 font-semibold">{item.qtd}x</span>
              </li>
            ))}
          </ul>
          {dados.distribuidora && (
            <p className="mt-2 border-t border-[#dfe5f0] pt-2 text-xs">
              <span className="text-[#8a94a8]">Distribuidora:</span>{' '}
              <span className="font-semibold">{dados.distribuidora}</span>
            </p>
          )}
          {dados.custo > 0 && dados.precoFinal !== null && (
            <div className="mt-2 space-y-0.5 border-t border-[#dfe5f0] pt-2 text-xs">
              <p className="flex justify-between">
                <span className="text-[#8a94a8]">Custo do kit</span>
                <span>{fmtBRL(dados.custo)}</span>
              </p>
              {dados.descontoRs > 0 && (
                <p className="flex justify-between">
                  <span className="text-[#8a94a8]">Venda</span>
                  <span className={cn(dados.descontoRs > 0 && 'text-[#8a94a8] line-through')}>
                    {fmtBRL(dados.precoVenda ?? 0)}
                  </span>
                </p>
              )}
              {dados.descontoRs > 0 && (
                <p className="flex justify-between font-semibold text-[#11845b]">
                  <span>Desconto</span>
                  <span>− {fmtBRL(dados.descontoRs)}</span>
                </p>
              )}
              <p className="flex justify-between text-base font-bold">
                <span>Preço final</span>
                <span className="text-[#c0392b]">R$ {fmtBRL(dados.precoFinal)}</span>
              </p>
              <p
                className={cn(
                  'flex justify-between font-semibold',
                  dados.lucro >= 0 ? 'text-[#11845b]' : 'text-[#c0392b]',
                )}
              >
                <span>Lucro</span>
                <span>
                  {fmtBRL(dados.lucro)} • {fmt(dados.margemPct, 1)}%
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <Button
            type="button"
            onClick={onSalvar}
            disabled={salvando}
            className="bg-[#ffd23f] font-bold text-[#0b1f4d] hover:bg-[#f5b800]"
          >
            {salvando ? 'Salvando…' : 'Salvar kit'}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCopiar}
              className="border-[#13306b] bg-transparent text-white hover:bg-[#13306b]"
            >
              Copiar texto
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onLimpar}
              className="border-[#13306b] bg-transparent text-white hover:bg-[#13306b]"
            >
              Limpar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- Aba CATÁLOGO ----------

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
  carregando,
}: {
  paineis: PainelCatalogoRow[]
  inversores: InversorCatalogoRow[]
  distribuidoras: DistribuidoraRow[]
  onAddPainel: (p: Omit<PainelCatalogoRow, 'id' | 'origem' | 'ativo'>) => void
  onAddInversor: (i: Omit<InversorCatalogoRow, 'id' | 'origem' | 'ativo'>) => void
  onAddDistribuidora: (nome: string) => void
  onExcluirPainel: (id: string) => void
  onExcluirInversor: (id: string) => void
  onExcluirDistribuidora: (id: string) => void
  carregando: boolean
}) {
  const [novoPainel, setNovoPainel] = useState({ marca: '', modelo: '', potenciaW: '', areaM2: '' })
  const [novoInversor, setNovoInversor] = useState({
    marca: '',
    modelo: '',
    potenciaKw: '',
    tipo: 'Monofásico',
  })
  const [novaDistribuidora, setNovaDistribuidora] = useState('')
  const [excluir, setExcluir] = useState<{
    tipo: 'painel' | 'inversor' | 'distribuidora'
    id: string
    nome: string
  } | null>(null)
  const [filtroPainel, setFiltroPainel] = useState<FiltroCatalogo>({ marca: '', potencia: '' })
  const [filtroInversor, setFiltroInversor] = useState<FiltroCatalogo>({ marca: '', potencia: '' })
  const [mostrarPaineis, setMostrarPaineis] = useState(true)
  const [mostrarInversores, setMostrarInversores] = useState(true)

  const paineisFiltrados = filtrarPaineis(paineis, filtroPainel)
  const inversoresFiltrados = filtrarInversores(inversores, filtroInversor)

  const addPainel = () => {
    if (!novoPainel.marca.trim() || !novoPainel.modelo.trim()) return
    const potenciaW = parseFloat(novoPainel.potenciaW.replace(',', '.')) || 0
    const areaM2 = parseFloat(novoPainel.areaM2.replace(',', '.')) || 2.7
    onAddPainel({
      marca: novoPainel.marca.trim(),
      modelo: novoPainel.modelo.trim(),
      potencia_w: potenciaW,
      area_m2: areaM2,
    })
    setNovoPainel({ marca: '', modelo: '', potenciaW: '', areaM2: '' })
  }

  const addInversor = () => {
    if (!novoInversor.marca.trim() || !novoInversor.modelo.trim()) return
    const potenciaKw = parseFloat(novoInversor.potenciaKw.replace(',', '.')) || 0
    onAddInversor({
      marca: novoInversor.marca.trim(),
      modelo: novoInversor.modelo.trim(),
      potencia_kw: potenciaKw,
      tipo: novoInversor.tipo as (typeof TIPOS_INVERSOR)[number],
    })
    setNovoInversor({ marca: '', modelo: '', potenciaKw: '', tipo: 'Monofásico' })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[14px] border border-[#dfe5f0] bg-white p-4">
        <button
          type="button"
          onClick={() => setMostrarPaineis((v) => !v)}
          className="mb-3 flex w-full items-center justify-between rounded-[10px] border border-[#dfe5f0] px-3 py-2 text-left transition-colors hover:border-[#0b1f4d] hover:bg-[#eef2f8]"
          aria-expanded={mostrarPaineis}
        >
          <span className="font-montserrat text-sm font-bold uppercase text-[#0b1f4d]">
            Painéis disponíveis
          </span>
          <span className="flex items-center gap-2">
            <span className="rounded-full bg-[#eef2f8] px-2 py-0.5 text-[11px] font-semibold text-[#8a94a8]">
              {paineis.length} {paineis.length === 1 ? 'item' : 'itens'}
            </span>
            {mostrarPaineis ? (
              <ChevronUp className="h-4 w-4 text-[#0b1f4d]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#0b1f4d]" />
            )}
          </span>
        </button>
        {mostrarPaineis && (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Input
                placeholder="Marca"
                value={novoPainel.marca}
                onChange={(e) => setNovoPainel({ ...novoPainel, marca: e.target.value })}
              />
              <Input
                placeholder="Modelo"
                value={novoPainel.modelo}
                onChange={(e) => setNovoPainel({ ...novoPainel, modelo: e.target.value })}
              />
              <Input
                placeholder="Potência W"
                inputMode="decimal"
                value={novoPainel.potenciaW}
                onChange={(e) => setNovoPainel({ ...novoPainel, potenciaW: e.target.value })}
              />
              <Input
                placeholder="Área m²"
                inputMode="decimal"
                value={novoPainel.areaM2}
                onChange={(e) => setNovoPainel({ ...novoPainel, areaM2: e.target.value })}
              />
              <Button
                onClick={addPainel}
                disabled={carregando}
                className="bg-[#ffd23f] font-bold text-[#0b1f4d] hover:bg-[#f5b800]"
              >
                + Adicionar painel
              </Button>
            </div>
            <BarraFiltrosCatalogo
              filtro={filtroPainel}
              onChange={setFiltroPainel}
              unidade="W"
              exemploPotencia="615"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#dfe5f0] text-left text-xs uppercase text-[#8a94a8]">
                    <th className="py-2 pr-2">Marca</th>
                    <th className="py-2 pr-2">Modelo</th>
                    <th className="py-2 pr-2">Potência</th>
                    <th className="py-2 pr-2">Área</th>
                    <th className="py-2 pr-2">Origem</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {paineisFiltrados.map((p) => (
                    <tr key={p.id} className="border-b border-[#eef2f8]">
                      <td className="py-2 pr-2 font-semibold text-[#0b1f4d]">{p.marca}</td>
                      <td className="py-2 pr-2 text-[#3c4a63]">{p.modelo}</td>
                      <td className="py-2 pr-2">{fmtInt(p.potencia_w)} W</td>
                      <td className="py-2 pr-2">{fmt(p.area_m2)} m²</td>
                      <td className="py-2 pr-2">
                        {p.origem === 'inicial' ? (
                          <span className="rounded-full bg-[#eef2f8] px-2 py-0.5 text-[11px] text-[#8a94a8]">
                            das suas propostas
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#fff9e0] px-2 py-0.5 text-[11px] font-semibold text-[#8a6d1a]">
                            cadastrado
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExcluir({ tipo: 'painel', id: p.id, nome: `${p.marca} ${p.modelo}` })
                          }
                          className="text-[#c0392b]"
                        >
                          Excluir
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {paineisFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-3 text-center text-xs text-[#8a94a8]">
                        {paineis.length === 0
                          ? 'Nenhum painel no catálogo.'
                          : 'Nenhum painel corresponde aos filtros.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="rounded-[14px] border border-[#dfe5f0] bg-white p-4">
        <button
          type="button"
          onClick={() => setMostrarInversores((v) => !v)}
          className="mb-3 flex w-full items-center justify-between rounded-[10px] border border-[#dfe5f0] px-3 py-2 text-left transition-colors hover:border-[#0b1f4d] hover:bg-[#eef2f8]"
          aria-expanded={mostrarInversores}
        >
          <span className="font-montserrat text-sm font-bold uppercase text-[#0b1f4d]">
            Inversores disponíveis
          </span>
          <span className="flex items-center gap-2">
            <span className="rounded-full bg-[#eef2f8] px-2 py-0.5 text-[11px] font-semibold text-[#8a94a8]">
              {inversores.length} {inversores.length === 1 ? 'item' : 'itens'}
            </span>
            {mostrarInversores ? (
              <ChevronUp className="h-4 w-4 text-[#0b1f4d]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#0b1f4d]" />
            )}
          </span>
        </button>
        {mostrarInversores && (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Input
                placeholder="Marca"
                value={novoInversor.marca}
                onChange={(e) => setNovoInversor({ ...novoInversor, marca: e.target.value })}
              />
              <Input
                placeholder="Modelo"
                value={novoInversor.modelo}
                onChange={(e) => setNovoInversor({ ...novoInversor, modelo: e.target.value })}
              />
              <Input
                placeholder="Potência kW"
                inputMode="decimal"
                value={novoInversor.potenciaKw}
                onChange={(e) => setNovoInversor({ ...novoInversor, potenciaKw: e.target.value })}
              />
              <select
                value={novoInversor.tipo}
                onChange={(e) => setNovoInversor({ ...novoInversor, tipo: e.target.value })}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                {TIPOS_INVERSOR.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Button
                onClick={addInversor}
                disabled={carregando}
                className="bg-[#ffd23f] font-bold text-[#0b1f4d] hover:bg-[#f5b800]"
              >
                + Adicionar inversor
              </Button>
            </div>
            <BarraFiltrosCatalogo
              filtro={filtroInversor}
              onChange={setFiltroInversor}
              unidade="kW"
              exemploPotencia="8,5"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#dfe5f0] text-left text-xs uppercase text-[#8a94a8]">
                    <th className="py-2 pr-2">Marca</th>
                    <th className="py-2 pr-2">Modelo</th>
                    <th className="py-2 pr-2">Potência</th>
                    <th className="py-2 pr-2">Tipo</th>
                    <th className="py-2 pr-2">Origem</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {inversoresFiltrados.map((i) => (
                    <tr key={i.id} className="border-b border-[#eef2f8]">
                      <td className="py-2 pr-2 font-semibold text-[#0b1f4d]">{i.marca}</td>
                      <td className="py-2 pr-2 text-[#3c4a63]">{i.modelo}</td>
                      <td className="py-2 pr-2">{fmt(i.potencia_kw)} kW</td>
                      <td className="py-2 pr-2 text-[#3c4a63]">{i.tipo}</td>
                      <td className="py-2 pr-2">
                        {i.origem === 'inicial' ? (
                          <span className="rounded-full bg-[#eef2f8] px-2 py-0.5 text-[11px] text-[#8a94a8]">
                            das suas propostas
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#fff9e0] px-2 py-0.5 text-[11px] font-semibold text-[#8a6d1a]">
                            cadastrado
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExcluir({
                              tipo: 'inversor',
                              id: i.id,
                              nome: `${i.marca} ${i.modelo}`,
                            })
                          }
                          className="text-[#c0392b]"
                        >
                          Excluir
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {inversoresFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-3 text-center text-xs text-[#8a94a8]">
                        {inversores.length === 0
                          ? 'Nenhum inversor no catálogo.'
                          : 'Nenhum inversor corresponde aos filtros.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="rounded-[14px] border border-[#dfe5f0] bg-white p-4">
        <h3 className="mb-3 font-montserrat text-sm font-bold uppercase text-[#0b1f4d]">
          Distribuidoras
        </h3>
        <div className="mb-3 flex gap-2">
          <Input
            placeholder="Nome da distribuidora"
            value={novaDistribuidora}
            onChange={(e) => setNovaDistribuidora(e.target.value)}
          />
          <Button
            onClick={() => {
              if (!novaDistribuidora.trim()) return
              onAddDistribuidora(novaDistribuidora.trim())
              setNovaDistribuidora('')
            }}
            disabled={carregando}
            className="shrink-0 bg-[#ffd23f] font-bold text-[#0b1f4d] hover:bg-[#f5b800]"
          >
            + Adicionar
          </Button>
        </div>
        <ul className="divide-y divide-[#eef2f8]">
          {distribuidoras.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2 text-sm">
              <span className="font-semibold text-[#0b1f4d]">{d.nome}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExcluir({ tipo: 'distribuidora', id: d.id, nome: d.nome })}
                className="text-[#c0392b]"
              >
                Excluir
              </Button>
            </li>
          ))}
          {distribuidoras.length === 0 && (
            <li className="py-2 text-xs text-[#8a94a8]">Nenhuma distribuidora cadastrada.</li>
          )}
        </ul>
      </div>

      <Dialog open={!!excluir} onOpenChange={(aberto) => !aberto && setExcluir(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir {excluir?.nome}?</DialogTitle>
            <DialogDescription>
              O item será apenas desativado — continua nos kits antigos, mas some das listas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluir(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#c0392b] text-white hover:bg-[#a93226]"
              onClick={() => {
                if (!excluir) return
                if (excluir.tipo === 'painel') onExcluirPainel(excluir.id)
                else if (excluir.tipo === 'inversor') onExcluirInversor(excluir.id)
                else onExcluirDistribuidora(excluir.id)
                setExcluir(null)
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- Aba KITS SALVOS ----------

export function AbaKitsSalvos({
  kits,
  onAbrir,
  onExcluir,
  carregando,
}: {
  kits: KitGerado[]
  onAbrir: (id: string) => void
  onExcluir: (id: string) => void
  carregando: boolean
}) {
  const [busca, setBusca] = useState('')
  const [filtroDistribuidora, setFiltroDistribuidora] = useState('')

  const kitsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return kits.filter((k) => {
      const painelJson = parsePainelJson(k.painel)
      const inversorJson = parseInversorJson(k.inversor)
      const okBusca =
        !termo ||
        k.nome.toLowerCase().includes(termo) ||
        (painelJson?.marca || '').toLowerCase().includes(termo) ||
        (inversorJson?.marca || '').toLowerCase().includes(termo)
      const okDist = !filtroDistribuidora || k.distribuidora === filtroDistribuidora
      return okBusca && okDist
    })
  }, [kits, busca, filtroDistribuidora])

  const distribuidorasUnicas = [...new Set(kits.map((k) => k.distribuidora).filter(Boolean))]

  return (
    <div className="rounded-[14px] border border-[#dfe5f0] bg-white p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Buscar por nome, painel, inversor…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          value={filtroDistribuidora}
          onChange={(e) => setFiltroDistribuidora(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Todas as distribuidoras</option>
          {distribuidorasUnicas.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#dfe5f0] text-left text-xs uppercase text-[#8a94a8]">
              <th className="py-2 pr-2">Kit</th>
              <th className="py-2 pr-2">kWp</th>
              <th className="py-2 pr-2">Painéis</th>
              <th className="py-2 pr-2">Inversor</th>
              <th className="py-2 pr-2">Instalação</th>
              <th className="py-2 pr-2">Distribuidora</th>
              <th className="py-2 pr-2">Preço final</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {kitsFiltrados.map((k) => (
              <tr key={k.id} className="border-b border-[#eef2f8]">
                <td className="py-2 pr-2">
                  <p className="font-semibold text-[#0b1f4d]">{k.nome}</p>
                  <p className="text-[11px] text-[#8a94a8]">
                    {new Date(k.created || '').toLocaleDateString('pt-BR')}
                  </p>
                </td>
                <td className="py-2 pr-2">{fmt(k.potencia_kwp)}</td>
                <td className="py-2 pr-2">
                  {(() => {
                    const p = parsePainelJson(k.painel)
                    return p ? `${p.qtd}× ${p.marca} ${fmtInt(p.potencia_w)} W` : '—'
                  })()}
                </td>
                <td className="py-2 pr-2">
                  {(() => {
                    const inv = parseInversorJson(k.inversor)
                    return inv ? `${inv.qtd}× ${inv.marca} ${fmt(inv.potencia_kw)} kW` : '—'
                  })()}
                </td>
                <td className="py-2 pr-2 text-[#3c4a63]">{k.tipo_instalacao}</td>
                <td className="py-2 pr-2 text-[#3c4a63]">{k.distribuidora || '—'}</td>
                <td className="py-2 pr-2 font-semibold text-[#0b1f4d]">{fmtBRL(k.preco_final)}</td>
                <td className="py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={carregando}
                      onClick={() => onAbrir(k.id)}
                      className="border-[#dfe5f0] text-[#0b1f4d]"
                    >
                      Abrir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={carregando}
                      onClick={() => onExcluir(k.id)}
                      className="text-[#c0392b]"
                      aria-label={`Excluir ${k.nome}`}
                    >
                      ✕
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {kitsFiltrados.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-sm text-[#8a94a8]">
                  {kits.length === 0
                    ? 'Nenhum kit salvo ainda. Monte um e clique em "Salvar kit".'
                    : 'Nenhum kit encontrado com esse filtro.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function LabelResumo({ children }: { children: React.ReactNode }) {
  return <Label className="text-xs font-semibold text-[#3c4a63]">{children}</Label>
}

export type { TipoInstalacao }
