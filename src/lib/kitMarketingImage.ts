import { loadHorizontalLogoImage, getCleanHorizontalLogoCanvas } from '@/lib/logoUtils'
import { loadMascotImage, drawSupportMascotBadge } from '@/lib/mascotUtils'
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
  precoFormatado?: string
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

  // 1. Painéis: marca + potência em W (ex: "TSUN POWER 630 W")
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

  // 5. Preço formatado
  let precoFormatado = ''
  if (kit.preco_venda && Number(kit.preco_venda) > 0) {
    precoFormatado = Number(kit.preco_venda).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  return {
    nomeComercial,
    paineisLinha,
    inversorLinha,
    estruturaLinha,
    potenciaTotalLinha,
    precoFormatado,
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
 * Desenha uma caixa com cantos arredondados, preenchimento e borda
 */
export function drawRoundedRect(
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
 * Desenha o fundo hiper vibrante com:
 * - Gradiente vertical azul céu profundo -> laranja solar intenso -> amarelo ouro
 * - Explosão radial de raios solares alternados com opacidade
 * - Brilhos de energia central e lens flares
 * - Faíscas dinâmicas e partículas de luz solar
 */
export function drawVibrantSolarBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sunCenterX: number,
  sunCenterY: number,
) {
  ctx.save()

  // 1. Gradiente base do céu cósmico / solar ultra vibrante
  const baseGrad = ctx.createLinearGradient(0, 0, 0, height)
  baseGrad.addColorStop(0, '#071638') // Azul céu ultra profundo / espaço
  baseGrad.addColorStop(0.25, '#0B3D91') // Azul céu profundo da NASA
  baseGrad.addColorStop(0.5, '#1E90FF') // Azul elétrico brilhante
  baseGrad.addColorStop(0.72, '#FF4500') // Laranja avermelhado intenso
  baseGrad.addColorStop(0.88, '#FF6B00') // Laranja solar puro
  baseGrad.addColorStop(1, '#FF8C00') // Laranja âmbar vivo
  ctx.fillStyle = baseGrad
  ctx.fillRect(0, 0, width, height)

  // 2. Explosão de Raios de Sol Radiantes (Sunburst) irradiando do centro solar
  ctx.save()
  ctx.translate(sunCenterX, sunCenterY)
  const rayCount = 40
  const rayRadius = Math.max(width, height) * 1.5

  for (let i = 0; i < rayCount; i++) {
    const angle1 = (i * 2 * Math.PI) / rayCount
    const angle2 = ((i + 0.5) * 2 * Math.PI) / rayCount

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(angle1) * rayRadius, Math.sin(angle1) * rayRadius)
    ctx.lineTo(Math.cos(angle2) * rayRadius, Math.sin(angle2) * rayRadius)
    ctx.closePath()

    // Alternar raios com dourado intenso e laranja solar translúcido
    const rayGrad = ctx.createRadialGradient(0, 0, 40, 0, 0, rayRadius)
    if (i % 2 === 0) {
      rayGrad.addColorStop(0, 'rgba(255, 235, 59, 0.38)') // Amarelo sol puro
      rayGrad.addColorStop(0.35, 'rgba(255, 165, 0, 0.24)') // Âmbar
      rayGrad.addColorStop(0.7, 'rgba(255, 107, 0, 0.12)') // Laranja
      rayGrad.addColorStop(1, 'rgba(255, 69, 0, 0.0)')
    } else {
      rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)') // Brilho branco central
      rayGrad.addColorStop(0.4, 'rgba(255, 215, 0, 0.18)') // Dourado
      rayGrad.addColorStop(0.8, 'rgba(57, 255, 20, 0.06)') // Toque de verde neon no feixe
      rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    }
    ctx.fillStyle = rayGrad
    ctx.fill()
  }
  ctx.restore()

  // 3. Grande Aura / Núcleo Solar Central Brilhante (Sun Flare)
  const sunCore = ctx.createRadialGradient(
    sunCenterX,
    sunCenterY,
    0,
    sunCenterX,
    sunCenterY,
    width * 0.75,
  )
  sunCore.addColorStop(0, 'rgba(255, 255, 255, 0.95)') // Centro branco puro ofuscante
  sunCore.addColorStop(0.12, 'rgba(255, 245, 160, 0.85)') // Amarelo claro intenso
  sunCore.addColorStop(0.28, 'rgba(255, 215, 0, 0.65)') // Dourado brilhante
  sunCore.addColorStop(0.5, 'rgba(255, 107, 0, 0.42)') // Laranja solar
  sunCore.addColorStop(0.75, 'rgba(255, 69, 0, 0.15)')
  sunCore.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = sunCore
  ctx.fillRect(0, 0, width, height)

  // 4. Feixe horizontal e cruz de luz cósmica (Lens Flare anamórfico)
  const flareGradH = ctx.createLinearGradient(0, sunCenterY, width, sunCenterY)
  flareGradH.addColorStop(0, 'rgba(30, 144, 255, 0)')
  flareGradH.addColorStop(0.2, 'rgba(57, 255, 20, 0.2)') // Verde neon
  flareGradH.addColorStop(0.4, 'rgba(255, 215, 0, 0.55)')
  flareGradH.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)')
  flareGradH.addColorStop(0.6, 'rgba(255, 215, 0, 0.55)')
  flareGradH.addColorStop(0.8, 'rgba(255, 107, 0, 0.25)')
  flareGradH.addColorStop(1, 'rgba(255, 69, 0, 0)')

  ctx.fillStyle = flareGradH
  ctx.fillRect(0, sunCenterY - 14, width, 28)

  // Feixe vertical mais suave
  const flareGradV = ctx.createLinearGradient(sunCenterX, 0, sunCenterX, height)
  flareGradV.addColorStop(0, 'rgba(255, 255, 255, 0)')
  flareGradV.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)')
  flareGradV.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)')
  flareGradV.addColorStop(0.6, 'rgba(255, 215, 0, 0.3)')
  flareGradV.addColorStop(1, 'rgba(255, 107, 0, 0)')
  ctx.fillStyle = flareGradV
  ctx.fillRect(sunCenterX - 8, 0, 16, height)

  // 5. Partículas de energia e faíscas solares em posições estratégicas
  const sparks = [
    { x: width * 0.12, y: height * 0.18, r: 8, color: '#39FF14' }, // neon green
    { x: width * 0.88, y: height * 0.16, r: 12, color: '#FFD700' }, // gold
    { x: width * 0.18, y: height * 0.38, r: 6, color: '#FFFFFF' },
    { x: width * 0.82, y: height * 0.42, r: 10, color: '#39FF14' },
    { x: width * 0.08, y: height * 0.62, r: 9, color: '#FFD700' },
    { x: width * 0.92, y: height * 0.64, r: 11, color: '#FFFFFF' },
    { x: width * 0.15, y: height * 0.82, r: 7, color: '#FF8C00' },
    { x: width * 0.85, y: height * 0.84, r: 8, color: '#39FF14' },
    { x: width * 0.28, y: height * 0.22, r: 5, color: '#FFFFFF' },
    { x: width * 0.72, y: height * 0.24, r: 6, color: '#FFD700' },
  ]

  for (const s of sparks) {
    drawEnergySpark(ctx, s.x, s.y, s.r, s.color)
  }

  ctx.restore()
}

/**
 * Desenha uma faísca/estrela de 4 pontas com brilho intenso
 */
export function drawEnergySpark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
) {
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = radius * 2.5

  // Halo circular
  const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 2)
  halo.addColorStop(0, color)
  halo.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(x, y, radius * 2, 0, Math.PI * 2)
  ctx.fill()

  // Estrela de 4 pontas
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.moveTo(x, y - radius * 2)
  ctx.quadraticCurveTo(x, y, x + radius * 2, y)
  ctx.quadraticCurveTo(x, y, x, y + radius * 2)
  ctx.quadraticCurveTo(x, y, x - radius * 2, y)
  ctx.quadraticCurveTo(x, y, x, y - radius * 2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/**
 * Desenha raio gráfico elétrico de energia
 */
export function drawLightningBolt(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  scale = 1,
  angle = 0,
) {
  ctx.save()
  ctx.translate(startX, startY)
  ctx.rotate(angle)
  ctx.scale(scale, scale)

  // Glow neon
  ctx.shadowColor = '#39FF14'
  ctx.shadowBlur = 18

  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(16, 26)
  ctx.lineTo(8, 28)
  ctx.lineTo(24, 60)
  ctx.lineTo(-4, 32)
  ctx.lineTo(4, 30)
  ctx.closePath()

  // Gradiente do raio: Branco brilhante para Verde Neon / Dourado
  const boltGrad = ctx.createLinearGradient(0, 0, 20, 60)
  boltGrad.addColorStop(0, '#FFFFFF')
  boltGrad.addColorStop(0.4, '#FFD700')
  boltGrad.addColorStop(1, '#39FF14')
  ctx.fillStyle = boltGrad
  ctx.fill()

  ctx.lineWidth = 1.5
  ctx.strokeStyle = '#FFFFFF'
  ctx.stroke()

  ctx.restore()
}

/**
 * Desenha painéis solares fotovoltaicos brilhantes e impecáveis em perspectiva 3D
 * com células azuis profundas, barramentos prateados e reflexo de luz azulada/dourada
 */
export function drawGleamingSolarPanels(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  totalWidth: number,
  totalHeight: number,
) {
  ctx.save()

  const panelCount = 3
  const gap = 16
  const singleW = (totalWidth - (panelCount - 1) * gap) / panelCount
  const startX = centerX - totalWidth / 2
  const panelY = centerY - totalHeight / 2

  // Sombra de elevação dos painéis para efeito 3D flutuante
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)'
  ctx.shadowBlur = 32
  ctx.shadowOffsetY = 16
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.beginPath()
  ctx.roundRect(startX - 10, panelY + totalHeight - 14, totalWidth + 20, 36, 18)
  ctx.fill()
  ctx.restore()

  for (let p = 0; p < panelCount; p++) {
    const px = startX + p * (singleW + gap)
    const py = panelY

    // 1. Moldura de alumínio anodizado prateado com chanfro 3D
    const frameGrad = ctx.createLinearGradient(px, py, px + singleW, py + totalHeight)
    frameGrad.addColorStop(0, '#F1F5F9')
    frameGrad.addColorStop(0.2, '#CBD5E1')
    frameGrad.addColorStop(0.5, '#94A3B8')
    frameGrad.addColorStop(0.85, '#E2E8F0')
    frameGrad.addColorStop(1, '#64748B')

    ctx.save()
    ctx.shadowColor = 'rgba(30, 144, 255, 0.45)'
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.roundRect(px, py, singleW, totalHeight, 14)
    ctx.fillStyle = frameGrad
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#FFFFFF'
    ctx.stroke()
    ctx.restore()

    // 2. Vidro de silício monocristalino azul profundo reflexivo
    const innerMargin = 7
    const innerX = px + innerMargin
    const innerY = py + innerMargin
    const innerW = singleW - innerMargin * 2
    const innerH = totalHeight - innerMargin * 2

    const cellBg = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerH)
    cellBg.addColorStop(0, '#0F265C')
    cellBg.addColorStop(0.4, '#071638')
    cellBg.addColorStop(0.8, '#0B3D91')
    cellBg.addColorStop(1, '#051026')

    ctx.save()
    ctx.beginPath()
    ctx.roundRect(innerX, innerY, innerW, innerH, 8)
    ctx.fillStyle = cellBg
    ctx.fill()
    ctx.clip()

    // 3. Grid de células fotovoltaicas individuais (6 linhas x 3 colunas)
    const rows = 6
    const cols = 3
    const cellGap = 3
    const cellW = (innerW - (cols + 1) * cellGap) / cols
    const cellH = (innerH - (rows + 1) * cellGap) / rows

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = innerX + cellGap + c * (cellW + cellGap)
        const cy = innerY + cellGap + r * (cellH + cellGap)

        // Célula monocristalina chanfrada nos cantos
        const cellGrad = ctx.createLinearGradient(cx, cy, cx + cellW, cy + cellH)
        cellGrad.addColorStop(0, '#1E40AF')
        cellGrad.addColorStop(0.35, '#0B2D78')
        cellGrad.addColorStop(0.7, '#071A4A')
        cellGrad.addColorStop(1, '#030B1E')

        ctx.fillStyle = cellGrad
        ctx.fillRect(cx, cy, cellW, cellH)

        // Linhas de barramento finas prateadas dentro de cada célula (busbars)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'
        ctx.lineWidth = 1
        // 2 busbars verticais
        ctx.beginPath()
        ctx.moveTo(cx + cellW * 0.33, cy)
        ctx.lineTo(cx + cellW * 0.33, cy + cellH)
        ctx.moveTo(cx + cellW * 0.67, cy)
        ctx.lineTo(cx + cellW * 0.67, cy + cellH)
        ctx.stroke()

        // 3 fios condutores horizontais super finos
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(cx, cy + cellH * 0.25)
        ctx.lineTo(cx + cellW, cy + cellH * 0.25)
        ctx.moveTo(cx, cy + cellH * 0.5)
        ctx.lineTo(cx + cellW, cy + cellH * 0.5)
        ctx.moveTo(cx, cy + cellH * 0.75)
        ctx.lineTo(cx + cellW, cy + cellH * 0.75)
        ctx.stroke()
      }
    }

    // 4. Reflexo de luz diagonal reluzente (Glass Gloss Reflection)
    const glossGrad = ctx.createLinearGradient(innerX, innerY, innerX + innerW, innerY + innerH)
    glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)')
    glossGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.35)')
    glossGrad.addColorStop(0.35, 'rgba(100, 200, 255, 0.25)')
    glossGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)')
    glossGrad.addColorStop(0.7, 'rgba(255, 215, 0, 0.18)')
    glossGrad.addColorStop(0.85, 'rgba(255, 255, 255, 0.35)')
    glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)')

    ctx.beginPath()
    ctx.moveTo(innerX, innerY)
    ctx.lineTo(innerX + innerW * 0.7, innerY)
    ctx.lineTo(innerX + innerW * 0.3, innerY + innerH)
    ctx.lineTo(innerX, innerY + innerH)
    ctx.closePath()
    ctx.fillStyle = glossGrad
    ctx.fill()

    // Borda interna de vidro chanfrado
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 1
    ctx.strokeRect(innerX, innerY, innerW, innerH)

    ctx.restore()
  }

  // Brilho solar no canto superior do painel central
  drawEnergySpark(ctx, centerX - singleW * 0.3, panelY + 12, 12, '#FFFFFF')
  drawEnergySpark(ctx, centerX + totalWidth * 0.42, panelY + totalHeight * 0.3, 10, '#FFD700')

  ctx.restore()
}

/**
 * Desenha o Título 3D 'KITS SOLARES'
 * Letras brancas com contorno laranja vibrante, extrusão/sombra 3D profunda e efeito de brilho/glow
 */
export function draw3DTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  fontSize = 90,
) {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Arial Black", sans-serif`

  // 1. Grande Glow externo (Neon Laranja/Amarelo)
  ctx.save()
  ctx.shadowColor = '#FF6B00'
  ctx.shadowBlur = 36
  ctx.strokeStyle = '#FF8C00'
  ctx.lineWidth = 18
  ctx.strokeText(text, centerX, centerY)
  ctx.restore()

  // 2. Camadas de Extrusão 3D (sombra e profundidade descendente)
  const depth = Math.round(fontSize * 0.12)
  for (let i = depth; i >= 1; i--) {
    // Gradiente da extrusão: do vermelho escuro na base ao laranja vibrante perto do topo
    const t = i / depth
    const r = Math.round(180 + t * 75)
    const g = Math.round(20 + t * 80)
    const b = 0
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
    ctx.fillText(text, centerX, centerY + i)
  }

  // 3. Contorno Laranja Vibrante externo frontal
  ctx.save()
  ctx.lineWidth = Math.round(fontSize * 0.1)
  ctx.strokeStyle = '#FF4500'
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2
  ctx.strokeText(text, centerX, centerY)
  ctx.restore()

  // 4. Contorno Amarelo Dourado interno mais fino
  ctx.save()
  ctx.lineWidth = Math.round(fontSize * 0.05)
  ctx.strokeStyle = '#FFD700'
  ctx.lineJoin = 'round'
  ctx.strokeText(text, centerX, centerY)
  ctx.restore()

  // 5. Preenchimento Frontal com Gradiente Branco Puro -> Amarelo Claro reflexivo
  const frontGrad = ctx.createLinearGradient(
    centerX,
    centerY - fontSize / 2,
    centerX,
    centerY + fontSize / 2,
  )
  frontGrad.addColorStop(0, '#FFFFFF')
  frontGrad.addColorStop(0.48, '#FFFFFF')
  frontGrad.addColorStop(0.5, '#FFF4CC')
  frontGrad.addColorStop(0.85, '#FFE082')
  frontGrad.addColorStop(1, '#FFC107')
  ctx.fillStyle = frontGrad
  ctx.fillText(text, centerX, centerY)

  // 6. Toque de brilho especular branco no topo do texto
  ctx.save()
  ctx.shadowColor = '#FFFFFF'
  ctx.shadowBlur = 12
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.fillText(text, centerX, centerY - 2)
  ctx.restore()

  ctx.restore()
}

/**
 * Desenha a Etiqueta de Preço em Vermelho Vivo rotacionada com texto "PROMOÇÃO"
 * em estilo dinâmico com faíscas ao redor
 */
export function drawPromoBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width = 240,
  height = 68,
  angleRad = -0.16, // leve inclinação chamativa
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angleRad)

  // Sombra intensa do badge
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
  ctx.shadowBlur = 22
  ctx.shadowOffsetY = 8

  // Gradiente do Badge: Vermelho vivo flamejante (#FF1744 -> #D50000)
  const badgeGrad = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2)
  badgeGrad.addColorStop(0, '#FF1744')
  badgeGrad.addColorStop(0.5, '#E50914')
  badgeGrad.addColorStop(1, '#B70000')

  // Fita/Badge com corte estilizado
  ctx.beginPath()
  ctx.roundRect(-width / 2, -height / 2, width, height, 16)
  ctx.fillStyle = badgeGrad
  ctx.fill()

  // Borda amarela pontilhada ou dourada reluzente
  ctx.lineWidth = 3
  ctx.strokeStyle = '#FFD700'
  ctx.stroke()

  // Reseta sombra para texto nítido
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0

  // Borda interna decorativa
  ctx.beginPath()
  ctx.roundRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, 12)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Texto "PROMOÇÃO" em letras brancas maiúsculas em negrito com sombra preta
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font =
    '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Arial Black", sans-serif'
  ctx.letterSpacing = '3px'

  // Sombra preta do texto
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.fillText('★ PROMOÇÃO ★', 1, 2)

  // Texto branco brilhante
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText('★ PROMOÇÃO ★', 0, 0)
  ctx.letterSpacing = '0px'

  ctx.restore()

  // Adiciona faíscas ao redor da etiqueta
  drawEnergySpark(ctx, x - width * 0.55, y - height * 0.4, 7, '#FFD700')
  drawEnergySpark(ctx, x + width * 0.58, y + height * 0.3, 8, '#39FF14')
}

/**
 * Desenha a caixa de preço com espaço livre e destaque máximo
 */
export function drawPriceCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  precoFormatado?: string,
) {
  ctx.save()

  // Fundo com contraste máximo (Gradiente escuro solar profundo com borda dourada / neon)
  const cardGrad = ctx.createLinearGradient(x, y, x + w, y + h)
  cardGrad.addColorStop(0, 'rgba(11, 29, 60, 0.95)')
  cardGrad.addColorStop(0.5, 'rgba(7, 22, 45, 0.98)')
  cardGrad.addColorStop(1, 'rgba(15, 38, 28, 0.95)')

  ctx.shadowColor = 'rgba(255, 107, 0, 0.45)'
  ctx.shadowBlur = 24
  ctx.shadowOffsetY = 6

  drawRoundedRect(ctx, x, y, w, h, 20, cardGrad, '#FFD700', 2.5)

  // Reseta sombra
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0

  if (precoFormatado) {
    // Label
    ctx.textAlign = 'center'
    ctx.fillStyle = '#39FF14' // Verde neon chamativo
    ctx.font = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.letterSpacing = '2px'
    ctx.fillText('INVESTIMENTO COMPLETO COM INSTALAÇÃO', x + w / 2, y + 32)
    ctx.letterSpacing = '0px'

    // Valor Gigante em Amarelo Ouro
    ctx.fillStyle = '#FFFFFF'
    ctx.font =
      '900 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Arial Black", sans-serif'
    ctx.fillText(precoFormatado, x + w / 2, y + 80)
  } else {
    // Espaço livre e convidativo para preços / orçamento
    ctx.textAlign = 'center'
    ctx.fillStyle = '#FFD700'
    ctx.font = '900 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.letterSpacing = '2px'
    ctx.fillText('CONDIÇÃO ESPECIAL SOB CONSULTA', x + w / 2, y + 36)
    ctx.letterSpacing = '0px'

    ctx.fillStyle = '#FFFFFF'
    ctx.font = '800 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('SOLICITE SEU ESTUDO DE VIABILIDADE', x + w / 2, y + 78)
  }

  ctx.restore()
}

/**
 * Gera o Canvas da imagem publicitária SUPER VIBRANTE para o kit solar no formato solicitado.
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

  // Carregar logo oficial da Ecosolar (versão horizontal) e Mascote de apoio
  let logoImg: HTMLImageElement | null = null
  let mascotImg: HTMLImageElement | null = null
  let cleanLogoCanvas: HTMLCanvasElement | null = null
  try {
    const [loadedLogo, loadedMascot] = await Promise.allSettled([
      loadHorizontalLogoImage(),
      loadMascotImage(),
    ])
    if (loadedLogo.status === 'fulfilled') {
      logoImg = loadedLogo.value
      cleanLogoCanvas = getCleanHorizontalLogoCanvas(logoImg)
    }
    if (loadedMascot.status === 'fulfilled') mascotImg = loadedMascot.value
  } catch (err) {
    console.warn('Não foi possível carregar os assets de imagem:', err)
  }

  const marginX = 56
  const contentWidth = width - marginX * 2

  if (format === 'square') {
    // ==========================================
    // FORMATO 1:1 QUADRADO (1080 x 1080 px)
    // ==========================================

    // Centro do Sol radiante
    const sunX = width / 2
    const sunY = 430
    drawVibrantSolarBackground(ctx, width, height, sunX, sunY)

    // Raios de energia gráficos decorativos nas laterais
    drawLightningBolt(ctx, 40, 240, 0.9, -0.3)
    drawLightningBolt(ctx, width - 60, 220, 0.9, 0.35)

    // Moldura externa vibrante
    drawRoundedRect(
      ctx,
      20,
      20,
      width - 40,
      height - 40,
      24,
      undefined,
      'rgba(255, 215, 0, 0.65)',
      3,
    )

    // 1. TOPO: Logo Oficial da Ecosolar Energy em versão HORIZONTAL em destaque (~55-65% da largura da arte)
    const headerY = 32
    const headerH = 124

    // Card elegante com fundo branco limpo e sutil brilho solar para abrigar perfeitamente a logo horizontal
    const logoCardW = contentWidth - (details.potenciaTotalLinha ? 250 : 0)
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
    ctx.shadowBlur = 18
    ctx.shadowOffsetY = 6
    drawRoundedRect(
      ctx,
      marginX,
      headerY,
      logoCardW,
      headerH,
      20,
      'rgba(255, 255, 255, 0.98)',
      '#FFD700',
      2.5,
    )
    ctx.restore()

    const logoDrawable = cleanLogoCanvas || logoImg
    if (logoDrawable) {
      const padY = 8
      const padX = 14
      const maxDrawW = logoCardW - padX * 2
      const maxDrawH = headerH - padY * 2
      const srcW = 'naturalWidth' in logoDrawable ? logoDrawable.naturalWidth : logoDrawable.width
      const srcH =
        'naturalHeight' in logoDrawable ? logoDrawable.naturalHeight : logoDrawable.height
      const naturalAspect = (srcW || 2.6) / (srcH || 1)

      let logoW = maxDrawH * naturalAspect
      let logoH = maxDrawH
      if (logoW > maxDrawW) {
        logoW = maxDrawW
        logoH = logoW / naturalAspect
      }

      // Centraliza a logo horizontal no card branco
      const drawX = marginX + (logoCardW - logoW) / 2
      const drawY = headerY + (headerH - logoH) / 2
      ctx.drawImage(logoDrawable, drawX, drawY, logoW, logoH)
    } else {
      ctx.textAlign = 'center'
      ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillStyle = '#071638'
      ctx.fillText('ECOSOLAR ENERGY', marginX + logoCardW / 2, headerY + 72)
    }

    // Selo de Potência Total no Topo Direito (se disponível)
    if (details.potenciaTotalLinha) {
      const pW = 230
      const pX = marginX + contentWidth - pW
      const pY = headerY
      const pGrad = ctx.createLinearGradient(pX, pY, pX + pW, pY + headerH)
      pGrad.addColorStop(0, '#FFD700')
      pGrad.addColorStop(1, '#FF8C00')
      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
      ctx.shadowBlur = 18
      ctx.shadowOffsetY = 6
      drawRoundedRect(ctx, pX, pY, pW, headerH, 20, pGrad, '#FFFFFF', 2)
      ctx.restore()

      ctx.textAlign = 'center'
      ctx.fillStyle = '#071638'
      ctx.font = '900 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.letterSpacing = '1px'
      ctx.fillText('POTÊNCIA TOTAL', pX + pW / 2, pY + 40)
      ctx.letterSpacing = '0px'

      ctx.fillStyle = '#071638'
      ctx.font =
        '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Arial Black", sans-serif'
      ctx.fillText(details.potenciaTotalLinha, pX + pW / 2, pY + 88)
    }

    // 2. TÍTULO 3D "KITS SOLARES" com efeito de profundidade, contorno laranja vibrante e glow
    const titleY = 210
    draw3DTitle(ctx, 'KITS SOLARES', width / 2, titleY, 82)

    // 3. ETIQUETA "PROMOÇÃO" em Vermelho Vivo rotacionada
    drawPromoBadge(ctx, width * 0.83, titleY + 12, 230, 62, 0.18)

    // 4. PAINÉIS SOLARES FOTOVOLTAICOS BRILHANTES NO CENTRO DA COMPOSIÇÃO
    const panelsCenterY = 350
    const panelsW = 740
    const panelsH = 175
    drawGleamingSolarPanels(ctx, width / 2, panelsCenterY, panelsW, panelsH)

    // 5. NOME COMERCIAL REAL DO KIT (com caixa de alto contraste legível)
    const nameY = 465
    // Calcula tamanho de fonte para acomodar nomes longos sem estourar
    const nomeLen = details.nomeComercial.length
    const nameFontSize = nomeLen > 65 ? 26 : nomeLen > 45 ? 30 : 36
    const nameLineH = nameFontSize * 1.25
    ctx.font = `900 ${nameFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

    const nameLines = wrapCanvasText(ctx, details.nomeComercial, contentWidth - 40)
    const nameCardH = Math.max(76, nameLines.length * nameLineH + 28)

    // Card do Nome Comercial Real
    const nameCardGrad = ctx.createLinearGradient(
      marginX,
      nameY,
      marginX + contentWidth,
      nameY + nameCardH,
    )
    nameCardGrad.addColorStop(0, 'rgba(7, 22, 56, 0.94)')
    nameCardGrad.addColorStop(1, 'rgba(11, 61, 145, 0.94)')

    drawRoundedRect(
      ctx,
      marginX,
      nameY,
      contentWidth,
      nameCardH,
      18,
      nameCardGrad,
      '#39FF14', // borda com toque de verde neon vibrante
      2,
    )

    ctx.textAlign = 'center'
    const nameStartTextY =
      nameY + (nameCardH - nameLines.length * nameLineH) / 2 + nameFontSize * 0.88
    nameLines.forEach((line, idx) => {
      ctx.fillStyle = idx === 0 ? '#FFFFFF' : '#FFD700'
      ctx.fillText(line, width / 2, nameStartTextY + idx * nameLineH)
    })

    // 6. ESPECIFICAÇÕES TÉCNICAS: PAINÉIS, INVERSOR E ESTRUTURA (cards compactos e super legíveis)
    const specsY = nameY + nameCardH + 16
    const specCardH = 76
    const specSpacing = 10

    const specs = [
      {
        icon: '☀️',
        label: 'MÓDULOS FOTOVOLTAICOS',
        value: details.paineisLinha,
        accent: '#FFD700',
      },
      {
        icon: '⚡',
        label: 'INVERSOR SOLAR',
        value: details.inversorLinha,
        accent: '#39FF14',
      },
      {
        icon: '🏗️',
        label: 'ESTRUTURA DE FIXAÇÃO',
        value: details.estruturaLinha,
        accent: '#1E90FF',
      },
    ]

    specs.forEach((item, index) => {
      const cardY = specsY + index * (specCardH + specSpacing)

      // Card com fundo escuro semi-translúcido para legibilidade total sobre o fundo solar
      drawRoundedRect(
        ctx,
        marginX,
        cardY,
        contentWidth,
        specCardH,
        14,
        'rgba(7, 22, 45, 0.92)',
        'rgba(255, 255, 255, 0.18)',
        1.5,
      )

      // Barra vertical de destaque na cor acentuada
      drawRoundedRect(ctx, marginX, cardY, 8, specCardH, 4, item.accent)

      // Ícone
      const iconCenterX = marginX + 44
      const iconCenterY = cardY + specCardH / 2
      drawRoundedRect(
        ctx,
        iconCenterX - 22,
        iconCenterY - 22,
        44,
        44,
        22,
        'rgba(255, 255, 255, 0.08)',
        item.accent,
        1,
      )
      ctx.textAlign = 'center'
      ctx.font = '22px "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
      ctx.fillText(item.icon, iconCenterX, iconCenterY + 8)

      // Label pequeno uppercase
      const textX = marginX + 80
      ctx.textAlign = 'left'
      ctx.fillStyle = item.accent
      ctx.font = '900 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.letterSpacing = '0.8px'
      ctx.fillText(item.label, textX, cardY + 28)
      ctx.letterSpacing = '0px'

      // Valor grande e nítido
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      const valW = ctx.measureText(item.value).width
      const maxValW = contentWidth - 110
      if (valW > maxValW) {
        ctx.font = '800 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }
      ctx.fillText(item.value, textX, cardY + 58)
    })

    // 7. RODAPÉ COM ESPAÇO LIVRE PARA PREÇOS / OFERTA DE VALOR
    const footerY = height - 138
    const footerH = 96
    const mascotBadgeSize = 114
    const hasMascot = Boolean(mascotImg)

    // Se houver preço preenchido, desenha card de preço promocional
    // senão desenha a oferta de valor "A ENERGIA DO FUTURO, HOJE!" com espaço dinâmico
    const footerCardW = hasMascot ? contentWidth - mascotBadgeSize + 14 : contentWidth

    const footerGrad = ctx.createLinearGradient(
      marginX,
      footerY,
      marginX + footerCardW,
      footerY + footerH,
    )
    footerGrad.addColorStop(0, '#FF4500')
    footerGrad.addColorStop(0.5, '#FF6B00')
    footerGrad.addColorStop(1, '#FF8C00')

    drawRoundedRect(ctx, marginX, footerY, footerCardW, footerH, 18, footerGrad, '#FFD700', 2.5)

    if (details.precoFormatado) {
      ctx.textAlign = 'center'
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '900 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.letterSpacing = '1px'
      ctx.fillText('VALOR PROMOCIONAL EXCLUSIVO', marginX + footerCardW / 2, footerY + 28)
      ctx.letterSpacing = '0px'

      ctx.fillStyle = '#FFFFFF'
      ctx.font =
        '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Arial Black", sans-serif'
      ctx.fillText(details.precoFormatado, marginX + footerCardW / 2, footerY + 70)
    } else {
      ctx.textAlign = 'center'
      ctx.fillStyle = '#FFFFFF'
      ctx.font =
        '900 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Arial Black", sans-serif'
      ctx.letterSpacing = '1px'
      ctx.fillText(details.slogan, marginX + footerCardW / 2, footerY + 44)
      ctx.letterSpacing = '0px'

      ctx.fillStyle = '#071638'
      ctx.font = '900 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(
        'ECOSOLAR ENERGY • ENGENHARIA SOLAR HOMOLOGADA',
        marginX + footerCardW / 2,
        footerY + 74,
      )
    }

    // 8. MASCOTE DA ECOSOLAR como elemento de apoio no canto inferior (badge circular dourado com selo "ECOSOLAR")
    // sem cobrir painéis, inversor, nome comercial ou oferta
    if (mascotImg) {
      const mascotX = marginX + contentWidth - mascotBadgeSize + 8
      const mascotY = footerY - 14
      drawSupportMascotBadge(ctx, mascotImg, mascotX, mascotY, mascotBadgeSize, {
        useBadgeBg: true,
        borderColor: '#FFD700',
        shadow: true,
      })
    }
  } else {
    // ==========================================
    // FORMATO 9:16 VERTICAL / STORY (1080 x 1920 px)
    // ==========================================

    const sunX = width / 2
    const sunY = 720
    drawVibrantSolarBackground(ctx, width, height, sunX, sunY)

    // Raios de energia nas bordas
    drawLightningBolt(ctx, 45, 340, 1.1, -0.2)
    drawLightningBolt(ctx, width - 65, 320, 1.1, 0.25)
    drawLightningBolt(ctx, 40, 1180, 1, 0.35)
    drawLightningBolt(ctx, width - 60, 1200, 1, -0.3)

    // Moldura decorativa
    drawRoundedRect(
      ctx,
      24,
      24,
      width - 48,
      height - 48,
      32,
      undefined,
      'rgba(255, 215, 0, 0.65)',
      3,
    )

    // 1. TOPO DO STORY (respiro de status bar ~120px) com logo HORIZONTAL em destaque (~50% da arte)
    const headerY = 125
    const headerH = 175

    // Card elegante branco com borda dourada para a logo horizontal se destacar com máxima legibilidade e beleza
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.38)'
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 8
    drawRoundedRect(
      ctx,
      marginX,
      headerY,
      contentWidth,
      headerH,
      26,
      'rgba(255, 255, 255, 0.98)',
      '#FFD700',
      3,
    )
    ctx.restore()

    const storyLogoDrawable = cleanLogoCanvas || logoImg
    if (storyLogoDrawable) {
      const padY = 12
      const padX = 20
      const maxDrawW = contentWidth - padX * 2
      const maxDrawH = headerH - padY * 2
      const srcW =
        'naturalWidth' in storyLogoDrawable
          ? storyLogoDrawable.naturalWidth
          : storyLogoDrawable.width
      const srcH =
        'naturalHeight' in storyLogoDrawable
          ? storyLogoDrawable.naturalHeight
          : storyLogoDrawable.height
      const naturalAspect = (srcW || 2.6) / (srcH || 1)

      let logoW = maxDrawH * naturalAspect
      let logoH = maxDrawH
      if (logoW > maxDrawW) {
        logoW = maxDrawW
        logoH = logoW / naturalAspect
      }

      ctx.drawImage(
        storyLogoDrawable,
        width / 2 - logoW / 2,
        headerY + (headerH - logoH) / 2,
        logoW,
        logoH,
      )
    } else {
      ctx.textAlign = 'center'
      ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillStyle = '#071638'
      ctx.fillText('ECOSOLAR ENERGY', width / 2, headerY + 100)
    }

    // 2. TÍTULO 3D "KITS SOLARES" GIGANTE E CENTRALIZADO
    const titleY = headerY + headerH + 90
    draw3DTitle(ctx, 'KITS SOLARES', width / 2, titleY, 110)

    // 3. ETIQUETA "PROMOÇÃO" EM VERMELHO VIVO
    drawPromoBadge(ctx, width / 2, titleY + 85, 300, 72, -0.06)

    // 4. PAINÉIS SOLARES FOTOVOLTAICOS BRILHANTES EM DESTAQUE NO CENTRO
    const panelsCenterY = titleY + 280
    const panelsW = 860
    const panelsH = 240
    drawGleamingSolarPanels(ctx, width / 2, panelsCenterY, panelsW, panelsH)

    // Selo de Potência Total logo abaixo dos painéis
    let curStoryY = panelsCenterY + panelsH / 2 + 30
    if (details.potenciaTotalLinha) {
      const pBadgeW = 460
      const pBadgeH = 80
      const pBadgeX = width / 2 - pBadgeW / 2

      const pGrad = ctx.createLinearGradient(
        pBadgeX,
        curStoryY,
        pBadgeX + pBadgeW,
        curStoryY + pBadgeH,
      )
      pGrad.addColorStop(0, '#FFD700')
      pGrad.addColorStop(1, '#FF8C00')
      drawRoundedRect(ctx, pBadgeX, curStoryY, pBadgeW, pBadgeH, 20, pGrad, '#FFFFFF', 2.5)

      ctx.textAlign = 'center'
      ctx.fillStyle = '#071638'
      ctx.font = '900 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.letterSpacing = '1.5px'
      ctx.fillText('POTÊNCIA TOTAL DO KIT', width / 2, curStoryY + 28)
      ctx.letterSpacing = '0px'

      ctx.font =
        '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Arial Black", sans-serif'
      ctx.fillText(details.potenciaTotalLinha, width / 2, curStoryY + 68)

      curStoryY += pBadgeH + 24
    }

    // 5. NOME COMERCIAL REAL DO KIT EM CARD DE ALTO CONTRASTE
    const titleFontSize = details.nomeComercial.length > 55 ? 36 : 42
    const titleLineHeight = titleFontSize * 1.25
    ctx.font = `900 ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

    const linesStory = wrapCanvasText(ctx, details.nomeComercial, contentWidth - 50)
    const nameCardH = linesStory.length * titleLineHeight + 48

    const nameGradStory = ctx.createLinearGradient(
      marginX,
      curStoryY,
      marginX + contentWidth,
      curStoryY + nameCardH,
    )
    nameGradStory.addColorStop(0, 'rgba(7, 22, 56, 0.95)')
    nameGradStory.addColorStop(1, 'rgba(11, 61, 145, 0.95)')

    drawRoundedRect(
      ctx,
      marginX,
      curStoryY,
      contentWidth,
      nameCardH,
      24,
      nameGradStory,
      '#39FF14', // borda verde neon
      2.5,
    )

    ctx.textAlign = 'center'
    const startNameStoryY =
      curStoryY + (nameCardH - linesStory.length * titleLineHeight) / 2 + titleFontSize * 0.9
    linesStory.forEach((l, idx) => {
      ctx.fillStyle = idx === 0 ? '#FFFFFF' : '#FFD700'
      ctx.fillText(l, width / 2, startNameStoryY + idx * titleLineHeight)
    })

    curStoryY += nameCardH + 26

    // 6. CARDS DOS EQUIPAMENTOS NO STORY
    const storySpecs = [
      {
        icon: '☀️',
        label: 'MÓDULOS FOTOVOLTAICOS',
        value: details.paineisLinha,
        accent: '#FFD700',
      },
      {
        icon: '⚡',
        label: 'INVERSOR SOLAR',
        value: details.inversorLinha,
        accent: '#39FF14',
      },
      {
        icon: '🏗️',
        label: 'ESTRUTURA DE FIXAÇÃO',
        value: details.estruturaLinha,
        accent: '#1E90FF',
      },
    ]

    const storyCardH = 92
    const storySpacing = 16

    storySpecs.forEach((item, index) => {
      const cardY = curStoryY + index * (storyCardH + storySpacing)

      drawRoundedRect(
        ctx,
        marginX,
        cardY,
        contentWidth,
        storyCardH,
        18,
        'rgba(7, 22, 45, 0.94)',
        'rgba(255, 255, 255, 0.2)',
        2,
      )

      // Barra vertical
      drawRoundedRect(ctx, marginX, cardY, 10, storyCardH, 5, item.accent)

      // Ícone
      const iconCenterX = marginX + 54
      const iconCenterY = cardY + storyCardH / 2
      drawRoundedRect(
        ctx,
        iconCenterX - 26,
        iconCenterY - 26,
        52,
        52,
        26,
        'rgba(255, 255, 255, 0.08)',
        item.accent,
        1,
      )
      ctx.textAlign = 'center'
      ctx.font = '28px "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
      ctx.fillText(item.icon, iconCenterX, iconCenterY + 10)

      // Textos
      const textX = marginX + 100
      ctx.textAlign = 'left'
      ctx.fillStyle = item.accent
      ctx.font = '900 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.letterSpacing = '1px'
      ctx.fillText(item.label, textX, cardY + 32)
      ctx.letterSpacing = '0px'

      ctx.fillStyle = '#FFFFFF'
      ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      const textW = ctx.measureText(item.value).width
      if (textW > contentWidth - 130) {
        ctx.font = '800 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }
      ctx.fillText(item.value, textX, cardY + 70)
    })

    // 7. RODAPÉ COM ESPAÇO LIVRE PARA PREÇOS / OFERTA DE VALOR NO STORY
    const storyFooterY = height - 250
    const storyFooterH = 150
    const storyMascotBadgeSize = 160
    const hasMascot = Boolean(mascotImg)

    const storyFooterW = hasMascot ? contentWidth - storyMascotBadgeSize + 20 : contentWidth

    const storyFooterGrad = ctx.createLinearGradient(
      marginX,
      storyFooterY,
      marginX + storyFooterW,
      storyFooterY + storyFooterH,
    )
    storyFooterGrad.addColorStop(0, '#FF4500')
    storyFooterGrad.addColorStop(0.5, '#FF6B00')
    storyFooterGrad.addColorStop(1, '#FF8C00')

    drawRoundedRect(
      ctx,
      marginX,
      storyFooterY,
      storyFooterW,
      storyFooterH,
      24,
      storyFooterGrad,
      '#FFD700',
      3,
    )

    if (details.precoFormatado) {
      ctx.textAlign = 'center'
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '900 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.letterSpacing = '1.5px'
      ctx.fillText('VALOR PROMOCIONAL EXCLUSIVO', marginX + storyFooterW / 2, storyFooterY + 44)
      ctx.letterSpacing = '0px'

      ctx.fillStyle = '#FFFFFF'
      ctx.font =
        '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Arial Black", sans-serif'
      ctx.fillText(details.precoFormatado, marginX + storyFooterW / 2, storyFooterY + 104)

      ctx.fillStyle = '#071638'
      ctx.font = '900 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(
        'HOMOLOGAÇÃO E INSTALAÇÃO INCLUSAS',
        marginX + storyFooterW / 2,
        storyFooterY + 134,
      )
    } else {
      ctx.textAlign = 'center'
      ctx.fillStyle = '#FFFFFF'
      ctx.font =
        '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Arial Black", sans-serif'
      ctx.letterSpacing = '1.5px'
      ctx.fillText(details.slogan, marginX + storyFooterW / 2, storyFooterY + 62)
      ctx.letterSpacing = '0px'

      ctx.fillStyle = '#071638'
      ctx.font = '900 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(
        'ECOSOLAR ENERGY • ENGENHARIA DE ALTA PERFORMANCE',
        marginX + storyFooterW / 2,
        storyFooterY + 106,
      )

      ctx.fillStyle = 'rgba(7, 22, 56, 0.85)'
      ctx.font = '800 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(
        'Solicite seu estudo de viabilidade gratuito',
        marginX + storyFooterW / 2,
        storyFooterY + 132,
      )
    }

    // 8. Mascote de Apoio no canto inferior do Story
    if (mascotImg) {
      const mascotX = marginX + contentWidth - storyMascotBadgeSize + 8
      const mascotY = storyFooterY - 18
      drawSupportMascotBadge(ctx, mascotImg, mascotX, mascotY, storyMascotBadgeSize, {
        useBadgeBg: true,
        borderColor: '#FFD700',
        shadow: true,
      })
    }
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
    `🔥☀️ *${details.nomeComercial.toUpperCase()}*`,
    `_${details.slogan}_`,
    '',
    '⚡ *PROMOÇÃO EXCLUSIVA DE ENERGIA SOLAR*',
    `📌 *Módulos Fotovoltaicos:* ${details.paineisLinha}`,
    `⚡ *Inversor Solar:* ${details.inversorLinha}`,
    `🏗️ *Estrutura:* ${details.estruturaLinha}`,
  ]

  if (details.potenciaTotalLinha) {
    linhas.push(`🔋 *Potência Total:* ${details.potenciaTotalLinha}`)
  }

  if (details.precoFormatado) {
    linhas.push(`💰 *Investimento Promocional:* ${details.precoFormatado}`)
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
