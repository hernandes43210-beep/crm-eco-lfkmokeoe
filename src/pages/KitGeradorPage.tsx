import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  KitGeradorService,
  parsePainelJson,
  parseInversorJson,
  parseItens,
  type PainelCatalogoRow,
  type InversorCatalogoRow,
  type DistribuidoraRow,
  type KitGerado,
  type ItemListaKit,
} from '@/services/kitGerador'
import {
  calcularKit,
  precificar,
  montarNomeKit,
  classificarRelacao,
  itensPadrao,
  fmt,
  fmtBRL,
  fmtInt,
  type Ligacao,
  type EstadoCalculo,
  type Precificacao,
} from './kitGerador/logica'
import {
  estadoInicial,
  CartaoPerfil,
  SelecaoPainel,
  SelecaoInversor,
  CartaoEstrutura,
  CartaoPreco,
  BlocoQuantidadePainel,
  BlocoQuantidadeInversor,
  CardNumero,
  type EstadoForm,
} from './kitGerador/CartoesForm'
import { ResumoKit, AbaKitsSalvos, AbaCatalogo } from './kitGerador/CartoesResumo'

const AREA_PAINEL_PADRAO = 2.79

export default function KitGeradorPage() {
  const { toast } = useToast()
  const [painelLista, setPainelLista] = useState<PainelCatalogoRow[]>([])
  const [inversorLista, setInversorLista] = useState<InversorCatalogoRow[]>([])
  const [distribuidoras, setDistribuidoras] = useState<DistribuidoraRow[]>([])
  const [kitsSalvos, setKitsSalvos] = useState<KitGerado[]>([])
  const [kitEditandoId, setKitEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<EstadoForm>(() => estadoInicial([]))
  const [gravando, setGravando] = useState(false)
  const [carregado, setCarregado] = useState(false)

  const carregarTudo = async () => {
    try {
      const [paineis, inversores, dists, kits] = await Promise.all([
        KitGeradorService.listarPaineis(),
        KitGeradorService.listarInversores(),
        KitGeradorService.listarDistribuidoras(),
        KitGeradorService.listarKits(),
      ])
      setPainelLista(paineis)
      setInversorLista(inversores)
      setDistribuidoras(dists)
      setKitsSalvos(kits)
      setForm((f) =>
        f.painel.marca === '' && paineis.length
          ? {
              ...estadoInicial(paineis),
              consumo: f.consumo,
              sol: f.sol,
              perdas: f.perdas,
            }
          : f,
      )
    } catch (err) {
      console.error('Erro ao carregar catálogo do gerador:', err)
      toast({
        title: 'Erro ao carregar catálogo',
        description: 'Verifique a conexão e recarregue a página.',
        variant: 'destructive',
      })
    }
    setCarregado(true)
  }

  useEffect(() => {
    carregarTudo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (p: Partial<EstadoForm>) => setForm((f) => ({ ...f, ...p }))

  // ---------- derivados ----------
  const parseNum = (s: string) => parseFloat(s.replace(',', '.')) || 0

  const consumo = parseNum(form.consumo)
  const sol = parseNum(form.sol) || 4.6
  const perdas = parseNum(form.perdas)
  const sobrecarga = parseNum(form.sobrecarga) || 50
  const custo = parseNum(form.custo)
  const acrescimo = parseNum(form.acrescimoPct)
  const desconto = parseNum(form.descontoValor)

  const calc = useMemo(
    () =>
      calcularKit({
        consumoKwhMes: consumo,
        solHoras: sol,
        perdasPct: perdas,
        qtdPaineis: form.qtdPaineis,
        potenciaPainelW: form.painel.potenciaW,
        areaPainelM2: form.painel.areaM2 || AREA_PAINEL_PADRAO,
      }),
    [consumo, sol, perdas, form.qtdPaineis, form.painel.potenciaW, form.painel.areaM2],
  )

  const relacao = useMemo(() => {
    const kwCa = form.inversor.potenciaKw * form.qtdInversores
    return kwCa > 0 ? calc.kwp / kwCa : 0
  }, [calc.kwp, form.inversor.potenciaKw, form.qtdInversores])

  const preco = useMemo(
    () =>
      precificar({
        custo,
        acrescimoPct: acrescimo,
        descontoValor: desconto,
        descontoTipo: form.descontoTipo,
        kwp: calc.kwp,
      }),
    [custo, acrescimo, desconto, form.descontoTipo, calc.kwp],
  )

  // Nome automático
  useEffect(() => {
    if (form.nomeTravado) return
    const nome = montarNomeKit({
      kwp: calc.kwp,
      marcaPainel: form.painel.marca,
      potenciaPainelW: form.painel.potenciaW,
      marcaInversor: form.inversor.marca,
      potenciaInversorKw: form.inversor.potenciaKw,
      qtdInversores: form.qtdInversores,
      tipoInstalacao: form.tipoInstalacao,
      distribuidora:
        form.distribuidora && form.distribuidora !== '__outra__' ? form.distribuidora : '',
    })
    setForm((f) => (f.nomeKit === nome ? f : { ...f, nomeKit: nome }))
  }, [
    calc.kwp,
    form.painel.marca,
    form.painel.potenciaW,
    form.inversor.marca,
    form.inversor.potenciaKw,
    form.qtdInversores,
    form.tipoInstalacao,
    form.distribuidora,
    form.nomeTravado,
  ])

  // String box segue a qtd de inversores, se o item for padrão
  useEffect(() => {
    setForm((f) => {
      const idx = f.itens.findIndex((i) => i.padrao && i.nome.startsWith('String box'))
      if (idx === -1 || f.itens[idx].qtd === f.qtdInversores) return f
      const itens = [...f.itens]
      itens[idx] = { ...itens[idx], qtd: f.qtdInversores }
      return { ...f, itens }
    })
  }, [form.qtdInversores])

  // Itens padrão quando a lista está vazia
  useEffect(() => {
    setForm((f) =>
      f.itens.length === 0 ? { ...f, itens: itensPadrao(f.tipoInstalacao, f.qtdInversores) } : f,
    )
  }, [form.tipoInstalacao, form.itens.length])

  // ---------- ações do catálogo ----------
  const gravarPainelCatalogo = async (): Promise<PainelCatalogoRow | null> => {
    if (!form.painel.marca.trim() || !form.painel.modelo.trim() || form.painel.potenciaW <= 0) {
      toast({ title: 'Preencha marca, modelo e potência do painel', variant: 'destructive' })
      return null
    }
    setGravando(true)
    try {
      const novo = await KitGeradorService.gravarPainel({
        marca: form.painel.marca.trim(),
        modelo: form.painel.modelo.trim(),
        potencia_w: form.painel.potenciaW,
        area_m2: form.painel.areaM2 || AREA_PAINEL_PADRAO,
      })
      setPainelLista((l) => (l.some((p) => p.id === novo.id) ? l : [...l, novo]))
      set({
        painel: {
          modoLista: true,
          id: novo.id,
          marca: novo.marca,
          modelo: novo.modelo,
          potenciaW: novo.potencia_w,
          areaM2: novo.area_m2,
        },
      })
      return novo
    } catch (err) {
      toast({
        title: 'Erro ao gravar painel',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
      return null
    } finally {
      setGravando(false)
    }
  }

  const gravarInversorCatalogo = async (): Promise<InversorCatalogoRow | null> => {
    if (
      !form.inversor.marca.trim() ||
      !form.inversor.modelo.trim() ||
      form.inversor.potenciaKw <= 0
    ) {
      toast({
        title: 'Preencha marca, modelo e potência do inversor',
        variant: 'destructive',
      })
      return null
    }
    setGravando(true)
    try {
      const novo = await KitGeradorService.gravarInversor({
        marca: form.inversor.marca.trim(),
        modelo: form.inversor.modelo.trim(),
        potencia_kw: form.inversor.potenciaKw,
        tipo: form.inversor.tipo || 'Monofásico',
      })
      setInversorLista((l) => (l.some((i) => i.id === novo.id) ? l : [...l, novo]))
      set({
        inversor: {
          modoLista: true,
          id: novo.id,
          marca: novo.marca,
          modelo: novo.modelo,
          potenciaKw: novo.potencia_kw,
          tipo: novo.tipo,
        },
      })
      return novo
    } catch (err) {
      toast({
        title: 'Erro ao gravar inversor',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
      return null
    } finally {
      setGravando(false)
    }
  }

  const guardarDistribuidora = async (): Promise<DistribuidoraRow | null> => {
    const nome = form.distribuidoraNova.trim()
    if (!nome) {
      toast({ title: 'Digite o nome da distribuidora', variant: 'destructive' })
      return null
    }
    try {
      const nova = await KitGeradorService.gravarDistribuidora(nome)
      setDistribuidoras((l) => (l.some((d) => d.id === nova.id) ? l : [...l, nova]))
      set({ distribuidora: nova.nome, distribuidoraNova: '' })
      return nova
    } catch (err) {
      toast({
        title: 'Erro ao guardar distribuidora',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
      return null
    }
  }

  // ---------- salvar kit ----------
  const distribuidoraFinal =
    form.distribuidora === '__outra__' ? form.distribuidoraNova.trim() : form.distribuidora

  const salvarKitAtual = async (idExistente?: string) => {
    if (
      !form.painel.marca ||
      !form.painel.potenciaW ||
      !form.inversor.marca ||
      !form.inversor.potenciaKw
    ) {
      toast({ title: 'Escolha o painel e o inversor antes de salvar', variant: 'destructive' })
      return
    }
    // gravar no catálogo o que estava em modo manual
    let painelSel = form.painel
    let inversorSel = form.inversor
    if (!form.painel.modoLista) {
      const p = await gravarPainelCatalogo()
      if (!p) return
      painelSel = {
        modoLista: true,
        id: p.id,
        marca: p.marca,
        modelo: p.modelo,
        potenciaW: p.potencia_w,
        areaM2: p.area_m2,
      }
    }
    if (!form.inversor.modoLista) {
      const i = await gravarInversorCatalogo()
      if (!i) return
      inversorSel = {
        modoLista: true,
        id: i.id,
        marca: i.marca,
        modelo: i.modelo,
        potenciaKw: i.potencia_kw,
        tipo: i.tipo,
      }
    }

    const payload = {
      nome: form.nomeKit.trim() || 'Kit Solar',
      potencia_kwp: calc.kwp,
      geracao_kwh: calc.geracaoMensal,
      area_m2: calc.areaM2,
      tipo_instalacao: form.tipoInstalacao,
      ligacao: form.ligacao || '',
      distribuidora: distribuidoraFinal,
      painel: {
        marca: painelSel.marca,
        modelo: painelSel.modelo,
        potencia_w: painelSel.potenciaW,
        area_m2: painelSel.areaM2,
        qtd: form.qtdPaineis,
      },
      inversor: {
        marca: inversorSel.marca,
        modelo: inversorSel.modelo,
        potencia_kw: inversorSel.potenciaKw,
        tipo: inversorSel.tipo,
        qtd: form.qtdInversores,
      },
      itens: form.itens
        .filter((i) => i.incluido && i.nome.trim())
        .map((i) => ({ nome: i.nome, qtd: i.qtd })),
      custo,
      acrescimo_pct: acrescimo,
      preco_venda: preco.precoVenda,
      desconto_tipo: form.descontoTipo,
      desconto_valor: desconto,
      desconto_rs: preco.descontoRs,
      preco_final: preco.precoFinal,
      lucro: preco.lucro,
      margem_pct: preco.margemPct,
    }
    try {
      const salvo = idExistente
        ? await KitGeradorService.atualizarKit(idExistente, payload)
        : await KitGeradorService.salvarKit(payload)
      setKitsSalvos((l) =>
        idExistente ? l.map((k) => (k.id === salvo.id ? salvo : k)) : [salvo, ...l],
      )
      setKitEditandoId(salvo.id)
      toast({ title: 'Kit salvo' })
      return salvo
    } catch (err) {
      toast({
        title: 'Erro ao salvar kit',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  // ---------- abrir kit salvo ----------
  const abrirKit = (kit: KitGerado) => {
    const painelJson = parsePainelJson(kit.painel)
    const inversorJson = parseInversorJson(kit.inversor)
    setForm({
      consumo: '',
      sol: form.sol,
      perdas: form.perdas,
      ligacao: (kit.ligacao as Ligacao) || '',
      painel: {
        modoLista: true,
        id:
          painelLista.find(
            (p) =>
              p.marca === painelJson?.marca &&
              p.modelo === painelJson?.modelo &&
              p.potencia_w === painelJson?.potencia_w,
          )?.id || '',
        marca: painelJson?.marca || '',
        modelo: painelJson?.modelo || '',
        potenciaW: painelJson?.potencia_w || 0,
        areaM2: painelJson?.area_m2 || AREA_PAINEL_PADRAO,
      },
      qtdPaineis: painelJson?.qtd || 1,
      inversor: {
        modoLista: true,
        id:
          inversorLista.find(
            (i) =>
              i.marca === inversorJson?.marca &&
              i.modelo === inversorJson?.modelo &&
              i.potencia_kw === inversorJson?.potencia_kw,
          )?.id || '',
        marca: inversorJson?.marca || '',
        modelo: inversorJson?.modelo || '',
        potenciaKw: inversorJson?.potencia_kw || 0,
        tipo: inversorJson?.tipo || 'Monofásico',
      },
      qtdInversores: inversorJson?.qtd || 1,
      sobrecarga: form.sobrecarga,
      tipoInstalacao: (kit.tipo_instalacao as EstadoForm['tipoInstalacao']) || 'Fibrocimento',
      nomeKit: kit.nome,
      nomeTravado: true,
      itens: parseItens(kit.itens).map((i) => ({
        nome: i.nome,
        qtd: i.qtd,
        incluido: true,
        padrao: false,
      })),
      distribuidora: kit.distribuidora || '',
      distribuidoraNova: '',
      custo: kit.custo != null ? String(kit.custo).replace('.', ',') : '',
      acrescimoPct: kit.acrescimo_pct != null ? String(kit.acrescimo_pct).replace('.', ',') : '41',
      descontoValor:
        kit.desconto_valor != null ? String(kit.desconto_valor).replace('.', ',') : '0',
      descontoTipo: (kit.desconto_tipo as '%' | 'R$') || '%',
    })
    setKitEditandoId(kit.id)
  }

  const corRelacao = classificarRelacao(relacao || 1, sobrecarga)

  const limparForm = () => {
    setForm(estadoInicial(painelLista))
    setKitEditandoId(null)
    toast({ title: 'Formulário limpo' })
  }

  if (!carregado) {
    return <div className="min-h-screen bg-[#eef2f8] p-8 text-[#3c4a63]">Carregando catálogo…</div>
  }

  return (
    <div className="min-h-screen bg-[#eef2f8] pb-16">
      {/* Cabeçalho azul com linha amarela */}
      <header className="border-b-4 border-[#ffd23f] bg-[#0b1f4d] pb-4 pt-6 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <p className="font-montserrat text-xl font-bold tracking-wide">
            <span className="text-white">ECO</span>
            <span className="text-[#ffd23f]">SOLAR</span>
            <span className="ml-1 text-white">ENERGY</span>
          </p>
          <p className="mt-1 text-sm uppercase tracking-[0.2em] text-[#c6d2ea]">
            Gerador de Kit Solar
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4">
        <Tabs defaultValue="montar" className="mt-4">
          <TabsList className="grid w-full grid-cols-3 rounded-[14px] bg-white p-1">
            <TabsTrigger
              value="montar"
              className="rounded-[10px] data-[state=active]:bg-[#ffd23f] data-[state=active]:text-[#0b1f4d]"
            >
              Montar kit
            </TabsTrigger>
            <TabsTrigger
              value="salvos"
              className="rounded-[10px] data-[state=active]:bg-[#ffd23f] data-[state=active]:text-[#0b1f4d]"
            >
              Kits salvos ({kitsSalvos.length})
            </TabsTrigger>
            <TabsTrigger
              value="catalogo"
              className="rounded-[10px] data-[state=active]:bg-[#ffd23f] data-[state=active]:text-[#0b1f4d]"
            >
              Catálogo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="montar" className="mt-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
              <div className="space-y-4">
                <CartaoPerfil form={form} set={set} potenciaW={form.painel.potenciaW} />

                <CardNumero numero={2} titulo="Painéis solares">
                  <SelecaoPainel
                    paineis={painelLista}
                    form={form}
                    set={set}
                    onGravar={gravarPainelCatalogo}
                    onVoltar={() =>
                      set({
                        painel: {
                          modoLista: true,
                          id: '',
                          marca: '',
                          modelo: '',
                          potenciaW: 0,
                          areaM2: AREA_PAINEL_PADRAO,
                        },
                      })
                    }
                    gravando={gravando}
                  />
                  <div className="mt-4">
                    <BlocoQuantidadePainel form={form} set={set} calc={calc} />
                  </div>
                </CardNumero>

                <CardNumero numero={3} titulo="Inversor">
                  <SelecaoInversor
                    inversores={inversorLista}
                    form={form}
                    set={set}
                    onGravar={gravarInversorCatalogo}
                    onVoltar={() =>
                      set({
                        inversor: {
                          modoLista: true,
                          id: '',
                          marca: '',
                          modelo: '',
                          potenciaKw: 0,
                          tipo: 'Monofásico',
                        },
                      })
                    }
                    gravando={gravando}
                  />
                  <div className="mt-4">
                    <BlocoQuantidadeInversor
                      form={form}
                      set={set}
                      calc={calc}
                      inversores={inversorLista}
                    />
                  </div>
                </CardNumero>

                <CartaoEstrutura
                  form={form}
                  set={set}
                  setItem={(idx, p) =>
                    setForm((f) => {
                      const itens = [...f.itens]
                      itens[idx] = { ...itens[idx], ...p }
                      return { ...f, itens }
                    })
                  }
                  addItem={() =>
                    setForm((f) => ({
                      ...f,
                      itens: [...f.itens, { nome: '', qtd: 1, incluido: true, padrao: false }],
                    }))
                  }
                  removeItem={(idx) =>
                    setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }))
                  }
                />

                <CartaoPreco
                  form={form}
                  set={set}
                  distribuidoras={distribuidoras}
                  onGuardarDistribuidora={guardarDistribuidora}
                  preco={custo > 0 ? preco.precoVenda : null}
                  descontoRs={preco.descontoRs}
                  kwp={calc.kwp}
                  custo={custo}
                />
              </div>

              {/* Resumo sticky à direita */}
              <div className="lg:sticky lg:top-4 lg:self-start">
                <ResumoKit
                  dados={{
                    nome: form.nomeKit,
                    kwp: calc.kwp,
                    linhaPainel:
                      `${form.qtdPaineis}× ${form.painel.marca} ${form.painel.modelo}`.trim(),
                    geracaoMensal: calc.geracaoMensal,
                    coberturaPct: consumo > 0 ? (calc.geracaoMensal / consumo) * 100 : null,
                    linhaInversor:
                      `${form.qtdInversores}× ${form.inversor.marca} ${form.inversor.modelo}`.trim(),
                    kwCa: form.inversor.potenciaKw * form.qtdInversores,
                    areaM2: calc.areaM2,
                    tipoInstalacao: form.tipoInstalacao,
                    relacao: relacao > 0 ? relacao : null,
                    sobrecargaPct: sobrecarga,
                    itens: form.itens.filter((i) => i.incluido && i.nome.trim()),
                    distribuidora: distribuidoraFinal,
                    custo,
                    precoVenda: custo > 0 ? preco.precoVenda : null,
                    descontoRs: preco.descontoRs,
                    precoFinal: custo > 0 ? preco.precoFinal : null,
                    lucro: preco.lucro,
                    margemPct: preco.margemPct,
                  }}
                  onSalvar={() => void salvarKitAtual(kitEditandoId || undefined)}
                  onCopiar={() => {
                    const linhas = [
                      form.nomeKit,
                      `• ${form.qtdPaineis}x Painel ${form.painel.marca} ${form.painel.modelo}`.trim(),
                      `• ${form.qtdInversores}x Inversor ${form.inversor.marca} ${form.inversor.modelo} (${fmt(form.inversor.potenciaKw)} kW)`,
                      ...form.itens
                        .filter((i) => i.incluido && i.nome.trim())
                        .map((i) => `• ${i.qtd}x ${i.nome}`),
                      `Potência: ${fmt(calc.kwp)} kWp • Geração média: ~${fmtInt(calc.geracaoMensal)} kWh/mês • Área: ~${fmtInt(calc.areaM2)} m²`,
                      `Valor: ${fmtBRL(preco.precoFinal)}`,
                    ]
                    navigator.clipboard.writeText(linhas.join('\n')).then(
                      () => toast({ title: 'Texto do kit copiado' }),
                      () =>
                        toast({
                          title: 'Não foi possível copiar o texto',
                          variant: 'destructive',
                        }),
                    )
                  }}
                  onLimpar={limparForm}
                  salvando={gravando}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="salvos" className="mt-4">
            <AbaKitsSalvos
              kits={kitsSalvos}
              carregando={gravando}
              onAbrir={(id) => {
                const kit = kitsSalvos.find((k) => k.id === id)
                if (kit) {
                  abrirKit(kit)
                  document.querySelector<HTMLButtonElement>('[value="montar"]')?.click()
                }
              }}
              onExcluir={async (id) => {
                try {
                  await KitGeradorService.desativarKit(id)
                  setKitsSalvos((l) => l.filter((k) => k.id !== id))
                  if (kitEditandoId === id) setKitEditandoId(null)
                  toast({ title: 'Kit excluído', description: 'Ele não aparece mais na lista.' })
                } catch {
                  toast({ title: 'Erro ao excluir o kit', variant: 'destructive' })
                }
              }}
            />
          </TabsContent>

          <TabsContent value="catalogo" className="mt-4">
            <AbaCatalogo
              paineis={painelLista}
              inversores={inversorLista}
              distribuidoras={distribuidoras}
              carregando={gravando}
              onAddPainel={async (p) => {
                try {
                  const novo = await KitGeradorService.gravarPainel({
                    marca: p.marca,
                    modelo: p.modelo,
                    potencia_w: p.potencia_w,
                    area_m2: p.area_m2,
                  })
                  setPainelLista((l) => (l.some((x) => x.id === novo.id) ? l : [...l, novo]))
                  return novo
                } catch (err) {
                  toast({
                    title: 'Erro ao gravar painel',
                    description: err instanceof Error ? err.message : 'Tente novamente.',
                    variant: 'destructive',
                  })
                  return null
                }
              }}
              onAddInversor={async (i) => {
                try {
                  const novo = await KitGeradorService.gravarInversor({
                    marca: i.marca,
                    modelo: i.modelo,
                    potencia_kw: i.potencia_kw,
                    tipo: i.tipo,
                  })
                  setInversorLista((l) => (l.some((x) => x.id === novo.id) ? l : [...l, novo]))
                  return novo
                } catch (err) {
                  toast({
                    title: 'Erro ao gravar inversor',
                    description: err instanceof Error ? err.message : 'Tente novamente.',
                    variant: 'destructive',
                  })
                  return null
                }
              }}
              onAddDistribuidora={async (nome) => {
                try {
                  const nova = await KitGeradorService.gravarDistribuidora(nome)
                  setDistribuidoras((l) => (l.some((x) => x.id === nova.id) ? l : [...l, nova]))
                  return nova
                } catch (err) {
                  toast({
                    title: 'Erro ao guardar distribuidora',
                    description: err instanceof Error ? err.message : 'Tente novamente.',
                    variant: 'destructive',
                  })
                  return null
                }
              }}
              onExcluirPainel={async (id) => {
                try {
                  await KitGeradorService.desativarPainel(id)
                  setPainelLista((l) => l.filter((p) => p.id !== id))
                  return true
                } catch {
                  toast({ title: 'Erro ao excluir o painel', variant: 'destructive' })
                  return false
                }
              }}
              onExcluirInversor={async (id) => {
                try {
                  await KitGeradorService.desativarInversor(id)
                  setInversorLista((l) => l.filter((i) => i.id !== id))
                  return true
                } catch {
                  toast({ title: 'Erro ao excluir o inversor', variant: 'destructive' })
                  return false
                }
              }}
              onExcluirDistribuidora={async (id) => {
                try {
                  await KitGeradorService.desativarDistribuidora(id)
                  setDistribuidoras((l) => l.filter((d) => d.id !== id))
                  return true
                } catch {
                  toast({ title: 'Erro ao excluir a distribuidora', variant: 'destructive' })
                  return false
                }
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
