import { describe, it, expect } from 'vitest'
import pb from './pocketbase/client'

describe('formalizacao_documentos create test', () => {
  it('diagnoses create call with exact payload', async () => {
    // 1. Authenticate with admin user
    try {
      const authData = await pb
        .collection('users')
        .authWithPassword('hernandes43210@gmail.com', 'Skip@Pass')
      console.log('Authenticated as:', authData.record.email, authData.record.id)
    } catch (err: any) {
      console.error('Auth error:', err?.message, err?.response)
      throw err
    }

    // 2. Fetch a lead
    const lead = await pb.collection('leads').getFirstListItem('')
    console.log('Found lead:', lead.id, lead.nome)

    // 3. Prepare FormData
    const formData = new FormData()
    formData.append('lead', lead.id)
    formData.append('tipo', 'contrato')
    formData.append('titulo', `Contrato de Instalação Fotovoltaica — ${lead.nome}`)
    formData.append('versao', '1')
    formData.append('dados_customizados', JSON.stringify({ clienteNome: lead.nome }))
    formData.append('conteudo_html', '<!DOCTYPE html><html><body><h1>Teste</h1></body></html>')
    formData.append('criado_por', pb.authStore.record?.id || '')

    const htmlBlob = new Blob(['<!DOCTYPE html><html><body><h1>Teste</h1></body></html>'], {
      type: 'text/html',
    })
    formData.append('arquivo_pdf', htmlBlob, `contrato_${lead.id.slice(-6)}_v1.html`)

    try {
      const record = await pb.collection('formalizacao_documentos').create(formData, {
        expand: 'criado_por',
      })
      console.log('Create succeeded! Record ID:', record.id)
      // Cleanup
      await pb.collection('formalizacao_documentos').delete(record.id)
    } catch (err: any) {
      console.error('CREATE FAILED! Status:', err?.status)
      console.error('Response data:', JSON.stringify(err?.response?.data, null, 2))
      console.error('Response object:', JSON.stringify(err?.response, null, 2))
      console.error('Full err:', err)
      throw err
    }
  })
})
