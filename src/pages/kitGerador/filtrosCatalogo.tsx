// Filtros de busca da aba CATÁLOGO (marca + potência) para painéis e inversores.
// Regras: marca por contém (ignora maiúsculas/minúsculas); potência por contém no
// número digitado ("615" acha 615 W; "6" acha 615 W, 6 kW etc.). Filtros combináveis.
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PainelCatalogoRow, InversorCatalogoRow } from '@/services/kitGerador'

export interface FiltroCatalogo {
  marca: string
  potencia: string
}

export const filtroCatalogoVazio: FiltroCatalogo = { marca: '', potencia: '' }

export function temFiltroCatalogo(f: FiltroCatalogo): boolean {
  return f.marca.trim() !== '' || f.potencia.trim() !== ''
}

const termoMarca = (f: FiltroCatalogo) => f.marca.trim().toLowerCase()

// Potência: compara o número digitado com o valor em texto (com vírgula e com ponto),
// por contém — tolerante a decimais (ex.: "8,5" ou "8.5" acha 8,5 kW).
export function casaPotencia(valor: number, termo: string): boolean {
  if (!termo) return true
  const t = termo.trim().replace('.', ',')
  if (t === '') return true
  const texto = String(valor).replace('.', ',')
  return texto.includes(t)
}

export function filtrarPaineis(paineis: PainelCatalogoRow[], filtro: FiltroCatalogo) {
  const marca = termoMarca(filtro)
  const potencia = filtro.potencia.trim()
  if (!marca && !potencia) return paineis
  return paineis.filter(
    (p) => p.marca.toLowerCase().includes(marca) && casaPotencia(p.potencia_w, potencia),
  )
}

export function filtrarInversores(inversores: InversorCatalogoRow[], filtro: FiltroCatalogo) {
  const marca = termoMarca(filtro)
  const potencia = filtro.potencia.trim()
  if (!marca && !potencia) return inversores
  return inversores.filter(
    (i) => i.marca.toLowerCase().includes(marca) && casaPotencia(i.potencia_kw, potencia),
  )
}

export function BarraFiltrosCatalogo({
  filtro,
  onChange,
  unidade,
  exemploPotencia,
}: {
  filtro: FiltroCatalogo
  onChange: (f: FiltroCatalogo) => void
  unidade: 'W' | 'kW'
  exemploPotencia: string
}) {
  const ativo = temFiltroCatalogo(filtro)
  return (
    <div className="mb-3 flex flex-col gap-2 rounded-[10px] border border-[#dfe5f0] bg-[#eef2f8] p-2.5 sm:flex-row sm:items-center">
      <p className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#0b1f4d]">
        Filtrar
      </p>
      <Input
        placeholder="Marca (ex.: Sungrow)"
        value={filtro.marca}
        onChange={(e) => onChange({ ...filtro, marca: e.target.value })}
        className="sm:max-w-[210px]"
      />
      <Input
        placeholder={`Potência em ${unidade} (ex.: ${exemploPotencia})`}
        inputMode="decimal"
        value={filtro.potencia}
        onChange={(e) => onChange({ ...filtro, potencia: e.target.value })}
        className="sm:max-w-[230px]"
      />
      {ativo && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(filtroCatalogoVazio)}
          className="shrink-0 font-semibold text-[#0b1f4d] hover:bg-white"
        >
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
