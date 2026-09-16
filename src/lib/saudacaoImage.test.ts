import { describe, it, expect } from 'vitest'
import {
  SAUDACOES_PREDEFINIDAS,
  gerarTextoWhatsAppSaudacao,
  type SaudacaoOptions,
} from './saudacaoImage'
import { ECOSOLAR_MASCOT_ASSET } from './mascotUtils'
import { ECOSOLAR_HORIZONTAL_LOGO_ASSET } from './logoUtils'

describe('saudacaoImage e mascotUtils', () => {
  it('o asset da logo horizontal está definido e apontando para a imagem correta', () => {
    expect(ECOSOLAR_HORIZONTAL_LOGO_ASSET).toBeTruthy()
    expect(typeof ECOSOLAR_HORIZONTAL_LOGO_ASSET).toBe('string')
    expect(ECOSOLAR_HORIZONTAL_LOGO_ASSET).toContain('design-sem-nome-abb38')
  })

  it('o asset do mascote está definido e apontando para a imagem correta', () => {
    expect(ECOSOLAR_MASCOT_ASSET).toBeTruthy()
    expect(typeof ECOSOLAR_MASCOT_ASSET).toBe('string')
    expect(ECOSOLAR_MASCOT_ASSET).toContain('editedimage1777166474816-0d67d')
  })

  it('possui as três saudações predefinidas principais e seus textos motivacionais', () => {
    expect(SAUDACOES_PREDEFINIDAS.bom_dia.titulo).toBe('Bom dia!')
    expect(SAUDACOES_PREDEFINIDAS.bom_dia.subtitulo).toContain('energia positiva')

    expect(SAUDACOES_PREDEFINIDAS.boa_tarde.titulo).toBe('Boa tarde!')
    expect(SAUDACOES_PREDEFINIDAS.boa_tarde.subtitulo).toContain('geração solar')

    expect(SAUDACOES_PREDEFINIDAS.boa_noite.titulo).toBe('Boa noite!')
    expect(SAUDACOES_PREDEFINIDAS.boa_noite.subtitulo).toContain('economia solar')
  })

  it('gera texto formatado para envio no WhatsApp com título, subtítulo e chamada oficial', () => {
    const opts: SaudacaoOptions = {
      tipo: 'bom_dia',
      format: 'square',
    }

    const texto = gerarTextoWhatsAppSaudacao(opts)

    expect(texto).toContain('*BOM DIA!*')
    expect(texto).toContain('Ecosolar Energy')
    expect(texto).toContain('A Energia do Futuro, Hoje!')
  })

  it('gera texto personalizado para WhatsApp quando a opção selecionada for livre', () => {
    const opts: SaudacaoOptions = {
      tipo: 'personalizado',
      mensagemPersonalizada: 'Ótima semana para todos os nossos clientes!',
      format: 'story',
    }

    const texto = gerarTextoWhatsAppSaudacao(opts)

    expect(texto).toContain('Ótima semana para todos os nossos clientes!')
    expect(texto).toContain('*ECOSOLAR ENERGY*')
  })
})
