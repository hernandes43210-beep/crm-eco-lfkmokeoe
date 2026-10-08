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
  itens: CondicaoPagamentoItem[]
  temAVista: boolean
  temFinanciamento: boolean
  temCartao: boolean
  temEntrada: boolean
  resumoMascote: string
}

/**
 * Analisa a string livre de condições de pagamento configurada na proposta
 * (ex: "À vista com 5% de desconto via TED/PIX ou Financiamento Solar em até 84x (Santander, BV ou Solfácil) com carência de 90 dias. No cartão de crédito em 24 vezes de 1.030,04")
 * e quebra em cartões visuais ricos com ícones, badges e sugestão de comentário do mascote.
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

  // 1. Tentar extrair partes separadas se o texto tiver marcadores ou quebras de linha
  const linhasOuFrases = textoLimpo
    .split(/\n|\r\n|(?<=\.)\s+(?=[A-ZÀ-Ú])|(?<=\b(?:PIX|TED|dias|vezes)\b)\.\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  // Se o texto for uma linha corrida com "ou" ligando à vista e financiamento
  if (linhasOuFrases.length === 1 && textoLimpo.toLowerCase().includes(' ou ')) {
    const partesOu = textoLimpo.split(/\s+ou\s+/i)
    if (partesOu.length > 1) {
      partesOu.forEach((p, idx) => {
        const parteLimpa = p.trim().replace(/^\W+|\W+$/g, '')
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
            titulo: 'Pagamento À Vista',
            descricao:
              parteLimpa.startsWith('À vista') || parteLimpa.startsWith('A vista')
                ? parteLimpa
                : `À vista: ${parteLimpa}`,
            destaqueBadge: matchDesc ? `${matchDesc[1]} de Desconto` : 'Melhor Preço',
            icone: 'pix',
          })
        } else if (
          pLower.includes('financiamento') ||
          pLower.includes('santander') ||
          pLower.includes('bv') ||
          /\d{1,2}x/i.test(pLower)
        ) {
          // Extrair parcelas (ex: 84x, 120x)
          const matchX = parteLimpa.match(/(\d{1,3}\s*x)/i)
          itens.push({
            id: `fin-${idx}`,
            tipo: 'financiamento',
            titulo: 'Financiamento Solar',
            descricao: parteLimpa.toLowerCase().startsWith('financiamento')
              ? parteLimpa
              : `Financiamento: ${parteLimpa}`,
            destaqueBadge: matchX ? `Até ${matchX[1].toUpperCase()}` : 'Financiamento Facilitado',
            icone: 'banco',
          })
        } else if (pLower.includes('cartão') || pLower.includes('cartao')) {
          itens.push({
            id: `card-${idx}`,
            tipo: 'cartao',
            titulo: 'Cartão de Crédito',
            descricao: parteLimpa,
            destaqueBadge: 'Parcelado no Cartão',
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
    linhasOuFrases.forEach((linha, idx) => {
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
          titulo: 'Pagamento À Vista',
          descricao: linha,
          destaqueBadge: matchDesc ? `${matchDesc[1]} de Desconto` : 'Desconto Especial',
          icone: 'pix',
        })
      } else if (
        lLower.includes('financiamento') ||
        lLower.includes('santander') ||
        lLower.includes('solfácil') ||
        lLower.includes('bv')
      ) {
        const matchX = linha.match(/(\d{1,3}\s*x)/i)
        itens.push({
          id: `fin-${idx}`,
          tipo: 'financiamento',
          titulo: 'Financiamento Solar',
          descricao: linha,
          destaqueBadge: matchX ? `Até ${matchX[1].toUpperCase()}` : 'Bancos Parceiros',
          icone: 'banco',
        })
      } else if (lLower.includes('cartão') || lLower.includes('cartao')) {
        const matchX = linha.match(/(\d{1,3}\s*(?:vezes|x))/i)
        itens.push({
          id: `card-${idx}`,
          tipo: 'cartao',
          titulo: 'Cartão de Crédito',
          descricao: linha,
          destaqueBadge: matchX ? matchX[1] : 'Cartão',
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
      tituloFallback = 'À Vista ou Financiado'
      badgeFallback = 'Opções Flexíveis'
      iconeFallback = 'banco'
    } else if (temAVista) {
      tituloFallback = 'Pagamento À Vista'
      badgeFallback = 'Melhor Desconto'
      iconeFallback = 'pix'
    } else if (temFinanciamento) {
      tituloFallback = 'Financiamento Solar'
      badgeFallback = 'Parcelas Suaves'
      iconeFallback = 'banco'
    } else if (temCartao) {
      tituloFallback = 'Cartão de Crédito'
      badgeFallback = 'Parcelamento'
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
      descricao: textoLimpo,
      destaqueBadge: badgeFallback,
      icone: iconeFallback,
    })
  }

  // Montar fala amigável do mascote comentando a condição
  let resumoMascote = ''
  if (temAVista && temFinanciamento) {
    resumoMascote =
      'Você escolhe como prefere pagar: com super desconto à vista no PIX/TED ou financiamento facilitado em até 84x com a parcela paga pela própria economia de energia!'
  } else if (temFinanciamento) {
    resumoMascote =
      'O financiamento solar é incrível porque a parcela substitui sua conta de luz: você paga o sistema usando o dinheiro que já entregava todo mês para a concessionária!'
  } else if (temAVista) {
    resumoMascote =
      'Com o pagamento à vista você garante o melhor retorno financeiro e começa a lucrar imediatamente com a geração solar desde o primeiro dia de sol!'
  } else if (temCartao) {
    resumoMascote =
      'Pagamento parcelado no cartão de crédito com toda praticidade e segurança para você começar a gerar sua própria energia limpa!'
  } else {
    resumoMascote =
      'Preparamos condições especiais e personalizadas de pagamento para viabilizar sua usina solar com total tranquilidade para seu bolso!'
  }

  return {
    temCondicoes: true,
    textoOriginal: textoLimpo,
    itens,
    temAVista,
    temFinanciamento,
    temCartao,
    temEntrada,
    resumoMascote,
  }
}
