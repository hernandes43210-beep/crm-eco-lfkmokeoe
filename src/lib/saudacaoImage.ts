import officialLogoPng from '@/assets/a-613c6.png'
import { loadMascotImage } from '@/lib/mascotUtils'
import { wrapCanvasText } from '@/lib/kitMarketingImage'

export type SaudacaoTipo = 'bom_dia' | 'boa_tarde' | 'boa_noite' | 'personalizado'

export interface SaudacaoOptions {
  tipo: SaudacaoTipo
  mensagemPersonalizada?: string
  format: 'square' | 'story'
}

export const SAUDACOES_PREDEFINIDAS: Record<SaudacaoTipo, { titulo: string; subtitulo: string }> = {
  bom_dia: {
    titulo: 'Bom dia!',
    subtitulo: 'Que o sol de hoje ilumine seus planos e traga muita energia positiva!',
  },
  boa_tarde: {
    titulo: 'Boa tarde!',
    subtitulo: 'Aproveitando o pico de geração solar para desejar uma excelente tarde!',
  },
  boa_noite: {
    titulo: 'Boa noite!',
    subtitulo:
      'Descanse com tranquilidade enquanto a sua economia solar continua gerando resultados.',
  },
  personalizado: {
    titulo: 'Ecosolar Energy',
    subtitulo: 'A energia do futuro, hoje!',
  },
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
 * Desenha o fundo corporativo sofisticado Ecosolar
 * Fundo escuro verde/petróleo profundo com aura dourada solar e raios suaves
 */
function drawCorporateGreetingBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  // Gradiente escuro corporativo profundo
  const bgGrad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    60,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.85,
  )
  bgGrad.addColorStop(0, '#0F2E22') // Verde esmeralda profundo
  bgGrad.addColorStop(0.42, '#0B1D28') // Azul petróleo escuro
  bgGrad.addColorStop(1, '#050D14') // Grafite / quase preto solar
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // Aura solar circular suave atrás do mascote
  const mascotGlow = ctx.createRadialGradient(
    width * 0.5,
    height * 0.46,
    30,
    width * 0.5,
    height * 0.46,
    width * 0.48,
  )
  mascotGlow.addColorStop(0, 'rgba(245, 197, 24, 0.28)') // Dourado solar vibrante
  mascotGlow.addColorStop(0.45, 'rgba(16, 185, 129, 0.12)') // Verde solar
  mascotGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = mascotGlow
  ctx.fillRect(0, 0, width, height)

  // Grade sutil isométrica solar
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
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

  // Raios solares em leque partindo do canto superior
  ctx.strokeStyle = 'rgba(245, 197, 24, 0.035)'
  ctx.lineWidth = 2
  for (let angle = 0; angle < Math.PI / 2; angle += 0.1) {
    ctx.beginPath()
    ctx.moveTo(width, 0)
    ctx.lineTo(width - Math.cos(angle) * 1800, Math.sin(angle) * 1800)
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * Gera a arte de saudação com o Mascote Centralizado em destaque
 */
export async function generateSaudacaoCanvas(options: SaudacaoOptions): Promise<HTMLCanvasElement> {
  const { tipo, mensagemPersonalizada, format } = options
  const width = 1080
  const height = format === 'square' ? 1080 : 1920

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível inicializar o contexto do Canvas')

  // Fundo corporativo Ecosolar
  drawCorporateGreetingBackground(ctx, width, height)

  // Carregar assets (Logo e Mascote)
  let logoImg: HTMLImageElement | null = null
  let mascotImg: HTMLImageElement | null = null
  try {
    const [logoRes, mascotRes] = await Promise.allSettled([
      loadImage(officialLogoPng),
      loadMascotImage(),
    ])
    if (logoRes.status === 'fulfilled') logoImg = logoRes.value
    if (mascotRes.status === 'fulfilled') mascotImg = mascotRes.value
  } catch (err) {
    console.warn('Erro ao carregar assets para arte de saudação:', err)
  }

  // Texto da saudação
  let greetingTitle = SAUDACOES_PREDEFINIDAS[tipo].titulo
  let greetingSubtitle = SAUDACOES_PREDEFINIDAS[tipo].subtitulo

  if (tipo === 'personalizado') {
    const custom = (mensagemPersonalizada || '').trim()
    if (custom) {
      // Se for multilinha ou longa, a primeira linha vira título ou todo o texto vira subtítulo
      const parts = custom.split(/\n+/)
      if (parts.length > 1) {
        greetingTitle = parts[0]
        greetingSubtitle = parts.slice(1).join(' ')
      } else if (custom.length <= 35) {
        greetingTitle = custom
        greetingSubtitle = 'A energia do futuro, hoje!'
      } else {
        greetingTitle = 'Ecosolar Energy'
        greetingSubtitle = custom
      }
    }
  }

  const marginX = 64
  const contentWidth = width - marginX * 2

  if (format === 'square') {
    // ==========================================
    // QUADRADO 1:1 (1080 x 1080 px)
    // ==========================================

    // Moldura elegante
    drawRoundedRect(
      ctx,
      28,
      28,
      width - 56,
      height - 56,
      28,
      undefined,
      'rgba(245, 197, 24, 0.28)',
      2,
    )

    // Topo: Card com Logo Oficial e Selo Corporativo
    const headerY = 52
    const headerH = 110
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

    if (logoImg) {
      const logoH = 80
      const naturalAspect = (logoImg.naturalWidth || 1) / (logoImg.naturalHeight || 1)
      const logoW = Math.min(280, logoH * naturalAspect)
      ctx.drawImage(logoImg, marginX + 32, headerY + (headerH - logoH) / 2, logoW, logoH)
    }

    // Balão / Badge com o Título da Saudação no topo direito do header
    const tagH = 58
    const tagW = 320
    const tagX = marginX + contentWidth - tagW - 24
    const tagY = headerY + (headerH - tagH) / 2

    const tagGrad = ctx.createLinearGradient(tagX, tagY, tagX + tagW, tagY + tagH)
    tagGrad.addColorStop(0, '#F5C518')
    tagGrad.addColorStop(1, '#D99B00')
    drawRoundedRect(ctx, tagX, tagY, tagW, tagH, 18, tagGrad)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#0F172A'
    ctx.font = '900 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(greetingTitle, tagX + tagW / 2, tagY + 39)

    // Área Central do Mascote: Moldura circular sutil iluminada
    const mascotCenterY = 500
    const mascotSize = 580
    const mascotRadius = mascotSize / 2

    // Base circular com glow suave
    ctx.save()
    ctx.shadowColor = 'rgba(245, 197, 24, 0.35)'
    ctx.shadowBlur = 32
    ctx.beginPath()
    ctx.arc(width / 2, mascotCenterY, mascotRadius, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.lineWidth = 4
    ctx.strokeStyle = '#F5C518'
    ctx.stroke()
    ctx.restore()

    // Desenha a imagem do Mascote com clip circular
    if (mascotImg) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(width / 2, mascotCenterY, mascotRadius - 2, 0, Math.PI * 2)
      ctx.clip()
      // Enquadramento
      const naturalW = mascotImg.naturalWidth || 1024
      const naturalH = mascotImg.naturalHeight || 1024
      const aspect = naturalW / naturalH
      let dW = mascotSize
      let dH = mascotSize
      if (aspect > 1) {
        dW = mascotSize * aspect
      } else {
        dH = mascotSize / aspect
      }
      const dX = width / 2 - dW / 2
      const dY = mascotCenterY - dH / 2
      ctx.drawImage(mascotImg, dX, dY, dW, dH)
      ctx.restore()
    }

    // Selo elegante "Mascote Oficial Ecosolar"
    const sealH = 34
    const sealW = 240
    const sealX = width / 2 - sealW / 2
    const sealY = mascotCenterY + mascotRadius - 17
    drawRoundedRect(ctx, sealX, sealY, sealW, sealH, sealH / 2, '#0B7A5B', '#F5C518', 2)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.letterSpacing = '1px'
    ctx.fillText('ECOSOLAR ENERGY', width / 2, sealY + 22)
    ctx.letterSpacing = '0px'

    // Bloco Inferior: Subtítulo / Mensagem inspiradora e Oferta de Valor
    const footerY = height - 210
    const footerH = 155
    const footerGrad = ctx.createLinearGradient(marginX, footerY, marginX + contentWidth, footerY)
    footerGrad.addColorStop(0, 'rgba(11, 122, 91, 0.9)')
    footerGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)')
    drawRoundedRect(
      ctx,
      marginX,
      footerY,
      contentWidth,
      footerH,
      22,
      footerGrad,
      'rgba(245, 197, 24, 0.45)',
      2,
    )

    // Subtítulo envolvente com wrap automático
    ctx.textAlign = 'center'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '700 23px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    const subLines = wrapCanvasText(ctx, `"${greetingSubtitle}"`, contentWidth - 60)
    const lineH = 30
    const totalTextH = subLines.length * lineH
    const startTextY = footerY + (footerH - 45 - totalTextH) / 2 + 28
    subLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, startTextY + idx * lineH)
    })

    // Slogan no rodapé do card
    ctx.fillStyle = '#F5C518'
    ctx.font = '900 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.letterSpacing = '1.5px'
    ctx.fillText('A ENERGIA DO FUTURO, HOJE! • ECOSOLAR ENERGY', width / 2, footerY + footerH - 18)
    ctx.letterSpacing = '0px'
  } else {
    // ==========================================
    // VERTICAL / STORY 9:16 (1080 x 1920 px)
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
      'rgba(245, 197, 24, 0.25)',
      2,
    )

    // Header com Logo Centralizada
    const headerY = 130
    const headerH = 170
    drawRoundedRect(
      ctx,
      marginX,
      headerY,
      contentWidth,
      headerH,
      28,
      'rgba(255, 255, 255, 0.04)',
      'rgba(255, 255, 255, 0.12)',
      2,
    )

    if (logoImg) {
      const logoH = 120
      const naturalAspect = (logoImg.naturalWidth || 1) / (logoImg.naturalHeight || 1)
      const logoW = Math.min(contentWidth - 60, logoH * naturalAspect)
      ctx.drawImage(logoImg, width / 2 - logoW / 2, headerY + (headerH - logoH) / 2, logoW, logoH)
    }

    // Destaque da Saudação em Card Dourado Largo
    const greetCardY = headerY + headerH + 42
    const greetCardH = 130
    const greetCardW = 600
    const greetCardX = width / 2 - greetCardW / 2

    const greetGrad = ctx.createLinearGradient(
      greetCardX,
      greetCardY,
      greetCardX + greetCardW,
      greetCardY + greetCardH,
    )
    greetGrad.addColorStop(0, '#F5C518')
    greetGrad.addColorStop(1, '#D99B00')
    drawRoundedRect(ctx, greetCardX, greetCardY, greetCardW, greetCardH, 26, greetGrad)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#0F172A'
    ctx.font = '900 56px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(greetingTitle, width / 2, greetCardY + 82)

    // Tag descritiva
    const tagStory = 'ENERGIA SOLAR & SUSTENTABILIDADE'
    ctx.font = '800 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    const tagStoryW = ctx.measureText(tagStory).width + 36
    drawRoundedRect(
      ctx,
      width / 2 - tagStoryW / 2,
      greetCardY + greetCardH + 28,
      tagStoryW,
      36,
      18,
      'rgba(11, 122, 91, 0.45)',
      '#0B7A5B',
      1.5,
    )
    ctx.textAlign = 'center'
    ctx.fillStyle = '#34D399'
    ctx.fillText(tagStory, width / 2, greetCardY + greetCardH + 51)

    // Mascote em Grande Destaque no Story (Círculo de ~760px)
    const mascotCenterY = 960
    const mascotSize = 780
    const mascotRadius = mascotSize / 2

    ctx.save()
    ctx.shadowColor = 'rgba(245, 197, 24, 0.35)'
    ctx.shadowBlur = 40
    ctx.beginPath()
    ctx.arc(width / 2, mascotCenterY, mascotRadius, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.lineWidth = 5
    ctx.strokeStyle = '#F5C518'
    ctx.stroke()
    ctx.restore()

    if (mascotImg) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(width / 2, mascotCenterY, mascotRadius - 3, 0, Math.PI * 2)
      ctx.clip()
      const naturalW = mascotImg.naturalWidth || 1024
      const naturalH = mascotImg.naturalHeight || 1024
      const aspect = naturalW / naturalH
      let dW = mascotSize
      let dH = mascotSize
      if (aspect > 1) {
        dW = mascotSize * aspect
      } else {
        dH = mascotSize / aspect
      }
      const dX = width / 2 - dW / 2
      const dY = mascotCenterY - dH / 2
      ctx.drawImage(mascotImg, dX, dY, dW, dH)
      ctx.restore()
    }

    // Selo sobre a base do círculo
    const sealH = 46
    const sealW = 320
    const sealX = width / 2 - sealW / 2
    const sealY = mascotCenterY + mascotRadius - 23
    drawRoundedRect(ctx, sealX, sealY, sealW, sealH, sealH / 2, '#0B7A5B', '#F5C518', 2.5)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '800 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.letterSpacing = '1px'
    ctx.fillText('ECOSOLAR ENERGY', width / 2, sealY + 29)
    ctx.letterSpacing = '0px'

    // Card da Mensagem e Rodapé no Story
    const storyFooterY = height - 380
    const storyFooterH = 240

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
      28,
      storyFooterGrad,
      'rgba(245, 197, 24, 0.55)',
      2.5,
    )

    // Subtítulo
    ctx.textAlign = 'center'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '700 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    const storyLines = wrapCanvasText(ctx, `"${greetingSubtitle}"`, contentWidth - 80)
    const storyLineH = 42
    const totalStoryTextH = storyLines.length * storyLineH
    const startStoryY = storyFooterY + (storyFooterH - 60 - totalStoryTextH) / 2 + 36

    storyLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, startStoryY + idx * storyLineH)
    })

    // Slogan em destaque dourado
    ctx.fillStyle = '#F5C518'
    ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.letterSpacing = '1.8px'
    ctx.fillText('A ENERGIA DO FUTURO, HOJE!', width / 2, storyFooterY + storyFooterH - 42)
    ctx.letterSpacing = '0px'

    ctx.fillStyle = '#94A3B8'
    ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(
      'Engenharia Solar de Alta Performance',
      width / 2,
      storyFooterY + storyFooterH - 18,
    )
  }

  return canvas
}

/**
 * Converte o canvas para Blob PNG
 */
export async function getSaudacaoCanvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Erro ao converter o canvas em imagem PNG'))
    }, 'image/png')
  })
}

/**
 * Dispara o download da imagem de saudação
 */
export function downloadSaudacaoImage(
  canvas: HTMLCanvasElement,
  filename = 'ecosolar-saudacao.png',
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
 * Monta o texto de acompanhamento da saudação no WhatsApp
 */
export function gerarTextoWhatsAppSaudacao(options: SaudacaoOptions): string {
  const { tipo, mensagemPersonalizada } = options
  let title = SAUDACOES_PREDEFINIDAS[tipo].titulo
  let body = SAUDACOES_PREDEFINIDAS[tipo].subtitulo

  if (tipo === 'personalizado' && mensagemPersonalizada) {
    body = mensagemPersonalizada.trim()
    title = 'Ecosolar Energy'
  }

  const linhas = [
    `☀️ *${title.toUpperCase()}*`,
    '',
    body,
    '',
    '⚡ *Ecosolar Energy* — _A Energia do Futuro, Hoje!_',
    '📲 Fale conosco para gerar sua própria energia com máxima economia.',
  ]

  return linhas.join('\n')
}

/**
 * Compartilha a arte de saudação no WhatsApp (Web Share API ou Download + wa.me)
 */
export async function shareSaudacaoOnWhatsApp(
  canvas: HTMLCanvasElement,
  options: SaudacaoOptions,
  phone?: string,
): Promise<{ sharedViaApi: boolean }> {
  const safeName = (options.tipo || 'saudacao').replace(/[^a-zA-Z0-9]/g, '-')
  const filename = `ecosolar-${safeName}.png`

  const blob = await getSaudacaoCanvasBlob(canvas)
  const file = new File([blob], filename, { type: 'image/png' })
  const caption = gerarTextoWhatsAppSaudacao(options)

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Ecosolar Energy - Saudação',
        text: caption,
        files: [file],
      })
      return { sharedViaApi: true }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { sharedViaApi: true }
      }
      console.warn('Web Share API não concluiu, usando fallback wa.me:', err)
    }
  }

  downloadSaudacaoImage(canvas, filename)

  const rawPhone = (phone || '').replace(/\D/g, '')
  const waUrl = rawPhone
    ? `https://wa.me/55${rawPhone}?text=${encodeURIComponent(caption)}`
    : `https://wa.me/?text=${encodeURIComponent(caption)}`

  window.open(waUrl, '_blank')
  return { sharedViaApi: false }
}
