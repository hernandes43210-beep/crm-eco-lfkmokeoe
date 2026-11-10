// Componentes e cartões do formulário do Kit Gerador
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { TIPOS_INSTALACAO, LIGACOES, type TipoInstalacao, type Ligacao } from './logica'
import { ROTULO_INSTALACAO } from './itensPadrao'
import { InputNum } from './formControles'
import type { EstadoForm } from './formTipos'
import type { EstadoCalculo } from './kitCalculos'
import type { DistribuidoraRow } from '@/services/kitGerador'

export function CardNumero({
  numero,
  num,
  titulo,
  subtitulo,
  children,
}: {
  numero?: number
  num?: number
  titulo?: string
  subtitulo?: string
  children?: React.ReactNode
}) {
  const n = numero ?? num ?? 1
  if (!titulo && !children) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0b1f4d] font-montserrat text-xs font-bold text-white">
        {n}
      </span>
    )
  }
  return (
    <div className="rounded-[12px] border border-[#dfe5f0] bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-start gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0b1f4d] font-montserrat text-xs font-bold text-white">
          {n}
        </span>
        <div>
          {titulo && <h2 className="text-sm font-bold text-[#0b1f4d]">{titulo}</h2>}
          {subtitulo && <p className="text-[11px] text-[#8a94a8]">{subtitulo}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

export function BlocoQuantidadePainel({ qtdTotal, kwp }: { qtdTotal: number; kwp: number }) {
  return (
    <div className="flex items-center justify-between text-xs text-[#3c4a63]">
      <span>
        Total de módulos: <strong>{qtdTotal} un</strong>
      </span>
      <span>
        Potência total: <strong>{kwp.toFixed(2)} kWp</strong>
      </span>
    </div>
  )
}

export function BlocoQuantidadeInversor({
  qtdTotal,
  kwCa,
  relacao,
  relacaoTipo,
}: {
  qtdTotal: number
  kwCa: number
  relacao: number | null
  relacaoTipo?: 'sub' | 'ok' | 'sobre' | 'critica'
}) {
  const relacaoTexto = relacao ? `${(relacao * 100).toFixed(0)}%` : '—'
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#3c4a63]">
      <span>
        Total de inversores: <strong>{qtdTotal} un</strong>
      </span>
      <span>
        Potência CA: <strong>{kwCa.toFixed(2)} kW</strong>
      </span>
      <span>
        FDR / Sobrecarga:{' '}
        <strong
          className={
            relacaoTipo === 'critica'
              ? 'text-red-600'
              : relacaoTipo === 'sobre'
                ? 'text-amber-600'
                : 'text-[#0b1f4d]'
          }
        >
          {relacaoTexto}
        </strong>
      </span>
    </div>
  )
}

// ---------- Cartão 1: PERFIL DE CONSUMO ----------

export function CartaoPerfil({
  form,
  set,
  onAplicarQtdSugerida,
}: {
  form: EstadoForm
  set: (p: Partial<EstadoForm>) => void
  onAplicarQtdSugerida?: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Consumo médio (kWh/mês)</Label>
            {onAplicarQtdSugerida && (
              <button
                type="button"
                onClick={onAplicarQtdSugerida}
                className="text-[10px] font-semibold text-[#0b1f4d] hover:underline"
              >
                Sugerir módulos
              </button>
            )}
          </div>
          <Input
            value={form.consumo}
            onChange={(e) => set({ consumo: e.target.value })}
            placeholder="600"
            inputMode="numeric"
          />
        </div>
        <div>
          <Label className="text-xs">Horas de Sol pleno (HSP)</Label>
          <Input
            value={form.sol}
            onChange={(e) => set({ sol: e.target.value })}
            placeholder="4,5"
            inputMode="decimal"
          />
          <span className="text-[10px] text-[#8a94a8]">MS e Centro-Oeste: ~4,5 a 5,2</span>
        </div>
        <div>
          <Label className="text-xs">Perdas do sistema (%)</Label>
          <Input
            value={form.perdas}
            onChange={(e) => set({ perdas: e.target.value })}
            placeholder="20"
            inputMode="numeric"
          />
          <span className="text-[10px] text-[#8a94a8]">Padrão: 15% a 22%</span>
        </div>
      </div>

      <div className="border-t border-[#dfe5f0] pt-3">
        <Label className="text-xs">Tipo de ligação elétrica</Label>
        <RadioGroup
          value={form.ligacao}
          onValueChange={(v) => set({ ligacao: v as Ligacao })}
          className="mt-2 grid grid-cols-3 gap-2"
        >
          {LIGACOES.map((l) => (
            <label
              key={l}
              className={`flex cursor-pointer items-center justify-center rounded-[8px] border p-2 text-xs font-semibold transition-colors ${
                form.ligacao === l
                  ? 'border-[#0b1f4d] bg-[#0b1f4d] text-white'
                  : 'border-[#dfe5f0] bg-white text-[#3c4a63] hover:bg-[#eef2f8]'
              }`}
            >
              <RadioGroupItem value={l} className="sr-only" />
              {l}
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  )
}

// ---------- Cartão 4: ESTRUTURA E ITENS ADICIONAIS ----------

export function CartaoEstrutura({
  form,
  set,
  distribuidoras,
}: {
  form: EstadoForm
  set: (p: Partial<EstadoForm>) => void
  distribuidoras: DistribuidoraRow[]
}) {
  const setItem = (idx: number, mudancas: Partial<EstadoForm['itens'][number]>) => {
    const novos = [...form.itens]
    novos[idx] = { ...novos[idx], ...mudancas }
    set({ itens: novos })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Tipo de fixação / telhado</Label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TIPOS_INSTALACAO.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set({ tipoInstalacao: t })}
              className={`rounded-[8px] border p-2 text-left text-xs font-semibold transition-colors ${
                form.tipoInstalacao === t
                  ? 'border-[#0b1f4d] bg-[#0b1f4d] text-white'
                  : 'border-[#dfe5f0] bg-white text-[#3c4a63] hover:bg-[#eef2f8]'
              }`}
            >
              {ROTULO_INSTALACAO[t] || t}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-[#dfe5f0] pt-3">
        <Label className="text-xs">Distribuidora / Fornecedor do kit</Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <select
            value={form.distribuidora}
            onChange={(e) => set({ distribuidora: e.target.value })}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm sm:w-1/2"
          >
            <option value="">Selecione…</option>
            {distribuidoras.map((d) => (
              <option key={d.id} value={d.nome}>
                {d.nome}
              </option>
            ))}
            <option value="__outra__">+ Outra distribuidora…</option>
          </select>

          {form.distribuidora === '__outra__' && (
            <Input
              placeholder="Nome da distribuidora"
              value={form.distribuidoraNova}
              onChange={(e) => set({ distribuidoraNova: e.target.value })}
              className="sm:w-1/2"
            />
          )}
        </div>
      </div>

      <div className="border-t border-[#dfe5f0] pt-3">
        <Label className="text-xs">Componentes e serviços inclusos</Label>
        <div className="mt-2 space-y-2">
          {form.itens.map((it, idx) => (
            <div
              key={it.nome}
              className="flex items-center justify-between rounded-[8px] border border-[#dfe5f0] bg-[#f8fafc] p-2.5 text-xs"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={it.incluido}
                  onCheckedChange={(c) => setItem(idx, { incluido: !!c })}
                />
                <span className={it.incluido ? 'font-semibold text-[#0b1f4d]' : 'text-[#8a94a8]'}>
                  {it.nome}
                </span>
              </label>
              {it.incluido && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#8a94a8]">Qtd:</span>
                  <InputNum
                    valor={it.qtd}
                    onChange={(v) => setItem(idx, { qtd: Math.max(1, v) })}
                    className="h-7 w-16 text-center text-xs"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------- Cartão 5: PRECIFICAÇÃO E MARGEM ----------

export function CartaoPreco({
  form,
  set,
  calc,
  setItem,
  addItem,
  removeItem,
}: {
  form: EstadoForm
  set: (p: Partial<EstadoForm>) => void
  calc?: EstadoCalculo
  setItem?: (idx: number, mudancas: any) => void
  addItem?: () => void
  removeItem?: (idx: number) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Custo do kit na distribuidora (R$)</Label>
          <Input
            value={form.custo}
            onChange={(e) => set({ custo: e.target.value })}
            placeholder="Ex.: 14500,00"
            inputMode="decimal"
          />
        </div>
        <div>
          <Label className="text-xs">Acréscimo / Margem sobre o custo (%)</Label>
          <Input
            value={form.acrescimoPct}
            onChange={(e) => set({ acrescimoPct: e.target.value })}
            placeholder="40"
            inputMode="numeric"
          />
        </div>
      </div>

      <div className="border-t border-[#dfe5f0] pt-3">
        <Label className="text-xs">Desconto comercial (opcional)</Label>
        <div className="mt-2 flex gap-2">
          <div className="flex rounded-md border border-[#dfe5f0] bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => set({ descontoTipo: 'R$' })}
              className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                form.descontoTipo === 'R$'
                  ? 'bg-[#0b1f4d] text-white'
                  : 'text-[#8a94a8] hover:text-[#0b1f4d]'
              }`}
            >
              R$
            </button>
            <button
              type="button"
              onClick={() => set({ descontoTipo: '%' })}
              className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                form.descontoTipo === '%'
                  ? 'bg-[#0b1f4d] text-white'
                  : 'text-[#8a94a8] hover:text-[#0b1f4d]'
              }`}
            >
              %
            </button>
          </div>
          <Input
            value={form.descontoValor}
            onChange={(e) => set({ descontoValor: e.target.value })}
            placeholder={form.descontoTipo === 'R$' ? 'Ex.: 500,00' : 'Ex.: 5'}
            inputMode="decimal"
            className="flex-1"
          />
        </div>
      </div>
    </div>
  )
}
