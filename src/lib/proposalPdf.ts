import { formatBRL, formatDateBR } from './solarUtils'

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

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Proposta Comercial Solar - ${data.cliente.nome}</title>
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
      gap: 8px;
    }
    .logo-icon {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #0B7A5B 0%, #10b981 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fbbf24;
      font-size: 22px;
      font-weight: bold;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .brand-title span {
      color: #f59e0b;
    }
    .brand-sub {
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
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
      <div class="logo-icon">☀</div>
      <div>
        <div class="brand-title">Solar<span>CRM</span></div>
        <div class="brand-sub">Energia Solar Fotovoltaica • Engenharia & Soluções</div>
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
        <span class="value">${data.vendedor?.name || 'Equipe de Engenharia Solar'}</span>
      </div>
      <div class="card-row">
        <span class="label">Contato:</span>
        <span class="value">${data.vendedor?.email || 'contato@solarcrm.com.br'}</span>
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
      <strong>${data.vendedor?.name || 'SolarCRM Soluções em Energia'}</strong>
      <span>Consultor Técnico Autorizado</span>
    </div>
    <div class="signature-line">
      <strong>${data.aceito_por_nome || data.cliente.nome}</strong>
      <span>Cliente Contratante</span>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>SolarCRM — Sistema Especializado de Gestão de Vendas e Engenharia Solar</div>
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
