import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Sliders,
  Table as TableIcon,
  HelpCircle,
  FileCheck,
  Check,
  AlertCircle,
  X,
  FileText,
  UserCheck,
  Zap,
  ShieldAlert,
  Loader2,
  Download,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/context/AuthContext'
import { LeadsService } from '@/services/leads'
import {
  parseSpreadsheetBuffer,
  autoDetectMapping,
  evaluateRowDeduplication,
  executeLeadImport,
  CRM_FIELDS,
  CRMField,
  ColumnMapping,
  ParsedSpreadsheet,
  ProcessedLeadRow,
  ImportSummary,
} from '@/services/leadImport'
import type { Lead } from '@/types/crm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/hooks/use-toast'
import { formatBRL } from '@/lib/solarUtils'

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'completed'

export default function LeadImportPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Current wizard step
  const [currentStep, setCurrentStep] = useState<Step>('upload')

  // File states
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Spreadsheet options
  const [hasHeaders, setHasHeaders] = useState(true)
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)
  const [parsedData, setParsedData] = useState<ParsedSpreadsheet | null>(null)

  // Mapping state
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    nome: '',
    email: '',
    telefone: '',
    cidade: '',
    estado: '',
    endereco: '',
    bairro: '',
    cpf_cnpj: '',
    cep: '',
    nacionalidade: '',
    estado_civil: '',
    profissao: '',
    consumo_mensal_kwh: '',
    preco_venda: '',
    origem: '',
    luvik_deal_id: '',
  })

  // Deduplication & Existing Leads
  const [existingLeads, setExistingLeads] = useState<Lead[]>([])
  const [updateDuplicates, setUpdateDuplicates] = useState(true)
  const [defaultSlaDias, setDefaultSlaDias] = useState(7)
  const [processedRows, setProcessedRows] = useState<ProcessedLeadRow[]>([])

  // Preview filtering
  const [statusFilter, setStatusFilter] = useState<'all' | 'novo' | 'duplicado' | 'invalido'>('all')

  // Import execution
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percent: 0 })
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)

  // Load existing leads for deduplication checks
  useEffect(() => {
    LeadsService.getAllLeads()
      .then((leads) => setExistingLeads(leads))
      .catch((err) => {
        console.warn('Erro ao carregar leads para deduplicação:', err)
      })
  }, [])

  // Process file upload
  const handleFile = async (file: File) => {
    setErrorMessage(null)
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      setErrorMessage(
        'Formato inválido. Por favor, envie uma planilha no formato .xlsx, .xls ou .csv (exportação do Luvik).',
      )
      toast({
        title: 'Arquivo incompatível',
        description: 'Selecione um arquivo .xlsx ou .csv válido.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsParsing(true)
      setSelectedFile(file)
      const buffer = await file.arrayBuffer()
      setFileBuffer(buffer)

      const parsed = parseSpreadsheetBuffer(buffer, {
        hasHeaders: true,
        sheetIndex: 0,
      })

      if (parsed.dataRows.length === 0) {
        setErrorMessage('A planilha selecionada está vazia ou não contém linhas de dados legíveis.')
        setIsParsing(false)
        return
      }

      setParsedData(parsed)

      // Heuristic auto-mapping
      const detected = autoDetectMapping(parsed.headers, parsed.dataRows.slice(0, 10))
      setColumnMapping(detected)

      // Advance to mapping step
      setCurrentStep('mapping')
      toast({
        title: 'Planilha carregada!',
        description: `${parsed.dataRows.length} linhas encontradas na aba "${parsed.activeSheet}".`,
      })
    } catch (err: unknown) {
      console.error('Erro ao ler planilha:', err)
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Falha ao processar o arquivo. Verifique se a planilha não está corrompida ou protegida por senha.',
      )
    } finally {
      setIsParsing(false)
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  // Re-parse when toggling hasHeaders or activeSheetIndex
  const reparseData = (newHasHeaders: boolean, sheetIdx: number) => {
    if (!fileBuffer) return
    try {
      const parsed = parseSpreadsheetBuffer(fileBuffer, {
        hasHeaders: newHasHeaders,
        sheetIndex: sheetIdx,
      })
      setParsedData(parsed)
      const detected = autoDetectMapping(parsed.headers, parsed.dataRows.slice(0, 10))
      setColumnMapping(detected)
    } catch (err: unknown) {
      console.error('Erro ao reprocessar aba:', err)
    }
  }

  // Trigger evaluation when moving to preview
  const handleProceedToPreview = () => {
    if (!columnMapping.nome) {
      setErrorMessage(
        'A coluna "Nome do Lead" é obrigatória. Por favor, mapeie a coluna correspondente da planilha antes de continuar.',
      )
      toast({
        title: 'Mapeamento incompleto',
        description: 'Mapeie o campo obrigatório "Nome do Lead".',
        variant: 'destructive',
      })
      return
    }

    if (!parsedData || parsedData.dataRows.length === 0) {
      setErrorMessage('Nenhum dado disponível para visualização.')
      return
    }

    setErrorMessage(null)
    const evaluated = evaluateRowDeduplication(
      parsedData.dataRows,
      columnMapping,
      existingLeads,
      selectedFile?.name,
    )
    setProcessedRows(evaluated)
    setCurrentStep('preview')
  }

  // Execute import
  const handleStartImport = async () => {
    if (processedRows.length === 0) return

    setCurrentStep('importing')
    setImportProgress({ current: 0, total: processedRows.length, percent: 0 })

    try {
      const summary = await executeLeadImport(processedRows, {
        updateDuplicates,
        currentUserId: user?.id || pb.authStore.record?.id || '',
        sourceFilename: selectedFile?.name || 'Importação Luvik',
        slaDias: defaultSlaDias,
        onProgress: (p) => setImportProgress(p),
      })

      setImportSummary(summary)
      setCurrentStep('completed')

      toast({
        title: 'Importação concluída!',
        description: `${summary.created} criados, ${summary.updated} atualizados, ${summary.ignored} ignorados.`,
      })
    } catch (err: unknown) {
      console.error('Erro durante importação:', err)
      toast({
        title: 'Erro na importação',
        description: 'Ocorreu uma falha no processamento de leads.',
        variant: 'destructive',
      })
      setCurrentStep('preview')
    }
  }

  // Quick template download helper
  const handleDownloadSample = () => {
    const wsData = [
      ['ID Negócio', 'Cliente', 'Telefone', 'E-mail', 'Cidade', 'Estado', 'Consumo kWh', 'Valor'],
      [
        'LVK-8491',
        'Carlos Alberto Silva',
        '(11) 98765-4321',
        'carlos.silva@exemplo.com.br',
        'Campinas',
        'SP',
        520,
        22500,
      ],
      [
        'LVK-8492',
        'Mariana Santos Souza',
        '(69) 99234-5678',
        'mariana.souza@exemplo.com.br',
        'Porto Velho',
        'RO',
        840,
        34000,
      ],
      [
        'LVK-8493',
        'Padaria Bella Alvorada',
        '(31) 98456-1122',
        'contato@padariabella.com.br',
        'Belo Horizonte',
        'MG',
        1400,
        58000,
      ],
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Negócios Luvik')
    XLSX.writeFile(wb, 'exemplo-negocios-luvik.xlsx')
  }

  // Filter preview rows
  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return processedRows
    return processedRows.filter((r) => r.status === statusFilter)
  }, [processedRows, statusFilter])

  // Counts
  const counts = useMemo(() => {
    let novos = 0
    let duplicados = 0
    let invalidos = 0
    processedRows.forEach((r) => {
      if (r.status === 'novo') novos++
      else if (r.status === 'duplicado') duplicados++
      else if (r.status === 'invalido') invalidos++
    })
    return {
      total: processedRows.length,
      novos,
      duplicados,
      invalidos,
    }
  }, [processedRows])

  return (
    <div className="space-y-6 select-none animate-fade-in-up pb-12 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Step Indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/leads')}
            className="text-slate-500 hover:text-slate-900 -ml-2 h-9 px-2 gap-1 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Leads</span>
          </Button>
          <div className="h-4 w-px bg-slate-300"></div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#0B7A5B]" />
              <span>Importar Leads via Planilha</span>
            </h2>
            <p className="text-xs text-slate-500">
              Compatível com planilhas exportadas do Luvik (.xlsx ou .csv)
            </p>
          </div>
        </div>

        {/* Step badges */}
        <div className="flex items-center gap-1 sm:gap-2 text-xs">
          <span
            className={`px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${
              currentStep === 'upload'
                ? 'bg-[#0B7A5B] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            1. Upload
          </span>
          <span className="text-slate-300">›</span>
          <span
            className={`px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${
              currentStep === 'mapping'
                ? 'bg-[#0B7A5B] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            2. Mapeamento
          </span>
          <span className="text-slate-300">›</span>
          <span
            className={`px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${
              currentStep === 'preview' ||
              currentStep === 'importing' ||
              currentStep === 'completed'
                ? 'bg-[#0B7A5B] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            3. Validação & Importação
          </span>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start justify-between gap-3 text-rose-700 text-sm animate-fade-in-up">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Atenção</p>
              <p className="text-xs text-rose-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 h-6 w-6"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* STEP 1: UPLOAD */}
      {currentStep === 'upload' && (
        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-xs bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                <span>Upload da Planilha de Negócios</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSample}
                  className="text-xs gap-1.5 h-8 text-slate-600 border-slate-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Planilha Modelo (.xlsx)</span>
                </Button>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Selecione o arquivo gerado pelo Luvik (ex:{' '}
                <span className="font-mono text-slate-700">
                  negocios-em-aberto-luvik-2026-09-08.xlsx
                </span>
                ).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-[#0B7A5B] bg-[#0B7A5B]/5 scale-[0.99]'
                    : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/70 bg-slate-50/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFile(e.target.files[0])
                    }
                  }}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-[#0B7A5B] flex items-center justify-center shadow-xs">
                  {isParsing ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <UploadCloud className="w-8 h-8" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-800">
                    {isParsing
                      ? 'Processando e analisando dados...'
                      : 'Arraste e solte o arquivo aqui, ou clique para navegar'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Formatos aceitos: Microsoft Excel (.xlsx, .xls) ou Texto delimitado (.csv)
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-[11px] bg-slate-200/80 text-slate-700">
                    Exportação Luvik
                  </Badge>
                  <Badge variant="secondary" className="text-[11px] bg-slate-200/80 text-slate-700">
                    Deduplicação Inteligente
                  </Badge>
                  <Badge variant="secondary" className="text-[11px] bg-slate-200/80 text-slate-700">
                    SLA Automático
                  </Badge>
                </div>
              </div>

              {/* Instructions / Tips */}
              <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200/70 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Exportação do Luvik</p>
                    <p className="text-slate-500 mt-0.5">
                      No Luvik, acesse Negócios, filtre os contatos desejados e clique em Exportar
                      para Excel.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Mapeamento Flexível</p>
                    <p className="text-slate-500 mt-0.5">
                      O sistema identifica automaticamente colunas como Nome, Telefone, Consumo,
                      Valor e Cidade.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Proteção contra Duplicados</p>
                    <p className="text-slate-500 mt-0.5">
                      Leads já existentes no CRM por e-mail, telefone ou ID Luvik são identificados
                      antes da gravação.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 2: MAPPING */}
      {currentStep === 'mapping' && parsedData && (
        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-xs bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#0B7A5B]" />
                    <span>Mapeamento de Colunas da Planilha</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Arquivo:{' '}
                    <span className="font-semibold text-slate-700">{selectedFile?.name}</span> (
                    {parsedData.dataRows.length} linhas de dados detectadas)
                  </CardDescription>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentStep('upload')
                      setSelectedFile(null)
                    }}
                    className="text-xs border-slate-200 text-slate-600 h-8"
                  >
                    Trocar arquivo
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Controls bar: Sheet select & Has Headers Toggle */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Sheet tab */}
                {parsedData.sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sheetSelect" className="text-xs font-semibold text-slate-700">
                      Aba da Planilha:
                    </Label>
                    <select
                      id="sheetSelect"
                      value={activeSheetIndex}
                      onChange={(e) => {
                        const idx = Number(e.target.value)
                        setActiveSheetIndex(idx)
                        reparseData(hasHeaders, idx)
                      }}
                      className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
                    >
                      {parsedData.sheetNames.map((name, i) => (
                        <option key={name} value={i}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Has headers toggle */}
                <div className="flex items-center gap-2.5">
                  <Switch
                    id="hasHeadersSwitch"
                    checked={hasHeaders}
                    onCheckedChange={(checked) => {
                      setHasHeaders(checked)
                      reparseData(checked, activeSheetIndex)
                    }}
                  />
                  <Label
                    htmlFor="hasHeadersSwitch"
                    className="text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    A 1ª linha da planilha contém cabeçalhos
                  </Label>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const detected = autoDetectMapping(
                      parsedData.headers,
                      parsedData.dataRows.slice(0, 10),
                    )
                    setColumnMapping(detected)
                    toast({
                      title: 'Auto-mapeamento refeito',
                      description: 'Colunas recalculadas com sucesso.',
                    })
                  }}
                  className="text-xs h-8 gap-1 border-slate-300"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Redetectar Colunas</span>
                </Button>
              </div>

              {/* Fields Mapping Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CRM_FIELDS.map((field) => {
                  const isMapped = Boolean(columnMapping[field.key])
                  return (
                    <div
                      key={field.key}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isMapped
                          ? 'border-emerald-300/80 bg-emerald-50/20'
                          : field.required
                            ? 'border-amber-300 bg-amber-50/20'
                            : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Label
                          htmlFor={`map-${field.key}`}
                          className="text-xs font-bold text-slate-800 flex items-center gap-1.5"
                        >
                          <span>{field.label}</span>
                          {field.required && (
                            <span className="text-rose-500 font-bold" title="Campo obrigatório">
                              *
                            </span>
                          )}
                        </Label>

                        {isMapped ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Mapeado
                          </span>
                        ) : field.required ? (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            Obrigatório
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Opcional</span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 mb-2">{field.description}</p>

                      <select
                        id={`map-${field.key}`}
                        value={columnMapping[field.key] || ''}
                        onChange={(e) =>
                          setColumnMapping((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        className={`w-full h-9 px-2.5 text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B7A5B] font-medium ${
                          isMapped
                            ? 'border-emerald-400 text-slate-800'
                            : field.required
                              ? 'border-amber-400 text-slate-600'
                              : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        <option value="">-- Não mapeado (deixar em branco) --</option>
                        {parsedData.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>

              {/* Sample Data Table Preview (First 3 rows) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Primeiras linhas da planilha (Amostra Bruta)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Total: {parsedData.dataRows.length} linhas
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto bg-slate-50/40">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/80 font-bold text-slate-700">
                        <th className="py-2 px-3 text-[10px] text-slate-400">#</th>
                        {parsedData.headers.map((h) => (
                          <th key={h} className="py-2 px-3 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedData.dataRows.slice(0, 3).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-[10px] text-slate-400 font-mono-numbers">
                            {idx + 1}
                          </td>
                          {parsedData.headers.map((h) => (
                            <td
                              key={h}
                              className="py-2 px-3 whitespace-nowrap text-slate-600 max-w-[200px] truncate"
                            >
                              {row[h] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('upload')}
                  className="text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                  <span>Voltar</span>
                </Button>

                <Button
                  onClick={handleProceedToPreview}
                  disabled={!columnMapping.nome}
                  className="bg-[#0B7A5B] hover:bg-[#095C44] text-white font-semibold text-xs shadow-sm h-9 px-5 gap-1.5"
                >
                  <span>Avançar para Pré-visualização & Deduplicação</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 3: PREVIEW & DEDUPLICATION */}
      {currentStep === 'preview' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card
              onClick={() => setStatusFilter('all')}
              className={`cursor-pointer transition-all border-slate-200 ${
                statusFilter === 'all' ? 'ring-2 ring-slate-800 shadow-sm' : 'hover:bg-slate-50'
              }`}
            >
              <CardContent className="p-3.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total de Linhas
                </p>
                <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{counts.total}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Planilha pronta</p>
              </CardContent>
            </Card>

            <Card
              onClick={() => setStatusFilter('novo')}
              className={`cursor-pointer transition-all border-emerald-200 bg-emerald-50/20 ${
                statusFilter === 'novo'
                  ? 'ring-2 ring-emerald-600 shadow-sm'
                  : 'hover:bg-emerald-50/40'
              }`}
            >
              <CardContent className="p-3.5">
                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Novos Leads
                </p>
                <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">{counts.novos}</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Serão cadastrados</p>
              </CardContent>
            </Card>

            <Card
              onClick={() => setStatusFilter('duplicado')}
              className={`cursor-pointer transition-all border-amber-200 bg-amber-50/20 ${
                statusFilter === 'duplicado'
                  ? 'ring-2 ring-amber-600 shadow-sm'
                  : 'hover:bg-amber-50/40'
              }`}
            >
              <CardContent className="p-3.5">
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                  Duplicados
                </p>
                <p className="text-2xl font-extrabold text-amber-700 mt-0.5">{counts.duplicados}</p>
                <p className="text-[10px] text-amber-600 mt-0.5">
                  {updateDuplicates ? 'Serão atualizados' : 'Serão ignorados'}
                </p>
              </CardContent>
            </Card>

            <Card
              onClick={() => setStatusFilter('invalido')}
              className={`cursor-pointer transition-all border-rose-200 bg-rose-50/20 ${
                statusFilter === 'invalido'
                  ? 'ring-2 ring-rose-600 shadow-sm'
                  : 'hover:bg-rose-50/40'
              }`}
            >
              <CardContent className="p-3.5">
                <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Inválidos / Ignorados
                </p>
                <p className="text-2xl font-extrabold text-rose-700 mt-0.5">{counts.invalidos}</p>
                <p className="text-[10px] text-rose-600 mt-0.5">Sem nome ou contato</p>
              </CardContent>
            </Card>
          </div>

          {/* Import Rules Configuration Card */}
          <Card className="border-slate-200/80 shadow-xs bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#0B7A5B]" />
                <span>Regras de Importação e Deduplicação</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Duplicate Behavior */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Label
                      htmlFor="updateDupSwitch"
                      className="text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      Atualizar Leads Duplicados
                    </Label>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Quando ativado, os leads já existentes no CRM terão seus dados complementados
                      (telefone, cidade, valor, deal_id) e uma nota adicionada ao histórico. Se
                      desativado, duplicados são ignorados.
                    </p>
                  </div>
                  <Switch
                    id="updateDupSwitch"
                    checked={updateDuplicates}
                    onCheckedChange={setUpdateDuplicates}
                  />
                </div>

                {/* Default SLA Days */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="slaDaysInput" className="text-xs font-bold text-slate-800">
                      Prazo Padrão de SLA (Novos Leads)
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      Janela máxima em dias para o primeiro contato e avanço no funil.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      id="slaDaysInput"
                      type="number"
                      min="1"
                      max="60"
                      value={defaultSlaDias}
                      onChange={(e) => setDefaultSlaDias(Math.max(1, Number(e.target.value)))}
                      className="w-20 h-8 px-2 text-center text-xs font-bold border border-slate-300 rounded-lg bg-white"
                    />
                    <span className="text-xs font-medium text-slate-600">
                      dias (Estágio 'Novo')
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table Preview */}
          <Card className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Pré-visualização Detalhada
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Mostrando {filteredRows.length} de {processedRows.length} registros
                  {statusFilter !== 'all' && ` (filtrado por "${statusFilter}")`}
                </CardDescription>
              </div>

              {/* Quick filter chips */}
              <div className="flex items-center gap-1 text-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className={`h-7 px-2 text-xs ${
                    statusFilter === 'all' ? 'bg-slate-200 font-bold' : 'text-slate-500'
                  }`}
                >
                  Todos ({counts.total})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusFilter('novo')}
                  className={`h-7 px-2 text-xs ${
                    statusFilter === 'novo'
                      ? 'bg-emerald-100 text-emerald-800 font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  Novos ({counts.novos})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusFilter('duplicado')}
                  className={`h-7 px-2 text-xs ${
                    statusFilter === 'duplicado'
                      ? 'bg-amber-100 text-amber-800 font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  Duplicados ({counts.duplicados})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusFilter('invalido')}
                  className={`h-7 px-2 text-xs ${
                    statusFilter === 'invalido'
                      ? 'bg-rose-100 text-rose-800 font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  Inválidos ({counts.invalidos})
                </Button>
              </div>
            </CardHeader>

            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Linha</th>
                    <th className="py-2.5 px-3">Status de Importação</th>
                    <th className="py-2.5 px-3">Nome do Lead</th>
                    <th className="py-2.5 px-3">Contato</th>
                    <th className="py-2.5 px-3">Cidade/UF</th>
                    <th className="py-2.5 px-3">Consumo</th>
                    <th className="py-2.5 px-3">Valor Estimado</th>
                    <th className="py-2.5 px-3">ID Luvik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.slice(0, 100).map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        row.status === 'invalido'
                          ? 'bg-rose-50/30'
                          : row.status === 'duplicado'
                            ? 'bg-amber-50/20'
                            : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                        {row.rowNumber}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {row.status === 'novo' && (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-300 text-[10px] font-semibold gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Novo Lead
                          </Badge>
                        )}
                        {row.status === 'duplicado' && (
                          <div className="flex flex-col gap-0.5">
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300 text-[10px] font-semibold gap-1 self-start">
                              <RefreshCw className="w-3 h-3 text-amber-600" />
                              {updateDuplicates ? 'Atualizar' : 'Ignorar'}
                            </Badge>
                            <span className="text-[10px] text-amber-700 font-medium">
                              {row.duplicateReason}
                            </span>
                          </div>
                        )}
                        {row.status === 'invalido' && (
                          <div className="flex flex-col gap-0.5">
                            <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-300 text-[10px] font-semibold gap-1 self-start">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Ignorado
                            </Badge>
                            <span className="text-[10px] text-rose-600">
                              {row.validationErrors.join(', ')}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {row.nome}
                        {row.existingLeadName && row.status === 'duplicado' && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            No CRM: {row.existingLeadName}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        <div className="truncate max-w-[170px]">{row.email}</div>
                        <div className="text-[11px] text-slate-400">{row.telefone || '-'}</div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {row.cidade ? `${row.cidade}/${row.estado}` : row.estado || '-'}
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 font-mono-numbers whitespace-nowrap">
                        {row.consumo_mensal_kwh} kWh
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 font-mono-numbers whitespace-nowrap">
                        {row.preco_venda > 0 ? formatBRL(row.preco_venda) : '-'}
                      </td>

                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {row.luvik_deal_id ? `#${row.luvik_deal_id}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRows.length > 100 && (
              <div className="p-2.5 text-center bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                Mostrando os primeiros 100 de {filteredRows.length} registros nesta prévia. Todos os{' '}
                {processedRows.length} serão processados.
              </div>
            )}

            {/* Bottom Actions */}
            <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep('mapping')}
                className="text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                <span>Voltar ao Mapeamento</span>
              </Button>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  Pronto para importar:{' '}
                  <strong className="text-slate-800">
                    {counts.novos + (updateDuplicates ? counts.duplicados : 0)} leads
                  </strong>
                </span>

                <Button
                  onClick={handleStartImport}
                  disabled={counts.novos === 0 && (!updateDuplicates || counts.duplicados === 0)}
                  className="bg-[#0B7A5B] hover:bg-[#095C44] text-white font-semibold text-xs shadow-sm h-9.5 px-6 gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Iniciar Importação para o Funil</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* STEP 4: IMPORTING PROGRESS */}
      {currentStep === 'importing' && (
        <Card className="border-slate-200/80 shadow-xs bg-white text-center p-10">
          <CardContent className="space-y-6 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-[#0B7A5B] flex items-center justify-center mx-auto shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Importando Leads para o CRM...</h3>
              <p className="text-xs text-slate-500">
                Cadastrando novos leads, vinculando SLAs ativos e conciliando duplicados.
              </p>
            </div>

            <div className="space-y-2">
              <Progress value={importProgress.percent} className="h-2.5 bg-slate-100" />
              <div className="flex justify-between text-xs text-slate-500 font-mono-numbers">
                <span>
                  Registro {importProgress.current} de {importProgress.total}
                </span>
                <span className="font-bold text-[#0B7A5B]">{importProgress.percent}%</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Por favor, não feche ou recarregue esta aba durante o processo.
            </p>
          </CardContent>
        </Card>
      )}

      {/* STEP 5: COMPLETED SUMMARY */}
      {currentStep === 'completed' && importSummary && (
        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-xs bg-white text-center p-8">
            <CardContent className="space-y-6 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#0B7A5B] flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  Importação Finalizada com Sucesso!
                </h3>
                <p className="text-xs text-slate-500">
                  Os leads foram integrados à carteira comercial e estão prontos no funil de vendas.
                </p>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-[11px] font-bold text-emerald-800 uppercase">Criados</p>
                  <p className="text-2xl font-black text-emerald-600 mt-0.5">
                    {importSummary.created}
                  </p>
                  <p className="text-[10px] text-slate-400">Novo / SLA ativo</p>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-amber-800 uppercase">Atualizados</p>
                  <p className="text-2xl font-black text-amber-600 mt-0.5">
                    {importSummary.updated}
                  </p>
                  <p className="text-[10px] text-slate-400">Conciliados</p>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-600 uppercase">Ignorados</p>
                  <p className="text-2xl font-black text-slate-500 mt-0.5">
                    {importSummary.ignored}
                  </p>
                  <p className="text-[10px] text-slate-400">Inválidos / Repetidos</p>
                </div>
              </div>

              {/* Errors report if any */}
              {importSummary.errors.length > 0 && (
                <div className="text-left p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5 text-xs text-rose-800">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Algumas linhas apresentaram erros ({importSummary.errors.length}):</span>
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700 max-h-32 overflow-y-auto">
                    {importSummary.errors.map((err, i) => (
                      <li key={i}>
                        Linha {err.rowNumber} ({err.leadName}): {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Destination Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null)
                    setFileBuffer(null)
                    setParsedData(null)
                    setProcessedRows([])
                    setCurrentStep('upload')
                  }}
                  className="w-full sm:w-auto text-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                  <span>Importar Outra Planilha</span>
                </Button>

                <Button
                  onClick={() => navigate('/funil')}
                  className="w-full sm:w-auto bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold"
                >
                  <span>Ver Funil de Vendas</span>
                </Button>

                <Button
                  onClick={() => navigate('/leads')}
                  className="w-full sm:w-auto bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold shadow-sm"
                >
                  <span>Ir para Lista de Leads</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
