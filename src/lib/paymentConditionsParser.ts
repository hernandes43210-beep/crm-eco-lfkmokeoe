/**
 * Utilitário para formatação, destaque e análise das Condições de Pagamento
 * configuradas na proposta comercial solar (Story e Clássica).
 */

export interface CondicaoPagamentoItem {
  id: string
  tipo: 'a_vista' | 'financiamento' | 'cartao' | 'entrada_parcelas' | 'outro'
  titulo: string
  descricao: string
  destaqueBadge?: string
  icone: 'pix' | 'banco' | 'cartao' | 'parcelas' | 'cifrao'
}

export interface CondicoesPagamentoParsed {
  temCondicoes: boolean
  textoOriginal: string
  textoSanitizado: string
  itens: CondicaoPagamentoItem[]
  temAVista: boolean
  temFinanciamento: boolean
  temCartao: boolean
  temEntrada: boolean
  resumoMascote: string
}

/**
 * Remove menções a bancos ou financeiras específicos (BV, Santander, Solfácil, Fácil, etc.)
 * para que a apresentação das condições seja sempre genérica e institucional Ecosolar Energy.
 */
export function sanitizarNomesInstituicoes(texto: string): string {
  if (!texto) return ''

  let limpo = texto

  // 1. Remover parênteses contendo bancos/financeiras: ex "(Santander, BV ou Solfácil)", "(banco BV)", "(Fácil)"
  limpo = limpo.replace(
    /\s*\((?:[^)]*?\b(?:santander|bv|solf[aá]cil|f[aá]cil|bradesco|ita[uú]|safra|losango|pan|banco\s+pan|porto\s+seguro|votorantim|sicoob|sicredi)\b[^)]*?)\)/gi,
    '',
  )

  // 2. Remover frases como "pelo banco BV", "via Santander", "junto ao BV", "pela Solfácil"
  limpo = limpo.replace(
    /\b(?:pelo|pela|via|junto\s+ao|junto\s+[aà]|no|na|com\s+o|com\s+a)\s+(?:banco\s+)?(?:santander|bv|solf[aá]cil|f[aá]cil|bradesco|ita[uú]|safra|banco\s+pan|pan)\b/gi,
    '',
  )

  // 3. Remover menções diretas aos nomes isolados de instituições financeiras
  limpo = limpo.replace(/\b(?:banco\s+)?bv\b/gi, '')
  limpo = limpo.replace(/\bsantander\b/gi, '')
  limpo = limpo.replace(/\bsolf[aá]cil\b/gi, '')
  limpo = limpo.replace(/\b(?:financeira\s+|banco\s+)?f[aá]cil\b/gi, '')
  limpo = limpo.replace(/\bbradesco\b/gi, '')
  limpo = limpo.replace(/\bita[uú]\b/gi, '')

  // 4. Limpeza de pontuação duplicada, espaços e vírgulas residuais
  limpo = limpo
    .replace(/\s*,\s*,+/g, ', ')
    .replace(/\s*,\s*\./g, '.')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/^\s*[,.;:]+\s*/g, '')
    .trim()

  return limpo
}

/**
 * Analisa a string livre de condições de pagamento configurada na proposta
 * e quebra em cartões visuais ricos com ícones, badges e sugestão de comentário do mascote,
 * garantindo apresentação genérica sem citar nomes de instituições específicas.
 */
export function parseCondicoesPagamento(
  rawTexto?: string | null,
  precoVenda?: number,
): CondicoesPagamentoParsed {
  const textoLimpo = (rawTexto || '').trim()

  if (!textoLimpo) {
    return {
      temCondicoes: false,
      textoOriginal: '',
      textoSanitizado: '',
      itens: [],
      temAVista: false,
      temFinanciamento: false,
      temCartao: false,
      temEntrada: false,
      resumoMascote: '',
    }
  }

  // Dividir por quebra de linha, ponto e vírgula, "ou", "no cartão" ou marcadores
  // Também vamos inspecionar trechos da string
  const textoLower = textoLimpo.toLowerCase()

  const temAVista =
    textoLower.includes('à vista') ||
    textoLower.includes('a vista') ||
    textoLower.includes('ted') ||
    textoLower.includes('pix') ||
    textoLower.includes('desconto à vista')

  const temFinanciamento =
    textoLower.includes('financiamento') ||
    textoLower.includes('santander') ||
    textoLower.includes('solfácil') ||
    textoLower.includes('solfacil') ||
    textoLower.includes('bv') ||
    textoLower.includes('banco') ||
    /\b\d{1,2}x\b/i.test(textoLower) ||
    textoLower.includes('carência') ||
    textoLower.includes('carencia')

  const temCartao =
    textoLower.includes('cartão') ||
    textoLower.includes('cartao') ||
    textoLower.includes('crédito') ||
    textoLower.includes('credito')

  const temEntrada = textoLower.includes('entrada') || textoLower.includes('sinal')

  const itens: CondicaoPagamentoItem[] = []

  // Sanitizar o texto para remover qualquer menção a bancos/financeiras específicos
  const textoSanitizado = sanitizarNomesInstituicoes(textoLimpo)

  // 1. Tentar extrair partes separadas se o texto tiver marcadores ou quebras de linha
  const linhasOuFrases = textoSanitizado
    .split(/\n|\r\n|(?<=\.)\s+(?=[A-ZÀ-Ú])|(?<=\b(?:PIX|TED|dias|vezes)\b)\.\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  // Se o texto for uma linha corrida com "ou" ligando à vista e financiamento
  if (linhasOuFrases.length === 1 && textoSanitizado.toLowerCase().includes(' ou ')) {
    const partesOu = textoSanitizado.split(/\s+ou\s+/i)
    if (partesOu.length > 1) {
      partesOu.forEach((p, idx) => {
        const parteLimpa = sanitizarNomesInstituicoes(p.trim().replace(/^\W+|\W+$/g, ''))
        if (!parteLimpa) return
        const pLower = parteLimpa.toLowerCase()

        if (
          pLower.includes('à vista') ||
          pLower.includes('a vista') ||
          pLower.includes('pix') ||
          pLower.includes('ted')
        ) {
          // Extrair desconto se citado
          const matchDesc = parteLimpa.match(/(\d+(?:[.,]\d+)?%)/)
          itens.push({
            id: `av-${idx}`,
            tipo: 'a_vista',
            titulo: 'Pagamento à Vista',
            descricao:
              parteLimpa.startsWith('À vista') || parteLimpa.startsWith('A vista')
                ? parteLimpa
                : `À vista: ${parteLimpa}`,
            destaqueBadge: matchDesc ? `${matchDesc[1]} de Desconto` : 'A Melhor Opção',
            icone: 'pix',
          })
        } else if (
          pLower.includes('financiamento') ||
          pLower.includes('banco') ||
          /\d{1,2}x/i.test(pLower)
        ) {
          // Extrair parcelas (ex: 84x, 120x)
          const matchX = parteLimpa.match(/(\d{1,3}\s*x)/i)
          itens.push({
            id: `fin-${idx}`,
            tipo: 'financiamento',
            titulo: 'Financiamento Bancário',
            descricao: parteLimpa.toLowerCase().startsWith('financiamento')
              ? parteLimpa
              : `Financiamento bancário: ${parteLimpa}`,
            destaqueBadge: matchX ? `Até ${matchX[1].toUpperCase()}` : 'Parcerias Ecosolar',
            icone: 'banco',
          })
        } else if (pLower.includes('cartão') || pLower.includes('cartao')) {
          itens.push({
            id: `card-${idx}`,
            tipo: 'cartao',
            titulo: 'Cartão de Crédito',
            descricao: parteLimpa,
            destaqueBadge: 'Em até 24x',
            icone: 'cartao',
          })
        } else {
          itens.push({
            id: `item-${idx}`,
            tipo: 'outro',
            titulo: 'Condição Especial',
            descricao: parteLimpa,
            destaqueBadge: 'Flexível',
            icone: 'cifrao',
          })
        }
      })
    }
  } else if (linhasOuFrases.length > 1) {
    linhasOuFrases.forEach((linhaRaw, idx) => {
      const linha = sanitizarNomesInstituicoes(linhaRaw)
      if (!linha) return
      const lLower = linha.toLowerCase()
      if (
        lLower.includes('à vista') ||
        lLower.includes('a vista') ||
        lLower.includes('pix') ||
        lLower.includes('ted')
      ) {
        const matchDesc = linha.match(/(\d+(?:[.,]\d+)?%)/)
        itens.push({
          id: `av-${idx}`,
          tipo: 'a_vista',
          titulo: 'Pagamento à Vista',
          descricao: linha,
          destaqueBadge: matchDesc ? `${matchDesc[1]} de Desconto` : 'A Melhor Opção',
          icone: 'pix',
        })
      } else if (
        lLower.includes('financiamento') ||
        lLower.includes('banco') ||
        lLower.includes('financeira')
      ) {
        const matchX = linha.match(/(\d{1,3}\s*x)/i)
        itens.push({
          id: `fin-${idx}`,
          tipo: 'financiamento',
          titulo: 'Financiamento Bancário',
          descricao: linha,
          destaqueBadge: matchX ? `Até ${matchX[1].toUpperCase()}` : 'Parcerias Ecosolar',
          icone: 'banco',
        })
      } else if (lLower.includes('cartão') || lLower.includes('cartao')) {
        const matchX = linha.match(/(\d{1,3}\s*(?:vezes|x))/i)
        itens.push({
          id: `card-${idx}`,
          tipo: 'cartao',
          titulo: 'Cartão de Crédito',
          descricao: linha,
          destaqueBadge: matchX ? matchX[1] : 'Em até 24x',
          icone: 'cartao',
        })
      } else if (lLower.includes('entrada')) {
        itens.push({
          id: `ent-${idx}`,
          tipo: 'entrada_parcelas',
          titulo: 'Entrada + Parcelas',
          descricao: linha,
          destaqueBadge: 'Condição Especial',
          icone: 'parcelas',
        })
      } else {
        itens.push({
          id: `outro-${idx}`,
          tipo: 'outro',
          titulo: 'Condição Negociada',
          descricao: linha,
          destaqueBadge: 'Facilitado',
          icone: 'cifrao',
        })
      }
    })
  }

  // Fallback: se não conseguiu quebrar ou tem apenas 1 item vago mas temos o texto todo
  if (itens.length === 0) {
    let tituloFallback = 'Condições de Pagamento'
    let iconeFallback: CondicaoPagamentoItem['icone'] = 'cifrao'
    let badgeFallback = 'Condição Flexível'

    if (temAVista && temFinanciamento) {
      tituloFallback = 'À Vista ou Financiamento'
      badgeFallback = 'A Melhor Opção'
      iconeFallback = 'pix'
    } else if (temAVista) {
      tituloFallback = 'Pagamento à Vista'
      badgeFallback = 'A Melhor Opção'
      iconeFallback = 'pix'
    } else if (temFinanciamento) {
      tituloFallback = 'Financiamento Bancário'
      badgeFallback = 'Parcerias Ecosolar'
      iconeFallback = 'banco'
    } else if (temCartao) {
      tituloFallback = 'Cartão de Crédito'
      badgeFallback = 'Em até 24x'
      iconeFallback = 'cartao'
    }

    itens.push({
      id: 'single-1',
      tipo: temAVista
        ? 'a_vista'
        : temFinanciamento
          ? 'financiamento'
          : temCartao
            ? 'cartao'
            : 'outro',
      titulo: tituloFallback,
      descricao: textoSanitizado,
      destaqueBadge: badgeFallback,
      icone: iconeFallback,
    })
  }

  // Fala convidativa do mascote da Ecosolar reforçando o convite: "Escolha a sua melhor opção"
  // seguindo estritamente as diretrizes do usuário.
  const resumoMascote =
    'O pagamento à vista é a melhor opção, com retorno imediato! Mas você também pode parcelar no cartão em até 24x ou financiar com as parcerias que a nossa Ecosolar Energy tem com bancos e financeiras. Escolha a sua melhor opção!'

  return {
    temCondicoes: true,
    textoOriginal: textoLimpo,
    textoSanitizado,
    itens,
    temAVista,
    temFinanciamento,
    temCartao,
    temEntrada,
    resumoMascote,
  }
}
