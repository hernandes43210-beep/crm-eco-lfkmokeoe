import { describe, it, expect } from 'vitest'
import {
  formatarDadosMarketingKit,
  gerarTextoWhatsAppMarketing,
  wrapCanvasText,
  draw3DTitle,
  drawPromoBadge,
  drawGleamingSolarPanels,
  drawVibrantSolarBackground,
  drawEnergySpark,
  drawLightningBolt,
  SLOGAN_ECOSOLAR,
} from './kitMarketingImage'
import type { Kit } from '@/types/crm'

describe('kitMarketingImage utils & visual elements', () => {
  it('extrai e formata o NOME COMERCIAL REAL do kit exatamente como cadastrado', () => {
    const kit: Partial<Kit> = {
      id: 'k1',
      nome: 'Kit Solar 6,3 kWp — TSUN POWER + Sungrow — Fibrocimento',
      marca_painel: 'TSUN POWER',
      potencia_painel_w: 630,
      marca_inversor: 'Sungrow',
      potencia_inversor_kw: 7.5,
      tipo_estrutura: 'fibrocimento',
      potencia_kw: 6.3,
    }

    const details = formatarDadosMarketingKit(kit)

    // O nome comercial real deve ser preservado rigorosamente
    expect(details.nomeComercial).toBe('Kit Solar 6,3 kWp — TSUN POWER + Sungrow — Fibrocimento')
    expect(details.slogan).toBe(SLOGAN_ECOSOLAR)
    expect(details.slogan).toBe('A ENERGIA DO FUTURO, HOJE!')
  })

  it('compõe as linhas técnicas de painéis, inversor e estrutura com formatação pt-BR', () => {
    const kit: Partial<Kit> = {
      id: 'k2',
      nome: 'Kit Solar 10,08 kWp — TSUN POWER + HUAWEI — Solo monoposte',
      marca_painel: 'TSUN POWER',
      potencia_painel_w: 630,
      marca_inversor: 'HUAWEI',
      potencia_inversor_kw: 7.5,
      tipo_estrutura: 'solo_monoposte',
      potencia_kw: 10.08,
      preco_venda: 27749.63,
    }

    const details = formatarDadosMarketingKit(kit)

    // Painéis: marca + potência em W
    expect(details.paineisLinha).toBe('TSUN POWER 630 W')

    // Inversor: marca + potência em kW com vírgula decimal pt-BR
    expect(details.inversorLinha).toBe('HUAWEI 7,5 kW')

    // Estrutura
    expect(details.estruturaLinha).toBe('Solo monoposte')

    // Potência total
    expect(details.potenciaTotalLinha).toBe('10,08 kWp')

    // Preço formatado em BRL
    expect(details.precoFormatado).toContain('27.749,63')
  })

  it('formata adequadamente estruturas diferentes como Mini trilho e Fibrocimento', () => {
    const kitMini: Partial<Kit> = {
      nome: 'Kit 5 kWp Metálico',
      tipo_estrutura: 'mini_trilho',
      marca_painel: 'OSDA',
      potencia_painel_w: 580,
      marca_inversor: 'Growatt',
      potencia_inversor_kw: 5,
    }

    const details = formatarDadosMarketingKit(kitMini)
    expect(details.estruturaLinha).toBe('Mini trilho')
    expect(details.paineisLinha).toBe('OSDA 580 W')
    expect(details.inversorLinha).toBe('Growatt 5 kW')
  })

  it('deduz marca e potência a partir da descrição caso os campos específicos não estejam preenchidos', () => {
    const kitDesc: Partial<Kit> = {
      nome: 'Kit Solar 9,92 kWp — Ronma Solar + PHB — Solo monoposte',
      descricao:
        '16x Módulo fotovoltaico 620 W (Ronma Solar) — Total 9,92 kWp 1x Inversor solar 6 kW PHB Estrutura de fixação: Solo monoposte.',
      potencia_kw: 9.92,
    }

    const details = formatarDadosMarketingKit(kitDesc)
    expect(details.nomeComercial).toBe('Kit Solar 9,92 kWp — Ronma Solar + PHB — Solo monoposte')
    expect(details.paineisLinha).toContain('620 W')
    expect(details.inversorLinha).toContain('6 kW')
    expect(details.estruturaLinha).toBe('Solo monoposte')
  })

  it('gera legenda pronta e atraente para o WhatsApp com todos os dados técnicos, promoção e chamada', () => {
    const kit: Partial<Kit> = {
      nome: 'Kit Solar 6,3 kWp — TSUN POWER + Sungrow — Fibrocimento',
      marca_painel: 'TSUN POWER',
      potencia_painel_w: 630,
      marca_inversor: 'Sungrow',
      potencia_inversor_kw: 7.5,
      tipo_estrutura: 'fibrocimento',
      potencia_kw: 6.3,
      preco_venda: 23500,
    }

    const texto = gerarTextoWhatsAppMarketing(kit)

    expect(texto).toContain('*KIT SOLAR 6,3 KWP — TSUN POWER + SUNGROW — FIBROCIMENTO*')
    expect(texto).toContain(SLOGAN_ECOSOLAR)
    expect(texto).toContain('PROMOÇÃO EXCLUSIVA')
    expect(texto).toContain('*Módulos Fotovoltaicos:* TSUN POWER 630 W')
    expect(texto).toContain('*Inversor Solar:* Sungrow 7,5 kW')
    expect(texto).toContain('*Estrutura:* Fibrocimento')
    expect(texto).toContain('*Potência Total:* 6,3 kWp')
    expect(texto).toContain('23.500,00')
    expect(texto).toContain('Ecosolar Energy')
  })

  it('quebra textos longos corretamente em linhas sem estourar a largura do Canvas', () => {
    const mockCtx = {
      measureText: (txt: string) => ({
        width: txt.length * 10,
      }),
    } as unknown as CanvasRenderingContext2D

    const text =
      'Kit Solar Fotovoltaico 10,08 kWp TSUN POWER com Inversor Sungrow e Estrutura Fibrocimento'
    const lines = wrapCanvasText(mockCtx, text, 200)

    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join(' ')).toBe(text)
  })

  it('exporta e executa funções do novo visual super vibrante sem erros', () => {
    const mockCtx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      fillText: () => {},
      strokeText: () => {},
      arc: () => {},
      roundRect: () => {},
      clip: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      quadraticCurveTo: () => {},
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
      createRadialGradient: () => ({
        addColorStop: () => {},
      }),
      measureText: (txt: string) => ({ width: txt.length * 10 }),
    } as unknown as CanvasRenderingContext2D

    expect(() => drawVibrantSolarBackground(mockCtx, 1080, 1080, 540, 540)).not.toThrow()
    expect(() => draw3DTitle(mockCtx, 'KITS SOLARES', 540, 200, 80)).not.toThrow()
    expect(() => drawPromoBadge(mockCtx, 540, 300, 240, 60)).not.toThrow()
    expect(() => drawGleamingSolarPanels(mockCtx, 540, 400, 700, 180)).not.toThrow()
    expect(() => drawEnergySpark(mockCtx, 100, 100, 10, '#39FF14')).not.toThrow()
    expect(() => drawLightningBolt(mockCtx, 50, 50, 1, 0)).not.toThrow()
  })
})
