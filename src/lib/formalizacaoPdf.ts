import { formatBRL, formatDateBR } from './solarUtils'
import { parseKitDetailedItems } from './kitItemsParser'
import logoEcosolar from '@/assets/editedimage1773228973392-e62fd.png'

export interface DadosContratoFormalizacao {
  // Contratante (Lead)
  clienteNome: string
  clienteCpfCnpj: string
  clienteNacionalidade: string
  clienteEstadoCivil: string
  clienteProfissao: string
  clienteEndereco: string
  clienteCidade: string
  clienteEstado: string
  clienteCep: string
  clienteTelefone: string
  clienteEmail: string

  // Dados do Sistema & Equipamentos
  kitNome: string
  potenciaKwp: number | string
  kitFabricante: string
  kitDescricao: string
  kitStringBox?: string
  tabelaEquipamentos?: Array<{
    item: string
    quantidade: number | string
    especificacao: string
    fabricanteModelo: string
  }>

  // Valores e Pagamento
  valorTotal: number
  descontoAvista: number
  valorFinal: number
  condicoesPagamento: string
  parcelaEntrada: number
  parcelaFinal: number
  detalhesParcelamento: string

  // Data & Local
  cidadeAssinatura: string
  dataAssinatura: string // Extenso ou ISO
  prazoInstalacaoDias: number
  garantiaInstalacaoMeses: number
}

export interface DadosProcuracaoEnergisa {
  // Outorgante (Lead)
  clienteNome: string
  clienteNacionalidade: string
  clienteEstadoCivil: string
  clienteProfissao: string
  clienteRg: string
  clienteCpfCnpj: string
  clienteEndereco: string
  clienteBairro: string
  clienteCidade: string
  clienteEstado: string
  clienteCep: string

  // Concessionária
  concessionaria: string

  // Data & Local
  cidadeAssinatura: string
  dataAssinatura: string // formato por extenso
}

// QA touch: verificação de exportações e tipagem
// Dados fixos da Ecosolar
export const DADOS_FIXOS_ECOSOLAR = {
  razaoSocial: 'H DA SILVA COSTA LTDA',
  nomeFantasia: 'ECOSOLAR ENERGY',
  cnpj: '48.910.155/0001-50',
  ie: '00000005748432',
  endereco: 'Rua São Paulo, nº 1234, Centro',
  cidade: 'Seringueiras',
  estado: 'RO',
  cep: '76.934-000',
  telefone: '(69) 99275-3995',
  email: 'contato@ecosolarenergy.com.br',
  site: 'www.ecosolarenergy.com.br',
  foro: 'Comarca de São Miguel do Guaporé - RO',
  ceo: {
    nome: 'HERNANDES DA SILVA COSTA',
    cargo: 'Diretor / CEO',
    cpf: '031.***.***-**',
  },
  outorgados: [
    {
      nome: 'WILLIAN DA COSTA GOVEIA',
      profissao: 'Engenheiro Eletricista',
      crea: 'CREA 26000217D RO',
      nacionalidade: 'Brasileiro',
      estadoCivil: 'Solteiro',
      residencia: 'Seringueiras – RO',
    },
    {
      nome: 'HERNANDES DA SILVA COSTA',
      profissao: 'Empresário / Diretor Geral Ecosolar',
      nacionalidade: 'Brasileiro',
      estadoCivil: 'Casado',
      residencia: 'Seringueiras – RO',
    },
  ],
}

/**
 * Converte data para texto extenso em português com validação real de dias por mês.
 * Trata o erro do modelo original que continha "31 de junho" (mês de 30 dias).
 */
export function formatarDataExtenso(
  dataInput?: string | Date | null,
  cidade: string = 'Seringueiras - RO',
): string {
  let d: Date
  if (!dataInput) {
    d = new Date()
  } else if (typeof dataInput === 'string') {
    // Se for formato YYYY-MM-DD
    const parts = dataInput.split('T')[0].split('-')
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
    } else {
      d = new Date(dataInput)
    }
  } else {
    d = dataInput
  }

  if (isNaN(d.getTime())) {
    d = new Date()
  }

  const meses = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ]

  const dia = d.getDate()
  const mes = meses[d.getMonth()]
  const ano = d.getFullYear()

  return `${cidade}, ${dia} de ${mes} de ${ano}`
}

function renderMissingWarning(
  val?: string | number | null,
  placeholder: string = '[NÃO INFORMADO]',
): string {
  if (val === undefined || val === null || String(val).trim() === '') {
    return `<span class="field-missing" title="Campo ausente no cadastro do lead. Complete na edição antes de finalizar!">${placeholder}</span>`
  }
  return String(val)
}

/**
 * Gera o HTML para o Contrato de Compra, Venda e Instalação de Sistema Gerador Fotovoltaico
 */
export function generateContratoHTML(dados: DadosContratoFormalizacao): string {
  const equips =
    dados.tabelaEquipamentos && dados.tabelaEquipamentos.length > 0
      ? dados.tabelaEquipamentos
      : [
          {
            item: 'Módulos Fotovoltaicos Monocristalinos',
            quantidade: 'Conforme dimensionamento',
            especificacao: 'Garantia de fábrica de 25 anos de desempenho linear',
            fabricanteModelo: dados.kitFabricante || 'Tier 1 Internacional',
          },
          {
            item: 'Inversor Interativo On-Grid',
            quantidade: '1 un',
            especificacao: 'Inversor com monitoramento Wi-Fi incluso e proteção interna',
            fabricanteModelo: dados.kitFabricante || 'Inversor Homologado',
          },
          {
            item: 'Estrutura de Fixação em Alumínio',
            quantidade: '1 cj',
            especificacao: 'Suportes e perfis em alumínio de alta resistência mecânica',
            fabricanteModelo: 'Padrão Ecosolar Energy',
          },
          {
            item: 'Quadro de Proteção CC/CA & Cabeamento',
            quantidade: '1 cj',
            especificacao: 'Dispositivos de Proteção contra Surtos (DPS) e fusíveis solares',
            fabricanteModelo: dados.kitStringBox || 'Padrão NBR 5410',
          },
        ]

  const potDisplay = dados.potenciaKwp ? `${dados.potenciaKwp} kWp` : 'Conforme dimensionamento'
  const valorTotalFormatted = formatBRL(dados.valorTotal || 0)
  const descontoFormatted = dados.descontoAvista > 0 ? formatBRL(dados.descontoAvista) : 'R$ 0,00'
  const valorFinalFormatted = formatBRL(dados.valorFinal || dados.valorTotal || 0)
  const parcelaEntradaFormatted = formatBRL(
    dados.parcelaEntrada || (dados.valorFinal || dados.valorTotal || 0) * 0.5,
  )
  const parcelaFinalFormatted = formatBRL(
    dados.parcelaFinal || (dados.valorFinal || dados.valorTotal || 0) * 0.5,
  )

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Contrato de Prestação de Serviços Fotovoltaicos — ${dados.clienteNome || 'Cliente'} | Ecosolar Energy</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 20mm 15mm;
      @bottom-center {
        content: counter(page) " / " counter(pages);
      }
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
      font-size: 11pt;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-doc {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #EAB308;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .logo-img {
      height: 52px;
      max-width: 180px;
      object-fit: contain;
    }
    .header-info {
      text-align: right;
      font-size: 8.5pt;
      color: #475569;
      line-height: 1.35;
    }
    .header-info strong {
      color: #0F284E;
      font-size: 9.5pt;
    }
    .doc-title {
      font-size: 14pt;
      font-weight: 800;
      color: #0A192F;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 20px;
      padding: 8px 12px;
      background: #f8fafc;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .parties-box {
      margin-bottom: 22px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px 18px;
      font-size: 10pt;
      line-height: 1.65;
      text-align: justify;
    }
    .parties-box strong {
      color: #0A192F;
    }
    .field-missing {
      background: #fef08a;
      color: #854d0e;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 700;
      border: 1px dashed #ca8a04;
      display: inline-block;
    }
    .clause {
      margin-bottom: 18px;
      text-align: justify;
      font-size: 10.5pt;
      line-height: 1.65;
    }
    .clause-title {
      font-weight: 800;
      color: #0A192F;
      font-size: 11pt;
      margin-bottom: 6px;
      text-transform: uppercase;
      border-left: 4px solid #EAB308;
      padding-left: 8px;
    }
    .clause-sub {
      margin-top: 6px;
      padding-left: 14px;
    }
    .table-equips {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 9.5pt;
    }
    .table-equips th, .table-equips td {
      border: 1px solid #cbd5e1;
      padding: 7px 10px;
    }
    .table-equips th {
      background: #0A192F;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
    }
    .table-equips tr:nth-child(even) {
      background: #f8fafc;
    }
    .values-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 12px 0;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .value-item {
      display: flex;
      flex-direction: column;
    }
    .value-label {
      font-size: 8.5pt;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
    }
    .value-number {
      font-size: 12pt;
      font-weight: 800;
      color: #0F284E;
      margin-top: 2px;
    }
    .value-number.highlight {
      color: #0B7A5B;
    }
    .signatures-section {
      margin-top: 40px;
      page-break-inside: avoid;
    }
    .date-location {
      text-align: center;
      margin-bottom: 35px;
      font-weight: 600;
      font-size: 10.5pt;
      color: #1e293b;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 25px;
    }
    .sign-box {
      text-align: center;
      padding-top: 45px;
      border-top: 1.5px solid #0f172a;
      font-size: 9.5pt;
      line-height: 1.45;
    }
    .sign-box strong {
      display: block;
      font-size: 10pt;
      color: #0A192F;
      margin-bottom: 2px;
    }
    .witness-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 40px;
    }
    .footer-doc {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #94a3b8;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
    }
  </style>
</head>
<body>
  <!-- Cabeçalho -->
  <div class="header-doc">
    <img src="${logoEcosolar}" alt="Ecosolar Energy" class="logo-img" />
    <div class="header-info">
      <strong>${DADOS_FIXOS_ECOSOLAR.razaoSocial}</strong><br>
      CNPJ: ${DADOS_FIXOS_ECOSOLAR.cnpj} • IE: ${DADOS_FIXOS_ECOSOLAR.ie}<br>
      ${DADOS_FIXOS_ECOSOLAR.endereco} — ${DADOS_FIXOS_ECOSOLAR.cidade}/${DADOS_FIXOS_ECOSOLAR.estado}<br>
      Tel: ${DADOS_FIXOS_ECOSOLAR.telefone} • ${DADOS_FIXOS_ECOSOLAR.site}
    </div>
  </div>

  <h1 class="doc-title">Contrato de Prestação de Serviços e Instalação de Sistema Gerador Fotovoltaico</h1>

  <!-- Qualificação das Partes -->
  <div class="parties-box">
    <p style="margin-bottom: 10px;">
      <strong>CONTRATADA:</strong> <strong>${DADOS_FIXOS_ECOSOLAR.razaoSocial}</strong> (nome fantasia <strong>${DADOS_FIXOS_ECOSOLAR.nomeFantasia}</strong>), pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>${DADOS_FIXOS_ECOSOLAR.cnpj}</strong>, com sede na ${DADOS_FIXOS_ECOSOLAR.endereco}, Município de ${DADOS_FIXOS_ECOSOLAR.cidade}, Estado de ${DADOS_FIXOS_ECOSOLAR.estado}, CEP ${DADOS_FIXOS_ECOSOLAR.cep}, neste ato representada por seu sócio administrador <strong>${DADOS_FIXOS_ECOSOLAR.ceo.nome}</strong>.
    </p>
    <p>
      <strong>CONTRATANTE:</strong> <strong>${renderMissingWarning(dados.clienteNome, '[NOME DO CLIENTE]')}</strong>, 
      nacionalidade <strong>${renderMissingWarning(dados.clienteNacionalidade, '[NACIONALIDADE]')}</strong>, 
      estado civil <strong>${renderMissingWarning(dados.clienteEstadoCivil, '[ESTADO CIVIL]')}</strong>, 
      profissão <strong>${renderMissingWarning(dados.clienteProfissao, '[PROFISSÃO]')}</strong>, 
      inscrito(a) no CPF/CNPJ sob o nº <strong>${renderMissingWarning(dados.clienteCpfCnpj, '[CPF/CNPJ]')}</strong>, 
      residente e domiciliado(a) na ${renderMissingWarning(dados.clienteEndereco, '[ENDEREÇO/LOGRADOURO]')}, 
      na cidade de <strong>${renderMissingWarning(dados.clienteCidade, '[CIDADE]')}</strong> - <strong>${renderMissingWarning(dados.clienteEstado, '[UF]')}</strong>, 
      CEP <strong>${renderMissingWarning(dados.clienteCep, '[CEP]')}</strong>, 
      telefone: <strong>${renderMissingWarning(dados.clienteTelefone, '[TELEFONE]')}</strong>, 
      e-mail: <strong>${renderMissingWarning(dados.clienteEmail, '[E-MAIL]')}</strong>.
    </p>
  </div>

  <!-- Cláusulas -->
  <div class="clause">
    <div class="clause-title">Cláusula 1ª — Do Objeto</div>
    <p>
      O presente contrato tem como objeto a elaboração de projeto executivo de engenharia elétrica, homologação do parecer de acesso perante a concessionária de energia elétrica local (<strong>ENERGISA Distribuidora</strong>), fornecimento de equipamentos e componentes, e a completa instalação de um <strong>Sistema de Micro/Minigeração Solar Fotovoltaica Conectado à Rede (On-Grid)</strong>, com potência total de pico dimensionada em <strong>${potDisplay}</strong>, no endereço indicado pelo CONTRATANTE.
    </p>
  </div>

  <div class="clause">
    <div class="clause-title">Cláusula 2ª — Dos Equipamentos e Especificações Técnicas</div>
    <p>
      O sistema fotovoltaico contratado é composto pelos seguintes equipamentos e materiais principais, conforme decomposição técnica homologada pela CONTRATADA:
    </p>
    
    <table class="table-equips">
      <thead>
        <tr>
          <th style="width: 32%;">Item / Componente</th>
          <th style="width: 14%;">Quantidade</th>
          <th style="width: 28%;">Fabricante / Modelo</th>
          <th style="width: 26%;">Especificação Técnica</th>
        </tr>
      </thead>
      <tbody>
        ${equips
          .map(
            (eq) => `<tr>
              <td><strong>${eq.item}</strong></td>
              <td>${eq.quantidade}</td>
              <td>${eq.fabricanteModelo || 'Padrão Ecosolar'}</td>
              <td>${eq.especificacao || 'Certificação INMETRO / Tier 1'}</td>
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>
    <p style="font-size: 9pt; color: #64748b; margin-top: 4px;">
      * Todos os módulos fotovoltaicos e inversores fornecidos possuem certificação obrigatória do INMETRO e atendem às normas vigentes da ABNT e da ANEEL (Resolução Normativa nº 1.000/2021 e Lei 14.300/2022).
    </p>
  </div>

  <div class="clause">
    <div class="clause-title">Cláusula 3ª — Do Preço e Condições de Pagamento</div>
    <p>
      Pela execução completa dos serviços e fornecimento dos equipamentos descritos na Cláusula 2ª, o CONTRATANTE pagará à CONTRATADA o valor global de:
    </p>

    <div class="values-card">
      <div class="value-item">
        <span class="value-label">Valor Total Bruto</span>
        <span class="value-number">${valorTotalFormatted}</span>
      </div>
      <div class="value-item">
        <span class="value-label">Desconto Especial Concedido</span>
        <span class="value-number">${descontoFormatted}</span>
      </div>
      <div class="value-item">
        <span class="value-label">Valor Líquido Contratado</span>
        <span class="value-number highlight">${valorFinalFormatted}</span>
      </div>
    </div>

    <p style="margin-top: 8px;">
      <strong>Condição e Rateio de Pagamento Ajustado:</strong><br>
      ${
        dados.detalhesParcelamento ||
        `a) <strong>Parcela de Entrada / Assinatura:</strong> ${parcelaEntradaFormatted} devida na data de assinatura deste instrumento;<br>
         b) <strong>Parcela Final / Conclusão:</strong> ${parcelaFinalFormatted} devida no término da instalação física e vistoria da concessionária.`
      }
    </p>
    <p style="margin-top: 6px; font-size: 9.5pt; color: #475569;">
      <strong>Observações de Pagamento da Proposta:</strong> ${dados.condicoesPagamento || 'Conforme alinhado comercialmente via PIX, TED ou Financiamento Bancário homologado.'}
    </p>
  </div>

  <div class="clause">
    <div class="clause-title">Cláusula 4ª — Dos Prazos de Instalação e Homologação</div>
    <p>
      O prazo médio total para montagem e entrega do sistema operando é de até <strong>${dados.prazoInstalacaoDias || 45} (quarenta e cinco) dias úteis</strong>, contados a partir da aprovação do projeto/parecer de acesso pela concessionária local e liberação da entrega dos equipamentos. Eventuais prorrogações motivadas por atrasos comprovados de vistoria da concessionária (ENERGISA) ou intempéries climáticas severas serão comunicadas formalmente.
    </p>
  </div>

  <div class="clause">
    <div class="clause-title">Cláusula 5ª — Das Obrigações da Contratada</div>
    <p>
      São obrigações da CONTRATADA:
    </p>
    <div class="clause-sub">
      a) Realizar a visita técnica, o projeto executivo e emitir a Anotação de Responsabilidade Técnica (ART) junto ao CREA-RO;<br>
      b) Proceder com toda a tramitação e protocolo de homologação perante a concessionária de energia elétrica (ENERGISA);<br>
      c) Efetuar a montagem e instalação física e elétrica por técnicos especializados munidos de EPI e treinados nas normas NR-10 e NR-35;<br>
      d) Comissionar, testar e configurar o aplicativo de monitoramento remoto via Wi-Fi no smartphone do CONTRATANTE.
    </div>
  </div>

  <div class="clause">
    <div class="clause-title">Cláusula 6ª — Das Obrigações do Contratante</div>
    <p>
      São obrigações do CONTRATANTE:
    </p>
    <div class="clause-sub">
      a) Disponibilizar acesso livre da equipe técnica da CONTRATADA ao telhado, padrão de entrada e quadros elétricos do imóvel;<br>
      b) Fornecer cópia legível de sua fatura recente de energia elétrica e documentos de identificação necessários para a concessionária;<br>
      c) Manter conexão de internet Wi-Fi estável e com sinal ativo no local do inversor para permitir o monitoramento remoto;<br>
      d) Efetuar os pagamentos estipulados na Cláusula 3ª nas datas aprazadas.
    </div>
  </div>

  <div class="clause">
    <div class="clause-title">Cláusula 7ª — Das Garantias</div>
    <p>
      A CONTRATADA fornece garantia contra defeitos de instalação e montagem pelo período de <strong>${dados.garantiaInstalacaoMeses || 12} (doze) meses</strong>. Os equipamentos possuem garantias concedidas pelos respectivos fabricantes (25 anos de desempenho dos módulos, 5 a 10 anos para inversores e 10 a 12 anos para estruturas de fixação), nos termos dos certificados de cada fornecedor.
    </p>
  </div>

  <div class="clause">
    <div class="clause-title">Cláusula 8ª — Da Rescisão e Multa Contratual</div>
    <p>
      O descumprimento injustificado de quaisquer das cláusulas deste contrato sujeitará a parte infratora ao pagamento de multa rescisória equivalente a 10% (dez por cento) sobre o valor total do contrato, sem prejuízo da cobrança de eventuais despesas e custos já incorridos com projeto, taxas e aquisição de materiais sob encomenda.
    </p>
  </div>

  <div class="clause">
    <div class="clause-title">Cláusula 9ª — Do Foro</div>
    <p>
      Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem expressamente o <strong>${DADOS_FIXOS_ECOSOLAR.foro}</strong>, com renúncia irrevogável a qualquer outro, por mais privilegiado que seja.
    </p>
  </div>

  <!-- Fechamento e Assinaturas -->
  <div class="signatures-section">
    <p class="date-location">
      ${dados.dataAssinatura || formatarDataExtenso(null, dados.cidadeAssinatura || DADOS_FIXOS_ECOSOLAR.cidade)}
    </p>

    <div class="signatures-grid">
      <div class="sign-box">
        <strong>${DADOS_FIXOS_ECOSOLAR.razaoSocial}</strong>
        CNPJ: ${DADOS_FIXOS_ECOSOLAR.cnpj}<br>
        Hernandes da Silva Costa (CEO / Diretor)
      </div>

      <div class="sign-box">
        <strong>${dados.clienteNome || 'CONTRATANTE'}</strong>
        CPF/CNPJ: ${dados.clienteCpfCnpj || 'Não informado'}<br>
        Contratante
      </div>
    </div>

    <div class="witness-grid">
      <div class="sign-box" style="border-top: 1px dashed #94a3b8; padding-top: 25px;">
        <strong>Testemunha 1</strong>
        Nome:<br>
        CPF:
      </div>
      <div class="sign-box" style="border-top: 1px dashed #94a3b8; padding-top: 25px;">
        <strong>Testemunha 2</strong>
        Nome:<br>
        CPF:
      </div>
    </div>
  </div>

  <div class="footer-doc">
    <span>Ecosolar Energy • Contrato de Prestação de Serviços Fotovoltaicos</span>
    <span>Página 1 / 1</span>
  </div>
</body>
</html>`
}

/**
 * Gera o HTML para a Procuração Energisa Rondônia
 * Baseada fielmente no modelo Procuracao_Energisa_Ecosolar-ce324.docx
 */
export function generateProcuracaoEnergisaHTML(dados: DadosProcuracaoEnergisa): string {
  const concessionaria = dados.concessionaria || 'ENERGISA RONDÔNIA – DISTRIBUIDORA DE ENERGIA S/A'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Procuração Particular — Concessionária Energisa | ${dados.clienteNome || 'Cliente'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 20mm 20mm 20mm 20mm;
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
      font-size: 11.5pt;
      line-height: 1.7;
      text-align: justify;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-doc {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #EAB308;
      padding-bottom: 12px;
      margin-bottom: 30px;
    }
    .logo-img {
      height: 50px;
      max-width: 170px;
      object-fit: contain;
    }
    .header-sub {
      text-align: right;
      font-size: 8.5pt;
      color: #64748b;
      line-height: 1.3;
    }
    .title-doc {
      font-size: 17pt;
      font-weight: 900;
      color: #0A192F;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 28px;
    }
    .block-section {
      margin-bottom: 22px;
    }
    .section-label {
      font-weight: 800;
      color: #0A192F;
      text-transform: uppercase;
      font-size: 11.5pt;
      display: inline-block;
      margin-bottom: 6px;
      border-bottom: 2px solid #EAB308;
      padding-bottom: 1px;
    }
    .field-missing {
      background: #fef08a;
      color: #854d0e;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 700;
      border: 1px dashed #ca8a04;
      display: inline-block;
    }
    .signatures-section {
      margin-top: 60px;
      page-break-inside: avoid;
    }
    .date-location {
      text-align: center;
      margin-bottom: 50px;
      font-weight: 600;
      font-size: 11.5pt;
      color: #1e293b;
    }
    .sign-box {
      max-width: 380px;
      margin: 0 auto;
      text-align: center;
      padding-top: 15px;
      border-top: 1.5px solid #0f172a;
      font-size: 10.5pt;
      line-height: 1.5;
    }
    .sign-box strong {
      display: block;
      font-size: 11.5pt;
      color: #0A192F;
      margin-bottom: 3px;
    }
    .footer-doc {
      margin-top: 60px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 8.5pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <!-- Cabeçalho -->
  <div class="header-doc">
    <img src="${logoEcosolar}" alt="Ecosolar Energy" class="logo-img" />
    <div class="header-sub">
      <strong>ECOSOLAR ENERGY — ENGENHARIA SOLAR</strong><br>
      Homologação Concessionária Energisa Rondônia
    </div>
  </div>

  <h1 class="title-doc">PROCURAÇÃO PARTICULAR</h1>

  <!-- OUTORGANTE -->
  <div class="block-section">
    <span class="section-label">OUTORGANTE:</span>
    <p>
      <strong>${renderMissingWarning(dados.clienteNome, '[NOME COMPLETO DO CLIENTE]')}</strong>, 
      nacionalidade <strong>${renderMissingWarning(dados.clienteNacionalidade, '[NACIONALIDADE]')}</strong>, 
      estado civil <strong>${renderMissingWarning(dados.clienteEstadoCivil, '[ESTADO CIVIL]')}</strong>, 
      profissão <strong>${renderMissingWarning(dados.clienteProfissao, '[PROFISSÃO]')}</strong>, 
      portador(a) do RG nº <strong>${renderMissingWarning(dados.clienteRg, '[RG/ÓRGÃO EMISSOR]')}</strong> 
      e inscrito(a) no CPF/MF sob o nº <strong>${renderMissingWarning(dados.clienteCpfCnpj, '[CPF/CNPJ]')}</strong>, 
      residente e domiciliado(a) na ${renderMissingWarning(dados.clienteEndereco, '[ENDEREÇO/LOGRADOURO, Nº]')}, 
      bairro ${renderMissingWarning(dados.clienteBairro, '[BAIRRO]')}, 
      no Município de <strong>${renderMissingWarning(dados.clienteCidade, '[MUNICÍPIO]')}</strong>, 
      Estado de <strong>${renderMissingWarning(dados.clienteEstado, '[ESTADO]')}</strong>, 
      CEP: <strong>${renderMissingWarning(dados.clienteCep, '[CEP]')}</strong>.
    </p>
  </div>

  <!-- OUTORGADOS (FIXOS) -->
  <div class="block-section">
    <span class="section-label">OUTORGADOS:</span>
    <p style="margin-bottom: 8px;">
      1) <strong>WILLIAN DA COSTA GOVEIA</strong>, brasileiro, solteiro, Engenheiro Eletricista, portador da Carteira Profissional <strong>CREA 26000217D RO</strong>, inscrito no CPF sob o nº 033.***.***-**, residente e domiciliado em Seringueiras – RO; e
    </p>
    <p>
      2) <strong>HERNANDES DA SILVA COSTA</strong>, brasileiro, casado, empresário, Diretor Geral Ecosolar Energy, inscrito no CPF sob o nº 031.***.***-**, residente e domiciliado em Seringueiras – RO.
    </p>
  </div>

  <!-- PODERES (FIXO) -->
  <div class="block-section">
    <span class="section-label">PODERES:</span>
    <p>
      Por este instrumento particular de procuração, o(a) OUTORGANTE nomeia e constitui os bastantes OUTORGADOS como seus legítimos procuradores, concedendo-lhes amplos, gerais e ilimitados poderes para representá-lo(a) perante a concessionária de distribuição de energia elétrica <strong>${concessionaria}</strong>, com o fito específico de:
    </p>
    <p style="margin-top: 8px; padding-left: 14px;">
      a) Solicitar Consulta de Acesso, Informação de Acesso e Parecer de Acesso para conexão de Unidade Geradora Fotovoltaica (Microgeração ou Minigeração Distribuída);<br>
      b) Solicitar vistoria técnica, comissionamento e substituição/instalação do medidor bidirecional de energia elétrica;<br>
      c) Assinar o Relacionamento Operacional, Acordo Operativo e/ou Contrato de Uso do Sistema de Distribuição (CUSD/CCD);<br>
      d) Receber notificações, interpor recursos administrativos, assinar termos de compromisso, requerer transferências de titularidade, prestar esclarecimentos técnicos, assinar plantas, memoriais descritivos, ARTs e praticar todos os demais atos indispensáveis ao integral cumprimento e aprovação do projeto solar perante a concessionária.
    </p>
  </div>

  <!-- VALIDADE (FIXA) -->
  <div class="block-section">
    <span class="section-label">VALIDADE:</span>
    <p>
      A presente procuração tem validade de <strong>12 (doze) meses</strong> a contar da data de sua assinatura, findo o qual se extinguem os poderes aqui conferidos.
    </p>
  </div>

  <!-- Assinatura -->
  <div class="signatures-section">
    <p class="date-location">
      ${dados.dataAssinatura || formatarDataExtenso(null, dados.cidadeAssinatura || 'Seringueiras – RO')}
    </p>

    <div class="sign-box">
      <strong>${dados.clienteNome || 'OUTORGANTE'}</strong>
      CPF: ${dados.clienteCpfCnpj || 'Não informado'}<br>
      Outorgante
    </div>
  </div>

  <div class="footer-doc">
    <span>Ecosolar Energy • Procuração Concessionária Energisa</span>
    <span>Outorgante: ${dados.clienteNome || 'Cliente'} — CPF: ${dados.clienteCpfCnpj || '---'}</span>
  </div>
</body>
</html>`
}
