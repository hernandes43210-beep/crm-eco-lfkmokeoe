/**
 * Constantes institucionais de contato e identificação da Ecosolar Energy.
 * Centraliza dados oficiais de telefone, WhatsApp, e-mail e atendimento ao cliente.
 */

export const CONTATO_ECOSOLAR = {
  // Telefone / WhatsApp oficial da empresa e consultor
  telefoneExibicao: '69 992346989',
  telefoneFormatado: '(69) 99234-6989',
  whatsappRaw: '69992346989',
  whatsappDDI: '5569992346989',
  whatsappLink: 'https://wa.me/5569992346989',

  // E-mail oficial do consultor / suporte comercial
  email: 'ecosolarenergy2022@gmail.com',

  // Portal / site institucional
  website: 'ecosolarenergy.com.br',

  // Mensagem padrão para contato sobre renovação de proposta expirada
  gerarMensagemRenovacaoProposta: (proposalNumber: string) =>
    `Olá! Estou no link da proposta comercial Nº ${proposalNumber} da Ecosolar Energy e gostaria de solicitar uma renovação do prazo de validade das condições.`,

  // Link wa.me pronto para proposta específica
  gerarLinkWhatsAppProposta: (proposalNumber: string) => {
    const texto = `Olá! Estou no link da proposta comercial Nº ${proposalNumber} da Ecosolar Energy e gostaria de solicitar uma renovação do prazo de validade das condições.`
    return `https://wa.me/5569992346989?text=${encodeURIComponent(texto)}`
  },
} as const
