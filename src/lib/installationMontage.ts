import logoEcosolar from '@/assets/editedimage1773228973392-e62fd.png'

export interface MontageData {
  photos: string[] // URLs das fotos (1 a 4)
  potenciaKw?: number | string // Ex: 11.38 ou "11.38 KWp"
  modulos?: string // Ex: "Módulos Winaico 610 Wp" ou vazio
  inversor?: string // Ex: "Inversor Growatt 5 kW" ou vazio
  economiaMensal?: number | string // Ex: 700 ou "+700 R$/Mês"
  cidade?: string // Ex: "Seringueiras"
  estado?: string // Ex: "RO"
  observacao?: string // Ex: "Cliente Direto de Portugal" ou observação curta opcional
  clienteNome?: string // Mantido para compatibilidade e texto de compartilhamento
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => {
      // Fallback sem crossOrigin se falhar ou se for data URI
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
 * Desenha uma imagem com corte "cover" (preenche o retângulo centralizando e cortando excedentes)
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
 * Desenha o ícone do painel solar estilizado caso precise de fallback ou complemento
 */
function drawSolarPanelIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  ctx.save()
  ctx.translate(x, y)

  // Raios de sol em amarelo suave no canto esquerdo
  ctx.strokeStyle = '#FCD34D'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  const rays = [
    [-20, -10, -5, 5],
    [-25, 20, -10, 25],
    [-15, 45, -2, 45],
    [-20, 70, -5, 65],
  ]
  for (const [x1, y1, x2, y2] of rays) {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  // Perspectiva do painel solar (trapézio inclinado para a direita)
  const p1 = { x: 10, y: 35 } // topo esquerdo
  const p2 = { x: width - 20, y: 15 } // topo direito
  const p3 = { x: width + 5, y: height - 15 } // base direita
  const p4 = { x: 5, y: height - 5 } // base esquerda

  // Moldura do painel
  ctx.fillStyle = '#1E3A8A'
  ctx.strokeStyle = '#2563EB'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.lineTo(p3.x, p3.y)
  ctx.lineTo(p4.x, p4.y)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Células solares (linhas brancas / azuis claras de grade)
  ctx.strokeStyle = '#93C5FD'
  ctx.lineWidth = 2
  // Linhas verticais
  for (let i = 1; i <= 3; i++) {
    const t = i / 4
    const topX = p1.x + (p2.x - p1.x) * t
    const topY = p1.y + (p2.y - p1.y) * t
    const botX = p4.x + (p3.x - p4.x) * t
    const botY = p4.y + (p3.y - p4.y) * t
    ctx.beginPath()
    ctx.moveTo(topX, topY)
    ctx.lineTo(botX, botY)
    ctx.stroke()
  }
  // Linhas horizontais
  for (let j = 1; j <= 2; j++) {
    const t = j / 3
    const leftX = p1.x + (p4.x - p1.x) * t
    const leftY = p1.y + (p4.y - p1.y) * t
    const rightX = p2.x + (p3.x - p2.x) * t
    const rightY = p2.y + (p3.y - p2.y) * t
    ctx.beginPath()
    ctx.moveTo(leftX, leftY)
    ctx.lineTo(rightX, rightY)
    ctx.stroke()
  }

  // Suporte do painel na base
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo((p4.x + p3.x) / 2 - 10, (p4.y + p3.y) / 2)
  ctx.lineTo((p4.x + p3.x) / 2 - 10, height + 8)
  ctx.moveTo((p4.x + p3.x) / 2 + 10, (p4.y + p3.y) / 2)
  ctx.lineTo((p4.x + p3.x) / 2 + 10, height + 8)
  ctx.stroke()

  // Base plana de suporte
  ctx.beginPath()
  ctx.moveTo((p4.x + p3.x) / 2 - 25, height + 8)
  ctx.lineTo((p4.x + p3.x) / 2 + 25, height + 8)
  ctx.stroke()

  // Mini ícone de bateria verde carregando
  ctx.fillStyle = '#22C55E'
  ctx.fillRect(width + 12, height / 2 - 18, 14, 26)
  ctx.fillStyle = '#15803D'
  ctx.fillRect(width + 15, height / 2 - 22, 8, 4)

  ctx.restore()
}

/**
 * Desenha o cabeçalho branco oficial da marca Ecosolar Energy conforme o post do Instagram
 */
function drawHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  headerHeight: number,
  logoImg: HTMLImageElement | null,
) {
  // 1. Fundo 100% branco
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, headerHeight)

  const headerCenterX = width / 2

  if (logoImg) {
    // Usar o asset oficial da logo Ecosolar
    // Calculamos tamanho harmônico no cabeçalho
    const naturalAspect = (logoImg.naturalWidth || 1) / (logoImg.naturalHeight || 1)
    const logoH = 140
    const logoW = logoH * naturalAspect
    const logoX = headerCenterX - logoW / 2
    const logoY = 25

    ctx.drawImage(logoImg, logoX, logoY, logoW, logoH)

    // Tagline / Slogan abaixo da logo: "A ENERGIA DO FUTURO, HOJE!"
    ctx.textAlign = 'center'
    ctx.fillStyle = '#1E293B' // Preto/grafite conforme o post
    ctx.font = '800 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.letterSpacing = '1px'
    ctx.fillText('A ENERGIA DO FUTURO, HOJE!', headerCenterX, 215)
    ctx.letterSpacing = '0px'
  } else {
    // Renderização vetorial fiel se a imagem não carregar
    const iconW = 110
    const iconH = 80
    const startX = headerCenterX - 360

    drawSolarPanelIcon(ctx, startX, 35, iconW, iconH)

    const textX = startX + iconW + 40
    const textY = 95

    ctx.textAlign = 'left'
    ctx.font = '900 68px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

    // "ECO" em verde escuro
    ctx.fillStyle = '#065F46'
    ctx.fillText('ECO', textX, textY)
    const ecoW = ctx.measureText('ECO').width

    // "SOLAR" em amarelo
    ctx.fillStyle = '#F59E0B'
    ctx.fillText('SOLAR', textX + ecoW, textY)
    const solarW = ctx.measureText('SOLAR').width

    // " ENERGY" em grafite/preto
    ctx.fillStyle = '#0F172A'
    ctx.fillText(' ENERGY', textX + ecoW + solarW, textY)

    // Tagline minúscula no canto direito: "Energia solar"
    ctx.fillStyle = '#64748B'
    ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('Energia solar', textX + ecoW + solarW + 180, textY - 45)

    // Slogan em preto centralizado abaixo
    ctx.textAlign = 'center'
    ctx.fillStyle = '#0F172A'
    ctx.font = '800 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('A ENERGIA DO FUTURO, HOJE!', headerCenterX, 200)
  }
}

/**
 * Desenha o painel azul royal sobreposto com os dados técnicos do sistema
 * Conforme o layout oficial do post:
 * - Potência em destaque: ex: "Potência 11.38 KWp" (ou "Potência Solar" se não informado)
 * - Módulos: equipamento real da proposta ou em branco se não houver
 * - Inversor: equipamento real da proposta ou em branco se não houver
 * - Pílula cinza arredondada com texto preto: ex: "Economia +700 R$/Mês" (ou "Economia na Fatura")
 * - Localização em amarelo negrito: "Localização: Seringueiras-RO"
 * - Observação opcional
 */
function drawInfoCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  data: MontageData,
) {
  ctx.save()

  // Fundo Azul Royal escuro idêntico ao do post (~#3B44AC / #3843a8)
  ctx.fillStyle = '#3B44AC'
  ctx.fillRect(x, y, width, height)

  // Margem interna do cartão azul
  const padLeft = x + 38
  const padRight = x + width - 38
  let curY = y + 70

  // 1. Potência em destaque grande branco/negrito
  let potStr = ''
  if (data.potenciaKw !== undefined && data.potenciaKw !== null && data.potenciaKw !== '') {
    const rawPot = String(data.potenciaKw).trim()
    if (/kwp/i.test(rawPot)) {
      potStr = `Potência ${rawPot}`
    } else {
      const pNum = Number(rawPot.replace(',', '.'))
      if (!isNaN(pNum) && pNum > 0) {
        potStr = `Potência ${pNum.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} KWp`
      } else {
        potStr = `Potência ${rawPot} KWp`
      }
    }
  } else {
    potStr = 'Potência Solar'
  }

  ctx.textAlign = 'left'
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '900 62px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillText(potStr, padLeft, curY)
  curY += 80

  // 2. Módulos (reais da proposta; sem valores genéricos hardcoded de exemplo)
  const modulosText = (data.modulos || '').trim()
  if (modulosText) {
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '600 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(modulosText, padLeft, curY)
    curY += 60
  }

  // 3. Inversor (real da proposta; sem valores genéricos hardcoded de exemplo)
  const inversorText = (data.inversor || '').trim()
  if (inversorText) {
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '600 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(inversorText, padLeft, curY)
    curY += 80
  } else if (!modulosText) {
    // Se ambos estiverem vazios, ajusta o espaçamento até a pílula de economia
    curY += 20
  } else {
    curY += 40
  }

  // 4. Pílula cinza claro arredondada com texto preto: "Economia +X R$/Mês"
  let econStr = ''
  if (
    data.economiaMensal !== undefined &&
    data.economiaMensal !== null &&
    data.economiaMensal !== ''
  ) {
    const rawEcon = String(data.economiaMensal).trim()
    if (/r\$/i.test(rawEcon) || /mês/i.test(rawEcon)) {
      econStr = rawEcon.startsWith('Economia') ? rawEcon : `Economia ${rawEcon}`
    } else {
      const numEcon = Number(rawEcon.replace(/[^\d.,]/g, '').replace(',', '.'))
      if (!isNaN(numEcon) && numEcon > 0) {
        econStr = `Economia +${Math.round(numEcon)} R$/Mês`
      } else {
        econStr = `Economia ${rawEcon}`
      }
    }
  } else {
    econStr = 'Economia na Fatura'
  }

  // Desenho da pílula arredondada
  const pillH = 82
  const pillW = Math.min(width - 76, Math.max(500, padRight - padLeft))
  const pillRadius = pillH / 2
  const pillY = curY

  ctx.fillStyle = '#94A3B8' // Cinza claro / slate-400 acinzentado do post
  ctx.beginPath()
  ctx.roundRect(padLeft, pillY, pillW, pillH, pillRadius)
  ctx.fill()

  // Texto dentro da pílula (preto forte centralizado ou com alinhamento elegante)
  ctx.fillStyle = '#0F172A'
  ctx.font = '900 50px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(econStr, padLeft + pillW / 2, pillY + 58)
  curY += pillH + 75

  // 5. Localização em amarelo negrito ("Localização: Seringueiras-RO")
  const cidade = (data.cidade || '').trim()
  const estado = (data.estado || '').trim()
  let locText = 'Localização: '
  if (cidade && estado) {
    locText += `${cidade}-${estado.toUpperCase()}`
  } else if (cidade) {
    locText += cidade
  } else if (estado) {
    locText += estado.toUpperCase()
  } else {
    locText += 'Instalação Concluída'
  }

  ctx.textAlign = 'left'
  ctx.fillStyle = '#FBBF24' // Amarelo vibrante solar (#fbbf24 / #facc15)
  ctx.font = '800 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillText(locText, padLeft, curY)
  curY += 45

  // 6. Linha menor branca opcional logo abaixo da localização ("Clienete Direto de Portugal")
  const obsText = (data.observacao || '').trim()
  if (obsText) {
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '600 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(obsText, padLeft, curY)
  }

  ctx.restore()
}

/**
 * Gera um Canvas com a montagem promocional idêntica ao post do Instagram @_ecosolar_energy (2000x2000px)
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

  // Fundo geral branco
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)

  // 1. Cabeçalho branco no topo (0 a 250px)
  const headerHeight = 250
  let logoImg: HTMLImageElement | null = null
  try {
    logoImg = await loadImage(logoEcosolar)
  } catch (err) {
    console.warn('Não foi possível carregar a logo para a montagem:', err)
  }
  drawHeader(ctx, width, headerHeight, logoImg)

  // 2. Área de Fotos / Colagem do post do Instagram
  // No post:
  // - Topo: Y = 250px, Altura total = 1750px (até o final Y = 2000px)
  // - O cartão azul ocupa a primeira metade superior esquerda: X = 0, Y = 250, W = 1000, H = 760
  // - No topo direito: Foto 1 (lado a lado com o painel azul): X = 1000, Y = 250, W = 1000, H = 760
  // - Abaixo do painel azul, na coluna esquerda: Foto 2 (vertical/alta): X = 0, Y = 1010, W = 880, H = 990
  // - No centro inferior / meio: Foto 3 (quadrada / detalhe): X = 880, Y = 1010, W = 460, H = 340
  // - Na direita inferior: Foto 4 (grande paisagem / telhado): X = 880, Y = 1350 (ou compondo o restante), W = 1120, H = 650
  //
  // Adaptamos dinamicamente de acordo com a quantidade de fotos (1, 2, 3 ou 4)

  const contentY = headerHeight // 250
  const contentH = height - contentY // 1750

  // Painel azul: ocupa o canto superior esquerdo sobreposto
  const panelW = 1000
  const panelH = 760

  // Carregar todas as fotos
  const validPhotos = (data.photos || []).filter(Boolean).slice(0, 4)
  const loadedPhotos: HTMLImageElement[] = []
  for (const url of validPhotos) {
    try {
      const pImg = await loadImage(url)
      loadedPhotos.push(pImg)
    } catch (e) {
      console.warn('Erro ao carregar foto para montagem:', url, e)
    }
  }

  const count = loadedPhotos.length

  if (count === 0) {
    // Nenhuma foto: preenche com fundo sutil e cartão azul
    ctx.fillStyle = '#E2E8F0'
    ctx.fillRect(0, contentY, width, contentH)

    ctx.fillStyle = '#64748B'
    ctx.font = '500 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Nenhuma foto da instalação disponível', width / 2 + 200, contentY + contentH / 2)
  } else if (count === 1) {
    // 1 foto: ocupa toda a área de conteúdo abaixo do cabeçalho
    drawImageCover(ctx, loadedPhotos[0], 0, contentY, width, contentH)
  } else if (count === 2) {
    // 2 fotos:
    // Foto 1 ocupa a coluna direita do topo (1000, 250, 1000, 760) e desce parcialmente ou lado a lado
    // Layout refinado: Foto 1 na metade direita superior (1000, 250, 1000, 760), Foto 2 ocupa toda a metade inferior (0, 1010, 2000, 990)
    drawImageCover(ctx, loadedPhotos[0], panelW, contentY, width - panelW, panelH)
    drawImageCover(ctx, loadedPhotos[1], 0, contentY + panelH, width, contentH - panelH)
  } else if (count === 3) {
    // 3 fotos:
    // Foto 1 no topo direito: (1000, 250, 1000, 760)
    // Foto 2 na metade esquerda inferior: (0, 1010, 960, 990)
    // Foto 3 na metade direita inferior: (960, 1010, 1040, 990)
    drawImageCover(ctx, loadedPhotos[0], panelW, contentY, width - panelW, panelH)
    drawImageCover(ctx, loadedPhotos[1], 0, contentY + panelH, 960, contentH - panelH)
    drawImageCover(ctx, loadedPhotos[2], 960, contentY + panelH, width - 960, contentH - panelH)
  } else {
    // 4 fotos: Layout idêntico ao do post @_ecosolar_energy:
    // 1. Foto Topo Direito (telhado / painéis no horizonte): X = 1000, Y = 250, W = 1000, H = 760
    drawImageCover(ctx, loadedPhotos[0], panelW, contentY, width - panelW, panelH)

    // 2. Foto Esquerda Inferior (inversor na parede cinza / vertical):
    // X = 0, Y = 1010, W = 880, H = 990
    const colLeftW = 880
    const bottomY = contentY + panelH
    const bottomH = contentH - panelH
    drawImageCover(ctx, loadedPhotos[1], 0, bottomY, colLeftW, bottomH)

    // 3. Foto Central Menor (padrão de energia / relógio):
    // X = 880, Y = 1010, W = 420, H = 340
    const midW = 420
    const midH = 340
    drawImageCover(ctx, loadedPhotos[2], colLeftW, bottomY, midW, midH)

    // 4. Foto Direita Inferior Grande / Paisagem (telhado amplo com módulos e vista do bairro):
    // Ocupa o restante: Foto 3 ocupa a parte superior dessa coluna menor;
    // Foto 4 preenche toda a área restante à direita e abaixo de Foto 3:
    // Para efeito orgânico idêntico ao do Instagram:
    // Uma foto grande no canto inferior direito que se estende por trás ou preenche:
    // X = 1300, Y = 1010, W = 700, H = 990 E também o espaço sob a Foto 3 (X=880..1300, Y=1350..2000)
    // Desenhamos a Foto 4 cobrindo a área da direita e abaixo da Foto 3:
    drawImageCover(
      ctx,
      loadedPhotos[3],
      colLeftW + midW,
      bottomY,
      width - (colLeftW + midW),
      bottomH,
    )
    drawImageCover(ctx, loadedPhotos[3], colLeftW, bottomY + midH, midW, bottomH - midH)
  }

  // 3. Desenhar o painel azul royal sobreposto no canto superior esquerdo
  // (Desenhamos após as fotos para ficar perfeitamente sobreposto como no post)
  drawInfoCard(ctx, 0, contentY, panelW, panelH, data)

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
  filename = 'instalacao-ecosolar-post.png',
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
  const file = new File([blob], 'instalacao-ecosolar-post.png', { type: 'image/png' })

  // Tentar Web Share API com suporte a arquivos
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Instalação Solar Concluída - Ecosolar Energy',
        text: `Confira o post oficial da instalação solar concluída${leadName ? ` para ${leadName}` : ''}${city ? ` em ${city}` : ''}! ☀️⚡`,
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
  downloadMontageImage(canvas, 'instalacao-ecosolar-post.png')

  const rawPhone = (phone || '').replace(/\D/g, '')
  const msg = `Olá${leadName ? `, ${leadName}` : ''}! Aqui está o post oficial da sua instalação solar concluída pela Ecosolar Energy! ☀️⚡`

  const waUrl = rawPhone
    ? `https://wa.me/55${rawPhone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`

  window.open(waUrl, '_blank')
  return { sharedViaApi: false }
}
