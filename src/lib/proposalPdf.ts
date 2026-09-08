import { formatBRL, formatDateBR } from './solarUtils'
import { calculateInvestmentComparison } from '../utils/investmentComparison'
import logoEcosolar from '@/assets/editedimage1773228973392-e62fd.png'

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
}

export function generateProposalPrintHTML(data: ProposalPDFData): string {
  const cleanPhone = (data.cliente.telefone || '').replace(/\D/g, '')
  const validadeFormatted = data.data_validade ? formatDateBR(data.data_validade) : '15 dias'
  const emissaoFormatted = data.created
    ? formatDateBR(data.created)
    : formatDateBR(new Date().toISOString())
  const potencia = data.kit_potencia_kw ? `${data.kit_potencia_kw} kWp` : 'Potência personalizada'

  // Estimativas solares calculadas
  const consumoKwh = data.cliente.consumo_mensal_kwh || 400
  const geracaoEstimadaKwh = Math.round((data.kit_potencia_kw || consumoKwh / 120) * 125)
  const economiaMensal = consumoKwh * 0.92 * 0.85
  const economiaAnual = economiaMensal * 12
  const economia25Anos = economiaAnual * 25

  // Simulação comparativa em 30 anos (Solar vs Poupança vs CDB)
  const sim = calculateInvestmentComparison(data.preco_venda || 0, economiaMensal, 30)
  const marcos = [5, 10, 15, 20, 25, 30]

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Proposta Comercial Ecosolar Energy - ${data.cliente.nome}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 16mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      color: #0f172a;
      background: #ffffff;
      font-size: 12px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0B7A5B;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .logo-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-img {
      height: 48px;
      width: auto;
      object-fit: contain;
    }
    .brand-title {
      font-size: 19px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0f172a;
      line-height: 1.1;
    }
    .brand-title span {
      color: #f59e0b;
    }
    .brand-sub {
      font-size: 9.5px;
      color: #0B7A5B;
      font-weight: 700;
      letter-spacing: 0.3px;
      margin-top: 2px;
    }
    .header-meta {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }
    .header-meta strong {
      color: #0f172a;
    }
    .badge-status {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      background: ${data.status === 'Aceita' ? '#dcfce7' : '#e0f2fe'};
      color: ${data.status === 'Aceita' ? '#15803d' : '#0369a1'};
      border: 1px solid ${data.status === 'Aceita' ? '#86efac' : '#bae6fd'};
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 16px;
    }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      background: #f8fafc;
    }
    .card-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #0B7A5B;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .card-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 11px;
    }
    .card-row .label {
      color: #64748b;
    }
    .card-row .value {
      font-weight: 600;
      color: #1e293b;
      text-align: right;
    }
    .hero-solar {
      background: linear-gradient(135deg, #0B7A5B 0%, #064e3b 100%);
      color: #ffffff;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .hero-info h2 {
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .hero-info p {
      font-size: 12px;
      opacity: 0.9;
    }
    .hero-price {
      text-align: right;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 8px 14px;
    }
    .hero-price .label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.85;
    }
    .hero-price .amount {
      font-size: 24px;
      font-weight: 900;
      color: #fef08a;
      letter-spacing: -0.5px;
    }
    .table-section {
      margin-bottom: 16px;
    }
    .table-section h3 {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #334155;
      margin-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      text-align: left;
      padding: 8px 10px;
      font-weight: 700;
      border-bottom: 1px solid #cbd5e1;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .kpi-card {
      border: 1px solid #bbf7d0;
      background: #f0fdf4;
      border-radius: 6px;
      padding: 10px;
      text-align: center;
    }
    .kpi-card .kpi-label {
      font-size: 10px;
      font-weight: 600;
      color: #166534;
      text-transform: uppercase;
    }
    .kpi-card .kpi-val {
      font-size: 16px;
      font-weight: 800;
      color: #15803d;
      margin-top: 2px;
    }
    .box-notes {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      background: #ffffff;
      margin-bottom: 16px;
    }
    .box-notes h4 {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 4px;
    }
    .box-notes p {
      font-size: 11px;
      color: #334155;
      white-space: pre-line;
    }
    .comp-section {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 14px;
      background: #ffffff;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .comp-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }
    .comp-header h3 {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .comp-kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }
    .comp-kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px;
      background: #f8fafc;
    }
    .comp-kpi-card.winner {
      border: 2px solid #0B7A5B;
      background: #f0fdf4;
    }
    .comp-kpi-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
    }
    .comp-kpi-card.winner .comp-kpi-title {
      color: #166534;
    }
    .comp-kpi-val {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      margin-top: 2px;
    }
    .comp-kpi-card.winner .comp-kpi-val {
      color: #0B7A5B;
    }
    .comp-kpi-sub {
      font-size: 9px;
      color: #64748b;
      margin-top: 1px;
    }
    .comp-kpi-card.winner .comp-kpi-sub {
      color: #15803d;
      font-weight: 600;
    }
    .comp-highlight {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 10px;
      color: #065f46;
      margin-bottom: 10px;
      line-height: 1.4;
    }
    .comp-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 8px;
    }
    .comp-table th {
      background: #f1f5f9;
      padding: 5px 6px;
      font-weight: 700;
      border-bottom: 1px solid #cbd5e1;
    }
    .comp-table td {
      padding: 5px 6px;
      border-bottom: 1px solid #e2e8f0;
    }
    .comp-table tr.highlight-30 td {
      background: #ecfdf5;
      font-weight: 800;
      color: #065f46;
    }
    .comp-notes {
      font-size: 8.5px;
      color: #64748b;
      line-height: 1.35;
      border-top: 1px dashed #e2e8f0;
      padding-top: 6px;
    }
    .acceptance-box {
      border: 2px dashed #0B7A5B;
      border-radius: 8px;
      padding: 12px 16px;
      background: #f0fdf4;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 14px;
    }
    .acceptance-box h4 {
      font-size: 12px;
      font-weight: 800;
      color: #064e3b;
    }
    .acceptance-box p {
      font-size: 10px;
      color: #166534;
      margin-top: 2px;
    }
    .acceptance-link {
      font-size: 10px;
      font-family: monospace;
      color: #0B7A5B;
      font-weight: 700;
      word-break: break-all;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 36px;
      padding-top: 10px;
    }
    .signature-line {
      border-top: 1px solid #94a3b8;
      text-align: center;
      padding-top: 6px;
      font-size: 11px;
      color: #475569;
    }
    .signature-line strong {
      color: #0f172a;
      display: block;
    }
    .footer {
      margin-top: 24px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #94a3b8;
    }
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="logo-box">
      <img src="${logoEcosolar}" alt="Ecosolar Energy" class="logo-img" />
      <div>
        <div class="brand-title">ECO<span>SOLAR</span> ENERGY</div>
        <div class="brand-sub">A energia do futuro, hoje! • Soluções em Engenharia Solar</div>
      </div>
    </div>
    <div class="header-meta">
      <div><strong>Proposta Comercial #${(data.id || 'NOVA').slice(-6).toUpperCase()}</strong></div>
      <div>Emissão: <strong>${emissaoFormatted}</strong></div>
      <div>Validade até: <strong>${validadeFormatted}</strong></div>
      <div><span class="badge-status">${data.status || 'Enviada'}</span></div>
    </div>
  </div>

  <!-- Hero Highlight -->
  <div class="hero-solar">
    <div class="hero-info">
      <h2>${data.kit_nome}</h2>
      <p>Sistema Fotovoltaico Conectado à Rede (On-Grid) • Potência: <strong>${potencia}</strong></p>
      ${data.kit_fabricante ? `<p style="font-size: 11px; opacity: 0.85; margin-top: 2px;">Fabricante / Módulos: ${data.kit_fabricante}</p>` : ''}
    </div>
    <div class="hero-price">
      <div class="label">Investimento Total</div>
      <div class="amount">${formatBRL(data.preco_venda)}</div>
    </div>
  </div>

  <!-- Grid 2: Cliente & Vendedor -->
  <div class="grid-2">
    <div class="card">
      <div class="card-title">Dados do Cliente</div>
      <div class="card-row">
        <span class="label">Nome:</span>
        <span class="value">${data.cliente.nome}</span>
      </div>
      <div class="card-row">
        <span class="label">E-mail:</span>
        <span class="value">${data.cliente.email || '-'}</span>
      </div>
      <div class="card-row">
        <span class="label">Telefone:</span>
        <span class="value">${data.cliente.telefone || '-'}</span>
      </div>
      <div class="card-row">
        <span class="label">Local de Instalação:</span>
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
      <div class="card-title">Consultor Solar Responsável</div>
      <div class="card-row">
        <span class="label">Especialista:</span>
        <span class="value">${data.vendedor?.name || 'Equipe Ecosolar Energy'}</span>
      </div>
      <div class="card-row">
        <span class="label">Contato:</span>
        <span class="value">${data.vendedor?.email || 'contato@ecosolarenergy.com.br'}</span>
      </div>
      <div class="card-row">
        <span class="label">Consumo Atual Informado:</span>
        <span class="value">${consumoKwh} kWh/mês</span>
      </div>
      <div class="card-row">
        <span class="label">Geração Média Estimada:</span>
        <span class="value">${geracaoEstimadaKwh} kWh/mês</span>
      </div>
    </div>
  </div>

  <!-- Estimativas de Economia -->
  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-label">Economia Mensal Est.</div>
      <div class="kpi-val">${formatBRL(economiaMensal)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Economia Anual Est.</div>
      <div class="kpi-val">${formatBRL(economiaAnual)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Economia em 25 Anos</div>
      <div class="kpi-val">${formatBRL(economia25Anos)}</div>
    </div>
  </div>

  <!-- Comparativo Financeiro em 30 Anos: Solar vs Poupança vs CDB -->
  <div class="comp-section">
    <div class="comp-header">
      <h3>Comparativo de Investimento em 30 Anos (Solar vs Poupança vs CDB)</h3>
      <span style="font-size: 9px; font-weight: 700; color: #0B7A5B; background: #dcfce7; padding: 2px 6px; border-radius: 4px;">
        Horizonte de 30 anos
      </span>
    </div>

    <!-- Cards de Acúmulo -->
    <div class="comp-kpis">
      <div class="comp-kpi-card">
        <div class="comp-kpi-title">🪙 Poupança (6,17% a.a.)</div>
        <div class="comp-kpi-val">${formatBRL(sim.finalPoupanca)}</div>
        <div class="comp-kpi-sub">Rendimento: ${formatBRL(sim.finalPoupanca - sim.valorInvestido)}</div>
      </div>

      <div class="comp-kpi-card">
        <div class="comp-kpi-title">🏦 CDB (100% CDI Líq.)</div>
        <div class="comp-kpi-val">${formatBRL(sim.finalCdb)}</div>
        <div class="comp-kpi-sub">Líquido de IR (15% no resgate)</div>
      </div>

      <div class="comp-kpi-card winner">
        <div class="comp-kpi-title">☀ Energia Solar (Vencedor)</div>
        <div class="comp-kpi-val">${formatBRL(sim.finalSolar)}</div>
        <div class="comp-kpi-sub">+${sim.ganhoSolarVsCdbPercent}% superior ao CDB (+${formatBRL(sim.ganhoSolarVsCdbValor)})</div>
      </div>
    </div>

    <div class="comp-highlight">
      <strong>Veredito Financeiro:</strong> Investir em Energia Solar gera <strong>+${sim.ganhoSolarVsPoupancaPercent}% a mais que a poupança</strong> (${formatBRL(sim.ganhoSolarVsPoupancaValor)} de ganho excedente) e <strong>+${sim.ganhoSolarVsCdbPercent}% a mais que o CDB</strong> (${formatBRL(sim.ganhoSolarVsCdbValor)} de vantagem), além de proteger contra a inflação energética.
    </div>

    <!-- Tabela Resumida de 5 em 5 anos -->
    <table class="comp-table">
      <thead>
        <tr>
          <th>Marco Temporal</th>
          <th style="text-align: right;">Poupança (6,17% a.a.)</th>
          <th style="text-align: right;">CDB 100% CDI Líquido</th>
          <th style="text-align: right; background: #dcfce7; color: #065f46;">☀ Energia Solar</th>
          <th style="text-align: right; background: #dcfce7; color: #065f46;">Vantagem Solar vs CDB</th>
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
              <td style="text-align: right; font-weight: 700; color: #0B7A5B;">${formatBRL(row.solar)}</td>
              <td style="text-align: right; font-weight: 700; color: ${diffCdb >= 0 ? '#0B7A5B' : '#64748b'};">
                ${diffCdb >= 0 ? '+' : ''}${formatBRL(diffCdb)}
              </td>
            </tr>`
          })
          .join('')}
      </tbody>
    </table>

    <div class="comp-notes">
      <strong>Premissas Transparentes:</strong> Poupança: 6,17% a.a. isento. CDB: 10,50% a.a. bruto com alíquota regressiva de IR (15% acima de 2 anos). Solar: valor investido é o preço do kit com reinvestimento da economia na poupança (6,17% a.a.) e dedução de degradação padrão de 0,5% a.a. dos módulos.
    </div>
  </div>

  <!-- Escopo & Especificações -->
  <div class="table-section">
    <h3>Detalhamento do Sistema e Serviços Inclusos</h3>
    <table>
      <thead>
        <tr>
          <th>Item / Descrição</th>
          <th>Especificação</th>
          <th style="text-align: right;">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Gerador Fotovoltaico</strong><br><span style="color:#64748b; font-size:10px;">Módulos fotovoltaicos Tier 1 e inversor de alta performance</span></td>
          <td>${data.kit_nome} (${potencia})</td>
          <td style="text-align: right; font-weight: 600; color:#0B7A5B;">Incluso</td>
        </tr>
        <tr>
          <td><strong>Projeto de Engenharia & Homologação</strong><br><span style="color:#64748b; font-size:10px;">ART de engenharia e trâmite completo junto à concessionária</span></td>
          <td>Engenheiro eletricista responsável</td>
          <td style="text-align: right; font-weight: 600; color:#0B7A5B;">Incluso</td>
        </tr>
        <tr>
          <td><strong>Instalação Padrão & Estrutura de Fixação</strong><br><span style="color:#64748b; font-size:10px;">Cabos solares, proteções CC/CA (String Box) e fixadores em alumínio</span></td>
          <td>Equipe técnica qualificada NR10/NR35</td>
          <td style="text-align: right; font-weight: 600; color:#0B7A5B;">Incluso</td>
        </tr>
        <tr>
          <td><strong>Monitoramento em Tempo Real</strong><br><span style="color:#64748b; font-size:10px;">Aplicativo no celular para acompanhamento da produção 24/7</span></td>
          <td>Módulo Wi-Fi incluso</td>
          <td style="text-align: right; font-weight: 600; color:#0B7A5B;">Incluso</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Condições & Observações -->
  ${
    data.condicoes_pagamento
      ? `
  <div class="box-notes">
    <h4>Condições de Pagamento</h4>
    <p>${data.condicoes_pagamento}</p>
  </div>`
      : ''
  }

  ${
    data.observacoes
      ? `
  <div class="box-notes">
    <h4>Observações Importantes</h4>
    <p>${data.observacoes}</p>
  </div>`
      : ''
  }

  <!-- Link de Aceite Online -->
  <div class="acceptance-box">
    <div>
      <h4>${data.status === 'Aceita' ? '✓ Proposta Formalmente Aceita' : 'Aceite Online Disponível'}</h4>
      <p>
        ${
          data.status === 'Aceita'
            ? `Aceita por <strong>${data.aceito_por_nome || data.cliente.nome}</strong> em ${formatDateBR(data.data_aceite || data.created || new Date().toISOString())}.`
            : 'O cliente pode aceitar esta proposta online com um clique através do link exclusivo abaixo.'
        }
      </p>
      ${
        data.token_publico
          ? `
      <div class="acceptance-link" style="margin-top: 4px;">
        Link público: ${window.location.origin}/proposta/${data.token_publico}
      </div>`
          : ''
      }
    </div>
    <div style="text-align: right;">
      <span style="font-size: 11px; font-weight: 700; color: #0B7A5B;">Validade: ${validadeFormatted}</span>
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
    <div>Ecosolar Energy — A energia do futuro, hoje! • Sistema de Gestão e Engenharia Solar</div>
    <div>Documento gerado eletronicamente em ${formatDateBR(new Date().toISOString())}</div>
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

  // Executa impressão / Salvar como PDF após carregamento dos estilos
  printWindow.focus()
  setTimeout(() => {
    try {
      printWindow.print()
    } catch {
      /* intentionally ignored */
    }
  }, 400)
}
