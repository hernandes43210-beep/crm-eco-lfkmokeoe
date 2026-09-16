import officialLogoPng from '@/assets/a-613c6.png'
import type { Kit } from '@/types/crm'
import {
  extrairComponentesKit,
  formatarPotenciaW,
  formatarPotenciaKw,
  formatarRotuloEstrutura,
} from '@/lib/quickKitUtils'

export type MarketingImageFormat = 'square' | 'story'

export interface KitMarketingDetails {
  nomeComercial: string
  paineisLinha: string
  inversorLinha: string
  estruturaLinha: string
  potenciaTotalLinha?: string
  slogan: string
}

export const SLOGAN_ECOSOLAR = 'A ENERGIA DO FUTURO, HOJE!'

/**
 * Extrai e formata os textos técnicos e comerciais do kit para a arte de marketing
 */
export function formatarDadosMarketingKit(kit: Partial<Kit>): KitMarketingDetails {
  // Nome comercial real exatamente como cadastrado no kit
  const nomeComercial = (kit.nome || '').trim() || 'Kit Solar Fotovoltaico'

  const componentes = extrairComponentesKit(kit)

  // 1. Painéis: marca + potência em W (ex: "TSUN POWER 630 W" ou com quantidade se disponível)
  const marcaPainel = (kit.marca_painel || componentes.marcaPaineis || '').trim()
  const potPainelW = kit.potencia_painel_w || componentes.potenciaPainelW
  const potPainelTexto = potPainelW ? formatarPotenciaW(potPainelW, 'W') : ''

  let paineisLinha = ''
  if (marcaPainel && potPainelTexto) {
    paineisLinha = `${marcaPainel} ${potPainelTexto}`
  } else if (marcaPainel) {
    paineisLinha = marcaPainel
  } else if (potPainelTexto) {
    paineisLinha = `Módulos Fotovoltaicos ${potPainelTexto}`
  } else {
    paineisLinha = 'Módulos Fotovoltaicos de Alta Eficiência'
  }

  // 2. Inversor: marca + potência em kW com vírgula decimal pt-BR (ex: "Sungrow 7,5 kW")
  const marcaInversor = (kit.marca_inversor || componentes.marcaInversor || '').trim()
  const potInversorKw = kit.potencia_inversor_kw ?? componentes.potenciaInversorKw
  const potInversorTexto = potInversorKw ? formatarPotenciaKw(potInversorKw) : ''

  let inversorLinha = ''
  if (marcaInversor && potInversorTexto) {
    inversorLinha = `${marcaInversor} ${potInversorTexto}`
  } else if (marcaInversor) {
    inversorLinha = marcaInversor
  } else if (potInversorTexto) {
    inversorLinha = `Inversor Solar ${potInversorTexto}`
  } else {
    inversorLinha = 'Inversor Solar Homologado'
  }

  // 3. Estrutura usada: Solo monoposte / Mini trilho / Fibrocimento / etc.
  const tipoEstruturaBruto = kit.tipo_estrutura || componentes.tipoEstrutura || ''
  const estruturaFormatada = formatarRotuloEstrutura(tipoEstruturaBruto)
  const estruturaLinha = estruturaFormatada || 'Estrutura Completa de Fixação'

  // 4. Potência total pico formatada
  let potenciaTotalLinha = ''
  if (kit.potencia_kw && Number(kit.potencia_kw) > 0) {
    potenciaTotalLinha = `${Number(kit.potencia_kw).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })} kWp`
  }

  return {
    nomeComercial,
    paineisLinha,
    inversorLinha,
    estruturaLinha,
    potenciaTotalLinha,
    slogan: SLOGAN_ECOSOLAR,
  }
}

/**
 * Quebra um texto em linhas respeitando a largura máxima disponível no Canvas
 */
export function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => {
      if (!img.crossOrigin) {
        reject(new Error(`Falha ao carregar imagem: ${src.slice(0, 60)}`))
        return
      }
      const retryImg = new Image()
      retryImg.onload = () => resolve(retryImg)
      retryImg.onerror = (e) => reject(e)
      retryImg.src = src
    }
    img.src = src
  })
}

/**
 * Desenha o padrão geométrico solar sutil de fundo (grade e raios de sol)
 */
function drawGeometricBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Gradiente radial profundo (Dark Navy / Solar Slate)
  const bgGrad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.35,
    50,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.85,
  )
  bgGrad.addColorStop(0, '#0F261C') // Verde escuro floresta com profundidade
  bgGrad.addColorStop(0.45, '#0B1D28') // Azul petróleo escuro
  bgGrad.addColorStop(1, '#050D14') // Grafite / quase preto solar
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // Glow solar sutil no topo e no centro
  const sunGlow = ctx.createRadialGradient(width * 0.8, -50, 0, width * 0.8, -50, 650)
  sunGlow.addColorStop(0, 'rgba(245, 197, 24, 0.18)')
  sunGlow.addColorStop(0.5, 'rgba(11, 122, 91, 0.08)')
  sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = sunGlow
  ctx.fillRect(0, 0, width, height)

  // Grade sutil isométrica / técnica de painel solar
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)'
  ctx.lineWidth = 1.5

  const gridSize = 72
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // Linhas de raios solares dinâmicos no fundo (canto superior direito para o centro)
  ctx.strokeStyle = 'rgba(245, 197, 24, 0.04)'
  ctx.lineWidth = 2
  for (let angle = 0; angle < Math.PI / 2; angle += 0.12) {
    ctx.beginPath()
    ctx.moveTo(width, 0)
    ctx.lineTo(width - Math.cos(angle) * 1600, Math.sin(angle) * 1600)
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * Desenha uma caixa com cantos arredondados, preenchimento e borda
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillStyle?: string | CanvasGradient,
  strokeStyle?: string,
  lineWidth = 1,
) {
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  if (fillStyle) {
    ctx.fillStyle = fillStyle
    ctx.fill()
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle
    ctx.lineWidth = lineWidth
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * Gera o Canvas da imagem de marketing para o kit solar no formato solicitado.
 * Formatos:
 * - 'square': 1080 x 1080 px (Feed Instagram / LinkedIn / Facebook)
 * - 'story': 1080 x 1920 px (Stories Instagram / WhatsApp Status / Reels)
 */
export async function generateKitMarketingCanvas(
  kit: Partial<Kit>,
  format: MarketingImageFormat = 'square',
): Promise<HTMLCanvasElement> {
  const width = 1080
  const height = format === 'square' ? 1080 : 1920

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível inicializar o contexto 2D do Canvas')

  const details = formatarDadosMarketingKit(kit)

  // 1. Fundo institucional corporativo Ecosolar
  drawGeometricBackground(ctx, width, height)

  // Carregar logo oficial da Ecosolar
  let logoImg: HTMLImageElement | null = null
  try {
    logoImg = await loadImage(officialLogoPng)
  } catch (err) {
    console.warn('Não foi possível carregar a imagem oficial da logo:', err)
  }

  const marginX = 72
  const contentWidth = width - marginX * 2

  if (format === 'square') {
    // ==========================================
    // FORMATO 1:1 QUADRADO (1080 x 1080)
    // ==========================================

    // Moldura decorativa sutil
    drawRoundedRect(
      ctx,
      28,
      28,
      width - 56,
      height - 56,
      28,
      undefined,
      'rgba(245, 197, 24, 0.22)',
      2,
    )

    // Topo: Container da Logo em destaque sobre card limpo branco translúcido ou direto
    const headerY = 56
    const headerH = 150

    // Card elegante para logo e selo corporativo
    drawRoundedRect(
      ctx,
      marginX,
      headerY,
      contentWidth,
      headerH,
      22,
      'rgba(255, 255, 255, 0.04)',
      'rgba(255, 255, 255, 0.1)',
      1.5,
    )

    // Desenha a logo no lado esquerdo do header ou centralizada
    if (logoImg) {
      const logoH = 110
      const naturalAspect = (logoImg.naturalWidth || 1) / (logoImg.naturalHeight || 1)
      const logoW = Math.min(360, logoH * naturalAspect)
      ctx.drawImage(logoImg, marginX + 32, headerY + (headerH - logoH) / 2, logoW, logoH)
    } else {
      // Fallback em texto com as cores oficiais
      ctx.textAlign = 'left'
      ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText('ECO', marginX + 32, headerY + 90)
      const ecoW = ctx.measureText('ECO').width
      ctx.fillStyle = '#F5C518'
      ctx.fillText('SOLAR', marginX + 32 + ecoW, headerY + 90)
      const solW = ctx.measureText('SOLAR').width
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText(' ENERGY', marginX + 32 + ecoW + solW, headerY + 90)
    }

    // Selo da potência pico no canto direito do header
    if (details.potenciaTotalLinha) {
      const badgeW = 260
      const badgeH = 78
      const badgeX = marginX + contentWidth - badgeW - 24
      const badgeY = headerY + (headerH - badgeH) / 2

      // Card gradiente dourado/amarelo solar
      const potGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH)
      potGrad.addColorStop(0, '#F5C518')
      potGrad.addColorStop(1, '#D99B00')
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 16, potGrad)

      ctx.textAlign = 'center'
      ctx.fillStyle = '#0F172A'
      ctx.font = '800 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText('POTÊNCIA TOTAL', badgeX + badgeW / 2, badgeY + 28)

      ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(details.potenciaTotalLinha, badgeX + badgeW / 2, badgeY + 65)
    }

    // Seção Central 1: Nome comercial real do kit (com cálculo inteligente de tamanho de fonte)
    let currentY = 250
    const cardTitleY = currentY

    // Pílula verde com categoria / selo "KIT SOLAR HOMOLOGADO"
    const tagText = 'SISTEMA SOLAR FOTOVOLTAICO HOMOLOGADO'
    ctx.font = '800 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    const tagW = ctx.measureText(tagText).width + 36
    drawRoundedRect(
      ctx,
      marginX,
      cardTitleY,
      tagW,
      34,
      17,
      'rgba(11, 122, 91, 0.4)',
      '#0B7A5B',
      1.5,
    )
    ctx.textAlign = 'left'
    ctx.fillStyle = '#34D399'
    ctx.fillText(tagText, marginX + 18, cardTitleY + 23)

    currentY += 56

    // Nome Comercial Real
    ctx.textAlign = 'left'
    // Ajusta o tamanho de fonte conforme comprimento do nome
    const nomeLen = details.nomeComercial.length
    const fontSize = nomeLen > 65 ? 36 : nomeLen > 45 ? 42 : 50
    const lineHeight = fontSize * 1.22
    ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

    const titleLines = wrapCanvasText(ctx, details.nomeComercial, contentWidth)

    // Gradiente sutil dourado/branco para o título
    titleLines.forEach((line, idx) => {
      ctx.fillStyle = idx === 0 ? '#FFFFFF' : '#FDE68A'
      ctx.fillText(line, marginX, currentY + idx * lineHeight)
    })

    currentY += titleLines.length * lineHeight + 28

    // Seção Central 2: Cards dos Equipamentos e Estrutura
    // 3 blocos bem distribuídos
    const specCardsY = Math.max(currentY, 470)
    const cardTotalH = 370
    const itemCardH = 104
    const itemSpacing = 16

    const specs = [
      {
        icon: '☀️',
        label: 'MÓDULOS FOTOVOLTAICOS (PAINÉIS)',
        value: details.paineisLinha,
        accent: '#10B981', // Verde
      },
      {
        icon: '⚡',
        label: 'INVERSOR SOLAR',
        value: details.inversorLinha,
        accent: '#F5C518', // Amarelo
      },
      {
        icon: '🏗️',
        label: 'ESTRUTURA DE FIXAÇÃO',
        value: details.estruturaLinha,
        accent: '#38BDF8', // Azul
      },
    ]

    specs.forEach((item, index) => {
      const cardY = specCardsY + index * (itemCardH + itemSpacing)

      // Fundo escuro fosco com borda fina iluminada
      drawRoundedRect(
        ctx,
        marginX,
        cardY,
        contentWidth,
        itemCardH,
        18,
        'rgba(15, 23, 42, 0.75)',
        'rgba(255, 255, 255, 0.12)',
        1.5,
      )

      // Barra vertical colorida de destaque no canto esquerdo
      drawRoundedRect(ctx, marginX, cardY, 8, itemCardH, 4, item.accent)

      // Ícone em círculo escuro
      const iconCenterX = marginX + 48
      const iconCenterY = cardY + itemCardH / 2
      drawRoundedRect(
        ctx,
        iconCenterX - 26,
        iconCenterY - 26,
        52,
        52,
        26,
        'rgba(255, 255, 255, 0.08)',
        'rgba(255, 255, 255, 0.15)',
        1,
      )
      ctx.textAlign = 'center'
      ctx.font = '26px "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
      ctx.fillText(item.icon, iconCenterX, iconCenterY + 9)

      // Label pequeno uppercase
      const textX = marginX + 92
      ctx.textAlign = 'left'
      ctx.fillStyle = item.accent
      ctx.font = '800 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(item.label, textX, cardY + 36)

      // Valor grande e nítido
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

      // Se o valor for muito longo, quebra ou reduz
      const valW = ctx.measureText(item.value).width
      const maxValW = contentWidth - 120
      if (valW > maxValW) {
        ctx.font = '800 23px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }
      ctx.fillText(item.value, textX, cardY + 75)
    })

    // Rodapé Institucional com a Oferta de Valor da Marca
    const footerY = height - 142
    const footerH = 88

    // Card elegante dourado/verde para a oferta de valor
    const footerGrad = ctx.createLinearGradient(marginX, footerY, marginX + contentWidth, footerY)
    footerGrad.addColorStop(0, 'rgba(11, 122, 91, 0.85)')
    footerGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)')
    drawRoundedRect(
      ctx,
      marginX,
      footerY,
      contentWidth,
      footerH,
      20,
      footerGrad,
      'rgba(245, 197, 24, 0.5)',
      2,
    )

    // Oferta de valor no centro do card
    ctx.textAlign = 'center'
    ctx.fillStyle = '#F5C518'
    ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.letterSpacing = '1.5px'
    ctx.fillText(details.slogan, width / 2, footerY + 44)
    ctx.letterSpacing = '0px'

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('ECOSOLAR ENERGY • ENGENHARIA SOLAR DE ALTA PERFORMANCE', width / 2, footerY + 69)
  } else {
    // ==========================================
    // FORMATO 9:16 VERTICAL / STORY (1080 x 1920)
    // ==========================================

    // Moldura decorativa
    drawRoundedRect(
      ctx,
      32,
      32,
      width - 64,
      height - 64,
      36,
      undefined,
      'rgba(245, 197, 24, 0.22)',
      2,
    )

    // Topo do Story (respiro de status bar do Instagram ~120px)
    const headerY = 140

    // Card da Logo centralizada em destaque generoso
    const logoCardW = contentWidth
    const logoCardH = 210
    drawRoundedRect(
      ctx,
      marginX,
      headerY,
      logoCardW,
      logoCardH,
      28,
      'rgba(255, 255, 255, 0.04)',
      'rgba(255, 255, 255, 0.12)',
      2,
    )

    if (logoImg) {
      const logoH = 150
      const naturalAspect = (logoImg.naturalWidth || 1) / (logoImg.naturalHeight || 1)
      const logoW = Math.min(contentWidth - 60, logoH * naturalAspect)
      ctx.drawImage(logoImg, width / 2 - logoW / 2, headerY + (logoCardH - logoH) / 2, logoW, logoH)
    } else {
      ctx.textAlign = 'center'
      ctx.font = '900 54px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText('ECOSOLAR ENERGY', width / 2, headerY + 120)
    }

    // Selo de Potência Total no Story (card dourado largo no centro)
    let curStoryY = headerY + logoCardH + 40
    if (details.potenciaTotalLinha) {
      const pBadgeW = 440
      const pBadgeH = 110
      const pBadgeX = width / 2 - pBadgeW / 2

      const badgeGrad = ctx.createLinearGradient(
        pBadgeX,
        curStoryY,
        pBadgeX + pBadgeW,
        curStoryY + pBadgeH,
      )
      badgeGrad.addColorStop(0, '#F5C518')
      badgeGrad.addColorStop(1, '#D99B00')
      drawRoundedRect(ctx, pBadgeX, curStoryY, pBadgeW, pBadgeH, 24, badgeGrad)

      ctx.textAlign = 'center'
      ctx.fillStyle = '#0F172A'
      ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText('POTÊNCIA TOTAL DO KIT', width / 2, curStoryY + 36)

      ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(details.potenciaTotalLinha, width / 2, curStoryY + 88)

      curStoryY += pBadgeH + 48
    }

    // Tag descritiva
    const tagStory = 'SISTEMA SOLAR FOTOVOLTAICO HOMOLOGADO'
    ctx.font = '800 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    const tagStoryW = ctx.measureText(tagStory).width + 42
    drawRoundedRect(
      ctx,
      width / 2 - tagStoryW / 2,
      curStoryY,
      tagStoryW,
      40,
      20,
      'rgba(11, 122, 91, 0.45)',
      '#0B7A5B',
      1.5,
    )
    ctx.textAlign = 'center'
    ctx.fillStyle = '#34D399'
    ctx.fillText(tagStory, width / 2, curStoryY + 26)

    curStoryY += 60

    // Card do Nome Comercial Real com visual premium
    const titleFontSize = details.nomeComercial.length > 55 ? 44 : 52
    const titleLineHeight = titleFontSize * 1.25
    ctx.font = `900 ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

    const linesStory = wrapCanvasText(ctx, details.nomeComercial, contentWidth - 40)
    const nameCardH = linesStory.length * titleLineHeight + 64

    drawRoundedRect(
      ctx,
      marginX,
      curStoryY,
      contentWidth,
      nameCardH,
      24,
      'rgba(15, 23, 42, 0.75)',
      'rgba(245, 197, 24, 0.35)',
      2,
    )

    ctx.textAlign = 'center'
    linesStory.forEach((l, idx) => {
      ctx.fillStyle = idx === 0 ? '#FFFFFF' : '#FDE68A'
      ctx.fillText(l, width / 2, curStoryY + 54 + idx * titleLineHeight)
    })

    curStoryY += nameCardH + 48

    // Cards dos Equipamentos no Story (mais altos e impactantes)
    const storySpecs = [
      {
        icon: '☀️',
        label: 'MÓDULOS FOTOVOLTAICOS (PAINÉIS)',
        value: details.paineisLinha,
        accent: '#10B981',
      },
      {
        icon: '⚡',
        label: 'INVERSOR SOLAR',
        value: details.inversorLinha,
        accent: '#F5C518',
      },
      {
        icon: '🏗️',
        label: 'ESTRUTURA DE FIXAÇÃO',
        value: details.estruturaLinha,
        accent: '#38BDF8',
      },
    ]

    const storyCardH = 130
    const storySpacing = 24

    storySpecs.forEach((item, index) => {
      const cardY = curStoryY + index * (storyCardH + storySpacing)

      drawRoundedRect(
        ctx,
        marginX,
        cardY,
        contentWidth,
        storyCardH,
        22,
        'rgba(15, 23, 42, 0.85)',
        'rgba(255, 255, 255, 0.12)',
        1.5,
      )

      // Barra vertical
      drawRoundedRect(ctx, marginX, cardY, 10, storyCardH, 5, item.accent)

      // Ícone
      const iconCenterX = marginX + 60
      const iconCenterY = cardY + storyCardH / 2
      drawRoundedRect(
        ctx,
        iconCenterX - 34,
        iconCenterY - 34,
        68,
        68,
        34,
        'rgba(255, 255, 255, 0.08)',
        'rgba(255, 255, 255, 0.15)',
        1,
      )
      ctx.textAlign = 'center'
      ctx.font = '32px "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
      ctx.fillText(item.icon, iconCenterX, iconCenterY + 11)

      // Textos
      const textX = marginX + 116
      ctx.textAlign = 'left'
      ctx.fillStyle = item.accent
      ctx.font = '800 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(item.label, textX, cardY + 44)

      ctx.fillStyle = '#FFFFFF'
      ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      const textW = ctx.measureText(item.value).width
      if (textW > contentWidth - 140) {
        ctx.font = '800 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }
      ctx.fillText(item.value, textX, cardY + 92)
    })

    // Rodapé de Oferta de Valor no Story
    const storyFooterY = height - 260
    const storyFooterH = 140

    const storyFooterGrad = ctx.createLinearGradient(
      marginX,
      storyFooterY,
      marginX + contentWidth,
      storyFooterY,
    )
    storyFooterGrad.addColorStop(0, 'rgba(11, 122, 91, 0.95)')
    storyFooterGrad.addColorStop(1, 'rgba(15, 23, 42, 0.98)')
    drawRoundedRect(
      ctx,
      marginX,
      storyFooterY,
      contentWidth,
      storyFooterH,
      26,
      storyFooterGrad,
      'rgba(245, 197, 24, 0.6)',
      2.5,
    )

    ctx.textAlign = 'center'
    ctx.fillStyle = '#F5C518'
    ctx.font = '900 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.letterSpacing = '2px'
    ctx.fillText(details.slogan, width / 2, storyFooterY + 58)
    ctx.letterSpacing = '0px'

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.font = '800 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(
      'ECOSOLAR ENERGY • ENGENHARIA SOLAR DE ALTA PERFORMANCE',
      width / 2,
      storyFooterY + 98,
    )

    ctx.fillStyle = '#94A3B8'
    ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('Solicite seu estudo de viabilidade gratuito', width / 2, storyFooterY + 124)
  }

  return canvas
}

/**
 * Converte o canvas para Blob PNG
 */
export async function getCanvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Erro ao converter o canvas em imagem PNG'))
    }, 'image/png')
  })
}

/**
 * Dispara o download imediato da imagem de marketing gerada
 */
export function downloadMarketingImage(
  canvas: HTMLCanvasElement,
  filename = 'ecosolar-kit-marketing.png',
) {
  const url = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * Monta o texto promocional do kit pronto para envio no WhatsApp
 */
export function gerarTextoWhatsAppMarketing(kit: Partial<Kit>): string {
  const details = formatarDadosMarketingKit(kit)

  const linhas = [
    `☀️⚡ *${details.nomeComercial.toUpperCase()}*`,
    `_${details.slogan}_`,
    '',
    `📌 *Módulos Fotovoltaicos:* ${details.paineisLinha}`,
    `⚡ *Inversor Solar:* ${details.inversorLinha}`,
    `🏗️ *Estrutura:* ${details.estruturaLinha}`,
  ]

  if (details.potenciaTotalLinha) {
    linhas.push(`🔋 *Potência Total:* ${details.potenciaTotalLinha}`)
  }

  if (kit.preco_venda && Number(kit.preco_venda) > 0) {
    const valorFormatado = Number(kit.preco_venda).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
    linhas.push(`💰 *Investimento:* ${valorFormatado}`)
  }

  linhas.push(
    '',
    '✅ Engenharia completa, homologação junto à concessionária e instalação inclusas!',
    '📲 Fale conosco para garantir as condições deste kit exclusivo da *Ecosolar Energy*.',
  )

  return linhas.join('\n')
}

/**
 * Dispara o compartilhamento no WhatsApp:
 * 1. Tenta Web Share API com o arquivo da imagem caso o navegador suporte
 * 2. Se não suportar anexo direto por API, baixa a imagem PNG e abre o wa.me com a legenda pronta
 */
export async function shareMarketingOnWhatsApp(
  canvas: HTMLCanvasElement,
  kit: Partial<Kit>,
  phone?: string,
): Promise<{ sharedViaApi: boolean }> {
  const details = formatarDadosMarketingKit(kit)
  const safeKitName = details.nomeComercial.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)
  const filename = `ecosolar-${safeKitName}.png`

  const blob = await getCanvasBlob(canvas)
  const file = new File([blob], filename, { type: 'image/png' })
  const caption = gerarTextoWhatsAppMarketing(kit)

  // Tenta compartilhar via Web Share API oficial se suportado com arquivo
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: details.nomeComercial,
        text: caption,
        files: [file],
      })
      return { sharedViaApi: true }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { sharedViaApi: true }
      }
      console.warn('Web Share API não concluiu, usando fallback com download e wa.me:', err)
    }
  }

  // Fallback: faz o download automático da imagem e abre a conversa do WhatsApp com o texto pronto
  downloadMarketingImage(canvas, filename)

  const rawPhone = (phone || '').replace(/\D/g, '')
  const waUrl = rawPhone
    ? `https://wa.me/55${rawPhone}?text=${encodeURIComponent(caption)}`
    : `https://wa.me/?text=${encodeURIComponent(caption)}`

  window.open(waUrl, '_blank')
  return { sharedViaApi: false }
}
