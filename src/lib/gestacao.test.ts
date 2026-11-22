import { describe, it, expect } from 'vitest'
import {
  analisarContracoes,
  comIntervalos,
  formatarDuracao,
  formatarDuracaoCurta,
  idadeGestacional,
  dumAPartirDaDpp,
  paraIsoLocal,
  parseDataLocal,
  resumoJanela,
  statusMovimentos,
  tamanhoBebe,
  MINUTO,
  HORA,
  type Contracao,
} from './gestacao'

const T0 = new Date(2026, 10, 22, 8, 0, 0).getTime()

/** Gera contrações a cada `intervalo` ms, cada uma durando `dur` ms */
function serie(n: number, intervalo: number, dur: number, inicio = T0): Contracao[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    inicio: inicio + i * intervalo,
    fim: inicio + i * intervalo + dur,
  }))
}

describe('formatação', () => {
  it('formata cronômetro', () => {
    expect(formatarDuracao(0)).toBe('00:00')
    expect(formatarDuracao(65_000)).toBe('01:05')
    expect(formatarDuracao(HORA + 2_000)).toBe('1:00:02')
  })
  it('formata duração curta', () => {
    expect(formatarDuracaoCurta(45_000)).toBe('45 s')
    expect(formatarDuracaoCurta(65_000)).toBe('1 min 05 s')
    expect(formatarDuracaoCurta(HORA + 5 * MINUTO)).toBe('1 h 05 min')
  })
})

describe('contrações', () => {
  it('calcula intervalos início a início', () => {
    const r = comIntervalos(serie(3, 4 * MINUTO, 60_000))
    expect(r.map((c) => c.intervalo)).toEqual([null, 4 * MINUTO, 4 * MINUTO])
  })

  it('resume a última hora ignorando a contração em andamento', () => {
    const lista = [...serie(4, 5 * MINUTO, 50_000), { id: 'x', inicio: T0 + 20 * MINUTO, fim: null }]
    const r = resumoJanela(lista, T0 + 21 * MINUTO)
    expect(r.quantidade).toBe(4)
    expect(r.duracaoMedia).toBe(50_000)
    expect(r.intervaloMedio).toBe(5 * MINUTO)
  })

  it('sem contrações → nenhum', () => {
    expect(analisarContracoes([], T0).nivel).toBe('nenhum')
  })

  it('padrão antigo expira', () => {
    const lista = serie(5, 4 * MINUTO, 60_000)
    expect(analisarContracoes(lista, T0 + 3 * HORA).nivel).toBe('nenhum')
  })

  it('irregulares → observar', () => {
    const lista = serie(4, 12 * MINUTO, 40_000)
    const agora = lista[3].fim! + MINUTO
    expect(analisarContracoes(lista, agora).nivel).toBe('observar')
  })

  it('regular há menos de 1 h → formando', () => {
    const lista = serie(6, 4 * MINUTO, 65_000) // 20 min de padrão
    const agora = lista[5].fim! + 10_000
    const a = analisarContracoes(lista, agora)
    expect(a.nivel).toBe('formando')
    expect(a.tempoNoPadrao).toBe(20 * MINUTO)
  })

  it('5-1-1 por 1 h → ir_hospital', () => {
    const lista = serie(17, 4 * MINUTO, 62_000) // 64 min de padrão
    const agora = lista[16].fim! + 10_000
    expect(analisarContracoes(lista, agora).nivel).toBe('ir_hospital')
  })

  it('contrações curtas não disparam 5-1-1', () => {
    const lista = serie(17, 4 * MINUTO, 30_000)
    const agora = lista[16].fim! + 10_000
    expect(analisarContracoes(lista, agora).nivel).toBe('observar')
  })

  it('um intervalo longo reinicia a sequência', () => {
    const antes = serie(10, 4 * MINUTO, 60_000)
    const depois = serie(4, 4 * MINUTO, 60_000, T0 + 60 * MINUTO)
    const lista = [...antes, ...depois]
    const agora = depois[3].fim! + 1000
    const a = analisarContracoes(lista, agora)
    expect(a.nivel).toBe('formando')
    expect(a.tempoNoPadrao).toBe(12 * MINUTO)
  })
})

describe('movimentos', () => {
  it('detecta meta e prazo', () => {
    const movs = Array.from({ length: 10 }, (_, i) => T0 + (i + 1) * 3 * MINUTO)
    const s = statusMovimentos({ id: '1', inicio: T0, fim: null, movimentos: movs }, T0 + HORA)
    expect(s.metaAtingida).toBe(true)
    expect(s.tempoAteMeta).toBe(30 * MINUTO)

    const s2 = statusMovimentos({ id: '2', inicio: T0, fim: null, movimentos: [T0 + 1000] }, T0 + 2 * HORA)
    expect(s2.prazoEstourado).toBe(true)
  })
})

describe('idade gestacional', () => {
  it('calcula semanas, dias, DPP e trimestre', () => {
    const dum = parseDataLocal('2026-05-01')!
    const ig = idadeGestacional(dum, new Date(2026, 10, 22))
    expect(ig.totalDias).toBe(205)
    expect(ig.semanas).toBe(29)
    expect(ig.dias).toBe(2)
    expect(ig.trimestre).toBe(3)
    expect(paraIsoLocal(ig.dpp)).toBe('2027-02-05')
    expect(ig.diasRestantes).toBe(75)
  })

  it('converte DPP em DUM', () => {
    expect(paraIsoLocal(dumAPartirDaDpp(parseDataLocal('2027-02-05')!))).toBe('2026-05-01')
  })

  it('rejeita datas inválidas', () => {
    expect(parseDataLocal('abc')).toBeNull()
  })

  it('tamanho do bebê', () => {
    expect(tamanhoBebe(2)).toBeNull()
    expect(tamanhoBebe(21)).toBe('uma banana')
  })
})
