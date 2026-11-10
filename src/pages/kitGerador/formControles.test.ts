import { describe, it, expect } from 'vitest'
import { formatarNumeroPtBr, parseNumeroPtBr } from './formControles'

describe('formControles - formatarNumeroPtBr e parseNumeroPtBr', () => {
  describe('formatarNumeroPtBr', () => {
    it('retorna string vazia para 0 ou NaN', () => {
      expect(formatarNumeroPtBr(0)).toBe('')
      expect(formatarNumeroPtBr(NaN)).toBe('')
    })

    it('formata números inteiros diretamente', () => {
      expect(formatarNumeroPtBr(5)).toBe('5')
      expect(formatarNumeroPtBr(550)).toBe('550')
    })

    it('converte ponto para vírgula em decimais', () => {
      expect(formatarNumeroPtBr(3.68)).toBe('3,68')
      expect(formatarNumeroPtBr(5.5)).toBe('5,5')
      expect(formatarNumeroPtBr(2.79)).toBe('2,79')
      expect(formatarNumeroPtBr(0.5)).toBe('0,5')
    })
  })

  describe('parseNumeroPtBr', () => {
    it('aceita entrada com vírgula', () => {
      expect(parseNumeroPtBr('3,68')).toBe(3.68)
      expect(parseNumeroPtBr('5,5')).toBe(5.5)
      expect(parseNumeroPtBr('2,79')).toBe(2.79)
      expect(parseNumeroPtBr('0,5')).toBe(0.5)
    })

    it('aceita entrada com ponto', () => {
      expect(parseNumeroPtBr('3.68')).toBe(3.68)
      expect(parseNumeroPtBr('5.5')).toBe(5.5)
      expect(parseNumeroPtBr('2.79')).toBe(2.79)
    })

    it('aceita números inteiros', () => {
      expect(parseNumeroPtBr('5')).toBe(5)
      expect(parseNumeroPtBr('550')).toBe(550)
      expect(parseNumeroPtBr(' 12 ')).toBe(12)
    })

    it('retorna null para valores vazios ou inválidos', () => {
      expect(parseNumeroPtBr('')).toBeNull()
      expect(parseNumeroPtBr('   ')).toBeNull()
      expect(parseNumeroPtBr('abc')).toBeNull()
      expect(parseNumeroPtBr('xyz123')).toBeNull()
      expect(parseNumeroPtBr(',')).toBeNull()
      expect(parseNumeroPtBr('.')).toBeNull()
    })

    it('trata vírgula trailing no meio da digitação se finalizada', () => {
      // Se o usuário digitou "3," e deu blur
      expect(parseNumeroPtBr('3,')).toBe(3)
      expect(parseNumeroPtBr('3.')).toBe(3)
    })

    it('aceita formatos com separador de milhar e moeda', () => {
      expect(parseNumeroPtBr('255.208,5')).toBe(255208.5)
      expect(parseNumeroPtBr('255.208,50')).toBe(255208.5)
      expect(parseNumeroPtBr('R$ 255.208,50')).toBe(255208.5)
      expect(parseNumeroPtBr('25.000')).toBe(25000)
    })
  })
})
