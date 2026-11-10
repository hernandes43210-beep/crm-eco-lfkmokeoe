import { useState, useEffect } from 'react'
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

/**
 * Converte número para exibição amigável em pt-BR com vírgula.
 * 0 vira '' para manter o placeholder visível.
 */
export function formatarNumeroPtBr(valor: number): string {
  if (!valor || isNaN(valor)) return ''
  return String(valor).replace('.', ',')
}

/**
 * Faz o parse tolerante de uma string com vírgula ou ponto para number.
 * Retorna null se não for um número válido/finito.
 */
export function parseNumeroPtBr(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.')
  if (limpo === '') return null
  const n = parseFloat(limpo)
  if (isNaN(n) || !isFinite(n)) return null
  return n
}

export function InputNum({
  valor,
  onChange,
  placeholder = '0',
  className = '',
  min,
  max,
}: {
  valor: number
  onChange: (v: number) => void
  placeholder?: string
  className?: string
  min?: number
  max?: number
}) {
  // Mantém estado interno de texto para permitir digitar "3," ou "3." sem apagar a vírgula/ponto
  const [texto, setTexto] = useState(() => formatarNumeroPtBr(valor))
  const [emFoco, setEmFoco] = useState(false)

  // Quando o campo não está em foco e o valor externo muda (ex.: carregar kit salvo, catálogo, reset),
  // sincroniza o texto exibido com o novo valor numérico
  useEffect(() => {
    if (!emFoco) {
      setTexto(formatarNumeroPtBr(valor))
    }
  }, [valor, emFoco])

  const confirmar = () => {
    const parseado = parseNumeroPtBr(texto)
    if (parseado === null) {
      // Entrada vazia ou inválida: restaura o último valor válido recebido via props
      setTexto(formatarNumeroPtBr(valor))
      return
    }

    let final = parseado
    if (typeof min === 'number') final = Math.max(min, final)
    if (typeof max === 'number') final = Math.min(max, final)

    // Notifica o pai apenas quando houver mudança numérica real
    if (final !== valor) {
      onChange(final)
    }
    // Padroniza a exibição formatada
    setTexto(formatarNumeroPtBr(final))
  }

  return (
    <Input
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onFocus={() => setEmFoco(true)}
      onBlur={() => {
        setEmFoco(false)
        confirmar()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur()
        }
      }}
      placeholder={placeholder}
      className={className}
      inputMode="decimal"
    />
  )
}
