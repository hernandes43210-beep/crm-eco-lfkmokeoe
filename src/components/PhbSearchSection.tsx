import React, { useState } from 'react'
import {
  Search,
  Zap,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Download,
  Info,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Building,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  PhbSolarService,
  OPCOES_TENSAO_PHB,
  OPCOES_ESTRUTURA_PHB,
  type PhbTensao,
  type PhbTipoEstrutura,
  type PhbKitResumo,
  type PhbImportResult,
} from '@/services/phbSolar'
import { formatBRL } from '@/lib/solarUtils'

export interface PhbSearchSectionProps {
  onImportKit: (kitData: PhbImportResult) => void
  onCancel?: () => void
}

export function PhbSearchSection({ onImportKit, onCancel }: PhbSearchSectionProps) {
  // Parâmetros de busca PHB
  const [potenciaWp, setPotenciaWp] = useState<number | string>(6000)
  const [tensao, setTensao] = useState<PhbTensao>('mono_220')
  const [tipoEstrutura, setTipoEstrutura] = useState<PhbTipoEstrutura>('telhado')

  // Estados de consulta
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [kits, setKits] = useState<PhbKitResumo[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isConfigError, setIsConfigError] = useState(false)

  // Estado de importação de um kit específico
  const [importingUid, setImportingUid] = useState<string | null>(null)
  const [importedSuccessUid, setImportedSuccessUid] = useState<string | null>(null)

  const handleBuscar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMessage('')
    setIsConfigError(false)

    const potNum = Number(potenciaWp)
    if (!potNum || potNum <= 0) {
      setErrorMessage('Informe uma potência desejada (Wp) maior que zero.')
      return
    }

    try {
      setSearching(true)
      setHasSearched(true)
      setImportedSuccessUid(null)

      const res = await PhbSolarService.buscarKits({
        potencia: potNum,
        tensao,
        tipo_estrutura: tipoEstrutura,
      })

      const list = Array.isArray(res.kits) ? res.kits : []
      setKits(list)

      if (list.length === 0) {
        setErrorMessage(
          'Nenhum kit encontrado para esses parâmetros — ajuste a potência ou a estrutura.',
        )
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível conectar à PHB Solar — tente novamente em instantes.'

      setErrorMessage(msg)
      if (msg.toLowerCase().includes('token') || msg.toLowerCase().includes('integrações')) {
        setIsConfigError(true)
      }
      setKits([])
    } finally {
      setSearching(false)
    }
  }

  const handleImportar = async (kitResumo: PhbKitResumo) => {
    try {
      setImportingUid(kitResumo.uid)
      setErrorMessage('')

      // Chamada a GET /kit/{uid} via backend para trazer a lista completa de componentes
      const detalhes = await PhbSolarService.getKitDetalhes(kitResumo.uid)

      // Converte para o modelo do CRM
      const crmKit = PhbSolarService.mapPhbKitToCrm(detalhes, kitResumo)

      setImportedSuccessUid(kitResumo.uid)
      onImportKit(crmKit)
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível obter os detalhes do kit na PHB Solar.'
      setErrorMessage(msg)
    } finally {
      setImportingUid(null)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Box explicativo e formulário de parâmetros */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/70 via-white to-emerald-50/50 border border-amber-200/80 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>Consulta de Kits na Plataforma PHB Solar</span>
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] py-0 px-1.5">
                  API Oficial v1.4.0
                </Badge>
              </h4>
              <p className="text-[11px] text-slate-500">
                Preços de custo e componentes oficiais direto da distribuidora
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleBuscar} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Potência Wp */}
            <div className="sm:col-span-4 space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="phbPotencia" className="text-xs font-semibold text-slate-700">
                  Potência Desejada (Wp) *
                </Label>
                <span className="text-[10px] text-amber-700 font-mono font-medium">
                  {Number(potenciaWp) > 0
                    ? `${(Number(potenciaWp) / 1000).toLocaleString('pt-BR')} kWp`
                    : ''}
                </span>
              </div>
              <Input
                id="phbPotencia"
                type="number"
                min="500"
                step="50"
                value={potenciaWp}
                onChange={(e) => setPotenciaWp(e.target.value)}
                placeholder="Ex: 6000 (para 6 kWp)"
                className="h-9.5 text-sm font-semibold border-slate-200 focus-visible:ring-amber-500"
                required
              />
              <p className="text-[10px] text-slate-500">
                Ex.: 3000 (3 kWp), 6600 (6,6 kWp), 10000 (10 kWp)
              </p>
            </div>

            {/* Tensão da Rede */}
            <div className="sm:col-span-4 space-y-1">
              <Label htmlFor="phbTensao" className="text-xs font-semibold text-slate-700">
                Tensão da Rede Elétrica *
              </Label>
              <select
                id="phbTensao"
                value={tensao}
                onChange={(e) => setTensao(e.target.value as PhbTensao)}
                className="w-full h-9.5 px-3 text-xs sm:text-sm font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {OPCOES_TENSAO_PHB.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">
                {OPCOES_TENSAO_PHB.find((t) => t.value === tensao)?.desc}
              </p>
            </div>

            {/* Tipo de Estrutura */}
            <div className="sm:col-span-4 space-y-1">
              <Label
                htmlFor="phbEstrutura"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1"
              >
                <Building className="w-3 h-3 text-blue-600" />
                <span>Tipo de Estrutura *</span>
              </Label>
              <select
                id="phbEstrutura"
                value={tipoEstrutura}
                onChange={(e) => setTipoEstrutura(e.target.value as PhbTipoEstrutura)}
                className="w-full h-9.5 px-3 text-xs sm:text-sm font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {OPCOES_ESTRUTURA_PHB.map((est) => (
                  <option key={est.value} value={est.value}>
                    {est.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">Fixação dos painéis no local</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>O UID retornado pela PHB é reservado e válido por 1 hora.</span>
            </span>

            <div className="flex items-center gap-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  className="h-9 px-3 text-xs text-slate-600"
                >
                  Voltar ao cadastro manual
                </Button>
              )}

              <Button
                type="submit"
                size="sm"
                disabled={searching}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-9 px-4 gap-1.5 shadow-xs cursor-pointer"
              >
                {searching ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Buscando na PHB...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Buscar Kits na PHB Solar</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Alerta de Erro */}
      {errorMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in ${
            isConfigError
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <AlertCircle
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              isConfigError ? 'text-amber-600' : 'text-rose-600'
            }`}
          />
          <div className="space-y-1">
            <p className="font-semibold">{errorMessage}</p>
            {isConfigError && (
              <p className="text-[11px] text-amber-800">
                Acesse o menu <strong>Integrações &gt; PHB Solar</strong> para informar ou atualizar
                o Token Bearer.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Resultados da Busca */}
      {hasSearched && !searching && kits.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Resultados encontrados:</span>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                {kits.length} {kits.length === 1 ? 'kit disponível' : 'kits disponíveis'}
              </Badge>
            </span>
            <span className="text-[11px] text-slate-500">
              Clique em &quot;Importar para o formulário&quot; para preencher automaticamente
            </span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {kits.map((kit) => {
              const isImportingThis = importingUid === kit.uid
              const isSuccess = importedSuccessUid === kit.uid
              const potCcKw =
                kit.potencia_cc > 100
                  ? (kit.potencia_cc / 1000).toLocaleString('pt-BR')
                  : kit.potencia_cc.toLocaleString('pt-BR')

              return (
                <div
                  key={kit.uid}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isSuccess
                      ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <Badge
                          variant="outline"
                          className="bg-amber-50 border-amber-300 text-amber-900 text-[11px] font-bold gap-1"
                        >
                          <Zap className="w-3 h-3 text-amber-600" />
                          <span>{potCcKw} kWp</span>
                        </Badge>

                        {kit.tensao && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-slate-50 text-slate-700"
                          >
                            {kit.tensao}
                          </Badge>
                        )}

                        {kit.tipo_estrutura && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-blue-50 text-blue-800 border-blue-200"
                          >
                            {kit.tipo_estrutura}
                          </Badge>
                        )}

                        {kit.contem_trafo && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-purple-50 text-purple-800 border-purple-200"
                          >
                            Com Trafo
                          </Badge>
                        )}

                        {kit.potencia_modulo ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200"
                          >
                            Módulo {kit.potencia_modulo} Wp
                          </Badge>
                        ) : null}
                      </div>

                      <h5 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                        {kit.descricao || `Kit Solar PHB ${potCcKw} kWp`}
                      </h5>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-mono-numbers">
                          <DollarSign className="w-3 h-3 text-emerald-600" />
                          <strong className="text-slate-900 font-bold text-xs">
                            Custo PHB: {formatBRL(kit.preco || 0)}
                          </strong>
                        </span>
                        {kit.tipo_kit && <span className="truncate">Tipo: {kit.tipo_kit}</span>}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                      <Button
                        type="button"
                        size="sm"
                        disabled={!!importingUid}
                        onClick={() => handleImportar(kit)}
                        className={`h-9 px-3.5 text-xs font-bold gap-1.5 transition-all ${
                          isSuccess
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-[#0B7A5B] hover:bg-[#095C44] text-white shadow-xs'
                        }`}
                      >
                        {isImportingThis ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Buscando componentes...</span>
                          </>
                        ) : isSuccess ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Importado!</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Importar</span>
                            <ArrowRight className="w-3 h-3" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Dica de segurança e garantia */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px] text-slate-500 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p>
          Ao importar, o CRM extrai o inversor (ex: Sungrow/Huawei/PHB), a lista de módulos
          fotovoltaicos, proteções de string box e preenche o preço de custo. Você pode revisar
          todos os dados, ajustar a margem e salvar com 1 clique.
        </p>
      </div>
    </div>
  )
}
