/**
 * Proposta clássica revisada — visual corporativo navy (#0B1E4A) + amarelo (#FFC629).
 * Folhas A4 fixas (210×297mm) que também são usadas pela versão de impressão/PDF.
 */
export const FONTS_PROPOSTA_LINK =
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap'

export const CORES_PROPOSTA = {
  navy: '#0B1E4A',
  navyEscuro: '#071636',
  amarelo: '#FFC629',
  amareloEscuro: '#E8B000',
  texto: '#1A2440',
  textoSuave: '#5A6680',
  linha: '#DDE3EF',
  fundoSuave: '#F3F5FA',
  verde: '#0E7A54',
}

export const PROPOSTA_V2_CSS = `
.prop-v2{background:#eef1f7;padding:16px 0;font-family:Inter,sans-serif;color:#1A2440}
.pv-page{width:210mm;height:297mm;background:#fff;margin:0 auto 14px;box-shadow:0 4px 24px rgba(11,30,74,.12);border-radius:6px;position:relative;overflow:hidden;display:flex;flex-direction:column}
.pv-pad{padding:12mm 14mm}

/* ===== CAPA ===== */
.pv-capa{background:linear-gradient(150deg,#0B1E4A 0%,#123063 55%,#0B1E4A 100%);color:#fff;flex:1;display:flex;flex-direction:column;position:relative}
.pv-capa-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:10mm 10mm}
.pv-logo{font-family:Montserrat,sans-serif;font-weight:900;font-size:22pt;letter-spacing:.5px;line-height:1}
.pv-logo .eco{color:#fff}.pv-logo .solar{color:#FFC629}.pv-logo .energy{color:#fff;font-weight:600;font-size:11pt;vertical-align:super}
.pv-selo{font-family:Montserrat,sans-serif;font-weight:700;font-size:8.5pt;letter-spacing:1px;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:2mm 4mm;color:#FFC629;white-space:nowrap}
.pv-capa-sub{font-size:9.5pt;line-height:1.55;color:#C9D4EA;max-width:80mm}
.pv-card-cliente{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:4mm;padding:4mm 5mm;backdrop-filter:blur(2px)}
.pv-card-cliente .lbl{font-size:7.5pt;text-transform:uppercase;letter-spacing:1.2px;color:#FFC629;font-weight:800}
.pv-card-cliente .nome{font-family:Montserrat,sans-serif;font-weight:800;font-size:15pt;margin:1mm 0}
.pv-card-cliente .meta{font-size:8pt;color:#C9D4EA}
.pv-capa-foto{width:85mm;height:85mm;border-radius:4mm;overflow:hidden;border:2px solid rgba(255,255,255,.25);display:flex;align-items:flex-end;flex-direction:column;justify-content:flex-start;background:linear-gradient(140deg,#16346e,#0B1E4A)}
.pv-capa-foto img{width:100%;height:100%;object-fit:cover}
.pv-capa-foto .legenda{width:100%;font-size:7pt;color:#C9D4EA;padding:1.5mm 2.5mm;background:rgba(7,22,54,.82)}
.pv-minis{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}
.pv-mini{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:3mm;padding:3mm;text-align:center}
.pv-mini .k{font-size:7pt;text-transform:uppercase;letter-spacing:.8px;color:#A9B8D8;font-weight:700}
.pv-mini .v{font-family:Montserrat,sans-serif;font-weight:800;font-size:12pt;margin-top:1mm}
.pv-mini .v.am{color:#FFC629}

/* ===== CABEÇALHO/RODAPÉ internos ===== */
.pv-cabecalho{display:flex;justify-content:space-between;align-items:center;padding:8mm 14mm 0;border-bottom:0}
.pv-cabecalho .marca{font-family:Montserrat,sans-serif;font-weight:900;font-size:11pt;color:#0B1E4A}
.pv-cabecalho .marca .solar{color:#E8A400}
.pv-cabecalho .num{font-size:7.5pt;color:#5A6680;letter-spacing:.5px}
.pv-rodape{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:4mm 14mm;border-top:1px solid #DDE3EF;font-size:7pt;color:#5A6680;background:#fff}
.pv-rodape .pg{font-family:Montserrat,sans-serif;font-weight:800;color:#0B1E4A}

/* ===== Títulos de seção ===== */
.pv-sec-tag{display:inline-block;font-family:Montserrat,sans-serif;font-weight:800;font-size:7.5pt;letter-spacing:1.4px;text-transform:uppercase;color:#0B1E4A;background:#FFC629;border-radius:2px;padding:1mm 2.5mm}
.pv-sec-title{font-family:Montserrat,sans-serif;font-weight:800;font-size:16pt;color:#0B1E4A;line-height:1.15}
.pv-sub{font-size:8.5pt;color:#5A6680}

/* ===== KPIs / cartões ===== */
.pv-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}
.pv-kpi{background:#F3F5FA;border:1px solid #DDE3EF;border-radius:3mm;padding:3.5mm 3mm;text-align:center}
.pv-kpi .k{font-size:6.8pt;text-transform:uppercase;letter-spacing:.8px;color:#5A6680;font-weight:700}
.pv-kpi .v{font-family:Montserrat,sans-serif;font-weight:800;font-size:11.5pt;color:#0B1E4A;margin-top:1mm}
.pv-kpi .v.am{color:#0B1E4A;background:linear-gradient(transparent 62%,#FFC629 62%);display:inline-block}
.pv-kpi.hl{background:#0B1E4A;border-color:#0B1E4A}
.pv-kpi.hl .k{color:#A9B8D8}
.pv-kpi.hl .v{color:#FFC629}
.pv-kpi.hl .n{color:#C9D4EA}
.pv-kpi .n{font-size:6.8pt;color:#5A6680;margin-top:.8mm}
.pv-card{background:#F3F5FA;border:1px solid #DDE3EF;border-radius:3mm;padding:4mm 5mm}
.pv-card h3{font-family:Montserrat,sans-serif;font-weight:800;font-size:9.5pt;color:#0B1E4A;margin-bottom:1.5mm}
.pv-card.amarelo{background:#FFF7DF;border-color:#F2DFA0}
.pv-card.amarelo h3{color:#8a6d00}

/* ===== Página apresentação ===== */
.pv-resumo{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}
.pv-fluxo{display:flex;align-items:stretch;gap:2mm;flex-wrap:wrap}
.pv-fluxo .etapa{flex:1;min-width:30mm;background:#F3F5FA;border:1px solid #DDE3EF;border-radius:2.5mm;padding:2.5mm;text-align:center;font-size:7.4pt;color:#5A6680;line-height:1.35}
.pv-fluxo .etapa b{display:block;color:#0B1E4A;font-size:8pt}
.pv-fluxo .seta{align-self:center;color:#FFC629;font-weight:900}

/* ===== Página sistema ===== */
.pv-formula{background:#0B1E4A;color:#fff;border-radius:3mm;padding:3.5mm 5mm;display:flex;align-items:center;justify-content:space-between;gap:3mm}
.pv-formula .f{font-family:Montserrat,sans-serif;font-weight:700;font-size:9pt;color:#FFC629}
.pv-formula .r{font-family:Montserrat,sans-serif;font-weight:900;font-size:11pt}
.pv-barra-cobertura{height:8mm;border-radius:999px;background:#E8EDF6;overflow:hidden;display:flex}
.pv-barra-cobertura .fill{background:linear-gradient(90deg,#FFC629,#E8A400);display:flex;align-items:center;justify-content:flex-end;padding-right:2mm;font-size:7pt;font-weight:800;color:#0B1E4A;min-width:12mm}
.pv-tabela{width:100%;border-collapse:collapse;font-size:7.8pt}
.pv-tabela th{font-family:Montserrat,sans-serif;font-weight:700;text-transform:uppercase;font-size:6.6pt;letter-spacing:.8px;color:#fff;background:#0B1E4A;padding:2mm 2.5mm;text-align:left}
.pv-tabela th:last-child,.pv-tabela td:last-child{text-align:left;width:34%}
.pv-tabela td{padding:2mm 2.5mm;border-bottom:1px solid #DDE3EF;vertical-align:top;color:#1A2440}
.pv-tabela td.qtd{font-weight:800;color:#0B1E4A;white-space:nowrap}
.pv-tabela tr:nth-child(even) td{background:#F8FAFD}

/* ===== Investimento ===== */
.pv-invest{display:flex;gap:5mm;align-items:stretch}
.pv-invest .lbl{font-size:7pt;text-transform:uppercase;letter-spacing:1.2px;color:#5A6680;font-weight:700}
.pv-invest h3{font-family:Montserrat,sans-serif;font-weight:900;font-size:24pt;color:#0B1E4A;line-height:1.1;margin:1mm 0}
.pv-invest p{font-size:8pt;color:#5A6680;line-height:1.5}
.pv-preco{background:#0B1E4A;border-radius:3mm;padding:4mm 5mm;color:#fff;min-width:62mm;display:flex;flex-direction:column;justify-content:center;text-align:right}
.pv-preco .cheio{font-size:8.5pt;color:#A9B8D8;text-decoration:line-through;margin-right:2mm}
.pv-preco .off{background:#FFC629;color:#0B1E4A;font-weight:800;font-size:7.5pt;border-radius:999px;padding:.8mm 2.5mm}
.pv-preco .final{font-family:Montserrat,sans-serif;font-weight:900;font-size:16pt;color:#FFC629;margin:1mm 0}
.pv-preco .economiza{font-size:7.4pt;color:#C9D4EA}
.pv-barras .linha{display:grid;grid-template-columns:46mm 1fr 12mm;align-items:center;gap:2.5mm;margin:1.8mm 0;font-size:7.8pt}
.pv-barras .faixa{background:#E8EDF6;border-radius:999px;height:5.5mm;overflow:hidden}
.pv-barras .fill{height:100%;border-radius:999px;display:block}
.pv-barras .pct{font-weight:800;color:#0B1E4A;text-align:right}
.pv-barras .pct.solar{color:#8a6d00}
.pv-nota{font-size:6.8pt;color:#8A94AC}
.pv-grid2{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.pv-caixa-am{background:#FFF7DF;border:1px solid #F2DFA0;border-radius:3mm;padding:4mm 5mm}
.pv-caixa-am h4{font-family:Montserrat,sans-serif;font-weight:800;font-size:8.8pt;color:#8a6d00;margin-bottom:1.5mm}
.pv-caixa-am p{font-size:7.6pt;color:#6b5a1e;line-height:1.5}

/* ===== Como vai ser ===== */
.pv-etapas{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}
.pv-etapa{border:1px solid #DDE3EF;border-radius:3mm;padding:3mm;position:relative;background:#fff}
.pv-etapa .n{position:absolute;top:-3mm;left:3mm;width:6mm;height:6mm;border-radius:50%;background:#FFC629;color:#0B1E4A;font-family:Montserrat,sans-serif;font-weight:900;font-size:8pt;display:flex;align-items:center;justify-content:center}
.pv-etapa .badge{display:inline-block;font-size:6pt;font-weight:800;letter-spacing:.6px;text-transform:uppercase;border-radius:999px;padding:.6mm 2mm;margin-bottom:1.5mm}
.pv-etapa .badge.voce{background:#FFC629;color:#0B1E4A}
.pv-etapa .badge.ecosolar{background:#0B1E4A;color:#fff}
.pv-etapa .badge.concess{background:#E8EDF6;color:#0B1E4A}
.pv-etapa b.t{display:block;font-family:Montserrat,sans-serif;font-weight:800;font-size:8pt;color:#0B1E4A;margin-bottom:.8mm}
.pv-etapa p{font-size:6.9pt;color:#5A6680;line-height:1.45}

/* ===== Página final ===== */
.pv-depo{display:flex;gap:3mm;background:#F3F5FA;border-left:1.5mm solid #FFC629;border-radius:2.5mm;padding:3.5mm 4mm}
.pv-depo .aspas{font-family:Montserrat,sans-serif;font-weight:900;font-size:22pt;color:#FFC629;line-height:.9}
.pv-depo .txt{font-size:8.4pt;font-style:italic;color:#1A2440;line-height:1.5}
.pv-depo .autor{font-size:7.4pt;font-weight:700;color:#5A6680;margin-top:1mm}
.pv-faq{display:grid;grid-template-columns:1fr 1fr;gap:2.5mm 4mm}
.pv-faq .q{font-weight:800;font-size:7.8pt;color:#0B1E4A}
.pv-faq .q::before{content:'• ';color:#E8A400}
.pv-faq .a{font-size:7.2pt;color:#5A6680;line-height:1.45;margin-top:.4mm}
.pv-aceite{border:1.5px solid #0B1E4A;border-radius:3mm;padding:4mm 5mm;background:linear-gradient(180deg,#F8FAFD,#fff)}
.pv-aceite .mono{display:block;font-size:8pt;font-weight:700;color:#0B1E4A;word-break:break-all;background:#F3F5FA;border-radius:2mm;padding:2mm 2.5mm;margin-top:2mm}
.pv-aceite .qrbox{display:flex;gap:4mm;align-items:center;margin-top:2.5mm}
.pv-aceite .qrbox img,.pv-aceite .qrbox canvas,.pv-aceite .qrbox svg{width:26mm;height:26mm}
.pv-aceite .qrtexto{font-size:7.6pt;color:#5A6680;line-height:1.5}
.pv-aceite-tela{margin-top:2.5mm}
.pv-assina{display:flex;gap:8mm;margin-top:3mm}
.pv-assina .campo{flex:1;border-top:1px solid #0B1E4A;padding-top:1.5mm;text-align:center}
.pv-assina .campo b{display:block;font-size:8.4pt;color:#0B1E4A}
.pv-assina .campo span{font-size:6.8pt;color:#5A6680}

/* ===== Página apresentação (trilha + de dia/à noite) ===== */
.pv-corpo{font-size:9pt;line-height:1.6;color:#1A2440}
.pv-trilha{display:grid;grid-template-columns:repeat(5,1fr);gap:2.5mm}
.pv-trilha .etapa{background:#F3F5FA;border:1px solid #DDE3EF;border-radius:2.5mm;padding:2.5mm;text-align:center}
.pv-trilha .etapa-ic{font-size:13pt;line-height:1.2}
.pv-trilha .etapa-t{font-family:Montserrat,sans-serif;font-weight:800;font-size:8pt;color:#0B1E4A;margin-top:.8mm}
.pv-trilha .etapa-x{font-size:6.9pt;color:#5A6680;margin-top:.5mm;line-height:1.35}
.pv-dia-noite{display:grid;grid-template-columns:1fr 1fr;gap:3mm}
.pv-dia-noite .col{background:#F3F5FA;border:1px solid #DDE3EF;border-radius:2.5mm;padding:3mm 3.5mm}
.pv-dia-noite .col-t{font-family:Montserrat,sans-serif;font-weight:800;font-size:8.5pt}
.pv-dia-noite .col-x{font-size:7.4pt;color:#5A6680;line-height:1.5;margin-top:1mm}

/* ===== Investimento (hero navy, barras de comparação, 2 colunas) ===== */
.pv-hero-preco{background:#0B1E4A;border-radius:3mm;padding:5mm 6mm;color:#fff}
.pv-hero-preco .tag{font-size:7pt;text-transform:uppercase;letter-spacing:1.2px;color:#A9B8D8;font-weight:800}
.pv-hero-preco .linha-valor{display:flex;align-items:baseline;gap:3mm;flex-wrap:wrap;margin-top:1.5mm}
.pv-hero-preco .riscado{font-size:9pt;color:#A9B8D8;text-decoration:line-through}
.pv-hero-preco .valor{font-family:Montserrat,sans-serif;font-weight:900;font-size:22pt;color:#FFC629}
.pv-hero-preco .badge-desc{background:#FFC629;color:#0B1E4A;font-weight:800;font-size:7.5pt;border-radius:999px;padding:.8mm 2.5mm}
.pv-hero-preco .parcelas{font-size:8pt;color:#C9D4EA;margin-top:1mm}
.pv-hero-preco .incluso{font-size:7.2pt;color:#A9B8D8;margin-top:2mm;line-height:1.5}
.pv-comp{background:#F3F5FA;border:1px solid #DDE3EF;border-radius:3mm;padding:4mm 5mm}
.pv-comp .linha{display:grid;grid-template-columns:52mm 1fr;align-items:center;gap:3mm;margin:1.8mm 0;font-size:7.8pt;color:#5A6680}
.pv-comp .rotulo b{color:#0B1E4A}
.pv-comp-out{background:#E8EDF6;border-radius:999px;height:5.5mm;overflow:hidden;display:block}
.pv-comp-in{height:100%;border-radius:999px;background:#1d4290;display:block}
.pv-comp-in.am{background:linear-gradient(90deg,#FFC629,#E8A400)}
.pv-2col{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.pv-2col .col{background:#F3F5FA;border:1px solid #DDE3EF;border-radius:3mm;padding:4mm 5mm}
.pv-2col .col.destaque{background:#FFF7DF;border-color:#F2DFA0}
.pv-2col .col-t{font-family:Montserrat,sans-serif;font-weight:800;font-size:8.8pt;color:#8a6d00;margin-bottom:1.5mm}
.pv-2col .col ul{margin:0;padding-left:4mm;display:grid;gap:1.2mm}
.pv-2col .col li{font-size:7.4pt;color:#5A6680;line-height:1.45}

/* ===== Como vai ser (etapas com chips, formas de pagamento) ===== */
.pv-etapas{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}
.pv-etapas .etapa{border:1px solid #DDE3EF;border-radius:3mm;padding:3mm;background:#fff}
.pv-etapas .chip{display:inline-block;font-size:6pt;font-weight:800;letter-spacing:.6px;text-transform:uppercase;border-radius:999px;padding:.6mm 2mm;margin-bottom:1.5mm}
.pv-etapas .chip.voce{background:#FFC629;color:#0B1E4A}
.pv-etapas .chip.eco{background:#0B1E4A;color:#fff}
.pv-etapas .chip.conc{background:#E8EDF6;color:#0B1E4A}
.pv-etapas .etapa-t{font-family:Montserrat,sans-serif;font-weight:800;font-size:8pt;color:#0B1E4A;margin-bottom:.8mm}
.pv-etapas .etapa-x{font-size:6.9pt;color:#5A6680;line-height:1.45}
.pv-pagamentos{background:#F3F5FA;border:1px solid #DDE3EF;border-radius:3mm;padding:3.5mm 5mm}
.pv-pagamentos .pt-t{font-family:Montserrat,sans-serif;font-weight:800;font-size:9pt;color:#1d4290;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:2mm}
.pv-pagamentos .linha{display:flex;gap:3mm;font-size:7.8pt;color:#5A6680;line-height:1.5;margin-top:1mm}
.pv-pagamentos .linha b{color:#0B1E4A;white-space:nowrap}

/* ===== Sistema (barra de cobertura, tabela wrap, perdas, 3 KPIs) ===== */
.pv-barra-out{height:8mm;border-radius:999px;background:#E8EDF6;overflow:hidden}
.pv-barra-in{height:100%;border-radius:999px;background:linear-gradient(90deg,#FFC629,#E8A400)}
.pv-tabela-wrap{overflow:hidden;border:1px solid #DDE3EF;border-radius:2.5mm}
.pv-tabela-wrap .pv-tabela{margin:0}
.pv-tabela-wrap td.para{color:#5A6680}
.pv-tabela-wrap td.incluso{font-weight:700;color:#0E7A54}
.pv-perdas{background:#F3F5FA;border-left:1.5mm solid #FFC629;border-radius:2.5mm;padding:3mm 4mm;font-size:7.6pt;color:#5A6680;line-height:1.5}
.pv-perdas b{color:#0B1E4A}
.pv-kpis3{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}

/* ===== Página final (depoimentos navy, QR local) ===== */
.pv-depo.navy{background:#0B1E4A;border-left-color:#FFC629}
.pv-depo.navy .txt{color:#fff}
.pv-depo.navy .autor{color:#C9D4EA}
.pv-depo.navy .aspas{color:#FFC629}
.pv-qr-aceite{width:26mm;height:26mm;flex:none}
.pv-qr-aceite svg{width:100%;height:100%;display:block}

/* ===== Alerta interno (nunca imprime) ===== */
.pv-alerta-interno{background:#FFF1F1;border:1.5px dashed #E05252;border-radius:3mm;padding:3mm 4mm;font-size:7.8pt;color:#B23A3A;font-weight:600}

@media print{
  @page{size:A4 portrait;margin:0}
  body{background:#fff !important}
  .no-print,.pv-alerta-interno,.pv-somente-tela{display:none !important}
  .prop-v2{padding:0 !important;background:#fff !important}
  .pv-page{box-shadow:none !important;margin:0 !important;border-radius:0 !important;width:210mm !important;height:297mm !important;break-inside:avoid;page-break-inside:avoid;break-after:page}
  .pv-page:last-child{break-after:auto;page-break-after:auto}
}
`

/** CSS extra injetado só na tela de impressão/PDF (esconde a UI do CRM). */
export const IMPRESSAO_CSS_EXTRA = `
@media print{.no-print,.pv-alerta-interno,.pv-somente-tela{display:none !important}}
@media print{@page{size:A4 portrait;margin:0}body{background:#fff !important}.prop-v2{padding:0 !important;background:#fff !important}.pv-page{box-shadow:none !important;margin:0 !important;border-radius:0 !important;width:210mm !important;height:297mm !important;break-inside:avoid;page-break-inside:avoid;break-after:page}.pv-page:last-child{break-after:auto;page-break-after:auto}}
`
