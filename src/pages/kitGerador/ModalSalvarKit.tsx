// Modal de salvar kit com RESUMO DE CONFERÊNCIA antes de gravar
// Mostra tudo que foi adicionado (painéis, inversores, baterias, outros dados,
// itens adicionais, distribuidora e resumo de preço) antes de confirmar.
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { ClipboardCheck } from 'lucide-react'
import { fmt, fmtBRL } from './logica'
import { parseNumeroPtBr } from './formControles'
import type { EstadoCalculo } from './kitCalculos'
import { toPainelLinhas, toInversorLinhas, toBateriaLinhas } from './kitCalculos'
import type { EstadoForm } from './formTipos'
import {
  SecaoResumo,
  LinhaResumoPainel,
  LinhaResumoInversor,
  LinhaResumoBateria,
} from './LinhasResumoConferencia'

export function ModalSalvarKit({
  aberto,
  onOpenChange,
  nomeKit,
  setNomeKit,
  form,
  calc,
  onConfirmar,
  salvando,
}: {
  aberto: boolean
  onOpenChange: (aberto: boolean) => void
  nomeKit: string
  setNomeKit: (nome: string) => void
  form: EstadoForm
  calc: EstadoCalculo
  onConfirmar: () => void
  salvando: boolean
}) {
  const paineis = toPainelLinhas(form.painelLinhas)
  const inversores = toInversorLinhas(form.inversorLinhas)
  const baterias = toBateriaLinhas(form.baterias)
  const itensIncluidos = form.itens.filter((it) => it.incluido !== false)
  const capacidadeTotalKwh = baterias.reduce(
    (acc, b) => acc + (b.capacidade_kwh || 0) * (b.qtd || 1),
    0,
  )

  // Valores comerciais (mesmos parsers usados nos cartões do formulário)
  const custoBase = parseNumeroPtBr(form.custo) ?? 0
  const custoTotal = custoBase + (calc.precoItens || 0)
  const margemNum = parseNumeroPtBr(form.acrescimoPct) ?? 0
  const descNum = parseNumeroPtBr(form.descontoValor) ?? 0

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#0b1f4d]">
            <ClipboardCheck className="h-5 w-5 text-[#f1c40f]" />
            Conferir kit antes de salvar
          </DialogTitle>
          <DialogDescription className="text-xs">
            Revise tudo que foi adicionado. Depois confirme para gravar o kit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs">Nome do kit</Label>
            <Input
              value={nomeKit}
              onChange={(e) => setNomeKit(e.target.value)}
              placeholder="Ex.: Kit 5,5 kWp Canadian + Growatt"
            />
          </div>

          <ScrollArea className="max-h-[45vh] rounded-[10px] border border-[#dfe5f0] bg-[#f8fafc]">
            <div className="space-y-3 p-3 text-xs">
              {/* Painéis */}
              <SecaoResumo
                titulo={`Módulos fotovoltaicos — ${calc.qtdPaineisTotal} un. (${paineis.length} modelo(s))`}
              >
                {paineis.map((p, i) => (
                  <LinhaResumoPainel key={`p-${i}`} linha={p} />
                ))}
                {form.outrosDadosPaineis?.trim() && (
                  <p className="rounded-md bg-[#eef3fb] px-2 py-1 text-[11px] text-[#3c4a63]">
                    <strong>Outros dados (painéis):</strong> {form.outrosDadosPaineis}
                  </p>
                )}
              </SecaoResumo>

              {/* Inversores */}
              <SecaoResumo
                titulo={`Inversores — ${calc.qtdInversoresTotal} un. (${inversores.length} modelo(s))`}
              >
                {inversores.map((inv, i) => (
                  <LinhaResumoInversor key={`inv-${i}`} linha={inv} />
                ))}
                {form.outrosDadosInversores?.trim() && (
                  <p className="rounded-md bg-[#eef3fb] px-2 py-1 text-[11px] text-[#3c4a63]">
                    <strong>Outros dados (inversores):</strong> {form.outrosDadosInversores}
                  </p>
                )}
              </SecaoResumo>

              {/* Baterias */}
              {baterias.length > 0 && (
                <SecaoResumo
                  titulo={`Baterias — ${baterias.length} linha(s)${capacidadeTotalKwh > 0 ? ` — ${fmt(capacidadeTotalKwh)} kWh` : ''}`}
                >
                  {baterias.map((b, i) => (
                    <LinhaResumoBateria key={`bat-${i}`} linha={b} />
                  ))}
                </SecaoResumo>
              )}

              {/* Itens adicionais */}
              {itensIncluidos.length > 0 && (
                <SecaoResumo titulo={`Itens adicionais — ${itensIncluidos.length}`}>
                  <div className="rounded-md border border-[#dfe5f0] bg-white px-2 py-1.5 text-xs">
                    {itensIncluidos.map((it, i) => (
                      <p key={i} className="truncate text-[#3c4a63]">
                        • {it.qtd || 1}× {it.nome}
                      </p>
                    ))}
                  </div>
                </SecaoResumo>
              )}

              {/* Estrutura / Fornecedor */}
              <SecaoResumo titulo="Estrutura & Fornecedor">
                <div className="rounded-md border border-[#dfe5f0] bg-white px-2 py-1.5 text-xs text-[#3c4a63]">
                  <p>• Estrutura: {form.tipoInstalacao}</p>
                  <p>• Ligação: {form.ligacao}</p>
                  <p>
                    • Distribuidora:{' '}
                    {form.distribuidora === '__outra__'
                      ? form.distribuidoraNova || '—'
                      : form.distribuidora || '—'}
                  </p>
                </div>
              </SecaoResumo>

              {/* Preço */}
              <SecaoResumo titulo="Comercial">
                <div className="space-y-0.5 rounded-md border border-[#dfe5f0] bg-white px-2 py-1.5 text-xs text-[#3c4a63]">
                  <p>• Custo total do kit: R$ {fmtBRL(custoTotal)}</p>
                  <p>
                    • Margem sobre o preço de venda: {fmt(margemNum)}% (preço = custo ÷ (1 − margem
                    ÷ 100))
                  </p>
                  {descNum > 0 && (
                    <p>
                      • Desconto:{' '}
                      {form.descontoTipo === '%' ? `${fmt(descNum)}%` : `R$ ${fmtBRL(descNum)}`}
                    </p>
                  )}
                  <p className="font-semibold text-[#0b1f4d]">
                    • Preço final: R$ {fmtBRL(calc.precoFinal ?? 0)}
                  </p>
                </div>
              </SecaoResumo>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar e editar
          </Button>
          <Button
            onClick={onConfirmar}
            disabled={salvando}
            className="bg-[#0b1f4d] text-white hover:bg-[#13306b]"
          >
            {salvando ? 'Salvando…' : 'Confirmar e salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
