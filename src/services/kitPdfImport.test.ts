import { describe, it, expect, vi } from 'vitest'
import { KitsService, type ExtrairPdfCotacaoResult } from '../services/kits'
import pb from '../lib/pocketbase/client'

describe('KitsService.extrairPdfCotacao', () => {
  it('valida que arquivo deve ser um PDF', async () => {
    const fakeTxtFile = new File(['conteudo texto'], 'documento.txt', { type: 'text/plain' })
    await expect(KitsService.extrairPdfCotacao(fakeTxtFile)).rejects.toThrow(
      'Formato inválido. Por favor, envie um arquivo com extensão .pdf.',
    )
  })

  it('valida que arquivo não pode exceder 15 MB', async () => {
    // 16 MB fake
    const hugeBlob = new Blob([new Uint8Array(16 * 1024 * 1024)])
    const fakeHugePdf = new File([hugeBlob], 'cotacao_pesada.pdf', { type: 'application/pdf' })
    await expect(KitsService.extrairPdfCotacao(fakeHugePdf)).rejects.toThrow(
      'PDF muito grande (máximo 15 MB)',
    )
  })

  it('chama pb.send com o payload correto e retorna os dados da cotação Belenus mapeados', async () => {
    const mockResult: ExtrairPdfCotacaoResult = {
      success: true,
      arquivo: 'Cotacao_Belenus_3_75kWp.pdf',
      distribuidora: 'Belenus',
      numero_cotacao: '2026.040.043',
      data_cotacao: '25/03/2026',
      nome: 'Kit Solar 3,75 kWp — DMEGC + HUAWEI — Fibrocimento',
      potencia_kwp: 3.75,
      fabricante: 'DMEGC / HUAWEI',
      categoria: 'Residencial',
      tipo_estrutura: 'fibrocimento',
      estrutura_detalhe: '1 linha com 6 módulos em telhado fibrocimento',
      string_box: '',
      marca_painel: 'DMEGC',
      potencia_painel_w: 625,
      qtd_paineis: 6,
      marca_inversor: 'HUAWEI',
      potencia_inversor_kw: 3,
      qtd_inversores: 1,
      frete: 0,
      valor_total: 4700,
      custo: 4700,
      descricao:
        '6x Módulo DMEGC 625W + Inversor HUAWEI 3kW + Estrutura de fixação para telha fibrocimento.',
      componentes: [
        {
          sku: 'MOD-DMEGC-625',
          descricao: 'MÓDULO SOLAR FOTOVOLTAICO 625W DMEGC BIFACIAL',
          fabricante: 'DMEGC',
          quantidade: 6,
          unidade: 'PC',
          preco_unitario: 450,
        },
        {
          sku: 'INV-HUAWEI-3K',
          descricao: 'INVERSOR SOLAR ON-GRID HUAWEI SUN2000-3KTL-L1',
          fabricante: 'HUAWEI',
          quantidade: 1,
          unidade: 'UN',
          preco_unitario: 2000,
        },
      ],
    }

    const spySend = vi.spyOn(pb, 'send').mockResolvedValueOnce(mockResult as any)

    const fakePdf = new File(['%PDF-1.4 mock content'], 'cotacao_belenus.pdf', {
      type: 'application/pdf',
    })

    const res = await KitsService.extrairPdfCotacao(fakePdf)

    expect(spySend).toHaveBeenCalledWith(
      '/backend/v1/kits/extrair-pdf',
      expect.objectContaining({
        method: 'POST',
      }),
    )

    expect(res.success).toBe(true)
    expect(res.potencia_kwp).toBe(3.75)
    expect(res.marca_painel).toBe('DMEGC')
    expect(res.marca_inversor).toBe('HUAWEI')
    expect(res.tipo_estrutura).toBe('fibrocimento')
    expect(res.valor_total).toBe(4700)
    expect(res.componentes).toHaveLength(2)

    spySend.mockRestore()
  })
})
