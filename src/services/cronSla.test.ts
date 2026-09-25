import { describe, it, expect } from 'vitest'
import pb from '@/lib/pocketbase/client'

describe('Admin Cron SLA Trigger', () => {
  it('executa sem erro e processa leads em atraso', async () => {
    // Login com o admin seeded
    await pb.collection('users').authWithPassword('hernandes43210@gmail.com', 'Skip@Pass')
    const res = await fetch(`${pb.baseUrl}/backend/v1/admin/test-cron-sla`, {
      method: 'POST',
      headers: {
        Authorization: pb.authStore.token,
      },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    console.log('[TEST SLA RESULT]', data)
  })
})
