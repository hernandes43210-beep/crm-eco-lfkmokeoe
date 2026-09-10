import pb from '@/lib/pocketbase/client'
import type { Lead, LeadStatus } from '@/types/crm'

export interface GetLeadsParams {
  page?: number
  perPage?: number
  search?: string
  status?: LeadStatus[]
  proprietario?: string
  origem?: string
  statusQualificacao?: 'aguardando' | 'qualificado' | 'descartado' | 'all' | 'funil_ativo'
  sort?: string
}

export const LeadsService = {
  async getLeads({
    page = 1,
    perPage = 20,
    search,
    status,
    proprietario,
    origem,
    statusQualificacao = 'funil_ativo',
    sort = '-created',
  }: GetLeadsParams = {}) {
    const filterClauses: string[] = []

    if (search) {
      filterClauses.push(`(nome ~ "${search}" || email ~ "${search}" || telefone ~ "${search}")`)
    }

    if (status && status.length > 0) {
      const statusConditions = status.map((s) => `status = "${s}"`).join(' || ')
      filterClauses.push(`(${statusConditions})`)
    }

    if (proprietario) {
      filterClauses.push(`proprietario = "${proprietario}"`)
    }

    if (origem) {
      filterClauses.push(`origem = "${origem}"`)
    }

    if (statusQualificacao === 'aguardando') {
      filterClauses.push(`status_qualificacao = "aguardando"`)
    } else if (statusQualificacao === 'qualificado') {
      filterClauses.push(`status_qualificacao = "qualificado"`)
    } else if (statusQualificacao === 'descartado') {
      filterClauses.push(`status_qualificacao = "descartado"`)
    } else if (statusQualificacao === 'funil_ativo') {
      filterClauses.push(
        `status_qualificacao != "aguardando" && status_qualificacao != "descartado"`,
      )
    }
    // 'all' não adiciona restrição

    const filter = filterClauses.join(' && ')

    return pb.collection('leads').getList<Lead>(page, perPage, {
      filter,
      sort,
      expand: 'proprietario,qualificado_por',
    })
  },

  async getAllLeads(filter = '', sort = '-created') {
    return pb.collection('leads').getFullList<Lead>({
      filter,
      sort,
      expand: 'proprietario,qualificado_por',
    })
  },
  async getLeadById(id: string) {
    return await pb.collection('leads').getOne<Lead>(id, {
      expand: 'proprietario',
    })
  },

  async createLead(data: Partial<Lead>) {
    return await pb.collection('leads').create<Lead>(data)
  },

  async updateLead(id: string, data: Partial<Lead> | FormData) {
    return await pb.collection('leads').update<Lead>(id, data)
  },

  async deleteLead(id: string) {
    return await pb.collection('leads').delete(id)
  },

  async qualificar(
    id: string,
    usuario?: { id: string; nome?: string; email?: string },
  ): Promise<Lead> {
    const lead = await this.getLeadById(id)
    const historico = Array.isArray(lead.historico) ? [...lead.historico] : []

    const agora = new Date()
    const nomeResponsavel = usuario?.nome || usuario?.email || 'Administrador'
    const desc = `Lead qualificado por ${nomeResponsavel}. Transferido para o funil no estágio "Novo". SLA de 7 dias iniciado.`

    historico.push({
      data: agora.toISOString(),
      tipo: 'qualificacao',
      descricao: desc,
    })

    const slaDias = lead.sla_dias > 0 ? lead.sla_dias : 7
    const deadline = new Date(agora.getTime() + slaDias * 86400000)
    const slaLimiteIso = deadline.toISOString().replace('T', ' ').substring(0, 19) + 'Z'

    const payload: Record<string, unknown> = {
      status: 'Novo',
      status_qualificacao: 'qualificado',
      qualificado_em: agora.toISOString(),
      sla_dias: slaDias,
      sla_limite: slaLimiteIso,
      historico,
    }

    if (usuario?.id) {
      payload.qualificado_por = usuario.id
    }

    return pb.collection('leads').update<Lead>(id, payload)
  },

  async descartar(
    id: string,
    motivo: string,
    usuario?: { id: string; nome?: string; email?: string },
  ): Promise<Lead> {
    const lead = await this.getLeadById(id)
    const historico = Array.isArray(lead.historico) ? [...lead.historico] : []

    const agora = new Date()
    const nomeResponsavel = usuario?.nome || usuario?.email || 'Administrador'
    const motivoTexto = motivo?.trim() ? ` Motivo: "${motivo.trim()}"` : ''
    const desc = `Lead descartado da fila de qualificação por ${nomeResponsavel}.${motivoTexto}`

    historico.push({
      data: agora.toISOString(),
      tipo: 'descarte',
      descricao: desc,
    })

    const payload: Record<string, unknown> = {
      status_qualificacao: 'descartado',
      motivo_descarte: motivo || '',
      sla_limite: '',
      historico,
    }

    if (usuario?.id) {
      payload.qualificado_por = usuario.id
    }

    return pb.collection('leads').update<Lead>(id, payload)
  },

  async countAguardandoQualificacao(): Promise<number> {
    try {
      const res = await pb.collection('leads').getList(1, 1, {
        filter: 'status_qualificacao = "aguardando"',
        fields: 'id',
      })
      return res.totalItems
    } catch {
      return 0
    }
  },

  getFileUrl(lead: Lead, filename?: string) {
    if (!filename) return ''
    return pb.files.getURL(lead, filename)
  },
}
