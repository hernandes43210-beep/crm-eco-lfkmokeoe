/**
 * QR Code do aceite gerado LOCALMENTE (qrcode.react) — sem API externa.
 * Arquivo .tsx porque usa JSX + renderToStaticMarkup.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { QRCodeSVG } from 'qrcode.react'

/** SVG do QR do aceite como string, pronto para embutir no HTML de impressão. */
export function qrAceiteSvg(urlAceite: string, size = 128): string {
  return renderToStaticMarkup(
    <QRCodeSVG value={urlAceite} size={size} level="M" bgColor="#FFFFFF" fgColor="#0B1E4A" />,
  )
}
