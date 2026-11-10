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
  if (typeof texto !== 'string') return null
  let limpo = texto.trim().replace(/R\$/gi, '').replace(/\s+/g, '')
  if (limpo === '') return null

  const hasComma = limpo.includes(',')
  const hasDot = limpo.includes('.')

  if (hasComma && hasDot) {
    const lastComma = limpo.lastIndexOf(',')
    const lastDot = limpo.lastIndexOf('.')
    if (lastComma > lastDot) {
      // Formato pt-BR com milhares: 255.208,50 -> 255208.50
      limpo = limpo.replace(/\./g, '').replace(',', '.')
    } else {
      // Formato americano com milhares: 255,208.50 -> 255208.50
      limpo = limpo.replace(/,/g, '')
    }
  } else if (hasComma) {
    // Apenas vírgula: 255208,50 ou múltiplos milhares
    const parts = limpo.split(',')
    if (parts.length > 2) {
      limpo = parts.join('')
    } else {
      limpo = limpo.replace(',', '.')
    }
  } else if (hasDot) {
    // Apenas ponto: 255.208.50 (milhares) vs 255208.50 (decimal) vs 25.000 (milhar inteiro)
    const parts = limpo.split('.')
    if (parts.length > 2) {
      limpo = parts.join('')
    } else if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1) {
      // Ex: 25.000 -> 25000 (milhar brasileiro sem vírgula)
      limpo = parts.join('')
    }
  }

  limpo = limpo.replace(/[^0-9.-]/g, '')
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
