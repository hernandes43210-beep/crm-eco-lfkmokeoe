import fotoSolo from '@/assets/img20241218155418-9d402.jpg'
import fotoCarport from '@/assets/img20260120171159-492aa.jpg'
import fotoCarportBase from '@/assets/img20260120171233-b5ebf.jpg'

export interface InstitutionalInstallationPhoto {
  id: string
  titulo: string
  legenda: string
  descricao: string
  tipo: 'solo' | 'carport' | 'fundacao'
  tag: string
  local: string
  src: string
  publicUrl: string
}

export const INSTITUTIONAL_INSTALLATION_PHOTOS: InstitutionalInstallationPhoto[] = [
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
]
