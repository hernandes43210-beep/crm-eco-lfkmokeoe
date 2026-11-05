import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle2, Loader2, RotateCcw, ShieldCheck, Undo2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { HomologacaoLead, ProjetoPagoConfirmacaoItem } from '@/types/crm'
import { HomologacaoService } from '@/services/homologacao'
import { formatDateTimeBR } from '@/lib/solarUtils'
import { toast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

interface ProjetoPagoBlocoProps {
  homologacao: HomologacaoLead
  /** Se true, exibe os botões "Marcar como pago" / "Desfazer pagamento" (Admin/CEO e Engenheiro). */
  podeGerenciar?: boolean
  /** Propaga a homologação atualizada para o pai (lista, ficha etc.). */
  onHomologacaoUpdated: (hom: HomologacaoLead) => void
  /** Layout compacto para uso dentro do card do Kanban. */
  compacto?: boolean
}

/**
 * Bloco "Pagamento do Projeto": selo verde discreto com data/nome de quem
 * marcou, botão de marcar como pago (Admin/CEO e Engenheiro) e botão de
 * desfazer com diálogo mostrando quem já confirmou e quantos oks faltam
 * (a reversão exige o ok de 2 pessoas diferentes — regra do backend).
 * Vendedor não vê botões de pagamento.
 */
export function ProjetoPagoBloco({
  homologacao,
  podeGerenciar = false,
  onHomologacaoUpdated,
  compacto = false,
}: ProjetoPagoBlocoProps) {
  const { user, isAdmin } = useAuth()
  const [marcando, setMarcando] = useState(false)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [avisoReversao, setAvisoReversao] = useState('')
  const [confirmacoes, setConfirmacoes] = useState<ProjetoPagoConfirmacaoItem[]>(
    homologacao.projeto_pago_reversoes || [],
  )

  const pago = !!homologacao.projeto_pago
  const nomeMarcou =
    homologacao.expand?.projeto_pago_por?.name || homologacao.expand?.projeto_pago_por?.email || ''
  const jaConfirmei = (confirmacoes || []).some((c) => c.usuario_id === user?.id)

  const recarregarHomologacao = async (): Promise<HomologacaoLead | null> => {
    try {
      const fresh = await pb.collection('homologacoes').getOne<HomologacaoLead>(homologacao.id, {
        expand:
          'engenheiro,vendedor,dossie,comprovante_art_anexado_por,comprovante_projeto_anexado_por,projeto_pago_por',
        requestKey: null,
      })
      onHomologacaoUpdated(fresh)
      return fresh
    } catch (err) {
      console.warn('Erro ao recarregar homologação:', err)
      return null
    }
  }

  const handleMarcarPago = async () => {
    try {
      setMarcando(true)
      const resp = await HomologacaoService.marcarProjetoPago(homologacao.id)
      if (resp.success) {
        toast({
          title: 'Projeto marcado como pago',
          description: 'A reversão desse status exige o ok de duas pessoas diferentes.',
        })
        await recarregarHomologacao()
      } else {
        toast({
          title: 'Não foi possível marcar o pagamento',
          description: resp.message || 'Tente novamente.',
          variant: 'destructive',
        })
      }
    } catch (err: unknown) {
      const msg =
        (err as { data?: { message?: string }; message?: string })?.data?.message ||
        (err as { message?: string })?.message ||
        'Não foi possível marcar o projeto como pago.'
      toast({ title: 'Erro ao marcar pagamento', description: msg, variant: 'destructive' })
    } finally {
      setMarcando(false)
    }
  }

  const abrirDialogReversao = () => {
    setConfirmacoes(homologacao.projeto_pago_reversoes || [])
    setAvisoReversao('')
    setDialogAberto(true)
  }

  const handleConfirmarReversao = async () => {
    try {
      setConfirmando(true)
      setAvisoReversao('')
      const resp = await HomologacaoService.desmarcarProjetoPago(homologacao.id)

      if (resp.success) {
        toast({
          title: 'Pagamento desfeito',
          description: resp.message,
        })
        setDialogAberto(false)
        await recarregarHomologacao()
      } else {
        // 1º ok: HTTP 200 com success:false — o pagamento NÃO foi desfeito.
        setConfirmacoes(resp.confirmacoes || [])
        setAvisoReversao(
          resp.message ||
            'Reversão registrada, mas ainda não aplicada: falta o ok de uma segunda pessoa.',
        )
        await recarregarHomologacao()
      }
    } catch (err: unknown) {
      const msg =
        (err as { data?: { message?: string }; message?: string })?.data?.message ||
        (err as { message?: string })?.message ||
        'Não foi possível registrar a reversão.'
      setAvisoReversao(msg)
    } finally {
      setConfirmando(false)
    }
  }

  const faltam = Math.max(0, 2 - new Set((confirmacoes || []).map((c) => c.usuario_id)).size)

  return (
    <div className={compacto ? 'pt-1' : 'pt-2 border-t border-slate-100 mt-2'}>
      {pago ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] h-5 gap-1"
              title={
                nomeMarcou
                  ? `Marcado como pago por ${nomeMarcou}${
                      homologacao.projeto_pago_em
                        ? ' em ' + formatDateTimeBR(homologacao.projeto_pago_em)
                        : ''
                    }`
                  : 'Projeto pago'
              }
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Projeto Pago</span>
            </Badge>
            {!compacto && homologacao.projeto_pago_em && (
              <span className="text-[11px] text-slate-600 leading-snug">
                em{' '}
                <strong className="text-slate-800">
                  {formatDateTimeBR(homologacao.projeto_pago_em)}
                </strong>
                {nomeMarcou && (
                  <>
                    {' '}
                    por <strong className="text-slate-800">{nomeMarcou}</strong>
                  </>
                )}
              </span>
            )}
            {compacto && nomeMarcou && (
              <span className="text-[10px] text-slate-500 font-medium truncate max-w-[110px]">
                {nomeMarcou}
              </span>
            )}
          </div>

          {podeGerenciar && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={abrirDialogReversao}
              disabled={confirmando || marcando}
              className={`h-6 px-2 text-[10px] font-bold gap-1 text-slate-600 hover:text-amber-800 hover:bg-amber-50 hover:border-amber-300 ${
                compacto ? '' : '-ml-1'
              }`}
              title="Solicitar reversão do pagamento (exige o ok de duas pessoas)"
            >
              <Undo2 className="w-3 h-3" />
              <span>Desfazer pagamento</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          {podeGerenciar ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleMarcarPago}
              disabled={marcando}
              className={`h-6 px-2 text-[10px] font-bold gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300 ${
                compacto ? '' : '-ml-1'
              }`}
              title="Registrar que o projeto já foi pago (Admin/CEO e Engenheiro)"
            >
              {marcando ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              <span>Marcar como pago</span>
            </Button>
          ) : (
            <span className="text-[10px] text-slate-400">
              {isAdmin
                ? null
                : 'Apenas Admin/CEO ou o Engenheiro responsável pode marcar o pagamento.'}
            </span>
          )}
        </div>
      )}

      {/* Diálogo de reversão: mostra quem já confirmou e quantos oks faltam */}
      <Dialog open={dialogAberto} onOpenChange={(v) => !confirmando && setDialogAberto(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="gap-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Undo2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Desfazer pagamento do projeto
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              O status "Projeto Pago" só volta para "não pago" com o ok de{' '}
              <strong>duas pessoas diferentes</strong>. Sua confirmação fica registrada no
              histórico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                Confirmações de reversão (
                {new Set((confirmacoes || []).map((c) => c.usuario_id)).size}/2)
              </p>
              {(confirmacoes || []).length === 0 ? (
                <p className="text-xs text-slate-500">
                  Ninguém confirmou ainda. Seu ok será o primeiro.
                </p>
              ) : (
                <ul className="space-y-1">
                  {confirmacoes.map((c, idx) => (
                    <li
                      key={`${c.usuario_id}-${idx}`}
                      className="text-xs text-slate-700 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="font-semibold">{c.usuario_nome || 'Usuário'}</span>
                      {c.data && (
                        <span className="text-slate-400 text-[10px]">
                          {formatDateTimeBR(c.data)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-slate-500">
                {faltam > 0 ? (
                  <>
                    Falta(m) o ok de <strong className="text-slate-800">{faltam}</strong> pessoa
                    {faltam > 1 ? 's' : ''} para aplicar a reversão.
                  </>
                ) : (
                  'Todas as confirmações necessárias foram registradas.'
                )}
              </p>
            </div>

            {avisoReversao && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 font-medium">
                {avisoReversao}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogAberto(false)}
              disabled={confirmando}
              className="text-xs font-semibold"
            >
              Fechar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmarReversao}
              disabled={confirmando}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1"
            >
              {confirmando ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RotateCcw className="w-3 h-3" />
              )}
              <span>{jaConfirmei ? 'Registrar de novo' : 'Confirmar minha reversão'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
