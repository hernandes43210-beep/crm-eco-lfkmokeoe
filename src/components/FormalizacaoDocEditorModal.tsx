import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Download,
  Printer,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Building,
  User,
  Zap,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { Lead, Proposta, FormalizacaoTipo, FormalizacaoDocumento } from '@/types/crm'
import {
  DadosContratoFormalizacao,
  DadosProcuracaoEnergisa,
  DADOS_FIXOS_ECOSOLAR,
  formatarDataExtenso,
  generateContratoHTML,
  generateProcuracaoEnergisaHTML,
} from '@/lib/formalizacaoPdf'
import { parseKitDetailedItems } from '@/lib/kitItemsParser'
import { FormalizacaoService } from '@/services/formalizacao'
import { useToast } from '@/hooks/use-toast'
import { toPortugueseErrorMessage } from '@/lib/errors'

interface FormalizacaoDocEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: FormalizacaoTipo
  lead: Lead
  proposta?: Proposta
  onSaved: (doc: FormalizacaoDocumento) => void
}

export function FormalizacaoDocEditorModal({
  open,
  onOpenChange,
  tipo,
  lead,
  proposta,
  onSaved,
}: FormalizacaoDocEditorModalProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'formulario' | 'preview'>('formulario')
  const [saving, setSaving] = useState(false)

  // Extração inicial dos itens do kit
  const specs = React.useMemo(() => {
    const kitObj = (proposta?.expand?.kit || (proposta as any)?.kit) as any
    return parseKitDetailedItems({
      kitNome: proposta?.kit_nome || '',
      kitPotenciaKw: proposta?.kit_potencia_kw,
      kitFabricante: proposta?.kit_fabricante,
      descricao: (proposta as any)?.kit_descricao || kitObj?.descricao,
      observacoes: proposta?.observacoes,
      consumoKwh: lead.consumo_mensal_kwh,
      stringBox: (proposta as any)?.kit_string_box || kitObj?.string_box,
      marcaPainel: (proposta as any)?.kit_marca_painel || kitObj?.marca_painel,
      marcaInversor: (proposta as any)?.kit_marca_inversor || kitObj?.marca_inversor,
      potenciaPainelW: (proposta as any)?.kit_potencia_painel_w || kitObj?.potencia_painel_w,
      potenciaInversorKw:
        (proposta as any)?.kit_potencia_inversor_kw || kitObj?.potencia_inversor_kw,
      tipoEstrutura: (proposta as any)?.kit_tipo_estrutura || kitObj?.tipo_estrutura,
    })
  }, [proposta, lead])

  // Estado do formulário de CONTRATO
  const [contratoState, setContratoState] = useState<DadosContratoFormalizacao>(() => {
    const valorTotal = proposta?.preco_venda || lead.preco_venda || 0
    const pot = proposta?.kit_potencia_kw || specs.potenciaTotalKwp || 0
    const parcelaEntrada = valorTotal > 0 ? valorTotal * 0.5 : 0
    const parcelaFinal = valorTotal > 0 ? valorTotal * 0.5 : 0
    const condPagtoDefault =
      proposta?.condicoes_pagamento ||
      (valorTotal > 0
        ? `Na assinatura do contrato o valor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcelaEntrada)}. No fim da Instalação ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcelaFinal)}.`
        : 'Na assinatura do contrato 50% do valor. No fim da Instalação 50% do valor.')

    // Tabela de equipamentos inicial: inclui linha do kit + itens decompostos reais do kit
    const kitPotStr = pot
      ? typeof pot === 'number'
        ? `${pot.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kWp`
        : String(pot)
      : ''

    const tabelaItens = [
      ...(proposta?.kit_nome
        ? [
            {
              item: proposta.kit_nome,
              unidade: 'kit',
              quantidade: '1,00',
              potencia: kitPotStr || undefined,
              fabricanteModelo: proposta?.kit_fabricante || specs.fabricantesPrincipais || '',
              especificacao: 'Kit Solar Fotovoltaico Completo — Chave na Mão',
            },
          ]
        : []),
      ...specs.itens.map((it) => ({
        item: it.nome,
        unidade: it.unidade || 'un',
        quantidade:
          typeof it.quantidade === 'number' ? `${it.quantidade},00` : String(it.quantidade),
        potencia: it.potenciaUnit || '',
        especificacao: it.especificacao || '',
        fabricanteModelo: it.fabricanteModelo || '',
      })),
    ]

    return {
      clienteNome: lead.nome || '',
      clienteCpfCnpj: lead.cpf_cnpj || '',
      clienteNacionalidade: lead.nacionalidade || 'Brasileiro(a)',
      clienteEstadoCivil: lead.estado_civil || '',
      clienteProfissao: lead.profissao || '',
      clienteEndereco: lead.endereco || '',
      clienteCidade: lead.cidade || 'Seringueiras',
      clienteEstado: lead.estado || 'RO',
      clienteCep: lead.cep || '',
      clienteTelefone: lead.telefone || '',
      clienteEmail: lead.email || '',
      kitNome: proposta?.kit_nome || 'Sistema Gerador Fotovoltaico On-Grid Ecosolar',
      potenciaKwp: pot
        ? typeof pot === 'number'
          ? pot.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : String(pot)
        : '',
      kitFabricante: proposta?.kit_fabricante || specs.fabricantesPrincipais || '',
      kitDescricao: (proposta as any)?.kit_descricao || '',
      kitStringBox: (proposta as any)?.kit_string_box || '',
      tabelaEquipamentos: tabelaItens,
      valorTotal: valorTotal,
      descontoAvista: 0,
      valorFinal: valorTotal,
      condicoesPagamento: condPagtoDefault,
      parcelaEntrada: parcelaEntrada,
      parcelaFinal: parcelaFinal,
      detalhesParcelamento: condPagtoDefault,
      cidadeAssinatura: 'Seringueiras',
      dataAssinatura: formatarDataExtenso(new Date(), 'Seringueiras'),
      prazoInstalacaoDias: 60,
      garantiaInstalacaoMeses: 12,
    }
  })

  // Estado do formulário de PROCURAÇÃO
  const [procuracaoState, setProcuracaoState] = useState<DadosProcuracaoEnergisa>(() => {
    return {
      clienteNome: lead.nome || '',
      clienteNacionalidade: lead.nacionalidade || 'BRASILEIRO',
      clienteEstadoCivil: lead.estado_civil || '',
      clienteProfissao: lead.profissao || '',
      clienteRg: '',
      clienteCpfCnpj: lead.cpf_cnpj || '',
      clienteEndereco: lead.endereco || '',
      clienteBairro: 'Centro',
      clienteCidade: lead.cidade || 'Seringueiras',
      clienteEstado: lead.estado || 'RO',
      clienteCep: lead.cep || '',
      concessionaria: 'ENERGISA RONDÔNIA — DISTRIBUIDORA DE ENERGIA S/A',
      cidadeAssinatura: 'SERINGUEIRAS – RO',
      dataAssinatura: formatarDataExtenso(new Date(), 'SERINGUEIRAS – RO'),
    }
  })

  // Recarregar campos se o lead ou proposta mudarem ao abrir
  React.useEffect(() => {
    if (open) {
      const valorTotal = proposta?.preco_venda || lead.preco_venda || 0
      const pot = proposta?.kit_potencia_kw || specs.potenciaTotalKwp || 0
      const kitPotStr = pot
        ? typeof pot === 'number'
          ? `${pot.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kWp`
          : String(pot)
        : ''

      const recarregaTabela = [
        ...(proposta?.kit_nome
          ? [
              {
                item: proposta.kit_nome,
                unidade: 'kit',
                quantidade: '1,00',
                potencia: kitPotStr || undefined,
                fabricanteModelo: proposta?.kit_fabricante || specs.fabricantesPrincipais || '',
                especificacao: 'Kit Solar Fotovoltaico Completo — Chave na Mão',
              },
            ]
          : []),
        ...specs.itens.map((it) => ({
          item: it.nome,
          unidade: it.unidade || 'un',
          quantidade:
            typeof it.quantidade === 'number' ? `${it.quantidade},00` : String(it.quantidade),
          potencia: it.potenciaUnit || '',
          especificacao: it.especificacao || '',
          fabricanteModelo: it.fabricanteModelo || '',
        })),
      ]

      setContratoState((prev) => ({
        ...prev,
        clienteNome: lead.nome || prev.clienteNome,
        clienteCpfCnpj: lead.cpf_cnpj || prev.clienteCpfCnpj,
        clienteNacionalidade: lead.nacionalidade || prev.clienteNacionalidade,
        clienteEstadoCivil: lead.estado_civil || prev.clienteEstadoCivil,
        clienteProfissao: lead.profissao || prev.clienteProfissao,
        clienteEndereco: lead.endereco || prev.clienteEndereco,
        clienteCidade: lead.cidade || prev.clienteCidade,
        clienteEstado: lead.estado || prev.clienteEstado,
        clienteCep: lead.cep || prev.clienteCep,
        clienteTelefone: lead.telefone || prev.clienteTelefone,
        clienteEmail: lead.email || prev.clienteEmail,
        kitNome: proposta?.kit_nome || prev.kitNome,
        potenciaKwp: pot
          ? typeof pot === 'number'
            ? pot.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : String(pot)
          : prev.potenciaKwp,
        kitFabricante: proposta?.kit_fabricante || prev.kitFabricante,
        kitDescricao: (proposta as any)?.kit_descricao || prev.kitDescricao,
        kitStringBox: (proposta as any)?.kit_string_box || prev.kitStringBox,
        tabelaEquipamentos: recarregaTabela.length > 0 ? recarregaTabela : prev.tabelaEquipamentos,
        valorTotal: valorTotal || prev.valorTotal,
        valorFinal: valorTotal || prev.valorFinal,
        condicoesPagamento: proposta?.condicoes_pagamento || prev.condicoesPagamento,
        parcelaEntrada: valorTotal ? valorTotal * 0.5 : prev.parcelaEntrada,
        parcelaFinal: valorTotal ? valorTotal * 0.5 : prev.parcelaFinal,
      }))

      setProcuracaoState((prev) => ({
        ...prev,
        clienteNome: lead.nome || prev.clienteNome,
        clienteNacionalidade: lead.nacionalidade || prev.clienteNacionalidade || 'BRASILEIRO',
        clienteEstadoCivil: lead.estado_civil || prev.clienteEstadoCivil,
        clienteProfissao: lead.profissao || prev.clienteProfissao,
        clienteCpfCnpj: lead.cpf_cnpj || prev.clienteCpfCnpj,
        clienteEndereco: lead.endereco || prev.clienteEndereco,
        clienteCidade: lead.cidade || prev.clienteCidade,
        clienteEstado: lead.estado || prev.clienteEstado,
        clienteCep: lead.cep || prev.clienteCep,
      }))
    }
  }, [open, lead, proposta, specs])

  // Campos pendentes no momento
  const camposPendentes = React.useMemo(() => {
    const faltam: string[] = []
    if (tipo === 'contrato') {
      if (!contratoState.clienteCpfCnpj) faltam.push('CPF/CNPJ')
      if (!contratoState.clienteNacionalidade) faltam.push('Nacionalidade')
      if (!contratoState.clienteEstadoCivil) faltam.push('Estado Civil')
      if (!contratoState.clienteProfissao) faltam.push('Profissão')
      if (!contratoState.clienteEndereco) faltam.push('Endereço')
      if (!contratoState.clienteCidade) faltam.push('Cidade')
      if (!contratoState.clienteCep) faltam.push('CEP')
    } else {
      if (!procuracaoState.clienteNome) faltam.push('Nome')
      if (!procuracaoState.clienteCpfCnpj) faltam.push('CPF/CNPJ')
      if (!procuracaoState.clienteNacionalidade) faltam.push('Nacionalidade')
      if (!procuracaoState.clienteEstadoCivil) faltam.push('Estado Civil')
      if (!procuracaoState.clienteProfissao) faltam.push('Profissão')
      if (!procuracaoState.clienteEndereco) faltam.push('Endereço (logradouro/nº)')
      if (!procuracaoState.clienteBairro) faltam.push('Bairro')
      if (!procuracaoState.clienteCidade) faltam.push('Cidade')
      if (!procuracaoState.clienteEstado) faltam.push('Estado')
      if (!procuracaoState.clienteCep) faltam.push('CEP')
    }
    return faltam
  }, [tipo, contratoState, procuracaoState])

  // HTML atualizado
  const currentHtml = React.useMemo(() => {
    if (tipo === 'contrato') {
      return generateContratoHTML(contratoState)
    } else {
      return generateProcuracaoEnergisaHTML(procuracaoState)
    }
  }, [tipo, contratoState, procuracaoState])

  // Imprimir / Baixar via browser print to PDF
  const handlePrint = () => {
    FormalizacaoService.openPrintWindow(
      currentHtml,
      tipo === 'contrato' ? 'Contrato Ecosolar' : 'Procuração Energisa',
    )
  }

  // Finalizar e salvar documento no Lead
  const handleFinalizar = async () => {
    try {
      setSaving(true)

      const docTitulo =
        tipo === 'contrato'
          ? `Contrato de Instalação Fotovoltaica — ${contratoState.clienteNome}`
          : `Procuração Energisa Rondônia — ${procuracaoState.clienteNome}`

      const payloadCustomizados = tipo === 'contrato' ? contratoState : procuracaoState

      // Criar blob HTML do documento para servir como arquivo anexado
      const htmlBlob = new Blob([currentHtml], { type: 'text/html' })

      const savedDoc = await FormalizacaoService.saveDocumento({
        lead: lead.id,
        tipo,
        titulo: docTitulo,
        dados_customizados: payloadCustomizados as any,
        conteudo_html: currentHtml,
        arquivo_pdf_blob: htmlBlob,
      })

      toast({
        title: 'Documento de formalização gerado!',
        description: `${tipo === 'contrato' ? 'Contrato' : 'Procuração'} finalizado e anexado à ficha do lead.`,
      })

      onSaved(savedDoc)
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao finalizar documento:', err)
      const msg = toPortugueseErrorMessage(
        err,
        'Não foi possível salvar o documento de formalização. Verifique os dados e tente novamente.',
      )

      toast({
        title: 'Erro ao salvar documento',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 bg-gradient-to-r from-[#0A192F] via-[#0F284E] to-[#163868] text-white border-b border-amber-400/30 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300">
                <FileText className="w-5 h-5" />
              </span>
              <DialogTitle className="text-lg font-black text-white tracking-tight">
                {tipo === 'contrato'
                  ? 'Formalização: Contrato de Prestação de Serviços'
                  : 'Formalização: Procuração Particular Energisa'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-300">
              Revise e edite as informações geradas automaticamente antes de salvar e emitir o
              documento final.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            {camposPendentes.length > 0 ? (
              <Badge
                variant="outline"
                className="bg-amber-400/10 text-amber-300 border-amber-400/40 text-[11px] gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                <span>{camposPendentes.length} campos incompletos</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-emerald-400/10 text-emerald-300 border-emerald-400/40 text-[11px] gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Todos os campos preenchidos</span>
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Alerta de campos pendentes */}
        {camposPendentes.length > 0 && (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Atenção:</strong> Complete os seguintes dados para evitar lacunas destacadas
                no documento: <span className="font-semibold">{camposPendentes.join(', ')}</span>.
              </span>
            </div>
          </div>
        )}

        {/* Tabs de Edição e Visualização Prévia */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-5 pt-3 bg-white border-b border-slate-200 flex items-center justify-between">
            <TabsList className="bg-slate-100 p-0.5">
              <TabsTrigger
                value="formulario"
                className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#0A192F]"
              >
                <User className="w-3.5 h-3.5" />
                <span>1. Edição dos Dados e Cláusulas</span>
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#0A192F]"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>2. Visualização Fiel do Documento</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 text-xs font-semibold border-slate-300 text-slate-700 hover:text-blue-700 gap-1.5"
                title="Abrir janela de impressão / Salvar em PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / PDF</span>
              </Button>
            </div>
          </div>

          {/* TAB 1: FORMULÁRIO DE EDIÇÃO */}
          <TabsContent value="formulario" className="flex-1 overflow-y-auto p-5 m-0 space-y-6">
            {tipo === 'contrato' ? (
              <div className="space-y-6">
                {/* Bloco 1: Contratante (Lead) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-[#0B7A5B]" />
                    <span>Dados do CONTRATANTE (Cliente)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Nome Completo / Razão Social
                      </Label>
                      <Input
                        value={contratoState.clienteNome}
                        onChange={(e) =>
                          setContratoState({ ...contratoState, clienteNome: e.target.value })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">CPF ou CNPJ</Label>
                      <Input
                        value={contratoState.clienteCpfCnpj}
                        onChange={(e) =>
                          setContratoState({ ...contratoState, clienteCpfCnpj: e.target.value })
                        }
                        placeholder="000.000.000-00"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Nacionalidade</Label>
                      <Input
                        value={contratoState.clienteNacionalidade}
                        onChange={(e) =>
                          setContratoState({
                            ...contratoState,
                            clienteNacionalidade: e.target.value,
                          })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Estado Civil</Label>
                      <Input
                        value={contratoState.clienteEstadoCivil}
                        onChange={(e) =>
                          setContratoState({ ...contratoState, clienteEstadoCivil: e.target.value })
                        }
                        placeholder="Casado(a), Solteiro(a)..."
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Profissão</Label>
                      <Input
                        value={contratoState.clienteProfissao}
                        onChange={(e) =>
                          setContratoState({ ...contratoState, clienteProfissao: e.target.value })
                        }
                        placeholder="Produtor Rural, Comerciante..."
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Endereço Completo
                      </Label>
                      <Input
                        value={contratoState.clienteEndereco}
                        onChange={(e) =>
                          setContratoState({ ...contratoState, clienteEndereco: e.target.value })
                        }
                        placeholder="Rua, Número, Bairro"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Cidade - UF</Label>
                      <Input
                        value={`${contratoState.clienteCidade} - ${contratoState.clienteEstado}`}
                        onChange={(e) => {
                          const parts = e.target.value.split('-')
                          setContratoState({
                            ...contratoState,
                            clienteCidade: parts[0]?.trim() || '',
                            clienteEstado: parts[1]?.trim() || 'RO',
                          })
                        }}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">CEP</Label>
                      <Input
                        value={contratoState.clienteCep}
                        onChange={(e) =>
                          setContratoState({ ...contratoState, clienteCep: e.target.value })
                        }
                        placeholder="76934-000"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloco 2: Sistema e Equipamentos */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Sistema Solar & Equipamentos (Cláusula 1ª e 2ª)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Título / Nome do Kit
                      </Label>
                      <Input
                        value={contratoState.kitNome}
                        onChange={(e) =>
                          setContratoState({ ...contratoState, kitNome: e.target.value })
                        }
                        className="h-9 text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Potência (kWp)</Label>
                      <Input
                        value={contratoState.potenciaKwp}
                        onChange={(e) =>
                          setContratoState({ ...contratoState, potenciaKwp: e.target.value })
                        }
                        placeholder="Ex: 6,30"
                        className="h-9 text-xs font-bold text-[#0B7A5B]"
                      />
                    </div>
                  </div>

                  {/* Edição da tabela de equipamentos */}
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs font-semibold text-slate-700">
                      Tabela de Equipamentos do Contrato
                    </Label>
                    <div className="space-y-2">
                      {contratoState.tabelaEquipamentos?.map((item, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                        >
                          <div className="sm:col-span-3">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              Item
                            </span>
                            <Input
                              value={item.item}
                              onChange={(e) => {
                                const newTabela = [...(contratoState.tabelaEquipamentos || [])]
                                newTabela[idx].item = e.target.value
                                setContratoState({
                                  ...contratoState,
                                  tabelaEquipamentos: newTabela,
                                })
                              }}
                              className="h-8 text-xs font-medium bg-white"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              Potência
                            </span>
                            <Input
                              value={item.potencia || ''}
                              placeholder="Ex: 630 W ou 7,5 kW"
                              onChange={(e) => {
                                const newTabela = [...(contratoState.tabelaEquipamentos || [])]
                                newTabela[idx].potencia = e.target.value
                                setContratoState({
                                  ...contratoState,
                                  tabelaEquipamentos: newTabela,
                                })
                              }}
                              className="h-8 text-xs font-bold text-[#0B7A5B] bg-white text-center"
                            />
                          </div>
                          <div className="sm:col-span-1">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              Qtd
                            </span>
                            <Input
                              value={item.quantidade}
                              onChange={(e) => {
                                const newTabela = [...(contratoState.tabelaEquipamentos || [])]
                                newTabela[idx].quantidade = e.target.value
                                setContratoState({
                                  ...contratoState,
                                  tabelaEquipamentos: newTabela,
                                })
                              }}
                              className="h-8 text-xs bg-white text-center"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              Marca / Modelo
                            </span>
                            <Input
                              value={item.fabricanteModelo}
                              onChange={(e) => {
                                const newTabela = [...(contratoState.tabelaEquipamentos || [])]
                                newTabela[idx].fabricanteModelo = e.target.value
                                setContratoState({
                                  ...contratoState,
                                  tabelaEquipamentos: newTabela,
                                })
                              }}
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              Especificação
                            </span>
                            <Input
                              value={item.especificacao}
                              onChange={(e) => {
                                const newTabela = [...(contratoState.tabelaEquipamentos || [])]
                                newTabela[idx].especificacao = e.target.value
                                setContratoState({
                                  ...contratoState,
                                  tabelaEquipamentos: newTabela,
                                })
                              }}
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bloco 3: Valores e Pagamento */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-600" />
                    <span>Valores & Rateio de Pagamento (Cláusula 3ª)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Valor Total Bruto (R$)
                      </Label>
                      <Input
                        type="number"
                        value={contratoState.valorTotal}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0
                          const desc = Number(contratoState.descontoAvista) || 0
                          const liq = Math.max(0, val - desc)
                          setContratoState({
                            ...contratoState,
                            valorTotal: val,
                            valorFinal: liq,
                            parcelaEntrada: liq * 0.5,
                            parcelaFinal: liq * 0.5,
                          })
                        }}
                        className="h-9 text-xs font-bold font-mono-numbers"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Desconto Concedido (R$)
                      </Label>
                      <Input
                        type="number"
                        value={contratoState.descontoAvista}
                        onChange={(e) => {
                          const desc = Number(e.target.value) || 0
                          const valTotalNum = Number(contratoState.valorTotal) || 0
                          const liq = Math.max(0, valTotalNum - desc)
                          setContratoState({
                            ...contratoState,
                            descontoAvista: desc,
                            valorFinal: liq,
                            parcelaEntrada: liq * 0.5,
                            parcelaFinal: liq * 0.5,
                          })
                        }}
                        className="h-9 text-xs font-mono-numbers"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Valor Final Líquido (R$)
                      </Label>
                      <Input
                        type="number"
                        value={contratoState.valorFinal}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0
                          setContratoState({
                            ...contratoState,
                            valorFinal: val,
                            parcelaEntrada: val * 0.5,
                            parcelaFinal: val * 0.5,
                          })
                        }}
                        className="h-9 text-xs font-extrabold text-[#0B7A5B] font-mono-numbers"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Forma de Pagamento (Cláusula 3.2)
                    </Label>
                    <Textarea
                      rows={2}
                      value={contratoState.condicoesPagamento}
                      onChange={(e) =>
                        setContratoState({
                          ...contratoState,
                          condicoesPagamento: e.target.value,
                          detalhesParcelamento: e.target.value,
                        })
                      }
                      placeholder="Ex: Na assinatura do contrato o valor de R$ 11.203,43. No fim da Instalação R$ 5.796,57."
                      className="text-xs resize-none"
                    />
                  </div>
                </div>

                {/* Bloco 4: Dados Fixos e Assinatura */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Fechamento, Data e Foro</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Data e Local por Extenso
                      </Label>
                      <Input
                        value={contratoState.dataAssinatura}
                        onChange={(e) =>
                          setContratoState({ ...contratoState, dataAssinatura: e.target.value })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Foro de Eleição (Fixo)
                      </Label>
                      <Input
                        disabled
                        value={DADOS_FIXOS_ECOSOLAR.foro}
                        className="h-9 text-xs bg-slate-50 text-slate-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* PROCURAÇÃO FORM */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-[#0B7A5B]" />
                    <span>Outorgante (Cliente)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Nome do Outorgante
                      </Label>
                      <Input
                        value={procuracaoState.clienteNome}
                        onChange={(e) =>
                          setProcuracaoState({ ...procuracaoState, clienteNome: e.target.value })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">CPF</Label>
                      <Input
                        value={procuracaoState.clienteCpfCnpj}
                        onChange={(e) =>
                          setProcuracaoState({ ...procuracaoState, clienteCpfCnpj: e.target.value })
                        }
                        placeholder="000.000.000-00"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Nacionalidade</Label>
                      <Input
                        value={procuracaoState.clienteNacionalidade}
                        onChange={(e) =>
                          setProcuracaoState({
                            ...procuracaoState,
                            clienteNacionalidade: e.target.value,
                          })
                        }
                        placeholder="BRASILEIRO"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Estado Civil</Label>
                      <Input
                        value={procuracaoState.clienteEstadoCivil}
                        onChange={(e) =>
                          setProcuracaoState({
                            ...procuracaoState,
                            clienteEstadoCivil: e.target.value,
                          })
                        }
                        placeholder="Casado(a)..."
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Profissão</Label>
                      <Input
                        value={procuracaoState.clienteProfissao}
                        onChange={(e) =>
                          setProcuracaoState({
                            ...procuracaoState,
                            clienteProfissao: e.target.value,
                          })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Endereço (Rua e Nº)
                      </Label>
                      <Input
                        value={procuracaoState.clienteEndereco}
                        onChange={(e) =>
                          setProcuracaoState({
                            ...procuracaoState,
                            clienteEndereco: e.target.value,
                          })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Bairro</Label>
                      <Input
                        value={procuracaoState.clienteBairro}
                        onChange={(e) =>
                          setProcuracaoState({ ...procuracaoState, clienteBairro: e.target.value })
                        }
                        placeholder="Centro"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">CEP</Label>
                      <Input
                        value={procuracaoState.clienteCep}
                        onChange={(e) =>
                          setProcuracaoState({ ...procuracaoState, clienteCep: e.target.value })
                        }
                        placeholder="76934-000"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Município</Label>
                      <Input
                        value={procuracaoState.clienteCidade}
                        onChange={(e) =>
                          setProcuracaoState({ ...procuracaoState, clienteCidade: e.target.value })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Estado (UF)</Label>
                      <Input
                        value={procuracaoState.clienteEstado}
                        onChange={(e) =>
                          setProcuracaoState({ ...procuracaoState, clienteEstado: e.target.value })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloco: Outorgados Fixos e Concessionária */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-600" />
                    <span>Outorgados & Concessionária (Fixos no Sistema)</span>
                  </h4>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs text-slate-700">
                    <p>
                      <strong>Outorgados Credenciados (Fixos Verbatim):</strong>
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li>
                        <strong>1º) WILLIAN DA COSTA GOVEIA</strong>, Engenheiro Eletricista,
                        brasileiro, inscrito no CREA sob o nº 26000217D RO, portador do RG nº
                        1425244 SESDEC/RO e CPF nº 024.376.042-60, residente e domiciliado na Rua
                        Piauí, nº 1970, Setor 1ª, Jaru/RO CEP:76890-000.
                      </li>
                      <li>
                        <strong>2º) HERNANDES DA SILVA COSTA</strong>, Empresário, Brasileiro,
                        Casado, portador do RG n°1432554, portador do CPF nº 041.209.632-33, CEO e
                        representante comercial da empresa Ecosolar Energy, residente na Av.
                        Flamboyant n°1268, Bairro Centro, Seringueiras/RO CEP 76934-000.
                      </li>
                    </ul>
                    <p className="text-[11px] text-slate-500 pt-1">
                      Texto oficial verbatim gravado: concessionária ENERGISA RONDÔNIA —
                      DISTRIBUIDORA DE ENERGIA S/A, poderes com os 6 bullets regulamentares,
                      validade de 12 meses e local SERINGUEIRAS – RO.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Concessionária</Label>
                      <Input
                        value={procuracaoState.concessionaria}
                        onChange={(e) =>
                          setProcuracaoState({ ...procuracaoState, concessionaria: e.target.value })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Data e Local de Assinatura
                      </Label>
                      <Input
                        value={procuracaoState.dataAssinatura}
                        onChange={(e) =>
                          setProcuracaoState({ ...procuracaoState, dataAssinatura: e.target.value })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: PREVIEW FIEL */}
          <TabsContent value="preview" className="flex-1 overflow-hidden p-0 m-0 bg-slate-200/80">
            <iframe
              title="Preview do Documento"
              srcDoc={currentHtml}
              className="w-full h-full border-0 bg-white"
            />
          </TabsContent>
        </Tabs>

        {/* Footer com Ações */}
        <DialogFooter className="p-4 bg-white border-t border-slate-200 flex flex-row items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-slate-600 text-xs h-9"
          >
            Fechar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="text-xs font-semibold border-slate-300 gap-1.5 h-9"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </Button>

            <Button
              type="button"
              onClick={handleFinalizar}
              disabled={saving}
              className="bg-[#0B7A5B] hover:bg-[#095C44] text-white font-semibold text-xs gap-1.5 h-9 shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Finalizando e Gravando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Finalizar e Anexar ao Lead</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
