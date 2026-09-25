import type { Kit } from '@/types/crm'
import { extrairComponentesKit } from './quickKitUtils'
import type { GeminiInstalacaoTipo } from '@/services/geminiImage'

export interface KitPromptInfo {
  tipoInstalacao: GeminiInstalacaoTipo
  rotuloInstalacao: string
  descricaoCenario: string
  promptIngles: string
  promptResumoPt: string
}

/**
 * Mapeia o tipo de estrutura do kit ou dados de texto para o tipo de instalação compatível:
 * - Residencial (telhados coloniais, cerâmicos, fibrocimento, residências)
 * - Comercial (galpão industrial, mini trilho metálico, coberturas comerciais)
 * - Carport (garagem solar, estacionamento coberto com módulos)
 * - Rural (solo monoposte, solo usina, propriedades rurais)
 */
export function inferirTipoInstalacaoKit(kit: Partial<Kit>): {
  tipo: GeminiInstalacaoTipo
  rotulo: string
} {
  const est = (kit.tipo_estrutura || '').toLowerCase()
  const nome = (kit.nome || '').toLowerCase()
  const desc = (kit.descricao || '').toLowerCase()
  const full = `${est} ${nome} ${desc}`

  if (full.includes('carport') || full.includes('garagem') || full.includes('estacionamento')) {
    return { tipo: 'carport', rotulo: 'Carport Solar (Garagem)' }
  }

  if (
    full.includes('solo') ||
    full.includes('monoposte') ||
    full.includes('rural') ||
    full.includes('fazenda') ||
    full.includes('chácara') ||
    full.includes('sitio')
  ) {
    return { tipo: 'rural', rotulo: 'Rural / Solo Monoposte' }
  }

  if (
    full.includes('mini_trilho') ||
    full.includes('mini trilho') ||
    full.includes('galpão') ||
    full.includes('comercial') ||
    full.includes('industrial') ||
    full.includes('trapezoidal') ||
    full.includes('metálico') ||
    full.includes('metalico') ||
    (Number(kit.potencia_kw) || 0) >= 20
  ) {
    return { tipo: 'comercial', rotulo: 'Comércio / Galpão Metálico' }
  }

  // Padrão: telhado residencial (fibrocimento, telha cerâmica, etc.)
  return { tipo: 'residencial', rotulo: 'Telhado Residencial' }
}

/**
 * Constrói o prompt fotorrealista profissional para geração de imagem por IA do kit solar
 * Rigorosamente sem textos, sem números sobrepostos, com composição arquitetônica limpa.
 */
export function construirPromptImagemKit(kit: Partial<Kit>): KitPromptInfo {
  const comp = extrairComponentesKit(kit)
  const kwp = Number(kit.potencia_kw) || (comp.qtdPaineis * comp.potenciaPainelW) / 1000 || 5.0
  const kwpFormatado = kwp.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })

  const marcaPainel = kit.marca_painel || comp.marcaPaineis || 'Tier-1'
  const marcaInversor = kit.marca_inversor || comp.marcaInversor || 'premium inverter'
  const qtdPaineis =
    comp.qtdPaineis || Math.max(4, Math.round((kwp * 1000) / (comp.potenciaPainelW || 600)))
  const potW = comp.potenciaPainelW || 600

  const { tipo, rotulo } = inferirTipoInstalacaoKit(kit)

  let cenarioPrompt = ''
  let resumoPt = ''

  if (tipo === 'residencial') {
    cenarioPrompt = `Ultra-realistic architectural exterior photograph of a high-end Brazilian residential house featuring a clean solar photovoltaic system on ceramic clay tile rooftop. An array of exactly ${qtdPaineis} sleek dark monocrystalline solar panels (${marcaPainel} style, ${potW}W high-efficiency) perfectly aligned on aluminum rails. Warm sunny Brazilian day, soft blue sky, tropical garden with palm trees, modern architecture, premium estate setting, inverter unit (${marcaInversor}) discreetly mounted on a shaded exterior wall with neat conduit.`
    resumoPt = `Telhado residencial com ${qtdPaineis} painéis ${marcaPainel} (${kwpFormatado} kWp) e inversor ${marcaInversor}`
  } else if (tipo === 'comercial') {
    cenarioPrompt = `Professional architectural aerial drone shot of a large Brazilian commercial warehouse or enterprise rooftop with a clean solar photovoltaic power plant. High-efficiency photovoltaic array with ${qtdPaineis} black modules (${marcaPainel}) mounted on corrugated metal roof with specialized rails. Commercial solar inverters (${marcaInversor}) neatly installed in electrical protection housing. Clear morning sunlight, sharp industrial engineering, vibrant sunny sky.`
    resumoPt = `Cobertura comercial/industrial com ${qtdPaineis} módulos ${marcaPainel} (${kwpFormatado} kWp) e inversor ${marcaInversor}`
  } else if (tipo === 'carport') {
    cenarioPrompt = `High-end architectural photograph of a modern engineered solar carport parking structure in Brazil. Robust dark metallic steel frame supporting a canopy made of ${qtdPaineis} sleek monocrystalline solar modules (${marcaPainel}, ${potW}W). Shaded parking spaces underneath with clean pavement, sunny day with bright daylight reflections on panel glass, modern commercial inverter by ${marcaInversor} on support column, premium Brazilian architecture.`
    resumoPt = `Carport solar (estacionamento) com ${qtdPaineis} painéis ${marcaPainel} (${kwpFormatado} kWp) e estrutura metálica`
  } else {
    // rural / solo
    cenarioPrompt = `Breathtaking wide-angle landscape photograph of a ground-mounted solar farm on a Brazilian rural farm estate. Sturdy galvanized steel monopost ground-mounting structures supporting ${qtdPaineis} dark solar panels (${marcaPainel}) aligned facing the sun. Brazilian rural countryside scenery, green pasture, golden sunny daylight, clear blue sky, central solar inverter by ${marcaInversor} mounted on concrete pedestal.`
    resumoPt = `Usina de solo rural com ${qtdPaineis} painéis ${marcaPainel} em estrutura monoposte (${kwpFormatado} kWp)`
  }

  const promptIngles = `${cenarioPrompt} Professional commercial solar photography, 8k resolution, crisp architectural details, high dynamic range, no text, no words, no prices, no numbers overlaid, pristine photorealistic finish.`

  return {
    tipoInstalacao: tipo,
    rotuloInstalacao: rotulo,
    descricaoCenario: cenarioPrompt,
    promptIngles,
    promptResumoPt: resumoPt,
  }
}
