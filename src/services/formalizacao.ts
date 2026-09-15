import pb from '@/lib/pocketbase/client'
import { FormalizacaoDocumento, FormalizacaoTipo, Lead, User } from '@/types/crm'
import { toPortugueseErrorMessage } from '@/lib/errors'

export interface SaveFormalizacaoPayload {
  lead: string
  tipo: FormalizacaoTipo
  titulo: string
  versao?: number
  dados_customizados: Record<string, unknown>
  conteudo_html: string
  arquivo_pdf_blob?: Blob
  criado_por?: string
}

export const FormalizacaoService = {
  async listByLead(leadId: string): Promise<FormalizacaoDocumento[]> {
    try {
      const records = await pb
        .collection('formalizacao_documentos')
        .getFullList<FormalizacaoDocumento>({
          filter: `lead = "${leadId}"`,
          sort: '-created',
          expand: 'criado_por,lead',
        })
      return records
    } catch (err) {
      console.error('Erro ao listar documentos de formalização:', err)
      return []
    }
  },

  async getLatestByLeadAndTipo(
    leadId: string,
    tipo: FormalizacaoTipo,
  ): Promise<FormalizacaoDocumento | null> {
    try {
      const records = await pb
        .collection('formalizacao_documentos')
        .getList<FormalizacaoDocumento>(1, 1, {
          filter: `lead = "${leadId}" && tipo = "${tipo}"`,
          sort: '-versao,-created',
          expand: 'criado_por',
        })
      return records.items[0] || null
    } catch {
      return null
    }
  },

  async saveDocumento(payload: SaveFormalizacaoPayload): Promise<FormalizacaoDocumento> {
    // Descobrir próxima versão
    let nextVersion = payload.versao || 1
    if (!payload.versao) {
      try {
        const existing = await this.listByLead(payload.lead)
        const sameTypeDocs = existing.filter((d) => d.tipo === payload.tipo)
        if (sameTypeDocs.length > 0) {
          const maxVersion = Math.max(...sameTypeDocs.map((d) => d.versao || 1))
          nextVersion = maxVersion + 1
        }
      } catch {
        nextVersion = 1
      }
    }

    const formData = new FormData()
    formData.append('lead', payload.lead)
    formData.append('tipo', payload.tipo)
    formData.append('titulo', payload.titulo)
    formData.append('versao', String(nextVersion))
    formData.append('dados_customizados', JSON.stringify(payload.dados_customizados || {}))
    formData.append('conteudo_html', payload.conteudo_html)

    const userId = payload.criado_por || pb.authStore.record?.id
    if (userId) {
      formData.append('criado_por', userId)
    }

    if (payload.arquivo_pdf_blob) {
      const isHtml = payload.arquivo_pdf_blob.type.includes('html')
      const ext = isHtml ? 'html' : 'pdf'
      const filename = `${payload.tipo}_${payload.lead.slice(-6)}_v${nextVersion}.${ext}`
      formData.append('arquivo_pdf', payload.arquivo_pdf_blob, filename)
    }

    let record: FormalizacaoDocumento

    try {
      // 1. Tenta salvar com o arquivo anexado
      record = await pb
        .collection('formalizacao_documentos')
        .create<FormalizacaoDocumento>(formData, {
          expand: 'criado_por',
        })
    } catch (err: any) {
      // Registrar detalhes do erro para diagnóstico rápido nos logs
      const responseData = err?.response?.data || err?.data
      console.error(
        '[FormalizacaoService.saveDocumento] Falha no create inicial com arquivo:',
        JSON.stringify(responseData || err?.message || err),
      )

      // Se falhou e tínhamos tentado enviar arquivo_pdf, tentar fallback SEM o arquivo
      // (o documento integral já está preservado no campo text conteudo_html)
      const isClient400 = err?.status === 400 || err?.response?.status === 400
      if (isClient400 && payload.arquivo_pdf_blob) {
        console.warn(
          '[FormalizacaoService.saveDocumento] Tentando fallback para salvar sem arquivo_pdf...',
        )
        try {
          const fallbackFormData = new FormData()
          fallbackFormData.append('lead', payload.lead)
          fallbackFormData.append('tipo', payload.tipo)
          fallbackFormData.append('titulo', payload.titulo)
          fallbackFormData.append('versao', String(nextVersion))
          fallbackFormData.append(
            'dados_customizados',
            JSON.stringify(payload.dados_customizados || {}),
          )
          fallbackFormData.append('conteudo_html', payload.conteudo_html)
          if (userId) {
            fallbackFormData.append('criado_por', userId)
          }

          record = await pb
            .collection('formalizacao_documentos')
            .create<FormalizacaoDocumento>(fallbackFormData, {
              expand: 'criado_por',
            })
          console.info(
            '[FormalizacaoService.saveDocumento] Salvo com sucesso via fallback (conteudo_html preservado).',
          )
        } catch (fallbackErr: any) {
          const fallbackData = fallbackErr?.response?.data || fallbackErr?.data
          console.error(
            '[FormalizacaoService.saveDocumento] Falha também no fallback sem arquivo:',
            JSON.stringify(fallbackData || fallbackErr?.message || fallbackErr),
          )
          const mensagemPt = toPortugueseErrorMessage(
            fallbackErr,
            'Não foi possível salvar o documento de formalização. Verifique os dados e tente novamente.',
          )
          const customErr = new Error(mensagemPt)
          ;(customErr as any).originalError = fallbackErr
          ;(customErr as any).response = fallbackErr?.response
          ;(customErr as any).data = fallbackErr?.data
          throw customErr
        }
      } else {
        const mensagemPt = toPortugueseErrorMessage(
          err,
          'Não foi possível salvar o documento de formalização. Verifique os dados e tente novamente.',
        )
        const customErr = new Error(mensagemPt)
        ;(customErr as any).originalError = err
        ;(customErr as any).response = err?.response
        ;(customErr as any).data = err?.data
        throw customErr
      }
    }

    // Registrar no histórico do lead
    try {
      const docLabel = payload.tipo === 'contrato' ? 'Contrato' : 'Procuração Energisa'
      const agora = new Date().toISOString()
      const leadRecord = await pb.collection('leads').getOne<Lead>(payload.lead)
      const historico = Array.isArray(leadRecord.historico) ? [...leadRecord.historico] : []

      historico.push({
        data: agora,
        tipo: 'fechamento',
        descricao: `${docLabel} finalizado e anexado à formalização (Versão ${nextVersion}).`,
      })

      await pb.collection('leads').update(payload.lead, { historico })
    } catch (histErr) {
      console.warn('Não foi possível gravar histórico no lead:', histErr)
    }

    return record
  },

  async deleteDocumento(id: string): Promise<boolean> {
    await pb.collection('formalizacao_documentos').delete(id)
    return true
  },

  getFileUrl(doc: FormalizacaoDocumento, filename?: string): string {
    const file = filename || doc.arquivo_pdf
    if (!file) return ''
    return pb.files.getURL(doc, file)
  },

  openPrintWindow(htmlContent: string, title: string = 'Documento de Formalização'): void {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Por favor, permita pop-ups para gerar e visualizar a impressão/PDF do documento.')
      return
    }

    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
      try {
        printWindow.print()
      } catch (e) {
        console.warn('Erro ao chamar print():', e)
      }
    }, 400)
  },
}
