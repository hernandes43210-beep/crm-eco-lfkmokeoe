import pb from '@/lib/pocketbase/client'
import type { Kit } from '@/types/crm'

export const KitsService = {
  async getKits() {
    return await pb.collection('kits').getFullList<Kit>({
      sort: 'potencia_kw',
    })
  },

  async getKitById(id: string) {
    return await pb.collection('kits').getOne<Kit>(id)
  },

  async createKit(data: Partial<Kit>) {
    return await pb.collection('kits').create<Kit>(data)
  },

  async updateKit(id: string, data: Partial<Kit> | FormData) {
    return await pb.collection('kits').update<Kit>(id, data)
  },

  async deleteKit(id: string) {
    return await pb.collection('kits').delete(id)
  },

  getKitImageUrl(
    kit: Kit | { id: string; imagem_ia?: string } | null | undefined,
    thumb?: string,
  ): string {
    if (!kit || !kit.id || !kit.imagem_ia) return ''
    return pb.files.getURL(kit as any, kit.imagem_ia, thumb ? { thumb } : undefined)
  },
}
