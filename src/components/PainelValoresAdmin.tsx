import { useMemo, useState } from 'react'
import { Check, Eraser, Eye, EyeOff, Loader2, Lock, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import type { HomologacaoLead } from '@/types/crm'
import { HomologacaoService } from '@/services/homologacao'
import { nomeClienteProjeto } from '@/lib/pagamentoProjetos'
import { formatBRL, formatDateBR } from '@/lib/solarUtils'
import { toast } from '@/hooks/use-toast'

interface PainelValoresAdminProps {
  homologacoes: HomologacaoLead[]
  loading?: boolean
  /** Propaga a homologação atualizada (valor pago) para o pai. */
  onHomologacaoUpdated: (hom: HomologacaoLead) => void
}

/**
 * Converte o texto digitado ("1.234,56", "1234.56", "1234") em número.
 * Retorna null quando não é um valor válido.
 */
function parseValorTexto(texto: string): number | null {
  const limpo = texto.trim()
  if (limpo === '') return null
  const normalizado = limpo.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number(normalizado)
  if (!isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

/**
 * Painel de VALORES dos projetos — exclusivo Admin/CEO e oculto por padrão:
 * aparece apenas um botão discreto ("Ver valores (Admin)"); só depois do clique
 * o painel com os valores se revela. Cada projeto tem um campo editável de
 * "valor pago" (R$) e o painel soma o TOTAL GASTO dos valores preenchidos.
 * O Engenheiro (e qualquer papel não-Admin) NUNCA vê este painel — e o backend
 * também esconde os campos de valor de todas as respostas da API para não-Admin.
 */
export function PainelValoresAdmin({
  homologacoes,
  loading = false,
  onHomologacaoUpdated,
}: PainelValoresAdminProps) {
  const { isAdmin } = useAuth()
  const [visivel, setVisivel] = useState(false)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  const [edicoes, setEdicoes] = useState<Record<string, string>>({})

  const listaOrdenada = useMemo(() => {
    const pagos = homologacoes
      .filter((h) => h.projeto_pago)
      .sort((a, b) => (b.projeto_pago_em || '').localeCompare(a.projeto_pago_em || ''))
    const pendentes = homologacoes
      .filter((h) => !h.projeto_pago)
      .sort((a, b) => (b.created || '').localeCompare(a.created || ''))
    return [...pagos, ...pendentes]
  }, [homologacoes])

  const totalGasto = useMemo(
    () =>
      homologacoes.reduce(
        (acc, h) => acc + (typeof h.valor_pago === 'number' ? h.valor_pago : 0),
        0,
      ),
    [homologacoes],
  )
  const comValor = homologacoes.filter(
    (h) => typeof h.valor_pago === 'number' && h.valor_pago > 0,
  ).length

  if (!isAdmin) return null

  const valorAtualDe = (h: HomologacaoLead): string => {
    if (edicoes[h.id] !== undefined) return edicoes[h.id]
    if (typeof h.valor_pago === 'number' && h.valor_pago > 0) return String(h.valor_pago)
    return ''
  }

  const salvarValor = async (h: HomologacaoLead) => {
    const texto = valorAtualDe(h)
    const valor = parseValorTexto(texto)
    if (texto.trim() !== '' && valor === null) {
      toast({
        title: 'Valor inválido',
        description: 'Digite um valor em reais (ex.: 1500 ou 1500,50).',
        variant: 'destructive',
      })
      return
    }
    const valorNovo = valor ?? 0
    const valorAtual = typeof h.valor_pago === 'number' ? h.valor_pago : 0
    if (valorNovo === valorAtual) {
      setEdicoes((prev) => {
        const c = { ...prev }
        delete c[h.id]
        return c
      })
      return
    }
    try {
      setSalvandoId(h.id)
      const resp = await HomologacaoService.definirValorPago(h.id, valorNovo > 0 ? valorNovo : null)
      if (resp.success) {
        toast({ title: 'Valor salvo', description: resp.message })
        onHomologacaoUpdated({
          ...h,
          valor_pago: valorNovo > 0 ? valorNovo : undefined,
          valor_pago_em: resp.valor_pago_em || undefined,
          valor_pago_por: resp.valor_pago_por || undefined,
        })
        setEdicoes((prev) => {
          const c = { ...prev }
          delete c[h.id]
          return c
        })
      } else {
        toast({
          title: 'Não foi possível salvar o valor',
          description: resp.message || 'Tente novamente.',
          variant: 'destructive',
        })
      }
    } catch (err: unknown) {
      const msg =
        (err as { data?: { message?: string }; message?: string })?.data?.message ||
        (err as { message?: string })?.message ||
        'Não foi possível salvar o valor do projeto.'
      toast({ title: 'Erro ao salvar valor', description: msg, variant: 'destructive' })
    } finally {
      setSalvandoId(null)
    }
  }

  const botaoAlternar = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => setVisivel((v) => !v)}
      className="h-8 text-xs font-bold gap-1.5 border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
      title={
        visivel ? 'Ocultar valores dos projetos' : 'Revelar valores dos projetos (só você vê isso)'
      }
    >
      {visivel ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      <span>{visivel ? 'Ocultar valores' : 'Ver valores (Admin)'}</span>
    </Button>
  )

  if (!visivel) {
    return <div className="flex justify-end">{botaoAlternar}</div>
  }

  return (
    <Card className="border-slate-200/90 shadow-2xs bg-white overflow-hidden">
      <CardHeader className="py-3.5 px-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0">
            <Lock className="w-4.5 h-4.5" />
          </div>
          <div>
            <CardTitle className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
              Valores dos Projetos
              <Badge
                variant="outline"
                className="bg-slate-100 text-slate-600 border-slate-300 text-[9px] font-extrabold uppercase gap-1"
              >
                <Lock className="w-2.5 h-2.5" />
                Admin
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Visível apenas para você. O engenheiro vê somente pago/não pago.
            </p>
          </div>
        </div>
        {botaoAlternar}
      </CardHeader>

      <CardContent className="p-0">
        {/* Total gasto */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex-wrap">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Total gasto em projetos
            </p>
            <p className="text-2xl font-extrabold text-slate-900 leading-tight">
              {formatBRL(totalGasto)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {comValor} de {homologacoes.length} projeto
              {homologacoes.length === 1 ? '' : 's'} com valor informado
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0B7A5B] flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-xs font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-[#0B7A5B]" />
            <span>Carregando projetos...</span>
          </div>
        ) : listaOrdenada.length === 0 ? (
          <div className="py-10 text-center space-y-1.5 px-4">
            <p className="text-sm font-bold text-slate-700">Nenhum projeto na engenharia ainda</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Assim que um projeto for enviado para a engenharia, ele aparecerá aqui para você
              informar o valor pago.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-[26rem] overflow-y-auto">
            {listaOrdenada.map((h) => {
              const nome = nomeClienteProjeto(h)
              const textoAtual = valorAtualDe(h)
              const valorSalvo = typeof h.valor_pago === 'number' ? h.valor_pago : 0
              const editado =
                edicoes[h.id] !== undefined && parseValorTexto(textoAtual) !== valorSalvo
              const salvando = salvandoId === h.id
              return (
                <li
                  key={h.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/70 transition-colors flex-wrap sm:flex-nowrap"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p
                        className="text-sm font-semibold text-slate-900 truncate leading-tight"
                        title={nome}
                      >
                        {nome}
                      </p>
                      {h.projeto_pago ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold shrink-0"
                        >
                          Pago{h.projeto_pago_em ? ` ${formatDateBR(h.projeto_pago_em)}` : ''}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-800 border-amber-300 text-[9px] font-bold shrink-0"
                        >
                          Pendente
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {typeof h.valor_pago === 'number' && h.valor_pago > 0
                        ? `${formatBRL(h.valor_pago)}${h.valor_pago_em ? ` · atualizado em ${formatDateBR(h.valor_pago_em)}` : ''}`
                        : 'Sem valor informado'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold pointer-events-none">
                        R$
                      </span>
                      <Input
                        inputMode="decimal"
                        value={textoAtual}
                        onChange={(e) =>
                          setEdicoes((prev) => ({ ...prev, [h.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            void salvarValor(h)
                          }
                        }}
                        placeholder="0,00"
                        disabled={salvando}
                        className="h-8 w-32 pl-7 pr-2 text-xs font-semibold border-slate-200"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void salvarValor(h)}
                      disabled={salvando || !editado}
                      className="h-8 px-2 text-[10px] font-bold gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300"
                      title="Salvar valor deste projeto"
                    >
                      {salvando ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      <span className="hidden sm:inline">Salvar</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEdicoes((prev) => ({ ...prev, [h.id]: '' }))
                      }}
                      disabled={salvando || (!h.valor_pago && textoAtual === '')}
                      className="h-8 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Remover o valor deste projeto"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
