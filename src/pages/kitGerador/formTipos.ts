// Tipos usados no formulário do Kit Gerador
import type { PainelLinha, InversorLinha, TipoInversor, ItemListaKit } from '@/services/kitGerador'
import type { TipoInstalacao, Ligacao } from './logica'
import { itensPadrao } from './itensPadrao'

export interface PainelItemForm {
  id: string
  modo: 'catalogo' | 'manual'
  marca: string
  modelo: string
  potenciaW: number
  areaM2: number
  qtd: number
}

export interface InversorItemForm {
  id: string
  modo: 'catalogo' | 'manual'
  marca: string
  modelo: string
  potenciaKw: number
  tipo: TipoInversor
  qtd: number
}

export interface EstadoForm {
  // Perfil
  consumo: string
  sol: string
  perdas: string
  ligacao: Ligacao

  // Painéis múltiplos
  painelLinhas: PainelItemForm[]
  outrosDadosPaineis: string

  // Inversores múltiplos
  inversorLinhas: InversorItemForm[]
  outrosDadosInversores: string

  // Estrutura
  tipoInstalacao: TipoInstalacao
  distribuidora: string
  distribuidoraNova: string
  itens: ItemListaKit[]

  // Comercial
  custo: string
  acrescimoPct: string
  descontoTipo: '%' | 'R$'
  descontoValor: string
}

export function linhaPainelInicial(): PainelItemForm {
  return {
    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    modo: 'catalogo',
    marca: 'Canadian',
    modelo: 'CS6W-550MS',
    potenciaW: 550,
    areaM2: 2.79,
    qtd: 10,
  }
}

export function linhaInversorInicial(): InversorItemForm {
  return {
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    modo: 'catalogo',
    marca: 'Sungrow',
    modelo: 'SG5.0RS',
    potenciaKw: 5,
    tipo: 'Monofásico',
    qtd: 1,
  }
}

export const estadoInicial: EstadoForm = {
  consumo: '600',
  sol: '4.5',
  perdas: '20',
  ligacao: 'Trifásica',
  painelLinhas: paineis && paineis.length > 0
    ? [{
        id: 'p-1',
        modo: 'catalogo',
        catalogoId: paineis[0].id,
        marca: paineis[0].marca,
        modelo: paineis[0].modelo,
        potenciaW: paineis[0].potencia_w,
        areaM2: paineis[0].area_m2,
        qtd: 10,
      }]
    : [linhaPainelInicial()],
  outrosDadosPaineis: '',
  inversorLinhas: inversores && inversores.length > 0
    ? [{
        id: 'inv-1',
        modo: 'catalogo',
        catalogoId: inversores[0].id,
        marca: inversores[0].marca,
        modelo: inversores[0].modelo,
        potenciaKw: inversores[0].potencia_kw,
        tipo: inversores[0].tipo,
        qtd: 1,
      }]
    : [linhaInversorInicial()],
  outrosDadosInversores: '',
  tipoInstalacao: 'Fibrocimento',
  distribuidora: '',
  distribuidoraNova: '',
  itens: itensPadrao(),
  custo: '',
  acrescimoPct: '40',
  descontoTipo: 'R$',
  descontoValor: '',
}
