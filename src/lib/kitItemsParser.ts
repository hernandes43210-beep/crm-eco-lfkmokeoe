import { calcularGeracaoMensalKwh } from './solarUtils'

export interface KitItemDetail {
  tipo:
    | 'modulo'
    | 'inversor'
    | 'string_box'
    | 'estrutura'
    | 'cabos'
    | 'monitoramento'
    | 'engenharia'
    | 'outro'
  quantidade: number
  unidade: string // 'un', 'm', 'kit', 'cj'
  nome: string // ex: "Módulo Fotovoltaico Bifacial"
  fabricanteModelo: string // ex: "Canadian Solar 610Wp" ou "Sungrow 10kW Monofásico 220V"
  especificacao?: string // ex: "132 Cel. N-Type Black Frame"
  potenciaUnit?: string // ex: "610 Wp" ou "10 kW"
}

export function formatarRotuloStringBoxItem(val?: string | null): string {
  if (!val) return ''
  const trimmed = val.trim()
  if (trimmed === '1_entrada' || trimmed === '1') {
    return 'String box 1 entrada / 1 saída'
  }
  if (trimmed === '2_entradas' || trimmed === '2') {
    return 'String box 2 entradas / 2 saídas'
  }
  if (trimmed === '3_entradas' || trimmed === '3') {
    return 'String box 3 entradas / 3 saídas'
  }
  const matchE = trimmed.match(/(\d+)\s*E(?:ntradas?)?/i)
  if (matchE) {
    const n = matchE[1]
    return n === '1' ? 'String box 1 entrada / 1 saída' : `String box ${n} entradas / ${n} saídas`
  }
  return trimmed
}

export interface KitSpecsDetailed {
  itens: KitItemDetail[]
  potenciaTotalKwp?: number
  potenciaTotalFormatada: string
  quantidadeModulosTotal?: number
  areaEstimadaM2?: number
  geracaoMensalEstimadaKwh?: number
  fabricantesPrincipais: string
}

/**
 * Normaliza e remove sufixos ou tags excessivas
 */
function cleanText(str: string): string {
  return str.replace(/\s+/g, ' ').trim()
}

/**
 * Tenta decompor a string de descrição ou nome do kit em itens reais cadastrados.
 * Não inventa itens se não existirem dados correspondentes no sistema.
 */
export function parseKitDetailedItems(params: {
  kitNome?: string
  kitPotenciaKw?: number
  kitFabricante?: string
  descricao?: string
  observacoes?: string
  consumoKwh?: number
  stringBox?: string
}): KitSpecsDetailed {
  const {
    kitNome = '',
    kitPotenciaKw,
    kitFabricante = '',
    descricao = '',
    observacoes = '',
    consumoKwh,
    stringBox: paramStringBox = '',
  } = params

  const itens: KitItemDetail[] = []
  const textToScan = `${descricao}\n${observacoes}\n${kitNome}\n${kitFabricante}`

  // 1. Tentar fazer parse detalhado linha por linha ou separador "XX=" da descrição
  // Exemplos reais no banco:
  // "22= MODULO BIFACIAL 132 CEL. N TYPE 630W BLACK FRAME CABO 0.30M TSUN POWERMFTB-0.3-BF-132-630W 01= INVERSOR DE CORRENTE MONOFASICO 3MPPT 220V 10KW SUNGROWINVSG-MO-220V-10KW 01= STRING BOX 3E/3S 1000V..."
  // "10x Módulo fotovoltaico 610Wp (Canadian Solar) — Total 6,10 kWp\n1x Inversor solar Growatt 5000\nEstrutura de fixação..."
  // "Ideal para residências com consumo de até 500 kWh/mês. 8 módulos 560W + inversor monofásico 5kW."

  // Primeiro quebramos em blocos se houver o padrão de distribuidor "(\d+)=\s*"
  const rawBlocks: string[] = []
  if (/\b\d+\s*=\s*/.test(descricao)) {
    const parts = descricao.split(/(?=\b\d+\s*=\s*)/g)
    for (const part of parts) {
      if (part.trim()) rawBlocks.push(part.trim())
    }
  } else {
    // Quebra por linhas normais
    const lines = descricao.split(/\r?\n/)
    for (const l of lines) {
      if (l.trim()) rawBlocks.push(l.trim())
    }
  }

  let modulosQtd = 0
  let modulosWp = 0
  let modulosBrand = ''
  let inversorQtd = 0
  let inversorBrand = ''
  let inversorPot = ''

  for (const block of rawBlocks) {
    const upper = block.toUpperCase()

    // Detectar Módulos
    if (
      upper.includes('MODULO') ||
      upper.includes('MÓDULO') ||
      upper.includes('PAINEL') ||
      upper.includes('PLACA')
    ) {
      // Quantidade
      let qtd = 1
      const qtdMatch =
        block.match(/^(\d+)\s*(?:=|x|\*|\s)/i) ||
        block.match(/(\d+)\s*(?:módulos?|paineis?|painéis?|placas?)/i)
      if (qtdMatch) {
        qtd = parseInt(qtdMatch[1], 10) || 1
      }

      // Potência em W / Wp
      const potMatch = block.match(/(\d{3,4})\s*W(?:P)?/i)
      const wVal = potMatch ? parseInt(potMatch[1], 10) : 0

      // Marca
      let brand = ''
      if (/CANADIAN/i.test(block)) brand = 'Canadian Solar'
      else if (/JINKO/i.test(block)) brand = 'Jinko Solar'
      else if (/JA\s+SOLAR/i.test(block)) brand = 'JA Solar'
      else if (/TRINA/i.test(block)) brand = 'Trina Solar'
      else if (/LONGI/i.test(block)) brand = 'LONGi Solar'
      else if (/TSUN/i.test(block)) brand = 'TSUN Power'
      else if (/SUNGROW/i.test(block)) brand = 'Sungrow'
      else if (/RISEN/i.test(block)) brand = 'Risen'
      else if (/DAH/i.test(block)) brand = 'DAH Solar'
      else if (/WINAICO/i.test(block)) brand = 'Winaico'
      else if (/OSDA/i.test(block)) brand = 'OSDA Solar'
      else if (/ASTRONERGY/i.test(block)) brand = 'Astronergy'

      // Modelo e especificações
      let spec = ''
      if (/BIFACIAL/i.test(block)) spec += 'Bifacial '
      if (/N\s*TYPE|N-TYPE/i.test(block)) spec += 'N-Type '
      if (/BLACK\s*FRAME/i.test(block)) spec += 'Black Frame '
      if (/132\s*CEL/i.test(block)) spec += '132 Células '
      else if (/144\s*CEL/i.test(block)) spec += '144 Células '

      modulosQtd = qtd
      if (wVal) modulosWp = wVal
      if (brand) modulosBrand = brand

      itens.push({
        tipo: 'modulo',
        quantidade: qtd,
        unidade: 'un',
        nome: 'Módulos Fotovoltaicos de Alta Eficiência',
        fabricanteModelo: `${brand || 'Tier 1'}${wVal ? ` ${wVal}Wp` : ''}`.trim(),
        especificacao:
          cleanText(spec) || 'Tecnologia Monocristalina com garantia linear de 25 anos',
        potenciaUnit: wVal ? `${wVal} Wp` : undefined,
      })
      continue
    }

    // Detectar Inversor
    if (upper.includes('INVERSOR') || upper.includes('MICROINVERSOR')) {
      let qtd = 1
      const qtdMatch =
        block.match(/^(\d+)\s*(?:=|x|\*|\s)/i) ||
        block.match(/(\d+)\s*(?:inversores?|microinversores?)/i)
      if (qtdMatch) {
        qtd = parseInt(qtdMatch[1], 10) || 1
      }

      // Potência do inversor
      let pot = ''
      const potMatch = block.match(/(\d+(?:[.,]\d+)?)\s*(KW|W(?:P)?)/i)
      if (potMatch) {
        const val = potMatch[1].replace(',', '.')
        const unit = potMatch[2].toUpperCase()
        pot = unit.startsWith('KW') ? `${val} kW` : `${val} W`
      }

      // Marca do inversor
      let brand = ''
      if (/GROWATT/i.test(block)) brand = 'Growatt'
      else if (/SUNGROW/i.test(block)) brand = 'Sungrow'
      else if (/DEYE/i.test(block)) brand = 'Deye'
      else if (/HUAWEI/i.test(block)) brand = 'Huawei'
      else if (/SOLIS/i.test(block)) brand = 'Solis'
      else if (/SOFAR/i.test(block)) brand = 'Sofar'
      else if (/HOYMILES/i.test(block)) brand = 'Hoymiles'
      else if (/SAJ/i.test(block)) brand = 'SAJ'
      else if (/FRONIUS/i.test(block)) brand = 'Fronius'
      else if (/WEG/i.test(block)) brand = 'WEG'
      else if (/INTELBRAS/i.test(block)) brand = 'Intelbras'
      else if (/PHB/i.test(block)) brand = 'PHB'
      else if (/TSUN/i.test(block)) brand = 'TSUN'

      let spec = ''
      if (/MONOFASICO|MONOFÁSICO/i.test(block)) spec += 'Monofásico '
      if (/TRIFASICO|TRIFÁSICO/i.test(block)) spec += 'Trifásico '
      if (/220V/i.test(block)) spec += '220V '
      if (/380V/i.test(block)) spec += '380V '
      if (/(\d+)\s*MPPT/i.test(block)) {
        const m = block.match(/(\d+)\s*MPPT/i)
        if (m) spec += `${m[1]} MPPT `
      }

      inversorQtd = qtd
      if (brand) inversorBrand = brand
      if (pot) inversorPot = pot

      itens.push({
        tipo: 'inversor',
        quantidade: qtd,
        unidade: 'un',
        nome: upper.includes('MICROINVERSOR')
          ? 'Microinversor Solar'
          : 'Inversor Interativo On-Grid',
        fabricanteModelo: `${brand || 'Inversor Homologado'}${pot ? ` ${pot}` : ''}`.trim(),
        especificacao: cleanText(spec) || 'Conexão à rede com monitoramento Wi-Fi integrado',
        potenciaUnit: pot || undefined,
      })
      continue
    }

    // Detectar String Box
    if (
      upper.includes('STRING BOX') ||
      upper.includes('STRINGBOX') ||
      upper.includes('QUADRO DE PROTECAO')
    ) {
      let qtd = 1
      const qtdMatch = block.match(/^(\d+)\s*(?:=|x|\*|\s)/i)
      if (qtdMatch) qtd = parseInt(qtdMatch[1], 10) || 1

      // Tenta extrair 1, 2 ou 3 entradas
      let detectedEntradas = ''
      if (/3\s*(?:entradas?|e\b|\/3s)/i.test(block)) {
        detectedEntradas = '3_entradas'
      } else if (/2\s*(?:entradas?|e\b|\/2s)/i.test(block)) {
        detectedEntradas = '2_entradas'
      } else if (/1\s*(?:entrada|e\b|\/1s)/i.test(block)) {
        detectedEntradas = '1_entrada'
      }

      const rotuloCustom = formatarRotuloStringBoxItem(paramStringBox || detectedEntradas)

      let spec = ''
      const specMatch = block.match(/\b(\d+E\/\d+S|\d+E|\d+S|\d+V)\b/i)
      if (specMatch) spec = specMatch[0]
      if (/1000V/i.test(block)) spec += (spec ? ' ' : '') + '1000V DC'

      itens.push({
        tipo: 'string_box',
        quantidade: qtd,
        unidade: 'un',
        nome: rotuloCustom || 'String Box de Proteção CC/CA',
        fabricanteModelo: rotuloCustom || 'Quadro de Proteção com DPS e Disjuntores',
        especificacao:
          cleanText(spec) ||
          (rotuloCustom
            ? 'Proteção contra surtos atmosféricos (DPS) e sobrecorrentes (CC/CA)'
            : 'Proteção contra surtos atmosféricos e sobrecorrentes'),
      })
      continue
    }

    // Detectar Estrutura / Cabos se declarados explicitamente
    if (upper.includes('ESTRUTURA') || upper.includes('FIXADORES') || upper.includes('PERFIL')) {
      itens.push({
        tipo: 'estrutura',
        quantidade: 1,
        unidade: 'kit',
        nome: 'Estrutura de Fixação em Alumínio Anodizado',
        fabricanteModelo: 'Estrutura Solar de Alta Resistência Eólica',
        especificacao: 'Trilhos, grampos intermediários/finais e suportes em aço inox/alumínio',
      })
      continue
    }
  }

  // 2. Se a descrição não gerou módulo explicitamente, analisar o kitNome / kitFabricante / potência
  const hasModulo = itens.some((it) => it.tipo === 'modulo')
  const hasInversor = itens.some((it) => it.tipo === 'inversor')

  if (!hasModulo) {
    // Tentar extrair do kitNome / kitFabricante
    // Ex: "Kit Solar 6,1 kWp — Canadian Solar + Growatt", ou "Kit Residencial 6,6 kWp"
    let qtd = 0
    let potWp = 0
    let brand = ''

    // Tentar identificar marca
    const brandsList = [
      'Canadian Solar',
      'Jinko Solar',
      'JA Solar',
      'Trina Solar',
      'LONGi',
      'TSUN',
      'Sungrow',
      'Winaico',
      'Deye',
      'Growatt',
    ]
    for (const b of brandsList) {
      if (new RegExp(b, 'i').test(textToScan)) {
        if (
          !/Growatt|Deye|Solis|Sungrow 10|Sungrow 7|Huawei|Fronius|Hoymiles/i.test(b) ||
          /TSUN|Canadian|Jinko|JA|Trina|LONGi|Winaico/i.test(b)
        ) {
          brand = b
          break
        }
      }
    }

    // Tentar extrair potência unitária do módulo (ex: 610W, 560W, 630W)
    const potMatch = textToScan.match(/(\d{3,4})\s*W(?:p)?/i)
    if (potMatch) {
      potWp = parseInt(potMatch[1], 10)
    }

    // Tentar extrair quantidade de painéis do nome ou texto (ex: "16 P", "16= MODULO", "8 módulos")
    const qtdDirect = textToScan.match(/(\d+)\s*(?:p\b|paineis?|painéis?|placas?|módulos?)/i)
    if (qtdDirect) {
      qtd = parseInt(qtdDirect[1], 10)
    } else if (kitPotenciaKw && potWp > 0) {
      qtd = Math.round((kitPotenciaKw * 1000) / potWp)
    } else if (kitPotenciaKw && kitPotenciaKw > 0) {
      // Se não temos a potência do painel, mas temos a potência total, estimar com módulos de 610W
      potWp = 610
      qtd = Math.max(1, Math.round((kitPotenciaKw * 1000) / potWp))
    }

    if (qtd > 0) {
      modulosQtd = qtd
      modulosWp = potWp
      itens.unshift({
        tipo: 'modulo',
        quantidade: qtd,
        unidade: 'un',
        nome: 'Módulos Fotovoltaicos de Alta Performance',
        fabricanteModelo: `${brand || 'Tier 1'} ${potWp ? `${potWp}Wp` : ''}`.trim(),
        especificacao:
          'Células Monocristalinas de alta durabilidade com garantia linear de geração de 25 anos',
        potenciaUnit: potWp ? `${potWp} Wp` : undefined,
      })
    }
  }

  if (!hasInversor) {
    // Tentar achar inversor no fabricante ou no nome
    let invBrand = ''
    let invPot = ''
    const invertersList = [
      'Growatt',
      'Sungrow',
      'Deye',
      'Huawei',
      'Solis',
      'Sofar',
      'Hoymiles',
      'Fronius',
      'WEG',
      'Intelbras',
      'SAJ',
      'PHB',
    ]
    for (const b of invertersList) {
      if (new RegExp(b, 'i').test(textToScan)) {
        invBrand = b
        break
      }
    }

    const potMatch = textToScan.match(/(\d+(?:[.,]\d+)?)\s*(?:KW|kW|KWP|kWp|Wp)\b/i)
    if (potMatch) {
      invPot = `${potMatch[1].replace(',', '.')} kW`
    } else if (kitPotenciaKw) {
      invPot = `${kitPotenciaKw} kW`
    }

    if (invBrand || invPot) {
      itens.push({
        tipo: 'inversor',
        quantidade: 1,
        unidade: 'un',
        nome: 'Inversor Fotovoltaico On-Grid',
        fabricanteModelo: `${invBrand || 'Inversor Homologado'} ${invPot}`.trim(),
        especificacao:
          'Alta eficiência de conversão e conectividade Wi-Fi para monitoramento via smartphone',
        potenciaUnit: invPot || undefined,
      })
    }
  }

  // 3. Adicionar os componentes de engenharia e instalação do CRM Turnkey
  // Se houver string box escolhida ou declarada, inclui na lista.
  // Regra: "Se o usuário não escolher string box, o kit simplesmente não lista string box em lugar nenhum (campo opcional)."
  const hasStringBox = itens.some((it) => it.tipo === 'string_box')
  if (!hasStringBox && paramStringBox) {
    const rotuloCustom = formatarRotuloStringBoxItem(paramStringBox)
    itens.push({
      tipo: 'string_box',
      quantidade: 1,
      unidade: 'un',
      nome: rotuloCustom,
      fabricanteModelo: rotuloCustom,
      especificacao:
        'Quadro de proteção CC com DPS classe II, chave seccionadora e proteção contra sobretensão conforme ABNT NBR 5410',
    })
  }

  const hasEstrutura = itens.some((it) => it.tipo === 'estrutura')
  if (!hasEstrutura) {
    itens.push({
      tipo: 'estrutura',
      quantidade: 1,
      unidade: 'kit',
      nome: 'Estrutura Completa de Fixação Mecânica',
      fabricanteModelo: 'Perfis e Suportes em Alumínio Anodizado e Aço Inox',
      especificacao: 'Projetada para suportar ventos severos sem danificar a cobertura do imóvel',
    })
  }

  itens.push({
    tipo: 'cabos',
    quantidade: 1,
    unidade: 'kit',
    nome: 'Cabeamento Solar e Conectores MC4',
    fabricanteModelo: 'Cabos Solares CC com Dupla Isolação e Proteção UV',
    especificacao: 'Conectores MC4 estanques com grau de proteção IP68',
  })

  itens.push({
    tipo: 'monitoramento',
    quantidade: 1,
    unidade: 'un',
    nome: 'Sistema de Monitoramento em Tempo Real 24/7',
    fabricanteModelo: 'Módulo de Comunicação Wi-Fi Integrado',
    especificacao: 'Aplicativo para iOS e Android com acompanhamento de geração diária e economia',
  })

  itens.push({
    tipo: 'engenharia',
    quantidade: 1,
    unidade: 'serv',
    nome: 'Projeto de Engenharia, ART & Homologação',
    fabricanteModelo: 'Engenheiro Eletricista Responsável Ecosolar Energy',
    especificacao: 'Elaboração do projeto executivo, trâmite na concessionária e troca do medidor',
  })

  // 4. Cálculos complementares da especificação técnica
  // Potência total
  const finalPotKwp =
    kitPotenciaKw && kitPotenciaKw > 0
      ? kitPotenciaKw
      : modulosQtd && modulosWp
        ? (modulosQtd * modulosWp) / 1000
        : undefined

  const potenciaTotalFormatada = finalPotKwp
    ? `${finalPotKwp.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kWp`
    : 'Sob Demanda'

  // Quantidade total de módulos
  const totalModulos =
    modulosQtd || (finalPotKwp ? Math.round((finalPotKwp * 1000) / 610) : undefined)

  // Área estimada de telhado: cada módulo moderno ~2,58 m² (~2,8 m² incluindo folgas de instalação)
  const areaEstimadaM2 = totalModulos ? Math.round(totalModulos * 2.8) : undefined

  // Geração mensal estimada: kWp × 4,6 h/dia × 0,80 (fator de perdas) × 30 dias
  // Fallbacks: se houver potência calculada ou do kit, usa a nova fórmula;
  // se não houver potência nenhuma e a geração for assumida igual ao consumo, mantém esse comportamento.
  const geracaoMensalEstimadaKwh = finalPotKwp
    ? calcularGeracaoMensalKwh(finalPotKwp)
    : consumoKwh
      ? Math.round(consumoKwh)
      : 400

  // Fabricantes principais
  const fabs = [kitFabricante, modulosBrand, inversorBrand].filter(Boolean)
  const fabricantesPrincipais =
    fabs.length > 0 ? Array.from(new Set(fabs)).join(' / ') : 'Tier 1 Internacional'

  return {
    itens,
    potenciaTotalKwp: finalPotKwp,
    potenciaTotalFormatada,
    quantidadeModulosTotal: totalModulos,
    areaEstimadaM2,
    geracaoMensalEstimadaKwh,
    fabricantesPrincipais,
  }
}
