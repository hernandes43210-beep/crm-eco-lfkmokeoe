import pb from '@/lib/pocketbase/client'
import type { LeadPhoto } from '@/types/crm'

/**
 * Redimensiona uma imagem para no máximo maxDimension (padrão 1600px) e converte em JPEG otimizado.
 */
export async function resizeImageToJpeg(
  file: File,
  maxDimension = 1600,
  quality = 0.85,
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Se não for imagem, devolve o arquivo original
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Falha ao decodificar imagem'))
      img.onload = () => {
        let { width, height } = img

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg'
            const resizedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(resizedFile)
          },
          'image/jpeg',
          quality,
        )
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export const LeadPhotosService = {
  async getPhotosByLead(leadId: string): Promise<LeadPhoto[]> {
    return await pb.collection('lead_photos').getFullList<LeadPhoto>({
      filter: `lead = "${leadId}"`,
      sort: 'ordem,created',
      expand: 'criado_por',
    })
  },

  async uploadPhoto(
    leadId: string,
    file: File,
    userId?: string,
    legenda?: string,
    ordem?: number,
  ): Promise<LeadPhoto> {
    const optimized = await resizeImageToJpeg(file, 1600, 0.85)

    const formData = new FormData()
    formData.append('lead', leadId)
    formData.append('foto', optimized)
    if (userId) formData.append('criado_por', userId)
    if (legenda) formData.append('legenda', legenda)
    if (typeof ordem === 'number') formData.append('ordem', String(ordem))

    return await pb.collection('lead_photos').create<LeadPhoto>(formData)
  },

  async deletePhoto(photoId: string): Promise<boolean> {
    return await pb.collection('lead_photos').delete(photoId)
  },

  getPhotoUrl(photo: LeadPhoto, thumb?: string): string {
    if (!photo || !photo.foto) return ''
    return pb.files.getURL(photo, photo.foto, thumb ? { thumb } : undefined)
  },
}
