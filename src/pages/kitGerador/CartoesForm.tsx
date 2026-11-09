// Cartões do formulário "Montar kit" — Abas 1 a 5.
import { useEffect, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  LIGACOES,
  TIPOS_INSTALACAO,
  TIPOS_INVERSOR,
  nomeEstrutura,
  fmt,
  fmtInt,
  fmtBRL,
  qtdPaineisSugerida,
  kwpNecessario,
  geracaoPorKwp,
  sugerirInversores,
  kwpDePaineis,
  type Ligacao,
  type TipoInstalacao,
} from './logica'
import type {
  ItemListaKit,
  PainelCatalogoRow,
  InversorCatalogoRow,
  DistribuidoraRow,
} from '@/services/kitGerador'

const OUTRA_MARCA = '__outra_marca__'
const OUTRA_POTENCIA = '__outra_potencia__'

export interface PainelSelecao {
  modoLista: boolean
  id: string
  marca: string
  modelo: string
  potenciaW: number
  areaM2: number
}

export interface InversorSelecao {
  modoLista: boolean
  id: string
  marca: string
  modelo: string
  potenciaKw: number
  tipo: string
}

export interface EstadoForm {
  consumo: string
  sol: string
  perdas: string
  ligacao: Ligacao | ''
  painel: PainelSelecao
  qtdPaineis: number
  inversor: InversorSelecao
  qtdInversores: number
  sobrecarga: string
  tipoInstalacao: TipoInstalacao
  nomeKit: string
  nomeTravado: boolean
  itens: ItemListaKit[]
  distribuidora: string
  distribuidoraNova: string
  custo: string
  acrescimoPct: string
  descontoValor: string
  descontoTipo: '%' | 'R$'
}

export function estadoInicial(paineis: PainelCatalogoRow[]): EstadoForm {
  const painelBase =
    paineis.find((p) => p.marca === 'Astronergy' && p.potencia_w === 615) || paineis[0] || null
  return {
    consumo: '',
    sol: '4,6',
    perdas: '20',
    ligacao: '',
    painel: painelBase
      ? {
          modoLista: true,
          id: painelBase.id,
          marca: painelBase.marca,
          modelo: painelBase.modelo,
          potenciaW: painelBase.potencia_w,
          areaM2: painelBase.area_m2,
        }
      : { modoLista: true, id: '', marca: '', modelo: '', potenciaW: 615, areaM2: 2.79 },
    qtdPaineis: 14,
    inversor: { modoLista: true, id: '', marca: '', modelo: '', potenciaKw: 0, tipo: 'Monofásico' },
    qtdInversores: 1,
    sobrecarga: '50',
    tipoInstalacao: 'Fibrocimento',
    nomeKit: '',
    nomeTravado: false,
    itens: [],
    distribuidora: '',
    distribuidoraNova: '',
    custo: '',
    acrescimoPct: '41',
    descontoValor: '0',
    descontoTipo: '%',
  }
}

// ---------- pequenos blocos compartilhados ----------

export function CardNumero({
  numero,
  titulo,
  children,
}: {
  numero: number
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[14px] border border-[#dfe5f0] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b1f4d] text-sm font-bold text-[#ffd23f]">
          {numero}
        </span>
        <h2 className="font-montserrat text-sm font-bold uppercase tracking-wide text-[#0b1f4d]">
          {titulo}
        </h2>
      </div>
      {children}
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-[#3c4a63]">{label}</Label>
      {children}
    </div>
  )
}

function InputNum({
  value,
  onChange,
  placeholder,
  suffix,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  suffix?: string
}) {
  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a94a8]">
          {suffix}
        </span>
      )}
    </div>
  )
}

// Campo editável do meio do stepper: clica e digita o número pelo teclado.
// Aceita só dígitos; aplica no blur/Enter; vazio ou inválido restaura o valor anterior.
function QtdInput({ qtd, setQtd, min }: { qtd: number; setQtd: (n: number) => void; min: number }) {
  const [texto, setTexto] = useState(String(qtd))
  const [editando, setEditando] = useState(false)

  useEffect(() => {
    if (!editando) setTexto(String(qtd))
  }, [qtd, editando])

  const aplicar = () => {
    setEditando(false)
    const n = parseInt(texto, 10)
    if (!Number.isFinite(n) || n < min) {
      setTexto(String(qtd))
      return
    }
    setTexto(String(n))
    setQtd(n)
  }

  return (
    <Input
      inputMode="numeric"
      value={editando ? texto : String(qtd)}
      onFocus={() => {
        setTexto(String(qtd))
        setEditando(true)
      }}
      onChange={(e) => {
        const digitos = e.target.value.replace(/\D/g, '')
        setTexto(digitos)
      }}
      onBlur={aplicar}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          ;(e.target as HTMLInputElement).blur()
        } else if (e.key === 'Escape') {
          setTexto(String(qtd))
          setEditando(false)
          ;(e.target as HTMLInputElement).blur()
        }
      }}
      className="h-9 w-10 rounded-md border border-transparent bg-transparent px-1 text-center font-montserrat text-base font-bold text-[#0b1f4d] shadow-none hover:border-[#dfe5f0] focus-visible:border-[#dfe5f0] focus-visible:ring-0"
      aria-label="Quantidade (digite para editar)"
    />
  )
}

function QtdStepper({
  qtd,
  setQtd,
  min = 1,
}: {
  qtd: number
  setQtd: (n: number) => void
  min?: number
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setQtd(Math.max(min, qtd - 1))}
        className="h-9 w-9 rounded-full border-[#dfe5f0] text-[#0b1f4d]"
        aria-label="Diminuir quantidade"
      >
        −
      </Button>
      <QtdInput qtd={qtd} setQtd={setQtd} min={min} />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setQtd(qtd + 1)}
        className="h-9 w-9 rounded-full border-[#dfe5f0] text-[#0b1f4d]"
        aria-label="Aumentar quantidade"
      >
        +
      </Button>
    </div>
  )
}

// ---------- Cartão 1 — para quem é o kit ----------

export function CartaoPerfil({
  form,
  set,
  potenciaW,
}: {
  form: EstadoForm
  set: (p: Partial<EstadoForm>) => void
  potenciaW: number
}) {
  const sol = parseFloat(form.sol.replace(',', '.')) || 0
  const perdas = parseFloat(form.perdas.replace(',', '.')) || 0
  const consumo = parseFloat(form.consumo.replace(',', '.')) || 0
  const geracao = geracaoPorKwp(sol, perdas)
  const kwpNec = kwpNecessario(consumo, geracao)
  const qtdSug = qtdPaineisSugerida(kwpNec, potenciaW)
  const kwpSug = kwpDePaineis(qtdSug, potenciaW)

  return (
    <CardNumero numero={1} titulo="Para quem é o kit">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo label="Consumo médio (kWh/mês)">
          <InputNum
            value={form.consumo}
            onChange={(v) => set({ consumo: v })}
            placeholder="Ex.: 1000"
          />
        </Campo>
        <Campo label="Sol pleno (h/dia)">
          <InputNum value={form.sol} onChange={(v) => set({ sol: v })} suffix="h" />
        </Campo>
        <Campo label="Perdas (%)">
          <InputNum value={form.perdas} onChange={(v) => set({ perdas: v })} suffix="%" />
        </Campo>
        <Campo label="Ligação">
          <Select
            value={form.ligacao || undefined}
            onValueChange={(v) => set({ ligacao: v as Ligacao })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent>
              {LIGACOES.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
      </div>
      {consumo > 0 && geracao > 0 && qtdSug > 0 && potenciaW > 0 && (
        <p className="mt-3 text-sm text-[#3c4a63]">
          Para {fmtInt(consumo)} kWh/mês você precisa de {fmt(kwpNec)} kWp →{' '}
          <button
            type="button"
            onClick={() => set({ qtdPaineis: qtdSug })}
            className="mt-1 inline-block rounded-full bg-[#ffd23f] px-3 py-1 text-xs font-bold text-[#0b1f4d] hover:bg-[#f5b800]"
          >
            usar {qtdSug} painéis de {fmtInt(potenciaW)} W ({fmt(kwpSug)} kWp)
          </button>
        </p>
      )}
    </CardNumero>
  )
}

// ---------- seleção painel/inversor com manual ----------

export function SelecaoPainel({
  paineis,
  form,
  set,
  onGravar,
  onVoltar,
  gravando,
}: {
  paineis: PainelCatalogoRow[]
  form: EstadoForm
  set: (p: Partial<EstadoForm>) => void
  onGravar: () => void
  onVoltar: () => void
  gravando: boolean
}) {
  const marcas = [...new Set(paineis.map((p) => p.marca))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  )
  const modelosDaMarca = paineis
    .filter((p) => p.marca === form.painel.marca)
    .sort((a, b) => b.potencia_w - a.potencia_w)
  const manual = !form.painel.modoLista

  const valorMarca = form.painel.modoLista ? form.painel.marca || undefined : OUTRA_MARCA
  const valorModelo =
    form.painel.modoLista && form.painel.id ? form.painel.id : manual ? OUTRA_POTENCIA : undefined

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-[#3c4a63]">Digitar manualmente</Label>
        <Switch
          checked={manual}
          onCheckedChange={(c) =>
            set({
              painel: c
                ? { ...form.painel, modoLista: false }
                : { modoLista: true, id: '', marca: '', modelo: '', potenciaW: 0, areaM2: 2.79 },
            })
          }
        />
      </div>

      {!manual && (
        <>
          <Campo label="Marca">
            <Select
              value={valorMarca}
              onValueChange={(v) => {
                if (v === OUTRA_MARCA) {
                  set({
                    painel: {
                      modoLista: false,
                      id: '',
                      marca: '',
                      modelo: '',
                      potenciaW: 0,
                      areaM2: 2.79,
                    },
                  })
                  return
                }
                const primeiro = paineis
                  .filter((p) => p.marca === v)
                  .sort((a, b) => b.potencia_w - a.potencia_w)[0]
                if (primeiro)
                  set({
                    painel: {
                      modoLista: true,
                      id: primeiro.id,
                      marca: primeiro.marca,
                      modelo: primeiro.modelo,
                      potenciaW: primeiro.potencia_w,
                      areaM2: primeiro.area_m2,
                    },
                  })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a marca…" />
              </SelectTrigger>
              <SelectContent>
                {marcas.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
                <SelectItem value={OUTRA_MARCA}>✎ Outra marca (digitar)…</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Modelo / potência">
            <Select
              value={valorModelo}
              onValueChange={(v) => {
                if (v === OUTRA_POTENCIA) {
                  set({ painel: { ...form.painel, modoLista: false } })
                  return
                }
                const escolhido = paineis.find((p) => p.id === v)
                if (escolhido)
                  set({
                    painel: {
                      modoLista: true,
                      id: escolhido.id,
                      marca: escolhido.marca,
                      modelo: escolhido.modelo,
                      potenciaW: escolhido.potencia_w,
                      areaM2: escolhido.area_m2,
                    },
                  })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o modelo…" />
              </SelectTrigger>
              <SelectContent>
                {modelosDaMarca.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {fmtInt(p.potencia_w)} W — {p.modelo}
                  </SelectItem>
                ))}
                <SelectItem value={OUTRA_POTENCIA} disabled={!form.painel.marca}>
                  ✎ Outra potência (digitar)…
                </SelectItem>
              </SelectContent>
            </Select>
          </Campo>
        </>
      )}

      {manual && (
        <div className="space-y-3 rounded-[14px] border-2 border-dashed border-[#f5b800] bg-[#fff9e0] p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo label="Marca">
              <Input
                value={form.painel.marca}
                onChange={(e) => set({ painel: { ...form.painel, marca: e.target.value } })}
                placeholder="Ex.: Astronergy"
              />
            </Campo>
            <Campo label="Modelo">
              <Input
                value={form.painel.modelo}
                onChange={(e) => set({ painel: { ...form.painel, modelo: e.target.value } })}
                placeholder="Ex.: Mono 615 W"
              />
            </Campo>
            <Campo label="Potência (W)">
              <InputNum
                value={form.painel.potenciaW ? String(form.painel.potenciaW) : ''}
                onChange={(v) =>
                  set({
                    painel: { ...form.painel, potenciaW: parseFloat(v.replace(',', '.')) || 0 },
                  })
                }
                suffix="W"
              />
            </Campo>
            <Campo label="Área por painel (m²)">
              <InputNum
                value={form.painel.areaM2 ? String(form.painel.areaM2).replace('.', ',') : ''}
                onChange={(v) =>
                  set({ painel: { ...form.painel, areaM2: parseFloat(v.replace(',', '.')) || 0 } })
                }
                suffix="m²"
              />
            </Campo>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={onGravar}
              disabled={gravando}
              className="bg-[#ffd23f] font-bold text-[#0b1f4d] hover:bg-[#f5b800]"
            >
              💾 Gravar no catálogo
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onVoltar}
              className="border-[#dfe5f0] text-[#0b1f4d]"
            >
              ← Voltar para a lista
            </Button>
          </div>
          <p className="text-xs text-[#8a94a8]">
            Gravado, aparece na lista nos próximos kits. Ao salvar o kit, ele grava sozinho.
          </p>
        </div>
      )}
    </div>
  )
}

export function SelecaoInversor({
  inversores,
  form,
  set,
  onGravar,
  onVoltar,
  gravando,
}: {
  inversores: InversorCatalogoRow[]
  form: EstadoForm
  set: (p: Partial<EstadoForm>) => void
  onGravar: () => void
  onVoltar: () => void
  gravando: boolean
}) {
  const marcas = [...new Set(inversores.map((i) => i.marca))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  )
  const modelosDaMarca = inversores
    .filter((i) => i.marca === form.inversor.marca)
    .sort((a, b) => a.potencia_kw - b.potencia_kw)
  const manual = !form.inversor.modoLista

  const valorMarca = form.inversor.modoLista ? form.inversor.marca || undefined : OUTRA_MARCA
  const valorModelo =
    form.inversor.modoLista && form.inversor.id
      ? form.inversor.id
      : manual
        ? OUTRA_POTENCIA
        : undefined

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-[#3c4a63]">Digitar manualmente</Label>
        <Switch
          checked={manual}
          onCheckedChange={(c) =>
            set({
              inversor: c
                ? { ...form.inversor, modoLista: false }
                : {
                    modoLista: true,
                    id: '',
                    marca: '',
                    modelo: '',
                    potenciaKw: 0,
                    tipo: 'Monofásico',
                  },
            })
          }
        />
      </div>

      {!manual && (
        <>
          <Campo label="Marca">
            <Select
              value={valorMarca}
              onValueChange={(v) => {
                if (v === OUTRA_MARCA) {
                  set({
                    inversor: {
                      modoLista: false,
                      id: '',
                      marca: '',
                      modelo: '',
                      potenciaKw: 0,
                      tipo: 'Monofásico',
                    },
                  })
                  return
                }
                const primeiro = inversores
                  .filter((i) => i.marca === v)
                  .sort((a, b) => a.potencia_kw - b.potencia_kw)[0]
                if (primeiro)
                  set({
                    inversor: {
                      modoLista: true,
                      id: primeiro.id,
                      marca: primeiro.marca,
                      modelo: primeiro.modelo,
                      potenciaKw: primeiro.potencia_kw,
                      tipo: primeiro.tipo,
                    },
                  })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a marca…" />
              </SelectTrigger>
              <SelectContent>
                {marcas.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
                <SelectItem value={OUTRA_MARCA}>✎ Outra marca (digitar)…</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Modelo / potência">
            <Select
              value={valorModelo}
              onValueChange={(v) => {
                if (v === OUTRA_POTENCIA) {
                  set({ inversor: { ...form.inversor, modoLista: false } })
                  return
                }
                const escolhido = inversores.find((i) => i.id === v)
                if (escolhido)
                  set({
                    inversor: {
                      modoLista: true,
                      id: escolhido.id,
                      marca: escolhido.marca,
                      modelo: escolhido.modelo,
                      potenciaKw: escolhido.potencia_kw,
                      tipo: escolhido.tipo,
                    },
                  })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o modelo…" />
              </SelectTrigger>
              <SelectContent>
                {modelosDaMarca.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {fmt(i.potencia_kw)} kW — {i.modelo} ({i.tipo})
                  </SelectItem>
                ))}
                <SelectItem value={OUTRA_POTENCIA} disabled={!form.inversor.marca}>
                  ✎ Outra potência (digitar)…
                </SelectItem>
              </SelectContent>
            </Select>
          </Campo>
        </>
      )}

      {manual && (
        <div className="space-y-3 rounded-[14px] border-2 border-dashed border-[#f5b800] bg-[#fff9e0] box p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo label="Marca">
              <Input
                value={form.inversor.marca}
                onChange={(e) => set({ inversor: { ...form.inversor, marca: e.target.value } })}
                placeholder="Ex.: HUAWEI"
              />
            </Campo>
            <Campo label="Modelo">
              <Input
                value={form.inversor.modelo}
                onChange={(e) => set({ inversor: { ...form.inversor, modelo: e.target.value } })}
                placeholder="Ex.: SUN2000-6KTL-L1"
              />
            </Campo>
            <Campo label="Potência (kW)">
              <InputNum
                value={
                  form.inversor.potenciaKw ? String(form.inversor.potenciaKw).replace('.', ',') : ''
                }
                onChange={(v) =>
                  set({
                    inversor: {
                      ...form.inversor,
                      potenciaKw: parseFloat(v.replace(',', '.')) || 0,
                    },
                  })
                }
                suffix="kW"
              />
            </Campo>
            <Campo label="Tipo">
              <Select
                value={form.inversor.tipo || undefined}
                onValueChange={(v) => set({ inversor: { ...form.inversor, tipo: v } })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo…" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_INVERSOR.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={onGravar}
              disabled={gravando}
              className="bg-[#ffd23f] font-bold text-[#0b1f4d] hover:bg-[#f5b800]"
            >
              💾 Gravar no catálogo
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onVoltar}
              className="border-[#dfe5f0] text-[#0b1f4d]"
            >
              ← Voltar para a lista
            </Button>
          </div>
          <p className="text-xs text-[#8a94a8]">
            Gravado, aparece na lista nos próximos kits. Ao salvar o kit, ele grava sozinho.
          </p>
        </div>
      )}
    </div>
  )
}

// ---------- Cartão 4 — estrutura e itens ----------

export function CartaoEstrutura({
  form,
  set,
  setItem,
  addItem,
  removeItem,
}: {
  form: EstadoForm
  set: (p: Partial<EstadoForm>) => void
  setItem: (idx: number, p: Partial<ItemListaKit>) => void
  addItem: () => void
  removeItem: (idx: number) => void
}) {
  return (
    <CardNumero numero={4} titulo="Estrutura e demais itens">
      <div className="space-y-4">
        <Campo label="Tipo de instalação">
          <Select
            value={form.tipoInstalacao}
            onValueChange={(v) => set({ tipoInstalacao: v as TipoInstalacao })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_INSTALACAO.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#3c4a63]">Nome do kit</Label>
          <div className="flex items-center gap-2">
            <Input
              value={form.nomeKit}
              onChange={(e) => set({ nomeKit: e.target.value, nomeTravado: true })}
              placeholder="Gerado automaticamente…"
            />
            <div className="flex shrink-0 items-center gap-1.5">
              <Switch
                checked={form.nomeTravado}
                onCheckedChange={(c) => set({ nomeTravado: c })}
                id="travar-nome"
              />
              <Label
                htmlFor="travar-nome"
                className="w-32 text-[11px] leading-tight text-[#8a94a8]"
              >
                Travar o nome (não atualizar sozinho)
              </Label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {form.itens.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Checkbox
                checked={item.incluido}
                onCheckedChange={(c) => setItem(idx, { incluido: !!c })}
                aria-label={`Incluir ${item.nome}`}
              />
              <Input
                value={item.nome}
                onChange={(e) => setItem(idx, { nome: e.target.value })}
                className="flex-1 text-sm"
              />
              <Input
                inputMode="numeric"
                value={String(item.qtd)}
                onChange={(e) =>
                  setItem(idx, { qtd: parseInt(e.target.value.replace(/\D/g, ''), 10) || 1 })
                }
                className="w-16 text-center"
              />
              {!item.padrao && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(idx)}
                  className="h-8 w-8 text-[#c0392b]"
                  aria-label="Remover item"
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addItem}
            className="border-[#dfe5f0] text-[#0b1f4d]"
          >
            + Adicionar item
          </Button>
        </div>
      </div>
    </CardNumero>
  )
}

// ---------- Cartão 5 — distribuidora e preço ----------

export function CartaoPreco({
  form,
  set,
  distribuidoras,
  onGuardarDistribuidora,
  preco,
  descontoRs,
  kwp,
  custo,
}: {
  form: EstadoForm
  set: (p: Partial<EstadoForm>) => void
  distribuidoras: DistribuidoraRow[]
  onGuardarDistribuidora: () => void
  preco: number | null
  descontoRs: number
  kwp: number
  custo: number
}) {
  const SEM_DIST = '__sem__'
  const OUTRA_DIST = '__outra__'
  const valor = form.distribuidora || SEM_DIST

  const descontoPctEquivalente = preco && preco > 0 ? (descontoRs / preco) * 100 : 0

  return (
    <CardNumero numero={5} titulo="Distribuidora e preço">
      <div className="space-y-3">
        <Campo label="Distribuidora (onde comprou)">
          <Select
            value={valor}
            onValueChange={(v) => {
              if (v === SEM_DIST) set({ distribuidora: '', distribuidoraNova: '' })
              else if (v === OUTRA_DIST) set({ distribuidora: '__outra__', distribuidoraNova: '' })
              else set({ distribuidora: v, distribuidoraNova: '' })
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM_DIST}>— sem distribuidora —</SelectItem>
              {distribuidoras.map((d) => (
                <SelectItem key={d.id} value={d.nome}>
                  {d.nome}
                </SelectItem>
              ))}
              <SelectItem value={OUTRA_DIST}>Outra (digitar)…</SelectItem>
            </SelectContent>
          </Select>
        </Campo>

        {form.distribuidora === '__outra__' && (
          <div className="flex gap-2">
            <Input
              value={form.distribuidoraNova}
              onChange={(e) => set({ distribuidoraNova: e.target.value })}
              placeholder="Nome da distribuidora"
            />
            <Button
              type="button"
              variant="outline"
              onClick={onGuardarDistribuidora}
              className="shrink-0 border-[#dfe5f0] text-[#0b1f4d]"
            >
              + Guardar na lista
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label="Custo do kit (R$)">
            <InputNum
              value={form.custo}
              onChange={(v) => set({ custo: v })}
              placeholder="Ex.: 15000"
            />
          </Campo>
          <Campo label="Acréscimo sobre o custo (%)">
            <InputNum
              value={form.acrescimoPct}
              onChange={(v) => set({ acrescimoPct: v })}
              suffix="%"
            />
          </Campo>
        </div>

        <Campo label="Preço de venda (só leitura)">
          <Input
            readOnly
            value={preco !== null ? fmtBRL(preco) : '—'}
            className="bg-[#eef2f8] text-[#3c4a63]"
          />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Desconto">
            <InputNum value={form.descontoValor} onChange={(v) => set({ descontoValor: v })} />
          </Campo>
          <Campo label="Tipo de desconto">
            <Select
              value={form.descontoTipo}
              onValueChange={(v) => set({ descontoTipo: v as '%' | 'R$' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="%">% (porcentagem)</SelectItem>
                <SelectItem value="R$">R$ (valor)</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
        </div>

        <div className="rounded-[14px] bg-[#fff9e0] p-3">
          <p className="text-xs font-semibold uppercase text-[#8a6d1a]">
            Preço final para o cliente
          </p>
          <p className="font-montserrat text-2xl font-bold text-[#0b1f4d]">
            {preco !== null ? fmtBRL(preco - descontoRs) : '—'}
          </p>
          {kwp > 0 && preco !== null && (
            <p className="text-xs text-[#8a6d1a]">
              R$ {fmt((preco - descontoRs) / (kwp * 1000))}/Wp
            </p>
          )}
        </div>

        {preco !== null && custo > 0 && (
          <p className="text-xs text-[#8a94a8]">
            Desconto de {fmtBRL(descontoRs)} ({fmt(descontoPctEquivalente)}%) sobre {fmtBRL(preco)}.
          </p>
        )}
        {preco !== null && custo > 0 && preco - descontoRs < custo && (
          <p className="text-xs font-semibold text-[#c0392b]">
            Com esse desconto você vende abaixo do custo.
          </p>
        )}
        {custo <= 0 && (
          <p className="text-xs text-[#8a94a8]">
            Digite o custo: o preço de venda sai com 41% de acréscimo.
          </p>
        )}
      </div>
    </CardNumero>
  )
}

// ---------- cartão 2/3 auxiliares (quantidade + atalhos) ----------

export function BlocoQuantidadePainel({
  form,
  set,
  calc,
}: {
  form: EstadoForm
  set: (p: Partial<EstadoForm>) => void
  calc: { kwp: number; areaM2: number }
}) {
  const potenciaW = form.painel.potenciaW
  const alvos = [13, 15]
  const qtdAtual = form.qtdPaineis
  const chips = [qtdAtual - 2, qtdAtual - 1, qtdAtual + 1, qtdAtual + 2]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-[#3c4a63]">Quantidade de painéis</Label>
        <QtdStepper qtd={qtdAtual} setQtd={(n) => set({ qtdPaineis: Math.max(1, n) })} />
      </div>

      {potenciaW > 0 && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-[14px] border border-[#dfe5f0] bg-[#eef2f8] p-2">
            <p className="text-[11px] font-semibold uppercase text-[#8a94a8]">Potência total</p>
            <p className="font-montserrat font-bold text-[#0b1f4d]">{fmt(calc.kwp)} kWp</p>
          </div>
          <div className="rounded-[14px] border border-[#dfe5f0] bg-[#eef2f8] p-2">
            <p className="text-[11px] font-semibold uppercase text-[#8a94a8]">Área aproximada</p>
            <p className="font-montserrat font-bold text-[#0b1f4d]">~{fmtInt(calc.areaM2)} m²</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {alvos.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => set({ qtdPaineis: n })}
            className="rounded-full border border-[#dfe5f0] bg-white px-3 py-1 text-xs font-semibold text-[#0b1f4d] hover:bg-[#eef2f8]"
          >
            {n} painéis = {fmt(kwpDePaineis(n, potenciaW))} kWp
          </button>
        ))}
        {chips
          .filter((n) => n >= 1)
          .map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set({ qtdPaineis: n })}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold',
                n === qtdAtual
                  ? 'border-[#ffd23f] bg-[#ffd23f] text-[#0b1f4d]'
                  : 'border-[#dfe5f0] bg-white text-[#3c4a63] hover:bg-[#eef2f8]',
              )}
            >
              {n} painéis = {fmt(kwpDePaineis(n, potenciaW))} kWp
            </button>
          ))}
      </div>
    </div>
  )
}

export function BlocoQuantidadeInversor({
  form,
  set,
  calc,
  inversores,
}: {
  form: EstadoForm
  set: (p: Partial<EstadoForm>) => void
  calc: { kwp: number }
  inversores: InversorCatalogoRow[]
}) {
  const sobrecarga = parseFloat(form.sobrecarga.replace(',', '.')) || 0
  const sugestoes = sugerirInversores(
    inversores,
    calc.kwp,
    (form.ligacao || null) as Ligacao | null,
    sobrecarga,
  )
  const kwCa = form.inversor.potenciaKw * form.qtdInversores

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-[#3c4a63]">Quantidade de inversores</Label>
        <QtdStepper
          qtd={form.qtdInversores}
          setQtd={(n) => set({ qtdInversores: Math.max(1, n) })}
        />
      </div>

      {kwCa > 0 && (
        <p className="text-sm text-[#3c4a63]">
          Potência CA total: <span className="font-bold text-[#0b1f4d]">{fmt(kwCa)} kW</span>
        </p>
      )}

      <Campo label="Sobrecarga máx. aceita (%)">
        <InputNum value={form.sobrecarga} onChange={(v) => set({ sobrecarga: v })} suffix="%" />
      </Campo>

      {sugestoes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-[#3c4a63]">Combinações que servem:</p>
          {sugestoes.map((s, i) => (
            <button
              key={`${s.id}-${s.qtd}`}
              type="button"
              onClick={() =>
                set({
                  inversor: {
                    modoLista: true,
                    id: s.id,
                    marca: s.marca,
                    modelo: s.modelo,
                    potenciaKw: s.potenciaKw,
                    tipo: s.tipo,
                  },
                  qtdInversores: s.qtd,
                })
              }
              className={cn(
                'w-full rounded-[14px] border px-3 py-2 text-left text-sm',
                i === 0
                  ? 'border-[#ffd23f] bg-[#fff9e0] font-bold text-[#0b1f4d]'
                  : 'border-[#dfe5f0] bg-white text-[#3c4a63] hover:bg-[#eef2f8]',
              )}
            >
              {s.qtd > 1 ? `${s.qtd}× ` : ''}
              {s.marca} {fmt(s.potenciaKw)} kW — {fmt(s.relacao)}×
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
