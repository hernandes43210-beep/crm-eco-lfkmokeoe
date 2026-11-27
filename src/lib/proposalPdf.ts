/**
 * Versão para imprimir/PDF da proposta comercial clássica REVISADA (6 páginas A4).
 * Reaproveita proposalDadosV2 (dados/cálculos — economia líquida Lei 14.300) e
 * proposalPdfCss (identidade navy #0B1E4A + amarelo #FFC629).
 * Fotos: somente a CAPA do kit (kit.imagem_ia_url) — nenhuma foto de obras
 * destacada (decisão do usuário v0.0.79, mantida na reconciliação v2).
 * O QR Code do aceite aponta para o link público da proposta.
 */
import type { PublicProposta } from '@/types/crm'
import { proposalDataDePublica, type DadosV2, type FotoProposta } from './proposalDadosV2'
import {
  RENDIMENTO_POUPANCA_AO_ANO as REN_POUP,
  RENDIMENTO_CDB_LIQUIDO_AO_ANO as REN_CDB,
  formatBRL,
} from './proposalCalculos'
import { FONTS_PROPOSTA_LINK, PROPOSTA_V2_CSS, IMPRESSAO_CSS_EXTRA } from './proposalPdfCss'

/**
 * Entrada do gerador de PDF: os MESMOS campos que os consumidores já repassam
 * (Proposta do CRM ou PublicProposta da página pública). Relaxed onde o campo
 * pode chegar como string (json do PocketBase).
 */
type LeadParcial = NonNullable<PublicProposta['lead']>
/** Forma usada pelos consumidores: cliente sem id/status (só dados de contato). */
type ClienteLegado = Omit<LeadParcial, 'id' | 'status'>

export type ProposalPDFData = Omit<PublicProposta, 'fotos_selecionadas'> & {
  fotos_selecionadas?: PublicProposta['fotos_selecionadas'] | string
  /** Nome legado usado pelos consumidores (normalizado para `lead` antes do uso). */
  cliente?: ClienteLegado
}

export type { DadosV2, FotoProposta }

/** Aceita `lead` (forma nova) e `cliente` (forma usada pelos consumidores). */
function leadDeData(data: ProposalPDFData): PublicProposta['lead'] {
  if (data.lead) return data.lead
  return data.cliente as LeadParcial | undefined
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
/** Escapa texto para HTML (antes vivia em proposalDadosV2). */
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function dataBR(d: Date): string {
  return d instanceof Date && !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : '—'
}

/* ------------------------------------------------------------------ */
/* Preload das fotos: espera as imagens terminarem de carregar        */
/* ------------------------------------------------------------------ */
export function preloadFotosProposta(urls: string[]): Promise<void> {
  const validas = urls.filter((u) => !!u)
  if (validas.length === 0) return Promise.resolve()
  return Promise.all(
    validas.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => resolve() // foto que falha não bloqueia o PDF
          img.src = url
        }),
    ),
  ).then(() => undefined)
}

/* ------------------------------------------------------------------ */
/* Blocos reutilizados                                                */
/* ------------------------------------------------------------------ */
function headerInterno(d: DadosV2): string {
  return `<header class="pv-header">
    <div class="pv-logo"><span class="eco">ECO</span><span class="solar">SOLAR</span> <span class="energy">ENERGY</span></div>
    <div class="pv-header-info">
      <div><strong>PROPOSTA Nº ${esc(d.numero)}</strong></div>
      <div>Emissão ${esc(dataBR(d.dataEmissao))} • Válida até <strong>${esc(dataBR(d.dataValidade))}</strong></div>
    </div>
  </header>`
}

function footerInterno(pagina: number): string {
  return `<footer class="pv-footer">
    <span><strong>Ecosolar Energy</strong> — Do sol até a sua conta de luz</span>
    <span class="pv-pgnum">Página ${pagina}</span>
  </footer>`
}

function fotoHtml(f: FotoProposta | null, classe: string): string {
  if (!f) {
    return `<div class="pv-foto ${classe}"><div style="width:100%;height:100%;background:linear-gradient(140deg,#0B1E4A,#1d4290);display:flex;align-items:center;justify-content:center;color:#FFC629;font-family:Montserrat;font-weight:800;font-size:9pt;text-align:center;padding:4mm;">ECOSOLAR ENERGY</div></div>`
  }
  return `<figure class="pv-foto ${classe}"><img src="${esc(f.url)}" alt="${esc(f.legenda || 'Sistema fotovoltaico proposto')}" /><figcaption class="leg">${esc(f.legenda)}</figcaption></figure>`
}

/** QR Code de aceite (imagem gerada por API pública, aponta para o link público). */
function qrCodeHtml(urlAbsoluta: string): string {
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${encodeURIComponent(urlAbsoluta)}`
  return `<img src="${esc(qr)}" alt="QR Code do aceite da proposta" width="70" height="70" style="width:22mm;height:22mm;display:block;" />`
}

/** Bloco de alerta de sobrecarga do inversor — só na TELA (não sai no PDF do cliente). */
function alertaInversorHtml(d: DadosV2): string {
  const a = d.alertaInversor
  if (!a?.estourado) return ''
  return `<div class="pv-somente-tela" style="margin-top:4mm;border:1.5px solid #b45309;background:#fef3c7;color:#7c2d12;border-radius:2mm;padding:3mm 4mm;font-size:8.4pt;line-height:1.5;">
    <strong>⚠ Atenção (uso interno — não impresso):</strong> a potência do kit (${esc(d.potenciaKwp)} kWp) corresponde a
    ${esc(Math.round(a.razaoPct))}% da potência dos inversores (limite recomendado: ${esc(Math.round(a.limitePct))}%).
    Revise o dimensionamento do inversor antes de enviar ao cliente.
  </div>`
}

/* ------------------------------------------------------------------ */
/* PÁGINA 1 — CAPA                                                    */
/* ------------------------------------------------------------------ */
function paginaCapa(d: DadosV2): string {
  return `<section class="pv-page">
    <div class="pv-capa">
      <div class="pv-capa-grid"></div>
      <div style="position:relative;z-index:1;display:flex;flex-direction:column;flex:1;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8mm;">
          <div>
            <div class="pv-logo" style="font-size:21pt;"><span class="eco">ECO</span><span class="solar">SOLAR</span> <span class="energy">ENERGY</span></div>
            <div class="pv-slogan" style="margin-top:1.5mm;">Do sol até a sua conta de luz</div>
          </div>
          <span class="pv-selo">Proposta Nº ${esc(d.numero)}</span>
        </div>

        <div style="display:flex;gap:8mm;align-items:stretch;margin-top:10mm;flex:1;">
          <div style="flex:1.1;display:flex;flex-direction:column;">
            <h1>Proposta de<br /><span class="am">Energia Solar</span><br />sob medida</h1>
            <p class="pv-capa-sub" style="margin-top:5mm;">Um sistema dimensionado para a sua conta de luz, explicado passo a passo: o que você recebe, quanto vai economizar e como funciona cada etapa até a usina ligada.</p>
            <div class="pv-card-cliente" style="margin-top:auto;">
              <div class="lbl">Preparada especialmente para</div>
              <div class="nome">${esc(d.clienteNome)}</div>
              <div class="meta">📍 ${esc(d.cidadeUf || 'sua região')} • Consumo médio: ${esc(d.consumoKwh ? `${d.consumoKwh} kWh/mês` : '—')} • Telhado: ${esc(d.tipoTelhado)}</div>
            </div>
          </div>
          <div style="flex:0.9;min-width:0;">
            <div class="pv-capa-foto pv-clip">${fotoHtml(d.fotoCapa, '')}</div>
          </div>
        </div>

        <div class="pv-minis" style="margin-top:9mm;">
          <div class="pv-mini"><div class="k">Potência</div><div class="v">${esc(d.txt.potenciaTxt)}</div></div>
          <div class="pv-mini"><div class="k">Geração</div><div class="v">~${esc(d.txt.geracaoTxt)}</div></div>
          <div class="pv-mini"><div class="k">Economia/mês</div><div class="v am">${esc(d.txt.economiaMensalRS)}</div></div>
          <div class="pv-mini"><div class="k">Retorno</div><div class="v">${esc(d.txt.paybackCurto)}</div></div>
        </div>

        <div class="pv-capaline" style="margin-top:8mm;border-top:1px solid rgba(255,255,255,.18);padding-top:4.5mm;">
          <span>Consultor responsável: <strong>${esc(d.consultorNome || 'Equipe Ecosolar')}</strong></span>
          <span>Data de emissão: <strong>${esc(dataBR(d.dataEmissao))}</strong></span>
          <span class="val">Válida até: <strong>${esc(dataBR(d.dataValidade))}</strong></span>
        </div>

        <div style="margin-top:auto;border-top:1px solid rgba(255,255,255,.18);padding-top:4mm;display:flex;justify-content:space-between;font-size:8pt;color:#cdd7ec;flex-wrap:wrap;gap:2mm;">
          <span><strong style="color:#fff;">Ecosolar Energy</strong> • Projeto • Homologação • Instalação</span>
          <span>${esc(d.empresa.instagram || '@ecosolarenergy')}</span>
        </div>
      </div>
    </div>
  </section>`
}

/* ------------------------------------------------------------------ */
/* PÁGINA 2 — APRESENTAÇÃO + COMO FUNCIONA                            */
/* ------------------------------------------------------------------ */
function pagina2(d: DadosV2): string {
  return `<section class="pv-page">
    ${headerInterno(d)}
    <div class="pv-page-inner pv-pad">
      <div style="margin-top:6mm;">
        <span class="pv-sec-tag">Apresentação</span>
        <h2 class="pv-sec-title" style="margin-top:3mm;">Olá, ${esc(d.clientePrimeiroNome)}.<br /><span style="color:#FFC629;background:#0B1E4A;padding:0 2mm;border-radius:1.5mm;">Esta proposta foi feita para você.</span></h2>
      </div>

      <div class="pv-card" style="margin-top:5mm;font-size:9pt;line-height:1.65;">
        <p>Obrigado pela confiança em conversar com a Ecosolar Energy. Analisamos o seu consumo médio de <strong>${esc(d.consumoKwh || '—')} kWh por mês</strong> — hoje cerca de <strong>${esc(d.txt.contaHojeRS)}</strong> na conta de luz — e dimensionamos um sistema de energia solar de <strong>${esc(d.txt.potenciaTxt)}</strong> para que a maior parte dessa energia seja produzida no seu próprio telhado, com equipamentos de marcas reconhecidas e instalação feita pela nossa equipe.</p>
        <p style="margin-top:2.5mm;">Nas próximas páginas explicamos, sem termos complicados, como o sistema funciona, por que escolhemos esse tamanho, o que está incluso, quanto você vai economizar e o passo a passo da obra. Se surgir qualquer dúvida, é só chamar no WhatsApp — explicamos quantas vezes for preciso.</p>
      </div>

      <div style="margin-top:5mm;">
        <div style="font-family:Montserrat;font-weight:800;font-size:9pt;color:#1d4290;letter-spacing:1.2px;">RESUMO EM 30 SEGUNDOS</div>
        <div class="pv-grid4" style="margin-top:3mm;">
          <div class="pv-resumo"><div class="k">Conta hoje</div><div class="v">${esc(d.txt.contaHojeRS)}</div><div class="n">${esc(d.consumoKwh || '—')} kWh/mês</div></div>
          <div class="pv-resumo"><div class="k">Geração do sistema</div><div class="v">~${esc(d.txt.geracaoTxt)}</div><div class="n">cobre ${esc(d.txt.coberturaPctTxt)} do consumo</div></div>
          <div class="pv-resumo hl"><div class="k">Economia</div><div class="v">${esc(d.txt.economiaMensalRS)}/mês</div><div class="n">dinheiro que deixa de ir para a conta de luz</div></div>
          <div class="pv-resumo"><div class="k">Retorno</div><div class="v">${esc(d.txt.paybackCurto)}</div><div class="n">depois disso, é lucro</div></div>
        </div>
      </div>

      <div style="margin-top:6mm;">
        <div style="font-family:Montserrat;font-weight:800;font-size:9pt;color:#1d4290;letter-spacing:1.2px;">DO SOL ATÉ A SUA CONTA DE LUZ</div>
        <div class="pv-fluxo" style="margin-top:3mm;">
          <div class="pv-fluxo-item"><div class="ico">☀️</div><div class="t">Sol</div><div class="d">Luz gratuita, todos os dias</div></div>
          <div class="pv-fluxo-arrow">→</div>
          <div class="pv-fluxo-item"><div class="ico">🔆</div><div class="t">Painéis</div><div class="d">Transformam a luz em energia</div></div>
          <div class="pv-fluxo-arrow">→</div>
          <div class="pv-fluxo-item"><div class="ico">⚡</div><div class="t">Inversor</div><div class="d">Deixa a energia pronta para uso</div></div>
          <div class="pv-fluxo-arrow">→</div>
          <div class="pv-fluxo-item"><div class="ico">🏠</div><div class="t">Sua casa</div><div class="d">Usa na hora o que precisa</div></div>
          <div class="pv-fluxo-arrow">→</div>
          <div class="pv-fluxo-item"><div class="ico">🔌</div><div class="t">Rede</div><div class="d">Guarda a sobra como crédito</div></div>
        </div>
        <div style="text-align:center;font-size:7.4pt;color:#11845b;font-weight:800;margin-top:1.5mm;">⇠ a rede devolve a sobra como crédito em kWh ⇠</div>
      </div>

      <div class="pv-grid2" style="margin-top:5mm;">
        <div class="pv-periodo dia"><strong>☀ De dia:</strong> Os painéis produzem energia e a casa usa primeiro o que está sendo gerado. O que sobra vai para a rede da ${esc(d.concessionaria)} e vira crédito em kWh na sua conta.</div>
        <div class="pv-periodo noite"><strong>🌙 À noite e em dias nublados:</strong> A casa puxa energia da rede normalmente e os créditos acumulados abatem esse consumo. Os créditos valem por até 60 meses. Você nunca fica sem luz.</div>
      </div>
    </div>
    ${footerInterno(2)}
  </section>`
}

/* ------------------------------------------------------------------ */
/* PÁGINA 3 — SEU SISTEMA                                             */
/* ------------------------------------------------------------------ */
function pagina3(d: DadosV2): string {
  const itemPainel = `<tr>
        <td class="qtd">${esc(d.painelQtd || '—')}</td>
        <td class="item">${esc(d.painelModelo)}</td>
        <td class="para">Geração de energia limpa a partir do sol</td>
        <td class="pv-incluso">✓ Incluso</td>
      </tr>`
  const itemInversor = `<tr>
        <td class="qtd">${esc(d.inversorQtd || '—')}</td>
        <td class="item">${esc(d.inversorModelo)}</td>
        <td class="para">Converte a energia para uso na casa (monitoramento incluso)</td>
        <td class="pv-incluso">✓ Incluso</td>
      </tr>`
  const itensExtras = d.kitItens
    .map(
      (i) => `<tr>
        <td class="qtd">${esc(i.qtd)}</td>
        <td class="item">${esc(i.nome)}</td>
        <td class="para">${esc(i.obs)}</td>
        <td class="pv-incluso">✓ Incluso</td>
      </tr>`,
    )
    .join('')

  return `<section class="pv-page">
    ${headerInterno(d)}
    <div class="pv-page-inner pv-pad">
      <div style="margin-top:6mm;">
        <span class="pv-sec-tag">1 • Seu sistema</span>
        <h2 class="pv-sec-title" style="margin-top:3mm;">Kit solar ${esc(d.txt.potenciaTxt)} — ${esc(d.painelModelo)} + ${esc(d.inversorModelo)}</h2>
        <p class="pv-sub" style="margin-top:2mm;">Como chegamos a esse tamanho: partimos do seu consumo e da quantidade de sol da região.</p>
      </div>

      <div class="pv-conta" style="margin-top:5mm;">
        ${esc(d.txt.potenciaTxt)} <span class="op">×</span> ~4,6 h de sol/dia
        <span class="op">×</span> 30 dias <span class="op">×</span> 80% aproveitamento real
        <span class="op">=</span> <span class="res">~${esc(d.txt.geracaoTxt)}</span>
      </div>

      <div style="margin-top:5mm;">
        <div style="font-weight:800;font-size:9pt;color:#0B1E4A;">Quanto do seu consumo o sistema cobre: ${esc(d.txt.coberturaPctTxt)}</div>
        <div class="pv-barra" style="margin-top:2mm;">
          <div class="g" style="width:${esc(d.calc.coberturaPct)}%;">Gerado pelo sistema: ~${esc(d.txt.geracaoTxt)}</div>
          <div class="r" style="width:${esc(100 - d.calc.coberturaPct)}%;">Restante da rede: ~${esc(Math.round(d.calc.consumoNaoCobertoKwh))} kWh</div>
        </div>
      </div>

      <div class="pv-info-azul" style="margin-top:5mm;">
        <strong>Por que considerar 20% de perdas?</strong> Painel no calor, cabos, sujeira e o próprio inversor consomem uma parte da energia. Usamos esse desconto para que a geração prometida seja realista — preferimos que você se surpreenda para mais, não para menos.
      </div>

      <div style="margin-top:6mm;">
        <div style="font-family:Montserrat;font-weight:800;font-size:9pt;color:#1d4290;letter-spacing:1.2px;">O QUE VEM NO SEU KIT — E PARA QUE SERVE CADA ITEM</div>
        <table class="pv-tabela" style="margin-top:3mm;">
          <thead><tr><th style="width:14mm;">Qtd.</th><th>Item</th><th>Para que serve</th><th style="width:18mm;">Incluso</th></tr></thead>
          <tbody>${itemPainel}${itemInversor}${itensExtras}</tbody>
        </table>
      </div>

      ${alertaInversorHtml(d)}

      <div class="pv-kits-fim" style="margin-top:auto;padding-top:5mm;">
        <div class="pv-card"><div style="font-size:7.2pt;letter-spacing:.8px;text-transform:uppercase;color:#5b6782;font-weight:700;">Área no telhado</div><div class="v">~${esc(Math.round(d.areaM2))} m²</div><div class="n">estimativa com os painéis deste kit</div></div>
        <div class="pv-card"><div style="font-size:7.2pt;letter-spacing:.8px;text-transform:uppercase;color:#5b6782;font-weight:700;">Tipo de telhado</div><div class="v">${esc(d.tipoTelhado)}</div><div class="n">estrutura própria inclusa</div></div>
        <div class="pv-card"><div style="font-size:7.2pt;letter-spacing:.8px;text-transform:uppercase;color:#5b6782;font-weight:700;">Monitoramento</div><div class="v">24 h</div><div class="n">acompanhamento no celular</div></div>
      </div>
    </div>
    ${footerInterno(3)}
  </section>`
}

/* ------------------------------------------------------------------ */
/* PÁGINA 4 — INVESTIMENTO E RETORNO                                  */
/* ------------------------------------------------------------------ */
function pagina4(d: DadosV2): string {
  const solarPct = Math.round(d.calc.rendimentoSolarPct)
  const maxRend = Math.max(solarPct, d.rendPoupancaPct, d.rendCdbPct, 12)
  const largura = (pct: number) => Math.max(6, Math.round((pct / Math.max(maxRend, 1)) * 100))

  const linhasBarras = `
    <div class="linha">
      <span class="nome">Poupança ${esc(d.rendPoupancaPct)}% a.a.</span>
      <div class="faixa"><div class="fill" style="width:${largura(d.rendPoupancaPct)}%;background:#aab4c9;">&nbsp;</div></div>
      <span class="pct">${esc(d.rendPoupancaPct)}%</span>
    </div>
    <div class="linha">
      <span class="nome">CDB (líquido de IR) ~${esc(d.rendCdbPct)}% a.a.</span>
      <div class="faixa"><div class="fill" style="width:${largura(d.rendCdbPct)}%;background:#1d4290;">&nbsp;</div></div>
      <span class="pct">${esc(d.rendCdbPct)}%</span>
    </div>
    <div class="linha">
      <span class="nome">Energia solar (economia)</span>
      <div class="faixa"><div class="fill" style="width:${largura(solarPct)}%;background:#11845b;font-family:Montserrat;">&nbsp;</div></div>
      <span class="pct solar">${esc(solarPct)}%</span>
    </div>`

  const fioBPctInt = Math.round(d.fioBPct * 100)
  const anoEmissao = d.dataEmissao.getFullYear()
  const fioBTexto =
    anoEmissao >= 2028
      ? 'em 2028, 90% desse componente'
      : anoEmissao === 2027
        ? 'em 2027, 75% desse componente'
        : `em ${esc(anoEmissao)}, ${esc(fioBPctInt)}% desse componente (2027: 75%, 2028: 90%)`
  const cdbNoPrimeiroAno = formatBRL(d.calc.precoFinal * REN_CDB)

  return `<section class="pv-page">
    ${headerInterno(d)}
    <div class="pv-page-inner pv-pad">
      <div style="margin-top:6mm;">
        <span class="pv-sec-tag">2 • Investimento e retorno</span>
        <h2 class="pv-sec-title" style="margin-top:3mm;">Quanto custa e em quanto tempo se paga</h2>
      </div>

      <div class="pv-invest" style="margin-top:5mm;">
        <div style="flex:1;">
          <div class="lbl">Investimento total • chave na mão</div>
          <h3>${esc(d.txt.precoFinalRS)}</h3>
          <p>Equipamentos + projeto de engenharia com ART + homologação na ${esc(d.concessionaria)} + instalação.</p>
          <p style="margin-top:1.5mm;">Sem custos escondidos: tudo o que está na página anterior já está neste valor.</p>
        </div>
        <div class="pv-preco">
          <div><span class="cheio">${esc(d.txt.precoCheioRS)}</span><span class="off">-${esc(d.txt.descontoPct)} OFF</span></div>
          <div class="final">${esc(d.txt.precoFinalRS)}</div>
          <div class="economiza">Você economiza ${esc(d.txt.descontoRS)} nesta proposta</div>
        </div>
      </div>

      <div class="pv-cards4" style="margin-top:4mm;">
        <div class="pv-inv-card"><div class="k">Economia/mês (estimada)</div><div class="v">${esc(d.txt.economiaMensalRS)}</div><div class="n">média no primeiro ano</div></div>
        <div class="pv-inv-card"><div class="k">Economia/ano</div><div class="v">${esc(d.txt.economiaAnualRS)}</div><div class="n">dinheiro que fica com você</div></div>
        <div class="pv-inv-card hl"><div class="k">Retorno</div><div class="v">${esc(d.txt.paybackCurto)}</div><div class="n">${esc(d.txt.paybackExtenso)}</div></div>
        <div class="pv-inv-card"><div class="k">Em 25 anos</div><div class="v">${esc(d.txt.economia25RS)}</div><div class="n">sem contar reajustes</div></div>
      </div>

      <div class="pv-card" style="margin-top:4mm;">
        <h3>Comparando com deixar o dinheiro aplicado</h3>
        <p class="pv-sub" style="margin-top:1mm;">Se você colocar ${esc(d.txt.precoFinalRS)} em uma aplicação, quanto ela devolve por ano? Compare com o que o sistema solar devolve em economia:</p>
        <div class="pv-barras">${linhasBarras}</div>
        <p style="font-size:8.4pt;margin-top:2.5mm;"><strong>Em reais, no 1º ano:</strong> aplicação no CDB ≈ ${esc(cdbNoPrimeiroAno)} • sistema solar ≈ ${esc(d.txt.economiaAnualRS)} de economia.</p>
        <p class="pv-nota" style="margin-top:1.5mm;">Rendimentos de referência aproximados, apenas para comparação. A economia na conta de luz não paga imposto de renda.</p>
      </div>

      <div class="pv-grid2" style="margin-top:4mm;">
        <div class="pv-card">
          <h3>Como calculamos a economia (líquida)</h3>
          <div class="pv-li"><span class="bola v"></span><span>Geração de ~${esc(d.txt.geracaoTxt)}, com 20% de perdas já descontadas.</span></div>
          <div class="pv-li"><span class="bola v"></span><span>Tarifa média de ${esc(d.txt.tarifaRS)}/kWh — ${esc(d.txt.taxaMinimaRS)} de taxa mínima da ligação já considerada.</span></div>
          <div class="pv-li"><span class="bola v"></span><span>Fio B da Lei 14.300 descontado: ${esc(d.txt.fioBRS)}/mês — que historicamente sobe todos os anos e deixaria a economia ainda maior.</span></div>
          <div class="pv-li"><span class="bola v"></span><span>Em 25 anos já descontamos o leve desgaste natural dos painéis (cerca de 0,4% ao ano).</span></div>
        </div>
        <div class="pv-caixa-am">
          <h4>O que continua aparecendo na sua conta (transparência)</h4>
          <p>• A taxa mínima da ${esc(d.concessionaria)} (custo de disponibilidade), que todo cliente conectado à rede paga;</p>
          <p>• O Fio B (Lei 14.300): uma parte do uso da rede cobrada sobre a energia que vai e volta como crédito — ${esc(fioBTexto)};</p>
          <p>• O consumo que passar do que o sistema gera.</p>
          <p style="font-weight:700;">Por isso falamos em economia estimada: a conta não zera, mas cai muito.</p>
        </div>
      </div>
    </div>
    ${footerInterno(4)}
  </section>`
}

/* ------------------------------------------------------------------ */
/* PÁGINA 5 — COMO VAI SER (ETAPAS) + PAGAMENTO                       */
/* ------------------------------------------------------------------ */
function pagina5(d: DadosV2): string {
  const cartoes = d.etapas
    .map(
      (e, i) => `<div class="pv-etapa">
        <div class="topo"><div class="num">${esc(i + 1)}</div><span class="quem eco">${esc(e.quem)}</span></div>
        <p>${esc(e.txt)}</p>
      </div>`,
    )
    .join('')

  return `<section class="pv-page">
    ${headerInterno(d)}
    <div class="pv-page-inner pv-pad">
      <div style="margin-top:6mm;">
        <span class="pv-sec-tag">3 • Como vai ser</span>
        <h2 class="pv-sec-title" style="margin-top:3mm;">Do "sim" até a usina ligada</h2>
        <p class="pv-sub" style="margin-top:2mm;">Cuidamos de toda a burocracia com a concessionária. Você só participa de algumas etapas.</p>
      </div>

      <div class="pv-etapas" style="margin-top:5mm;">${cartoes}</div>

      <div class="pv-grid2" style="margin-top:5mm;">
        <div class="pv-card">
          <h3>Garantias</h3>
          <div class="pv-li"><span class="bola v"></span><span>Painéis ${esc(d.painelModelo)}: garantia de desempenho linear de ${esc(d.painelGarantiaDesempenho)} do fabricante.</span></div>
          <div class="pv-li"><span class="bola v"></span><span>Inversor ${esc(d.inversorModelo)}: ${esc(d.garantiaInversorAnos)} anos de garantia.</span></div>
          <div class="pv-li"><span class="bola v"></span><span>Instalação: ${esc(d.garantiaInstalacaoAnos)} anos de garantia e suporte técnico pós-venda.</span></div>
          <div class="pv-li"><span class="bola v"></span><span>Projeto: assinado por engenheiro eletricista, com ART registrada no CREA.</span></div>
        </div>
        <div class="pv-card">
          <h3>Já está incluso no valor</h3>
          <div class="pv-li"><span class="bola v"></span><span>Todos os equipamentos e a estrutura de fixação</span></div>
          <div class="pv-li"><span class="bola v"></span><span>Projeto, ART e homologação na concessionária</span></div>
          <div class="pv-li"><span class="bola v"></span><span>Mão de obra de instalação e frete do material</span></div>
          <div class="pv-li"><span class="bola v"></span><span>Configuração do monitoramento no seu celular</span></div>
          <div style="margin-top:3mm;padding-top:2.5mm;border-top:1px dashed #dfe5f0;">
            <h3>Não incluso</h3>
            <div class="pv-li"><span class="bola c"></span><span>Adequações no padrão de entrada ou quadro, se a concessionária exigir — avaliadas na vistoria e orçadas à parte, antes de qualquer serviço.</span></div>
          </div>
        </div>
      </div>

      <div style="margin-top:5mm;">
        <div style="font-family:Montserrat;font-weight:800;font-size:9pt;color:#1d4290;letter-spacing:1.2px;">FORMAS DE PAGAMENTO</div>
        <div class="pv-pagtos" style="margin-top:3mm;">
          <div class="pv-pagto"><h4>Condições desta proposta</h4><p>${esc(d.financiamentoTxt)}</p></div>
        </div>
      </div>
    </div>
    ${footerInterno(5)}
  </section>`
}

/* ------------------------------------------------------------------ */
/* PÁGINA 6 — DEPOIMENTO + FAQ + ACEITE (QR Code)                     */
/* ------------------------------------------------------------------ */
function pagina6(d: DadosV2, linkPublico: string, urlBase?: string): string {
  const faqHtml = d.faq
    .map((f) => `<div><div class="q">${esc(f.q)}</div><div class="a">${esc(f.a)}</div></div>`)
    .join('')
  const depo = d.depoimento[0]

  const aceiteTela = `<div class="pv-aceite-tela pv-somente-tela" data-proposta-aceite>
    <button type="button" class="pv-btn-aceite" data-acao-aceite>✓ Aceitar esta proposta agora</button>
    <a class="pv-link-aceite" href="${esc(linkPublico)}">Ou use o link de aceite: ${esc(linkPublico)}</a>
  </div>`

  const urlAbsoluta = urlBase ? `${urlBase}${linkPublico}` : linkPublico
  const linkImpressao = `<div style="display:flex;align-items:center;gap:4mm;margin-top:2.5mm;">
        ${qrCodeHtml(urlAbsoluta)}
        <span class="mono pv-somente-impressao" style="font-size:8pt;word-break:break-all;">${esc(urlAbsoluta)}</span>
      </div>`

  return `<section class="pv-page">
    ${headerInterno(d)}
    <div class="pv-page-inner pv-pad">
      <div style="margin-top:6mm;">
        <span class="pv-sec-tag">4 • Quem faz</span>
        <h2 class="pv-sec-title" style="margin-top:3mm;">Clientes que já economizam com a gente</h2>
      </div>

      <div class="pv-depo" style="margin-top:4mm;">
        <div class="aspas">"</div>
        <div>
          <div class="txt">${esc(depo?.txt || '')}</div>
          <div class="autor">${esc(depo?.nome || 'Cliente Ecosolar')}</div>
        </div>
      </div>

      <div style="margin-top:5mm;">
        <div style="font-family:Montserrat;font-weight:800;font-size:9pt;color:#1d4290;letter-spacing:1.2px;">PERGUNTAS FREQUENTES</div>
        <div class="pv-faq" style="margin-top:3mm;">${faqHtml}</div>
      </div>

      <div class="pv-aceite" style="margin-top:5mm;">
        <div style="font-family:Montserrat;font-weight:800;font-size:10pt;color:#0B1E4A;">Aceite online — rápido e seguro, sem cartório</div>
        <p style="font-size:8.4pt;color:#5b6782;margin-top:1.5mm;">Válida até <strong style="color:#0B1E4A;">${esc(dataBR(d.dataValidade))}</strong>. Os valores desta proposta ficam garantidos até a data de validade. Para aceitar, aponte a câmera do celular para o QR Code abaixo ou acesse o link.</p>
        ${linkImpressao}
        ${aceiteTela}
      </div>

      <div class="pv-assina">
        <div class="campo"><b>${esc(d.consultorNome || 'Equipe Ecosolar')}</b><span>Ecosolar Energy • Consultor Técnico</span></div>
        <div class="campo"><b>${esc(d.clienteNome)}</b><span>Cliente contratante</span></div>
      </div>
    </div>
    ${footerInterno(6)}
  </section>`
}

/* ------------------------------------------------------------------ */
/* HTML completo                                                      */
/* ------------------------------------------------------------------ */
export function generateProposalPrintHTML(
  data: ProposalPDFData,
  opts?: { urlBase?: string; linkPublico?: string },
): string {
  const linkPublico =
    opts?.linkPublico ||
    (data.token_publico ? `/proposta/${data.token_publico}` : `/proposta/${data.id || ''}`)
  const urlBase = opts?.urlBase
  const d = proposalDataDePublica(
    { ...data, lead: leadDeData(data) } as unknown as PublicProposta,
    {},
    linkPublico,
  )

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Proposta Comercial Nº ${esc(d.numero)} — ${esc(d.clienteNome)} | Ecosolar Energy</title>
  ${FONTS_PROPOSTA_LINK}
  <style>${PROPOSTA_V2_CSS}${IMPRESSAO_CSS_EXTRA}</style>
</head>
<body>
  <div class="prop-v2">
    ${paginaCapa(d)}
    ${pagina2(d)}
    ${pagina3(d)}
    ${pagina4(d)}
    ${pagina5(d)}
    ${pagina6(d, linkPublico, urlBase)}
  </div>
</body>
</html>`
}

/** Abre a janela de impressão/PDF: primeiro espera a foto de capa carregar. */
export async function openProposalPDFPrint(
  data: ProposalPDFData,
  opts?: { urlBase?: string; linkPublico?: string },
): Promise<void> {
  const capa = proposalDataDePublica({
    ...data,
    lead: leadDeData(data),
  } as unknown as PublicProposta).fotoCapa
  await preloadFotosProposta(capa ? [capa.url] : [])
  const html = generateProposalPrintHTML(data, opts)
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) {
    alert(
      'Não foi possível abrir a janela de impressão. Libere os pop-ups do navegador e tente novamente.',
    )
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  const disparar = () => {
    try {
      w.focus()
      w.print()
    } catch {
      /* usuário pode imprimir manualmente */
    }
  }
  if (w.document.readyState === 'complete') {
    setTimeout(disparar, 400)
  } else {
    w.onload = () => setTimeout(disparar, 400)
  }
}
