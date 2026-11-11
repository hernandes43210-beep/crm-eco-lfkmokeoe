/**
 * Identidade visual + CSS compartilhado da proposta clássica v2 (6 páginas A4).
 * Usado pela página pública /proposta/:id (via className utilitárias) e pela
 * versão para impressão/PDF (proposalPdf.ts injeta PROPOSTA_V2_CSS inteiro).
 */

export const CORES_PROPOSTA = {
  navy: '#0b1f4d',
  navy2: '#13306b',
  navy3: '#1d4290',
  amarelo: '#ffd23f',
  amarelo2: '#f5b800',
  verde: '#11845b',
  cardBg: '#f3f6fb',
  borda: '#dfe5f0',
  texto: '#14213d',
  textoSec: '#5b6782',
} as const

export const FONTS_PROPOSTA_LINK =
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&family=Inter:wght@400;500;600;700;800&display=swap'

/** CSS completo da proposta (tela + impressão). Cada página é uma folha A4. */
export const PROPOSTA_V2_CSS = `
.prop-v2, .prop-v2 * { box-sizing: border-box; margin: 0; padding: 0; }
.prop-v2 {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: ${CORES_PROPOSTA.texto};
  background: #e9edf5;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.prop-v2 .pv-page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto 10mm auto;
  background: #ffffff;
  box-shadow: 0 6px 24px rgba(11,31,77,.14);
  page-break-after: always;
  break-after: page;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
.prop-v2 .pv-page:last-child { page-break-after: auto; break-after: auto; }
.prop-v2 h1, .prop-v2 h2, .prop-v2 h3, .prop-v2 .pv-mont { font-family: 'Montserrat', 'Inter', sans-serif; }
.prop-v2 .pv-page-inner { flex: 1 0 auto; display: flex; flex-direction: column; }
.prop-v2 .pv-pad { padding: 0 12mm 10mm 12mm; }
.prop-v2 .pv-flex1 { flex: 1 1 auto; }

/* Cabeçalho interno padrão */
.prop-v2 .pv-header {
  background: ${CORES_PROPOSTA.navy};
  color: #fff;
  padding: 6mm 12mm;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1.2mm solid ${CORES_PROPOSTA.amarelo};
}
.prop-v2 .pv-logo { font-family: 'Montserrat'; font-weight: 900; font-size: 15pt; letter-spacing: .5px; }
.prop-v2 .pv-logo .eco { color: #fff; }
.prop-v2 .pv-logo .solar { color: ${CORES_PROPOSTA.amarelo}; }
.prop-v2 .pv-logo .energy { color: #fff; font-weight: 800; }
.prop-v2 .pv-header-info { text-align: right; font-size: 7.5pt; color: #cdd7ec; line-height: 1.5; }
.prop-v2 .pv-header-info strong { color: ${CORES_PROPOSTA.amarelo}; font-weight: 800; }
.prop-v2 .pv-slogan { font-size: 6.2pt; letter-spacing: 1.2px; text-transform: uppercase; color: #9fb0d4; margin-top: 1px; }

/* Rodapé padrão */
.prop-v2 .pv-footer {
  margin-top: auto;
  background: ${CORES_PROPOSTA.cardBg};
  border-top: 1px solid ${CORES_PROPOSTA.borda};
  padding: 3.5mm 12mm;
  display: flex; align-items: center; justify-content: space-between;
  font-size: 7pt; color: ${CORES_PROPOSTA.textoSec};
}
.prop-v2 .pv-footer strong { color: ${CORES_PROPOSTA.texto}; }
.prop-v2 .pv-pgnum { font-weight: 800; color: ${CORES_PROPOSTA.navy}; }

/* Capa (página 1) */
.prop-v2 .pv-capa {
  background: linear-gradient(150deg, #071633 0%, ${CORES_PROPOSTA.navy} 38%, ${CORES_PROPOSTA.navy2} 72%, ${CORES_PROPOSTA.navy3} 100%);
  color: #fff;
  padding: 12mm 12mm 10mm 12mm;
  flex: 1 0 auto;
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
}
.prop-v2 .pv-capa-grid {
  position: absolute; inset: 0; opacity: .12; pointer-events: none;
  background-image:
    linear-gradient(to right, rgba(255,210,63,.5) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,210,63,.5) 1px, transparent 1px);
  background-size: 12mm 12mm;
}
.prop-v2 .pv-selo {
  display: inline-block; background: transparent; border: 2px solid ${CORES_PROPOSTA.amarelo};
  color: ${CORES_PROPOSTA.amarelo}; font-family: 'Montserrat'; font-weight: 800;
  font-size: 8.5pt; letter-spacing: 1.6px; padding: 2.2mm 5mm; border-radius: 999px;
  text-transform: uppercase;
}
.prop-v2 .pv-capa h1 { font-size: 30pt; font-weight: 900; line-height: 1.12; letter-spacing: -.5px; }
.prop-v2 .pv-capa h1 .am { color: ${CORES_PROPOSTA.amarelo}; }
.prop-v2 .pv-capa-sub { font-size: 10pt; line-height: 1.55; color: #d5dff2; max-width: 150mm; }
.prop-v2 .pv-capa-foto { position: relative; height: 92mm; overflow: hidden; }
.prop-v2 .pv-capa-foto img { width: 100%; height: 100%; object-fit: cover; display: block; }
/* A figura/placeholder da capa ocupa todo o quadro (sem margem do navegador), para a imagem preencher o recorte na tela e na impressão */
.prop-v2 .pv-capa-foto > .pv-foto { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; border-radius: 0; }
.prop-v2 .pv-capa-foto > .pv-foto img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.prop-v2 .pv-capa-foto::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(100deg, ${CORES_PROPOSTA.navy} 0%, rgba(11,31,77,.35) 45%, rgba(11,31,77,0) 78%);
}
.prop-v2 .pv-clip { clip-path: polygon(0 0, 100% 0, 100% 78%, 0 100%); }
.prop-v2 .pv-card-cliente {
  background: rgba(255,255,255,.07);
  border-left: 2.2mm solid ${CORES_PROPOSTA.amarelo};
  border-radius: 2.5mm; padding: 5mm 6mm;
}
.prop-v2 .pv-card-cliente .lbl { font-size: 7.5pt; letter-spacing: 1.4px; text-transform: uppercase; color: #b9c6e4; font-weight: 700; }
.prop-v2 .pv-card-cliente .nome { font-family: 'Montserrat'; font-weight: 800; font-size: 17pt; margin: 1.5mm 0; }
.prop-v2 .pv-card-cliente .meta { font-size: 8.5pt; color: #d5dff2; }
.prop-v2 .pv-minis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; }
.prop-v2 .pv-mini { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.16); border-radius: 2.5mm; padding: 3.5mm 3mm; text-align: center; }
.prop-v2 .pv-mini .k { font-size: 6.6pt; letter-spacing: 1px; text-transform: uppercase; color: #b9c6e4; font-weight: 700; }
.prop-v2 .pv-mini .v { font-family: 'Montserrat'; font-weight: 800; font-size: 12.5pt; margin-top: 1.2mm; }
.prop-v2 .pv-mini .v.am { color: ${CORES_PROPOSTA.amarelo}; }
.prop-v2 .pv-capaline { display: flex; gap: 6mm; font-size: 8pt; color: #cdd7ec; flex-wrap: wrap; }
.prop-v2 .pv-capaline strong { color: #fff; }
.prop-v2 .pv-capaline .val strong { color: ${CORES_PROPOSTA.amarelo}; }

/* Cartões / seções genéricos */
.prop-v2 .pv-card { background: ${CORES_PROPOSTA.cardBg}; border: 1px solid ${CORES_PROPOSTA.borda}; border-radius: 3mm; padding: 5mm; }
.prop-v2 .pv-card h3 { font-size: 10.5pt; font-weight: 800; color: ${CORES_PROPOSTA.navy}; }
.prop-v2 .pv-sec-title { font-family: 'Montserrat'; font-weight: 900; font-size: 15pt; color: ${CORES_PROPOSTA.navy}; letter-spacing: -.3px; }
.prop-v2 .pv-sec-tag {
  display: inline-block; background: ${CORES_PROPOSTA.navy}; color: ${CORES_PROPOSTA.amarelo};
  font-family: 'Montserrat'; font-weight: 800; font-size: 8pt; letter-spacing: 1.5px;
  padding: 1.6mm 4mm; border-radius: 999px; text-transform: uppercase;
}
.prop-v2 .pv-sub { font-size: 9pt; color: ${CORES_PROPOSTA.textoSec}; }

/* Resumo 30s (página 2) */
.prop-v2 .pv-grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3.5mm; }
.prop-v2 .pv-grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 3.5mm; }
.prop-v2 .pv-resumo { background: #fff; border: 1px solid ${CORES_PROPOSTA.borda}; border-radius: 3mm; padding: 4.5mm; }
.prop-v2 .pv-resumo .k { font-size: 7.2pt; letter-spacing: .8px; text-transform: uppercase; color: ${CORES_PROPOSTA.textoSec}; font-weight: 700; }
.prop-v2 .pv-resumo .v { font-family: 'Montserrat'; font-weight: 800; font-size: 13pt; color: ${CORES_PROPOSTA.navy}; margin-top: 1.4mm; line-height: 1.15; }
.prop-v2 .pv-resumo .n { font-size: 7.6pt; color: ${CORES_PROPOSTA.textoSec}; margin-top: 1.2mm; }
.prop-v2 .pv-resumo.hl { background: ${CORES_PROPOSTA.navy}; border-color: ${CORES_PROPOSTA.navy}; }
.prop-v2 .pv-resumo.hl .k { color: #b9c6e4; }
.prop-v2 .pv-resumo.hl .v { color: ${CORES_PROPOSTA.amarelo}; }
.prop-v2 .pv-resumo.hl .n { color: #d5dff2; }

/* Fluxo do sol (página 2) */
.prop-v2 .pv-fluxo { display: flex; align-items: stretch; gap: 2.5mm; }
.prop-v2 .pv-fluxo-item { flex: 1; background: ${CORES_PROPOSTA.cardBg}; border: 1px solid ${CORES_PROPOSTA.borda}; border-radius: 2.5mm; padding: 3.5mm 2.5mm; text-align: center; }
.prop-v2 .pv-fluxo-item .ico { font-size: 14pt; line-height: 1; }
.prop-v2 .pv-fluxo-item .t { font-weight: 800; font-size: 8pt; color: ${CORES_PROPOSTA.navy}; margin-top: 1.4mm; }
.prop-v2 .pv-fluxo-item .d { font-size: 6.8pt; color: ${CORES_PROPOSTA.textoSec}; margin-top: .8mm; line-height: 1.35; }
.prop-v2 .pv-fluxo-arrow { align-self: center; color: ${CORES_PROPOSTA.amarelo2}; font-size: 11pt; font-weight: 900; flex: 0 0 auto; }
.prop-v2 .pv-periodo { border-radius: 3mm; padding: 4.5mm 5mm; font-size: 8.6pt; line-height: 1.55; }
.prop-v2 .pv-periodo.dia { background: #fff7dd; border: 1px solid #f3dd9a; }
.prop-v2 .pv-periodo.noite { background: #eef2fb; border: 1px solid ${CORES_PROPOSTA.borda}; }

/* Página 3 — kit */
.prop-v2 .pv-conta {
  border: 1.4px dashed ${CORES_PROPOSTA.navy3}; background: #f6f8fd; border-radius: 3mm;
  padding: 4.5mm 5mm; font-size: 9.5pt; line-height: 1.7; text-align: center; font-weight: 600;
}
.prop-v2 .pv-conta .op { color: ${CORES_PROPOSTA.navy3}; font-weight: 800; }
.prop-v2 .pv-conta .res { color: ${CORES_PROPOSTA.verde}; font-weight: 900; font-family: 'Montserrat'; }
.prop-v2 .pv-barra { background: #e6ebf5; border-radius: 999px; height: 7mm; overflow: hidden; display: flex; }
.prop-v2 .pv-barra .g { background: ${CORES_PROPOSTA.verde}; height: 100%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 7.2pt; font-weight: 800; }
.prop-v2 .pv-barra .r { background: #c8d2e4; height: 100%; display: flex; align-items: center; justify-content: center; color: ${CORES_PROPOSTA.texto}; font-size: 7.2pt; font-weight: 800; }
.prop-v2 .pv-info-azul { background: #eaf1fd; border: 1px solid #c9d9f5; border-radius: 3mm; padding: 4.5mm 5mm; font-size: 8.6pt; line-height: 1.55; }
.prop-v2 .pv-info-azul strong { color: ${CORES_PROPOSTA.navy}; }
.prop-v2 table.pv-tabela { width: 100%; border-collapse: collapse; font-size: 8pt; }
.prop-v2 table.pv-tabela th { background: ${CORES_PROPOSTA.navy}; color: #fff; text-align: left; padding: 2.6mm 3mm; font-size: 7.2pt; text-transform: uppercase; letter-spacing: .8px; }
.prop-v2 table.pv-tabela td { padding: 2.6mm 3mm; border-bottom: 1px solid ${CORES_PROPOSTA.borda}; vertical-align: top; line-height: 1.45; }
.prop-v2 table.pv-tabela tr:nth-child(even) td { background: ${CORES_PROPOSTA.cardBg}; }
.prop-v2 table.pv-tabela .qtd { font-weight: 900; color: ${CORES_PROPOSTA.navy}; white-space: nowrap; }
.prop-v2 table.pv-tabela .item { font-weight: 700; color: ${CORES_PROPOSTA.texto}; }
.prop-v2 table.pv-tabela .para { color: ${CORES_PROPOSTA.textoSec}; }
.prop-v2 .pv-incluso { color: ${CORES_PROPOSTA.verde}; font-weight: 800; white-space: nowrap; }
.prop-v2 .pv-kits-fim { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3.5mm; }
.prop-v2 .pv-kits-fim .pv-card { text-align: center; }
.prop-v2 .pv-kits-fim .v { font-family: 'Montserrat'; font-weight: 800; font-size: 11pt; color: ${CORES_PROPOSTA.navy}; margin-top: 1mm; }
.prop-v2 .pv-kits-fim .n { font-size: 7.4pt; color: ${CORES_PROPOSTA.textoSec}; margin-top: .8mm; }

/* Página 4 — investimento */
.prop-v2 .pv-invest {
  background: ${CORES_PROPOSTA.navy}; color: #fff; border-radius: 3mm;
  border-bottom: 2mm solid ${CORES_PROPOSTA.amarelo};
  padding: 6mm; display: flex; justify-content: space-between; gap: 6mm;
}
.prop-v2 .pv-invest .lbl { font-size: 8pt; letter-spacing: 1.4px; text-transform: uppercase; color: #b9c6e4; font-weight: 700; }
.prop-v2 .pv-invest h3 { font-family: 'Montserrat'; font-weight: 900; font-size: 16pt; margin: 1.5mm 0; }
.prop-v2 .pv-invest p { font-size: 8.4pt; color: #d5dff2; line-height: 1.5; }
.prop-v2 .pv-preco { text-align: right; min-width: 62mm; }
.prop-v2 .pv-preco .cheio { text-decoration: line-through; color: #9fb0d4; font-size: 10.5pt; }
.prop-v2 .pv-preco .off { display: inline-block; background: ${CORES_PROPOSTA.verde}; color: #fff; font-weight: 800; font-size: 7.5pt; border-radius: 999px; padding: 1mm 3mm; margin-left: 2mm; }
.prop-v2 .pv-preco .final { font-family: 'Montserrat'; font-weight: 900; font-size: 24pt; color: ${CORES_PROPOSTA.amarelo}; line-height: 1.1; }
.prop-v2 .pv-preco .economiza { font-size: 8.4pt; color: #9be3c4; margin-top: 1.4mm; }
.prop-v2 .pv-cards4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3.5mm; }
.prop-v2 .pv-inv-card { background: #fff; border: 1px solid ${CORES_PROPOSTA.borda}; border-radius: 3mm; padding: 4mm; }
.prop-v2 .pv-inv-card .k { font-size: 7pt; text-transform: uppercase; letter-spacing: .8px; color: ${CORES_PROPOSTA.textoSec}; font-weight: 700; }
.prop-v2 .pv-inv-card .v { font-family: 'Montserrat'; font-weight: 800; font-size: 13pt; color: ${CORES_PROPOSTA.navy}; margin-top: 1.2mm; line-height: 1.1; }
.prop-v2 .pv-inv-card .n { font-size: 7.2pt; color: ${CORES_PROPOSTA.textoSec}; margin-top: 1mm; line-height: 1.3; }
.prop-v2 .pv-inv-card.hl { background: ${CORES_PROPOSTA.navy}; border-color: ${CORES_PROPOSTA.navy}; }
.prop-v2 .pv-inv-card.hl .k { color: #b9c6e4; }
.prop-v2 .pv-inv-card.hl .v { color: ${CORES_PROPOSTA.amarelo}; }
.prop-v2 .pv-inv-card.hl .n { color: #d5dff2; }
.prop-v2 .pv-barras .linha { display: grid; grid-template-columns: 34mm 1fr 16mm; align-items: center; gap: 3mm; margin-top: 2.6mm; }
.prop-v2 .pv-barras .nome { font-size: 8pt; font-weight: 600; color: ${CORES_PROPOSTA.texto}; }
.prop-v2 .pv-barras .faixa { background: #e6ebf5; border-radius: 999px; height: 6.5mm; overflow: hidden; }
.prop-v2 .pv-barras .fill { height: 100%; border-radius: 999px; display: flex; align-items: center; padding-left: 2.5mm; color: #fff; font-size: 7.2pt; font-weight: 800; }
.prop-v2 .pv-barras .pct { font-family: 'Montserrat'; font-weight: 800; font-size: 9pt; text-align: right; }
.prop-v2 .pv-barras .pct.solar { color: ${CORES_PROPOSTA.verde}; }
.prop-v2 .pv-nota { font-size: 7pt; color: ${CORES_PROPOSTA.textoSec}; line-height: 1.45; }
.prop-v2 .pv-li { display: flex; gap: 2.5mm; font-size: 8.4pt; line-height: 1.5; margin-top: 2.2mm; }
.prop-v2 .pv-li .bola { width: 2.6mm; height: 2.6mm; border-radius: 999px; flex: 0 0 auto; margin-top: 1.4mm; }
.prop-v2 .pv-li .bola.v { background: ${CORES_PROPOSTA.verde}; }
.prop-v2 .pv-li .bola.c { background: #aab4c9; }
.prop-v2 .pv-caixa-am { background: #fff7dd; border: 1px solid #f3dd9a; border-radius: 3mm; padding: 4.5mm 5mm; }
.prop-v2 .pv-caixa-am h4 { font-family: 'Montserrat'; font-weight: 800; font-size: 9.5pt; color: #7a5a00; }
.prop-v2 .pv-caixa-am p { font-size: 8.4pt; line-height: 1.5; color: #5c4a12; margin-top: 2mm; }

/* Página 5 — etapas */
.prop-v2 .pv-etapas { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3.5mm; }
.prop-v2 .pv-etapa { background: #fff; border: 1px solid ${CORES_PROPOSTA.borda}; border-radius: 3mm; padding: 4mm; }
.prop-v2 .pv-etapa.hl { background: #fff7dd; border-color: #f3dd9a; }
.prop-v2 .pv-etapa .topo { display: flex; align-items: center; justify-content: space-between; }
.prop-v2 .pv-etapa .num {
  width: 7.5mm; height: 7.5mm; border-radius: 999px; background: ${CORES_PROPOSTA.navy};
  color: ${CORES_PROPOSTA.amarelo}; font-family: 'Montserrat'; font-weight: 900; font-size: 10pt;
  display: flex; align-items: center; justify-content: center; flex: 0 0 auto;
}
.prop-v2 .pv-etapa .quem { font-size: 6.2pt; font-weight: 800; letter-spacing: .8px; border-radius: 999px; padding: .8mm 2.4mm; text-transform: uppercase; }
.prop-v2 .pv-etapa .quem.voce { background: ${CORES_PROPOSTA.amarelo}; color: ${CORES_PROPOSTA.navy}; }
.prop-v2 .pv-etapa .quem.eco { background: ${CORES_PROPOSTA.navy}; color: #fff; }
.prop-v2 .pv-etapa .quem.conc { background: ${CORES_PROPOSTA.cardBg}; color: ${CORES_PROPOSTA.texto}; border: 1px solid ${CORES_PROPOSTA.borda}; }
.prop-v2 .pv-etapa h4 { font-weight: 800; font-size: 8.8pt; color: ${CORES_PROPOSTA.navy}; margin-top: 2mm; }
.prop-v2 .pv-etapa p { font-size: 7.6pt; color: ${CORES_PROPOSTA.textoSec}; line-height: 1.45; margin-top: 1mm; }
.prop-v2 .pv-pagtos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3.5mm; }
.prop-v2 .pv-pagto { background: ${CORES_PROPOSTA.cardBg}; border: 1px solid ${CORES_PROPOSTA.borda}; border-radius: 3mm; padding: 4mm 4.5mm; }
.prop-v2 .pv-pagto h4 { font-family: 'Montserrat'; font-weight: 800; font-size: 9.5pt; color: ${CORES_PROPOSTA.navy}; }
.prop-v2 .pv-pagto p { font-size: 7.8pt; color: ${CORES_PROPOSTA.textoSec}; margin-top: 1.2mm; line-height: 1.45; }

/* Página 6 — obras, FAQ e aceite */
.prop-v2 .pv-mosaico { display: grid; grid-template-columns: 1.4fr 1fr 1fr; grid-template-rows: repeat(2, 34mm); gap: 3mm; }
.prop-v2 .pv-foto { position: relative; border-radius: 3mm; overflow: hidden; background: ${CORES_PROPOSTA.cardBg}; }
.prop-v2 .pv-foto.grande { grid-row: span 2; }
.prop-v2 .pv-foto img { width: 100%; height: 100%; object-fit: cover; display: block; }
.prop-v2 .pv-foto .leg {
  position: absolute; left: 2mm; bottom: 2mm; background: ${CORES_PROPOSTA.navy}; color: #fff;
  font-size: 6.8pt; font-weight: 700; padding: 1.2mm 3mm; border-radius: 999px; max-width: calc(100% - 4mm);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.prop-v2 .pv-depo { background: ${CORES_PROPOSTA.navy}; color: #fff; border-radius: 3mm; padding: 5mm 6mm; display: flex; gap: 4mm; align-items: flex-start; }
.prop-v2 .pv-depo .aspas { font-family: 'Montserrat'; font-weight: 900; font-size: 26pt; color: ${CORES_PROPOSTA.amarelo}; line-height: .9; }
.prop-v2 .pv-depo .txt { font-size: 9.5pt; line-height: 1.5; font-style: italic; }
.prop-v2 .pv-depo .autor { font-size: 8pt; color: ${CORES_PROPOSTA.amarelo}; font-weight: 700; margin-top: 1.6mm; }
.prop-v2 .pv-faq { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 4mm; }
.prop-v2 .pv-faq .q { font-weight: 800; font-size: 8.6pt; color: ${CORES_PROPOSTA.navy}; }
.prop-v2 .pv-faq .a { font-size: 8pt; color: ${CORES_PROPOSTA.textoSec}; line-height: 1.5; margin-top: .8mm; }
.prop-v2 .pv-aceite { border: 1.6px dashed ${CORES_PROPOSTA.navy3}; border-radius: 3mm; padding: 5mm; background: #f6f8fd; }
.prop-v2 .pv-aceite .mono { font-family: 'Courier New', monospace; font-size: 8pt; background: #fff; border: 1px solid ${CORES_PROPOSTA.borda}; border-radius: 1.5mm; padding: 2mm 3mm; word-break: break-all; display: block; }
.prop-v2 .pv-aceite-tela { display: flex; flex-direction: column; gap: 3mm; align-items: stretch; }
.prop-v2 .pv-aceite-tela .pv-btn-aceite {
  background: ${CORES_PROPOSTA.verde}; color: #fff; border: 0; border-radius: 999px;
  font-family: 'Montserrat'; font-weight: 800; font-size: 10pt; padding: 3.5mm 6mm; cursor: pointer;
}
.prop-v2 .pv-aceite-tela .pv-btn-aceite:hover { filter: brightness(1.06); }
.prop-v2 .pv-aceite-tela .pv-link-aceite { color: ${CORES_PROPOSTA.navy3}; font-size: 8.4pt; text-align: center; word-break: break-all; }
.prop-v2 .pv-assina { display: flex; gap: 10mm; margin-top: 4mm; }
.prop-v2 .pv-assina .campo { flex: 1; border-top: 1px solid ${CORES_PROPOSTA.texto}; padding-top: 1.6mm; font-size: 8pt; }
.prop-v2 .pv-assina .campo b { display: block; font-size: 9pt; color: ${CORES_PROPOSTA.texto}; }
.prop-v2 .pv-assina .campo span { color: ${CORES_PROPOSTA.textoSec}; font-size: 7.4pt; }

/* Tela em celular: blocos empilhados, sem rolagem horizontal */
@media screen and (max-width: 820px) {
  .prop-v2 .pv-page { width: 100%; min-height: 0; box-shadow: 0 3px 14px rgba(11,31,77,.14); }
  .prop-v2 .pv-capa { padding: 22px 18px; height: auto; }
  .prop-v2 .pv-capa h1 { font-size: 21pt; }
  .prop-v2 .pv-capa-foto { height: auto; aspect-ratio: 4 / 3; }
  .prop-v2 .pv-header { padding: 12px 16px; flex-wrap: wrap; gap: 4px; }
  .prop-v2 .pv-header-info { text-align: left; }
  .prop-v2 .pv-minis, .prop-v2 .pv-grid4, .prop-v2 .pv-cards4 { grid-template-columns: repeat(2, 1fr); }
  .prop-v2 .pv-etapas, .prop-v2 .pv-kits-fim { grid-template-columns: repeat(2, 1fr); }
  .prop-v2 .pv-fluxo { flex-direction: column; }
  .prop-v2 .pv-fluxo-arrow { transform: rotate(90deg); }
  .prop-v2 .pv-mosaico { grid-template-columns: 1fr 1fr; grid-template-rows: repeat(3, 120px); }
  .prop-v2 .pv-foto.grande { grid-row: auto; grid-column: span 2; }
  .prop-v2 .pv-invest { flex-direction: column; }
  .prop-v2 .pv-preco { text-align: left; }
  .prop-v2 .pv-barras .linha { grid-template-columns: 26mm 1fr 14mm; }
  .prop-v2 table.pv-tabela { font-size: 7.2pt; }
  .prop-v2 .pv-assina { flex-direction: column; gap: 6mm; }
}

/* Impressão */
@media print {
  .prop-v2 { background: #fff; }
  .prop-v2 .pv-page { box-shadow: none; margin: 0; width: 210mm; height: 297mm; }
  .prop-v2 .pv-capa { height: 297mm; }
  body { background: #fff; }
  @page { size: A4 portrait; margin: 0; }
}
.prop-v2 .pv-somente-tela { display: block; }
.prop-v2 .pv-somente-impressao { display: none; }
@media print {
  .prop-v2 .pv-somente-tela { display: none !important; }
  .prop-v2 .pv-somente-impressao { display: block !important; }
}
`

/** Monta o <head> (fontes + CSS) para a janela de impressão/PDF. */
export function propostaHeadHtml(): string {
  return `<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${FONTS_PROPOSTA_LINK}" rel="stylesheet" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4 portrait; margin: 0; }
  ${PROPOSTA_V2_CSS}
</style>`
}
