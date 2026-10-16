import React, { useState, useRef, useEffect, useMemo } from 'react'
import { MapPin, X, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CidadeFilterInputProps {
  value: string
  onChange: (cidade: string) => void
  cidadesCadastradas: string[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * Remove acentos e normaliza para caixa baixa para comparação tolerante a acentos e maiúsculas/minúsculas.
 */
export function normalizarTexto(texto: string | null | undefined): string {
  if (!texto) return ''
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function CidadeFilterInput({
  value,
  onChange,
  cidadesCadastradas,
  placeholder = 'Filtrar por cidade...',
  className,
  disabled = false,
}: CidadeFilterInputProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value || '')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sincroniza valor externo com estado interno
  useEffect(() => {
    setInputValue(value || '')
  }, [value])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Filtra sugestões conforme o usuário digita (tolerante a acentos e case-insensitive)
  const sugestoesFiltradas = useMemo(() => {
    const termo = normalizarTexto(inputValue)
    if (!termo) {
      return cidadesCadastradas
    }
    return cidadesCadastradas.filter((cid) => normalizarTexto(cid).includes(termo))
  }, [cidadesCadastradas, inputValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    onChange(val)
    if (!open) {
      setOpen(true)
    }
  }

  const handleSelectCidade = (cidade: string) => {
    setInputValue(cidade)
    onChange(cidade)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setInputValue('')
    onChange('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Enter') {
      // Se tiver apenas 1 sugestão exata ou muito próxima, seleciona
      if (open && sugestoesFiltradas.length > 0) {
        handleSelectCidade(sugestoesFiltradas[0])
      } else {
        setOpen(false)
      }
    } else if (e.key === 'ArrowDown') {
      if (!open) setOpen(true)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative flex items-center">
        <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Filtrar por cidade"
          aria-expanded={open}
          role="combobox"
          className="w-full h-10 pl-9 pr-14 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B] focus:border-transparent transition-all disabled:opacity-50 disabled:bg-slate-50"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Limpar cidade"
              title="Limpar cidade"
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Ver cidades disponíveis"
            tabIndex={-1}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          >
            <ChevronDown
              className={cn('w-3.5 h-3.5 transition-transform duration-200', open && 'rotate-180')}
            />
          </button>
        </div>
      </div>

      {/* Dropdown com sugestões de cidades */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1 animate-in fade-in-0 zoom-in-95 duration-100">
          {sugestoesFiltradas.length > 0 ? (
            <>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Cidades cadastradas ({sugestoesFiltradas.length})
              </div>
              <ul className="py-1">
                {sugestoesFiltradas.map((cid) => {
                  const isSelected = normalizarTexto(value) === normalizarTexto(cid)
                  return (
                    <li key={cid}>
                      <button
                        type="button"
                        onClick={() => handleSelectCidade(cid)}
                        className={cn(
                          'w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 hover:text-[#0B7A5B] transition-colors',
                          isSelected
                            ? 'font-semibold text-[#0B7A5B] bg-emerald-50/60'
                            : 'text-slate-700',
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{cid}</span>
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#0B7A5B] shrink-0 ml-2" />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-slate-500">
                Nenhuma cidade cadastrada encontrada para &ldquo;{inputValue}&rdquo;.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                A lista continuará filtrando pelo termo digitado.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
