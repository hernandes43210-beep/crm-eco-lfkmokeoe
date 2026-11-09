import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, X, UserCheck } from 'lucide-react'
import { LeadsService } from '@/services/leads'
import { GerarPropostaModal } from '@/components/GerarPropostaModal'
import {
  parsePainelJson,
  parseInversorJson,
  parseItens,
  type KitGerado,
} from '@/services/kitGerador'
import type { Lead } from '@/types/crm'
import { fmt, fmtBRL, fmtInt } from './logica'

/** Converte número vindo do banco (pode chegar como string) em number seguro. */
const num = (v: unknown): number => {
  const x = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v)
  return Number.isFinite(x) ? x : 0
}

/** Busca e escolha de um lead existente do CRM. */
function BuscaCliente({
  lead,
  onSelecionar,
}: {
  lead: Lead | null
  onSelecionar: (l: Lead | null) => void
}) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<Lead[]>([])
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    const t = termo.trim().replace(/["\\]/g, '')
    if (t.length < 2) {
      setResultados([])
      setBuscando(false)
      return
    }
    let ativo = true
    setBuscando(true)
    const timer = setTimeout(async () => {
      try {
        const r = await LeadsService.getLeads({
          search: t,
          perPage: 8,
          statusQualificacao: 'all',
          sort: 'nome',
        })
        if (ativo) setResultados(r.items)
      } catch {
        if (ativo) setResultados([])
      } finally {
        if (ativo) setBuscando(false)
      }
    }, 300)
    return () => {
      ativo = false
      clearTimeout(timer)
    }
  }, [termo])

  if (lead) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#cfe8dc] bg-[#f0faf5] p-3">
        <div className="flex min-w-0 items-center gap-2">
          <UserCheck className="h-4 w-4 shrink-0 text-[#0b7a5b]" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#0b1f4d]">{lead.nome}</p>
            <p className="text-xs text-[#3c4a63]">{lead.telefone || 'Sem telefone cadastrado'}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelecionar(null)}
          className="text-[#c0392b]"
          aria-label="Remover cliente"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[#8a94a8]" />
        <Input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Buscar cliente por nome, telefone ou e-mail…"
          className="pl-8"
        />
      </div>
      {buscando && <p className="text-xs text-[#8a94a8]">Buscando…</p>}
      {!buscando && termo.trim().length >= 2 && resultados.length === 0 && (
        <p className="text-xs text-[#8a94a8]">Nenhum cliente encontrado.</p>
      )}
      {resultados.length > 0 && (
        <ul className="max-h-48 divide-y divide-[#eef2f8] overflow-y-auto rounded-[10px] border border-[#dfe5f0]">
          {resultados.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => {
                  onSelecionar(l)
                  setTermo('')
                  setResultados([])
                }}
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-[#eef2f8]"
              >
                <span className="text-sm font-semibold text-[#0b1f4d]">{l.nome}</span>
                <span className="text-xs text-[#3c4a63]">
                  {l.telefone || 'Sem telefone'}
                  {l.cidade ? ` · ${l.cidade}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#eef2f8] py-1.5 text-sm">
      <span className="text-[#8a94a8]">{rotulo}</span>
      <span className="text-right font-medium text-[#0b1f4d]">{valor}</span>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[12px] border border-[#dfe5f0] bg-white p-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[#0b1f4d]">
        {titulo}
      </h3>
      {children}
    </section>
  )
}

/**
 * Pré-proposta de um kit salvo: resumo visual do kit, vínculo opcional com um
 * cliente do CRM e ações "Gerar proposta" (reaproveita o GerarPropostaModal já
 * preenchido com este kit) e "Editar kit" (carrega no formulário do gerador).
 */
export function PrePropostaKit({
  kit,
  onFechar,
  onEditar,
}: {
  kit: KitGerado
  onFechar: () => void
  onEditar: (kit: KitGerado) => void
}) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [gerarAberto, setGerarAberto] = useState(false)

  const painel = parsePainelJson(kit.painel)
  const inversor = parseInversorJson(kit.inversor)
  const itens = parseItens(kit.itens)

  const potenciaKwp = num(kit.potencia_kwp)
  const geracao = num(kit.geracao_kwh)
  const area = num(kit.area_m2)
  const custo = num(kit.custo)
  const margem = num(kit.margem_pct)
  const precoVenda = num(kit.preco_venda)
  const precoFinal = num(kit.preco_final)
  const descontoRs = num(kit.desconto_rs)
  const descontoValor = num(kit.desconto_valor)

  const descontoTexto =
    descontoRs > 0
      ? kit.desconto_tipo === '%'
        ? `${fmt(descontoValor)}% (${fmtBRL(descontoRs)})`
        : fmtBRL(descontoRs)
      : null

  return (
    <>
      <Dialog open={!gerarAberto} onOpenChange={(o) => !o && onFechar()}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-0 bg-[#eef2f8] p-0">
          <div className="border-b-4 border-[#ffd23f] bg-[#0b1f4d] px-6 py-4 text-white">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#c6d2ea]">
              Pré-proposta · Kit Solar
            </p>
            <DialogTitle className="text-xl font-bold text-white">{kit.nome}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-[#c6d2ea]">
              Cliente: {lead ? lead.nome : 'não vinculado'}
            </DialogDescription>
          </div>

          <div className="space-y-4 p-6">
            <Secao titulo="Cliente">
              <BuscaCliente lead={lead} onSelecionar={setLead} />
            </Secao>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[12px] bg-[#0b1f4d] p-3 text-center text-white">
                <p className="text-[11px] uppercase text-[#c6d2ea]">Potência</p>
                <p className="text-lg font-bold">{fmt(potenciaKwp)} kWp</p>
              </div>
              <div className="rounded-[12px] bg-[#0b1f4d] p-3 text-center text-white">
                <p className="text-[11px] uppercase text-[#c6d2ea]">Geração</p>
                <p className="text-lg font-bold">{fmtInt(geracao)} kWh/mês</p>
              </div>
              <div className="rounded-[12px] bg-[#0b1f4d] p-3 text-center text-white">
                <p className="text-[11px] uppercase text-[#c6d2ea]">Área</p>
                <p className="text-lg font-bold">{fmtInt(area)} m²</p>
              </div>
            </div>

            <Secao titulo="Equipamentos">
              <Linha
                rotulo="Painéis"
                valor={
                  painel
                    ? `${painel.qtd}× ${painel.marca} ${painel.modelo} ${fmtInt(num(painel.potencia_w))} W`
                    : '—'
                }
              />
              <Linha
                rotulo="Inversor"
                valor={
                  inversor
                    ? `${inversor.qtd}× ${inversor.marca} ${inversor.modelo} ${fmt(num(inversor.potencia_kw))} kW`
                    : '—'
                }
              />
              <Linha rotulo="Tipo de instalação" valor={kit.tipo_instalacao || '—'} />
              <Linha rotulo="Distribuidora" valor={kit.distribuidora || '—'} />
            </Secao>

            {itens.length > 0 && (
              <Secao titulo="Itens inclusos">
                <ul className="space-y-1 text-sm text-[#3c4a63]">
                  {itens.map((i, idx) => (
                    <li key={`${i.nome}-${idx}`}>
                      {num(i.qtd)}× {i.nome}
                    </li>
                  ))}
                </ul>
              </Secao>
            )}

            <Secao titulo="Investimento">
              <Linha rotulo="Preço de venda" valor={fmtBRL(precoVenda)} />
              {descontoTexto && <Linha rotulo="Desconto" valor={descontoTexto} />}
              <div className="mt-2 flex items-center justify-between rounded-[10px] bg-[#ffd23f]/30 px-3 py-2">
                <span className="text-sm font-semibold text-[#0b1f4d]">Preço final</span>
                <span className="text-xl font-bold text-[#0b1f4d]">{fmtBRL(precoFinal)}</span>
              </div>
              <div className="mt-3 border-t border-dashed border-[#dfe5f0] pt-2">
                <p className="mb-1 text-[11px] uppercase text-[#8a94a8]">Interno</p>
                <Linha rotulo="Custo" valor={fmtBRL(custo)} />
                <Linha rotulo="Margem" valor={`${fmt(margem)}%`} />
              </div>
            </Secao>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-[#dfe5f0] bg-white px-6 py-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onFechar}>
              Fechar
            </Button>
            <Button
              variant="outline"
              onClick={() => onEditar(kit)}
              className="border-[#dfe5f0] text-[#0b1f4d]"
            >
              Editar kit
            </Button>
            <Button
              disabled={!lead}
              title={lead ? undefined : 'Escolha um cliente para gerar a proposta'}
              onClick={() => setGerarAberto(true)}
              className="bg-[#0b1f4d] text-white hover:bg-[#13306b]"
            >
              Gerar proposta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {lead && (
        <GerarPropostaModal
          open={gerarAberto}
          onOpenChange={(o) => setGerarAberto(o)}
          lead={lead}
          kitGeradoInicial={kit}
          onProposalCreated={() => onFechar()}
        />
      )}
    </>
  )
}
