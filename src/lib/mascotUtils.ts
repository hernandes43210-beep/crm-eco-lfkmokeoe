import mascotImgUrl from '@/assets/editedimage1773228973392-e62fd.png'

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
 * Desenha o mascote recortado de forma limpa (removendo o fundo branco/cinza claro da arte original).
 *
 * Utiliza o algoritmo de recorte por amostragem e chave de cor (chroma key para fundo claro / vinheta clara):
 * 1. Desenha a imagem do mascote em um canvas temporário offscreen.
 * 2. Percorre os pixels: pixels com tonalidade clara (R, G, B altos e sem saturação forte) recebem transparência proporcional.
 * 3. Faz blend suave nas bordas para evitar serrilhado.
 * 4. Como segurança / fallback garantido caso haja falha de pixel-manipulation (CORS tained),
 *    desenha dentro de um badge circular ou oval suave com borda sutil.
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
  const offCtx = offCanvas.getContext('2d', { willReadFrequently: true })

  if (!offCtx) {
    // Se não puder inicializar, retorna o próprio img como canvas básico
    offCanvas.width = naturalW
    offCanvas.height = naturalH
    const fallbackCtx = offCanvas.getContext('2d')
    if (fallbackCtx) fallbackCtx.drawImage(mascotImg, 0, 0, naturalW, naturalH)
    return offCanvas
  }

  offCtx.drawImage(mascotImg, 0, 0, naturalW, naturalH)

  try {
    const imgData = offCtx.getImageData(0, 0, naturalW, naturalH)
    const data = imgData.data
    const totalPixels = naturalW * naturalH

    // A imagem do mascote tem um fundo esbranquiçado / cinza claro de estúdio (radial suave de #FFFFFF a #E5E7EB)
    // O personagem tem chapéu amarelo/palha, pele morena/clara, óculos pretos, camiseta azul-marinho e painel solar azul escuro.
    // Todos os elementos do personagem têm cores saturadas ou escuras, com exceção de pequenos brilhos especulares no chapéu/óculos/dentes.
    // Para não apagar os dentes ou reflexos do óculos, verificamos a proximidade com as bordas e a luminância.
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const a = data[idx + 3]

      if (a === 0) continue

      const x = i % naturalW
      const y = Math.floor(i / naturalW)

      // Distância do fundo claro: quase neutro (baixo delta entre R, G, B) e alta luminosidade
      const maxC = Math.max(r, g, b)
      const minC = Math.min(r, g, b)
      const diff = maxC - minC
      const brightness = (r * 299 + g * 587 + b * 114) / 1000

      // Se for muito claro e baixa saturação (fundo de estúdio fotográfico)
      // Especialmente perto do topo ou cantos onde só existe o fundo
      const isTopOrCorner = y < naturalH * 0.25 || x < naturalW * 0.12 || x > naturalW * 0.88

      if (brightness > 240 && diff < 22) {
        // Fundo praticamente branco puro -> 100% transparente
        data[idx + 3] = 0
      } else if (brightness > 215 && diff < 20 && isTopOrCorner) {
        // Gradiente cinza claro suave nos cantos
        const fade = (brightness - 215) / (240 - 215)
        data[idx + 3] = Math.round(data[idx + 3] * (1 - fade))
      } else if (brightness > 228 && diff < 16) {
        const fade = (brightness - 228) / (240 - 228)
        data[idx + 3] = Math.round(data[idx + 3] * (1 - fade * 0.9))
      }
    }

    offCtx.putImageData(imgData, 0, 0)
    cachedCroppedMascotCanvas = offCanvas
    return offCanvas
  } catch (err) {
    console.warn(
      'Recorte por canvas pixel falhou (CORS ou restrição de contexto), usando original:',
      err,
    )
    return offCanvas
  }
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
