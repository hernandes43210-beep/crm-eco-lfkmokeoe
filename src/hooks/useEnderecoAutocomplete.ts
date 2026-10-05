/**
 * Lista de Unidades Federativas do Brasil (sigla e nome)
 */
export const ESTADOS_BRASILEIROS = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
] as const

export const UFS_BRASIL = ESTADOS_BRASILEIROS.map((e) => e.sigla)

export interface LeadEnderecoBase {
  estado?: string | null
  cidade?: string | null
  cep?: string | null
}

export interface UseEnderecoAutocompleteOptions {
  leadSalvo?: LeadEnderecoBase | null
  estadoInicial?: string
  cidadeInicial?: string
  cepInicial?: string
  onEstadoChange?: (novoEstado: string) => void
  onCidadeChange?: (novaCidade: string) => void
  onCepChange?: (novoCep: string) => void
}

/**
 * Função utilitária pura para obter cidade e CEP correspondentes à nova UF.
 * Se a nova UF for igual à do cadastro salvo do lead, retorna a cidade e o CEP salvos.
 * Se diferente ou sem dados salvos para essa UF, retorna valores vazios ('').
 */
export function obterEnderecoPorEstado(
  novaUf: string,
  leadSalvo?: LeadEnderecoBase | null,
): { cidade: string; cep: string } {
  const ufNormalizada = (novaUf || '').trim().toUpperCase()
  const ufSalvaNormalizada = (leadSalvo?.estado || '').trim().toUpperCase()

  if (ufNormalizada && ufNormalizada === ufSalvaNormalizada) {
    return {
      cidade: leadSalvo?.cidade || '',
      cep: leadSalvo?.cep || '',
    }
  }

  return {
    cidade: '',
    cep: '',
  }
}
