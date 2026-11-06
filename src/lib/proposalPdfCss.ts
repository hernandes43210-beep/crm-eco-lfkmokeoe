/**
 * Estilos do modelo da Proposta Comercial (6 páginas A4).
 * Todos os seletores começam em `.pp-doc`, para que o modelo funcione tanto na página pública
 * (dentro do app) quanto no documento standalone de impressão/PDF.
 */
export const PROPOSTA_DOC_CSS = `
.pp-doc, .pp-doc * { box-sizing: border-box; margin: 0; padding: 0; }
.pp-doc {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  color: #14213d; font-size: 11px; line-height: 1.45;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
  overflow-x: hidden; max-width: 100%;
}
.pp-doc h1, .pp-doc h2, .pp-doc h3, .pp-doc h4, .pp-doc .pp-title {
  font-family: Montserrat, Inter, Arial, sans-serif; font-weight: 800; color: #0b1f4d; line-height: 1.15;
}
.pp-doc img { max-width: 100%; display: block; }
.pp-doc .pp-page {
  width: 210mm; max-width: 100%; height: 297mm; margin: 24px auto; background: #ffffff;
  display: flex; flex-direction: column; overflow: hidden; position: relative;
  box-shadow: 0 8px 28px rgba(11, 31, 77, 0.18); border-radius: 6px;
}
.pp-doc .pp-page-cover {
  background: linear-gradient(160deg, #0b1f4d 0%, #13306b 55%, #1d4290 100%); color: #ffffff;
}
.pp-doc .pp-head {
  background: #0b1f4d; color: #fff; padding: 9mm 12mm 6mm; display: flex;
  justify-content: space-between; align-items: center; gap: 10px;
  border-bottom: 2.5px solid #ffd23f;
}
.pp-doc .pp-logo { font-family: Montserrat, Arial, sans-serif; font-weight: 900; font-size: 15px; letter-spacing: .5px; white-space: nowrap; }
.pp-doc .pp-logo .y { color: #ffd23f; }
.pp-doc .pp-meta { text-align: right; font-size: 9.5px; line-height: 1.4; color: #e6ecf8; }
.pp-doc .pp-meta b { color: #ffd23f; font-weight: 800; }
.pp-doc .pp-body { flex: 1; padding: 7mm 12mm 4mm; display: flex; flex-direction: column; gap: 9px; min-height: 0; }
.pp-doc .pp-foot {
  padding: 3mm 12mm; display: flex; justify-content: space-between; font-size: 8.5px; color: #5b6782;
  border-top: 1px solid #dfe5f0;
}
.pp-doc .pp-kicker { font-size: 9.5px; font-weight: 800; letter-spacing: 1.4px; color: #1d4290; text-transform: uppercase; }
.pp-doc .pp-h1 { font-size: 22px; }
.pp-doc .pp-h1 .y, .pp-doc .y { color: #f5b800; }
.pp-doc .pp-lead { font-size: 11px; color: #5b6782; }
.pp-doc .pp-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.pp-doc .pp-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.pp-doc .pp-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.pp-doc .pp-card { background: #f3f6fb; border: 1px solid #dfe5f0; border-radius: 8px; padding: 8px 10px; }
.pp-doc .pp-card .lbl { font-size: 8.5px; font-weight: 800; letter-spacing: .8px; text-transform: uppercase; color: #5b6782; }
.pp-doc .pp-card .val { font-family: Montserrat, Arial, sans-serif; font-weight: 900; font-size: 15px; color: #0b1f4d; margin-top: 2px; }
.pp-doc .pp-card .sub { font-size: 9px; color: #5b6782; margin-top: 2px; }
.pp-doc .pp-card.navy { background: #0b1f4d; border-color: #0b1f4d; color: #fff; }
.pp-doc .pp-card.navy .lbl { color: #cbd5ea; }
.pp-doc .pp-card.navy .val { color: #ffd23f; }
.pp-doc .pp-card.navy .sub { color: #cbd5ea; }
.pp-doc .pp-card.green { background: #eaf7f1; border-color: #bfe6d4; }
.pp-doc .pp-card.green .val { color: #11845b; }
.pp-doc .pp-card.yellow { background: #fff8db; border-color: #ffd23f; }
.pp-doc .pp-box-note { background: #eef4ff; border: 1px solid #c9d8f2; border-radius: 8px; padding: 8px 10px; font-size: 10px; color: #14213d; }
.pp-doc .pp-box-warn { background: #fff8db; border: 1px dashed #f5b800; border-radius: 8px; padding: 8px 10px; font-size: 10px; }
.pp-doc .pp-tag { display: inline-block; font-size: 8px; font-weight: 800; letter-spacing: .6px; text-transform: uppercase; border-radius: 4px; padding: 2px 6px; }
.pp-doc .pp-tag.g { background: #11845b; color: #fff; }
.pp-doc .pp-tag.y { background: #ffd23f; color: #0b1f4d; }
.pp-doc .pp-tag.n { background: #dfe5f0; color: #5b6782; }
.pp-doc table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
.pp-doc th { text-align: left; background: #0b1f4d; color: #fff; padding: 5px 6px; font-size: 8.5px; letter-spacing: .5px; text-transform: uppercase; }
.pp-doc td { padding: 5px 6px; border-bottom: 1px solid #dfe5f0; vertical-align: top; }
.pp-doc .pp-bar { height: 12px; background: #e3e9f4; border-radius: 6px; overflow: hidden; }
.pp-doc .pp-bar > div { height: 100%; border-radius: 6px; }
.pp-doc .pp-step { border: 1px solid #dfe5f0; border-radius: 8px; padding: 7px 8px; background: #fff; }
.pp-doc .pp-num { width: 24px; height: 24px; border-radius: 50%; background: #0b1f4d; color: #ffd23f; font-weight: 900; font-family: Montserrat, Arial, sans-serif; display: flex; align-items: center; justify-content: center; font-size: 11px; }
.pp-doc .pp-who { display: inline-block; font-size: 7.5px; font-weight: 800; letter-spacing: .5px; border-radius: 4px; padding: 1px 5px; margin-top: 4px; }
.pp-doc .pp-photo { position: relative; border-radius: 8px; overflow: hidden; background: #dfe5f0; }
.pp-doc .pp-photo img { width: 100%; height: 100%; object-fit: cover; }
.pp-doc .pp-photo .cap { position: absolute; left: 6px; bottom: 6px; background: rgba(11, 31, 77, 0.85); color: #fff; font-size: 8px; padding: 2px 6px; border-radius: 4px; }
.pp-doc .pp-faq b { color: #0b1f4d; font-size: 10px; }
.pp-doc .pp-faq p { font-size: 9.5px; color: #33415c; }
.pp-doc .pp-sign { display: flex; justify-content: space-between; gap: 24px; margin-top: auto; }
.pp-doc .pp-sign > div { flex: 1; text-align: center; border-top: 1px solid #14213d; padding-top: 4px; font-size: 10px; }
.pp-doc .pp-sign strong { display: block; color: #0b1f4d; }
.pp-doc .pp-sign span { color: #5b6782; font-size: 9px; }
.pp-doc .pp-mono { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 9px; word-break: break-all; color: #0b1f4d; }

/* Celular: blocos empilhados, sem rolagem horizontal */
@media screen and (max-width: 720px) {
  .pp-doc .pp-page { width: 100%; height: auto; margin: 12px 0; border-radius: 0; box-shadow: none; }
  .pp-doc .pp-body { padding: 16px 14px; }
  .pp-doc .pp-head, .pp-doc .pp-foot { padding-left: 14px; padding-right: 14px; flex-wrap: wrap; }
  .pp-doc .pp-h1 { font-size: 19px; }
  .pp-doc .pp-grid-4, .pp-doc .pp-grid-3 { grid-template-columns: repeat(2, 1fr); }
  .pp-doc .pp-grid-2 { grid-template-columns: 1fr; }
  .pp-doc .pp-sign { flex-direction: column; }
  .pp-doc .pp-photo { min-height: 120px; }
  .pp-doc .pp-table-wrap { overflow-x: hidden; }
  .pp-doc table, .pp-doc thead, .pp-doc tbody, .pp-doc tr, .pp-doc td, .pp-doc th { display: block; width: 100%; }
  .pp-doc thead { display: none; }
  .pp-doc td { border-bottom: none; padding: 3px 6px; }
  .pp-doc tr { border-bottom: 1px solid #dfe5f0; padding: 6px 0; }
  .pp-doc .pp-arrows { flex-direction: column; }
  .pp-doc .pp-arrows .pp-arrow { transform: rotate(90deg); }
}

/* Impressão / PDF: 6 folhas A4, margens zero, cada seção em página própria */
@media print {
  .pp-doc { overflow: visible; }
  .pp-doc .pp-page {
    margin: 0; box-shadow: none; border-radius: 0; height: 297mm; width: 210mm;
    break-after: page; page-break-after: always;
  }
  .pp-doc .pp-page:last-child { break-after: auto; page-break-after: auto; }
}
`
