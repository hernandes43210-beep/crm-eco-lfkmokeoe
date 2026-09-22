import fotoSolo from '@/assets/img20241218155418-9d402.jpg'
import fotoCarport from '@/assets/img20260120171159-492aa.jpg'
import fotoCarportBase from '@/assets/img20260120171233-b5ebf.jpg'
import fotoSoloDrone from '@/assets/djifly2025122011551801766246118755photolowquality-cc5df.jpg'
import fotoConjuntoResidencial from '@/assets/djifly2026022311340001771860840456photolowquality-6b731.jpg'
import fotoTelhadoMetalico from '@/assets/djifly2026022311352901771860929504photolowquality-6144a.jpg'
import fotoPostoBr from '@/assets/captura-de-tela-2026-09-17-112751-45b12.png'
import fotoAcademia from '@/assets/whatsapp-image-2026-09-08-at-21.36.47-927f9.jpeg'

export interface InstitutionalInstallationPhoto {
  id: string
  titulo: string
  legenda: string
  descricao: string
  tipo: 'solo' | 'carport' | 'fundacao' | 'residencial' | 'telhado' | 'estrutura' | 'comercial'
  tag: string
  local: string
  src: string
  publicUrl: string
}

export const INSTITUTIONAL_INSTALLATION_PHOTOS: InstitutionalInstallationPhoto[] = [
  {
    id: 'inst-carport-br',
    titulo: 'Carport Solar em Posto de Combustíveis Petrobras BR',
    legenda: 'Posto BR — Carport Solar Ecosolar',
    descricao:
      'Instalação de grande porte sobre pista de abastecimento e loja de conveniência com módulos de alta eficiência homologados pela Ecosolar Energy.',
    tipo: 'carport',
    tag: 'Carport Comercial',
    local: 'Posto BR — Rondônia / RO',
    src: fotoPostoBr,
    publicUrl: '/instalacoes/carport-posto-br.png',
  },
  {
    id: 'inst-telhado-academia',
    titulo: 'Usina Solar em Telhado de Grande Academia / Centro Comercial',
    legenda: 'Academia — Usina Fotovoltaica Comercial',
    descricao:
      'Arranjo fotovoltaico de telhado projetado para suprimir o alto consumo contínuo de climatização e maquinários da academia.',
    tipo: 'telhado',
    tag: 'Comercial / Telhado',
    local: 'Academia & Centro de Saúde — RO',
    src: fotoAcademia,
    publicUrl: '/instalacoes/telhado-academia.jpg',
  },
  {
    id: 'inst-solo-1',
    titulo: 'Instalação em Solo Rural de Alta Performance',
    legenda: 'Instalação em solo — Fazenda, RO',
    descricao:
      'Estrutura fotovoltaica de solo com aterramento técnico, alta resistência a ventos e geração contínua para unidade rural/produtiva.',
    tipo: 'solo',
    tag: 'Solo / Rural',
    local: 'Fazenda — Rondônia / RO',
    src: fotoSolo,
    publicUrl: '/instalacoes/instalacao-solo.jpg',
  },
  {
    id: 'inst-carport-2',
    titulo: 'Carport Solar com Cobertura Metálica Reforçada',
    legenda: 'Carport solar com estrutura metálica',
    descricao:
      'Garagem solar verde-escura com painéis solares na cobertura, gerando energia limpa enquanto abriga veículos (Toyota Hilux) e maquinários.',
    tipo: 'carport',
    tag: 'Carport Solar',
    local: 'Propriedade Rural — RO',
    src: fotoCarport,
    publicUrl: '/instalacoes/carport-solar.jpg',
  },
  {
    id: 'inst-carport-base-3',
    titulo: 'Detalhe da Fundação & Fixação do Carport',
    legenda: 'Detalhe da fundação do carport',
    descricao:
      'Base e pilar metálico com sapatas de concreto maciço e chumbamento químico de alta segurança, respeitando normas técnicas de engenharia.',
    tipo: 'fundacao',
    tag: 'Engenharia / Fundação',
    local: 'Engenharia Estrutural Ecosolar',
    src: fotoCarportBase,
    publicUrl: '/instalacoes/carport-base.jpg',
  },
  {
    id: 'inst-solo-drone-4',
    titulo: 'Usina Solar em Solo — Vista Aérea Especializada',
    legenda: 'Usina em solo — vista aérea',
    descricao:
      'Arranjo fotovoltaico em solo com inclinação angular otimizada, estrutura de aço galvanizado e vista de drone em área rural/verde.',
    tipo: 'solo',
    tag: 'Solo / Rural',
    local: 'Usina Rural — Rondônia / RO',
    src: fotoSoloDrone,
    publicUrl: '/instalacoes/usina-solo-drone.jpg',
  },
  {
    id: 'inst-residencial-5',
    titulo: 'Conjunto Residencial com Múltiplos Telhados Solares',
    legenda: 'Conjunto residencial — múltiplos telhados',
    descricao:
      'Instalação multi-telhado em condomínio com módulos de alta eficiência integrados a telhas cerâmicas e lajes planas impermeabilizadas.',
    tipo: 'residencial',
    tag: 'Residencial / Telhado',
    local: 'Condomínio Residencial — RO',
    src: fotoConjuntoResidencial,
    publicUrl: '/instalacoes/conjunto-residencial.jpg',
  },
  {
    id: 'inst-estrutura-6',
    titulo: 'Instalação em Telhado com Estrutura Metálica & Acabamento',
    legenda: 'Instalação em telhado — estrutura metálica',
    descricao:
      'Fixação técnica sobre telhado com estrutura metálica elevada, cabeamento em eletroduto antichama e vedação de alto padrão.',
    tipo: 'estrutura',
    tag: 'Engenharia / Estrutura',
    local: 'Engenharia de Telhado — Ecosolar',
    src: fotoTelhadoMetalico,
    publicUrl: '/instalacoes/telhado-estrutura-metalica.jpg',
  },
]
