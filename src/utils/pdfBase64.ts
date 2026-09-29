/**
 * Utilitário para conversão de HTML/texto em PDF e Data URL base64 usando jsPDF.
 * Gera documentos PDF-1.4/1.5 estritamente válidos, aceitos sem restrições
 * pela API v3 da Clicksign e outros serviços de assinatura digital.
 */

import { jsPDF } from 'jspdf'

/**
 * Converte HTML simples para texto limpo quebrando em parágrafos e linhas
 */
export function htmlToPlainText(html: string): string {
  if (!html) return ''

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
    .replace(/&ndash;/g, '–')

  // Reduzir múltiplas linhas em branco para no máximo duas
  text = text.replace(/\n{3,}/g, '\n\n').trim()

  return text
}

/**
 * Cria uma instância jsPDF formatada em A4 com o conteúdo e paginação
 */
export function createDocumentJsPdf(title: string, textContent: string): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  // Dimensões A4 em milímetros
  const pageWidth = 210
  const pageHeight = 297
  const marginTop = 22
  const marginBottom = 20
  const marginLeft = 20
  const marginRight = 20
  const contentWidth = pageWidth - marginLeft - marginRight
  const contentHeight = pageHeight - marginTop - marginBottom

  // Configuração de fontes e espaçamentos
  const bodyFontSize = 10
  const bodyLineHeightMm = 5.2

  // Quebrar o texto em parágrafos respeitando quebras intencionais
  const paragraphs = (textContent || '').split('\n')
  const allLines: string[] = []

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(bodyFontSize)

  for (const para of paragraphs) {
    if (para.trim().length === 0) {
      allLines.push('')
    } else {
      const splitLines = doc.splitTextToSize(para, contentWidth)
      allLines.push(...splitLines)
    }
  }

  if (allLines.length === 0) {
    allLines.push('')
  }

  // Paginação
  const maxLinesPerPage = Math.floor((contentHeight - 14) / bodyLineHeightMm) // 14mm reservado para topo/título
  const pages: string[][] = []

  let currentPage: string[] = []
  for (const line of allLines) {
    if (currentPage.length >= maxLinesPerPage) {
      pages.push(currentPage)
      currentPage = []
    }
    currentPage.push(line)
  }
  if (currentPage.length > 0 || pages.length === 0) {
    pages.push(currentPage)
  }

  const totalPages = pages.length

  pages.forEach((pageLines, pageIdx) => {
    if (pageIdx > 0) {
      doc.addPage('a4', 'portrait')
    }

    const pageNumber = pageIdx + 1

    // Cabeçalho institucional discreto no topo
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(50, 70, 95)
    doc.text('ECOSOLAR ENERGY', marginLeft, 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    const headerRight = `${title || 'Documento'} • Pág. ${pageNumber}/${totalPages}`
    doc.text(headerRight, pageWidth - marginRight, 12, { align: 'right' })

    // Linha divisória suave no cabeçalho
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(marginLeft, 15, pageWidth - marginRight, 15)

    // Título destacado na primeira página
    let cursorY = marginTop
    if (pageIdx === 0 && title) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(10, 25, 47) // Azul marinho escuro Ecosolar
      const titleLines = doc.splitTextToSize(title, contentWidth)
      doc.text(titleLines, marginLeft, cursorY)
      cursorY += titleLines.length * 7 + 4

      // Linha decorativa abaixo do título na pág 1
      doc.setDrawColor(245, 158, 11) // Âmbar solar
      doc.setLineWidth(0.8)
      doc.line(marginLeft, cursorY - 2, marginLeft + 35, cursorY - 2)
      cursorY += 4
    }

    // Renderizar linhas do corpo do texto
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(bodyFontSize)
    doc.setTextColor(30, 41, 59) // Cinza escuro ardósia

    for (const line of pageLines) {
      if (line.trim().length > 0) {
        // Detectar títulos em caixa alta ou seções como destaques
        const isHeading =
          (line.startsWith('CLÁUSULA') ||
            line.startsWith('CLAUSULA') ||
            line.startsWith('OUTORGANTE') ||
            line.startsWith('OUTORGADO') ||
            line.startsWith('PODERES') ||
            line.startsWith('OBJETO') ||
            line.startsWith('DAS PARTES')) &&
          line.length < 80

        if (isHeading) {
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(15, 23, 42)
          doc.text(line, marginLeft, cursorY)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(30, 41, 59)
        } else {
          doc.text(line, marginLeft, cursorY)
        }
      }
      cursorY += bodyLineHeightMm
    }

    // Rodapé de segurança e autenticidade
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(marginLeft, pageHeight - 12, pageWidth - marginRight, pageHeight - 12)

    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      'Documento preparado para assinatura eletrônica com validade jurídica (MP 2.200-2/2001).',
      marginLeft,
      pageHeight - 8,
    )
    doc.text(`Folha ${pageNumber} de ${totalPages}`, pageWidth - marginRight, pageHeight - 8, {
      align: 'right',
    })
  })

  return doc
}

/**
 * Gera um Buffer/Uint8Array de um PDF válido contendo o texto formatado em páginas
 * Mantido para compatibilidade com chamadores ou testes existentes
 */
export function generateSimplePdfBuffer(title: string, textContent: string): Uint8Array {
  const doc = createDocumentJsPdf(title, textContent)
  const arrayBuffer = doc.output('arraybuffer')
  return new Uint8Array(arrayBuffer)
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
 * Gera Data URL base64 a partir do conteúdo HTML de um contrato ou procuração.
 * Retorna no formato 'data:application/pdf;base64,...' esperado pelo ClicksignService e SendClicksignModal.
 */
export function generatePdfBase64FromHtml(title: string, htmlContent: string): string {
  const plainText = htmlToPlainText(htmlContent)
  const doc = createDocumentJsPdf(title, plainText)
  const dataUri = doc.output('datauristring')
  // Garantir o prefixo correto 'data:application/pdf;base64,...'
  if (dataUri.startsWith('data:application/pdf;')) {
    if (dataUri.startsWith('data:application/pdf;filename=')) {
      // jsPDF às vezes coloca ;filename=generated.pdf;base64,
      const base64Index = dataUri.indexOf(';base64,')
      if (base64Index !== -1) {
        return 'data:application/pdf;base64,' + dataUri.substring(base64Index + 8)
      }
    }
    return dataUri
  }
  // Fallback seguro via arraybuffer
  const arrayBuffer = doc.output('arraybuffer')
  return uint8ArrayToPdfBase64(new Uint8Array(arrayBuffer))
}
