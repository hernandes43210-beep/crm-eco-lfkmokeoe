import { CabecalhoInterno, RodapeInterno } from './v2Bits'
import { CORES_PROPOSTA } from '@/lib/proposalPdfCss'
import type { DadosV2 } from '@/lib/proposalDadosV2'

interface PaginaInvestimentoProps {
  d: DadosV2
}

/** Página 4 — INVESTIMENTO (valor, payback, comparação poupança × CDB × solar). */
export function PaginaInvestimento({ d }: PaginaInvestimentoProps) {
  const faixas = [
    { label: 'Poupança', pct: d.rendPoupancaPct, cor: CORES_PROPOSTA.textoSuave },
    { label: 'CDB (líquido de IR)', pct: d.rendCdbPct, cor: CORES_PROPOSTA.navy },
    { label: 'Sistema solar', pct: d.calc.rendimentoSolarPct, cor: CORES_PROPOSTA.amarelo },
  ]
  const maiorPct = Math.max(1, ...faixas.map((f) => f.pct))

  return (
    <div className="pv-page">
      <CabecalhoInterno d={d} pagina={4} />
      <div
        className="pv-pad"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5mm' }}
      >
        <div>
          <span className="pv-sec-tag">Investimento</span>
          <div className="pv-sec-title" style={{ marginTop: '2mm' }}>
            Quanto custa e quanto retorna
          </div>
        </div>

        <div className="pv-invest">
          <div style={{ flex: 1 }}>
            <div className="lbl">Investimento total</div>
            <h3>{d.txt.precoFinalRS}</h3>
            {d.calc.descontoRs > 0 && (
              <p>
                <strong style={{ color: '#0B1E4A' }}>{d.txt.descontoPct} de desconto</strong> (
                {d.txt.descontoRS}) sobre {d.txt.precoCheioRS}, condicionado à aprovação dentro do
                prazo de validade.
              </p>
            )}
            <p style={{ marginTop: '1.5mm' }}>
              {d.financiamentoTxt} · retorno do investimento em {d.txt.paybackCurto}.
            </p>
          </div>
          <div className="pv-preco">
            <span className="lbl" style={{ color: '#A9B8D8' }}>
              Economia anual
            </span>
            <span className="final">{d.txt.economiaAnualRS}</span>
            <span className="economiza">
              {d.txt.economiaMensalRS}/mês · {d.txt.economia25RS} em 25 anos
            </span>
          </div>
        </div>

        {/* comparação de rendimento */}
        <div className="pv-barras">
          {faixas.map((f) => (
            <div className="linha" key={f.label}>
              <span>{f.label}</span>
              <div className="faixa">
                <div
                  className="fill"
                  style={{ width: `${(f.pct / maiorPct) * 100}%`, background: f.cor }}
                />
              </div>
              <span className="pct solar">
                {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(f.pct)}% a.a.
              </span>
            </div>
          ))}
        </div>

        {/* condição de pagamento */}
        <div className="pv-grid2">
          <div className="pv-caixa-am">
            <h4>Formas de pagamento</h4>
            <p>
              Pix, cartão ou financiamento com carência — as condições estão discriminadas na seção
              de aceite. Valores válidos até {d.dataValidade.toLocaleDateString('pt-BR')}.
            </p>
          </div>
          <div className="pv-caixa-am">
            <h4>Por que a economia é líquida</h4>
            <p>
              Já descontamos a taxa mínima de disponibilidade da ligação ({d.txt.taxaMinimaRS}), o
              Fio B da Lei 14.300 ({d.txt.fioBRS}) e a parte do consumo não coberta pela geração.
            </p>
          </div>
        </div>

        <p className="pv-nota">
          Valores sujeitos a alteração sem aviso prévio após a data de validade (
          {d.dataValidade.toLocaleDateString('pt-BR')}).
        </p>
      </div>
      <RodapeInterno d={d} pagina={4} />
    </div>
  )
}
