// Assistente de IA da Claude (Anthropic) no detalhe do lead.
// Componente isolado para não inflar o LeadDetail.tsx: recebe o lead montado
// e conversa com a Claude via proxy backend (src/services/claudeIntegration.ts).

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Sparkles,
  BrainCircuit,
  MessageCircleQuestion,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  KeyRound,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { ClaudeIntegrationService, type ClaudeStatusResponse } from '@/services/claudeIntegration'
import type { Lead } from '@/types/crm'

type AcaoIA = 'analise' | 'followup'

interface LeadClaudeAssistenteProps {
  lead: Lead
  isAdmin: boolean
}

function montarContextoLead(lead: Lead): string {
  const linhas: string[] = []
  linhas.push(`- Nome: ${lead.nome || '(não informado)'}`)
  linhas.push(
    `- Cidade/UF: ${[lead.cidade, lead.estado].filter(Boolean).join('/') || '(não informado)'}`,
  )
  linhas.push(`- Tipo de imóvel: ${lead.tipo_imovel || '(não informado)'}`)
  linhas.push(`- Valor da conta (R$): ${lead.valor_conta_reais ?? '(não informado)'}`)
  linhas.push(`- Consumo mensal (kWh): ${lead.consumo_mensal_kwh ?? '(não informado)'}`)
  linhas.push(`- Status no funil: ${lead.status}`)
  linhas.push(`- Qualificação: ${lead.status_qualificacao || '(não avaliada)'}`)
  linhas.push(`- Origem: ${lead.origem || '(não informada)'}`)
  if (lead.preco_venda) linhas.push(`- Preço de venda estimado (R$): ${lead.preco_venda}`)
  if (lead.modalidade_venda)
    linhas.push(`- Modalidade: ${lead.modalidade_venda === 'fno' ? 'Financiada (FNO)' : 'À vista'}`)
  if (lead.motivo_perda) linhas.push(`- Motivo de perda: ${lead.motivo_perda}`)
  if (lead.proximo_contato_obs)
    linhas.push(`- Observação do próximo contato: ${lead.proximo_contato_obs}`)

  const historico = Array.isArray(lead.historico) ? lead.historico : []
  if (historico.length > 0) {
    linhas.push('- Últimos eventos do histórico (do mais recente ao mais antigo):')
    for (const item of historico.slice(0, 8)) {
      const quem = item.autor_nome || item.autor || 'sistema'
      const desc = (item.descricao || '').trim()
      if (desc) linhas.push(`  • [${item.data || ''}] ${quem}: ${desc}`)
    }
  } else {
    linhas.push('- Histórico: nenhum evento registrado ainda.')
  }

  return linhas.join('\n')
}

function promptAnalise(lead: Lead): string {
  return [
    'Analise o lead de energia solar abaixo e ajude o vendedor a decidir como agir.',
    '',
    'Dados do lead:',
    montarContextoLead(lead),
    '',
    'Responda em português do Brasil com as seções: "Resumo", "Riscos" e "Próximos passos".',
    'Seja específico com os números do lead (conta, consumo) quando eles existirem.',
  ].join('\n')
}

function promptFollowup(lead: Lead): string {
  const foco = lead.proximo_contato_obs
    ? `Use como gancho a observação do próximo contato: "${lead.proximo_contato_obs}".`
    : 'Se não houver observação de próximo contato, faça uma abordagem inicial de qualificação (conta de energia e local da instalação).'
  return [
    'Escreva uma mensagem de follow-up para o cliente do lead abaixo, pronta para enviar por WhatsApp.',
    '',
    'Dados do lead:',
    montarContextoLead(lead),
    '',
    foco,
    'Nunca ofereça preço, valor ou desconto. Não use emojis em excesso (no máximo um).',
    'Responda apenas com o texto da mensagem.',
  ].join('\n')
}

export function LeadClaudeAssistente({ lead, isAdmin }: LeadClaudeAssistenteProps) {
  const [status, setStatus] = useState<ClaudeStatusResponse | null>(null)
  const [carregandoStatus, setCarregandoStatus] = useState(true)
  const [acaoAtiva, setAcaoAtiva] = useState<AcaoIA | null>(null)
  const [carregando, setCarregando] = useState<AcaoIA | null>(null)
  const [resultado, setResultado] = useState<Record<AcaoIA, string> | null>(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    let vivo = true
    ClaudeIntegrationService.getStatus()
      .then((res) => {
        if (vivo) setStatus(res)
      })
      .catch(() => {})
      .finally(() => {
        if (vivo) setCarregandoStatus(false)
      })
    return () => {
      vivo = false
    }
  }, [])

  const executar = async (acao: AcaoIA) => {
    setAcaoAtiva(acao)
    setCarregando(acao)
    if (resultado && resultado[acao]) {
      setResultado({ ...resultado, [acao]: '' })
    }
    try {
      const prompt = acao === 'analise' ? promptAnalise(lead) : promptFollowup(lead)
      const res = await ClaudeIntegrationService.chat(prompt, { lead_id: lead.id })
      if (!res.success || !res.texto) {
        toast({
          title: 'Não foi possível usar a Claude',
          description: res.message || 'Tente novamente em instantes.',
          variant: 'destructive',
        })
        return
      }
      setResultado((prev) => ({ ...(prev || { analise: '', followup: '' }), [acao]: res.texto! }))
    } catch (err: unknown) {
      toast({
        title: 'Erro ao acionar a Claude',
        description:
          err instanceof Error ? err.message : 'Erro inesperado. Tente novamente em instantes.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(null)
    }
  }

  const copiarTexto = (texto: string) => {
    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
    toast({ title: 'Copiado!', description: 'Texto copiado para a área de transferência.' })
  }

  const configurada = !!status?.configured

  return (
    <Card className="border-slate-200/80 shadow-xs bg-white">
      <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-[#0B7A5B]" />
            <span>Assistente de IA (Claude)</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Análise do lead e sugestão de follow-up geradas pela Claude (Anthropic), com o contexto
            do lead.
          </CardDescription>
        </div>
        {carregandoStatus ? (
          <Badge variant="outline" className="text-[10px] bg-white text-slate-500">
            Carregando…
          </Badge>
        ) : configurada ? (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs gap-1.5 py-1 px-2.5">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Conectada</span>
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-300 text-xs gap-1 py-1 px-2.5"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Não configurada</span>
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {!configurada && !carregandoStatus && (
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Claude ainda não configurada</span>
            </div>
            <p className="text-amber-900/90 leading-relaxed">
              {isAdmin
                ? 'Para usar as ações de IA da Claude, salve a chave da API da Anthropic em Integrações → Claude (Anthropic) e clique em Testar Conexão.'
                : 'Peça ao administrador para configurar a chave da API da Anthropic (Claude) na página Integrações. As outras funções do CRM continuam normais.'}
            </p>
            {isAdmin && (
              <a
                href="/integracoes"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-900 underline hover:text-amber-700"
              >
                <span>Ir para Integrações</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!configurada || !!carregando}
            onClick={() => executar('analise')}
            className="h-8.5 px-3.5 text-xs font-semibold border-slate-300 text-slate-700 hover:text-[#0B7A5B] hover:bg-emerald-50 gap-1.5"
            title={
              configurada
                ? 'Claude analisa o momento do lead, riscos e próximos passos'
                : 'Configure a chave da Claude em Integrações para habilitar'
            }
          >
            {carregando === 'analise' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>{carregando === 'analise' ? 'Analisando…' : 'Analisar lead com Claude'}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!configurada || !!carregando}
            onClick={() => executar('followup')}
            className="h-8.5 px-3.5 text-xs font-semibold border-slate-300 text-slate-700 hover:text-[#0B7A5B] hover:bg-emerald-50 gap-1.5"
            title={
              configurada
                ? 'Claude sugere uma mensagem de follow-up pronta para enviar'
                : 'Configure a chave da Claude em Integrações para habilitar'
            }
          >
            {carregando === 'followup' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MessageCircleQuestion className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>{carregando === 'followup' ? 'Gerando…' : 'Sugerir follow-up com Claude'}</span>
          </Button>
        </div>

        <p className="text-[10px] text-slate-400">
          Motor de IA: Claude (Anthropic). As ações de imagem continuam usando Gemini.
        </p>

        {resultado && (resultado.analise || resultado.followup) && (
          <div className="space-y-3">
            {(['analise', 'followup'] as AcaoIA[]).map((acao) => {
              const texto = resultado[acao]
              if (!texto) return null
              return (
                <div
                  key={acao}
                  className={cn(
                    'relative rounded-xl border p-4 text-xs leading-relaxed',
                    acaoAtiva === acao
                      ? 'border-emerald-200 bg-emerald-50/60'
                      : 'border-slate-200 bg-slate-50',
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                      <BrainCircuit className="w-3.5 h-3.5 text-[#0B7A5B]" />
                      {acao === 'analise'
                        ? 'Análise do lead — Claude'
                        : 'Follow-up sugerido — Claude'}
                    </span>
                    <button
                      type="button"
                      onClick={() => copiarTexto(texto)}
                      className="text-slate-400 hover:text-slate-700 inline-flex items-center gap-1 text-[11px]"
                      title="Copiar texto"
                    >
                      {copiado ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiado ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="text-slate-800 prose prose-slate prose-sm max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-headings:text-xs prose-headings:uppercase prose-headings:tracking-wide prose-strong:text-slate-900 prose-li:my-0.5 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5">
                    <ReactMarkdown>{texto}</ReactMarkdown>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
