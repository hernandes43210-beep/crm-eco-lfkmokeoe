import React from 'react'
import { AlertTriangle, FileText, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: React.ReactNode
  /** Rótulo da ação alternativa oferecida quando a renderização falha (ex.: trocar o formato). */
  alternativeLabel?: string
  onAlternative?: () => void
}

interface State {
  hasError: boolean
}

/**
 * Evita a "tela branca" quando o visualizador da proposta quebra em runtime:
 * captura o erro de renderização e mostra um fallback elegante com a opção
 * de abrir a proposta no outro formato ou recarregar a página.
 */
export class PropostaViewerErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Falha ao renderizar o visualizador da proposta:', error)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-[#0A192F] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Não foi possível exibir a proposta neste formato
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            O documento continua disponível — tente abrir no outro formato de visualização.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            {this.props.onAlternative && this.props.alternativeLabel && (
              <Button
                onClick={() => {
                  this.setState({ hasError: false })
                  this.props.onAlternative?.()
                }}
                className="bg-[#0A192F] hover:bg-[#163868] text-amber-400 font-bold text-xs gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>{this.props.alternativeLabel}</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-xs font-semibold gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recarregar página</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
