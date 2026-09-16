import mascotImgUrl from '@/assets/editedimage1777166474816-0d67d.png'

export const ECOSOLAR_MASCOT_ASSET = mascotImgUrl

/**
 * Carrega um elemento HTMLImageElement com suporte a retry e crossOrigin
 */
export function loadMascotImage(src: string = mascotImgUrl): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => {
      if (!img.crossOrigin) {
        reject(new Error(`Falha ao carregar mascote: ${src.slice(0, 60)}`))
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
 * Retorna o canvas com a imagem do mascote.
 * A nova imagem oficial já é um PNG de alta definição com canal alfa transparente
 * (mascote de chapéu de palha, óculos escuros, camiseta azul-marinho ECOSOLAR ENERGY e painel solar na mão).
 * Não aplica recorte desnecessário que possa danificar o painel solar, dentes ou brilhos do personagem.
 */
let cachedCroppedMascotCanvas: HTMLCanvasElement | null = null

export function getCroppedMascotCanvas(mascotImg: HTMLImageElement): HTMLCanvasElement {
  if (cachedCroppedMascotCanvas) {
    return cachedCroppedMascotCanvas
  }

  const naturalW = mascotImg.naturalWidth || mascotImg.width || 1024
  const naturalH = mascotImg.naturalHeight || mascotImg.height || 1024

  const offCanvas = document.createElement('canvas')
  offCanvas.width = naturalW
  offCanvas.height = naturalH
  const offCtx = offCanvas.getContext('2d')

  if (!offCtx) {
    return offCanvas
  }

  offCtx.drawImage(mascotImg, 0, 0, naturalW, naturalH)
  cachedCroppedMascotCanvas = offCanvas
  return offCanvas
}

/**
 * Desenha o mascote como elemento de apoio em um canto da arte
 * (com opção de badge circular translúcido ou recorte limpo)
 */
export function drawSupportMascotBadge(
  ctx: CanvasRenderingContext2D,
  mascotCanvasOrImg: HTMLCanvasElement | HTMLImageElement,
  x: number,
  y: number,
  size: number,
  options: {
    useBadgeBg?: boolean
    borderColor?: string
    shadow?: boolean
  } = {},
) {
  const { useBadgeBg = true, borderColor = '#F5C518', shadow = true } = options
  const radius = size / 2
  const centerX = x + radius
  const centerY = y + radius

  ctx.save()

  if (shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
    ctx.shadowBlur = 18
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 6
  }

  if (useBadgeBg) {
    // Fundo circular com gradiente solar sofisticado
    const bgGrad = ctx.createRadialGradient(
      centerX,
      centerY - radius * 0.3,
      10,
      centerX,
      centerY,
      radius,
    )
    bgGrad.addColorStop(0, '#FFFFFF')
    bgGrad.addColorStop(0.7, '#F8FAFC')
    bgGrad.addColorStop(1, '#E2E8F0')

    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fillStyle = bgGrad
    ctx.fill()

    // Borda elegante dourada / solar
    ctx.lineWidth = Math.max(3, Math.round(size * 0.035))
    ctx.strokeStyle = borderColor
    ctx.stroke()
  }

  // Reseta sombra para desenhar o mascote nítido dentro do círculo
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0

  // Clip circular para recortar a imagem com perfeição geométrica
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2)
  ctx.clip()

  // Desenha a imagem cobrindo o círculo
  const naturalW =
    mascotCanvasOrImg instanceof HTMLCanvasElement
      ? mascotCanvasOrImg.width
      : mascotCanvasOrImg.naturalWidth || mascotCanvasOrImg.width || size
  const naturalH =
    mascotCanvasOrImg instanceof HTMLCanvasElement
      ? mascotCanvasOrImg.height
      : mascotCanvasOrImg.naturalHeight || mascotCanvasOrImg.height || size

  // Enquadra um pouco mais focado no personagem
  const aspect = naturalW / naturalH
  let drawW = size
  let drawH = size
  let drawX = x
  let drawY = y

  if (aspect > 1) {
    drawW = size * aspect
    drawX = centerX - drawW / 2
  } else {
    drawH = size / aspect
    drawY = centerY - drawH / 2
  }

  // Leve ajuste vertical para enquadrar perfeitamente chapéu e polegar
  ctx.drawImage(mascotCanvasOrImg, drawX, drawY - size * 0.02, drawW, drawH)

  ctx.restore()

  // Pequeno selo / mini tag "Mascote Oficial"
  ctx.save()
  const tagH = Math.round(size * 0.16)
  const tagW = Math.round(size * 0.72)
  const tagX = centerX - tagW / 2
  const tagY = y + size - tagH / 2

  ctx.beginPath()
  ctx.roundRect(tagX, tagY, tagW, tagH, tagH / 2)
  ctx.fillStyle = '#0B7A5B'
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = '#F5C518'
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `800 ${Math.round(tagH * 0.55)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  ctx.fillText('ECOSOLAR', centerX, tagY + tagH * 0.68)
  ctx.restore()
}
