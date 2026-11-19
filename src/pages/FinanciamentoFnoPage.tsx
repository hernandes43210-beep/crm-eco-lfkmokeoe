import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FnoFeriadosService } from '@/services/fnoFeriados'
import { Loader2, Calculator, Landmark } from 'lucide-react'
import {
  simularFno,
  resumoDaSimulacao,
  formatarBRL,
  type FnoEntrada,
  type FnoResultado,
} from '@/lib/fnoSimulador'

const hoje = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const HOJE_ISO = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`

const ENTRADA_INICIAL: FnoEntrada = {
  valorSistema: 60000,
  valorFinanciado: 48000,
  taxaAnualAA: 9,
  prazoMeses: 96,
  carenciaMeses: 12,
  dataLiberacao: HOJE_ISO,
  dataPrimeiroVencimento: '',
}

// Dia fixo de vencimento no mês (padrão 10, como na planilha); 0 = mesmo dia da liberação.
export const DIA_VENCIMENTO_PADRAO = 10

export default function FinanciamentoFnoPage() {
  const [form, setForm] = useState<FnoEntrada>(ENTRADA_INICIAL)
  const [feriados, setFeriados] = useState<Set<string>>(new Set())
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    FnoFeriadosService.carregarFeriados()
      .then((set) => setFeriados(set))
      .finally(() => setCarregando(false))
  }, [])

  const set = (campo: keyof FnoEntrada, valor: string) => {
    setForm((prev) => ({
      ...prev,
      [campo]:
        campo === 'dataLiberacao' || campo === 'dataPrimeiroVencimento'
          ? valor
          : Number(valor) || 0,
    }))
  }

  const resultado: FnoResultado = useMemo(() => simularFno(form, feriados), [form, feriados])

  const resumo = useMemo(
    () => (resultado.parcelas.length ? resumoDaSimulacao(resultado) : null),
    [resultado],
  )

  const copiarResumo = useCallback(() => {
    if (!resumo) return
    const texto = [
      `Simulação FNO — ${formatarBRL(resumo.valor_financiado)} financiados`,
      `Taxa: ${resumo.taxa_anual_aa}% a.a. · Prazo: ${resumo.prazo_meses} meses · Carência: ${resumo.carencia_meses} meses`,
      `Entrada: ${formatarBRL(resumo.valor_entrada)}`,
      `Total de juros: ${formatarBRL(resumo.total_juros)}`,
      `Total a pagar: ${formatarBRL(resumo.total_a_pagar)}`,
    ].join('\n')
    navigator.clipboard.writeText(texto)
    toast({ title: 'Resumo copiado', description: 'Cole no WhatsApp ou e-mail do cliente.' })
  }, [resumo])

  const setNum = (campo: keyof FnoEntrada) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(campo, e.target.value)

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Landmark className="w-6 h-6 text-[#0B7A5B]" />
          Financiamento FNO
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Simulador SAC com carência — juros por dias úteis (base 252), apuração em 2 trechos (dia
          10 e vencimento). Feriados bancários lidos do banco em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#0B7A5B]" />
              Dados da Simulação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Valor do Sistema (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.valorSistema}
                onChange={setNum('valorSistema')}
                className="h-10 text-sm font-semibold border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Valor Financiado (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.valorFinanciado}
                onChange={setNum('valorFinanciado')}
                className="h-10 text-sm font-semibold border-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Taxa (% a.a.)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.taxaAnualAA}
                  onChange={setNum('taxaAnualAA')}
                  className="h-10 text-sm font-semibold border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Prazo (meses)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.prazoMeses}
                  onChange={setNum('prazoMeses')}
                  className="h-10 text-sm font-semibold border-slate-200"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Carência (meses)</Label>
              <Input
                type="number"
                min="0"
                value={form.carenciaMeses}
                onChange={setNum('carenciaMeses')}
                className="h-10 text-sm font-semibold border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Data de Liberação</Label>
              <Input
                type="date"
                value={form.dataLiberacao}
                onChange={(e) => set('dataLiberacao', e.target.value)}
                className="h-10 text-sm border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                1º Vencimento (opcional)
              </Label>
              <Input
                type="date"
                value={form.dataPrimeiroVencimento || ''}
                onChange={(e) => set('dataPrimeiroVencimento', e.target.value)}
                className="h-10 text-sm border-slate-200"
              />
              <p className="text-[11px] text-slate-400">
                Vazio = liberação + 1 mês, no mesmo dia do mês.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              Feriados carregados do banco: <strong>{feriados.size}</strong>
              {carregando && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        <div className="lg:col-span-2 space-y-6">
          {resultado.erro ? (
            <Card>
              <CardContent className="p-6 text-sm text-red-600 font-medium">
                {resultado.erro}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase">Entrada</p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatarBRL(resultado.valorEntrada)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase">
                      Total Juros
                    </p>
                    <p className="text-lg font-bold text-amber-600">
                      {formatarBRL(resultado.totalJuros)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase">
                      Total a Pagar
                    </p>
                    <p className="text-lg font-bold text-[#0B7A5B]">
                      {formatarBRL(resultado.totalAPagar)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase">
                      Parcela média (com amortização)
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatarBRL(resumo?.parcela_mensal_estimada ?? 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2 border-b border-slate-100 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base font-bold text-slate-900">
                    Cronograma de Parcelas
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={copiarResumo}>
                    Copiar resumo
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[520px]">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr className="text-left text-slate-600">
                          <th className="px-3 py-2 font-semibold">Nº</th>
                          <th className="px-3 py-2 font-semibold">Vencimento</th>
                          <th className="px-3 py-2 font-semibold text-right">D.U. t1</th>
                          <th className="px-3 py-2 font-semibold text-right">Juros t1</th>
                          <th className="px-3 py-2 font-semibold text-right">D.U. t2</th>
                          <th className="px-3 py-2 font-semibold text-right">Juros t2</th>
                          <th className="px-3 py-2 font-semibold text-right">Juros mês</th>
                          <th className="px-3 py-2 font-semibold text-right">Amortização</th>
                          <th className="px-3 py-2 font-semibold text-right">Parcela</th>
                          <th className="px-3 py-2 font-semibold text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.parcelas.map((p) => (
                          <tr key={p.n} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-3 py-1.5 font-semibold text-slate-700">{p.n}</td>
                            <td className="px-3 py-1.5 text-slate-600">{p.vencimento}</td>
                            <td className="px-3 py-1.5 text-right text-slate-500">
                              {p.diasUteisTrecho1}
                            </td>
                            <td className="px-3 py-1.5 text-right text-slate-600">
                              {formatarBRL(p.jurosTrecho1)}
                            </td>
                            <td className="px-3 py-1.5 text-right text-slate-500">
                              {p.diasUteisTrecho2}
                            </td>
                            <td className="px-3 py-1.5 text-right text-slate-600">
                              {formatarBRL(p.jurosTrecho2)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-semibold text-slate-800">
                              {formatarBRL(p.jurosMes)}
                            </td>
                            <td className="px-3 py-1.5 text-right text-slate-600">
                              {formatarBRL(p.amortizacao)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-bold text-[#0B7A5B]">
                              {formatarBRL(p.parcela)}
                            </td>
                            <td className="px-3 py-1.5 text-right text-slate-500">
                              {formatarBRL(p.saldoFinal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
