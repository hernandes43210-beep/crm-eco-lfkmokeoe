import { describe, it, expect } from 'vitest'
import pb from './pocketbase/client'

describe('temp diagnose test', () => {
  it('calls diagnose endpoint', async () => {
    try {
      const res = await pb.send('/backend/v1/custom-diagnose-formalizacao', {
        method: 'POST',
      })
      console.log('Diagnose output:', JSON.stringify(res, null, 2))
    } catch (e: any) {
      console.error('Diagnose call failed:', e)
    }
  })
})
