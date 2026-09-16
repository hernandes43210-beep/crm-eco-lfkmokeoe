import horizontalLogoPng from '@/assets/design-sem-nome-abb38.png'

export const ECOSOLAR_HORIZONTAL_LOGO_ASSET = horizontalLogoPng

/**
 * Carrega a imagem da logo horizontal Ecosolar
 */
export function loadHorizontalLogoImage(
  src: string = horizontalLogoPng,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => {
      if (!img.crossOrigin) {
        reject(new Error(`Falha ao carregar logo: ${src.slice(0, 60)}`))
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

let cachedTransparentLogoCanvas: HTMLCanvasElement | null = null

/**
 * Processa a imagem da logo horizontal (PNG com fundo branco) e remove o fundo branco,
 * tornando pixels brancos/quase-brancos transparentes com suavização de bordas (anti-aliasing).
 * Isso permite que a logo se integre perfeitamente sobre o fundo vibrante ou sobre cards translúcidos.
 */
export function getCleanHorizontalLogoCanvas(logoImg: HTMLImageElement): HTMLCanvasElement {
  if (cachedTransparentLogoCanvas) {
    return cachedTransparentLogoCanvas
  }

  const w = logoImg.naturalWidth || logoImg.width || 600
  const h = logoImg.naturalHeight || logoImg.height || 230

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  ctx.drawImage(logoImg, 0, 0, w, h)

  try {
    const imgData = ctx.getImageData(0, 0, w, h)
    const data = imgData.data

    // Remove fundo branco/próximo de branco
    // Valores acima de 242 em RGB são considerados fundo
    // Fazemos um fade suave entre 215 e 245 para não recortar de forma serrilhada
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const minChannel = Math.min(r, g, b)

      if (minChannel > 215) {
        // Se todas as componentes forem claras (próximo do branco puro)
        if (minChannel >= 246) {
          data[i + 3] = 0 // totalmente transparente
        } else {
          // Fade suave entre 215 e 246
          const factor = (246 - minChannel) / (246 - 215)
          data[i + 3] = Math.round(data[i + 3] * factor)
        }
      }
    }

    ctx.putImageData(imgData, 0, 0)
    cachedTransparentLogoCanvas = canvas
    return canvas
  } catch (err) {
    console.warn('Não foi possível processar transparência da logo via getImageData:', err)
    return canvas
  }
}
