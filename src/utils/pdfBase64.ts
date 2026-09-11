/**
 * Utilitário para converter HTML ou texto em um arquivo PDF puro compatível com visualizadores
 * e com os servidores da Clicksign sem depender de binários nativos no navegador.
 * Gera um PDF minimalista válido (PDF-1.4) com formatação em texto, metadados e quebras de linha.
 */

function escapePdfString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

/**
 * Converte HTML simples para texto limpo quebrando em parágrafos e linhas
 */
export function htmlToPlainText(html: string): string {
  // Substituir quebras e títulos por quebras de linha
  let text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' | ')
    .replace(/<\/div>/gi, '\n')
    .replace(/<br\s*[/]?>/gi, '\n')
    .replace(/<hr\s*[/]?>/gi, '\n------------------------------------------------------------\n')
    .replace(/<[^>]+>/g, '')

  // Decodificar entidades HTML comuns
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&bull;/g, '•')
    .replace(/&mdash;/g, '—')

  // Reduzir múltiplas linhas em branco para no máximo duas
  text = text.replace(/\n{3,}/g, '\n\n').trim()

  return text
}

/**
 * Quebra uma linha de texto para que não ultrapasse maxChars por linha
 */
function wrapLine(text: string, maxChars = 80): string[] {
  if (text.length <= maxChars) return [text]
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const w of words) {
    if ((currentLine + ' ' + w).trim().length <= maxChars) {
      currentLine = currentLine ? currentLine + ' ' + w : w
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = w
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

/**
 * Gera um Buffer/Uint8Array de um PDF-1.4 válido contendo o texto formatado em páginas
 */
export function generateSimplePdfBuffer(title: string, textContent: string): Uint8Array {
  const rawLines = textContent.split('\n')
  const wrappedLines: string[] = []

  for (const line of rawLines) {
    if (line.trim().length === 0) {
      wrappedLines.push('')
    } else {
      wrappedLines.push(...wrapLine(line, 86))
    }
  }

  const linesPerPage = 48
  const pages: string[][] = []
  for (let i = 0; i < wrappedLines.length; i += linesPerPage) {
    pages.push(wrappedLines.slice(i, i + linesPerPage))
  }
  if (pages.length === 0) pages.push([''])

  const totalPages = pages.length

  // Montagem manual de PDF-1.4 com tabela de xref e objetos
  const objects: string[] = []

  // Obj 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj')

  // Obj 2: Pages root
  const pageRefs = pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ')
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [ ${pageRefs} ] /Count ${totalPages} >>\nendobj`)

  // Obj 3: Font
  objects.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj')

  // Para cada página:
  // Obj 4 + i*2: Page object
  // Obj 5 + i*2: Content stream
  pages.forEach((pageLines, idx) => {
    const pageObjNum = 4 + idx * 2
    const contentObjNum = pageObjNum + 1

    objects.push(
      `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 595 842 ] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjNum} 0 R >>\nendobj`,
    )

    // Construir stream de texto para a página A4 (595 x 842 pt)
    let streamText = 'BT\n/F1 10 Tf\n14 TL\n45 800 Td\n'
    // Cabeçalho da página
    streamText += `(${escapePdfString(title)} - Fl. ${idx + 1}/${totalPages}) Tj\nT*\nT*\n`

    for (const l of pageLines) {
      // Remover caracteres não ASCII para compatibilidade padrão Type1 Helvetica
      const asciiLine = l
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, ' ')
      streamText += `(${escapePdfString(asciiLine)}) Tj\nT*\n`
    }
    streamText += 'ET'

    const streamLength = streamText.length
    objects.push(
      `${contentObjNum} 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamText}\nendstream\nendobj`,
    )
  })

  // Montar arquivo com cabeçalho, objetos e xref
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
  const offsets: number[] = []

  for (const obj of objects) {
    offsets.push(pdf.length)
    pdf += obj + '\n'
  }

  const xrefOffset = pdf.length
  pdf += 'xref\n'
  pdf += `0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`
  }

  pdf += 'trailer\n'
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  pdf += 'startxref\n'
  pdf += `${xrefOffset}\n`
  pdf += '%%EOF'

  // Retornar Uint8Array codificado em bytes
  const bytes = new Uint8Array(pdf.length)
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 0xff
  }
  return bytes
}

/**
 * Converte Uint8Array para Data URL base64 'data:application/pdf;base64,...'
 */
export function uint8ArrayToPdfBase64(bytes: Uint8Array): string {
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return 'data:application/pdf;base64,' + btoa(binary)
}

/**
 * Gera Data URL base64 a partir do conteúdo HTML de um contrato ou procuração
 */
export function generatePdfBase64FromHtml(title: string, htmlContent: string): string {
  const plainText = htmlToPlainText(htmlContent)
  const bytes = generateSimplePdfBuffer(title, plainText)
  return uint8ArrayToPdfBase64(bytes)
}
