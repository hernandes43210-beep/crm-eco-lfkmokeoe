// Página Principal: Gerador de Kit Solar Ecosolar
import { useState, useEffect, useMemo, useCallback } from 'react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Zap, RotateCcw, Sparkles, Layers, ListOrdered, FileSpreadsheet } from 'lucide-react'
import {
  KitGeradorService,
  parsePaineisLinhas,
  parseInversoresLinhas,
  parseOutrosDados,
  type PainelCatalogo,
  type InversorCatalogo,
  type DistribuidoraItem,
  type KitGerado,
  type PainelLinha,
  type InversorLinha,
} from '@/services/kitGerador'
import {
  CardNumero,
  CartaoPerfil,
  CartaoEstrutura,
  CartaoPreco,
  BlocoQuantidadePainel,
  BlocoQuantidadeInversor,
} from './kitGerador/CartoesForm'
import { BlocoPaineisMultiplos } from './kitGerador/BlocoPaineisMultiplos'
import { BlocoInversoresMultiplos } from './kitGerador/BlocoInversoresMultiplos'
import { ResumoKit, AbaCatalogo, AbaKitsSalvos } from './kitGerador/CartoesResumo'
import { ModalSalvarKit } from './kitGerador/ModalSalvarKit'
import {
  estadoInicial,
  linhaPainelInicial,
  linhaInversorInicial,
  type EstadoForm,
  type PainelItemForm,
  type InversorItemForm,
} from './kitGerador/formTipos'
import {
  calcularTudo,
  montarPayloadPaineis,
  montarPayloadInversores,
  montarDadosResumo,
} from './kitGerador/kitCalculos'
import { qtdPaineisSugerida, fmt, montarNomeKit } from './kitGerador/logica'
import { parseNumeroPtBr } from './kitGerador/formControles'

export default function KitGeradorPage() {
  const { toast } = useToast()

  // Estados remotos
  const [paineis, setPaineis] = useState<PainelCatalogo[]>([])
  const [inversores, setInversores] = useState<InversorCatalogo[]>([])
  const [distribuidoras, setDistribuidoras] = useState<DistribuidoraItem[]>([])
  const [kitsSalvos, setKitsSalvos] = useState<KitGerado[]>([])
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(false)
  const [gravandoCatalogo, setGravandoCatalogo] = useState(false)

  // Estado do formulário
  const [form, setForm] = useState<EstadoForm>(() => estadoInicial())
  const [tabAtiva, setTabAtiva] = useState('montador')

  // Modal de salvar kit
  const [modalSalvarAberto, setModalSalvarAberto] = useState(false)
  const [nomeKitSalvar, setNomeKitSalvar] = useState('')
  const [salvandoKit, setSalvandoKit] = useState(false)

  // Atualizador parcial do form
  const setParcialForm = useCallback((parcial: Partial<EstadoForm>) => {
    setForm((prev) => ({ ...prev, ...parcial }))
  }, [])

  // Carrega catálogos e kits salvos do PocketBase
  const carregarDados = useCallback(async () => {
    setCarregandoCatalogo(true)
    try {
      const [p, inv, dist, kits] = await Promise.all([
        KitGeradorService.listarPaineis(),
        KitGeradorService.listarInversores(),
        KitGeradorService.listarDistribuidoras(),
        KitGeradorService.listarKits(),
      ])
      setPaineis(p)
      setInversores(inv)
      setDistribuidoras(dist)
      setKitsSalvos(kits)

      // Se o form ainda tiver valores vazios, preenche com o primeiro do catálogo se existir
      setForm((prev) => {
        const primeiraLinhaPainel = prev.painelLinhas[0]
        const primeiraLinhaInversor = prev.inversorLinhas[0]

        let mudou = false
        const novoPaineis = [...prev.painelLinhas]
        const novoInversores = [...prev.inversorLinhas]

        if (p.length > 0 && (!primeiraLinhaPainel || !primeiraLinhaPainel.marca)) {
          mudou = true
          novoPaineis[0] = {
            id: 'p-1',
            modo: 'catalogo',
            catalogoId: p[0].id,
            marca: p[0].marca,
            modelo: p[0].modelo,
            potenciaW: p[0].potencia_w,
            areaM2: p[0].area_m2,
            qtd: 10,
          }
        }

        if (inv.length > 0 && (!primeiraLinhaInversor || !primeiraLinhaInversor.marca)) {
          mudou = true
          novoInversores[0] = {
            id: 'inv-1',
            modo: 'catalogo',
            catalogoId: inv[0].id,
            marca: inv[0].marca,
            modelo: inv[0].modelo,
            potenciaKw: inv[0].potencia_kw,
            tipo: inv[0].tipo,
            qtd: 1,
          }
        }

        if (!mudou) return prev
        return {
          ...prev,
          painelLinhas: novoPaineis,
          inversorLinhas: novoInversores,
          distribuidora: prev.distribuidora || (dist[0]?.nome ?? ''),
        }
      })
    } catch (e: any) {
      console.error('Erro ao carregar catálogo:', e)
      toast({
        title: 'Erro ao carregar equipamentos',
        description: e?.message || 'Falha na conexão com o banco.',
        variant: 'destructive',
      })
    } finally {
      setCarregandoCatalogo(false)
    }
  }, [toast])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Distribuidora efetiva: se o usuário escolheu "+ Outra", usa a que ele digitou
  const distribuidoraEfetiva = useMemo(
    () => (form.distribuidora === '__outra__' ? form.distribuidoraNova : form.distribuidora),
    [form.distribuidora, form.distribuidoraNova],
  )

  // Cálculos consolidados somando múltiplos módulos e múltiplos inversores
  const calc = useMemo(() => {
    const custoNum = parseNumeroPtBr(form.custo) ?? 0
    const margemNum = parseNumeroPtBr(form.acrescimoPct) ?? 41
    const descValorNum = parseNumeroPtBr(form.descontoValor) ?? 0

    return calcularTudo({
      paineisLinhas: form.painelLinhas,
      inversoresLinhas: form.inversorLinhas,
      sol: parseNumeroPtBr(form.sol) ?? 4.5,
      perdas: parseNumeroPtBr(form.perdas) ?? 20,
      custo: custoNum,
      acrescimoPct: margemNum,
      descontoTipo: form.descontoTipo,
      descontoValor: descValorNum,
      itens: form.itens,
    })
  }, [
    form.painelLinhas,
    form.inversorLinhas,
    form.sol,
    form.perdas,
    form.custo,
    form.acrescimoPct,
    form.descontoTipo,
    form.descontoValor,
    form.itens,
  ])

  // Dados consolidados para o Resumo
  const dadosResumo = useMemo(() => {
    return montarDadosResumo({
      calc,
      paineisLinhas: form.painelLinhas,
      inversoresLinhas: form.inversorLinhas,
      outrosDadosPaineis: form.outrosDadosPaineis,
      outrosDadosInversores: form.outrosDadosInversores,
      tipoInstalacao: form.tipoInstalacao,
      distribuidora: distribuidoraEfetiva,
      ligacao: form.ligacao,
    })
  }, [calc, form, distribuidoraEfetiva])

  // Aplica quantidade sugerida no primeiro módulo com base no consumo do cliente
  const aplicarQtdSugeridaConsumo = useCallback(() => {
    const potW = form.painelLinhas[0]?.potenciaW || 550
    const sol = parseNumeroPtBr(form.sol) ?? 4.5
    const perdas = parseNumeroPtBr(form.perdas) ?? 20
    const consumo = parseNumeroPtBr(form.consumo) ?? 600
    const geracaoPorKwpMes = sol * 30 * (1 - perdas / 100)
    const kwpNec = geracaoPorKwpMes > 0 ? consumo / geracaoPorKwpMes : 0
    const sugerida = qtdPaineisSugerida(kwpNec, potW)
    const novasLinhas = [...form.painelLinhas]
    if (novasLinhas.length > 0) {
      novasLinhas[0] = { ...novasLinhas[0], qtd: sugerida }
      setParcialForm({ painelLinhas: novasLinhas })
      toast({
        title: 'Quantidade calculada!',
        description: `Sugeridos ${sugerida} módulos de ${potW} W para cobrir ~${form.consumo} kWh/mês.`,
      })
    }
  }, [form.consumo, form.painelLinhas, form.sol, form.perdas, setParcialForm, toast])

  // Grava novo painel no PocketBase
  const handleGravarPainelCatalogo = async (linha: PainelItemForm) => {
    if (!linha.marca.trim() || !linha.modelo.trim()) {
      toast({ title: 'Preencha marca e modelo', variant: 'destructive' })
      return
    }
    setGravandoCatalogo(true)
    try {
      const novo = await KitGeradorService.gravarPainel({
        marca: linha.marca.trim(),
        modelo: linha.modelo.trim(),
        potencia_w: Number(linha.potenciaW) || 550,
        area_m2: Number(linha.areaM2) || 2.79,
      })
      setPaineis((prev) => [novo, ...prev])
      toast({ title: 'Painel adicionado ao catálogo com sucesso!' })
    } catch (e: any) {
      toast({ title: 'Erro ao gravar painel', description: e.message, variant: 'destructive' })
    } finally {
      setGravandoCatalogo(false)
    }
  }

  // Grava novo inversor no PocketBase
  const handleGravarInversorCatalogo = async (linha: InversorItemForm) => {
    if (!linha.marca.trim() || !linha.modelo.trim()) {
      toast({ title: 'Preencha marca e modelo', variant: 'destructive' })
      return
    }
    setGravandoCatalogo(true)
    try {
      const novo = await KitGeradorService.gravarInversor({
        marca: linha.marca.trim(),
        modelo: linha.modelo.trim(),
        potencia_kw: Number(linha.potenciaKw) || 5,
        tipo: linha.tipo || 'Monofásico',
      })
      setInversores((prev) => [novo, ...prev])
      toast({ title: 'Inversor adicionado ao catálogo com sucesso!' })
    } catch (e: any) {
      toast({ title: 'Erro ao gravar inversor', description: e.message, variant: 'destructive' })
    } finally {
      setGravandoCatalogo(false)
    }
  }

  // Itens extras no formulário
  const handleSetItem = (idx: number, p: any) => {
    const novos = [...form.itens]
    novos[idx] = { ...novos[idx], ...p }
    setParcialForm({ itens: novos })
  }

  const handleAddItem = () => {
    setParcialForm({
      itens: [
        ...form.itens,
        {
          nome: 'Novo item adicional',
          qtd: 1,
          incluido: true,
          padrao: false,
        },
      ],
    })
  }

  const handleRemoveItem = (idx: number) => {
    setParcialForm({
      itens: form.itens.filter((_, i) => i !== idx),
    })
  }

  // Salvar Kit para propostas
  const handleSalvarKit = async () => {
    if (!nomeKitSalvar.trim()) {
      toast({ title: 'Informe um nome para o kit', variant: 'destructive' })
      return
    }

    const margemNum = parseNumeroPtBr(form.acrescimoPct) ?? 0
    if (margemNum >= 100) {
      toast({
        title: 'Margem inválida',
        description: 'A margem deve ser menor que 100% para o cálculo do preço de venda.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoKit(true)
    try {
      const payloadPainel = montarPayloadPaineis(form.painelLinhas, form.outrosDadosPaineis)
      const payloadInversor = montarPayloadInversores(
        form.inversorLinhas,
        form.outrosDadosInversores,
      )

      const itensPayload = form.itens
        .filter((it: any) => it.incluido !== false && it.selecionado !== false)
        .map((it: any) => ({
          nome: it.nome || it.descricao || 'Item',
          qtd: Number(it.qtd) || 1,
        }))

      const novo = await KitGeradorService.salvarKit({
        nome: nomeKitSalvar.trim(),
        potencia_kwp: calc.kwp,
        geracao_kwh: calc.geracaoMensal,
        area_m2: calc.areaM2,
        tipo_instalacao: form.tipoInstalacao,
        ligacao: form.ligacao,
        distribuidora: distribuidoraEfetiva.trim(),
        painel: payloadPainel as any,
        inversor: payloadInversor as any,
        itens: itensPayload,
        custo: parseNumeroPtBr(form.custo) ?? 0,
        acrescimo_pct: parseNumeroPtBr(form.acrescimoPct) ?? 0,
        preco_venda: calc.precoFinal,
        desconto_tipo: form.descontoTipo,
        desconto_valor: parseNumeroPtBr(form.descontoValor) ?? 0,
        desconto_rs: 0,
        preco_final: calc.precoFinal,
        lucro: calc.lucro,
        margem_pct: calc.margemPct,
      })

      setKitsSalvos((prev) => [novo, ...prev])
      setModalSalvarAberto(false)
      setNomeKitSalvar('')
      toast({
        title: 'Kit solar salvo com sucesso!',
        description: `Kit "${novo.nome}" (${fmt(novo.potencia_kwp)} kWp) salvo para propostas.`,
      })
    } catch (e: any) {
      console.error('Erro ao salvar kit:', e)
      toast({
        title: 'Erro ao salvar kit',
        description: e?.message || 'Falha ao salvar no banco.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoKit(false)
    }
  }

  // Abrir Kit salvo no montador (restaura múltiplos módulos e múltiplos inversores com tolerância legado)
  const handleAbrirKit = (id: string) => {
    const k = kitsSalvos.find((kit) => kit.id === id)
    if (!k) return

    // Parsers universais compatíveis com v0.0.166 e anteriores
    const paineisParsed: PainelLinha[] = parsePaineisLinhas(k.painel)
    const inversoresParsed: InversorLinha[] = parseInversoresLinhas(k.inversor)
    const outrosPaineisParsed = parseOutrosDados(k.painel)
    const outrosInversoresParsed = parseOutrosDados(k.inversor)

    // Converte para as linhas do form
    const formPaineis: PainelItemForm[] =
      paineisParsed.length > 0
        ? paineisParsed.map((p, idx) => ({
            id: `p-${idx}-${Date.now()}`,
            modo: 'livre',
            marca: p.marca || 'Padrão',
            modelo: p.modelo || '',
            potenciaW: Number(p.potencia_w) || 550,
            areaM2: Number(p.area_m2) || 2.79,
            qtd: Number(p.qtd) || 1,
          }))
        : [linhaPainelInicial()]

    const formInversores: InversorItemForm[] =
      inversoresParsed.length > 0
        ? inversoresParsed.map((inv, idx) => ({
            id: `inv-${idx}-${Date.now()}`,
            modo: 'livre',
            marca: inv.marca || 'Padrão',
            modelo: inv.modelo || '',
            potenciaKw: Number(inv.potencia_kw) || 5,
            tipo: (inv.tipo as any) || 'Monofásico',
            qtd: Number(inv.qtd) || 1,
          }))
        : [linhaInversorInicial()]

    // Parseia itens extras salvos
    let itensRecuperados = estadoInicial().itens
    if (k.itens) {
      try {
        const arr = typeof k.itens === 'string' ? JSON.parse(k.itens) : k.itens
        if (Array.isArray(arr) && arr.length > 0) {
          itensRecuperados = arr.map((item: any) => ({
            nome: item.nome || item.descricao || 'Item',
            qtd: Number(item.qtd) || 1,
            incluido: item.incluido !== false && item.selecionado !== false,
            padrao: !!item.padrao,
          }))
        }
      } catch {
        // mantém padrão
      }
    }

    setForm((prev) => ({
      ...prev,
      painelLinhas: formPaineis,
      inversorLinhas: formInversores,
      outrosDadosPaineis: outrosPaineisParsed,
      outrosDadosInversores: outrosInversoresParsed,
      distribuidora: k.distribuidora || prev.distribuidora,
      tipoInstalacao: (k.tipo_instalacao as any) || prev.tipoInstalacao,
      itens: itensRecuperados,
      custo: k.custo ? String(k.custo).replace('.', ',') : '',
      acrescimoPct:
        k.acrescimo_pct !== undefined && k.acrescimo_pct !== null
          ? String(k.acrescimo_pct).replace('.', ',')
          : prev.acrescimoPct,
      descontoTipo: k.desconto_tipo || 'R$',
      descontoValor: k.desconto_valor ? String(k.desconto_valor).replace('.', ',') : '',
    }))

    setTabAtiva('montador')
    toast({
      title: 'Kit carregado no montador!',
      description: `Kit "${k.nome}" com ${formPaineis.length} modelo(s) de módulos e ${formInversores.length} de inversores aberto para edição.`,
    })
  }

  // Excluir kit salvo
  const handleExcluirKit = async (id: string) => {
    try {
      await KitGeradorService.desativarKit(id)
      setKitsSalvos((prev) => prev.filter((k) => k.id !== id))
      toast({ title: 'Kit removido com sucesso!' })
    } catch (e: any) {
      toast({ title: 'Erro ao excluir kit', description: e.message, variant: 'destructive' })
    }
  }

  // Copiar resumo
  const handleCopiarResumo = () => {
    const textoPaineis = form.painelLinhas
      .map((p) => `• ${p.qtd}x ${p.marca} ${p.modelo} (${p.potenciaW} W)`)
      .join('\n')
    const textoInversores = form.inversorLinhas
      .map((i) => `• ${i.qtd}x ${i.marca} ${i.modelo} (${fmt(i.potenciaKw)} kW)`)
      .join('\n')

    const texto = `☀️ KIT SOLAR ECOSOLAR
Potência CC: ${fmt(calc.kwp)} kWp
Potência CA: ${fmt(calc.kwCa)} kW
Geração mensal estimada: ~${calc.geracaoMensal} kWh/mês

MÓDULOS:
${textoPaineis}
${form.outrosDadosPaineis ? `Obs: ${form.outrosDadosPaineis}\n` : ''}
INVERSORES:
${textoInversores}
${form.outrosDadosInversores ? `Obs: ${form.outrosDadosInversores}\n` : ''}
Estrutura: ${form.tipoInstalacao}
Fornecedor: ${distribuidoraEfetiva}

Valor final sugerido: R$ ${calc.precoFinal.toLocaleString('pt-BR')}`

    navigator.clipboard.writeText(texto)
    toast({ title: 'Resumo copiado para a área de transferência!' })
  }

  const handleLimparTudo = () => {
    setForm(estadoInicial(paineis, inversores, distribuidoras))
    toast({ title: 'Montador redefinido para o padrão' })
  }

  // Sugestão de nome do kit ao abrir o modal — ex.: "Kit Solar 13,42 kWp — BYD + PHB — Solo monoposte — Bel Energy"
  const sugestaoNomeKit = useMemo(
    () =>
      montarNomeKit({
        kwp: calc.kwp,
        marcasPaineis: form.painelLinhas.map((p) => p.marca),
        marcasInversores: form.inversorLinhas.map((i) => i.marca),
        tipoInstalacao: form.tipoInstalacao,
        distribuidora: distribuidoraEfetiva,
      }),
    [form.painelLinhas, form.inversorLinhas, form.tipoInstalacao, distribuidoraEfetiva, calc.kwp],
  )

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dfe5f0] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0b1f4d] text-[#f1c40f]">
              <Zap className="h-5 w-5" />
            </span>
            <h1 className="font-montserrat text-2xl font-bold text-[#0b1f4d]">
              Gerador de Kit Solar
            </h1>
          </div>
          <p className="text-xs text-[#8a94a8]">
            Dimensione e configure kits fotovoltaicos com múltiplos modelos de inversores e painéis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLimparTudo}
            className="border-[#dfe5f0] text-[#3c4a63] text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Novo Kit
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setNomeKitSalvar(sugestaoNomeKit)
              setModalSalvarAberto(true)
            }}
            className="bg-[#0b1f4d] text-white hover:bg-[#122e6f] text-xs font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1 text-[#f1c40f]" />
            Salvar Kit
          </Button>
        </div>
      </div>

      {/* Abas Superiores */}
      <Tabs value={tabAtiva} onValueChange={setTabAtiva} className="space-y-6">
        <TabsList className="bg-[#f0f4f9] p-1 border border-[#dfe5f0]">
          <TabsTrigger
            value="montador"
            className="text-xs data-[state=active]:bg-[#0b1f4d] data-[state=active]:text-white flex items-center gap-1.5"
          >
            <Layers className="h-3.5 w-3.5" />
            Montador de Kits
          </TabsTrigger>
          <TabsTrigger
            value="salvos"
            className="text-xs data-[state=active]:bg-[#0b1f4d] data-[state=active]:text-white flex items-center gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Kits Salvos ({kitsSalvos.length})
          </TabsTrigger>
          <TabsTrigger
            value="catalogo"
            className="text-xs data-[state=active]:bg-[#0b1f4d] data-[state=active]:text-white flex items-center gap-1.5"
          >
            <ListOrdered className="h-3.5 w-3.5" />
            Catálogo de Equipamentos
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: MONTADOR DE KITS */}
        <TabsContent value="montador" className="m-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Coluna da Esquerda: Formulários e Cartões de Configuração */}
            <div className="lg:col-span-8 space-y-5">
              {/* Cartão 1: Perfil de Consumo */}
              <CardNumero numero={1} titulo="Consumo & Irradiação Solar">
                <CartaoPerfil
                  form={form}
                  set={setParcialForm}
                  onAplicarQtdSugerida={aplicarQtdSugeridaConsumo}
                />
              </CardNumero>

              {/* Cartão 2: Painéis Fotovoltaicos (Múltiplas Linhas de Modelos) */}
              <CardNumero
                numero={2}
                titulo="Módulos Fotovoltaicos (Painéis) — Vários Modelos"
                subtitulo="Adicione um ou mais modelos de painéis. O sistema soma a potência de todos no dimensionamento."
              >
                <BlocoPaineisMultiplos
                  linhas={form.painelLinhas}
                  paineis={paineis}
                  onChangeLinhas={(novas) => setParcialForm({ painelLinhas: novas })}
                  outrosDados={form.outrosDadosPaineis}
                  onChangeOutrosDados={(texto) => setParcialForm({ outrosDadosPaineis: texto })}
                  onGravarCatalogo={handleGravarPainelCatalogo}
                  gravando={gravandoCatalogo}
                />

                {/* Informação rápida de quantidade */}
                <div className="pt-2 border-t border-[#dfe5f0]">
                  <BlocoQuantidadePainel
                    qtdTotal={
                      calc.kwp > 0 ? form.painelLinhas.reduce((a, b) => a + (b.qtd || 0), 0) : 0
                    }
                    kwp={calc.kwp}
                  />
                </div>
              </CardNumero>

              {/* Cartão 3: Inversores (Múltiplas Linhas de Modelos) */}
              <CardNumero
                numero={3}
                titulo="Inversores — Vários Modelos"
                subtitulo="Adicione um ou mais modelos de inversores (ex: microinversores ou múltiplos inversores centrais)."
              >
                <BlocoInversoresMultiplos
                  linhas={form.inversorLinhas}
                  inversores={inversores}
                  onChangeLinhas={(novas) => setParcialForm({ inversorLinhas: novas })}
                  outrosDados={form.outrosDadosInversores}
                  onChangeOutrosDados={(texto) => setParcialForm({ outrosDadosInversores: texto })}
                  onGravarCatalogo={handleGravarInversorCatalogo}
                  gravando={gravandoCatalogo}
                />

                {/* Informação rápida de potência e FDR */}
                <div className="pt-2 border-t border-[#dfe5f0]">
                  <BlocoQuantidadeInversor
                    qtdTotal={form.inversorLinhas.reduce((a, b) => a + (b.qtd || 0), 0)}
                    kwCa={calc.kwCa}
                    relacao={calc.relacao}
                    relacaoTipo={calc.relacaoTipo}
                  />
                </div>
              </CardNumero>

              {/* Cartão 4: Estrutura e Fornecedor */}
              <CardNumero numero={4} titulo="Estrutura de Fixação & Fornecedor">
                <CartaoEstrutura form={form} set={setParcialForm} distribuidoras={distribuidoras} />
              </CardNumero>

              {/* Cartão 5: Custo, Margem e Preço */}
              <CardNumero numero={5} titulo="Custo do Kit, Itens Adicionais e Margem">
                <CartaoPreco
                  form={form}
                  set={setParcialForm}
                  setItem={handleSetItem}
                  addItem={handleAddItem}
                  removeItem={handleRemoveItem}
                />
              </CardNumero>
            </div>

            {/* Coluna da Direita: Resumo do Kit Fixo */}
            <div className="lg:col-span-4 sticky top-6">
              <ResumoKit
                dados={dadosResumo}
                onSalvar={() => {
                  setNomeKitSalvar(sugestaoNomeKit)
                  setModalSalvarAberto(true)
                }}
                onCopiar={handleCopiarResumo}
                onLimpar={handleLimparTudo}
                salvando={salvandoKit}
              />
            </div>
          </div>
        </TabsContent>

        {/* ABA 2: KITS SALVOS */}
        <TabsContent value="salvos" className="m-0">
          <AbaKitsSalvos
            kits={kitsSalvos}
            onEditar={handleAbrirKit}
            onExcluir={handleExcluirKit}
            carregando={carregandoCatalogo}
          />
        </TabsContent>

        {/* ABA 3: CATÁLOGO GERAL */}
        <TabsContent value="catalogo" className="m-0">
          <AbaCatalogo
            paineis={paineis}
            inversores={inversores}
            distribuidoras={distribuidoras}
            onAddPainel={async (p) => {
              const n = await KitGeradorService.gravarPainel(p)
              setPaineis((prev) => [n, ...prev])
              toast({ title: 'Painel cadastrado!' })
            }}
            onAddInversor={async (i) => {
              const n = await KitGeradorService.gravarInversor(i)
              setInversores((prev) => [n, ...prev])
              toast({ title: 'Inversor cadastrado!' })
            }}
            onAddDistribuidora={async (nome) => {
              const n = await KitGeradorService.gravarDistribuidora(nome)
              setDistribuidoras((prev) => [n, ...prev])
              toast({ title: 'Distribuidora cadastrada!' })
            }}
            onExcluirPainel={async (id) => {
              await KitGeradorService.excluirPainel(id)
              setPaineis((prev) => prev.filter((p) => p.id !== id))
              toast({ title: 'Painel removido!' })
            }}
            onExcluirInversor={async (id) => {
              await KitGeradorService.excluirInversor(id)
              setInversores((prev) => prev.filter((i) => i.id !== id))
              toast({ title: 'Inversor removido!' })
            }}
            onExcluirDistribuidora={async (id) => {
              await KitGeradorService.excluirDistribuidora(id)
              setDistribuidoras((prev) => prev.filter((d) => d.id !== id))
              toast({ title: 'Distribuidora removida!' })
            }}
            carregando={carregandoCatalogo}
          />
        </TabsContent>
      </Tabs>

      {/* Modal de Salvar Kit */}
      <ModalSalvarKit
        aberto={modalSalvarAberto}
        onOpenChange={setModalSalvarAberto}
        nomeKit={nomeKitSalvar}
        setNomeKit={setNomeKitSalvar}
        form={form}
        calc={calc}
        onConfirmar={handleSalvarKit}
        salvando={salvandoKit}
      />
    </div>
  )
}
export { KitGeradorPage }
