import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Minus, Plus } from 'lucide-react'

export function QtdStepper({
  qtd,
  setQtd,
  min = 1,
}: {
  qtd: number
  setQtd: (n: number) => void
  min?: number
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={qtd <= min}
        onClick={() => setQtd(Math.max(min, qtd - 1))}
        className="h-8 w-8 p-0"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        value={String(qtd)}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v)) setQtd(Math.max(min, v))
        }}
        className="h-8 w-14 text-center font-bold"
        inputMode="numeric"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setQtd(qtd + 1)}
        className="h-8 w-8 p-0"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export function InputNum({
  valor,
  onChange,
  placeholder = '0',
  className = '',
}: {
  valor: number
  onChange: (v: number) => void
  placeholder?: string
  className?: string
}) {
  return (
    <Input
      value={valor ? String(valor).replace('.', ',') : ''}
      onChange={(e) => {
        const limpo = e.target.value.replace(',', '.')
        const n = parseFloat(limpo)
        onChange(isNaN(n) ? 0 : n)
      }}
      placeholder={placeholder}
      className={className}
      inputMode="decimal"
    />
  )
}
