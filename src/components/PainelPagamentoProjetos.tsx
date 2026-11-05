import { useMemo } from 'react'
import { CheckCircle2, Clock, Inbox, Loader2, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { HomologacaoLead } from '@/types/crm'
import {
  nomeClienteProjeto,
  separarProjetosPorPagamento,
  textoDias,
  type ProjetoPagamentoItem,
} from '@/lib/pagamentoProjetos'
import { formatDateBR } from '@/lib/solarUtils'

interface PainelPagamentoProjetosProps {
  homologacoes: HomologacaoLead[]
  loading?: boolean
  /** Nomes dos engenheiros por id, para o subtítulo de quem está responsável. */
  engenheirosMap?: Record<string, string>
}

function AvatarNome({ nome }: { nome: string }) {
  return (
    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 font-bold text-[11px] flex items-center justify-center border border-slate-200 shrink-0">
      {nome.slice(0, 2).toUpperCase()}
    </div>
  )
}

function ItemProjeto({
  item,
  engenheirosMap,
}: {
  item: ProjetoPagamentoItem
  engenheirosMap?: Record<string, string>
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50/70 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <AvatarNome nome={item.nome} />
        <div className="min-w-0">
          <p
            className="text-sm font-semibold text-slate-900 truncate leading-tight"
            title={item.nome}
          >
            {item.nome}
          </p>
          {item.engenheiroNome && (
            <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
              Eng.: {item.engenheiroNome}
            </p>
          )}
        </div>
      </div>

      {item.pago ? (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold gap-1 shrink-0"
          title="Data em que o projeto foi marcado como pago"
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>{item.pagoEm ? `Pago em ${formatDateBR(item.pagoEm)}` : 'Pago'}</span>
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className={`text-[10px] font-bold gap-1 shrink-0 ${
            item.dias >= 15
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : item.dias >= 7
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}
          title="Dias desde o envio do projeto para a engenharia"
        >
          <Clock className={`w-3 h-3 ${item.dias >= 15 ? 'text-rose-500' : 'text-amber-500'}`} />
          <span>{textoDias(item.dias)}</span>
        </Badge>
      )}
    </li>
  )
}

/**
 * Painel "Pagamento de Projetos": duas listas — Projetos Pagos e Pagamento
 * Pendente — mostrando SOMENTE o nome do cliente, sem valores monetários.
 * Pendentes mostram há quantos dias o projeto aguarda (desde o envio para a
 * engenharia); pagos mostram a data da marcação do pagamento.
 * A visibilidade dos projetos já vem filtrada do pai (mesma regra da engenharia).
 */
export function PainelPagamentoProjetos({
  homologacoes,
  loading = false,
  engenheirosMap = {},
}: PainelPagamentoProjetosProps) {
  const { pagos, pendentes } = useMemo(
    () => separarProjetosPorPagamento(homologacoes),
    [homologacoes],
  )

  const itensComEngenheiro = (lista: ProjetoPagamentoItem[], ids: Map<string, string>) =>
    lista.map((item) => ({ ...item, engenheiroNome: ids.get(item.id) }))

  const mapaHomologacaoEngenheiro = useMemo(() => {
    const map = new Map<string, string>()
    homologacoes.forEach((h) => {
      const nome =
        h.expand?.engenheiro?.name || h.expand?.engenheiro?.email || engenheirosMap[h.engenheiro]
      if (nome) map.set(h.id, nome)
    })
    return map
  }, [homologacoes, engenheirosMap])

  const pendentesComEng = itensComEngenheiro(pendentes, mapaHomologacaoEngenheiro)
  const pagosComEng = itensComEngenheiro(pagos, mapaHomologacaoEngenheiro)

  return (
    <Card className="border-slate-200/90 shadow-2xs bg-white overflow-hidden">
      <CardHeader className="py-3.5 px-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 via-white to-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0B7A5B] flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-sm font-extrabold text-slate-900 tracking-tight">
              Pagamento de Projetos
            </CardTitle>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {pagos.length} pago{pagos.length === 1 ? '' : 's'} · {pendentes.length} pendente
              {pendentes.length === 1 ? '' : 's'} — apenas nomes, sem valores
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[11px] font-bold gap-1"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>
              {pagos.length} pago{pagos.length === 1 ? '' : 's'}
            </span>
          </Badge>
          <Badge
            variant="outline"
            className={`text-[11px] font-bold gap-1 ${
              pendentes.length > 0
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            <Clock className="w-3 h-3 text-amber-600" />
            <span>
              {pendentes.length} pendente{pendentes.length === 1 ? '' : 's'}
            </span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-xs font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-[#0B7A5B]" />
            <span>Carregando situação dos pagamentos...</span>
          </div>
        ) : pagos.length === 0 && pendentes.length === 0 ? (
          <div className="py-10 text-center space-y-1.5 px-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-700">Nenhum projeto no painel ainda</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Assim que um projeto for enviado para a engenharia e marcado como pago, ele aparecerá
              aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Pagamento Pendente */}
            <section>
              <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pagamento Pendente</span>
                </h4>
                <span className="text-[10px] text-slate-400 font-medium">
                  dias desde o envio p/ engenharia
                </span>
              </div>
              {pendentesComEng.length === 0 ? (
                <p className="px-3 py-6 text-xs text-slate-500 text-center">
                  Nenhum projeto pendente de pagamento 🎉
                </p>
              ) : (
                <ul className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                  {pendentesComEng.map((item) => (
                    <ItemProjeto key={item.id} item={item} engenheirosMap={engenheirosMap} />
                  ))}
                </ul>
              )}
            </section>

            {/* Projetos Pagos */}
            <section>
              <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Projetos Pagos</span>
                </h4>
                <span className="text-[10px] text-slate-400 font-medium">
                  do pagamento mais recente para o mais antigo
                </span>
              </div>
              {pagosComEng.length === 0 ? (
                <p className="px-3 py-6 text-xs text-slate-500 text-center">
                  Nenhum projeto pago ainda.
                </p>
              ) : (
                <ul className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                  {pagosComEng.map((item) => (
                    <ItemProjeto key={item.id} item={item} engenheirosMap={engenheirosMap} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
