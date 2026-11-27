import { QRCodeSVG } from 'qrcode.react'
import { CONTATO_ECOSOLAR } from '@/constants/empresa'
import { CabecalhoInterno, RodapeInterno } from './v2Bits'
import type { DadosV2 } from '@/lib/proposalDadosV2'

interface PaginaFinalProps {
  d: DadosV2
  linkPublico?: string
  children?: React.ReactNode
}

/** Página 6 — FECHAMENTO (2 depoimentos navy, FAQ 2 colunas, QR de aceite REAL, validade). */
export function PaginaFinal({ d, linkPublico, children }: PaginaFinalProps) {
  const urlAceite = linkPublico || d.aceiteUrl || ''
  const depoimentos = [...d.depoimento]

  return (
    <div className="pv-page">
      <CabecalhoInterno d={d} pagina={6} />
      <div
        className="pv-pad"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3.5mm' }}
      >
        <div>
          <span className="pv-sec-tag">Fechamento</span>
          <div className="pv-sec-title" style={{ marginTop: '2mm' }}>
            Pronto para começar a economizar?
          </div>
        </div>

        {/* 2 depoimentos em cards navy */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: depoimentos.length > 1 ? '1fr 1fr' : '1fr',
            gap: '3mm',
          }}
        >
          {depoimentos.slice(0, 2).map((dep) => (
            <div className="pv-depo navy" key={dep.nome}>
              <div className="aspas" aria-hidden="true">
                ”
              </div>
              <div>
                <div className="txt">{dep.txt}</div>
                <div className="autor">{dep.nome}</div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ em 2 colunas */}
        <div className="pv-faq" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {d.faq.map((f) => (
            <div key={f.q}>
              <div className="q">{f.q}</div>
              <div className="a">{f.a}</div>
            </div>
          ))}
        </div>

        {/* aceite com QR REAL escaneável */}
        <div className="pv-aceite">
          <strong style={{ fontSize: '9pt', color: '#0B1E4A' }}>
            Aceite desta proposta — válido até {d.dataValidade.toLocaleDateString('pt-BR')} (
            {d.validadeDias} dias)
          </strong>
          <div className="mono">{urlAceite || 'Link de aceite disponível com o seu consultor'}</div>
          <div className="qrbox">
            {urlAceite ? (
              <QRCodeSVG
                value={urlAceite}
                size={128}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#0B1E4A"
                role="img"
                aria-label="QR Code do link de aceite da proposta"
              />
            ) : (
              <div
                style={{
                  width: '26mm',
                  height: '26mm',
                  display: 'grid',
                  placeItems: 'center',
                  background: '#F3F5FA',
                  borderRadius: '2mm',
                  fontSize: '7pt',
                  color: '#5A6680',
                  textAlign: 'center',
                }}
              >
                QR gerado com o link público
              </div>
            )}
            <div className="qrtexto">
              Aponte a câmera do celular para o QR Code ou acesse o link acima para aceitar a
              proposta digitalmente. O aceite é registrado com data/hora e entra imediatamente na
              fila de engenharia. Dúvidas? WhatsApp{' '}
              <b style={{ color: '#0B1E4A' }}>{CONTATO_ECOSOLAR.telefoneFormatado}</b>.
            </div>
          </div>
        </div>

        {/* slot de conteúdo extra (ex.: card de aceite online no viewer web — não imprime) */}
        {children ? <div className="no-print">{children}</div> : null}

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
