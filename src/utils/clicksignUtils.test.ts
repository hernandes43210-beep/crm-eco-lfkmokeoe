import { describe, it, expect } from 'vitest'
import {
  getEnvelopeStatusBadge,
  buildWhatsAppSigningMessage,
  buildWhatsAppSigningUrl,
} from './clicksignUtils'
import {
  htmlToPlainText,
  generatePdfBase64FromHtml,
  generateSimplePdfBuffer,
  createDocumentJsPdf,
} from './pdfBase64'

describe('clicksignUtils', () => {
  it('mapeia corretamente o status "signed" para badge visual', () => {
    const badge = getEnvelopeStatusBadge('signed')
    expect(badge.label).toBe('Assinado')
    expect(badge.iconName).toBe('check-circle-2')
    expect(badge.colorClass).toContain('emerald')
  })

  it('mapeia corretamente o status "running" para aguardando assinatura', () => {
    const badge = getEnvelopeStatusBadge('running')
    expect(badge.label).toBe('Aguardando Assinatura')
    expect(badge.iconName).toBe('clock')
    expect(badge.colorClass).toContain('amber')
  })

  it('mapeia status "error" para badge de erro', () => {
    const badge = getEnvelopeStatusBadge('error')
    expect(badge.label).toBe('Erro no Envio')
    expect(badge.variant).toBe('destructive')
  })

  it('monta a mensagem para envio no WhatsApp com link e nome do documento', () => {
    const msg = buildWhatsAppSigningMessage({
      clienteNome: 'Hernandes Silva',
      tipoDocumento: 'contrato',
      linkAssinatura: 'https://app.clicksign.com/sign/abc-123',
    })

    expect(msg).toContain('Olá, Hernandes!')
    expect(msg).toContain('Contrato de Prestação de Serviços')
    expect(msg).toContain('https://app.clicksign.com/sign/abc-123')
    expect(msg).toContain('Ecosolar Energy')
  })

  it('monta a mensagem de procuração corretamente', () => {
    const msg = buildWhatsAppSigningMessage({
      clienteNome: 'Maria Souza',
      tipoDocumento: 'procuracao',
      linkAssinatura: 'https://app.clicksign.com/sign/proc-456',
    })

    expect(msg).toContain('Olá, Maria!')
    expect(msg).toContain('Procuração Energisa')
    expect(msg).toContain('https://app.clicksign.com/sign/proc-456')
  })

  it('monta a URL wa.me com DDI 55 e encoding adequado', () => {
    const url = buildWhatsAppSigningUrl({
      telefone: '(69) 99234-5678',
      clienteNome: 'João Solar',
      tipoDocumento: 'contrato',
      linkAssinatura: 'https://app.clicksign.com/sign/xyz',
    })

    expect(url).toContain('https://wa.me/5569992345678?text=')
    expect(url).toContain(encodeURIComponent('https://app.clicksign.com/sign/xyz'))
  })

  it('inclui bloco de localização do cliente na mensagem quando fornecido', () => {
    const msg = buildWhatsAppSigningMessage({
      clienteNome: 'Carlos Menezes',
      tipoDocumento: 'contrato',
      linkAssinatura: 'https://app.clicksign.com/sign/xyz',
      localizacaoCliente: 'https://maps.app.goo.gl/ABC123xyz',
    })

    expect(msg).toContain('📍 Local de instalação cadastrado:')
    expect(msg).toContain('https://maps.app.goo.gl/ABC123xyz')
  })
})

describe('pdfBase64 generation with jsPDF', () => {
  it('converte tags HTML para texto puro limpo', () => {
    const html = `
      <style>body { color: red; }</style>
      <h1>Contrato de Prestação de Serviços</h1>
      <p>Parágrafo 1 com <strong>negrito</strong> e &amp; comercial.</p>
      <br/>
      <p>Parágrafo 2 &mdash; traço longo e &ndash; traço médio.</p>
    `
    const text = htmlToPlainText(html)
    expect(text).not.toContain('<style>')
    expect(text).not.toContain('<h1>')
    expect(text).not.toContain('<strong>')
    expect(text).toContain('Contrato de Prestação de Serviços')
    expect(text).toContain('& comercial')
    expect(text).toContain('— traço longo')
    expect(text).toContain('– traço médio')
  })

  it('gera Data URL base64 válida para envio à Clicksign preservando acentuação', () => {
    const html = `
      <h2>Procuração Particular para Concessionária Energisa Rondônia</h2>
      <p>OUTORGANTE: João da Conceição Araújo, brasileiro, casado, CPF nº 123.456.789-00.</p>
      <p>OBJETO: Representação perante a Energisa Rondônia Distribuidora de Energia S.A. para homologação de microgeração solar fotovoltaica.</p>
      <p>Localização: Porto Velho &mdash; RO, instalação de 12 painéis solares de 585W.</p>
    `
    const base64Url = generatePdfBase64FromHtml(
      'Procuração Energisa Rondônia — João da Conceição',
      html,
    )

    // Prefixo obrigatório exigido pelo ClicksignService e API v3
    expect(base64Url.startsWith('data:application/pdf;base64,')).toBe(true)

    // Decodifica o base64 para binário
    const rawBase64 = base64Url.replace('data:application/pdf;base64,', '')
    const decoded = atob(rawBase64)

    // Header de PDF válido (%PDF-)
    expect(decoded.startsWith('%PDF-')).toBe(true)
    // Marca de fim de arquivo PDF
    expect(decoded).toContain('%%EOF')
  })

  it('generateSimplePdfBuffer retorna Uint8Array de PDF válido', () => {
    const buffer = generateSimplePdfBuffer(
      'Contrato Ecosolar',
      'Cláusula Primeira: Prestação de serviços de engenharia e instalação.',
    )
    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(100)

    // Primeiros bytes devem ser %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
    const headerStr = String.fromCharCode(...buffer.slice(0, 5))
    expect(headerStr).toBe('%PDF-')
  })

  it('pagina adequadamente textos longos em múltiplas páginas A4', () => {
    // Gerar texto longo simulando contrato com 60 parágrafos
    const paragraphs: string[] = []
    for (let i = 1; i <= 60; i++) {
      paragraphs.push(
        `CLÁUSULA ${i}ª: O CONTRATANTE e a CONTRATADA ECOSOLAR ENERGY acordam os termos de instalação e fornecimento de inversores solares fotovoltaicos, com suporte técnico e homologação na distribuidora de energia elétrica regional com acentuação: geração, medição e padrão técnico.`,
      )
    }
    const longHtml = paragraphs.map((p) => `<p>${p}</p>`).join('\n')

    const doc = createDocumentJsPdf('Contrato Longo', htmlToPlainText(longHtml))
    const totalPages = doc.getNumberOfPages()
    expect(totalPages).toBeGreaterThan(1)
  })
})
