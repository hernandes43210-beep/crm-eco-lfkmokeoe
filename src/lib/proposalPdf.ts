import {
  formatBRL,
  formatDateBR,
  calcularGeracaoMensalKwh,
  calcularEconomiaMensal,
  IRRADIACAO_MEDIA_DIARIA_HORAS,
  FATOR_PERDAS_SISTEMA,
} from './solarUtils'
import { calculateInvestmentComparison } from '../utils/investmentComparison'
import { parseKitDetailedItems } from './kitItemsParser'
import officialLogoPng from '@/assets/a-613c6.png'
import { INSTITUTIONAL_INSTALLATION_PHOTOS } from '@/data/socialProofPhotos'

export interface ProposalPDFData {
  id?: string
  token_publico?: string
  status?: string
  kit_nome: string
  kit_potencia_kw?: number
  kit_fabricante?: string
  custo?: number
  margem?: number
  preco_venda: number
  desconto_percentual?: number
  valor_desconto?: number
  valor_bruto?: number
  validade_dias?: number
  data_validade: string
  condicoes_pagamento?: string
  observacoes?: string
  data_aceite?: string
  aceito_por_nome?: string
  created?: string
  cliente: {
    nome: string
    email?: string
    telefone?: string
    cidade?: string
    estado?: string
    endereco?: string
    consumo_mensal_kwh?: number
  }
  vendedor?: {
    name?: string
    email?: string
  }
  kit_descricao?: string
  kit_string_box?: string
  kit_marca_painel?: string
  kit_marca_inversor?: string
  kit_potencia_painel_w?: number
  kit_potencia_inversor_kw?: number
  kit_tipo_estrutura?: string
  kit?: {
    descricao?: string
    string_box?: string
    marca_painel?: string
    marca_inversor?: string
    potencia_painel_w?: number
    potencia_inversor_kw?: number
    tipo_estrutura?: string
  }
  lead?: {
    consumo_mensal_kwh?: number
  }
  fotos_obra?: Array<{
    id: string
    url?: string
    foto?: string
    legenda?: string
  }>
}

export function generateProposalPrintHTML(data: ProposalPDFData): string {
  const validadeFormatted = data.data_validade ? formatDateBR(data.data_validade) : '15 dias'
  const emissaoFormatted = data.created
    ? formatDateBR(data.created)
    : formatDateBR(new Date().toISOString())

  // Decompor o kit com os itens reais cadastrados no sistema
  const specs = parseKitDetailedItems({
    kitNome: data.kit_nome,
    kitPotenciaKw: data.kit_potencia_kw,
    kitFabricante: data.kit_fabricante,
    descricao: data.kit_descricao || data.kit?.descricao,
    observacoes: data.observacoes,
    consumoKwh: data.lead?.consumo_mensal_kwh || data.cliente?.consumo_mensal_kwh,
    stringBox: data.kit_string_box || data.kit?.string_box,
    marcaPainel: data.kit_marca_painel || data.kit?.marca_painel,
    marcaInversor: data.kit_marca_inversor || data.kit?.marca_inversor,
    potenciaPainelW: data.kit_potencia_painel_w || data.kit?.potencia_painel_w,
    potenciaInversorKw: data.kit_potencia_inversor_kw || data.kit?.potencia_inversor_kw,
    tipoEstrutura: data.kit_tipo_estrutura || data.kit?.tipo_estrutura,
  })
  // Estimativas solares calculadas
  const consumoKwh = data.cliente.consumo_mensal_kwh || 400
  const geracaoEstimadaKwh =
    specs.geracaoMensalEstimadaKwh ||
    (data.kit_potencia_kw ? calcularGeracaoMensalKwh(data.kit_potencia_kw) : Math.round(consumoKwh))
  const economiaMensal = calcularEconomiaMensal(consumoKwh)
  const economiaAnual = economiaMensal * 12
  const economia25Anos = economiaAnual * 25

  // Simulação comparativa em 30 anos (Solar vs Poupança vs CDB)
  const sim = calculateInvestmentComparison(data.preco_venda || 0, economiaMensal, 30)
  const marcos = [5, 10, 15, 20, 25, 30]

  // Proposta ID formatada
  const proposalCode = (data.id || 'ECO').slice(-6).toUpperCase()
  const localCliente =
    [data.cliente.cidade, data.cliente.estado].filter(Boolean).join(' - ') || 'Brasil'
  const consultorNome = data.vendedor?.name || 'Equipe Ecosolar Energy'
  const consultorEmail = data.vendedor?.email || 'contato@ecosolarenergy.com.br'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Proposta Comercial Nº ${proposalCode} — ${data.cliente.nome} | Ecosolar Energy</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    body {
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Capa de Página Inteira (Página 1 do PDF) */
    .cover-page {
      width: 100%;
      min-height: 277mm;
      box-sizing: border-box;
      background: linear-gradient(145deg, #060F1E 0%, #0A192F 35%, #0F284E 75%, #163868 100%);
      color: #ffffff;
      border-radius: 12px;
      padding: 36px 36px 28px 36px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
      border: 1px solid rgba(234, 179, 8, 0.35);
      box-shadow: 0 10px 30px rgba(10, 25, 47, 0.25);
    }

    /* Padrão geométrico de fundo evocando painéis solares / energia */
    .cover-bg-grid {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.14;
      background-size: 38px 38px;
      background-image:
        linear-gradient(to right, rgba(250, 204, 21, 0.4) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(250, 204, 21, 0.4) 1px, transparent 1px);
    }
    .cover-bg-accent-1 {
      position: absolute;
      top: -90px;
      right: -90px;
      width: 320px;
      height: 320px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(234, 179, 8, 0.22) 0%, rgba(234, 179, 8, 0) 70%);
      pointer-events: none;
    }
    .cover-bg-accent-2 {
      position: absolute;
      bottom: 80px;
      left: -60px;
      width: 260px;
      height: 260px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, rgba(59, 130, 246, 0) 70%);
      pointer-events: none;
    }
    .cover-bg-solar-cells {
      position: absolute;
      right: 28px;
      top: 140px;
      width: 180px;
      height: 180px;
      opacity: 0.18;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 5px;
      transform: rotate(12deg);
      pointer-events: none;
    }
    .cover-solar-cell {
      border: 1.5px solid #FACC15;
      border-radius: 3px;
      background: rgba(250, 204, 21, 0.05);
    }

    .cover-header {
      position: relative;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      padding-bottom: 20px;
    }
    .cover-brand-wrap {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .cover-logo-img {
      height: 68px;
      width: auto;
      object-fit: contain;
      background: #ffffff;
      border-radius: 10px;
      padding: 6px 10px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    }
    .cover-brand-title {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #ffffff;
      line-height: 1.1;
    }
    .cover-brand-title span {
      color: #FACC15;
    }
    .cover-brand-sub {
      font-size: 10px;
      color: #93C5FD;
      font-weight: 700;
      letter-spacing: 0.6px;
      margin-top: 3px;
      text-transform: uppercase;
    }
    .cover-badge-num {
      text-align: right;
    }
    .cover-badge-pill {
      display: inline-block;
      background: rgba(234, 179, 8, 0.18);
      border: 1.5px solid #EAB308;
      color: #FACC15;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .cover-body {
      position: relative;
      z-index: 2;
      margin: auto 0;
      padding: 30px 0;
    }
    .cover-pretitle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #FACC15;
      background: rgba(250, 204, 21, 0.12);
      padding: 4px 12px;
      border-radius: 4px;
      margin-bottom: 14px;
    }
    .cover-pretitle::before {
      content: "☀";
      font-size: 13px;
    }
    .cover-main-title {
      font-size: 34px;
      font-weight: 900;
      letter-spacing: -0.8px;
      line-height: 1.15;
      color: #ffffff;
      margin-bottom: 18px;
      max-width: 580px;
    }
    .cover-main-title .highlight-yellow {
      color: #FACC15;
      display: inline;
    }
    .cover-gold-bar {
      width: 72px;
      height: 4px;
      background: linear-gradient(90deg, #FACC15 0%, #EAB308 100%);
      border-radius: 2px;
      margin-bottom: 26px;
    }

    /* Caixa em destaque do cliente */
    .cover-client-card {
      background: rgba(255, 255, 255, 0.06);
      border: 1.5px solid rgba(250, 204, 21, 0.4);
      border-left: 6px solid #FACC15;
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 24px;
      backdrop-filter: blur(4px);
    }
    .cover-client-label {
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #93C5FD;
      font-weight: 800;
    }
    .cover-client-name {
      font-size: 22px;
      font-weight: 900;
      color: #ffffff;
      margin-top: 4px;
      letter-spacing: -0.3px;
    }
    .cover-client-location {
      font-size: 12px;
      color: #CBD5E1;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
    }

    /* Grid de Metadados da Capa */
    .cover-meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .cover-meta-item {
      background: rgba(10, 25, 47, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 10px 14px;
    }
    .cover-meta-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #94A3B8;
      font-weight: 700;
    }
    .cover-meta-val {
      font-size: 12.5px;
      font-weight: 800;
      color: #ffffff;
      margin-top: 3px;
    }
    .cover-meta-val.accent {
      color: #FACC15;
    }

    /* Rodapé da Capa */
    .cover-footer {
      position: relative;
      z-index: 2;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #CBD5E1;
    }
    .cover-footer-left strong {
      color: #ffffff;
      font-size: 10.5px;
      display: block;
      margin-bottom: 2px;
    }
    .cover-footer-contacts {
      text-align: right;
      line-height: 1.5;
    }
    .cover-footer-contacts span {
      margin-left: 10px;
    }

    /* 1. Header Institucional Azul-Marinho (a partir da página 2) */
    .header {
      background: linear-gradient(135deg, #0A192F 0%, #0F284E 50%, #163868 100%);
      color: #ffffff;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 12px;
      border-bottom: 3px solid #EAB308;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(10, 25, 47, 0.12);
      page-break-inside: avoid;
    }
    .brand-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo-img {
      height: 52px;
      width: auto;
      object-fit: contain;
      background: #ffffff;
      border-radius: 8px;
      padding: 4px;
    }
    .brand-title {
      font-size: 19px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #ffffff;
      line-height: 1.1;
    }
    .brand-title span {
      color: #FACC15;
    }
    .brand-sub {
      font-size: 9px;
      color: #93C5FD;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-top: 2px;
      text-transform: uppercase;
    }
    .header-meta {
      text-align: right;
      font-size: 10.5px;
      color: #CBD5E1;
      line-height: 1.4;
    }
    .header-meta strong {
      color: #ffffff;
    }
    .badge-status {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      background: ${data.status === 'Aceita' ? '#22C55E' : '#EAB308'};
      color: ${data.status === 'Aceita' ? '#ffffff' : '#0A192F'};
    }

    /* 2. Sumário Executivo Comercial */
    .hero-summary {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-left: 5px solid #0A192F;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .hero-left h2 {
      font-size: 16px;
      font-weight: 900;
      color: #0A192F;
      letter-spacing: -0.3px;
    }
    .hero-left p {
      font-size: 11px;
      color: #334155;
      margin-top: 3px;
    }
    .hero-badges {
      display: flex;
      gap: 8px;
      margin-top: 6px;
      font-size: 9.5px;
      font-weight: 700;
    }
    .hero-badge-item {
      background: #0A192F;
      color: #FACC15;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .hero-price-box {
      text-align: right;
      background: linear-gradient(135deg, #0A192F 0%, #163868 100%);
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 8px;
      border: 1px solid #EAB308;
      min-width: 190px;
      flex-shrink: 0;
    }
    .hero-price-box .price-label {
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #93C5FD;
      font-weight: 700;
    }
    .hero-price-box .price-amount {
      font-size: 23px;
      font-weight: 900;
      color: #FACC15;
      letter-spacing: -0.5px;
      margin: 2px 0;
    }
    .hero-price-box .price-sub {
      font-size: 9px;
      color: #E2E8F0;
    }

    /* Grid 2 Colunas */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .card {
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 10px 12px;
      background: #FFFFFF;
    }
    .card-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0A192F;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-title span.accent {
      color: #EAB308;
    }
    .card-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3.5px;
      font-size: 10.5px;
    }
    .card-row .label {
      color: #64748B;
    }
    .card-row .value {
      font-weight: 700;
      color: #0F172A;
      text-align: right;
    }

    /* KPIs de Retorno Comercial */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .kpi-card {
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 8px 10px;
      background: #F8FAFC;
      text-align: center;
    }
    .kpi-card.highlight {
      border: 1.5px solid #0A192F;
      background: #EFF6FF;
    }
    .kpi-label {
      font-size: 9px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .kpi-card.highlight .kpi-label {
      color: #1E3A8A;
    }
    .kpi-val {
      font-size: 15px;
      font-weight: 900;
      color: #0A192F;
      margin-top: 2px;
    }
    .kpi-card.highlight .kpi-val {
      color: #0F284E;
    }
    .kpi-sub {
      font-size: 8.5px;
      color: #64748B;
      margin-top: 2px;
    }

    /* 3. Seção Técnica Organizada: Tabela Item a Item */
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0A192F;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 12px;
      background: #EAB308;
      border-radius: 2px;
    }
    .table-container {
      margin-bottom: 12px;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th {
      background: #0A192F;
      color: #ffffff;
      text-align: left;
      padding: 6px 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-size: 9px;
    }
    th.text-center {
      text-align: center;
    }
    th.text-right {
      text-align: right;
    }
    td {
      padding: 5.5px 8px;
      border-bottom: 1px solid #E2E8F0;
      color: #1E293B;
    }
    tr:nth-child(even) td {
      background: #F8FAFC;
    }
    .td-qty {
      text-align: center;
      font-weight: 800;
      color: #0A192F;
      font-size: 11px;
    }
    .td-status {
      text-align: right;
      font-weight: 800;
      color: #15803D;
    }

    /* Faixa de resumo técnico (Potência, Geração e Área) */
    .tech-summary-bar {
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-around;
      align-items: center;
      font-size: 10.5px;
    }
    .tech-item {
      text-align: center;
    }
    .tech-item .label {
      font-size: 8.5px;
      color: #64748B;
      font-weight: 700;
      text-transform: uppercase;
    }
    .tech-item .val {
      font-size: 13px;
      font-weight: 900;
      color: #0A192F;
    }

    /* 4. Apresentação Financeira e Relatório de 30 Anos */
    .comp-section {
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 10px 12px;
      background: #FFFFFF;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .comp-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 4px;
    }
    .comp-header h3 {
      font-size: 11px;
      font-weight: 900;
      color: #0A192F;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .comp-kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-bottom: 8px;
    }
    .comp-kpi-card {
      border: 1px solid #E2E8F0;
      border-radius: 4px;
      padding: 6px 8px;
      background: #F8FAFC;
    }
    .comp-kpi-card.winner {
      border: 1.5px solid #0A192F;
      background: #EFF6FF;
    }
    .comp-kpi-title {
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748B;
    }
    .comp-kpi-card.winner .comp-kpi-title {
      color: #1E3A8A;
    }
    .comp-kpi-val {
      font-size: 13px;
      font-weight: 900;
      color: #0F172A;
    }
    .comp-kpi-card.winner .comp-kpi-val {
      color: #0A192F;
    }
    .comp-kpi-sub {
      font-size: 8px;
      color: #64748B;
    }
    .comp-kpi-card.winner .comp-kpi-sub {
      color: #15803D;
      font-weight: 700;
    }
    .comp-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      margin-bottom: 6px;
    }
    .comp-table th {
      background: #F1F5F9;
      color: #334155;
      padding: 4px 6px;
      font-weight: 700;
      border-bottom: 1px solid #CBD5E1;
      font-size: 8.5px;
    }
    .comp-table td {
      padding: 4px 6px;
      border-bottom: 1px solid #E2E8F0;
    }
    .comp-table tr.highlight-30 td {
      background: #EFF6FF;
      font-weight: 800;
      color: #1E3A8A;
    }
    .comp-notes {
      font-size: 8px;
      color: #64748B;
      line-height: 1.3;
      border-top: 1px dashed #E2E8F0;
      padding-top: 4px;
    }

    /* 5. Prova Social — Galeria de Obras Reais */
    .social-proof {
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 10px 12px;
      background: #F8FAFC;
      margin-bottom: 12px;
      page-break-inside: avoid;
      box-shadow: 0 1px 3px rgba(10, 25, 47, 0.05);
    }
    .social-proof-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 4px;
    }
    .social-proof-badge {
      background: #0A192F;
      color: #FACC15;
      font-size: 8px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .photos-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 7px;
      margin-top: 6px;
    }
    .photo-card {
      border-radius: 5px;
      overflow: hidden;
      border: 1px solid #CBD5E1;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      page-break-inside: avoid;
    }
    .photo-thumb {
      aspect-ratio: 16/10;
      width: 100%;
      overflow: hidden;
      background: #0A192F;
      position: relative;
    }
    .photo-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .photo-tag {
      position: absolute;
      top: 3px;
      left: 3px;
      background: rgba(10, 25, 47, 0.9);
      color: #FACC15;
      font-size: 7px;
      font-weight: 800;
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid rgba(250, 204, 21, 0.4);
      text-transform: uppercase;
    }
    .photo-caption {
      padding: 5px 6px;
      background: #ffffff;
      border-top: 1px solid #F1F5F9;
    }
    .photo-caption strong {
      display: block;
      font-size: 8.5px;
      color: #0A192F;
      font-weight: 800;
      line-height: 1.15;
    }
    .photo-caption span {
      display: block;
      font-size: 7px;
      color: #64748B;
      margin-top: 1px;
      line-height: 1.15;
    }

    /* 6. Fechamento & Aceite */
    .acceptance-box {
      border: 2px dashed #0A192F;
      border-radius: 6px;
      padding: 10px 14px;
      background: #F0F9FF;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .acceptance-box h4 {
      font-size: 11px;
      font-weight: 900;
      color: #0A192F;
    }
    .acceptance-box p {
      font-size: 9.5px;
      color: #1E3A8A;
      margin-top: 1px;
    }
    .acceptance-link {
      font-size: 9px;
      font-family: monospace;
      color: #0A192F;
      font-weight: 700;
      word-break: break-all;
    }

    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 36px;
      margin-top: 24px;
      padding-top: 6px;
      page-break-inside: avoid;
    }
    .signature-line {
      border-top: 1px solid #94A3B8;
      text-align: center;
      padding-top: 4px;
      font-size: 10px;
      color: #475569;
    }
    .signature-line strong {
      color: #0A192F;
      display: block;
    }

    /* Footer */
    .footer {
      margin-top: 16px;
      border-top: 1px solid #E2E8F0;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      color: #94A3B8;
    }
  </style>
</head>
<body>
  <!-- ========================================== -->
  <!-- FOLHA 1: CAPA DE PÁGINA INTEIRA EXECUTIVA -->
  <!-- ========================================== -->
  <div class="cover-page">
    <div class="cover-bg-grid"></div>
    <div class="cover-bg-accent-1"></div>
    <div class="cover-bg-accent-2"></div>
    <div class="cover-bg-solar-cells">
      <div class="cover-solar-cell"></div>
      <div class="cover-solar-cell"></div>
      <div class="cover-solar-cell"></div>
      <div class="cover-solar-cell"></div>
      <div class="cover-solar-cell"></div>
      <div class="cover-solar-cell"></div>
      <div class="cover-solar-cell"></div>
      <div class="cover-solar-cell"></div>
      <div class="cover-solar-cell"></div>
    </div>

    <!-- Header da Capa -->
    <div class="cover-header">
      <div class="cover-brand-wrap">
        <img src="${officialLogoPng}" alt="Ecosolar Energy" class="cover-logo-img" />
        <div>
          <div class="cover-brand-title">ECO<span>SOLAR</span> ENERGY</div>
          <div class="cover-brand-sub">A energia do futuro, hoje! • Engenharia Fotovoltaica</div>
        </div>
      </div>
      <div class="cover-badge-num">
        <span class="cover-badge-pill">Proposta Nº ${proposalCode}</span>
      </div>
    </div>

    <!-- Corpo Central da Capa -->
    <div class="cover-body">
      <div class="cover-pretitle">Solução Personalizada em Geração Distribuída</div>
      <h1 class="cover-main-title">
        Proposta Comercial de <span class="highlight-yellow">Energia Solar</span>
      </h1>
      <div class="cover-gold-bar"></div>

      <!-- Destaque do Cliente -->
      <div class="cover-client-card">
        <div class="cover-client-label">Proposta Preparada Especialmente Para</div>
        <div class="cover-client-name">${data.cliente.nome}</div>
        <div class="cover-client-location">
          <span>📍 Localidade:</span>
          <strong>${localCliente}</strong>
          ${data.cliente.consumo_mensal_kwh ? `<span>• Consumo Médio: <strong>${data.cliente.consumo_mensal_kwh} kWh/mês</strong></span>` : ''}
        </div>
      </div>

      <!-- Metadados da Capa em 3 Colunas -->
      <div class="cover-meta-grid">
        <div class="cover-meta-item">
          <div class="cover-meta-label">Consultor Responsável</div>
          <div class="cover-meta-val">${consultorNome}</div>
        </div>
        <div class="cover-meta-item">
          <div class="cover-meta-label">Data de Emissão</div>
          <div class="cover-meta-val">${emissaoFormatted}</div>
        </div>
        <div class="cover-meta-item">
          <div class="cover-meta-label">Data de Validade (15 dias)</div>
          <div class="cover-meta-val accent">${validadeFormatted}</div>
        </div>
      </div>
    </div>

    <!-- Rodapé da Capa -->
    <div class="cover-footer">
      <div class="cover-footer-left">
        <strong>ECOSOLAR ENERGY SOLUÇÕES EM ENERGIA SOLAR</strong>
        <span>Projetos de Engenharia • Homologação Chave na Mão • Instalação Homologada</span>
      </div>
      <div class="cover-footer-contacts">
        <div>E-mail: <strong>${consultorEmail}</strong></div>
        <div>WhatsApp / Suporte: <strong>${data.cliente.telefone ? '(Atendimento Especializado)' : 'contato@ecosolarenergy.com.br'}</strong></div>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- FOLHA 2 EM DIANTE: CONTEÚDO TÉCNICO & FINANCEIRO -->
  <!-- ========================================== -->

  <!-- 1. Header Institucional Azul-Marinho -->
  <div class="header">
    <div class="brand-box">
      <img src="${officialLogoPng}" alt="Ecosolar Energy" class="brand-logo-img" />
      <div>
        <div class="brand-title">ECO<span>SOLAR</span> ENERGY</div>
        <div class="brand-sub">A energia do futuro, hoje! • Soluções em Engenharia Solar</div>
      </div>
    </div>
    <div class="header-meta">
      <div><strong>PROPOSTA COMERCIAL Nº ${proposalCode}</strong></div>
      <div>Emissão: <strong>${emissaoFormatted}</strong></div>
      <div>Validade até: <strong>${validadeFormatted}</strong></div>
      <div><span class="badge-status">${data.status === 'Aceita' ? '✓ Proposta Aceita' : 'Aguardando Aceite'}</span></div>
    </div>
  </div>

  <!-- 2. Apresentação Técnica do Projeto (Kit Solar Antes do Preço) -->
  <div class="hero-summary">
    <div class="hero-left" style="max-width: 100%;">
      <h2>${data.kit_nome}</h2>
      <p>Sistema Fotovoltaico de Alta Performance Chave na Mão dimensionado sob medida para suprir <strong>${consumoKwh} kWh/mês</strong> do cliente <strong>${data.cliente.nome}</strong> com geração e engenharia homologada.</p>
      <div class="hero-badges">
        <span class="hero-badge-item">Potência Total: ${specs.potenciaTotalFormatada}</span>
        <span class="hero-badge-item">Módulos: ${specs.quantidadeModulosTotal ? `${specs.quantidadeModulosTotal} painéis` : '-'}</span>
        <span class="hero-badge-item">Fabricantes: ${specs.fabricantesPrincipais}</span>
        <span class="hero-badge-item">Geração Média: ~${geracaoEstimadaKwh} kWh/mês</span>
      </div>
    </div>
  </div>

  <!-- Dados do Cliente e do Consultor -->
  <div class="grid-2">
    <div class="card">
      <div class="card-title">
        <span>Dados do Cliente Contratante</span>
        <span class="accent">👤</span>
      </div>
      <div class="card-row">
        <span class="label">Nome Completo:</span>
        <span class="value">${data.cliente.nome}</span>
      </div>
      <div class="card-row">
        <span class="label">E-mail:</span>
        <span class="value">${data.cliente.email || '-'}</span>
      </div>
      <div class="card-row">
        <span class="label">Telefone / WhatsApp:</span>
        <span class="value">${data.cliente.telefone || '-'}</span>
      </div>
      <div class="card-row">
        <span class="label">Local da Instalação:</span>
        <span class="value">${[data.cliente.cidade, data.cliente.estado].filter(Boolean).join(' - ') || 'Brasil'}</span>
      </div>
      ${
        data.cliente.endereco
          ? `
      <div class="card-row">
        <span class="label">Endereço:</span>
        <span class="value">${data.cliente.endereco}</span>
      </div>`
          : ''
      }
    </div>

    <div class="card">
      <div class="card-title">
        <span>Consultor Solar & Responsabilidade Técnica</span>
        <span class="accent">⚡</span>
      </div>
      <div class="card-row">
        <span class="label">Consultor Responsável:</span>
        <span class="value">${data.vendedor?.name || 'Equipe Ecosolar Energy'}</span>
      </div>
      <div class="card-row">
        <span class="label">Contato Comercial:</span>
        <span class="value">${data.vendedor?.email || 'contato@ecosolarenergy.com.br'}</span>
      </div>
      <div class="card-row">
        <span class="label">Consumo Atual Informado:</span>
        <span class="value">${consumoKwh} kWh/mês</span>
      </div>
      <div class="card-row">
        <span class="label">Geração Prevista:</span>
        <span class="value">${geracaoEstimadaKwh} kWh/mês</span>
      </div>
      <div class="card-row">
        <span class="label">Área Estimada Telhado:</span>
        <span class="value">${specs.areaEstimadaM2 ? `~${specs.areaEstimadaM2} m²` : 'Sob Demanda'}</span>
      </div>
      <div class="card-row" style="border-top: 1px dashed #E2E8F0; padding-top: 5px; margin-top: 2px;">
        <span class="label" style="font-size: 8.5px; color: #64748B;">Base do Cálculo:</span>
        <span class="value" style="font-size: 8.5px; color: #475569; font-weight: normal;">Irradiação: ${IRRADIACAO_MEDIA_DIARIA_HORAS.toString().replace('.', ',')} h/dia | Perdas: ${Math.round((1 - FATOR_PERDAS_SISTEMA) * 100)}% (fator ${FATOR_PERDAS_SISTEMA.toFixed(2).replace('.', ',')})</span>
      </div>
    </div>
  </div>

  <!-- 3. Seção Técnica Organizada: Tabela Item a Item com Quantidades Reais (KIT PRIMEIRO) -->
  <div class="section-title">1. Composição do Kit Solar — Detalhamento Item a Item com Quantidades e Potências</div>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th style="width: 50px;" class="text-center">Qtd.</th>
          <th>Componente / Equipamento</th>
          <th>Fabricante / Modelo</th>
          <th style="width: 100px; text-align: center;">Potência</th>
          <th>Especificações Técnicas</th>
          <th style="width: 65px;" class="text-right">Status</th>
        </tr>
      </thead>
      <tbody>
        ${specs.itens
          .map(
            (it) => `
        <tr>
          <td class="td-qty">${it.quantidade}${it.unidade !== 'un' ? ` ${it.unidade}` : 'x'}</td>
          <td><strong>${it.nome}</strong></td>
          <td>${it.fabricanteModelo}</td>
          <td style="text-align: center; font-weight: 800; color: #0A192F;">
            ${it.potenciaUnit ? `<span style="background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 4px; padding: 2px 6px; font-size: 9.5px; font-family: monospace;">${it.potenciaUnit}</span>` : '<span style="color: #94A3B8;">-</span>'}
          </td>
          <td style="color: #64748B;">${it.especificacao || '-'}</td>
          <td class="td-status">Incluso</td>
        </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <!-- 4. Dimensionamento & Geração de Energia -->
  <div class="section-title">2. Dimensionamento Técnico & Estimativa de Geração</div>
  <div class="tech-summary-bar">
    <div class="tech-item">
      <div class="label">Potência Total do Gerador</div>
      <div class="val">${specs.potenciaTotalFormatada}</div>
    </div>
    <div class="tech-item">
      <div class="label">Módulos Instalados</div>
      <div class="val">${specs.quantidadeModulosTotal ? `${specs.quantidadeModulosTotal} painéis` : '-'}</div>
    </div>
    <div class="tech-item">
      <div class="label">Geração Média Mensal</div>
      <div class="val">~${geracaoEstimadaKwh} kWh/mês</div>
      <div style="font-size: 7.5px; color: #64748B; margin-top: 2px;">Irradiação ${IRRADIACAO_MEDIA_DIARIA_HORAS.toString().replace('.', ',')} h/dia • Perdas ${Math.round((1 - FATOR_PERDAS_SISTEMA) * 100)}%</div>
    </div>
    <div class="tech-item">
      <div class="label">Área Telhado Estimada</div>
      <div class="val">${specs.areaEstimadaM2 ? `~${specs.areaEstimadaM2} m²` : '-'}</div>
    </div>
  </div>

  <!-- 5. Investimento & Retorno Financeiro (DEPOIS DO KIT E DIMENSIONAMENTO) -->
  <div class="section-title">3. Valor do Investimento & Economia Projetada</div>
  <div style="background: linear-gradient(135deg, #0A192F 0%, #163868 100%); color: #ffffff; border-radius: 8px; padding: 12px 18px; margin-bottom: 12px; border: 1.5px solid #EAB308; display: flex; justify-content: space-between; align-items: center; page-break-inside: avoid;">
    <div>
      <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #93C5FD; display: block;">Investimento Total Chave na Mão (tudo incluso: equipamentos, projeto, homologação e instalação)</span>
      <h3 style="font-size: 14px; font-weight: 800; color: #ffffff; margin-top: 2px;">Solução Completa: Equipamentos + Homologação de Engenharia com ART + Instalação NR10/NR35</h3>
    </div>
    <div style="text-align: right; min-width: 180px;">
      <span style="font-size: 9px; text-transform: uppercase; color: #E2E8F0; display: block; font-weight: 700;">Valor Total</span>
      ${
        data.desconto_percentual && data.desconto_percentual > 0
          ? `
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-top: 2px;">
          <span style="text-decoration: line-through; font-size: 13px; color: #CBD5E1; font-family: monospace;">
            ${formatBRL(data.valor_bruto || data.preco_venda)}
          </span>
          <span style="background: #10B981; color: #ffffff; font-size: 8.5px; font-weight: 900; padding: 1px 5px; border-radius: 3px; text-transform: uppercase;">
            -${data.desconto_percentual}% OFF
          </span>
        </div>
        <span style="font-size: 26px; font-weight: 900; color: #FACC15; font-family: monospace; letter-spacing: -0.5px; display: block; margin-top: 2px;">
          ${formatBRL(data.preco_venda)}
        </span>
        <span style="font-size: 8.5px; color: #86EFAC; display: block;">
          Desconto de ${formatBRL(data.valor_desconto || Math.max(0, (data.valor_bruto || data.preco_venda) - data.preco_venda))}
        </span>
      `
          : `
        <span style="font-size: 26px; font-weight: 900; color: #FACC15; font-family: monospace; letter-spacing: -0.5px;">${formatBRL(data.preco_venda)}</span>
      `
      }
    </div>
  </div>

  <!-- KPIs de Retorno Financeiro -->
  <div class="kpi-row">
    <div class="kpi-card highlight">
      <div class="kpi-label">Economia Mensal Est.</div>
      <div class="kpi-val">${formatBRL(economiaMensal)}</div>
      <div class="kpi-sub">Alívio imediato na fatura</div>
    </div>
    <div class="kpi-card highlight">
      <div class="kpi-label">Economia Anual Est.</div>
      <div class="kpi-val">${formatBRL(economiaAnual)}</div>
      <div class="kpi-sub">Capital livre reinvestível</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Payback Estimado</div>
      <div class="kpi-val">~${sim.paybackEstimadoAnos || 3} anos</div>
      <div class="kpi-sub">Retorno do investimento</div>
    </div>
    <div class="kpi-card highlight">
      <div class="kpi-label">Retorno em 30 Anos</div>
      <div class="kpi-val">${formatBRL(sim.finalSolar)}</div>
      <div class="kpi-sub">+${sim.ganhoSolarVsCdbPercent}% superior ao CDB</div>
    </div>
  </div>

  <!-- 4. Apresentação Financeira e Comparativo em 30 Anos -->
  <div class="comp-section">
    <div class="comp-header">
      <h3>Comparativo Financeiro em 30 Anos (Solar vs Poupança vs CDB Líquido)</h3>
      <span style="font-size: 8.5px; font-weight: 800; color: #1E3A8A; background: #DBEAFE; padding: 2px 6px; border-radius: 4px;">
        Relatório de Rentabilidade Financeira
      </span>
    </div>

    <div class="comp-kpis">
      <div class="comp-kpi-card">
        <div class="comp-kpi-title">🪙 Poupança Tradicional (6,17% a.a.)</div>
        <div class="comp-kpi-val">${formatBRL(sim.finalPoupanca)}</div>
        <div class="comp-kpi-sub">Rendimento acumulado: ${formatBRL(sim.finalPoupanca - sim.valorInvestido)}</div>
      </div>
      <div class="comp-kpi-card">
        <div class="comp-kpi-title">🏦 CDB (100% CDI Líq. de IR 15%)</div>
        <div class="comp-kpi-val">${formatBRL(sim.finalCdb)}</div>
        <div class="comp-kpi-sub">Líquido de imposto regressivo</div>
      </div>
      <div class="comp-kpi-card winner">
        <div class="comp-kpi-title">☀ Energia Solar (Vencedor Absoluto)</div>
        <div class="comp-kpi-val">${formatBRL(sim.finalSolar)}</div>
        <div class="comp-kpi-sub">+${sim.ganhoSolarVsCdbPercent}% superior (+${formatBRL(sim.ganhoSolarVsCdbValor)})</div>
      </div>
    </div>

    <table class="comp-table">
      <thead>
        <tr>
          <th>Marco Temporal</th>
          <th style="text-align: right;">Poupança (6,17% a.a.)</th>
          <th style="text-align: right;">CDB 100% CDI Líquido</th>
          <th style="text-align: right; background: #DBEAFE; color: #1E3A8A;">☀ Energia Solar</th>
          <th style="text-align: right; background: #DBEAFE; color: #1E3A8A;">Vantagem Solar vs CDB</th>
        </tr>
      </thead>
      <tbody>
        ${marcos
          .map((ano) => {
            const row = sim.series[ano]
            if (!row) return ''
            const diffCdb = row.solar - row.cdb
            const isFinal = ano === 30
            return `<tr class="${isFinal ? 'highlight-30' : ''}">
              <td><strong>Ano ${ano}</strong></td>
              <td style="text-align: right;">${formatBRL(row.poupanca)}</td>
              <td style="text-align: right;">${formatBRL(row.cdb)}</td>
              <td style="text-align: right; font-weight: 800; color: #0A192F;">${formatBRL(row.solar)}</td>
              <td style="text-align: right; font-weight: 800; color: ${diffCdb >= 0 ? '#15803D' : '#64748B'};">
                ${diffCdb >= 0 ? '+' : ''}${formatBRL(diffCdb)}
              </td>
            </tr>`
          })
          .join('')}
      </tbody>
    </table>

    <div class="comp-notes">
      <strong>Veredito Comercial:</strong> Investir em Energia Solar gera <strong>+${sim.ganhoSolarVsPoupancaPercent}% a mais que a poupança</strong> e <strong>+${sim.ganhoSolarVsCdbPercent}% a mais que o CDB</strong>, blindando sua residência/empresa contra reajustes tarifários da concessionária e valorizando imediatamente o patrimônio imobiliário em cerca de 6% a 8%.
    </div>
  </div>

  <!-- 5. Prova Social — Fotos de Obras Concluídas -->
  ${(() => {
    // Mesclar fotos específicas da proposta com a prova social institucional padrão
    const fotosParaExibir: Array<{ url: string; legenda: string; tag: string; local?: string }> = []

    if (data.fotos_obra && data.fotos_obra.length > 0) {
      data.fotos_obra.forEach((ph, i) => {
        fotosParaExibir.push({
          url: ph.url || ph.foto || '',
          legenda: ph.legenda || `Instalação Concluída #${i + 1}`,
          tag: 'Obra Executada',
          local: 'Projeto Homologado Ecosolar',
        })
      })
    }

    // Completa com a prova social institucional da empresa até cobrir todas as obras cadastradas (6 fotos)
    INSTITUTIONAL_INSTALLATION_PHOTOS.forEach((inst) => {
      if (!fotosParaExibir.some((f) => f.legenda === inst.legenda) && fotosParaExibir.length < 6) {
        fotosParaExibir.push({
          url: inst.src,
          legenda: inst.legenda,
          tag: inst.tag,
          local: inst.local,
        })
      }
    })

    return `
  <div class="social-proof">
    <div class="social-proof-header">
      <div class="section-title" style="margin-bottom: 0;">Prova Social — Padrão de Engenharia em Obras Executadas</div>
      <span class="social-proof-badge">✓ Fotos Reais de Obras Homologadas (${fotosParaExibir.length} Obras)</span>
    </div>
    <p style="font-size: 8.5px; color: #475569; margin-top: 2px; margin-bottom: 6px;">
      Conheça o acabamento, a robustez das estruturas metálicas e a precisão do cabeamento técnico executados pelos engenheiros e instaladores da <strong>Ecosolar Energy</strong>:
    </p>
    <div class="photos-grid">
      ${fotosParaExibir
        .slice(0, 6)
        .map(
          (ph) => `
        <div class="photo-card">
          <div class="photo-thumb">
            <span class="photo-tag">${ph.tag}</span>
            <img src="${ph.url}" alt="${ph.legenda}" />
          </div>
          <div class="photo-caption">
            <strong>${ph.legenda}</strong>
            <span>${ph.local || 'Engenharia Ecosolar Energy'}</span>
          </div>
        </div>`,
        )
        .join('')}
    </div>
  </div>`
  })()}

  <!-- Condições de Pagamento e Observações -->
  ${
    data.condicoes_pagamento || data.observacoes
      ? `
  <div class="grid-2">
    ${
      data.condicoes_pagamento
        ? `
    <div class="card">
      <div class="card-title">Condições de Pagamento</div>
      <p style="font-size: 9.5px; color: #334155; line-height: 1.4; white-space: pre-line;">${data.condicoes_pagamento}</p>
    </div>`
        : ''
    }
    ${
      data.observacoes
        ? `
    <div class="card">
      <div class="card-title">Observações Técnicas & Contratuais</div>
      <p style="font-size: 9.5px; color: #334155; line-height: 1.4; white-space: pre-line;">${data.observacoes}</p>
    </div>`
        : ''
    }
  </div>`
      : ''
  }

  <!-- 6. Fechamento com CTA & Aceite Online -->
  <div class="acceptance-box">
    <div>
      <h4>${data.status === 'Aceita' ? '✓ Proposta Formalmente Aceita' : 'Aceite Online Disponível e Seguro'}</h4>
      <p>
        ${
          data.status === 'Aceita'
            ? `Aceita formalmente por <strong>${data.aceito_por_nome || data.cliente.nome}</strong> em ${formatDateBR(data.data_aceite || data.created || new Date().toISOString())}.`
            : 'Esta proposta pode ser aceita digitalmente através do link exclusivo abaixo, dispensando cartório.'
        }
      </p>
      ${
        data.token_publico
          ? `
      <div class="acceptance-link" style="margin-top: 3px;">
        Link público: ${window.location.origin}/proposta/${data.token_publico}
      </div>`
          : ''
      }
    </div>
    <div style="text-align: right;">
      <span style="font-size: 10px; font-weight: 800; color: #0A192F;">Validade: ${validadeFormatted}</span>
    </div>
  </div>

  <!-- Assinaturas -->
  <div class="signature-grid">
    <div class="signature-line">
      <strong>${data.vendedor?.name || 'Ecosolar Energy Soluções em Energia'}</strong>
      <span>Consultor Técnico Autorizado</span>
    </div>
    <div class="signature-line">
      <strong>${data.aceito_por_nome || data.cliente.nome}</strong>
      <span>Cliente Contratante</span>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>Ecosolar Energy — A energia do futuro, hoje! • Soluções em Engenharia Solar</div>
    <div>Documento gerado eletronicamente em ${formatDateBR(new Date().toISOString())} • Proposta Nº ${proposalCode}</div>
  </div>
</body>
</html>`
}

export function openProposalPDFPrint(data: ProposalPDFData): void {
  const html = generateProposalPrintHTML(data)
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Por favor, permita pop-ups no navegador para visualizar e baixar o PDF da proposta.')
    return
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  printWindow.focus()
  setTimeout(() => {
    try {
      printWindow.print()
    } catch {
      /* intentionally ignored */
    }
  }, 400)
}
