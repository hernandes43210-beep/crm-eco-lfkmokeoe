/**
 * Versão para imprimir/PDF da proposta comercial v2 (6 páginas A4).
 * Espelha, em HTML string, as 6 páginas de componentes TSX:
 *   v2PaginaCapa, v2PaginaApresentacao, v2PaginaSistema, v2PaginaInvestimento,
 *   v2PaginaComoVaiSer e v2PaginaFinal — os DADOS vêm de proposalDadosV2.
 * Visual: proposalPdfCss (navy #0B1E4A + amarelo #FFC629).
 * Fotos: somente a CAPA do kit, com legenda (decisão v0.0.79, mantida na v2).
 * QR Code do aceite: gerado LOCALMENTE via qrcode.react (sem API externa).
 */
import type { PublicProposta } from '@/types/crm'
import { CONTATO_ECOSOLAR } from '@/constants/empresa'
import { qrAceiteSvg } from './proposalPdfQr'
import { proposalDataDePublica, type DadosV2, type FotoProposta } from './proposalDadosV2'
import { PRAZO_INSTALACAO_DIAS } from './proposalCalculos'
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
/** Escapa texto para HTML (dados que vêm do CRM/cliente). */
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
/* Blocos reutilizados (espelhos de v2Bits.tsx)                       */
/* ------------------------------------------------------------------ */
function cabecalhoInternoHtml(d: DadosV2, pagina: number): string {
  return `<div class="pv-cabecalho">
    <div class="marca">ECO<span class="solar">SOLAR</span> ENERGY</div>
    <div class="num">Proposta nº ${esc(String(d.numero).slice(-6).toUpperCase())} · pág. ${pagina}</div>
  </div>`
}

function rodapeInternoHtml(d: DadosV2, pagina: number): string {
  return `<div class="pv-rodape">
    <span>${esc(d.empresa.nome)} · ${esc(d.empresa.slogan)}</span>
    <span class="pg">${pagina}</span>
  </div>`
}

function fotoCapaHtml(d: DadosV2): string {
  if (!d.fotoCapa) {
    return `<div class="pv-capa-foto" style="background:linear-gradient(140deg,#FFC629,#071636);"></div>`
  }
  return `<div class="pv-capa-foto">
      <img src="${esc(d.fotoCapa.url)}" alt="${esc(d.fotoCapa.legenda || 'Imagem do sistema solar proposto')}" />
      ${d.fotoCapa.legenda ? `<div class="legenda">${esc(d.fotoCapa.legenda)}</div>` : ''}
    </div>`
}

/**
 * QR Code de aceite gerado LOCALMENTE (qrcode.react → SVG inline, sem API externa).
 * `url` precisa ser a URL ABSOLUTA do link público de aceite.
 */
function qrCodeHtml(url: string): string {
  if (!url) return ''
  return qrAceiteSvg(url, 128)
}

/* ------------------------------------------------------------------ */
/* PÁGINA 1 — CAPA (espelho de v2PaginaCapa.tsx)                      */
/* ------------------------------------------------------------------ */
function paginaCapaHtml(d: DadosV2): string {
  return `<div class="pv-page">
    <div class="pv-capa">
      <div class="pv-capa-grid"></div>
      <div class="pv-pad" style="position:relative;z-index:1;display:flex;flex-direction:column;flex:1;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8mm;">
          <div class="pv-logo"><span class="eco">ECO</span><span class="solar">SOLAR</span> <span class="energy">ENERGY</span></div>
          <span class="pv-selo">PROPOSTA Nº ${esc(String(d.numero).slice(-6).toUpperCase())}</span>
        </div>

        <div style="display:flex;gap:8mm;align-items:stretch;margin-top:10mm;flex:1;">
          <div style="flex:1.1;display:flex;flex-direction:column;min-width:0;">
            <div style="font-family:Montserrat,sans-serif;font-weight:900;font-size:22pt;line-height:1.12;">
              Proposta de<br /><span style="color:#FFC629;">Energia Solar</span><br />sob medida
            </div>
            <p class="pv-capa-sub" style="margin-top:5mm;">Um sistema dimensionado para a sua conta de luz, explicado passo a passo: o que você recebe, quanto vai economizar e como funciona cada etapa até a usina ligada.</p>
            <div class="pv-card-cliente" style="margin-top:auto;">
              <div class="lbl">Preparada especialmente para</div>
              <div class="nome">${esc(d.clienteNome)}</div>
              <div class="meta">📍 ${esc(d.cidadeUf || 'sua região')} • Consumo médio: ${esc(d.consumoKwh ? `${d.consumoKwh} kWh/mês` : '—')} • Telhado: ${esc(d.tipoTelhado)}</div>
            </div>
          </div>
          <div style="flex:0.9;min-width:0;">${fotoCapaHtml(d)}</div>
        </div>

        <div class="pv-minis" style="margin-top:9mm;">
          <div class="pv-mini"><div class="k">Potência</div><div class="v">${esc(d.txt.potenciaTxt)}</div></div>
          <div class="pv-mini"><div class="k">Geração</div><div class="v">~${esc(d.txt.geracaoTxt)}</div></div>
          <div class="pv-mini"><div class="k">Economia/mês</div><div class="v am">${esc(d.txt.economiaMensalRS)}</div></div>
          <div class="pv-mini"><div class="k">Retorno</div><div class="v">${esc(d.txt.paybackCurto)}</div></div>
        </div>

        <div style="margin-top:8mm;border-top:1px solid rgba(255,255,255,.18);padding-top:4.5mm;display:flex;justify-content:space-between;flex-wrap:wrap;gap:2mm;font-size:8pt;color:#C9D4EA;">
          <span>Consultor responsável: <strong style="color:#fff;">${esc(d.consultorNome || 'Equipe Ecosolar')}</strong></span>
          <span>Emissão: <strong style="color:#fff;">${esc(dataBR(d.dataEmissao))}</strong> • Válida até: <strong style="color:#fff;">${esc(dataBR(d.dataValidade))}</strong></span>
        </div>
        <div style="margin-top:4mm;padding-top:4mm;border-top:1px solid rgba(255,255,255,.18);display:flex;justify-content:space-between;font-size:8pt;color:#C9D4EA;flex-wrap:wrap;gap:2mm;">
          <span><strong style="color:#fff;">Ecosolar Energy</strong> • Projeto • Homologação • Instalação</span>
          <span>${esc(d.empresa.instagram || '@ecosolarenergy')}</span>
        </div>
      </div>
    </div>
  </div>`
}

/* ------------------------------------------------------------------ */
/* PÁGINA 2 — APRESENTAÇÃO (espelho de v2PaginaApresentacao.tsx)      */
/* ------------------------------------------------------------------ */
const TRILHA = [
  { k: 'sol', ic: '☀', t: 'Sol', x: 'Luz gratuita, todos os dias' },
  { k: 'painel', ic: '▤', t: 'Painéis', x: 'Transformam a luz em energia' },
  { k: 'inversor', ic: '⌁', t: 'Inversor', x: 'Deixa a energia pronta para uso' },
  { k: 'casa', ic: '⌂', t: 'Sua casa', x: 'Usa na hora o que precisa' },
  { k: 'rede', ic: '⚡', t: 'Rede', x: 'Guarda a sobra como crédito' },
] as const

function paginaApresentacaoHtml(d: DadosV2): string {
  const primeiroNome = (d.clienteNome || 'Cliente').trim().split(/\s+/)[0]
  const trilhaHtml = TRILHA.map(
    (t) =>
      `<div class="etapa"><div class="etapa-ic">${t.ic}</div><div class="etapa-t">${t.t}</div><div class="etapa-x">${t.x}</div></div>`,
  ).join('')

  return `<div class="pv-page">
    ${cabecalhoInternoHtml(d, 2)}
    <div class="pv-pad" style="flex:1;display:flex;flex-direction:column;gap:4mm;">
      <div>
        <span class="pv-sec-tag">Apresentação</span>
        <div class="pv-sec-title" style="margin-top:2mm;">Olá, ${esc(primeiroNome)}! Aqui está o resumo em 30 segundos</div>
      </div>

      <p class="pv-corpo">Analisamos o seu consumo de <b>${esc(d.consumoKwh || '—')} kWh/mês</b> em <b>${esc(d.cidadeUf || 'sua região')}</b> e dimensionamos um sistema que gera <b>~${esc(d.txt.geracaoTxt)}</b> por mês. Na prática: a conta de luz de hoje (<b>${esc(d.txt.contaHojeRS)}</b>) passa a custar em torno de <b>${esc(d.txt.contaNovaRS)}</b> — só a taxa mínima e o Fio B. Você fica sabendo do investimento na página 4, com tudo incluso e sem surpresa.</p>

      <div class="pv-minis" style="margin-top:1mm;">
        <div class="pv-mini"><div class="k">Potência instalada</div><div class="v">${esc(d.txt.potenciaTxt)}</div></div>
        <div class="pv-mini"><div class="k">Geração mensal</div><div class="v">~${esc(d.txt.geracaoTxt)}</div></div>
        <div class="pv-mini"><div class="k">Economia/mês</div><div class="v am">${esc(d.txt.economiaMensalRS)}</div></div>
        <div class="pv-mini"><div class="k">Retorno</div><div class="v">${esc(d.txt.paybackCurto)}</div></div>
      </div>

      <div class="pv-trilha" style="margin-top:2mm;">${trilhaHtml}</div>

      <div class="pv-dia-noite" style="margin-top:2mm;">
        <div class="col">
          <div class="col-t" style="color:#B45309;">☀ De dia</div>
          <div class="col-x">Os painéis produzem energia e a sua casa consome direto da sua própria usina. O que sobra vira crédito automaticamente.</div>
        </div>
        <div class="col">
          <div class="col-t" style="color:#1D4ED8;">☾ À noite</div>
          <div class="col-x">Os créditos de energia gerada durante o dia abastecem o consumo noturno. É assim que a conta continua baixa fora do sol.</div>
        </div>
      </div>
    </div>
    ${rodapeInternoHtml(d, 2)}
  </div>`
}

/* ------------------------------------------------------------------ */
/* PÁGINA 3 — SISTEMA (espelho de v2PaginaSistema.tsx)                */
/* ------------------------------------------------------------------ */
function paginaSistemaHtml(d: DadosV2): string {
  const tabelaItens = d.itensKit
    .map(
      (it) =>
        `<tr><td class="qtd">${esc(it.qtd)}</td><td><b>${esc(it.item)}</b></td><td class="para">${esc(it.paraQue)}</td><td class="incluso">${esc(it.incluso)}</td></tr>`,
    )
    .join('')

  return `<div class="pv-page">
    ${cabecalhoInternoHtml(d, 3)}
    <div class="pv-pad" style="flex:1;display:flex;flex-direction:column;gap:3.5mm;">
      <div>
        <span class="pv-sec-tag">O sistema</span>
        <div class="pv-sec-title" style="margin-top:2mm;">Como chegamos no tamanho certo</div>
      </div>

      <div class="pv-formula">${esc(d.txt.formulaTxt)}</div>

      <div>
        <div style="display:flex;justify-content:space-between;font-size:8pt;color:#5A6680;margin-bottom:1.5mm;">
          <span>Cobertura estimada do seu consumo: <b style="color:#0B1E4A;">${esc(d.txt.coberturaTxt)}</b></span>
          <span>Geração ~${esc(d.txt.geracaoTxt)} • Consumo ${esc(d.consumoKwh || '—')} kWh/mês</span>
        </div>
        <div class="pv-barra-out"><div class="pv-barra-in" style="width:${esc(Math.max(2, Math.min(100, d.coberturaPct)))}%;"></div></div>
        <div style="font-size:7.5pt;color:#5A6680;margin-top:1.5mm;">O excedente vira crédito na distribuidora e compensa o consumo noturno e chuvoso (Lei 14.300).</div>
      </div>

      <div class="pv-tabela-wrap">
        <table class="pv-tabela">
          <thead><tr><th style="width:12mm;">Qtd.</th><th style="width:52mm;">Item</th><th>Para que serve</th><th style="width:22mm;">Incluso</th></tr></thead>
          <tbody>${tabelaItens}</tbody>
        </table>
      </div>

      <div class="pv-perdas"><b>Por que considerar 20% de perdas?</b> Nenhum sistema entrega 100% da potência de catálogo: calor, cabos, poeira e a eficiência do inversor consomem parte da energia. As contas desta proposta já usam o cenário realista (${esc(d.txt.geracaoTxt)} líquidos por mês), e não o número otimista do folheto.</div>

      <div class="pv-kpis3" style="margin-top:1mm;">
        <div class="pv-kpi"><div class="k">Geração mensal líquida</div><div class="v">~${esc(d.txt.geracaoTxt)}</div></div>
        <div class="pv-kpi"><div class="k">Cobertura da conta</div><div class="v">${esc(d.txt.coberturaTxt)}</div></div>
        <div class="pv-kpi"><div class="k">Vida útil do sistema</div><div class="v">25+ anos</div></div>
      </div>

      ${alertaInversorHtml(d)}
    </div>
    ${rodapeInternoHtml(d, 3)}
  </div>`
}

/* ------------------------------------------------------------------ */
/* PÁGINA 4 — INVESTIMENTO (espelho de v2PaginaInvestimento.tsx)      */
/* ------------------------------------------------------------------ */
function paginaInvestimentoHtml(d: DadosV2): string {
  return `<div class="pv-page">
    ${cabecalhoInternoHtml(d, 4)}
    <div class="pv-pad" style="flex:1;display:flex;flex-direction:column;gap:3.5mm;">
      <div>
        <span class="pv-sec-tag">Investimento</span>
        <div class="pv-sec-title" style="margin-top:2mm;">Quanto custa e quanto volta para o seu bolso</div>
      </div>

      <div class="pv-hero-preco">
        <div class="tag">INVESTIMENTO TOTAL • CHAVE NA MÃOS</div>
        <div class="linha-valor">
          ${d.txt.precoCheioRS ? `<span class="riscado">${esc(d.txt.precoCheioRS)}</span>` : ''}
          <span class="valor">${esc(d.txt.precoFinalRS)}</span>
          ${d.txt.descontoBadge ? `<span class="badge-desc">${esc(d.txt.descontoBadge)}</span>` : ''}
        </div>
        ${d.txt.parcelasTxt ? `<div class="parcelas">${esc(d.txt.parcelasTxt)}</div>` : ''}
        <div class="incluso">Inclui equipamentos, projeto com ART, homologação e instalação — sem taxa extra.</div>
      </div>

      <div class="pv-minis" style="margin-top:1mm;">
        <div class="pv-mini"><div class="k">Conta de hoje</div><div class="v">${esc(d.txt.contaHojeRS)}</div></div>
        <div class="pv-mini"><div class="k">Conta com solar</div><div class="v">${esc(d.txt.contaNovaRS)}</div></div>
        <div class="pv-mini"><div class="k">Economia/mês</div><div class="v am">${esc(d.txt.economiaMensalRS)}</div></div>
        <div class="pv-mini"><div class="k">Retorno</div><div class="v">${esc(d.txt.paybackCurto)}</div></div>
      </div>

      <div class="pv-comp">
        <div class="linha">
          <div class="rotulo">Poupança <b>${esc(d.txt.rendPoupanca)}</b>/ano</div>
          <div class="pv-comp-out"><div class="pv-comp-in" style="width:18%;"></div></div>
        </div>
        <div class="linha">
          <div class="rotulo">CDB líquido <b>${esc(d.txt.rendCdb)}</b>/ano</div>
          <div class="pv-comp-out"><div class="pv-comp-in" style="width:28%;"></div></div>
        </div>
        <div class="linha">
          <div class="rotulo">Sistema solar <b>${esc(d.txt.rendimentoSolar)}</b>/ano</div>
          <div class="pv-comp-out"><div class="pv-comp-in am" style="width:100%;"></div></div>
        </div>
        <div style="font-size:7.5pt;color:#5A6680;margin-top:1.5mm;">Rendimento do sistema solar = economia anual ÷ investimento. Isento de imposto e indexado à tarifa de energia, que só sobe.</div>
      </div>

      <div class="pv-2col" style="margin-top:1mm;">
        <div class="col">
          <div class="col-t">Como calculamos</div>
          <ul>${d.txt.comoCalculamos.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        </div>
        <div class="col destaque">
          <div class="col-t" style="color:#0B1E4A;">O que continua na sua conta</div>
          <ul>${d.txt.continuaNaConta.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
          <div style="margin-top:2.5mm;font-size:8pt;color:#5A6680;">Conta estimada com solar: <b style="color:#0B1E4A;">${esc(d.txt.contaNovaRS)}/mês</b> (taxa mínima + Fio B)</div>
        </div>
      </div>
    </div>
    ${rodapeInternoHtml(d, 4)}
  </div>`
}

/* ------------------------------------------------------------------ */
/* PÁGINA 5 — COMO VAI SER (espelho de v2PaginaComoVaiSer.tsx)        */
/* ------------------------------------------------------------------ */
const CHIP_COR: Record<string, 'voce' | 'eco' | 'conc'> = {
  Você: 'voce',
  Ecosolar: 'eco',
  Concessionária: 'conc',
}

function paginaComoVaiSerHtml(d: DadosV2): string {
  const etapasHtml = d.etapas
    .map(
      (e, i) =>
        `<div class="etapa"><span class="chip ${CHIP_COR[e.quem] ?? 'voce'}">${esc(e.quem)}</span><div class="etapa-t">${esc(`${i + 1}. ${e.titulo}`)}</div><div class="etapa-x">${esc(e.txt)}</div></div>`,
    )
    .join('')

  const garantiasHtml = d.garantias.map((g) => `<li>${esc(g)}</li>`).join('')
  const inclusoHtml = d.incluso.map((g) => `<li>${esc(g)}</li>`).join('')
  const naoInclusoHtml = d.naoIncluso.map((g) => `<li>${esc(g)}</li>`).join('')
  const pagamentosHtml = d.formasPagamento
    .map((f) => `<div class="linha"><b>${esc(f.titulo)}</b><span>${esc(f.descricao)}</span></div>`)
    .join('')

  return `<div class="pv-page">
    ${cabecalhoInternoHtml(d, 5)}
    <div class="pv-pad" style="flex:1;display:flex;flex-direction:column;gap:3.5mm;">
      <div>
        <span class="pv-sec-tag">Como vai ser</span>
        <div class="pv-sec-title" style="margin-top:2mm;">Do aceite ao sistema ligado — passo a passo</div>
      </div>

      <div class="pv-etapas" style="margin-top:1mm;">${etapasHtml}</div>

      <div style="font-size:8.5pt;color:#5A6680;margin-top:0.5mm;">Prazo de instalação: até <b style="color:#0B1E4A;">${PRAZO_INSTALACAO_DIAS} dias</b> após a aprovação da concessionária.</div>

      <div class="pv-2col" style="margin-top:1mm;">
        <div class="col">
          <div class="col-t" style="color:#166534;">Garantias</div>
          <ul>${garantiasHtml}</ul>
        </div>
        <div class="col destaque">
          <div class="col-t" style="color:#0B1E4A;">O que está incluso</div>
          <ul>${inclusoHtml}</ul>
          <div class="col-t" style="color:#7F1D1D;margin-top:2.5mm;">O que NÃO está incluso${d.naoIncluso.length === 0 ? ' — nada a pagar além do valor desta proposta' : ''}</div>
          <ul>${naoInclusoHtml}</ul>
        </div>
      </div>

      <div class="pv-pagamentos" style="margin-top:1mm;">
        <div class="pt-t">Formas de pagamento</div>
        ${pagamentosHtml}
      </div>
    </div>
    ${rodapeInternoHtml(d, 5)}
  </div>`
}

/* ------------------------------------------------------------------ */
/* PÁGINA 6 — FECHAMENTO (espelho de v2PaginaFinal.tsx)               */
/* ------------------------------------------------------------------ */
function paginaFinalHtml(d: DadosV2, urlAceite: string): string {
  const depoimentos: { nome: string; txt: string }[] = [...d.depoimento]
  if (d.depoimentoExtra && depoimentos.length < 2) depoimentos.push(d.depoimentoExtra)

  const depoHtml = depoimentos
    .slice(0, 2)
    .map(
      (dep) =>
        `<div class="pv-depo navy"><div class="aspas" aria-hidden="true">”</div><div><div class="txt">${esc(dep.txt)}</div><div class="autor">${esc(dep.nome)}</div></div></div>`,
    )
    .join('')

  const faqHtml = d.faq
    .map((f) => `<div><div class="q">${esc(f.q)}</div><div class="a">${esc(f.a)}</div></div>`)
    .join('')

  return `<div class="pv-page">
    ${cabecalhoInternoHtml(d, 6)}
    <div class="pv-pad" style="flex:1;display:flex;flex-direction:column;gap:3.5mm;">
      <div>
        <span class="pv-sec-tag">Fechamento</span>
        <div class="pv-sec-title" style="margin-top:2mm;">Pronto para começar a economizar?</div>
      </div>

      <div style="display:grid;grid-template-columns:${depoimentos.length > 1 ? '1fr 1fr' : '1fr'};gap:3mm;">${depoHtml}</div>

      <div class="pv-faq" style="grid-template-columns:1fr 1fr;">${faqHtml}</div>

      <div class="pv-aceite">
        <strong style="font-size:9pt;color:#0B1E4A;">Aceite desta proposta — válido até ${esc(dataBR(d.dataValidade))} (${esc(d.validadeDias)} dias)</strong>
        <div class="mono">${esc(urlAceite || 'Link de aceite disponível com o seu consultor')}</div>
        <div class="qrbox">
          ${urlAceite ? qrCodeHtml(urlAceite) : ''}
          <div class="qrtexto">Aponte a câmera do celular para o QR Code ou acesse o link acima para aceitar a proposta digitalmente. O aceite é registrado com data/hora e entra imediatamente na fila de engenharia. Dúvidas? WhatsApp <b style="color:#0B1E4A;">${esc(CONTATO_ECOSOLAR.telefoneFormatado)}</b>.</div>
        </div>
      </div>

      <div class="pv-assina">
        <div class="campo"><b>${esc(d.clienteNome)}</b><span>Cliente contratante</span></div>
        <div class="campo"><b>${esc(d.consultorNome || 'Consultor Ecosolar')}</b><span>Ecosolar Energy</span></div>
      </div>
    </div>
    ${rodapeInternoHtml(d, 6)}
  </div>`
}

/* ------------------------------------------------------------------ */
/* Alerta interno — SOMENTE TELA (nunca sai no PDF impresso)          */
/* ------------------------------------------------------------------ */
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
/* HTML completo                                                      */
/* ------------------------------------------------------------------ */
export function generateProposalPrintHTML(
  data: ProposalPDFData,
  opts?: { urlBase?: string; linkPublico?: string },
): string {
  const linkPublico =
    opts?.linkPublico ||
    (data.token_publico ? `/proposta/${data.token_publico}` : `/proposta/${data.id || ''}`)
  const urlAceite = opts?.urlBase ? `${opts.urlBase}${linkPublico}` : linkPublico
  const d = proposalDataDePublica(
    { ...data, lead: leadDeData(data) } as unknown as PublicProposta,
    {},
    urlAceite,
  )

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Proposta Comercial Nº ${esc(d.numero)} — ${esc(d.clienteNome)} | Ecosolar Energy</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${FONTS_PROPOSTA_LINK}" />
  <style>${PROPOSTA_V2_CSS}${IMPRESSAO_CSS_EXTRA}</style>
</head>
<body>
  <div class="prop-v2">
    ${paginaCapaHtml(d)}
    ${paginaApresentacaoHtml(d)}
    ${paginaSistemaHtml(d)}
    ${paginaInvestimentoHtml(d)}
    ${paginaComoVaiSerHtml(d)}
    ${paginaFinalHtml(d, urlAceite)}
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
