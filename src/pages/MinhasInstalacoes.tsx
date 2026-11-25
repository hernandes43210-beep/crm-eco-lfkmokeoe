import { useEffect, useMemo, useState } from 'react'
import {
  Wrench,
  MapPin,
  FileText,
  Calendar,
  User as UserIcon,
  Loader2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  formatarDataBRInstalacao,
  linkMapsDeCoordenadas,
  normalizarUrlLocalizacao,
} from '@/lib/instalacoesUtils'
import {
  InstalacoesService,
  ROTULOS_STATUS_INSTALACAO,
  type DatasheetItem,
  type InstalacaoInstalador,
  type InstalacaoStatus,
} from '@/services/instalacoes'
import { useAuth } from '@/context/AuthContext'

/** Datasheets vêm como string JSON — parse com fallback silencioso. */
function parseDatasheets(raw: string | null | undefined): DatasheetItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => ({
        nome: String((item || {}).nome || '').trim(),
        especificacao: String((item || {}).especificacao || '').trim(),
      }))
      .filter((item) => item.nome || item.especificacao)
  } catch {
    return []
  }
}

const CORES_STATUS: Record<InstalacaoStatus, string> = {
  pendente: 'bg-amber-100 text-amber-800 border-amber-200',
  em_andamento: 'bg-blue-100 text-blue-800 border-blue-200',
  concluida: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

export default function MinhasInstalacoes() {
  const { user } = useAuth()
  const [instalacoes, setInstalacoes] = useState<InstalacaoInstalador[]>([])
  const [loading, setLoading] = useState(true)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)

  const carregar = async () => {
    try {
      setLoading(true)
      const lista = await InstalacoesService.listar(user?.id)
      setInstalacoes(lista)
    } catch (err) {
      console.error('Erro ao carregar instalações:', err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar suas instalações.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const atualizarStatus = async (
    instalacao: InstalacaoInstalador,
    novoStatus: InstalacaoStatus,
  ) => {
    if (novoStatus === instalacao.status) return
    try {
      setSalvandoId(instalacao.id)
      const atualizada = await InstalacoesService.atualizar(instalacao.id, { status: novoStatus })
      setInstalacoes((old) => old.map((i) => (i.id === atualizada.id ? atualizada : i)))
      toast({
        title: 'Status atualizado',
        description: `Instalação de ${instalacao.cliente_nome} marcada como "${ROTULOS_STATUS_INSTALACAO[novoStatus]}".`,
      })
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status da instalação.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoId(null)
    }
  }

  const mapUrl = (instalacao: InstalacaoInstalador): string | null => {
    const link = normalizarUrlLocalizacao(instalacao.localizacao || '')
    if (link) return link
    // Fallback: coordenadas do lead expandido, quando houver
    const leadAny = instalacao.expand?.lead as unknown as Record<string, unknown> | undefined
    const lat = Number(leadAny?.latitude)
    const lng = Number(leadAny?.longitude)
    return linkMapsDeCoordenadas(lat, lng)
  }

  const estatisticas = useMemo(() => {
    const contagem: Record<InstalacaoStatus, number> = {
      pendente: 0,
      em_andamento: 0,
      concluida: 0,
    }
    for (const i of instalacoes) {
      if (i.status in contagem) contagem[i.status]++
    }
    return contagem
  }, [instalacoes])

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-100 border border-orange-300 flex items-center justify-center shrink-0">
            <Wrench className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Minhas Instalações</h2>
            <p className="text-sm text-slate-500">
              Instalações solares atribuídas a você pela equipe Ecosolar.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={carregar}
          disabled={loading}
          className="text-xs gap-1.5 border-slate-200 text-[#0B7A5B] hover:bg-emerald-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      {/* Resumo de status */}
      {!loading && instalacoes.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(ROTULOS_STATUS_INSTALACAO) as InstalacaoStatus[]).map((status) => (
            <Card key={status} className="border-slate-200 shadow-xs">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {ROTULOS_STATUS_INSTALACAO[status]}
                </p>
                <p className="text-2xl font-black text-slate-900 mt-1">{estatisticas[status]}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-[#0B7A5B]" />
          <span className="text-sm">Carregando instalações…</span>
        </div>
      ) : instalacoes.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="py-14 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Nenhuma instalação atribuída</p>
            <p className="text-xs text-slate-500 max-w-sm">
              Quando a equipe enviar uma instalação para você, ela aparecerá aqui com o endereço,
              localização, datasheets e o Contrato de Responsabilidade enviado por e-mail.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {instalacoes.map((inst) => {
            const datasheets = parseDatasheets(inst.datasheets)
            const mapsUrl = mapUrl(inst)
            return (
              <Card key={inst.id} className="border-slate-200 shadow-xs overflow-hidden">
                <CardHeader className="pb-3 bg-slate-50/70 border-b border-slate-100">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserIcon className="w-4 h-4 text-[#0B7A5B] shrink-0" />
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {inst.cliente_nome}
                      </h3>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('text-[11px] font-semibold', CORES_STATUS[inst.status])}
                    >
                      {ROTULOS_STATUS_INSTALACAO[inst.status] || inst.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Endereço + localização */}
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm text-slate-800 leading-snug">
                        {inst.endereco_completo}
                      </p>
                      {mapsUrl && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#0B7A5B] hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Abrir no Google Maps
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Datasheets */}
                  <div className="flex items-start gap-2.5">
                    <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-600">
                        Datasheets dos equipamentos
                      </p>
                      {datasheets.length === 0 ? (
                        <p className="text-xs text-slate-400">
                          Nenhum datasheet informado — equipamentos conforme projeto executivo.
                        </p>
                      ) : (
                        <ul className="space-y-0.5">
                          {datasheets.map((d, idx) => (
                            <li key={idx} className="text-xs text-slate-700">
                              <span className="font-semibold">{d.nome}:</span> {d.especificacao}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Observações */}
                  {inst.observacoes ? (
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-700 leading-relaxed">{inst.observacoes}</p>
                    </div>
                  ) : null}

                  {/* Rodapé: data de envio + atualização de status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <p className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Calendar className="w-3 h-3" />
                      Enviada em {formatarDataBRInstalacao(inst.data_envio || inst.created)}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">Status:</span>
                      {(Object.keys(ROTULOS_STATUS_INSTALACAO) as InstalacaoStatus[]).map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={s === inst.status ? 'default' : 'outline'}
                          disabled={salvandoId === inst.id || s === inst.status}
                          onClick={() => atualizarStatus(inst, s)}
                          className={cn(
                            'h-7 text-[11px] px-2.5',
                            s === inst.status
                              ? 'bg-[#0B7A5B] hover:bg-[#095C44] text-white'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                          )}
                        >
                          {salvandoId === inst.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            ROTULOS_STATUS_INSTALACAO[s]
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
