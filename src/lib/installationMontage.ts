import logoEcosolar from '@/assets/editedimage1773228973392-e62fd.png'

export interface MontageData {
  photos: string[] // URLs das fotos (1 a 4)
  potenciaKw?: number | string
  cidade?: string
  estado?: string
  clienteNome?: string
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => {
      // Tenta fallback sem crossOrigin se for data URI ou falha de CORS
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
 * Desenha uma imagem com ajuste "cover" (preenche o retângulo centralizando e cortando excessos)
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 0,
) {
  ctx.save()
  if (radius > 0) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, radius)
    ctx.clip()
  }

  const imgW = img.naturalWidth || img.width
  const imgH = img.naturalHeight || img.height
  const imgRatio = imgW / imgH
  const targetRatio = w / h

  let sX = 0
  let sY = 0
  let sW = imgW
  let sH = imgH

  if (imgRatio > targetRatio) {
    sW = imgH * targetRatio
    sX = (imgW - sW) / 2
  } else {
    sH = imgW / targetRatio
    sY = (imgH - sH) / 2
  }

  ctx.drawImage(img, sX, sY, sW, sH, x, y, w, h)
  ctx.restore()
}

/**
 * Gera um Canvas com a montagem promocional de alta qualidade (~2000px)
 */
export async function generateInstallationMontageCanvas(
  data: MontageData,
): Promise<HTMLCanvasElement> {
  const width = 2000
  const height = 2000
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível obter contexto 2D do Canvas')

  // Fundo corporativo escuro com degradê premium da Ecosolar Energy (#0a1612 -> #030a08)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height)
  bgGrad.addColorStop(0, '#0d1d17')
  bgGrad.addColorStop(0.5, '#07120e')
  bgGrad.addColorStop(1, '#030806')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // Efeito de brilho solar suave no canto superior direito
  const sunGlow = ctx.createRadialGradient(width - 200, 200, 50, width - 200, 200, 900)
  sunGlow.addColorStop(0, 'rgba(234, 179, 8, 0.18)')
  sunGlow.addColorStop(0.5, 'rgba(11, 122, 91, 0.12)')
  sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = sunGlow
  ctx.fillRect(0, 0, width, height)

  // 1. Cabeçalho Corporativo
  const headerY = 70
  const headerH = 190
  const padX = 80

  // Carregar Logo da Ecosolar
  let logoImg: HTMLImageElement | null = null
  try {
    logoImg = await loadImage(logoEcosolar)
  } catch (err) {
    console.warn('Não foi possível carregar a logo para a montagem:', err)
  }

  if (logoImg) {
    // Desenhar logo no cabeçalho
    const logoAspect = (logoImg.naturalWidth || 1) / (logoImg.naturalHeight || 1)
    const logoH = 110
    const logoW = logoH * logoAspect
    ctx.drawImage(logoImg, padX, headerY + 10, logoW, logoH)

    // Nome da marca e slogan ao lado da logo
    const textStartX = padX + logoW + 28
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 54px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('ECOSOLAR ENERGY', textStartX, headerY + 62)

    ctx.fillStyle = '#EAB308' // Amarelo solar
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('ENERGIA SOLAR & SUSTENTABILIDADE', textStartX, headerY + 104)
  } else {
    // Fallback texto sem imagem
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('ECOSOLAR ENERGY', padX, headerY + 70)

    ctx.fillStyle = '#EAB308'
    ctx.font = '600 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('ENERGIA SOLAR INTELIGENTE', padX, headerY + 115)
  }

  // Selo no canto direito do cabeçalho
  const badgeW = 390
  const badgeH = 76
  const badgeX = width - padX - badgeW
  const badgeY = headerY + 26

  ctx.save()
  ctx.fillStyle = 'rgba(11, 122, 91, 0.35)'
  ctx.strokeStyle = '#0B7A5B'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 38)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#34D399' // Verde esmeralda claro
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('OBRA CONCLUÍDA & GERANDO', badgeX + badgeW / 2, badgeY + 47)
  ctx.restore()

  // Linha sutil separadora abaixo do cabeçalho
  const sepGrad = ctx.createLinearGradient(padX, 0, width - padX, 0)
  sepGrad.addColorStop(0, 'rgba(234, 179, 8, 0.8)')
  sepGrad.addColorStop(0.5, 'rgba(11, 122, 91, 0.8)')
  sepGrad.addColorStop(1, 'rgba(234, 179, 8, 0.8)')
  ctx.strokeStyle = sepGrad
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(padX, headerY + headerH)
  ctx.lineTo(width - padX, headerY + headerH)
  ctx.stroke()

  // 2. Área Central de Fotos (Grade)
  const gridTop = headerY + headerH + 50
  const gridBottom = height - 280 // Espaço para rodapé
  const gridW = width - padX * 2
  const gridH = gridBottom - gridTop
  const gap = 24
  const photoRadius = 24

  // Pré-carregar todas as fotos válidas
  const validPhotos = (data.photos || []).filter(Boolean).slice(0, 4)
  const loadedPhotos: HTMLImageElement[] = []

  for (const url of validPhotos) {
    try {
      const pImg = await loadImage(url)
      loadedPhotos.push(pImg)
    } catch (e) {
      console.warn('Erro ao carregar foto da instalação:', url, e)
    }
  }

  const count = loadedPhotos.length

  if (count === 0) {
    // Nenhuma foto carregada: desenha placeholder elegante
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(padX, gridTop, gridW, gridH, photoRadius)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '500 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Nenhuma foto da instalação disponível', width / 2, gridTop + gridH / 2)
    ctx.restore()
  } else if (count === 1) {
    // 1 Foto grande ocupando toda a área da grade
    drawImageCover(ctx, loadedPhotos[0], padX, gridTop, gridW, gridH, photoRadius)
  } else if (count === 2) {
    // 2 Fotos lado a lado
    const cellW = (gridW - gap) / 2
    drawImageCover(ctx, loadedPhotos[0], padX, gridTop, cellW, gridH, photoRadius)
    drawImageCover(ctx, loadedPhotos[1], padX + cellW + gap, gridTop, cellW, gridH, photoRadius)
  } else if (count === 3) {
    // 3 Fotos: Grade 2x2 sendo que o 4º slot é preenchido com banner/logo promocional
    const cellW = (gridW - gap) / 2
    const cellH = (gridH - gap) / 2

    // Foto 1: topo esquerdo
    drawImageCover(ctx, loadedPhotos[0], padX, gridTop, cellW, cellH, photoRadius)
    // Foto 2: topo direito
    drawImageCover(ctx, loadedPhotos[1], padX + cellW + gap, gridTop, cellW, cellH, photoRadius)
    // Foto 3: inferior esquerdo
    drawImageCover(ctx, loadedPhotos[2], padX, gridTop + cellH + gap, cellW, cellH, photoRadius)

    // Slot 4: Cartão corporativo com Logo Ecosolar
    const slotX = padX + cellW + gap
    const slotY = gridTop + cellH + gap
    ctx.save()
    ctx.fillStyle = 'rgba(11, 122, 91, 0.25)'
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.roundRect(slotX, slotY, cellW, cellH, photoRadius)
    ctx.fill()
    ctx.stroke()

    if (logoImg) {
      const lH = 150
      const lW = lH * ((logoImg.naturalWidth || 1) / (logoImg.naturalHeight || 1))
      ctx.drawImage(logoImg, slotX + (cellW - lW) / 2, slotY + cellH / 2 - lH / 2 - 40, lW, lH)
    }

    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('ECOSOLAR ENERGY', slotX + cellW / 2, slotY + cellH / 2 + 75)

    ctx.fillStyle = '#EAB308'
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('SISTEMA HOMOLOGADO', slotX + cellW / 2, slotY + cellH / 2 + 115)
    ctx.restore()
  } else {
    // 4 Fotos: Grade 2x2
    const cellW = (gridW - gap) / 2
    const cellH = (gridH - gap) / 2

    drawImageCover(ctx, loadedPhotos[0], padX, gridTop, cellW, cellH, photoRadius)
    drawImageCover(ctx, loadedPhotos[1], padX + cellW + gap, gridTop, cellW, cellH, photoRadius)
    drawImageCover(ctx, loadedPhotos[2], padX, gridTop + cellH + gap, cellW, cellH, photoRadius)
    drawImageCover(
      ctx,
      loadedPhotos[3],
      padX + cellW + gap,
      gridTop + cellH + gap,
      cellW,
      cellH,
      photoRadius,
    )
  }

  // 3. Rodapé Corporativo com Potência Instalada e Cidade/UF
  const footerY = height - 215
  const footerH = 145

  // Fundo do banner do rodapé
  ctx.save()
  const footGrad = ctx.createLinearGradient(padX, 0, width - padX, 0)
  footGrad.addColorStop(0, '#0F2C23')
  footGrad.addColorStop(0.5, '#0B7A5B')
  footGrad.addColorStop(1, '#0F2C23')

  ctx.fillStyle = footGrad
  ctx.strokeStyle = '#EAB308'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.roundRect(padX, footerY, width - padX * 2, footerH, 24)
  ctx.fill()
  ctx.stroke()

  // Formatar potência
  let potStr = ''
  if (data.potenciaKw !== undefined && data.potenciaKw !== null && data.potenciaKw !== '') {
    const potNum = Number(data.potenciaKw)
    if (!isNaN(potNum) && potNum > 0) {
      potStr = `${potNum.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kWp`
    } else {
      potStr = `${data.potenciaKw}`
    }
  }

  // Formatar cidade/UF
  const locParts = [data.cidade, data.estado].filter(Boolean)
  const locStr = locParts.length > 0 ? locParts.join(' - ') : 'Instalação Solar Concluída'

  // Bloco Esquerdo: Potência Instalada
  const colLeftX = padX + 50
  ctx.fillStyle = '#FDE047' // Amarelo claro
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('POTÊNCIA INSTALADA', colLeftX, footerY + 50)

  ctx.fillStyle = '#FFFFFF'
  ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillText(potStr || 'Alta Performance', colLeftX, footerY + 108)

  // Divisor vertical sutil
  const divX = padX + 620
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(divX, footerY + 25)
  ctx.lineTo(divX, footerY + footerH - 25)
  ctx.stroke()

  // Bloco Central/Direito: Localização / Cliente
  const colRightX = divX + 50
  ctx.fillStyle = '#A7F3D0' // Esmeralda suave
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(
    data.clienteNome ? `CLIENTE: ${data.clienteNome.toUpperCase()}` : 'LOCALIZAÇÃO DA INSTALAÇÃO',
    colRightX,
    footerY + 50,
  )

  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillText(locStr, colRightX, footerY + 106)

  // Selo ou Call-To-Action à direita
  const ctaX = width - padX - 50
  ctx.fillStyle = '#EAB308'
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('GERAÇÃO PRÓPRIA LIMPA', ctaX, footerY + 52)

  ctx.fillStyle = '#E2E8F0'
  ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillText('www.ecosolarenergy.com.br', ctaX, footerY + 102)

  ctx.restore()

  return canvas
}

/**
 * Converte o Canvas em um arquivo Blob PNG
 */
export async function getMontageBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Erro ao converter Canvas para Blob'))
    }, 'image/png')
  })
}

/**
 * Dispara o download da imagem promocional no navegador
 */
export function downloadMontageImage(
  canvas: HTMLCanvasElement,
  filename = 'instalacao-ecosolar.png',
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
 * Compartilha a imagem no WhatsApp via Web Share API se suportado;
 * Caso não seja, realiza o download e abre o link do WhatsApp com mensagem pronta.
 */
export async function shareMontageOnWhatsApp(
  canvas: HTMLCanvasElement,
  phone?: string,
  leadName?: string,
  city?: string,
): Promise<{ sharedViaApi: boolean }> {
  const blob = await getMontageBlob(canvas)
  const file = new File([blob], 'instalacao-ecosolar.png', { type: 'image/png' })

  // Tentar Web Share API com suporte a arquivos
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Instalação Solar Concluída - Ecosolar Energy',
        text: `Confira a instalação solar realizada com sucesso${leadName ? ` para ${leadName}` : ''}${city ? ` em ${city}` : ''}!`,
        files: [file],
      })
      return { sharedViaApi: true }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Usuário cancelou o compartilhamento
        return { sharedViaApi: true }
      }
      console.warn('Erro ao compartilhar via Web Share API, recorrendo ao fallback:', err)
    }
  }

  // Fallback: faz o download automático da imagem e abre a conversa do WhatsApp
  downloadMontageImage(canvas, 'instalacao-ecosolar.png')

  const rawPhone = (phone || '').replace(/\D/g, '')
  const msg = `Olá${leadName ? `, ${leadName}` : ''}! Aqui está a foto oficial da sua instalação solar concluída pela Ecosolar Energy! ☀️⚡`

  const waUrl = rawPhone
    ? `https://wa.me/55${rawPhone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`

  window.open(waUrl, '_blank')
  return { sharedViaApi: false }
}
