import { describe, it, expect } from 'vitest'
import {
  getEnvelopeStatusBadge,
  buildWhatsAppSigningMessage,
  buildWhatsAppSigningUrl,
} from './clicksignUtils'
import { htmlToPlainText, generatePdfBase64FromHtml } from './pdfBase64'

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
})

describe('pdfBase64 generation', () => {
  it('converte tags HTML para texto puro limpo', () => {
    const html = `
      <style>body { color: red; }</style>
      <h1>Contrato de Prestação de Serviços</h1>
      <p>Parágrafo 1 com <strong>negrito</strong> e &amp; comercial.</p>
      <br/>
      <p>Parágrafo 2 &mdash; traço longo.</p>
    `
    const text = htmlToPlainText(html)
    expect(text).not.toContain('<style>')
    expect(text).not.toContain('<h1>')
    expect(text).not.toContain('<strong>')
    expect(text).toContain('Contrato de Prestação de Serviços')
    expect(text).toContain('& comercial')
    expect(text).toContain('— traço longo')
  })

  it('gera Data URL base64 válida para envio à Clicksign', () => {
    const html = '<h1>Contrato de Teste</h1><p>Testando gerador de PDF para Clicksign</p>'
    const base64Url = generatePdfBase64FromHtml('Contrato de Teste', html)

    expect(base64Url.startsWith('data:application/pdf;base64,')).toBe(true)
    const rawBase64 = base64Url.replace('data:application/pdf;base64,', '')
    // Deve decodificar como cabeçalho de PDF
    const decoded = atob(rawBase64)
    expect(decoded.startsWith('%PDF-1.4')).toBe(true)
    expect(decoded).toContain('%%EOF')
  })
})
