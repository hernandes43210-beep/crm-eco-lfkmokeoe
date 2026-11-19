import pb from '@/lib/pocketbase/client'

export const FnoFeriadosService = {
  /** Carrega todos os feriados bancários da coleção fno_feriados em tempo de execução. */
  async carregarFeriados(): Promise<Set<string>> {
    const set = new Set<string>()
    try {
      const rows = await pb.collection('fno_feriados').getFullList({
        sort: 'data',
        $autoCancel: false,
      } as never)
      for (const r of rows) {
        if (r?.data) set.add(String(r.data).substring(0, 10))
      }
    } catch (err) {
      // Coleção vazia ou sem acesso: segue sem feriados (só fim de semana).
      console.warn('[fnoFeriados] falha ao carregar feriados:', err)
    }
    return set
  },
}
