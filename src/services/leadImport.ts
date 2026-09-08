import * as XLSX from 'xlsx'
import pb from '@/lib/pocketbase/client'
import type { Lead, LeadOrigem, LeadStatus } from '@/types/crm'

export interface ParsedSpreadsheet {
  sheetNames: string[]
  activeSheet: string
  rawRows: Array<Array<string | number | boolean | null>>
  hasHeaders: boolean
  headers: string[]
  dataRows: Array<Record<string, string>>
}

export type CRMField =
  | 'nome'
  | 'email'
  | 'telefone'
  | 'cidade'
  | 'estado'
  | 'endereco'
  | 'consumo_mensal_kwh'
  | 'preco_venda'
  | 'origem'
  | 'luvik_deal_id'

export interface FieldDefinition {
  key: CRMField
  label: string
  required: boolean
  description: string
  heuristicMatches: string[]
}

export const CRM_FIELDS: FieldDefinition[] = [
  {
    key: 'nome',
    label: 'Nome do Lead / Cliente',
    required: true,
    description: 'Nome completo ou razão social da oportunidade.',
    heuristicMatches: [
      'nome',
      'lead',
      'cliente',
      'contato',
      'oportunidade',
      'negocio',
      'negócio',
      'titulo',
      'título',
      'pessoa',
      'razao social',
      'razão social',
    ],
  },
  {
    key: 'telefone',
    label: 'Telefone / WhatsApp',
    required: false,
    description: 'Celular, WhatsApp ou telefone de contato.',
    heuristicMatches: [
      'telefone',
      'celular',
      'whatsapp',
      'fone',
      'tel',
      'cel',
      'contato',
      'numero',
      'número',
    ],
  },
  {
    key: 'email',
    label: 'E-mail',
    required: false,
    description: 'Endereço de e-mail do lead.',
    heuristicMatches: ['email', 'e-mail', 'mail', 'correio'],
  },
  {
    key: 'cidade',
    label: 'Cidade',
    required: false,
    description: 'Município de instalação/residência.',
    heuristicMatches: ['cidade', 'municipio', 'município', 'localidade'],
  },
  {
    key: 'estado',
    label: 'Estado (UF)',
    required: false,
    description: 'Sigla do estado (ex: SP, RO, MG).',
    heuristicMatches: ['estado', 'uf', 'regiao', 'região'],
  },
  {
    key: 'endereco',
    label: 'Endereço / Bairro',
    required: false,
    description: 'Logradouro, número ou bairro.',
    heuristicMatches: ['endereco', 'endereço', 'rua', 'logradouro', 'bairro'],
  },
  {
    key: 'consumo_mensal_kwh',
    label: 'Consumo Médio (kWh)',
    required: false,
    description: 'Consumo mensal médio de energia elétrica.',
    heuristicMatches: [
      'consumo',
      'kwh',
      'consumo mensal',
      'consumo medio',
      'consumo médio',
      'gasto kwh',
      'energia',
    ],
  },
  {
    key: 'preco_venda',
    label: 'Valor da Proposta / Negócio (R$)',
    required: false,
    description: 'Valor total do projeto fotovoltaico.',
    heuristicMatches: [
      'valor',
      'preco',
      'preço',
      'valor do negocio',
      'valor do negócio',
      'montante',
      'total',
      'orcamento',
      'orçamento',
    ],
  },
  {
    key: 'origem',
    label: 'Origem do Lead',
    required: false,
    description: 'Canal de captação ou indicação.',
    heuristicMatches: ['origem', 'canal', 'fonte', 'campanha', 'como conheceu'],
  },
  {
    key: 'luvik_deal_id',
    label: 'ID Luvik / Negócio',
    required: false,
    description: 'Identificador único da oportunidade no Luvik.',
    heuristicMatches: [
      'id luvik',
      'id negocio',
      'id negócio',
      'deal id',
      'deal_id',
      'codigo',
      'código',
      'id',
      'n do negocio',
      'nº do negócio',
    ],
  },
]

export type ColumnMapping = Record<CRMField, string>

export interface ProcessedLeadRow {
  rowNumber: number
  raw: Record<string, string>
  nome: string
  email: string
  telefone: string
  cleanPhone: string
  cidade: string
  estado: string
  endereco: string
  consumo_mensal_kwh: number
  preco_venda: number
  origem: LeadOrigem
  luvik_deal_id: string
  status: 'novo' | 'duplicado' | 'invalido'
  duplicateReason?: string
  existingLeadId?: string
  existingLeadName?: string
  validationErrors: string[]
}

export function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizeDigits(str?: string | null): string {
  if (!str) return ''
  return String(str).replace(/\D/g, '')
}

export function cleanEmail(str?: string | null): string {
  if (!str) return ''
  return String(str).trim().toLowerCase()
}

export function parseSpreadsheetBuffer(
  buffer: ArrayBuffer,
  options: { hasHeaders: boolean; sheetIndex?: number } = { hasHeaders: true, sheetIndex: 0 },
): ParsedSpreadsheet {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetNames = workbook.SheetNames
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('A planilha fornecida não possui abas.')
  }

  const activeSheet = sheetNames[options.sheetIndex || 0]
  const worksheet = workbook.Sheets[activeSheet]
  if (!worksheet) {
    throw new Error('Não foi possível ler os dados da aba selecionada.')
  }

  // Raw array of arrays
  const rawRows = XLSX.utils.sheet_to_json<Array<string | number | boolean | null>>(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  })

  if (!rawRows || rawRows.length === 0) {
    return {
      sheetNames,
      activeSheet,
      rawRows: [],
      hasHeaders: options.hasHeaders,
      headers: [],
      dataRows: [],
    }
  }

  let headers: string[] = []
  let dataRows: Array<Record<string, string>> = []

  if (options.hasHeaders) {
    const firstRow = rawRows[0] || []
    // Ensure unique and non-empty header labels
    headers = firstRow.map((col, index) => {
      const val = col !== null && col !== undefined ? String(col).trim() : ''
      return val || `Coluna ${index + 1}`
    })

    // Avoid duplicate header keys by appending index if needed
    const seen = new Map<string, number>()
    headers = headers.map((h) => {
      const count = seen.get(h) || 0
      seen.set(h, count + 1)
      return count > 0 ? `${h} (${count + 1})` : h
    })

    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r]
      if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === '')) {
        continue // skip blank row
      }
      const record: Record<string, string> = {}
      headers.forEach((h, colIdx) => {
        const cell = row[colIdx]
        record[h] = cell !== null && cell !== undefined ? String(cell).trim() : ''
      })
      dataRows.push(record)
    }
  } else {
    // Generate Coluna 1, Coluna 2...
    const maxCols = Math.max(...rawRows.map((r) => r.length), 1)
    headers = Array.from({ length: maxCols }, (_, i) => `Coluna ${i + 1}`)

    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r]
      if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === '')) {
        continue
      }
      const record: Record<string, string> = {}
      headers.forEach((h, colIdx) => {
        const cell = row[colIdx]
        record[h] = cell !== null && cell !== undefined ? String(cell).trim() : ''
      })
      dataRows.push(record)
    }
  }

  return {
    sheetNames,
    activeSheet,
    rawRows,
    hasHeaders: options.hasHeaders,
    headers,
    dataRows,
  }
}

/**
 * Automatically maps CRM fields to spreadsheet columns based on heuristics
 */
export function autoDetectMapping(
  headers: string[],
  sampleRows: Array<Record<string, string>> = [],
): ColumnMapping {
  const mapping: ColumnMapping = {
    nome: '',
    email: '',
    telefone: '',
    cidade: '',
    estado: '',
    endereco: '',
    consumo_mensal_kwh: '',
    preco_venda: '',
    origem: '',
    luvik_deal_id: '',
  }

  const normalizedHeaders = headers.map((h) => ({
    original: h,
    normalized: normalizeHeader(h),
  }))

  const usedHeaders = new Set<string>()

  // 1. Try matching header names via heuristics
  for (const field of CRM_FIELDS) {
    for (const pattern of field.heuristicMatches) {
      const normPattern = normalizeHeader(pattern)
      // Exact match first
      const exact = normalizedHeaders.find(
        (nh) => !usedHeaders.has(nh.original) && nh.normalized === normPattern,
      )
      if (exact) {
        mapping[field.key] = exact.original
        usedHeaders.add(exact.original)
        break
      }
      // Partial match
      const partial = normalizedHeaders.find(
        (nh) =>
          !usedHeaders.has(nh.original) &&
          (nh.normalized.includes(normPattern) || normPattern.includes(nh.normalized)),
      )
      if (partial) {
        mapping[field.key] = partial.original
        usedHeaders.add(partial.original)
        break
      }
    }
  }

  // 2. Fallbacks by sample row content inspection if still unmapped
  if (!mapping.email && sampleRows.length > 0) {
    for (const h of headers) {
      if (usedHeaders.has(h)) continue
      const hasEmailLike = sampleRows.some((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r[h] || ''))
      if (hasEmailLike) {
        mapping.email = h
        usedHeaders.add(h)
        break
      }
    }
  }

  if (!mapping.telefone && sampleRows.length > 0) {
    for (const h of headers) {
      if (usedHeaders.has(h)) continue
      const hasPhoneLike = sampleRows.some((r) => {
        const digits = normalizeDigits(r[h])
        return digits.length >= 10 && digits.length <= 13
      })
      if (hasPhoneLike) {
        mapping.telefone = h
        usedHeaders.add(h)
        break
      }
    }
  }

  // If nome is still empty, fallback to the very first non-ID column
  if (!mapping.nome && headers.length > 0) {
    const candidate = headers.find(
      (h) => h !== mapping.email && h !== mapping.telefone && h !== mapping.luvik_deal_id,
    )
    if (candidate) {
      mapping.nome = candidate
    }
  }

  return mapping
}

export function parseNumberSafe(val?: string | number | null, fallback = 0): number {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'number') return isNaN(val) ? fallback : val
  const clean = String(val)
    .replace(/R\$/g, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '')
  const n = parseFloat(clean)
  return isNaN(n) ? fallback : n
}

export function parseUFSafe(val?: string | null): string {
  if (!val) return 'SP'
  const clean = String(val).trim().toUpperCase()
  if (clean.length === 2) return clean
  // Check common state names
  const mapping: Record<string, string> = {
    'SAO PAULO': 'SP',
    'SÃO PAULO': 'SP',
    RONDONIA: 'RO',
    RONDÔNIA: 'RO',
    'MINAS GERAIS': 'MG',
    'RIO DE JANEIRO': 'RJ',
    PARANA: 'PR',
    PARANÁ: 'PR',
    'SANTA CATARINA': 'SC',
    'RIO GRANDE DO SUL': 'RS',
    BAHIA: 'BA',
    GOIAS: 'GO',
    GOIÁS: 'GO',
    CEARA: 'CE',
    CEARÁ: 'CE',
    PERNAMBUCO: 'PE',
  }
  const norm = normalizeHeader(clean)
  for (const [k, uf] of Object.entries(mapping)) {
    if (normalizeHeader(k) === norm) return uf
  }
  return clean.slice(0, 2) || 'SP'
}

export function parseOrigemSafe(val?: string | null): LeadOrigem {
  if (!val) return 'Outros'
  const norm = normalizeHeader(String(val))
  if (norm.includes('indic')) return 'Indicação'
  if (norm.includes('site') || norm.includes('web') || norm.includes('portal')) return 'Site'
  if (
    norm.includes('rede') ||
    norm.includes('insta') ||
    norm.includes('face') ||
    norm.includes('social')
  )
    return 'Redes Sociais'
  if (norm.includes('event') || norm.includes('feira')) return 'Evento'
  if (norm.includes('parcer') || norm.includes('integrador')) return 'Parceria'
  return 'Outros'
}

/**
 * Deduplicate rows against live existing leads and against previously seen rows in the same file.
 */
export function evaluateRowDeduplication(
  rows: Array<Record<string, string>>,
  mapping: ColumnMapping,
  existingLeads: Lead[],
  fileName?: string,
): ProcessedLeadRow[] {
  // Pre-build indexes for fast matching
  const leadByEmail = new Map<string, Lead>()
  const leadByPhoneEnd = new Map<string, Lead>() // last 8 digits
  const leadByDealId = new Map<string, Lead>()

  for (const lead of existingLeads) {
    if (lead.email) {
      leadByEmail.set(cleanEmail(lead.email), lead)
    }
    const phoneDigits = normalizeDigits(lead.telefone)
    if (phoneDigits.length >= 8) {
      leadByPhoneEnd.set(phoneDigits.slice(-8), lead)
    }
    if (lead.luvik_deal_id) {
      leadByDealId.set(String(lead.luvik_deal_id).trim(), lead)
    }
  }

  // Also track duplicates within the sheet itself
  const seenEmailsInSheet = new Set<string>()
  const seenPhonesInSheet = new Set<string>()
  const seenDealsInSheet = new Set<string>()

  const processed: ProcessedLeadRow[] = []

  rows.forEach((r, idx) => {
    const rowNumber = idx + 2 // Assuming row 1 is header

    const rawNome = mapping.nome ? r[mapping.nome] || '' : ''
    const rawEmail = mapping.email ? r[mapping.email] || '' : ''
    const rawTelefone = mapping.telefone ? r[mapping.telefone] || '' : ''
    const rawCidade = mapping.cidade ? r[mapping.cidade] || '' : ''
    const rawEstado = mapping.estado ? r[mapping.estado] || '' : ''
    const rawEndereco = mapping.endereco ? r[mapping.endereco] || '' : ''
    const rawConsumo = mapping.consumo_mensal_kwh ? r[mapping.consumo_mensal_kwh] || '' : ''
    const rawPreco = mapping.preco_venda ? r[mapping.preco_venda] || '' : ''
    const rawOrigem = mapping.origem ? r[mapping.origem] || '' : ''
    const rawDealId = mapping.luvik_deal_id ? r[mapping.luvik_deal_id] || '' : ''

    const nome = String(rawNome).trim()
    let email = cleanEmail(rawEmail)
    const telefone = String(rawTelefone).trim()
    const cleanPhone = normalizeDigits(telefone)
    const cidade = String(rawCidade).trim()
    const estado = parseUFSafe(rawEstado)
    const endereco = String(rawEndereco).trim()
    const consumo_mensal_kwh = parseNumberSafe(rawConsumo, 400)
    const preco_venda = parseNumberSafe(rawPreco, 0)
    const origem = parseOrigemSafe(rawOrigem || fileName)
    const luvik_deal_id = String(rawDealId).trim()

    const validationErrors: string[] = []

    // Name is required
    if (!nome) {
      validationErrors.push('Nome do lead não preenchido.')
    }

    // Must have at least some contact info (email or phone or dealId)
    if (!email && !cleanPhone && !luvik_deal_id) {
      validationErrors.push('Lead sem contato (sem e-mail, telefone ou ID Luvik).')
    }

    // If no email, synthesize one so PocketBase doesn't reject uniqueness/required field
    if (!email) {
      if (cleanPhone) {
        email = `luvik.${cleanPhone}@leadsolar.crm`
      } else if (luvik_deal_id) {
        email = `luvik.deal.${luvik_deal_id.toLowerCase().replace(/[^a-z0-9]/g, '')}@leadsolar.crm`
      } else {
        email = `luvik.row${rowNumber}.${Date.now().toString().slice(-6)}@leadsolar.crm`
      }
    }

    // Check invalid
    if (validationErrors.length > 0) {
      processed.push({
        rowNumber,
        raw: r,
        nome: nome || '(Sem nome)',
        email,
        telefone,
        cleanPhone,
        cidade,
        estado,
        endereco,
        consumo_mensal_kwh,
        preco_venda,
        origem,
        luvik_deal_id,
        status: 'invalido',
        validationErrors,
      })
      return
    }

    // Check duplicate in CRM
    let existingMatch: Lead | undefined = undefined
    let duplicateReason = ''

    if (luvik_deal_id && leadByDealId.has(luvik_deal_id)) {
      existingMatch = leadByDealId.get(luvik_deal_id)
      duplicateReason = `ID Luvik correspondente (#${luvik_deal_id})`
    } else if (email && leadByEmail.has(email)) {
      existingMatch = leadByEmail.get(email)
      duplicateReason = `E-mail já cadastrado (${email})`
    } else if (cleanPhone.length >= 8) {
      const searchEnd = cleanPhone.slice(-8)
      if (leadByPhoneEnd.has(searchEnd)) {
        existingMatch = leadByPhoneEnd.get(searchEnd)
        duplicateReason = `Telefone já cadastrado (${telefone})`
      }
    }

    // Check duplicate inside this same sheet
    if (!existingMatch) {
      if (email && seenEmailsInSheet.has(email)) {
        duplicateReason = `E-mail repetido na própria planilha (${email})`
      } else if (cleanPhone.length >= 8 && seenPhonesInSheet.has(cleanPhone.slice(-8))) {
        duplicateReason = `Telefone repetido na planilha (${telefone})`
      } else if (luvik_deal_id && seenDealsInSheet.has(luvik_deal_id)) {
        duplicateReason = `ID Luvik repetido na planilha (#${luvik_deal_id})`
      }
    }

    if (email) seenEmailsInSheet.add(email)
    if (cleanPhone.length >= 8) seenPhonesInSheet.add(cleanPhone.slice(-8))
    if (luvik_deal_id) seenDealsInSheet.add(luvik_deal_id)

    if (existingMatch) {
      processed.push({
        rowNumber,
        raw: r,
        nome,
        email,
        telefone,
        cleanPhone,
        cidade,
        estado,
        endereco,
        consumo_mensal_kwh,
        preco_venda,
        origem,
        luvik_deal_id,
        status: 'duplicado',
        duplicateReason,
        existingLeadId: existingMatch.id,
        existingLeadName: existingMatch.nome,
        validationErrors: [],
      })
    } else if (duplicateReason) {
      // Duplicated within sheet
      processed.push({
        rowNumber,
        raw: r,
        nome,
        email,
        telefone,
        cleanPhone,
        cidade,
        estado,
        endereco,
        consumo_mensal_kwh,
        preco_venda,
        origem,
        luvik_deal_id,
        status: 'duplicado',
        duplicateReason,
        validationErrors: [],
      })
    } else {
      processed.push({
        rowNumber,
        raw: r,
        nome,
        email,
        telefone,
        cleanPhone,
        cidade,
        estado,
        endereco,
        consumo_mensal_kwh,
        preco_venda,
        origem,
        luvik_deal_id,
        status: 'novo',
        validationErrors: [],
      })
    }
  })

  return processed
}

export interface ImportExecutionOptions {
  updateDuplicates: boolean
  currentUserId: string
  sourceFilename?: string
  slaDias?: number
  onProgress?: (progress: { current: number; total: number; percent: number }) => void
}

export interface ImportSummary {
  total: number
  created: number
  updated: number
  ignored: number
  errors: Array<{ rowNumber: number; leadName: string; error: string }>
}

/**
 * Executes the actual batch import into PocketBase
 */
export async function executeLeadImport(
  processedRows: ProcessedLeadRow[],
  options: ImportExecutionOptions,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    total: processedRows.length,
    created: 0,
    updated: 0,
    ignored: 0,
    errors: [],
  }

  const defaultOwnerId = options.currentUserId || pb.authStore.record?.id || ''
  const defaultSlaDias = options.slaDias && options.slaDias > 0 ? options.slaDias : 7

  for (let i = 0; i < processedRows.length; i++) {
    const row = processedRows[i]

    if (options.onProgress) {
      options.onProgress({
        current: i + 1,
        total: processedRows.length,
        percent: Math.round(((i + 1) / processedRows.length) * 100),
      })
    }

    if (row.status === 'invalido') {
      summary.ignored++
      continue
    }

    if (row.status === 'duplicado') {
      if (!options.updateDuplicates) {
        summary.ignored++
        continue
      }

      // Update existing lead if ID is known
      if (row.existingLeadId) {
        try {
          const updatePayload: Record<string, unknown> = {}
          if (row.telefone) updatePayload.telefone = row.telefone
          if (row.cidade) updatePayload.cidade = row.cidade
          if (row.estado) updatePayload.estado = row.estado
          if (row.endereco) updatePayload.endereco = row.endereco
          if (row.consumo_mensal_kwh > 0) updatePayload.consumo_mensal_kwh = row.consumo_mensal_kwh
          if (row.preco_venda > 0) updatePayload.preco_venda = row.preco_venda
          if (row.luvik_deal_id) updatePayload.luvik_deal_id = row.luvik_deal_id

          // Append to history
          let currentLead: Lead | null = null
          try {
            currentLead = await pb.collection('leads').getOne<Lead>(row.existingLeadId)
          } catch {
            /* intentionally ignored */
          }

          let hist = []
          if (currentLead?.historico) {
            hist = Array.isArray(currentLead.historico) ? [...currentLead.historico] : []
          }
          hist.push({
            data: new Date().toISOString(),
            tipo: 'nota',
            descricao: `Lead atualizado via importação de planilha Luvik (${options.sourceFilename || 'arquivo'}).`,
          })
          updatePayload.historico = JSON.stringify(hist)

          await pb.collection('leads').update(row.existingLeadId, updatePayload)
          summary.updated++
        } catch (err: unknown) {
          console.error(`Erro ao atualizar lead duplicado linha ${row.rowNumber}:`, err)
          summary.errors.push({
            rowNumber: row.rowNumber,
            leadName: row.nome,
            error: err instanceof Error ? err.message : 'Falha ao atualizar lead existente',
          })
        }
      } else {
        // Repeated within same sheet and not in DB — treat subsequent as ignored
        summary.ignored++
      }
      continue
    }

    // Create new lead in "Novo" stage with SLA active
    try {
      const payload: Record<string, unknown> = {
        nome: row.nome,
        email: row.email,
        telefone: row.telefone,
        origem: row.origem || 'Outros',
        consumo_mensal_kwh: row.consumo_mensal_kwh > 0 ? row.consumo_mensal_kwh : 400,
        cidade: row.cidade,
        estado: row.estado || 'SP',
        endereco: row.endereco,
        preco_venda: row.preco_venda,
        status: 'Novo' as LeadStatus,
        sla_dias: defaultSlaDias,
        proprietario: defaultOwnerId,
        luvik_deal_id: row.luvik_deal_id,
        historico: JSON.stringify([
          {
            data: new Date().toISOString(),
            tipo: 'criacao',
            descricao: `Lead importado de planilha Luvik (${options.sourceFilename || 'importação'}) no estágio 'Novo' com SLA ativo de ${defaultSlaDias} dias.`,
          },
        ]),
      }

      await pb.collection('leads').create(payload)
      summary.created++
    } catch (err: unknown) {
      console.error(`Erro ao criar lead na linha ${row.rowNumber}:`, err)
      summary.errors.push({
        rowNumber: row.rowNumber,
        leadName: row.nome,
        error: err instanceof Error ? err.message : 'Falha ao cadastrar lead no banco',
      })
    }
  }

  return summary
}
