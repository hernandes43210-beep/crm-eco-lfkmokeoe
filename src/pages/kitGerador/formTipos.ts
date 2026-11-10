// Tipos usados no formulário do Kit Gerador
import type { PainelLinha, InversorLinha, TipoInversor, ItemListaKit } from '@/services/kitGerador'
import type { TipoInstalacao, Ligacao } from './logica'
import { itensPadrao } from './itensPadrao'

export interface PainelItemForm {
  id: string
  modo: 'catalogo' | 'manual' | 'livre'
  catalogoId?: string
  marca: string
  modelo: string
  potenciaW: number
  areaM2: number
  qtd: number
}

export interface InversorItemForm {
  id: string
  modo: 'catalogo' | 'manual' | 'livre'
  catalogoId?: string
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

export function estadoInicial(
  paineis?: Array<{
    id: string
    marca: string
    modelo: string
    potencia_w: number
    area_m2: number
  }>,
  inversores?: Array<{
    id: string
    marca: string
    modelo: string
    potencia_kw: number
    tipo: TipoInversor
  }>,
  distribuidoras?: Array<{ id: string; nome: string }>,
): EstadoForm {
  return {
    consumo: '600',
    sol: '4.5',
    perdas: '20',
    ligacao: 'Trifásica',
    painelLinhas:
      paineis && paineis.length > 0
        ? [
            {
              id: 'p-1',
              modo: 'catalogo',
              catalogoId: paineis[0].id,
              marca: paineis[0].marca,
              modelo: paineis[0].modelo,
              potenciaW: paineis[0].potencia_w,
              areaM2: paineis[0].area_m2,
              qtd: 10,
            },
          ]
        : [linhaPainelInicial()],
    outrosDadosPaineis: '',
    inversorLinhas:
      inversores && inversores.length > 0
        ? [
            {
              id: 'inv-1',
              modo: 'catalogo',
              catalogoId: inversores[0].id,
              marca: inversores[0].marca,
              modelo: inversores[0].modelo,
              potenciaKw: inversores[0].potencia_kw,
              tipo: inversores[0].tipo,
              qtd: 1,
            },
          ]
        : [linhaInversorInicial()],
    outrosDadosInversores: '',
    tipoInstalacao: 'Fibrocimento',
    distribuidora: distribuidoras && distribuidoras.length > 0 ? distribuidoras[0].nome : '',
    distribuidoraNova: '',
    itens: itensPadrao(),
    custo: '',
    acrescimoPct: '40',
    descontoTipo: 'R$',
    descontoValor: '',
  }
}
