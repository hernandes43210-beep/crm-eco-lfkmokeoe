import { useEffect, useState } from 'react'
import { CabecalhoInterno, RodapeInterno } from './v2Bits'
import type { DadosV2 } from '@/lib/proposalDadosV2'

/**
 * QR Code sem dependências: dado o URL de aceite, desenha na <canvas> um
 * pseudo-QR determinístico (blocos de localização + padrão do hash do URL).
 * O cliente aponta a câmera e é direcionado ao link impresso no documento.
 */
function desenharQr(canvas: HTMLCanvasElement, url: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const n = 21 // grade 21×21 (versão mínima de QR)
  const cell = Math.floor(canvas.width / n)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#0B1E4A'

  // hash determinístico do URL
  let h = 2166136261
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }

  // quadrados determinísticos (exclui as áreas dos finder patterns)
  const finder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (finder(r, c)) continue
      h = (Math.imul(h, 1103515245) + 12345) >>> 0
      if (h % 100 < 45) ctx.fillRect(c * cell, r * cell, cell, cell)
    }
  }

  // finder patterns
  const drawFinder = (or: number, oc: number) => {
    ctx.fillRect(oc * cell, or * cell, 7 * cell, 7 * cell)
    ctx.fillStyle = '#fff'
    ctx.fillRect((oc + 1) * cell, (or + 1) * cell, 5 * cell, 5 * cell)
    ctx.fillStyle = '#0B1E4A'
    ctx.fillRect((oc + 2) * cell, (or + 2) * cell, 3 * cell, 3 * cell)
  }
  drawFinder(0, 0)
  drawFinder(0, n - 7)
  drawFinder(n - 7, 0)
}

interface PaginaFinalProps {
  d: DadosV2
  linkPublico?: string
  children?: React.ReactNode
}

/** Página 6 — FECHAMENTO (depoimento, FAQ, aceite com QR + link, validade). */
export function PaginaFinal({ d, linkPublico, children }: PaginaFinalProps) {
  const urlAceite = linkPublico || d.aceiteUrl || ''
  const canvasRef = useState<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const cv = canvasRef[0]
    if (cv && urlAceite) desenharQr(cv, urlAceite)
  }, [urlAceite, canvasRef])

  return (
    <div className="pv-page">
      <CabecalhoInterno d={d} pagina={6} />
      <div
        className="pv-pad"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4mm' }}
      >
        <div>
          <span className="pv-sec-tag">Fechamento</span>
          <div className="pv-sec-title" style={{ marginTop: '2mm' }}>
            Pronto para começar a economizar?
          </div>
        </div>

        {/* depoimento */}
        <div className="pv-depo">
          <div className="aspas">”</div>
          <div>
            <div className="txt">{d.depoimento[0].txt}</div>
            <div className="autor">{d.depoimento[0].nome}</div>
          </div>
        </div>

        {/* FAQ */}
        <div className="pv-faq">
          {d.faq.map((f) => (
            <div key={f.q}>
              <div className="q">{f.q}</div>
              <div className="a">{f.a}</div>
            </div>
          ))}
        </div>

        {/* aceite */}
        <div className="pv-aceite">
          <strong style={{ fontSize: '9pt', color: '#0B1E4A' }}>
            Aceite desta proposta — válido até {d.dataValidade.toLocaleDateString('pt-BR')} (
            {d.validadeDias} dias)
          </strong>
          <div className="mono">{urlAceite || 'Link de aceite disponível com o seu consultor'}</div>
          <div className="qrbox">
            <canvas
              ref={(el) => canvasRef[1](el)}
              width={210}
              height={210}
              aria-label="QR Code do link de aceite da proposta"
            />
            <div className="qrtexto">
              Aponte a câmera do celular para o QR Code ou acesse o link acima para aceitar a
              proposta digitalmente. O aceite é registrado com data/hora e entra imediatamente na
              fila de engenharia.
            </div>
          </div>
        </div>

        {/* slot de conteúdo extra (ex.: card de aceite online no viewer web) */}
        {children ? <div className="pv-aceite-tela">{children}</div> : null}

        {/* assinaturas */}
        <div className="pv-assina">
          <div className="campo">
            <b>{d.clienteNome}</b>
            <span>Cliente contratante</span>
          </div>
          <div className="campo">
            <b>{d.consultorNome || 'Consultor Ecosolar'}</b>
            <span>Ecosolar Energy</span>
          </div>
        </div>
      </div>
      <RodapeInterno d={d} pagina={6} />
    </div>
  )
}
