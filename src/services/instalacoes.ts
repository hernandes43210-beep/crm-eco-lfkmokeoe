import pb from '@/lib/pocketbase/client'
import type { Lead, User, UserRole } from '@/types/crm'

export type InstalacaoStatus = 'pendente' | 'em_andamento' | 'concluida'

export interface InstalacaoInstalador {
  id: string
  lead: string
  instalador: string
  cliente_nome: string
  endereco_completo: string
  localizacao: string
  datasheets: string | null
  data_envio: string
  status: InstalacaoStatus
  observacoes: string
  enviado_por: string
  created: string
  updated: string
  expand?: {
    lead?: Lead
    instalador?: User
    enviado_por?: User
  }
}

/** Formato do JSON de datasheets enviado no modal (linhas nomeadas de equipamentos). */
export interface DatasheetItem {
  nome: string
  especificacao: string
}

export interface EnviarInstaladorPayload {
  leadId: string
  instaladorId: string
  clienteNome: string
  enderecoCompleto: string
  localizacao: string
  datasheets: DatasheetItem[]
}

export interface EnviarInstaladorResponse {
  success: boolean
  message: string
  instalacao_id?: string
  instalador?: { id: string; nome: string; email?: string }
  email_enviado: boolean
  email_erro?: string
  data_envio: string
}

export const ROTULOS_STATUS_INSTALACAO: Record<InstalacaoStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
}

/** Extrai itens de datasheet de um lead (painel/inversor quando houver). */
export function datasheetsDoLead(lead: Lead | null | undefined): DatasheetItem[] {
  if (!lead) return []
  const itens: DatasheetItem[] = []
  const leadAny = lead as unknown as Record<string, unknown>

  const painel = leadAny.painel || leadAny.paineis_modelo
  const inversor = leadAny.inversor || leadAny.inversor_marca
  const potencia = leadAny.potencia_total_kwp || leadAny.consumo_mensal_kwh

  if (painel) {
    itens.push({
      nome: 'Painel solar',
      especificacao: String(painel),
    })
  }
  if (inversor) {
    itens.push({
      nome: 'Inversor',
      especificacao: String(inversor),
    })
  }
  if (potencia) {
    itens.push({
      nome: 'Potência do sistema',
      especificacao: `${String(potencia)} kWp (aproximado)`,
    })
  }
  return itens
}

export const InstalacoesService = {
  /** Lista instalações. Para instalador o filtro é opcional (RLS já restringe). */
  async listar(onlyInstaladorId?: string): Promise<InstalacaoInstalador[]> {
    try {
      const options: { sort: string; requestKey: null; expand: string; filter?: string } = {
        sort: '-created',
        requestKey: null,
        expand: 'lead,instalador,enviado_por',
      }
      if (onlyInstaladorId) {
        options.filter = `instalador = "${onlyInstaladorId}"`
      }
      return await pb
        .collection('instalacoes_instalador')
        .getFullList<InstalacaoInstalador>(options)
    } catch (err) {
      console.error('Erro ao listar instalações:', err)
      return []
    }
  },

  /** Atualiza status/observações da instalação (permitido ao instalador dono pela RLS). */
  async atualizar(
    id: string,
    dados: { status?: InstalacaoStatus; observacoes?: string },
  ): Promise<InstalacaoInstalador> {
    return await pb.collection('instalacoes_instalador').update<InstalacaoInstalador>(id, dados)
  },

  /** Lista usuários com role 'Instalador' ativos (para o select do modal). */
  async getInstaladores(): Promise<User[]> {
    try {
      return await pb.collection('users').getFullList<User>({
        filter: "(role = 'Instalador') && (ativo = true || ativo = null)",
        sort: 'name,email',
        requestKey: null,
      })
    } catch (err) {
      console.error('Erro ao buscar instaladores:', err)
      return []
    }
  },

  /** Dispara o endpoint backend que cria a instalação e envia e-mail com contrato. */
  async enviar(payload: EnviarInstaladorPayload): Promise<EnviarInstaladorResponse> {
    return await pb.send<EnviarInstaladorResponse>('/backend/v1/instalacoes/enviar-instalador', {
      method: 'POST',
      body: payload,
    })
  },
}
