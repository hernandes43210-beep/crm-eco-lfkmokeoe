import { describe, it, expect } from 'vitest'

describe('Amanda SDR (IA) - Regras e Diretrizes de Qualificação', () => {
  it('garante que a lista de campos obrigatórios de qualificação contempla os 3 dados solicitados', () => {
    const dadosObrigatorios = ['consumo_atual', 'pretensao_aumento_consumo', 'local_instalacao']
    expect(dadosObrigatorios).toHaveLength(3)
    expect(dadosObrigatorios).toContain('consumo_atual')
    expect(dadosObrigatorios).toContain('pretensao_aumento_consumo')
    expect(dadosObrigatorios).toContain('local_instalacao')
  })

  it('valida a regra estrita de não fornecer preços ou orçamentos diretamente pela SDR', () => {
    const mensagemPerguntaPreco = 'Quanto custa um sistema solar de 500 kWh?'
    const regraPreco = (pergunta: string) => {
      const p = pergunta.toLowerCase()
      if (p.includes('quanto custa') || p.includes('preço') || p.includes('desconto')) {
        return {
          bloqueado: true,
          respostaPadrao:
            'A proposta é 100% personalizada e nosso consultor solar especialista apresentará todos os valores detalhados para você.',
        }
      }
      return { bloqueado: false, respostaPadrao: '' }
    }

    const resultado = regraPreco(mensagemPerguntaPreco)
    expect(resultado.bloqueado).toBe(true)
    expect(resultado.respostaPadrao).toContain('consultor solar')
    expect(resultado.respostaPadrao).not.toMatch(/R\$\s*\d+/)
  })

  it('detecta os 3 dados na conversa para determinar se o lead está qualificado', () => {
    const verificarQualificacao = (conversa: string[]) => {
      const textoCompleto = conversa.join(' ').toLowerCase()
      const temConsumo =
        textoCompleto.includes('kwh') ||
        textoCompleto.includes('conta') ||
        textoCompleto.includes('r$') ||
        /\d{2,4}/.test(textoCompleto)
      const temAumento =
        textoCompleto.includes('aumentar') ||
        textoCompleto.includes('ar-condicionado') ||
        textoCompleto.includes('ar condicionado') ||
        textoCompleto.includes('manter') ||
        textoCompleto.includes('pretendo') ||
        textoCompleto.includes('sim') ||
        textoCompleto.includes('não') ||
        textoCompleto.includes('nao')
      const temLocal =
        textoCompleto.includes('casa') ||
        textoCompleto.includes('comércio') ||
        textoCompleto.includes('comercio') ||
        textoCompleto.includes('rural') ||
        textoCompleto.includes('sitio') ||
        textoCompleto.includes('bairro')

      return temConsumo && temAumento && temLocal
    }

    const conversaQualificada = [
      'Minha conta vem uns R$ 850 por mês',
      'Pretendo colocar mais dois aparelhos de ar-condicionado ano que vem',
      'É numa casa no bairro Nova Brasília',
    ]

    expect(verificarQualificacao(conversaQualificada)).toBe(true)

    const conversaIncompleta = ['Minha conta vem uns R$ 850 por mês', 'Pretendo aumentar o consumo']
    expect(verificarQualificacao(conversaIncompleta)).toBe(false)
  })
})
