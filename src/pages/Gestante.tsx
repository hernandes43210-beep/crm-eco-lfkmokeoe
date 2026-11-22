/* App "Gestante": cronômetro de contrações (regra 5-1-1), contador de movimentos do bebê e calculadora de idade gestacional.
   Página pública, 100% local (dados salvos apenas no navegador do aparelho). */
import { useEffect, useMemo, useState } from 'react'
import { Baby, CalendarHeart, Footprints, Hourglass, Share2, Timer, Trash2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { useAgora, useLocalStorageState } from '@/hooks/useLocalStorageState'
import {
  analisarContracoes,
  comIntervalos,
  duracao,
  dumAPartirDaDpp,
  formatarDuracao,
  formatarDuracaoCurta,
  formatarHora,
  gerarId,
  idadeGestacional,
  META_MOVIMENTOS,
  PADRAO_EXPIRA,
  paraIsoLocal,
  parseDataLocal,
  relatorioTexto,
  resumoJanela,
  statusMovimentos,
  tamanhoBebe,
  type Contracao,
  type Intensidade,
  type NivelAlerta,
  type SessaoMovimentos,
} from '@/lib/gestacao'

const vibrar = (ms = 40) => {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* sem suporte */
  }
}

/** Mantém a tela acesa enquanto `ativo` (Screen Wake Lock API, quando disponível) */
function useTelaAcesa(ativo: boolean) {
  useEffect(() => {
    if (!ativo || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelado = false
    const pedir = async () => {
      try {
        const l = await navigator.wakeLock.request('screen')
        if (cancelado) void l.release()
        else lock = l
      } catch {
        /* negado ou sem suporte */
      }
    }
    const aoVoltar = () => document.visibilityState === 'visible' && void pedir()
    void pedir()
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      cancelado = true
      document.removeEventListener('visibilitychange', aoVoltar)
      void lock?.release()
    }
  }, [ativo])
}

// =============================================================== Contrações

const ESTILO_ALERTA: Record<NivelAlerta, string> = {
  nenhum: 'border-muted bg-muted/40',
  observar: 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
  formando: 'border-orange-400 bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-100',
  ir_hospital: 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-100',
}

const INTENSIDADES: Array<{ valor: Intensidade; rotulo: string }> = [
  { valor: 'leve', rotulo: 'Leve' },
  { valor: 'moderada', rotulo: 'Moderada' },
  { valor: 'forte', rotulo: 'Forte' },
]

function AbaContracoes() {
  const [lista, setLista] = useLocalStorageState<Contracao[]>('gestante.contracoes', [])
  const emAndamento = lista.find((c) => c.fim === null) ?? null
  const agora = useAgora(true, emAndamento ? 200 : 1000)

  const historico = useMemo(() => comIntervalos(lista.filter((c) => c.fim !== null)).reverse(), [lista])
  const ultima = historico[0]
  const resumo = resumoJanela(lista, agora)
  const analise = analisarContracoes(lista, agora)

  useTelaAcesa(!!emAndamento || (!!ultima && agora - (ultima.fim ?? 0) < PADRAO_EXPIRA))

  const alternar = () => {
    vibrar(emAndamento ? 80 : 40)
    const t = Date.now()
    if (emAndamento) {
      setLista((l) => l.map((c) => (c.id === emAndamento.id ? { ...c, fim: t } : c)))
    } else {
      setLista((l) => [...l, { id: gerarId(), inicio: t, fim: null }])
    }
  }

  const definirIntensidade = (id: string, intensidade: Intensidade) =>
    setLista((l) => l.map((c) => (c.id === id ? { ...c, intensidade: c.intensidade === intensidade ? undefined : intensidade } : c)))

  const remover = (id: string) => setLista((l) => l.filter((c) => c.id !== id))

  const desfazer = () => {
    // cancela a em andamento, ou remove a última registrada
    if (emAndamento) remover(emAndamento.id)
    else if (ultima) remover(ultima.id)
  }

  const compartilhar = async () => {
    const texto = relatorioTexto(lista)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Relatório de contrações', text: texto })
        return
      }
      await navigator.clipboard.writeText(texto)
      toast.success('Relatório copiado. Cole no WhatsApp ou envie para sua equipe médica.')
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') toast.error('Não foi possível compartilhar.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Botão principal */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="text-center" aria-live="polite">
          <p className="text-sm text-muted-foreground">
            {emAndamento ? 'Contração em andamento' : ultima ? 'Desde o início da última' : 'Pronta para começar'}
          </p>
          <p className="font-mono text-5xl font-semibold tabular-nums tracking-tight">
            {emAndamento
              ? formatarDuracao(duracao(emAndamento, agora))
              : ultima
                ? formatarDuracao(agora - ultima.inicio)
                : '00:00'}
          </p>
        </div>
        <button
          type="button"
          onClick={alternar}
          className={cn(
            'flex h-44 w-44 select-none flex-col items-center justify-center rounded-full text-white shadow-lg transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300',
            emAndamento ? 'animate-pulse bg-rose-600 hover:bg-rose-700' : 'bg-rose-400 hover:bg-rose-500',
          )}
        >
          <Timer className="mb-1 h-8 w-8" />
          <span className="text-lg font-semibold leading-tight">{emAndamento ? 'Parar' : 'Iniciar'}</span>
          <span className="text-sm opacity-90">contração</span>
        </button>
        {(emAndamento || ultima) && (
          <Button variant="ghost" size="sm" onClick={desfazer} className="text-muted-foreground">
            <Undo2 className="mr-1 h-4 w-4" />
            {emAndamento ? 'Cancelar esta' : 'Desfazer última'}
          </Button>
        )}
      </div>

      {/* Resumo da última hora */}
      <div className="grid grid-cols-3 gap-2">
        <Estatistica rotulo="Na última hora" valor={String(resumo.quantidade)} />
        <Estatistica
          rotulo="Duração média"
          valor={resumo.duracaoMedia !== null ? formatarDuracaoCurta(resumo.duracaoMedia) : '—'}
        />
        <Estatistica
          rotulo="Intervalo médio"
          valor={resumo.intervaloMedio !== null ? formatarDuracaoCurta(resumo.intervaloMedio) : '—'}
        />
      </div>

      {/* Alerta 5-1-1 */}
      <div role="status" className={cn('rounded-lg border-2 p-3', ESTILO_ALERTA[analise.nivel])}>
        <p className="font-semibold">{analise.titulo}</p>
        <p className="text-sm opacity-90">{analise.mensagem}</p>
      </div>

      {/* Histórico */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Histórico</CardTitle>
            <CardDescription>Intervalo = do início de uma ao início da próxima</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={compartilhar} disabled={!historico.length} aria-label="Compartilhar relatório">
              <Share2 className="h-4 w-4" />
            </Button>
            <ConfirmarLimpar disabled={!lista.length} onConfirm={() => setLista([])} oQue="todas as contrações" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {historico.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Nenhuma contração registrada ainda.</p>
          ) : (
            <ul className="divide-y">
              {historico.slice(0, 50).map((c) => (
                <li key={c.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-mono tabular-nums text-muted-foreground">{formatarHora(c.inicio)}</span>
                    <span>
                      <span className="text-muted-foreground">dur. </span>
                      <strong>{formatarDuracaoCurta(duracao(c))}</strong>
                    </span>
                    <span>
                      <span className="text-muted-foreground">int. </span>
                      <strong>{c.intervalo !== null ? formatarDuracaoCurta(c.intervalo) : '—'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => remover(c.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Excluir contração"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {INTENSIDADES.map((i) => (
                      <button
                        key={i.valor}
                        type="button"
                        onClick={() => definirIntensidade(c.id, i.valor)}
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                          c.intensidade === i.valor
                            ? 'border-rose-500 bg-rose-500 text-white'
                            : 'text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {i.rotulo}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Procure atendimento imediatamente se houver</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Rompimento da bolsa (perda de líquido), principalmente se esverdeado ou com cheiro</li>
            <li>Sangramento vaginal</li>
            <li>Diminuição ou ausência dos movimentos do bebê</li>
            <li>Dor forte e contínua, febre, dor de cabeça intensa ou visão turva</li>
            <li>Contrações regulares antes de 37 semanas</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================== Movimentos

function AbaMovimentos() {
  const [sessoes, setSessoes] = useLocalStorageState<SessaoMovimentos[]>('gestante.movimentos', [])
  const ativa = sessoes.find((s) => s.fim === null) ?? null
  const agora = useAgora(!!ativa, 1000)
  const st = ativa ? statusMovimentos(ativa, agora) : null
  const anteriores = sessoes.filter((s) => s.fim !== null).reverse()

  const iniciar = () => setSessoes((l) => [...l, { id: gerarId(), inicio: Date.now(), fim: null, movimentos: [] }])
  const encerrar = () => setSessoes((l) => l.map((s) => (s.id === ativa?.id ? { ...s, fim: Date.now() } : s)))
  const registrar = () => {
    if (!ativa) return
    vibrar()
    const t = Date.now()
    setSessoes((l) => l.map((s) => (s.id === ativa.id ? { ...s, movimentos: [...s.movimentos, t] } : s)))
    if (ativa.movimentos.length + 1 === META_MOVIMENTOS) {
      toast.success(`${META_MOVIMENTOS} movimentos em ${formatarDuracaoCurta(t - ativa.inicio)}! 💗`)
    }
  }
  const desfazer = () =>
    setSessoes((l) => l.map((s) => (s.id === ativa?.id ? { ...s, movimentos: s.movimentos.slice(0, -1) } : s)))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contagem de movimentos</CardTitle>
          <CardDescription>
            Deitada de lado, conte chutes, giros ou mexidas. O esperado é sentir {META_MOVIMENTOS} movimentos em até 2 horas
            (geralmente a partir de 28 semanas).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          {ativa && st ? (
            <>
              <p className="font-mono text-sm tabular-nums text-muted-foreground">Tempo: {formatarDuracao(st.decorrido)}</p>
              <button
                type="button"
                onClick={registrar}
                className="flex h-40 w-40 select-none flex-col items-center justify-center rounded-full bg-violet-500 text-white shadow-lg transition-transform hover:bg-violet-600 active:scale-95"
              >
                <span className="text-5xl font-bold tabular-nums">{st.contagem}</span>
                <span className="text-sm">toque a cada movimento</span>
              </button>
              <Barra valor={(st.contagem / META_MOVIMENTOS) * 100} cor="bg-violet-500" />
              {st.metaAtingida && (
                <p className="text-center text-sm font-medium text-green-700 dark:text-green-400">
                  Meta atingida em {formatarDuracaoCurta(st.tempoAteMeta!)}. Bebê ativo! 💗
                </p>
              )}
              {st.prazoEstourado && (
                <p className="rounded-md border-2 border-red-500 bg-red-50 p-2 text-center text-sm text-red-900 dark:bg-red-950/50 dark:text-red-100">
                  Menos de {META_MOVIMENTOS} movimentos em 2 horas. Procure sua equipe médica ou a maternidade.
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={desfazer} disabled={!st.contagem}>
                  <Undo2 className="mr-1 h-4 w-4" /> Desfazer
                </Button>
                <Button size="sm" className="bg-violet-500 hover:bg-violet-600" onClick={encerrar}>
                  Encerrar sessão
                </Button>
              </div>
            </>
          ) : (
            <Button size="lg" className="bg-violet-500 hover:bg-violet-600" onClick={iniciar}>
              <Footprints className="mr-2 h-5 w-5" /> Iniciar contagem
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Sessões anteriores</CardTitle>
          <ConfirmarLimpar disabled={!anteriores.length} onConfirm={() => setSessoes((l) => l.filter((s) => s.fim === null))} oQue="o histórico de movimentos" />
        </CardHeader>
        <CardContent className="p-0">
          {anteriores.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Nenhuma sessão registrada.</p>
          ) : (
            <ul className="divide-y">
              {anteriores.slice(0, 30).map((s) => {
                const r = statusMovimentos(s)
                return (
                  <li key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-muted-foreground">
                      {new Date(s.inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>
                      <strong>{r.contagem}</strong> mov. em {formatarDuracaoCurta(r.decorrido)}
                    </span>
                    <span className={r.metaAtingida ? 'text-green-600' : 'text-amber-600'}>
                      {r.metaAtingida ? `10 em ${formatarDuracaoCurta(r.tempoAteMeta!)}` : 'meta não atingida'}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================== Gestação

function AbaGestacao() {
  const [dumIso, setDumIso] = useLocalStorageState<string>('gestante.dum', '')
  const [modo, setModo] = useState<'dum' | 'dpp'>('dum')
  const dum = parseDataLocal(dumIso)
  const hoje = new Date()
  const ig = dum ? idadeGestacional(dum, hoje) : null
  const valido = ig && ig.totalDias >= 0 && ig.totalDias <= 45 * 7

  const aoMudar = (v: string) => {
    if (!v) return setDumIso('')
    const d = parseDataLocal(v)
    if (!d) return
    setDumIso(paraIsoLocal(modo === 'dum' ? d : dumAPartirDaDpp(d)))
  }

  const valorCampo = dum ? (modo === 'dum' ? dumIso : paraIsoLocal(idadeGestacional(dum).dpp)) : ''
  const tamanho = ig ? tamanhoBebe(ig.semanas) : null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Calcular idade gestacional</CardTitle>
          <CardDescription>Informe a data da última menstruação (DUM) ou a data provável do parto (DPP).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="inline-flex rounded-md bg-muted p-1 text-sm">
            {(['dum', 'dpp'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={cn('rounded px-3 py-1', modo === m ? 'bg-background shadow-sm' : 'text-muted-foreground')}
              >
                {m === 'dum' ? 'Última menstruação' : 'Data do parto'}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor="data-gestacao">{modo === 'dum' ? 'Primeiro dia da última menstruação' : 'Data provável do parto'}</Label>
            <Input id="data-gestacao" type="date" value={valorCampo} onChange={(e) => aoMudar(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {ig && !valido && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          A data informada resulta em uma idade gestacional fora do intervalo esperado. Confira a data.
        </p>
      )}

      {ig && valido && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-rose-400 to-violet-500 p-6 text-center text-white">
            <p className="text-sm opacity-90">Você está com</p>
            <p className="text-4xl font-bold">
              {ig.semanas} semana{ig.semanas === 1 ? '' : 's'}
            </p>
            {ig.dias > 0 && (
              <p className="text-xl font-semibold">
                e {ig.dias} dia{ig.dias > 1 ? 's' : ''}
              </p>
            )}
            <p className="mt-1 text-sm opacity-90">{ig.trimestre}º trimestre</p>
          </div>
          <CardContent className="space-y-4 pt-4">
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Início</span>
                <span>{Math.round(ig.progresso)}%</span>
                <span>40 semanas</span>
              </div>
              <Barra valor={ig.progresso} cor="bg-rose-500" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Estatistica rotulo="Data provável do parto" valor={ig.dpp.toLocaleDateString('pt-BR')} />
              <Estatistica
                rotulo={ig.diasRestantes >= 0 ? 'Faltam' : 'Passou da DPP'}
                valor={`${Math.abs(ig.diasRestantes)} dia${Math.abs(ig.diasRestantes) === 1 ? '' : 's'}`}
              />
            </div>
            {tamanho && (
              <p className="flex items-center gap-2 text-sm">
                <Baby className="h-5 w-5 shrink-0 text-rose-500" />O bebê tem aproximadamente o tamanho de {tamanho}.
              </p>
            )}
            {ig.semanas >= 37 && ig.semanas < 42 && (
              <p className="text-sm text-muted-foreground">Gestação a termo. Use a aba Contrações quando elas começarem.</p>
            )}
            {ig.semanas >= 41 && (
              <p className="text-sm font-medium text-orange-700">A partir de 41 semanas, mantenha acompanhamento próximo com sua equipe médica.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Estimativa pela regra de Naegele (DUM + 280 dias). O ultrassom do 1º trimestre pode ajustar essa data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// =============================================================== comuns

function Barra({ valor, cor }: { valor: number; cor: string }) {
  const v = Math.min(100, Math.max(0, valor))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-all', cor)} style={{ width: `${v}%` }} />
    </div>
  )
}

function Estatistica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums">{valor}</p>
    </div>
  )
}

function ConfirmarLimpar({ onConfirm, disabled, oQue }: { onConfirm: () => void; disabled?: boolean; oQue: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled} aria-label={`Apagar ${oQue}`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar {oQue}?</AlertDialogTitle>
          <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Apagar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function Gestante() {
  const [aba, setAba] = useLocalStorageState<string>('gestante.aba', 'contracoes')

  useEffect(() => {
    const anterior = document.title
    document.title = 'Gestante · Cronômetro de contrações'
    return () => {
      document.title = anterior
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-background dark:from-rose-950/20">
      <div className="mx-auto max-w-md px-4 pb-10 pt-6">
        <header className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40">
            <CalendarHeart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Gestante</h1>
            <p className="text-xs text-muted-foreground">Contrações, movimentos e semanas de gestação</p>
          </div>
        </header>

        <Tabs value={aba} onValueChange={setAba}>
          <TabsList className="mb-4 grid w-full grid-cols-3">
            <TabsTrigger value="contracoes" className="gap-1">
              <Timer className="h-4 w-4" /> Contrações
            </TabsTrigger>
            <TabsTrigger value="movimentos" className="gap-1">
              <Footprints className="h-4 w-4" /> Chutes
            </TabsTrigger>
            <TabsTrigger value="gestacao" className="gap-1">
              <Hourglass className="h-4 w-4" /> Semanas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="contracoes">
            <AbaContracoes />
          </TabsContent>
          <TabsContent value="movimentos">
            <AbaMovimentos />
          </TabsContent>
          <TabsContent value="gestacao">
            <AbaGestacao />
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Os dados ficam salvos somente neste aparelho. Este app é uma ferramenta de apoio e não substitui a orientação da sua
          equipe médica. Em caso de dúvida, procure a maternidade.
        </p>
      </div>
    </div>
  )
}
