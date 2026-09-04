import pb from '@/lib/pocketbase/client'
import type { Lead, LeadStatus } from '@/types/crm'

export interface GetLeadsParams {
  page?: number
  perPage?: number
  search?: string
  status?: LeadStatus[]
  proprietario?: string
  sort?: string
}

export const LeadsService = {
  async getLeads({
    page = 1,
    perPage = 20,
    search,
    status,
    proprietario,
    sort = '-created',
  }: GetLeadsParams = {}) {
    const filterClauses: string[] = []

    if (search && search.trim()) {
      const s = search.trim().replace(/['"]/g, '')
      filterClauses.push(`(nome ~ "${s}" || email ~ "${s}")`)
    }

    if (status && status.length > 0) {
      const statusConditions = status.map((st) => `status = "${st}"`).join(' || ')
      filterClauses.push(`(${statusConditions})`)
    }

    if (proprietario && proprietario !== 'all') {
      filterClauses.push(`proprietario = "${proprietario}"`)
    }

    const filter = filterClauses.join(' && ')

    return await pb.collection('leads').getList<Lead>(page, perPage, {
      filter: filter || undefined,
      sort,
      expand: 'proprietario',
    })
  },

  async getAllLeads() {
    return await pb.collection('leads').getFullList<Lead>({
      sort: '-created',
      expand: 'proprietario',
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

  getFileUrl(lead: Lead, filename?: string) {
    if (!filename) return ''
    return pb.files.getURL(lead, filename)
  },
}
