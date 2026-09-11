import { describe, it, expect } from 'vitest'
import {
  formatarDataExtenso,
  generateContratoHTML,
  generateProcuracaoEnergisaHTML,
  DADOS_FIXOS_ECOSOLAR,
  DadosContratoFormalizacao,
  DadosProcuracaoEnergisa,
} from './formalizacaoPdf'

describe('formalizacaoPdf', () => {
  it('deve formatar data por extenso corretamente sem erro de dias inválidos', () => {
    // Testando 30 de junho
    const dataJunho = new Date(2025, 5, 30)
    const textoJunho = formatarDataExtenso(dataJunho, 'Seringueiras - RO')
    expect(textoJunho).toBe('Seringueiras - RO, 30 de junho de 2025')

    // Testando 15 de janeiro
    const dataJaneiro = new Date(2025, 0, 15)
    const textoJaneiro = formatarDataExtenso(dataJaneiro, 'Seringueiras - RO')
    expect(textoJaneiro).toBe('Seringueiras - RO, 15 de janeiro de 2025')
  })

  it('deve gerar contrato com dados fixos da contratada e variáveis do cliente e kit', () => {
    const dados: DadosContratoFormalizacao = {
      clienteNome: 'João da Silva Sauro',
      clienteCpfCnpj: '123.456.789-00',
      clienteNacionalidade: 'Brasileiro',
      clienteEstadoCivil: 'Casado',
      clienteProfissao: 'Produtor Rural',
      clienteEndereco: 'Linha 105, Km 12',
      clienteCidade: 'Seringueiras',
      clienteEstado: 'RO',
      clienteCep: '76934-000',
      clienteTelefone: '(69) 99999-8888',
      clienteEmail: 'joao@fazenda.com',
      kitNome: 'GERADOR-BELENERGY-HUAWEI-TESUN630W',
      potenciaKwp: '6,30',
      kitFabricante: 'Belenergy / Huawei / TSUN',
      kitDescricao: 'Kit completo',
      tabelaEquipamentos: [
        {
          item: 'GERADOR-BELENERGY-HUAWEI-TESUN630W',
          unidade: 'kit',
          quantidade: '1,00',
          fabricanteModelo: 'Belenergy',
          especificacao: 'Kit Solar Fotovoltaico Completo',
        },
        {
          item: '10= MODULO BIFACIAL 144 CEL. N TYPE 630W',
          unidade: 'un',
          quantidade: '10',
          fabricanteModelo: 'TSUN Power',
          especificacao: 'Garantia de 25 anos',
        },
        {
          item: '01=INVERSOR DE CORRENTE L1 MONOFASICO 2MPPT 220V 5KW HUAWEI INVHW-MO-220V-5KW',
          unidade: 'un',
          quantidade: '1',
          fabricanteModelo: 'Huawei',
          especificacao: 'Inversor 5kW',
        },
      ],
      valorTotal: 17000,
      descontoAvista: 1000,
      valorFinal: 16000,
      condicoesPagamento:
        'Na assinatura do contrato o valor de R$ 11.203,43. No fim da Instalação R$ 5.796,57.',
      parcelaEntrada: 11203.43,
      parcelaFinal: 5796.57,
      detalhesParcelamento:
        'Na assinatura do contrato o valor de R$ 11.203,43. No fim da Instalação R$ 5.796,57.',
      cidadeAssinatura: 'Seringueiras',
      dataAssinatura: 'Seringueiras, 29 de agosto de 2026',
      prazoInstalacaoDias: 60,
      garantiaInstalacaoMeses: 12,
    }

    const html = generateContratoHTML(dados)

    // 1. Título exato
    expect(html).toContain(
      'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE INSTALAÇÃO E HOMOLOGAÇÃO DE SISTEMA DE ENERGIA SOLAR FOTOVOLTAICA',
    )

    // 2. Qualificação verbatim da CONTRATADA
    expect(html).toContain(
      'CONTRATADA: H DA SILVA COSTA LTDA, nome fantasia ECOSOLAR ENERGY, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 52.081.110/0001-29, com sede na Av Flamboyant nº340-C, centro, Seringueiras-RO, CEP 76934-000, neste ato representada por seu sócio-administrador, HERNANDES DA SILVA COSTA, brasileiro, casado, empresário, portador da Cédula de Identidade RG nº 1432554 SESDEC RO e inscrito no CPF sob o nº 041.209.632-33, residente e domiciliado na Av Flamboyant nº1268, centro, Seringueiras-RO, CEP 76934-000.',
    )

    // 3. Qualificação verbatim do CONTRATANTE
    expect(html).toContain(
      'CONTRATANTE: João da Silva Sauro, inscrito(a) no CPF número 123.456.789-00 residente e domiciliado na Linha 105, Km 12, Seringueiras-RO, CEP 76934-000',
    )

    // 4. Cláusula 1 (Objeto) verbatim
    expect(html).toContain('1. DO OBJETO DO CONTRATO')
    expect(html).toContain(
      '1.1. O presente contrato tem por objeto a prestação de serviços de instalação e homologação de um sistema de energia solar fotovoltaica de <strong>6,30 kWp</strong>',
    )
    expect(html).toContain(
      '1.3. Os serviços incluem o fornecimento dos equipamentos listados, a instalação completa do sistema, a elaboração e acompanhamento do projeto junto à concessionária de energia elétrica local para a homologação e conexão do sistema à rede.',
    )

    // 5. Cláusula 2 (Prazos) verbatim
    expect(html).toContain('2. DO PRAZO')
    expect(html).toContain(
      '2.1. O prazo para a entrega dos equipamentos (kit solar fotovoltaico) pela [CONTRATADA] será de até 30 (trinta) dias corridos, contados a partir da data de assinatura do presente contrato e da confirmação do pagamento da primeira parcela.',
    )
    expect(html).toContain(
      '2.2. O prazo para a instalação completa do sistema será de até 60 (sessenta) dias corridos, contados a partir da entrega dos equipamentos no local de instalação.',
    )
    expect(html).toContain(
      '2.3. O prazo para a conclusão do processo de homologação e conexão do sistema à rede junto à concessionária de energia elétrica será de até 90 (noventa) dias corridos, contados a partir da data de assinatura do presente contrato.',
    )
    expect(html).toContain(
      '2.4. Os prazos estabelecidos nesta Cláusula serão cumpridos rigorosamente pela CONTRATADA, conforme seus compromissos comerciais e operacionais.',
    )
    expect(html).toContain(
      '2.5. Fica expressamente acordado que a CONTRATADA não será responsável por atrasos na homologação e conexão do sistema que decorram de atrasos, omissões, negativas ou demoras da concessionária de energia elétrica ENERGISA no cumprimento de seus procedimentos administrativos e técnicos. Nestes casos, a CONTRATADA se compromete a acompanhar e pressionar a ENERGISA para a conclusão dos trâmites, mas não responde por prazos fora de seu controle.',
    )
    expect(html).toContain(
      '2.6. Em caso de atrasos causados exclusivamente pela CONTRATADA, esta se compromete a comunicar a CONTRATANTE imediatamente e a apresentar cronograma revisado com novas datas de cumprimento das obrigações.',
    )

    // 6. Cláusula 3 (Valor e Pagamento) verbatim
    expect(html).toContain('3. DO VALOR E FORMA DE PAGAMENTO')
    expect(html).toContain(
      '3.1. O valor total dos serviços e equipamentos objeto deste contrato é de <strong>R$ 17.000,00</strong> e com desconto à vista, no valor de <strong>R$ 1.000,00</strong>',
    )
    expect(html).toContain(
      '3.2. O pagamento será realizado da seguinte forma: <strong>Na assinatura do contrato o valor de R$ 11.203,43. No fim da Instalação R$ 5.796,57.</strong>',
    )

    // 7. Cláusulas 4 a 10
    expect(html).toContain('4. DAS OBRIGAÇÕES DA CONTRATADA')
    expect(html).toContain('5. DAS OBRIGAÇÕES DA CONTRATANTE')
    expect(html).toContain('6. DA GARANTIA')
    expect(html).toContain('7. DA RESCISÃO')
    expect(html).toContain('8. DA MULTA')
    expect(html).toContain(
      '8.1. A parte que der causa à rescisão do presente contrato por descumprimento de suas obrigações, ou que o rescindir unilateralmente sem justa causa, pagará à outra parte multa compensatória equivalente a 10% (dez por cento) do valor total do contrato, sem prejuízo da apuração de perdas e danos.',
    )
    expect(html).toContain('9. DA CONFIDENCIALIDADE')
    expect(html).toContain('10. DAS DISPOSIÇÕES GERAIS')

    // 8. Cláusula 11 (Foro) verbatim
    expect(html).toContain('11. DO FORO')
    expect(html).toContain(
      '11.1. Para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato, as partes elegem o foro da Comarca de São Miguel do Guaporé, Estado de Rondônia, com exclusão de qualquer outro, por mais privilegiado que seja.',
    )

    // 9. Encerramento e Assinaturas
    expect(html).toContain(
      'E, por estarem assim justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença das 2 (duas) testemunhas abaixo, para que produza seus jurídicos e legais efeitos.',
    )
    expect(html).toContain('Seringueiras, 29 de agosto de 2026')
    expect(html).toContain('H DA SILVA COSTA LTDA')
    expect(html).toContain('52.081.110/0001-29')
  })

  it('deve gerar procuração Energisa reproduzindo VERBATIM o modelo oficial', () => {
    const dados: DadosProcuracaoEnergisa = {
      clienteNome: 'Maria Aparecida Santos',
      clienteNacionalidade: 'Brasileira',
      clienteEstadoCivil: 'Solteira',
      clienteProfissao: 'Comerciante',
      clienteCpfCnpj: '987.654.321-11',
      clienteEndereco: 'Av. Brasil, 450',
      clienteBairro: 'Centro',
      clienteCidade: 'São Miguel do Guaporé',
      clienteEstado: 'RO',
      clienteCep: '76932-000',
      concessionaria: 'ENERGISA RONDÔNIA — DISTRIBUIDORA DE ENERGIA S/A',
      cidadeAssinatura: 'SERINGUEIRAS – RO',
      dataAssinatura: 'SERINGUEIRAS – RO, 12 de março de 2025',
    }

    const html = generateProcuracaoEnergisaHTML(dados)

    // 1. TÍTULO
    expect(html).toContain('<h1 class="title-doc">PROCURAÇÃO</h1>')

    // 2. SEÇÃO OUTORGANTE
    expect(html).toContain(
      'OUTORGANTE:</strong> Maria Aparecida Santos, CPF: 987.654.321-11, nacionalidade: Brasileira, estado civil: Solteira, profissão: Comerciante, residente e domiciliado na Av. Brasil, 450 Bairro: Centro, Município: São Miguel do Guaporé, Estado: RO, CEP: 76932-000.',
    )

    // 3. SEÇÃO OUTORGADOS COM OS 2 CREDENCIADOS VERBATIM
    expect(html).toContain('<strong>OUTORGADOS:</strong>')
    expect(html).toContain(
      '1º) WILLIAN DA COSTA GOVEIA, Engenheiro Eletricista, brasileiro, inscrito no CREA sob o nº 26000217D RO, portador do RG nº 1425244 SESDEC/RO e CPF nº 024.376.042-60, residente e domiciliado na Rua Piauí, nº 1970, Setor 1ª, Jaru/RO CEP:76890-000.',
    )
    expect(html).toContain(
      '2º) HERNANDES DA SILVA COSTA, Empresário, Brasileiro, Casado, portador do RG n°1432554, portador do CPF nº 041.209.632-33, CEO e representante comercial da empresa Ecosolar Energy, residente na Av. Flamboyant n°1268, Bairro Centro, Seringueiras/RO CEP 76934-000.',
    )

    // 4. SEÇÃO PODERES COM OS 6 BULLETS VERBATIM
    expect(html).toContain(
      'PODERES:</strong> Pelo presente instrumento particular de procuração, o(a) OUTORGANTE confere aos OUTORGADOS, em conjunto ou separadamente, amplos poderes para representá-lo(a) perante a ENERGISA RONDÔNIA — DISTRIBUIDORA DE ENERGIA S/A, podendo para tanto:',
    )
    expect(html).toContain(
      'Solicitar, acompanhar e retirar documentos relativos à Unidade Consumidora (UC) de titularidade do(a) outorgante;',
    )
    expect(html).toContain(
      'Protocolar e acompanhar pedidos de conexão de sistema de geração de energia solar fotovoltaica (microgeração e minigeração distribuída), conforme regulamentação da ANEEL;',
    )
    expect(html).toContain(
      'Assinar requerimentos, formulários, termos de aceite, parecer de acesso e demais documentos necessários ao processo de homologação junto à Energisa Rondônia;',
    )
    expect(html).toContain('Solicitar vistoria e acompanhar a instalação do medidor bidirecional;')
    expect(html).toContain(
      'Obter informações sobre débitos, histórico de consumo, situação cadastral e demais dados vinculados à Unidade Consumidora do(a) outorgante;',
    )
    expect(html).toContain(
      'Praticar todos os atos necessários ao fiel cumprimento do presente mandato, incluindo assinar documentos, juntar requerimentos e interpor recursos administrativos perante a distribuidora.',
    )

    // 5. SEÇÃO VALIDADE (12 MESES)
    expect(html).toContain(
      'VALIDADE:</strong> A presente procuração é válida por 12 (doze) meses a contar da data de sua assinatura, podendo ser revogada a qualquer momento por escrito.',
    )

    // 6. FECHAMENTO E ASSINATURA COM LOCAL SERINGUEIRAS - RO E NOME/CPF REPETIDOS
    expect(html).toContain('SERINGUEIRAS – RO, 12 de março de 2025.')
    expect(html).toContain('Assinatura do(a) Outorgante')
    expect(html).toContain('Nome: _____________________________________________')
    expect(html).toContain('Maria Aparecida Santos')
    expect(html).toContain('CPF: 987.654.321-11')
  })

  it('deve usar BRASILEIRO como nacionalidade padrão e destacar variáveis ausentes na procuração', () => {
    const dadosVazios: DadosProcuracaoEnergisa = {
      clienteNome: '',
      clienteNacionalidade: '',
      clienteEstadoCivil: '',
      clienteProfissao: '',
      clienteCpfCnpj: '',
      clienteEndereco: '',
      clienteBairro: '',
      clienteCidade: '',
      clienteEstado: '',
      clienteCep: '',
    }

    const html = generateProcuracaoEnergisaHTML(dadosVazios)

    // Nacionalidade padrão BRASILEIRO
    expect(html).toContain('nacionalidade: BRASILEIRO')

    // Variáveis ausentes destacadas com field-missing
    expect(html).toContain('class="field-missing"')
    expect(html).toContain('{{nome_cliente}}')
    expect(html).toContain('{{cpf_cnpj}}')
    expect(html).toContain('{{endereco_logradouro}}')
    expect(html).toContain('{{bairro}}')
    expect(html).toContain('{{cidade}}')
    expect(html).toContain('{{estado}}')
    expect(html).toContain('{{cep}}')

    // Assinatura deve repetir marcadores
    expect(html).toContain('Assinatura do(a) Outorgante')
    expect(html).toContain('Nome: _____________________________________________')
  })

  it('deve validar datas de calendário e ajustar dia 31 em meses de 30 dias', () => {
    // 31 de junho (mês 6 = índice 5) -> deve ajustar para 30 de junho
    const dataJunhoInvalida = '2025-06-31'
    const formatado = formatarDataExtenso(dataJunhoInvalida, 'SERINGUEIRAS – RO')
    expect(formatado).toBe('SERINGUEIRAS – RO, 30 de junho de 2025')
  })

  it('deve destacar visualmente campos pendentes no documento quando não informados', () => {
    const dadosIncompletos: DadosContratoFormalizacao = {
      clienteNome: 'Cliente Sem Dados',
      clienteCpfCnpj: '',
      clienteNacionalidade: '',
      clienteEstadoCivil: '',
      clienteProfissao: '',
      clienteEndereco: '',
      clienteCidade: '',
      clienteEstado: '',
      clienteCep: '',
      clienteTelefone: '',
      clienteEmail: '',
      kitNome: 'Kit Padrão',
      potenciaKwp: '',
      kitFabricante: '',
      kitDescricao: '',
      valorTotal: 0,
      descontoAvista: 0,
      valorFinal: 0,
      condicoesPagamento: '',
      parcelaEntrada: 0,
      parcelaFinal: 0,
      detalhesParcelamento: '',
      cidadeAssinatura: 'Seringueiras',
      dataAssinatura: '',
      prazoInstalacaoDias: 45,
      garantiaInstalacaoMeses: 12,
    }

    const html = generateContratoHTML(dadosIncompletos)
    expect(html).toContain('class="field-missing"')
    expect(html).toContain('{{cpf_cnpj}}')
  })
})
