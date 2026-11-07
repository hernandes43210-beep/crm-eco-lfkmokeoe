/**
 * Decompõe os dados textuais de um kit/proposta em itens técnicos detalhados
 * (módulos, inversor, estrutura, string box, itens de observações).
 * Usado pela proposta pública (Story e Clássica) e pela formalização (tabela de equipamentos).
 */

export interface ItemDetalhadoKit {
  tipo: 'modulo' | 'inversor' | 'estrutura' | 'string_box' | 'item'
  nome: string
  quantidade: number | string
  unidade?: string
  potenciaUnit?: string
  especificacao?: string
  fabricanteModelo?: string
}

export interface KitDetailedItemsInput {
  kitNome?: string
  kitPotenciaKw?: number | string
  kitFabricante?: string
  descricao?: string
  observacoes?: string
  consumoKwh?: number
  stringBox?: string
  marcaPainel?: string
  marcaInversor?: string
  potenciaPainelW?: number | string
  potenciaInversorKw?: number | string
  tipoEstrutura?: string
}

export interface KitDetailedItemsResult {
  itens: ItemDetalhadoKit[]
  quantidadeModulosTotal: number
  potenciaTotalKwp: number
  fabricantesPrincipais: string
}

const ROTULOS_ESTRUTURA: Record<string, string> = {
  solo_monoposte: 'Estrutura de Solo (Monoposte)',
  mini_trilho: 'Estrutura Mini Trilho para Telhado Metálico',
  fibrocimento: 'Estrutura para Telhado de Fibrocimento',
  outro: 'Estrutura de Fixação',
}

/** Normaliza potência de painel em watts a partir de string ou número. */
function parseW(v: number | string | undefined): number {
  if (v === undefined || v === null || v === '') return 0
  const n =
    typeof v === 'number'
      ? v
      : parseFloat(
          String(v)
            .replace(/[^\d.,]/g, '')
            .replace(',', '.'),
        )
  return isNaN(n) ? 0 : n
}

/** Extrai "12x Marca Modelo 615 W" / "1x Inversor 8kW" de textos livres (descrição/observações). */
function extrairItensDeTexto(
  texto: string | undefined,
  tipo: ItemDetalhadoKit['tipo'],
): ItemDetalhadoKit[] {
  if (!texto) return []
  const itens: ItemDetalhadoKit[] = []
  const re = /(\d+)\s*[x×]\s*([^•;,;\n]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(texto)) !== null) {
    const qtd = parseInt(m[1], 10)
    const resto = m[2].trim()
    if (!qtd || !resto) continue
    itens.push({
      tipo,
      nome: resto,
      quantidade: qtd,
      unidade: 'un',
    })
  }
  return itens
}

/**
 * Decompõe os dados do kit em itens técnicos para exibição em tabelas
 * (proposta clássica, proposta story, formalização).
 */
export function parseKitDetailedItems(input: KitDetailedItemsInput): KitDetailedItemsResult {
  const {
    kitNome,
    kitPotenciaKw,
    kitFabricante,
    descricao,
    observacoes,
    stringBox,
    marcaPainel,
    marcaInversor,
    potenciaPainelW,
    potenciaInversorKw,
    tipoEstrutura,
  } = input

  const kwpTotal = parseW(kitPotenciaKw)
  const itens: ItemDetalhadoKit[] = []

  // --- Módulos ---
  const wPainel = parseW(potenciaPainelW)
  // Tentar extrair de descrição/observações (formato "10x Marca 630 W")
  const textoModulos =
    extrairItensDeTexto(descricao, 'modulo').find((i) => /w(p)?\b/i.test(i.nome)) ||
    extrairItensDeTexto(observacoes, 'modulo').find((i) => /w(p)?\b/i.test(i.nome)) ||
    extrairItensDeTexto(descricao, 'modulo')[0] ||
    extrairItensDeTexto(observacoes, 'modulo')[0]

  let qtdModulos = 0
  let nomeModulo = ''
  if (textoModulos) {
    qtdModulos = Number(textoModulos.quantidade) || 0
    nomeModulo = textoModulos.nome
  }

  // Fallback: estimar quantidade a partir da potência total
  if (!qtdModulos && kwpTotal > 0) {
    if (wPainel > 0) {
      qtdModulos = Math.round((kwpTotal * 1000) / wPainel)
    } else {
      qtdModulos = Math.round((kwpTotal * 1000) / 630)
    }
  }

  const marcaModuloFinal = marcaPainel || (nomeModulo ? nomeModulo.split(' ')[0] : '') || ''
  const potenciaUnitModulo =
    wPainel > 0 ? `${wPainel} W` : nomeModulo.match(/(\d{2,4})\s*W(p)?\b/i)?.[0] || ''

  if (qtdModulos > 0) {
    itens.push({
      tipo: 'modulo',
      nome: `${qtdModulos}× Módulos Fotovoltaicos${marcaModuloFinal ? ` ${marcaModuloFinal}` : ''}`,
      quantidade: qtdModulos,
      unidade: 'un',
      potenciaUnit: potenciaUnitModulo || undefined,
      especificacao:
        `Módulos fotovoltaicos monocristalinos Tier 1, ${potenciaUnitModulo || 'potência conforme projeto'}, ` +
        `com garantia de fabricação contra defeitos e de performance linear.`,
      fabricanteModelo: marcaModuloFinal || kitFabricante || undefined,
    })
  }

  // --- Inversor ---
  const kwInversor = parseW(potenciaInversorKw)
  const textoInversor =
    extrairItensDeTexto(descricao, 'inversor').find((i) => /kw\b/i.test(i.nome)) ||
    extrairItensDeTexto(observacoes, 'inversor').find((i) => /kw\b/i.test(i.nome))

  let qtdInversor = 1
  let nomeInversor = ''
  if (textoInversor) {
    qtdInversor = Number(textoInversor.quantidade) || 1
    nomeInversor = textoInversor.nome
  }

  const marcaInversorFinal = marcaInversor || (nomeInversor ? nomeInversor.split(' ')[0] : '') || ''
  const potenciaUnitInversor =
    kwInversor > 0
      ? `${kwInversor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kW`
      : nomeInversor.match(/([\d.,]+)\s*k?W\b/i)?.[0] || ''

  itens.push({
    tipo: 'inversor',
    nome: `${qtdInversor}× Inversor Solar${marcaInversorFinal ? ` ${marcaInversorFinal}` : ''}`,
    quantidade: qtdInversor,
    unidade: 'un',
    potenciaUnit: potenciaUnitInversor || undefined,
    especificacao:
      'Inversor solar (string) com monitoramento integrado via Wi-Fi/dongle, proteções integradas ' +
      'e garantia de fabricação. Homologado no INMETRO.',
    fabricanteModelo: marcaInversorFinal || undefined,
  })

  // --- String Box ---
  if (stringBox) {
    const rotulos: Record<string, string> = {
      '1_entrada': 'String Box 1 entrada (1E/1S) com DPS e disjuntor CC',
      '2_entradas': 'String Box 2 entradas (2E/2S) com DPS e disjuntores CC',
      '3_entradas': 'String Box 3 entradas (3E/3S) com DPS e disjuntores CC',
    }
    itens.push({
      tipo: 'string_box',
      nome: rotulos[stringBox] || `String Box ${stringBox}`,
      quantidade: 1,
      unidade: 'un',
      especificacao: 'Proteção CC com DPS (surto) e disjuntor/caixa motorizada em caixa IP65.',
    })
  }

  // --- Estrutura ---
  if (tipoEstrutura) {
    itens.push({
      tipo: 'estrutura',
      nome: ROTULOS_ESTRUTURA[tipoEstrutura] || `Estrutura ${tipoEstrutura}`,
      quantidade: 1,
      unidade: 'kit',
      especificacao:
        'Perfil de alumínio, hastes/ganchos em inox e fixação completa compatível com o tipo de telhado ' +
        'ou estrutura de solo.',
    })
  }

  // --- Outros itens listados nas observações (cabos, conectores, etc) ---
  const itensObservacoes = extrairItensDeTexto(observacoes, 'item')
    .filter(
      (i) =>
        !/pain[eé]l|m[oó]dulo|inversor/i.test(i.nome) &&
        !itens.some((exist) => exist.nome === i.nome),
    )
    .slice(0, 8)
  for (const it of itensObservacoes) {
    itens.push(it)
  }

  // Fabricantes principais para exibição consolidada
  const fabricantes = [marcaModuloFinal, marcaInversorFinal]
  if (kitFabricante) {
    for (const parte of kitFabricante.split('/')) {
      const p = parte.trim()
      if (p && !fabricantes.some((f) => f.toLowerCase() === p.toLowerCase())) fabricantes.push(p)
    }
  }
  const fabricantesPrincipais = fabricantes.filter(Boolean).join(' / ')

  const potenciaTotalW = qtdModulos * potenciaModuloW
  const potenciaTotalFormatada =
    potenciaTotalW >= 1000
      ? `${(potenciaTotalW / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kWp`
      : `${potenciaTotalW} Wp`

  return {
    itens,
    quantidadeModulosTotal: qtdModulos,
    potenciaTotalKwp: kwpTotal,
    potenciaTotalFormatada,
    geracaoMensalEstimadaKwh: Math.round(kwpTotal * 120),
    fabricantesPrincipais,
  }
}
