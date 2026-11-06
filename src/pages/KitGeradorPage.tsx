import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  buscarCatalogo,
  criarPainel,
  criarInversor,
  criarDistribuidora,
  salvarKitGerado,
  atualizarKitGerado,
  desativarPainel,
  desativarInversor,
  desativarDistribuidora,
  type PainelCatalogoRow,
  type InversorCatalogoRow,
  type DistribuidoraRow,
  type KitGeradoRow,
} from '@/services/kitGerador'
import {
  calcularKit,
  precificar,
  montarNomeKit,
  classificarRelacao,
  MENSAGENS_RELACAO,
  fmt,
  fmtBRL,
  fmtInt,
  type Ligacao,
} from './logica'
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
  type ItemListaKit,
} from './CartoesForm'
import { ResumoKit, AbaKitsSalvos, AbaCatalogo } from './CartoesResumo'

export default function KitGeradorPage() {
  const { toast } = useToast()
  const [painelLista, setPainelLista] = useState<PainelCatalogoRow[]>([])
  const [inversorLista, setInversorLista] = useState<InversorCatalogoRow[]>([])
  const [distribuidoras, setDistribuidoras] = useState<DistribuidoraRow[]>([])
  const [kitsSalvos, setKitsSalvos] = useState<KitGeradoRow[]>([])
  const [form, setForm] = useState<EstadoForm>(() => estadoInicial([]))
  const [gravando, setGravando] = useState(false)
  const [carregado, setCarregado] = useState(false)

  const carregarTudo = async () => {
    const { paineis, inversores, distribuidoras: dists } = await buscarCatalogo()
    setPainelLista(paineis)
    setInversorLista(inversores)
    setDistribuidoras(dists)
    if (!carregado) {
      setForm((f) =>
        f.painel.marca === '' && paineis.length
          ? { ...estadoInicial(paineis), consumo: f.consumo, sol: f.sol, perdas: f.perdas }
          : f,
      )
      setCarregado(true)
    }
    try {
      const kits = await import('@/services/kitGerador').then((m) => m.listarKitsGerados())
      setKitsSalvos(kits)
    } catch {
      setKitsSalvos([])
    }
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
        areaPainelM2: form.painel.areaM2 || 2.7,
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

  // String box segue a qtd de inversores, se o usuário não mexeu
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
    setForm((f) => (f.itens.length === 0 ? { ...f, itens: itensPadraoPara(f) } : f))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tipoInstalacao, form.itens.length])

  const itensPadraoPara = (f: EstadoForm): ItemListaKit[] => {
    return itensPadrao(f.tipoInstalacao, f.qtdInversores)
  }

  // ---------- ações do catálogo ----------
  const gravarPainelCatalogo = async () => {
    if (!form.painel.marca.trim() || !form.painel.modelo.trim() || form.painel.potenciaW <= 0) {
      toast({ title: 'Preencha marca, modelo e potência do painel', variant: 'destructive' })
      return
    }
    setGravando(true)
    const existente = painelLista.find(
      (p) =>
        p.marca === form.painel.marca.trim() &&
        p.modelo === form.painel.modelo.trim() &&
        p.potencia_w === form.painel.potenciaW,
    )
    if (existente) {
      set({ painel: { modoLista: true, ...existente.mapear() } })
      setGravando(false)
      toast({ title: 'Painel já está no catálogo', description: 'Selecionado na lista.' })
      return
    }
    const novo = await criarPainel({
      marca: form.painel.marca.trim(),
      modelo: form.painel.modelo.trim(),
      potencia_w: form.painel.potenciaW,
      area_m2: form.painel.areaM2 || 2.7,
      origem: 'cadastrado',
      ativo: true,
    })
    setGravando(false)
    if (!novo) return
    setPainelLista((l) => [...l, novo])
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
    toast({ title: `Painel ${novo.marca} gravado`, description: 'Já está na lista.' })
  }

  const gravarInversorCatalogo = async () => {
    if (
      !form.inversor.marca.trim() ||
      !form.inversor.modelo.trim() ||
      form.inversor.potenciaKw <= 0
    ) {
      toast({
        title: 'Preencha marca, modelo, potência e tipo do inversor',
        variant: 'destructive',
      })
      return
    }
    setGravando(true)
    const existente = inversorLista.find(
      (i) =>
        i.marca === form.inversor.marca.trim() &&
        i.modelo === form.inversor.modelo.trim() &&
        i.potencia_kw === form.inversor.potenciaKw,
    )
    if (existente) {
      set({ inversor: { modoLista: true, ...existente.mapear() } })
      setGravando(false)
      toast({ title: 'Inversor já está no catálogo', description: 'Selecionado na lista.' })
      return
    }
    const novo = await criarInversor({
      marca: form.inversor.marca.trim(),
      modelo: form.inversor.modelo.trim(),
      potencia_kw: form.inversor.potenciaKw,
      tipo: form.inversor.tipo || 'Monofásico',
      origem: 'cadastrado',
      ativo: true,
    })
    setGravando(false)
    if (!novo) return
    setInversorLista((l) => [...l, novo])
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
    toast({ title: `Inversor ${novo.marca} gravado`, description: 'Já está na lista.' })
  }

  const guardarDistribuidora = async () => {
    const nome = form.distribuidoraNova.trim()
    if (!nome) {
      toast({ title: 'Digite o nome da distribuidora', variant: 'destructive' })
      return
    }
    const jaExiste = distribuidoras.find((d) => d.nome.toLowerCase() === nome.toLowerCase())
    if (jaExiste) {
      set({ distribuidora: jaExiste.nome, distribuidoraNova: '' })
      return
    }
    const nova = await criarDistribuidora({ nome, ativo: true })
    if (!nova) return
    setDistribuidoras((l) => [...l, nova])
    set({ distribuidora: nova.nome, distribuidoraNova: '' })
    toast({ title: `Distribuidora ${nova.nome} guardada` })
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
    let painelId = form.painel.id
    let inversorId = form.inversor.id
    if (!form.painel.modoLista) await gravarPainelCatalogo()
    if (!form.inversor.modoLista) await gravarInversorCatalogo()
    // reaproveitar ids recém-criados
    if (!painelId) {
      const p = painelLista.find(
        (p) =>
          p.marca === form.painel.marca.trim() &&
          p.modelo === form.painel.modelo.trim() &&
          p.potencia_w === form.painel.potenciaW,
      )
      painelId = p?.id || ''
    }
    if (!inversorId) {
      const i = inversorLista.find(
        (i) =>
          i.marca === form.inversor.marca.trim() &&
          i.modelo === form.inversor.modelo.trim() &&
          i.potencia_kw === form.inversor.potenciaKw,
      )
      inversorId = i?.id || ''
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
        marca: form.painel.marca,
        modelo: form.painel.modelo,
        potencia_w: form.painel.potenciaW,
        area_m2: form.painel.areaM2,
        qtd: form.qtdPaineis,
      },
      inversor: {
        marca: form.inversor.marca,
        modelo: form.inversor.modelo,
        potencia_kw: form.inversor.potenciaKw,
        tipo: form.inversor.tipo,
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
      desconto_R$: preco.descontoRs,
      preco_final: preco.precoFinal,
      lucro: preco.lucro,
      margem_pct: preco.margemPct,
    }
    const salvo = idExistente
      ? await atualizarKitGerado(idExistente, payload)
      : await salvarKitGerado(payload)
    if (!salvo) return
    setKitsSalvos((l) =>
      idExistente ? l.map((k) => (k.id === salvo.id ? salvo : k)) : [salvo, ...l],
    )
    toast({ title: 'Kit salvo' })
    return salvo
  }

  // ---------- abrir kit salvo ----------
  const abrirKit = (kit: KitGeradoRow) => {
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
              p.marca === kit.painel?.marca &&
              p.modelo === kit.painel?.modelo &&
              p.potencia_w === kit.painel?.potencia_w,
          )?.id || '',
        marca: kit.painel?.marca || '',
        modelo: kit.painel?.modelo || '',
        potenciaW: kit.painel?.potencia_w || 0,
        areaM2: kit.painel?.area_m2 || 2.7,
      },
      qtdPaineis: kit.painel?.qtd || 1,
      inversor: {
        modoLista: true,
        id:
          inversorLista.find(
            (i) =>
              i.marca === kit.inversor?.marca &&
              i.modelo === kit.inversor?.modelo &&
              i.potencia_kw === kit.inversor?.potencia_kw,
          )?.id || '',
        marca: kit.inversor?.marca || '',
        modelo: kit.inversor?.modelo || '',
        potenciaKw: kit.inversor?.potencia_kw || 0,
        tipo: kit.inversor?.tipo || 'Monofásico',
      },
      qtdInversores: kit.inversor?.qtd || 1,
      sobrecarga: form.sobrecarga,
      tipoInstalacao: (kit.tipo_instalacao as EstadoForm['tipoInstalacao']) || 'Fibrocimento',
      nomeKit: kit.nome,
      nomeTravado: true,
      itens: (kit.itens || []).map((i) => ({
        nome: i.nome,
        qtd: i.qtd,
        incluido: true,
        padrao: false,
      })),
      distribuidora: kit.distribuidora || '',
      distribuidoraNova: '',
      custo: kit.custo ? String(kit.custo).replace('.', ',') : '',
      acrescimoPct: kit.acrescimo_pct != null ? String(kit.acrescimo_pct).replace('.', ',') : '41',
      descontoValor:
        kit.desconto_valor != null ? String(kit.desconto_valor).replace('.', ',') : '0',
      descontoTipo: (kit.desconto_tipo as '%' | 'R$') || '%',
    })
    setKitEditandoId(kit.id)
  }

  const [kitEditandoId, setKitEditandoId] = useState<string | null>(null)

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
                          areaM2: 2.79,
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
                  form={form}
                  calc={calc}
                  relacao={relacao}
                  corRelacao={corRelacao}
                  preco={preco}
                  temCusto={custo > 0}
                  distribuidoraFinal={distribuidoraFinal}
                  kitEditandoId={kitEditandoId}
                  onSalvar={() => salvarKitAtual(kitEditandoId || undefined)}
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
                        toast({ title: 'Não foi possível copiar o texto', variant: 'destructive' }),
                    )
                  }}
                  onLimpar={limparForm}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="salvos" className="mt-4">
            <AbaKitsSalvos
              kits={kitsSalvos}
              onAbrir={(kit) => {
                abrirKit(kit)
                // trocar para a aba montar
                document.querySelector<HTMLButtonElement>('[value="montar"]')?.click()
              }}
              onExcluir={async (kit) => {
                const ok = await desativarKit(kit.id)
                if (ok) {
                  setKitsSalvos((l) => l.filter((k) => k.id !== kit.id))
                  toast({ title: 'Kit excluído' })
                }
              }}
            />
          </TabsContent>

          <TabsContent value="catalogo" className="mt-4">
            <AbaCatalogo
              paineis={painelLista}
              inversores={inversorLista}
              distribuidoras={distribuidoras}
              onAddPainel={async (p) => {
                const novo = await criarPainel({ ...p, origem: 'cadastrado', ativo: true })
                if (novo) setPainelLista((l) => [...l, novo])
                return novo
              }}
              onAddInversor={async (i) => {
                const novo = await criarInversor({ ...i, origem: 'cadastrado', ativo: true })
                if (novo) setInversorLista((l) => [...l, novo])
                return novo
              }}
              onAddDistribuidora={async (nome) => {
                const nova = await criarDistribuidora({ nome, ativo: true })
                if (nova) setDistribuidoras((l) => [...l, nova])
                return nova
              }}
              onExcluirPainel={async (id) => {
                const ok = await desativarPainel(id)
                if (ok) setPainelLista((l) => l.filter((p) => p.id !== id))
                return ok
              }}
              onExcluirInversor={async (id) => {
                const ok = await desativarInversor(id)
                if (ok) setInversorLista((l) => l.filter((i) => i.id !== id))
                return ok
              }}
              onExcluirDistribuidora={async (id) => {
                const ok = await desativarDistribuidora(id)
                if (ok) setDistribuidoras((l) => l.filter((d) => d.id !== id))
                return ok
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
