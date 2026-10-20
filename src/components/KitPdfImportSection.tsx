import React, { useState, useRef } from 'react'
import {
  FileText,
  UploadCloud,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  X,
  FileCheck,
  Building,
  Zap,
  DollarSign,
  PackageCheck,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KitsService, type ExtrairPdfCotacaoResult } from '@/services/kits'
import { formatBRL } from '@/lib/solarUtils'
import { toPortugueseErrorMessage } from '@/lib/errors'

export interface KitPdfImportSectionProps {
  onApplyExtractedData: (data: ExtrairPdfCotacaoResult) => void
  onCancel?: () => void
}

export function KitPdfImportSection({ onApplyExtractedData, onCancel }: KitPdfImportSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtrairPdfCotacaoResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateAndSetFile = (file: File) => {
    setErrorMessage('')
    setExtractedData(null)

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Formato inválido. Por favor selecione um arquivo em formato PDF (.pdf).')
      return false
    }

    const MAX_BYTES = 15 * 1024 * 1024
    if (file.size > MAX_BYTES) {
      setErrorMessage(
        `PDF muito grande (${(file.size / (1024 * 1024)).toFixed(1)} MB). O limite máximo suportado é de 15 MB.`,
      )
      return false
    }

    setSelectedFile(file)
    return true
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const handleExtrair = async () => {
    if (!selectedFile) {
      setErrorMessage('Selecione um arquivo PDF de cotação antes de extrair.')
      return
    }

    try {
      setExtracting(true)
      setErrorMessage('')
      setExtractedData(null)

      const result = await KitsService.extrairPdfCotacao(selectedFile)
      setExtractedData(result)
    } catch (err: unknown) {
      console.error('Erro ao extrair PDF de cotação:', err)
      const msg = toPortugueseErrorMessage(
        err,
        'Não foi possível extrair as informações do PDF. Verifique se é uma cotação solar válida.',
      )
      setErrorMessage(msg)
    } finally {
      setExtracting(false)
    }
  }

  const handleAplicarAoFormulario = () => {
    if (!extractedData) return
    onApplyExtractedData(extractedData)
  }

  const handleReset = () => {
    setSelectedFile(null)
    setExtractedData(null)
    setErrorMessage('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Box explicativo */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50/70 via-white to-blue-50/50 border border-purple-200/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-purple-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>Leitura Inteligente de Cotação em PDF</span>
                <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px] py-0 px-1.5 gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                  Gemini IA
                </Badge>
              </h4>
              <p className="text-[11px] text-slate-500">
                Suporta cotações de distribuidoras (Belenus, PHB Solar, Fortlev, Genyx, Aldo etc.)
              </p>
            </div>
          </div>
        </div>

        {/* Área de Upload Drag-and-Drop */}
        {!extractedData && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              id="kit-pdf-file-input"
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-purple-500 bg-purple-50/70 scale-[1.01]'
                  : selectedFile
                    ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/60'
                    : 'border-slate-300 hover:border-purple-400 bg-slate-50/60 hover:bg-purple-50/30'
              }`}
            >
              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • PDF selecionado
                    </p>
                  </div>
                  <span className="text-[10px] text-purple-700 font-semibold underline mt-1">
                    Clique para trocar de arquivo
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Arraste e solte o PDF da cotação aqui, ou clique para selecionar
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Arquivos .PDF com tabela de produtos, inversores, módulos e valores (máx. 15
                      MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Ações: Cancelar e Iniciar Extração */}
            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <span>
                  O sistema lerá SKUs, marcas, potência e custo total para pré-preenchimento.
                </span>
              </span>

              <div className="flex items-center gap-2">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                    disabled={extracting}
                    className="h-9 px-3 text-xs text-slate-600"
                  >
                    Voltar
                  </Button>
                )}

                {selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    disabled={extracting}
                    className="h-9 px-2 text-xs text-slate-500 hover:text-slate-800"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Limpar
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  disabled={!selectedFile || extracting}
                  onClick={handleExtrair}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-9 px-4 gap-1.5 shadow-xs cursor-pointer"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Extraindo informações da cotação...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ler Informações do PDF</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Alerta de Erro */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-1">
              <p className="font-semibold">{errorMessage}</p>
              {errorMessage.toLowerCase().includes('integrações') && (
                <p className="text-[11px] text-rose-700">
                  Acesse <strong>Configurações &gt; Integrações &gt; Google Gemini</strong> para
                  salvar uma chave válida da API.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Visualização dos Dados Extraídos com Sucesso */}
        {extractedData && (
          <div className="space-y-3.5 animate-fade-in">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-950">
                  Cotação lida com sucesso pela IA!
                </span>
                {extractedData.distribuidora && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                    {extractedData.distribuidora}
                  </Badge>
                )}
                {extractedData.numero_cotacao && (
                  <Badge variant="outline" className="text-[10px] text-slate-700 bg-white">
                    Cotação nº {extractedData.numero_cotacao}
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-7 text-xs text-slate-600 hover:text-slate-900"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Trocar PDF
              </Button>
            </div>

            {/* Resumo dos Dados Principais */}
            <div className="p-3.5 rounded-xl bg-white border border-purple-200/90 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nome Comercial Sugerido
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                    {extractedData.nome}
                  </h4>
                  {extractedData.fabricante && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Fabricantes: <strong>{extractedData.fabricante}</strong>
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Potência Total
                  </span>
                  <span className="text-base font-extrabold text-[#0B7A5B] font-mono-numbers">
                    {extractedData.potencia_kwp.toLocaleString('pt-BR')} kWp
                  </span>
                </div>
              </div>

              {/* Badges de especificação */}
              <div className="flex items-center flex-wrap gap-1.5">
                {extractedData.qtd_paineis > 0 && extractedData.potencia_painel_w > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 border-emerald-200 text-emerald-800 text-[11px] font-semibold gap-1"
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>
                      {extractedData.qtd_paineis}x Módulos {extractedData.potencia_painel_w}W
                      {extractedData.marca_painel ? ` (${extractedData.marca_painel})` : ''}
                    </span>
                  </Badge>
                )}

                {extractedData.marca_inversor && (
                  <Badge
                    variant="outline"
                    className="bg-amber-50 border-amber-200 text-amber-900 text-[11px] font-semibold gap-1"
                  >
                    <span>
                      Inversor {extractedData.marca_inversor}{' '}
                      {extractedData.potencia_inversor_kw
                        ? `${extractedData.potencia_inversor_kw} kW`
                        : ''}
                    </span>
                  </Badge>
                )}

                {extractedData.tipo_estrutura && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 border-blue-200 text-blue-800 text-[11px] font-medium"
                  >
                    <Building className="w-3 h-3 text-blue-600 mr-1" />
                    <span>
                      {extractedData.tipo_estrutura === 'fibrocimento'
                        ? 'Fibrocimento'
                        : extractedData.tipo_estrutura === 'mini_trilho'
                          ? 'Mini trilho'
                          : extractedData.tipo_estrutura === 'solo_monoposte'
                            ? 'Solo monoposte'
                            : 'Estrutura Solar'}
                    </span>
                  </Badge>
                )}

                {extractedData.string_box && (
                  <Badge
                    variant="outline"
                    className="bg-amber-50 border-amber-300 text-amber-900 text-[11px] font-semibold"
                  >
                    <span>String box {extractedData.string_box.replace('_', ' ')}</span>
                  </Badge>
                )}
              </div>

              {/* Detalhes de Telhado / Estrutura se houver */}
              {extractedData.estrutura_detalhe && (
                <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-xs text-blue-900">
                  <span className="font-bold">Estrutura / Arranjo do Telhado: </span>
                  <span>{extractedData.estrutura_detalhe}</span>
                </div>
              )}

              {/* Valores Financeiros */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    Frete
                  </span>
                  <span className="font-bold text-slate-700 font-mono-numbers">
                    {extractedData.frete > 0 ? formatBRL(extractedData.frete) : 'Incluso / CIF'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    Custo Total do Kit
                  </span>
                  <span className="text-sm font-extrabold text-[#0B7A5B] font-mono-numbers">
                    {formatBRL(extractedData.custo)}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    Componentes Identificados
                  </span>
                  <span className="font-bold text-slate-800">
                    {extractedData.componentes.length} itens no kit
                  </span>
                </div>
              </div>

              {/* Tabela de Produtos / Componentes Extraídos */}
              {extractedData.componentes.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Lista de Produtos Extraídos ({extractedData.componentes.length} itens):
                  </span>
                  <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs bg-slate-50/40">
                    {extractedData.componentes.map((item, idx) => (
                      <div key={idx} className="p-2 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 text-xs leading-snug">
                            {item.descricao}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            {item.fabricante && (
                              <span className="font-medium text-slate-700">
                                Marca: {item.fabricante}
                              </span>
                            )}
                            {item.sku && <span>SKU: {item.sku}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="text-[10px] font-bold bg-white">
                            {item.quantidade} {item.unidade}
                          </Badge>
                          {item.preco_unitario > 0 && (
                            <p className="text-[10px] text-slate-500 font-mono-numbers mt-0.5">
                              {formatBRL(item.preco_unitario)}/un
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ação de confirmação e aplicação ao formulário */}
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="text-xs text-purple-950">
                <p className="font-bold">Deseja aplicar estes dados ao formulário de cadastro?</p>
                <p className="text-[11px] text-purple-800">
                  Você poderá revisar, alterar a margem de lucro e os campos antes de salvar no
                  catálogo.
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs h-9"
                >
                  Descartar
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleAplicarAoFormulario}
                  className="bg-[#0B7A5B] hover:bg-[#095C44] text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>Aplicar ao Formulário</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
