import { formatBRL, formatDateBR } from './solarUtils'
import { parseKitDetailedItems } from './kitItemsParser'
import logoEcosolar from '@/assets/editedimage1773228973392-e62fd.png'

export interface DadosContratoFormalizacao {
  // Contratante (Lead)
  clienteNome: string
  clienteCpfCnpj: string
  clienteNacionalidade?: string
  clienteEstadoCivil?: string
  clienteProfissao?: string
  clienteEndereco: string
  clienteCidade?: string
  clienteEstado?: string
  clienteCep?: string
  clienteTelefone?: string
  clienteEmail?: string

  // Dados do Sistema & Equipamentos
  kitNome?: string
  potenciaKwp: number | string
  kitFabricante?: string
  kitDescricao?: string
  kitStringBox?: string
  tabelaEquipamentos?: Array<{
    item: string
    quantidade: number | string
    especificacao?: string
    fabricanteModelo?: string
    unidade?: string
  }>

  // Valores e Pagamento
  valorTotal: number | string
  descontoAvista: number | string
  valorFinal?: number | string
  condicoesPagamento: string
  parcelaEntrada?: number | string
  parcelaFinal?: number | string
  detalhesParcelamento?: string

  // Data & Local
  cidadeAssinatura?: string
  dataAssinatura?: string // Extenso ou ISO
  prazoInstalacaoDias?: number
  garantiaInstalacaoMeses?: number
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
// Dados fixos da Ecosolar (Modelo Oficial)
export const DADOS_FIXOS_ECOSOLAR = {
  razaoSocial: 'H DA SILVA COSTA LTDA',
  nomeFantasia: 'ECOSOLAR ENERGY',
  cnpj: '52.081.110/0001-29',
  enderecoSede: 'Av Flamboyant nº340-C, centro, Seringueiras-RO, CEP 76934-000',
  cidade: 'Seringueiras',
  estado: 'RO',
  cep: '76934-000',
  foro: 'Comarca de São Miguel do Guaporé, Estado de Rondônia',
  ceo: {
    nome: 'HERNANDES DA SILVA COSTA',
    nacionalidade: 'brasileiro',
    estadoCivil: 'casado',
    profissao: 'empresário',
    rg: '1432554 SESDEC RO',
    cpf: '041.209.632-33',
    enderecoResidencial: 'Av Flamboyant nº1268, centro, Seringueiras-RO, CEP 76934-000',
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

  // Formatação da potência com vírgula decimal (ex: 6,30 ou 9,45)
  let potDisplay = ''
  if (
    dados.potenciaKwp !== undefined &&
    dados.potenciaKwp !== null &&
    String(dados.potenciaKwp).trim() !== ''
  ) {
    const rawPotStr = String(dados.potenciaKwp)
      .replace(/\s*kWp?/i, '')
      .replace(',', '.')
    const numPot = parseFloat(rawPotStr)
    if (!isNaN(numPot)) {
      potDisplay = numPot.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    } else {
      potDisplay = String(dados.potenciaKwp)
    }
  }

  // Formatação de valores
  const parseValNum = (v: number | string | undefined | null): number => {
    if (v === undefined || v === null) return 0
    if (typeof v === 'number') return v
    const cleaned = String(v)
      .replace(/[R$\s.]/g, '')
      .replace(',', '.')
    return parseFloat(cleaned) || 0
  }

  const numValorTotal = parseValNum(dados.valorTotal)
  const numDesconto = parseValNum(dados.descontoAvista)

  const valorTotalFormatted =
    numValorTotal > 0 ? formatBRL(numValorTotal) : renderMissingWarning(null, 'R$ 0,00')
  const valorDescontoFormatted = formatBRL(numDesconto)

  // Endereço completo formatado
  const enderecoParts = [
    dados.clienteEndereco,
    dados.clienteCidade && dados.clienteEstado
      ? `${dados.clienteCidade}-${dados.clienteEstado}`
      : dados.clienteCidade || dados.clienteEstado,
    dados.clienteCep ? `CEP ${dados.clienteCep}` : '',
  ].filter(Boolean)
  const enderecoCompletoStr =
    enderecoParts.length > 0 ? enderecoParts.join(', ') : dados.clienteEndereco

  // Cidade e Data por extenso
  const cidadeFinal = dados.cidadeAssinatura || dados.clienteCidade || DADOS_FIXOS_ECOSOLAR.cidade
  let dataExtensoFinal = dados.dataAssinatura || ''
  if (!dataExtensoFinal) {
    dataExtensoFinal = formatarDataExtenso(new Date(), cidadeFinal)
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE INSTALAÇÃO E HOMOLOGAÇÃO DE SISTEMA DE ENERGIA SOLAR FOTOVOLTAICA</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 20mm 20mm 20mm 20mm;
      @bottom-center {
        content: counter(page);
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: "Segoe UI", Arial, sans-serif;
    }
    body {
      color: #0f172a;
      background: #ffffff;
      font-size: 11pt;
      line-height: 1.65;
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
      margin-bottom: 24px;
    }
    .logo-img {
      height: 48px;
      max-width: 170px;
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
      font-size: 9pt;
    }
    .doc-title {
      font-size: 13pt;
      font-weight: 800;
      color: #0A192F;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 24px;
      line-height: 1.4;
    }
    .preamble {
      margin-bottom: 16px;
      text-indent: 0;
    }
    .party-block {
      margin-bottom: 14px;
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
    .section-title {
      font-weight: 800;
      font-size: 11pt;
      color: #0A192F;
      margin-top: 18px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .clause-text {
      margin-bottom: 8px;
    }
    .bullet-item {
      margin-left: 24px;
      margin-bottom: 4px;
    }
    .table-equips {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px 0;
      font-size: 9.5pt;
    }
    .table-equips th, .table-equips td {
      border: 1px solid #cbd5e1;
      padding: 7px 10px;
      text-align: left;
    }
    .table-equips th {
      background: #0A192F;
      color: #ffffff;
      font-weight: 700;
    }
    .table-equips tr:nth-child(even) {
      background: #f8fafc;
    }
    .signatures-section {
      margin-top: 35px;
      page-break-inside: avoid;
    }
    .date-location {
      text-align: left;
      margin-bottom: 40px;
      font-weight: 600;
      font-size: 11pt;
      color: #1e293b;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 36px;
      margin-top: 30px;
    }
    .sign-box {
      text-align: center;
      padding-top: 12px;
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
      gap: 36px;
      margin-top: 36px;
    }
    .footer-doc {
      margin-top: 30px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <!-- Cabeçalho Institucional -->
  <div class="header-doc">
    <img src="${logoEcosolar}" alt="Ecosolar Energy" class="logo-img" />
    <div class="header-info">
      <strong>${DADOS_FIXOS_ECOSOLAR.razaoSocial}</strong> (nome fantasia <strong>${DADOS_FIXOS_ECOSOLAR.nomeFantasia}</strong>)<br>
      CNPJ: ${DADOS_FIXOS_ECOSOLAR.cnpj}<br>
      ${DADOS_FIXOS_ECOSOLAR.enderecoSede}
    </div>
  </div>

  <h1 class="doc-title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE INSTALAÇÃO E HOMOLOGAÇÃO DE SISTEMA DE ENERGIA SOLAR FOTOVOLTAICA</h1>

  <p class="preamble">
    Pelo presente instrumento particular de Contrato de Prestação de Serviços de Instalação e Homologação de Sistema de Energia Solar Fotovoltaica, de um lado:
  </p>

  <p class="party-block">
    <strong>CONTRATADA:</strong> <strong>${DADOS_FIXOS_ECOSOLAR.razaoSocial}</strong>, nome fantasia <strong>${DADOS_FIXOS_ECOSOLAR.nomeFantasia}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>${DADOS_FIXOS_ECOSOLAR.cnpj}</strong>, com sede na ${DADOS_FIXOS_ECOSOLAR.enderecoSede}, neste ato representada por seu sócio-administrador, <strong>${DADOS_FIXOS_ECOSOLAR.ceo.nome}</strong>, ${DADOS_FIXOS_ECOSOLAR.ceo.nacionalidade}, ${DADOS_FIXOS_ECOSOLAR.ceo.estadoCivil}, ${DADOS_FIXOS_ECOSOLAR.ceo.profissao}, portador da Cédula de Identidade RG nº ${DADOS_FIXOS_ECOSOLAR.ceo.rg} e inscrito no CPF sob o nº ${DADOS_FIXOS_ECOSOLAR.ceo.cpf}, residente e domiciliado na ${DADOS_FIXOS_ECOSOLAR.ceo.enderecoResidencial}.
  </p>

  <p class="preamble">
    E, de outro lado:
  </p>

  <p class="party-block">
    <strong>CONTRATANTE:</strong> <strong>${renderMissingWarning(dados.clienteNome, '{{nome_cliente}}')}</strong>, inscrito(a) no CPF número <strong>${renderMissingWarning(dados.clienteCpfCnpj, '{{cpf_cnpj}}')}</strong> residente e domiciliado na <strong>${renderMissingWarning(enderecoCompletoStr, '{{endereco_completo}}')}</strong>
  </p>

  <p class="preamble">
    As partes acima qualificadas, doravante denominadas simplesmente CONTRATANTE e CONTRATADA, têm entre si, justo e contratado, o presente Contrato de Prestação de Serviços de Instalação e Homologação de Sistema de Energia Solar Fotovoltaica, que se regerá pelas cláusulas e condições seguintes:
  </p>

  <div class="section-title">1. DO OBJETO DO CONTRATO</div>
  <p class="clause-text">
    1.1. O presente contrato tem por objeto a prestação de serviços de instalação e homologação de um sistema de energia solar fotovoltaica de <strong>${renderMissingWarning(potDisplay, '{{potencia_kwp}}')} kWp</strong>
  </p>

  <table class="table-equips">
    <thead>
      <tr>
        <th style="width: 58%;">Produto</th>
        <th style="width: 20%; text-align: center;">Unid.</th>
        <th style="width: 22%; text-align: center;">Qtde</th>
      </tr>
    </thead>
    <tbody>
      ${equips
        .map(
          (eq) => `<tr>
            <td><strong>${eq.item}</strong>${eq.fabricanteModelo ? ` — ${eq.fabricanteModelo}` : ''}${eq.especificacao ? ` (${eq.especificacao})` : ''}</td>
            <td style="text-align: center;">${eq.unidade || 'un'}</td>
            <td style="text-align: center;">${eq.quantidade}</td>
          </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <p class="clause-text">
    1.3. Os serviços incluem o fornecimento dos equipamentos listados, a instalação completa do sistema, a elaboração e acompanhamento do projeto junto à concessionária de energia elétrica local para a homologação e conexão do sistema à rede.
  </p>

  <div class="section-title">2. DO PRAZO</div>
  <p class="clause-text">
    2.1. O prazo para a entrega dos equipamentos (kit solar fotovoltaico) pela [CONTRATADA] será de até 30 (trinta) dias corridos, contados a partir da data de assinatura do presente contrato e da confirmação do pagamento da primeira parcela.
  </p>
  <p class="clause-text">
    2.2. O prazo para a instalação completa do sistema será de até 60 (sessenta) dias corridos, contados a partir da entrega dos equipamentos no local de instalação.
  </p>
  <p class="clause-text">
    2.3. O prazo para a conclusão do processo de homologação e conexão do sistema à rede junto à concessionária de energia elétrica será de até 90 (noventa) dias corridos, contados a partir da data de assinatura do presente contrato.
  </p>
  <p class="clause-text">
    2.4. Os prazos estabelecidos nesta Cláusula serão cumpridos rigorosamente pela CONTRATADA, conforme seus compromissos comerciais e operacionais.
  </p>
  <p class="clause-text">
    2.5. Fica expressamente acordado que a CONTRATADA não será responsável por atrasos na homologação e conexão do sistema que decorram de atrasos, omissões, negativas ou demoras da concessionária de energia elétrica ENERGISA no cumprimento de seus procedimentos administrativos e técnicos. Nestes casos, a CONTRATADA se compromete a acompanhar e pressionar a ENERGISA para a conclusão dos trâmites, mas não responde por prazos fora de seu controle.
  </p>
  <p class="clause-text">
    2.6. Em caso de atrasos causados exclusivamente pela CONTRATADA, esta se compromete a comunicar a CONTRATANTE imediatamente e a apresentar cronograma revisado com novas datas de cumprimento das obrigações.
  </p>

  <div class="section-title">3. DO VALOR E FORMA DE PAGAMENTO</div>
  <p class="clause-text">
    3.1. O valor total dos serviços e equipamentos objeto deste contrato é de <strong>${valorTotalFormatted}</strong> e com desconto à vista, no valor de <strong>${valorDescontoFormatted}</strong>
  </p>
  <p class="clause-text">
    3.2. O pagamento será realizado da seguinte forma: <strong>${renderMissingWarning(dados.condicoesPagamento || dados.detalhesParcelamento, '{{condicoes_pagamento}}')}</strong>
  </p>

  <div class="section-title">4. DAS OBRIGAÇÕES DA CONTRATADA</div>
  <p class="clause-text">
    4.1. Fornecer todos os equipamentos e materiais necessários para a instalação do sistema fotovoltaico, conforme as especificações técnicas descritas na Cláusula Primeira.
  </p>
  <p class="clause-text">
    4.2. Realizar a instalação do sistema de energia solar fotovoltaica de acordo com as normas técnicas vigentes (ABNT NBR 16690, NBR 5410, entre outras) e as melhores práticas de engenharia.
  </p>
  <p class="clause-text">
    4.3. Elaborar e submeter o projeto de conexão do sistema à concessionária de energia elétrica, acompanhando todo o processo de homologação até a sua efetiva aprovação e conexão à rede.
  </p>
  <p class="clause-text">
    4.4. Treinar a CONTRATANTE sobre o funcionamento básico e a manutenção preventiva do sistema instalado.
  </p>
  <p class="clause-text">
    4.5. Emitir as notas fiscais referentes aos equipamentos e serviços prestados.
  </p>

  <div class="section-title">5. DAS OBRIGAÇÕES DA CONTRATANTE</div>
  <p class="clause-text">
    5.1. Efetuar os pagamentos nas datas e condições estabelecidas na Cláusula Terceira.
  </p>
  <p class="clause-text">
    5.2. Fornecer acesso ao local de instalação e às instalações elétricas necessárias para a execução dos serviços.
  </p>
  <p class="clause-text">
    5.3. Obter as licenças e autorizações municipais, se houver, para a instalação do sistema, sendo a CONTRATADA responsável por orientar sobre a necessidade e os procedimentos.
  </p>
  <p class="clause-text">
    5.4. Manter a estrutura do telhado ou local de instalação em condições adequadas para suportar o peso e a fixação dos equipamentos.
  </p>
  <p class="clause-text">
    5.5. Informar a CONTRATADA sobre quaisquer alterações na estrutura do imóvel ou no consumo de energia que possam afetar o desempenho do sistema.
  </p>

  <div class="section-title">6. DA GARANTIA</div>
  <p class="clause-text">
    6.1. A CONTRATADA garante a qualidade dos serviços de instalação por um período de 1 (um) ano, contado a partir da data de conclusão da instalação e homologação do sistema.
  </p>
  <p class="clause-text">
    6.2. A garantia dos equipamentos (módulos, inversores, etc.) é de responsabilidade dos respectivos fabricantes, conforme seus termos e prazos específicos, sendo a CONTRATADA responsável por auxiliar a CONTRATANTE no acionamento dessas garantias, se necessário.
  </p>
  <p class="clause-text">
    6.3. A garantia não cobre danos causados por mau uso, negligência, acidentes, fenômenos da natureza (raios, vendavais, etc.), alterações ou reparos realizados por terceiros não autorizados pela CONTRATADA.
  </p>

  <div class="section-title">7. DA RESCISÃO</div>
  <p class="clause-text">
    7.1. O presente contrato poderá ser rescindido de pleno direito, independentemente de qualquer notificação ou interpelação judicial ou extrajudicial, nas seguintes hipóteses:
  </p>
  <p class="bullet-item"># Pelo descumprimento de qualquer das cláusulas ou condições estabelecidas neste contrato por uma das partes.</p>
  <p class="bullet-item"># Pela decretação de falência ou recuperação judicial de qualquer das partes.</p>
  <p class="bullet-item"># Por comum acordo entre as partes, mediante termo aditivo.</p>
  <p class="clause-text" style="margin-top: 6px;">
    7.2. Em caso de rescisão por culpa da CONTRATANTE, esta arcará com os custos dos serviços já realizados e dos equipamentos já adquiridos e não utilizados, além da multa prevista na Cláusula Oitava.
  </p>
  <p class="clause-text">
    7.3. Em caso de rescisão por culpa da CONTRATADA, esta deverá restituir à CONTRATANTE os valores pagos referentes aos serviços não executados e aos equipamentos não fornecidos, além da multa prevista na Cláusula Oitava.
  </p>

  <div class="section-title">8. DA MULTA</div>
  <p class="clause-text">
    8.1. A parte que der causa à rescisão do presente contrato por descumprimento de suas obrigações, ou que o rescindir unilateralmente sem justa causa, pagará à outra parte multa compensatória equivalente a 10% (dez por cento) do valor total do contrato, sem prejuízo da apuração de perdas e danos.
  </p>

  <div class="section-title">9. DA CONFIDENCIALIDADE</div>
  <p class="clause-text">
    9.1. As partes comprometem-se a manter sigilo sobre todas as informações técnicas, comerciais ou financeiras que venham a ter acesso em razão da execução deste contrato, não as divulgando a terceiros, salvo se expressamente autorizado pela outra parte ou por força de lei.
  </p>

  <div class="section-title">10. DAS DISPOSIÇÕES GERAIS</div>
  <p class="clause-text">
    10.1. Este contrato constitui o acordo integral entre as partes, substituindo quaisquer acordos ou entendimentos anteriores, verbais ou escritos.
  </p>
  <p class="clause-text">
    10.2. Qualquer alteração ou aditamento a este contrato somente será válido se feito por escrito e assinado por ambas as partes.
  </p>
  <p class="clause-text">
    10.3. A tolerância de uma parte quanto ao descumprimento de qualquer obrigação pela outra não implicará em renúncia ao direito de exigir o cumprimento da obrigação ou de rescindir o contrato.
  </p>
  <p class="clause-text">
    10.4. As partes elegem o endereço constante no preâmbulo para fins de recebimento de notificações e comunicações relativas a este contrato.
  </p>

  <div class="section-title">11. DO FORO</div>
  <p class="clause-text">
    11.1. Para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato, as partes elegem o foro da Comarca de São Miguel do Guaporé, Estado de Rondônia, com exclusão de qualquer outro, por mais privilegiado que seja.
  </p>

  <p class="clause-text" style="margin-top: 18px;">
    E, por estarem assim justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença das 2 (duas) testemunhas abaixo, para que produza seus jurídicos e legais efeitos.
  </p>

  <!-- Fechamento e Assinaturas -->
  <div class="signatures-section">
    <p class="date-location">
      ${dataExtensoFinal}
    </p>

    <div class="signatures-grid">
      <div class="sign-box">
        <strong>${DADOS_FIXOS_ECOSOLAR.razaoSocial}</strong>
        ${DADOS_FIXOS_ECOSOLAR.cnpj}
      </div>

      <div class="sign-box">
        <strong>${renderMissingWarning(dados.clienteNome, '{{nome_cliente}}')}</strong>
        ${renderMissingWarning(dados.clienteCpfCnpj, '{{cpf_cnpj}}')}
      </div>
    </div>

    <div class="witness-grid">
      <div class="sign-box" style="border-top: 1px dashed #94a3b8; padding-top: 12px;">
        <strong>Testemunha 1</strong>
        Nome:<br>
        CPF:
      </div>
      <div class="sign-box" style="border-top: 1px dashed #94a3b8; padding-top: 12px;">
        <strong>Testemunha 2</strong>
        Nome:<br>
        CPF:
      </div>
    </div>
  </div>

  <div class="footer-doc">
    <span>${DADOS_FIXOS_ECOSOLAR.nomeFantasia} • CONTRATO DE PRESTAÇÃO DE SERVIÇOS</span>
    <span>Seringueiras - RO</span>
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
