/* Lógica pura do app "Gestante": contrações (regra 5-1-1), contador de movimentos e idade gestacional */

export type Intensidade = 'leve' | 'moderada' | 'forte'

export interface Contracao {
  id: string
  inicio: number // epoch ms
  fim: number | null // null = em andamento
  intensidade?: Intensidade
}

export interface SessaoMovimentos {
  id: string
  inicio: number
  fim: number | null
  movimentos: number[] // timestamps de cada movimento
}

export const MINUTO = 60_000
export const HORA = 60 * MINUTO
export const DIA = 24 * HORA

/** Parâmetros da regra 5-1-1: a cada 5 min, durando 1 min, por 1 hora */
export const REGRA_511 = {
  intervaloMax: 5 * MINUTO,
  duracaoMin: 60_000,
  sustentadoPor: HORA,
}

/** Após esse tempo sem nova contração consideramos que o padrão "esfriou" */
export const PADRAO_EXPIRA = 15 * MINUTO

export const META_MOVIMENTOS = 10
export const PRAZO_MOVIMENTOS = 2 * HORA

// ---------------------------------------------------------------- formatação

export function formatarDuracao(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Versão legível: "1 min 05 s", "45 s" */
export function formatarDuracaoCurta(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m === 0) return `${s} s`
  if (m >= 60) return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`
  return `${m} min ${String(s).padStart(2, '0')} s`
}

export function formatarHora(ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ---------------------------------------------------------------- contrações

/** Ordena por início (mais antiga primeiro) e mantém só as finalizadas */
export function concluidas(lista: Contracao[]): Contracao[] {
  return lista.filter((c) => c.fim !== null).sort((a, b) => a.inicio - b.inicio)
}

export function duracao(c: Contracao, agora = Date.now()): number {
  return (c.fim ?? agora) - c.inicio
}

/** Intervalo (início a início) de cada contração em relação à anterior. A primeira não tem intervalo. */
export function comIntervalos(lista: Contracao[]): Array<Contracao & { intervalo: number | null }> {
  const ordenadas = [...lista].sort((a, b) => a.inicio - b.inicio)
  return ordenadas.map((c, i) => ({
    ...c,
    intervalo: i === 0 ? null : c.inicio - ordenadas[i - 1].inicio,
  }))
}

function media(valores: number[]): number | null {
  if (valores.length === 0) return null
  return valores.reduce((a, b) => a + b, 0) / valores.length
}

export interface ResumoJanela {
  quantidade: number
  duracaoMedia: number | null
  intervaloMedio: number | null
}

/** Resumo das contrações concluídas que começaram dentro da janela (padrão: última hora) */
export function resumoJanela(lista: Contracao[], agora = Date.now(), janela = HORA): ResumoJanela {
  const todas = comIntervalos(concluidas(lista))
  const naJanela = todas.filter((c) => c.inicio >= agora - janela)
  return {
    quantidade: naJanela.length,
    duracaoMedia: media(naJanela.map((c) => duracao(c))),
    intervaloMedio: media(naJanela.map((c) => c.intervalo).filter((v): v is number => v !== null)),
  }
}

export type NivelAlerta = 'nenhum' | 'observar' | 'formando' | 'ir_hospital'

export interface AnaliseContracoes {
  nivel: NivelAlerta
  titulo: string
  mensagem: string
  /** Há quanto tempo o padrão regular (intervalo ≤ 5 min) está sendo mantido */
  tempoNoPadrao: number
}

/**
 * Avalia a regra 5-1-1.
 * "Sequência regular" = maior sequência final de contrações em que cada intervalo ≤ 5 min.
 * - ir_hospital: sequência dura ≥ 1 h e a duração média nela é ≥ 1 min
 * - formando: as últimas 3+ contrações já seguem o padrão, mas ainda não completou 1 h
 * - observar: há contrações recentes, mas sem padrão regular
 */
export function analisarContracoes(lista: Contracao[], agora = Date.now()): AnaliseContracoes {
  const todas = comIntervalos(concluidas(lista))
  const ultima = todas[todas.length - 1]

  if (!ultima || agora - (ultima.fim ?? ultima.inicio) > PADRAO_EXPIRA) {
    return {
      nivel: 'nenhum',
      titulo: 'Sem padrão no momento',
      mensagem: 'Registre suas contrações tocando no botão no início e no fim de cada uma.',
      tempoNoPadrao: 0,
    }
  }

  // sequência regular final
  let inicioSeq = todas.length - 1
  while (inicioSeq > 0 && (todas[inicioSeq].intervalo ?? Infinity) <= REGRA_511.intervaloMax) {
    inicioSeq--
  }
  const sequencia = todas.slice(inicioSeq)
  const tempoNoPadrao = sequencia.length > 1 ? ultima.inicio - sequencia[0].inicio : 0
  const duracaoMediaSeq = media(sequencia.map((c) => duracao(c))) ?? 0
  const regular = sequencia.length >= 3 && duracaoMediaSeq >= REGRA_511.duracaoMin

  if (regular && tempoNoPadrao >= REGRA_511.sustentadoPor) {
    return {
      nivel: 'ir_hospital',
      titulo: 'Regra 5-1-1 atingida',
      mensagem:
        'Contrações a cada 5 minutos ou menos, durando cerca de 1 minuto, há pelo menos 1 hora. Entre em contato com sua equipe médica / maternidade.',
      tempoNoPadrao,
    }
  }
  if (regular) {
    return {
      nivel: 'formando',
      titulo: 'Padrão regular se formando',
      mensagem: `Contrações regulares há ${formatarDuracaoCurta(tempoNoPadrao)}. Continue cronometrando — ao completar 1 hora neste ritmo, é hora de ligar para a maternidade.`,
      tempoNoPadrao,
    }
  }
  return {
    nivel: 'observar',
    titulo: 'Contrações ainda irregulares',
    mensagem: 'Continue registrando. Contrações irregulares ou que diminuem com repouso podem ser de treinamento (Braxton Hicks).',
    tempoNoPadrao,
  }
}

/** Texto para compartilhar com a equipe médica */
export function relatorioTexto(lista: Contracao[], agora = Date.now()): string {
  const resumo = resumoJanela(lista, agora)
  const analise = analisarContracoes(lista, agora)
  const ultimas = comIntervalos(concluidas(lista)).slice(-12).reverse()
  const linhas = [
    `Relatório de contrações — ${new Date(agora).toLocaleString('pt-BR')}`,
    `Última hora: ${resumo.quantidade} contrações`,
    `Duração média: ${resumo.duracaoMedia !== null ? formatarDuracaoCurta(resumo.duracaoMedia) : '—'}`,
    `Intervalo médio: ${resumo.intervaloMedio !== null ? formatarDuracaoCurta(resumo.intervaloMedio) : '—'}`,
    `Situação: ${analise.titulo}`,
    '',
    'Últimas contrações (início · duração · intervalo):',
    ...ultimas.map(
      (c) =>
        `${formatarHora(c.inicio)} · ${formatarDuracaoCurta(duracao(c))} · ${c.intervalo !== null ? formatarDuracaoCurta(c.intervalo) : '—'}${c.intensidade ? ` · ${c.intensidade}` : ''}`,
    ),
  ]
  return linhas.join('\n')
}

// ---------------------------------------------------------------- movimentos

export interface StatusMovimentos {
  contagem: number
  decorrido: number
  metaAtingida: boolean
  tempoAteMeta: number | null
  prazoEstourado: boolean
}

export function statusMovimentos(s: SessaoMovimentos, agora = Date.now()): StatusMovimentos {
  const contagem = s.movimentos.length
  const metaAtingida = contagem >= META_MOVIMENTOS
  const tempoAteMeta = metaAtingida ? s.movimentos[META_MOVIMENTOS - 1] - s.inicio : null
  const decorrido = (s.fim ?? agora) - s.inicio
  return {
    contagem,
    decorrido,
    metaAtingida,
    tempoAteMeta,
    prazoEstourado: !metaAtingida && decorrido >= PRAZO_MOVIMENTOS,
  }
}

// ---------------------------------------------------------------- idade gestacional

export const DURACAO_GESTACAO_DIAS = 280

/** Converte "AAAA-MM-DD" para meia-noite local (evita deslocamento de fuso do Date.parse) */
export function parseDataLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

export function paraIsoLocal(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function diasEntre(a: Date, b: Date): number {
  // usa UTC dos componentes locais para ignorar horário de verão
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((ub - ua) / DIA)
}

export function somarDias(d: Date, dias: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias)
}

export interface IdadeGestacional {
  semanas: number
  dias: number
  totalDias: number
  dpp: Date
  diasRestantes: number
  trimestre: 1 | 2 | 3
  progresso: number // 0..100
}

/** Calcula IG a partir da DUM (data da última menstruação) — regra de Naegele */
export function idadeGestacional(dum: Date, hoje = new Date()): IdadeGestacional {
  const totalDias = diasEntre(dum, hoje)
  const semanas = Math.floor(totalDias / 7)
  const dpp = somarDias(dum, DURACAO_GESTACAO_DIAS)
  return {
    semanas,
    dias: ((totalDias % 7) + 7) % 7,
    totalDias,
    dpp,
    diasRestantes: diasEntre(hoje, dpp),
    trimestre: semanas < 14 ? 1 : semanas < 28 ? 2 : 3,
    progresso: Math.min(100, Math.max(0, (totalDias / DURACAO_GESTACAO_DIAS) * 100)),
  }
}

export function dumAPartirDaDpp(dpp: Date): Date {
  return somarDias(dpp, -DURACAO_GESTACAO_DIAS)
}

/** Comparação de tamanho aproximado do bebê por semana (referência lúdica) */
const TAMANHOS: Array<[number, string]> = [
  [4, 'uma semente de papoula'],
  [5, 'uma semente de gergelim'],
  [6, 'uma lentilha'],
  [7, 'um mirtilo'],
  [8, 'uma framboesa'],
  [9, 'uma azeitona'],
  [10, 'um morango'],
  [11, 'um figo'],
  [12, 'um limão'],
  [13, 'uma vagem de ervilha'],
  [14, 'um pêssego'],
  [16, 'um abacate'],
  [18, 'uma batata-doce'],
  [20, 'uma banana'],
  [22, 'um mamão papaia pequeno'],
  [24, 'uma espiga de milho'],
  [26, 'uma alface'],
  [28, 'uma berinjela'],
  [30, 'um repolho'],
  [32, 'uma abóbora pequena'],
  [34, 'um melão'],
  [36, 'uma alface-romana grande'],
  [38, 'uma abóbora'],
  [40, 'uma melancia pequena'],
]

export function tamanhoBebe(semanas: number): string | null {
  let resultado: string | null = null
  for (const [s, nome] of TAMANHOS) {
    if (semanas >= s) resultado = nome
  }
  return resultado
}

export function gerarId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
