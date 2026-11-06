// Itens padrão do cartão 4 — nomes no formato do texto de WhatsApp/comunicacao Ecosolar.
import type { TipoInstalacao } from './logica'

export interface ItemLinha {
  nome: string
  qtd: number
  incluido: boolean
  padrao: boolean
}

export const ROTULO_INSTALACAO: Record<TipoInstalacao, string> = {
  Fibrocimento: 'telhado de fibrocimento',
  Cerâmico: 'telhado cerâmico',
  Metálico: 'telha metálica trapezoidal',
  Laje: 'laje de concreto',
  Solo: 'estrutura de solo',
  'Solo monoposte': 'solo monoposte',
  Carport: 'carport (estacionamento)',
}

export const itensPadrao = (qtdInversores: number, tipo: TipoInstalacao): ItemLinha[] => [
  {
    nome: 'String box (proteção CC/CA) — DPS contra surtos e sobrecorrente',
    qtd: qtdInversores,
    incluido: true,
    padrao: true,
  },
  {
    nome: `Estrutura para ${ROTULO_INSTALACAO[tipo]} — perfis de alumínio + fixação inox`,
    qtd: 1,
    incluido: true,
    padrao: true,
  },
  {
    nome: 'Cabos solares e conectores MC4 — dupla isolação, proteção UV, IP68',
    qtd: 1,
    incluido: true,
    padrao: true,
  },
  { nome: 'Monitoramento Wi-Fi 24 h — app iOS e Android', qtd: 1, incluido: true, padrao: true },
  {
    nome: 'Projeto, ART e homologação — engenheiro eletricista responsável',
    qtd: 1,
    incluido: true,
    padrao: true,
  },
  {
    nome: 'Instalação NR10/NR35 — mão de obra da equipe Ecosolar',
    qtd: 1,
    incluido: true,
    padrao: true,
  },
]
