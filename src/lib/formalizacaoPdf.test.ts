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
      kitNome: 'Kit Solar Canadian 10.5 kWp',
      potenciaKwp: '10.5 kWp',
      kitFabricante: 'Canadian Solar / Deye',
      kitDescricao: 'Kit completo',
      tabelaEquipamentos: [
        {
          item: 'Módulos Fotovoltaicos 550W',
          quantidade: '20 un',
          fabricanteModelo: 'Canadian Solar BiHiKu7',
          especificacao: 'Garantia 25 anos',
        },
        {
          item: 'Inversor 10kW On-Grid',
          quantidade: '1 un',
          fabricanteModelo: 'Deye SUN-10K-G03',
          especificacao: 'Com monitoramento Wi-Fi',
        },
      ],
      valorTotal: 35000,
      descontoAvista: 1000,
      valorFinal: 34000,
      condicoesPagamento: 'Entrada + Saldo na instalação',
      parcelaEntrada: 17000,
      parcelaFinal: 17000,
      detalhesParcelamento: '50% na assinatura e 50% na conclusão.',
      cidadeAssinatura: 'Seringueiras - RO',
      dataAssinatura: 'Seringueiras - RO, 10 de maio de 2025',
      prazoInstalacaoDias: 45,
      garantiaInstalacaoMeses: 12,
    }

    const html = generateContratoHTML(dados)

    // Verifica dados fixos da Ecosolar
    expect(html).toContain(DADOS_FIXOS_ECOSOLAR.razaoSocial)
    expect(html).toContain(DADOS_FIXOS_ECOSOLAR.cnpj)
    expect(html).toContain(DADOS_FIXOS_ECOSOLAR.foro)
    expect(html).toContain('ENERGISA Distribuidora')

    // Verifica variáveis do cliente
    expect(html).toContain('João da Silva Sauro')
    expect(html).toContain('123.456.789-00')
    expect(html).toContain('Linha 105, Km 12')
    expect(html).toContain('10.5 kWp')

    // Verifica tabela de equipamentos
    expect(html).toContain('Canadian Solar BiHiKu7')
    expect(html).toContain('Deye SUN-10K-G03')
  })

  it('deve gerar procuração Energisa com outorgados fixos e poderes específicos', () => {
    const dados: DadosProcuracaoEnergisa = {
      clienteNome: 'Maria Aparecida Santos',
      clienteNacionalidade: 'Brasileira',
      clienteEstadoCivil: 'Solteira',
      clienteProfissao: 'Comerciante',
      clienteRg: '987654 SSP/RO',
      clienteCpfCnpj: '987.654.321-11',
      clienteEndereco: 'Av. Brasil, 450',
      clienteBairro: 'Centro',
      clienteCidade: 'São Miguel do Guaporé',
      clienteEstado: 'RO',
      clienteCep: '76932-000',
      concessionaria: 'ENERGISA RONDÔNIA – DISTRIBUIDORA DE ENERGIA S/A',
      cidadeAssinatura: 'Seringueiras – RO',
      dataAssinatura: 'Seringueiras – RO, 12 de março de 2025',
    }

    const html = generateProcuracaoEnergisaHTML(dados)

    // Verifica cliente
    expect(html).toContain('Maria Aparecida Santos')
    expect(html).toContain('987.654.321-11')
    expect(html).toContain('987654 SSP/RO')

    // Verifica outorgados fixos
    expect(html).toContain('WILLIAN DA COSTA GOVEIA')
    expect(html).toContain('CREA 26000217D RO')
    expect(html).toContain('HERNANDES DA SILVA COSTA')

    // Verifica poderes e concessionária
    expect(html).toContain('ENERGISA RONDÔNIA – DISTRIBUIDORA DE ENERGIA S/A')
    expect(html).toContain('Solicitar Consulta de Acesso, Informação de Acesso e Parecer de Acesso')
    expect(html).toContain('validade de <strong>12 (doze) meses</strong>')
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
    expect(html).toContain('[CPF/CNPJ]')
  })
})
