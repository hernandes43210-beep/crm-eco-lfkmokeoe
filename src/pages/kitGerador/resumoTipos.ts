// Tipos agregados de resumo para o kit gerador
import type { ItemKitGerado, PainelLinha, InversorLinha } from '@/services/kitGerador'
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
  outrosDadosPaineis?: string
  outrosDadosInversores?: string
}
