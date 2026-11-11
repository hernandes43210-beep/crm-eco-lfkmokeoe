import { useState, useEffect } from 'react'
import {
  Check,
  Loader2,
  Palette,
  Percent,
  Save,
  FileText,
  Settings2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import {
  ConfiguracoesService,
  PALETA_CORES,
  aplicarCorTema,
  type ModeloProposta,
  type OpcaoCor,
} from '@/services/configuracoes'
import { useConfiguracoesApp } from '@/context/ConfiguracoesContext'
import { toPortugueseErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

export default function ConfiguracoesPage() {
  const { corPrimaria, modeloPropostaPadrao, margemPadraoKit } = useConfiguracoesApp()

  const [corSelecionada, setCorSelecionada] = useState<string>(corPrimaria)
  const [modeloProposta, setModeloProposta] = useState<ModeloProposta>(modeloPropostaPadrao)
  const [margemStr, setMargemStr] = useState<string>(String(margemPadraoKit).replace('.', ','))
  const [observacoes, setObservacoes] = useState<string>('')
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  // Carrega o registro completo (inclui observações, que o contexto não expõe)
  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const c = await ConfiguracoesService.carregar()
        if (!ativo || !c) return
        setCorSelecionada(c.cor_primaria)
        setModeloProposta(c.modelo_proposta_padrao)
        setMargemStr(String(c.margem_padrao_kit).replace('.', ','))
        setObservacoes(c.observacoes || '')
      } catch (err) {
        console.warn('Erro ao carregar configurações:', err)
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [])

  /** Pré-visualiza a cor imediatamente no tema global ao clicar num swatch. */
  const handleEscolherCor = (opcao: OpcaoCor) => {
    setCorSelecionada(opcao.valor)
    aplicarCorTema(opcao.valor)
  }

  /** Volta o pré-visualizador à cor salva (sem gravar no banco). */
  const handleCancelarCor = () => {
    setCorSelecionada(corPrimaria)
    aplicarCorTema(corPrimaria)
  }

  const parseMargem = (): number | null => {
    const num = Number(margemStr.replace(/\./g, '').replace(',', '.'))
    if (isNaN(num) || num < 0 || num >= 100) return null
    return Math.round(num * 100) / 100
  }

  const margemValida = parseMargem() !== null

  const handleSalvar = async () => {
    const margem = parseMargem()
    if (margem === null) {
      toast({
        title: 'Margem inválida',
        description: 'Informe uma margem entre 0% e 99,99% (use vírgula para decimais).',
        variant: 'destructive',
      })
      return
    }
    try {
      setSalvando(true)
      await ConfiguracoesService.salvar({
        cor_primaria: corSelecionada,
        modelo_proposta_padrao: modeloProposta,
        margem_padrao_kit: margem,
        observacoes: observacoes.trim(),
      })
      toast({
        title: 'Configurações salvas!',
        description: 'As preferências do CRM foram atualizadas para toda a equipe.',
      })
    } catch (err) {
      console.error('Erro ao salvar configurações:', err)
      toast({
        title: 'Erro ao salvar configurações',
        description: toPortugueseErrorMessage(
          err,
          'Não foi possível salvar as configurações. Verifique sua permissão (Admin/CEO).',
        ),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const opcaoCorAtual = PALETA_CORES.find((c) => c.valor === corSelecionada) || PALETA_CORES[0]

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black text-slate-900 sm:text-2xl">
              <Settings2 className="h-6 w-6 text-primary" />
              Configurações
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Personalize a aparência e os padrões do CRM para toda a equipe.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {corSelecionada !== corPrimaria && (
              <Button variant="outline" onClick={handleCancelarCor} className="gap-1.5 font-medium">
                <RefreshCw className="h-4 w-4" />
                Reverter cor
              </Button>
            )}
            <Button
              onClick={handleSalvar}
              disabled={salvando || carregando || !margemValida}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5"
            >
              {salvando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Configurações
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Cor do site */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Palette className="h-4.5 w-4.5 text-primary" />
                Cor de destaque do site
              </CardTitle>
              <CardDescription className="text-xs">
                Cor aplicada nos botões, menu e destaques do CRM para todos os usuários. A
                pré-visualização é imediata; clique em “Salvar” para fixar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
                {PALETA_CORES.map((opcao) => (
                  <button
                    key={opcao.valor}
                    type="button"
                    title={opcao.nome}
                    onClick={() => handleEscolherCor(opcao)}
                    className={cn(
                      'group relative flex h-14 flex-col items-center justify-center rounded-lg border-2 transition-all hover:scale-105',
                      corSelecionada === opcao.valor
                        ? 'border-slate-900 shadow-md'
                        : 'border-transparent shadow-sm',
                    )}
                    style={{ backgroundColor: `#${opcao.valor}` }}
                  >
                    {corSelecionada === opcao.valor && (
                      <Check className="h-5 w-5 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Selecionada: <strong>{opcaoCorAtual.nome}</strong> (#{corSelecionada})
              </p>
            </CardContent>
          </Card>

          {/* Modelo padrão de proposta */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <FileText className="h-4.5 w-4.5 text-primary" />
                Modelo padrão de proposta comercial
              </CardTitle>
              <CardDescription className="text-xs">
                Formato usado ao abrir/gerar propostas (links enviados ao cliente e leitor público).
                O vendedor ainda pode trocar o formato no modal de geração.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {(
                  [
                    {
                      valor: 'classica' as ModeloProposta,
                      titulo: 'Documento Clássico (estilo PDF)',
                      descricao:
                        'Documento rolável com capa, tabelas de itens, gráficos e bloco de aceite.',
                    },
                    {
                      valor: 'story' as ModeloProposta,
                      titulo: 'Apresentação Story (Instagram)',
                      descricao:
                        'Sequência de telas interativas com carrossel de equipamentos e CTA de assinatura.',
                    },
                  ] as const
                ).map((op) => (
                  <button
                    key={op.valor}
                    type="button"
                    onClick={() => setModeloProposta(op.valor)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-all',
                      modeloProposta === op.valor
                        ? 'border-slate-900 bg-white shadow-sm ring-2 ring-slate-900/20'
                        : 'border-slate-200 bg-white/60 hover:border-slate-300',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{op.titulo}</span>
                      {modeloProposta === op.valor && (
                        <Badge className="bg-emerald-100 text-[10px] font-bold text-emerald-800 border-emerald-300">
                          Padrão
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                      {op.descricao}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Margem padrão do kit */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Percent className="h-4.5 w-4.5 text-primary" />
                Margem padrão do kit
              </CardTitle>
              <CardDescription className="text-xs">
                Percentual pré-preenchido no campo “Margem sobre o preço de venda (%)” do Gerador de
                Kit (/gerador-kits) quando nenhum kit está carregado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <Label htmlFor="margem-padrao" className="text-xs font-semibold text-slate-700">
                  Margem sobre o preço de venda (%)
                </Label>
                <Input
                  id="margem-padrao"
                  value={margemStr}
                  onChange={(e) => setMargemStr(e.target.value)}
                  placeholder="41"
                  inputMode="decimal"
                  className={cn(
                    'mt-1.5',
                    !margemValida && 'border-red-500 focus-visible:ring-red-500',
                  )}
                />
                {!margemValida && (
                  <p className="mt-1 text-[11px] font-medium text-red-600">
                    Informe um valor entre 0 e 99,99 (a margem não pode ser ≥ 100%).
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Outras configurações / observações */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                Outras configurações / observações
              </CardTitle>
              <CardDescription className="text-xs">
                Espaço livre para anotar padrões internos (condições de venda, regras de desconto,
                etc.).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex.: Desconto máximo permitido: 8%. Validade padrão das propostas: 15 dias."
                className="min-h-[90px] text-sm"
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
