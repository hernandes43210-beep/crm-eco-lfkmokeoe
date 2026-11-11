// Tipos agregados de resumo para o kit gerador
import type { ItemKitGerado, PainelLinha, InversorLinha, BateriaLinha } from '@/services/kitGerador'
import type { TipoInstalacao } from './logica'

export interface DadosResumo {
  kwp: number
  geracaoMensal: number | null
  coberturaPct: number | null
  kwCa: number
  linhaInversor: string
  areaM2: number
  tipoInstalacao: TipoInstalacao
  relacao: number | null
  itens: ItemKitGerado[]
  distribuidora: string
  custo: number
  precoVenda: number | null
  descontoRs: number
  precoFinal: number | null
  lucro: number
  margemPct: number
  paineisLinhas?: PainelLinha[]
  inversoresLinhas?: InversorLinha[]
  bateriasLinhas?: BateriaLinha[]
  outrosDadosPaineis?: string
  outrosDadosInversores?: string
  relacaoTipo?: 'sub' | 'ok' | 'sobre' | 'critica'
  ligacao?: string
}
