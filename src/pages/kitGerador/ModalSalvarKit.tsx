// Seções do modal de salvar kit e diálogos auxiliares
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { fmt, fmtInt, fmtBRL } from './logica'
import type { EstadoCalculo } from './kitCalculos'
import type { EstadoForm } from './formTipos'

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
  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#0b1f4d]">Salvar kit solar</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Nome do kit</Label>
            <Input
              value={nomeKit}
              onChange={(e) => setNomeKit(e.target.value)}
              placeholder="Ex.: Kit 5,5 kWp Canadian + Growatt"
            />
          </div>
          <div className="rounded-[10px] bg-[#f8fafc] p-3 text-xs space-y-1">
            <p>
              <strong>Potência:</strong> {fmt(calc.kwp)} kWp
            </p>
            <p>
              <strong>Painéis:</strong> {calc.qtdPaineisTotal} un. ({form.painelLinhas.length}{' '}
              modelos)
            </p>
            <p>
              <strong>Inversores:</strong> {calc.qtdInversoresTotal} un. (
              {form.inversorLinhas.length} modelos)
            </p>
            <p>
              <strong>Preço final:</strong> R$ {fmtBRL(calc.precoFinal ?? 0)}
            </p>
            {form.outrosDadosPaineis && (
              <p className="truncate text-[#8a94a8]">
                <strong>Obs painéis:</strong> {form.outrosDadosPaineis}
              </p>
            )}
            {form.outrosDadosInversores && (
              <p className="truncate text-[#8a94a8]">
                <strong>Obs inversores:</strong> {form.outrosDadosInversores}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
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
