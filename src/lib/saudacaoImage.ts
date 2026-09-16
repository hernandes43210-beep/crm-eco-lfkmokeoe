import officialLogoPng from '@/assets/a-613c6.png'
import { loadMascotImage } from '@/lib/mascotUtils'
import {
  wrapCanvasText,
  drawRoundedRect,
  drawVibrantSolarBackground,
  drawEnergySpark,
  drawLightningBolt,
  draw3DTitle,
} from '@/lib/kitMarketingImage'

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

/**
 * Gera a arte de saudação com o Mascote Centralizado em destaque
 * sob a mesma linguagem visual SUPER VIBRANTE:
 * - Raios de sol explodindo do centro
 * - Cores saturadas (laranja solar, amarelo dourado, azul profundo, verde neon)
 * - Faíscas de energia e raios gráficos
 * - Título em destaque com estilo 3D e contorno luminoso
 * - Mascote centralizado com moldura circular solar iluminada
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

  const marginX = 56
  const contentWidth = width - marginX * 2

  if (format === 'square') {
    // ==========================================
    // QUADRADO 1:1 (1080 x 1080 px)
    // ==========================================

    const sunX = width / 2
    const sunY = 500
    // Fundo super vibrante com raios de sol e lens flare
    drawVibrantSolarBackground(ctx, width, height, sunX, sunY)

    // Raios e faíscas gráficos
    drawLightningBolt(ctx, 35, 230, 0.9, -0.25)
    drawLightningBolt(ctx, width - 55, 220, 0.9, 0.3)

    // Moldura decorativa
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

    // 1. TOPO: Logo Oficial da Ecosolar Energy em card translúcido escuro
    const headerY = 36
    const headerH = 110
    const logoCardW = contentWidth - 300

    drawRoundedRect(
      ctx,
      marginX,
      headerY,
      logoCardW,
      headerH,
      20,
      'rgba(7, 22, 45, 0.85)',
      'rgba(255, 215, 0, 0.5)',
      2,
    )

    if (logoImg) {
      const logoH = 86
      const naturalAspect = (logoImg.naturalWidth || 1) / (logoImg.naturalHeight || 1)
      const logoW = Math.min(logoCardW - 40, logoH * naturalAspect)
      ctx.drawImage(logoImg, marginX + 24, headerY + (headerH - logoH) / 2, logoW, logoH)
    }

    // Selo da Saudação no Topo Direito (Card Laranja/Dourado)
    const tagH = 68
    const tagW = 280
    const tagX = marginX + contentWidth - tagW
    const tagY = headerY + (headerH - tagH) / 2

    const tagGrad = ctx.createLinearGradient(tagX, tagY, tagX + tagW, tagY + tagH)
    tagGrad.addColorStop(0, '#FF4500')
    tagGrad.addColorStop(0.5, '#FF8C00')
    tagGrad.addColorStop(1, '#FFD700')
    drawRoundedRect(ctx, tagX, tagY, tagW, tagH, 18, tagGrad, '#FFFFFF', 2)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#FFFFFF'
    ctx.font =
      '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Arial Black", sans-serif'
    ctx.fillText(greetingTitle, tagX + tagW / 2, tagY + tagH / 2)

    // 2. TÍTULO CENTRAL VIBRANTE (quando for saudação padrão ou personalizada)
    const titleCenterY = 195
    draw3DTitle(ctx, greetingTitle.toUpperCase(), width / 2, titleCenterY, 64)

    // 3. MASCOTE CENTRALIZADO EM DESTAQUE COM MOLDURA SOLAR ILUMINADA
    const mascotCenterY = 485
    const mascotSize = 510
    const mascotRadius = mascotSize / 2

    // Grande halo de brilho dourado e verde neon atrás do mascote
    ctx.save()
    ctx.shadowColor = 'rgba(255, 215, 0, 0.85)'
    ctx.shadowBlur = 45
    ctx.beginPath()
    ctx.arc(width / 2, mascotCenterY, mascotRadius + 6, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.fill()
    ctx.lineWidth = 6
    ctx.strokeStyle = '#FFD700'
    ctx.stroke()
    ctx.restore()

    // Borda dupla verde neon e laranja
    ctx.save()
    ctx.beginPath()
    ctx.arc(width / 2, mascotCenterY, mascotRadius + 14, 0, Math.PI * 2)
    ctx.lineWidth = 2.5
    ctx.strokeStyle = '#39FF14'
    ctx.stroke()
    ctx.restore()

    // Imagem do Mascote com clip circular perfeito
    if (mascotImg) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(width / 2, mascotCenterY, mascotRadius - 2, 0, Math.PI * 2)
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

    // Selo sobre a base do Mascote: "ECOSOLAR ENERGY"
    const sealH = 38
    const sealW = 260
    const sealX = width / 2 - sealW / 2
    const sealY = mascotCenterY + mascotRadius - 19
    drawRoundedRect(ctx, sealX, sealY, sealW, sealH, sealH / 2, '#FF6B00', '#FFD700', 2.5)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#FFFFFF'
    ctx.font =
      '900 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Arial Black", sans-serif'
    ctx.letterSpacing = '1px'
    ctx.fillText('ECOSOLAR ENERGY', width / 2, sealY + sealH / 2)
    ctx.letterSpacing = '0px'

    // Faíscas ao redor do mascote
    drawEnergySpark(ctx, width / 2 - mascotRadius - 20, mascotCenterY - 40, 10, '#39FF14')
    drawEnergySpark(ctx, width / 2 + mascotRadius + 24, mascotCenterY + 30, 12, '#FFD700')

    // 4. BLOCO INFERIOR: MENSAGEM INSPIRADORA + OFERTA DE VALOR
    const footerY = height - 210
    const footerH = 175

    const footerGrad = ctx.createLinearGradient(
      marginX,
      footerY,
      marginX + contentWidth,
      footerY + footerH,
    )
    footerGrad.addColorStop(0, 'rgba(7, 22, 56, 0.96)')
    footerGrad.addColorStop(0.5, 'rgba(11, 61, 145, 0.96)')
    footerGrad.addColorStop(1, 'rgba(15, 38, 28, 0.96)')

    drawRoundedRect(ctx, marginX, footerY, contentWidth, footerH, 22, footerGrad, '#FFD700', 2.5)

    // Subtítulo envolvente
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    const subLines = wrapCanvasText(ctx, `"${greetingSubtitle}"`, contentWidth - 60)
    const lineH = 32
    const totalTextH = subLines.length * lineH
    const startTextY = footerY + (footerH - 50 - totalTextH) / 2 + 30
    subLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, startTextY + idx * lineH)
    })

    // Slogan em destaque Laranja/Dourado no rodapé do card
    ctx.fillStyle = '#FFD700'
    ctx.font =
      '900 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Arial Black", sans-serif'
    ctx.letterSpacing = '1.5px'
    ctx.fillText('A ENERGIA DO FUTURO, HOJE!', width / 2, footerY + footerH - 24)
    ctx.letterSpacing = '0px'
  } else {
    // ==========================================
    // VERTICAL / STORY 9:16 (1080 x 1920 px)
    // ==========================================

    const sunX = width / 2
    const sunY = 920
    drawVibrantSolarBackground(ctx, width, height, sunX, sunY)

    // Raios de energia nas laterais
    drawLightningBolt(ctx, 45, 320, 1.2, -0.2)
    drawLightningBolt(ctx, width - 65, 300, 1.2, 0.25)
    drawLightningBolt(ctx, 40, 1260, 1.1, 0.3)
    drawLightningBolt(ctx, width - 60, 1280, 1.1, -0.3)

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

    // 1. TOPO COM LOGO OFICIAL
    const headerY = 130
    const headerH = 160
    drawRoundedRect(
      ctx,
      marginX,
      headerY,
      contentWidth,
      headerH,
      28,
      'rgba(7, 22, 45, 0.85)',
      'rgba(255, 215, 0, 0.55)',
      2,
    )

    if (logoImg) {
      const logoH = 115
      const naturalAspect = (logoImg.naturalWidth || 1) / (logoImg.naturalHeight || 1)
      const logoW = Math.min(contentWidth - 60, logoH * naturalAspect)
      ctx.drawImage(logoImg, width / 2 - logoW / 2, headerY + (headerH - logoH) / 2, logoW, logoH)
    }

    // 2. TÍTULO 3D DA SAUDAÇÃO EM GRANDE ESTILO
    const titleY = headerY + headerH + 90
    draw3DTitle(ctx, greetingTitle.toUpperCase(), width / 2, titleY, 96)

    // Tag descritiva vibrante
    const tagStory = 'ENERGIA SOLAR & SUSTENTABILIDADE'
    ctx.font = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    const tagStoryW = ctx.measureText(tagStory).width + 42
    drawRoundedRect(
      ctx,
      width / 2 - tagStoryW / 2,
      titleY + 55,
      tagStoryW,
      40,
      20,
      '#FF6B00',
      '#FFD700',
      2,
    )
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(tagStory, width / 2, titleY + 75)

    // 3. MASCOTE EM GRANDE DESTAQUE CENTRALIZADO NO STORY (~720px)
    const mascotCenterY = 960
    const mascotSize = 720
    const mascotRadius = mascotSize / 2

    ctx.save()
    ctx.shadowColor = 'rgba(255, 215, 0, 0.95)'
    ctx.shadowBlur = 55
    ctx.beginPath()
    ctx.arc(width / 2, mascotCenterY, mascotRadius + 8, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.lineWidth = 8
    ctx.strokeStyle = '#FFD700'
    ctx.stroke()
    ctx.restore()

    // Borda externa neon
    ctx.save()
    ctx.beginPath()
    ctx.arc(width / 2, mascotCenterY, mascotRadius + 18, 0, Math.PI * 2)
    ctx.lineWidth = 3
    ctx.strokeStyle = '#39FF14'
    ctx.stroke()
    ctx.restore()

    if (mascotImg) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(width / 2, mascotCenterY, mascotRadius - 2, 0, Math.PI * 2)
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
    const sealH = 50
    const sealW = 340
    const sealX = width / 2 - sealW / 2
    const sealY = mascotCenterY + mascotRadius - 25
    drawRoundedRect(ctx, sealX, sealY, sealW, sealH, sealH / 2, '#FF6B00', '#FFD700', 3)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#FFFFFF'
    ctx.font =
      '900 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Arial Black", sans-serif'
    ctx.letterSpacing = '1.5px'
    ctx.fillText('ECOSOLAR ENERGY', width / 2, sealY + sealH / 2)
    ctx.letterSpacing = '0px'

    // Faíscas dinâmicas ao redor do mascote no Story
    drawEnergySpark(ctx, width / 2 - mascotRadius - 30, mascotCenterY - 80, 14, '#39FF14')
    drawEnergySpark(ctx, width / 2 + mascotRadius + 35, mascotCenterY + 40, 16, '#FFD700')
    drawEnergySpark(
      ctx,
      width / 2 - mascotRadius + 20,
      mascotCenterY + mascotRadius - 40,
      12,
      '#FFFFFF',
    )

    // 4. CARD DA MENSAGEM E RODAPÉ NO STORY
    const storyFooterY = height - 390
    const storyFooterH = 260

    const storyFooterGrad = ctx.createLinearGradient(
      marginX,
      storyFooterY,
      marginX + contentWidth,
      storyFooterY + storyFooterH,
    )
    storyFooterGrad.addColorStop(0, 'rgba(7, 22, 56, 0.96)')
    storyFooterGrad.addColorStop(0.5, 'rgba(11, 61, 145, 0.96)')
    storyFooterGrad.addColorStop(1, 'rgba(15, 38, 28, 0.96)')

    drawRoundedRect(
      ctx,
      marginX,
      storyFooterY,
      contentWidth,
      storyFooterH,
      28,
      storyFooterGrad,
      '#FFD700',
      3,
    )

    // Subtítulo
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '800 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    const storyLines = wrapCanvasText(ctx, `"${greetingSubtitle}"`, contentWidth - 80)
    const storyLineH = 44
    const totalStoryTextH = storyLines.length * storyLineH
    const startStoryY = storyFooterY + (storyFooterH - 70 - totalStoryTextH) / 2 + 42

    storyLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, startStoryY + idx * storyLineH)
    })

    // Slogan em destaque dourado/laranja
    ctx.fillStyle = '#FFD700'
    ctx.font =
      '900 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Arial Black", sans-serif'
    ctx.letterSpacing = '2px'
    ctx.fillText('A ENERGIA DO FUTURO, HOJE!', width / 2, storyFooterY + storyFooterH - 52)
    ctx.letterSpacing = '0px'

    ctx.fillStyle = '#39FF14'
    ctx.font = '800 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(
      'Engenharia Solar de Alta Performance',
      width / 2,
      storyFooterY + storyFooterH - 22,
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
    `☀️🔥 *${title.toUpperCase()}*`,
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
