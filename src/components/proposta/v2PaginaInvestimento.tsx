import { CabecalhoInterno, RodapeInterno } from './v2Bits'
import type { DadosV2 } from '@/lib/proposalDadosV2'

interface PaginaInvestimentoProps {
  d: DadosV2
}

/** Página 4 — INVESTIMENTO (hero navy com desconto + KPIs + barras + Como calculamos / Sua conta). */
export function PaginaInvestimento({ d }: PaginaInvestimentoProps) {
  return (
    <div className="pv-page">
      <CabecalhoInterno d={d} pagina={4} />
      <div
        className="pv-pad"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3.5mm' }}
      >
        <div>
          <span className="pv-sec-tag">Investimento</span>
          <div className="pv-sec-title" style={{ marginTop: '2mm' }}>
            Quanto custa e quanto volta para o seu bolso
          </div>
        </div>

        {/* hero navy: INVESTIMENTO TOTAL • CHAVE NA MÃOS */}
        <div className="pv-hero-preco">
          <div className="tag">INVESTIMENTO TOTAL • CHAVE NA MÃOS</div>
          <div className="linha-valor">
            {d.txt.precoCheioRS && <span className="riscado">{d.txt.precoCheioRS}</span>}
            <span className="valor">{d.txt.precoFinalRS}</span>
            {d.txt.descontoBadge && <span className="badge-desc">{d.txt.descontoBadge}</span>}
          </div>
          {d.txt.parcelasTxt && <div className="parcelas">{d.txt.parcelasTxt}</div>}
          <div className="incluso">
            Inclui equipamentos, projeto com ART, homologação e instalação — sem taxa extra.
          </div>
        </div>

        {/* 4 KPIs */}
        <div className="pv-minis" style={{ marginTop: '1mm' }}>
          <div className="pv-mini">
            <div className="k">Conta de hoje</div>
            <div className="v">{d.txt.contaHojeRS}</div>
          </div>
          <div className="pv-mini">
            <div className="k">Conta com solar</div>
            <div className="v">{d.txt.contaNovaRS}</div>
          </div>
          <div className="pv-mini">
            <div className="k">Economia/mês</div>
            <div className="v am">{d.txt.economiaMensalRS}</div>
          </div>
          <div className="pv-mini">
            <div className="k">Retorno</div>
            <div className="v">{d.txt.paybackCurto}</div>
          </div>
        </div>

        {/* barras de comparação poupança / CDB / solar */}
        <div className="pv-comp">
          <div className="linha">
            <div className="rotulo">
              Poupança <b>{d.txt.rendPoupanca}</b>/ano
            </div>
            <div className="pv-comp-out">
              <div className="pv-comp-in" style={{ width: '18%' }} />
            </div>
          </div>
          <div className="linha">
            <div className="rotulo">
              CDB líquido <b>{d.txt.rendCdb}</b>/ano
            </div>
            <div className="pv-comp-out">
              <div className="pv-comp-in" style={{ width: '28%' }} />
            </div>
          </div>
          <div className="linha">
            <div className="rotulo">
              Sistema solar <b>{d.txt.rendimentoSolar}</b>/ano
            </div>
            <div className="pv-comp-out">
              <div className="pv-comp-in am" style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ fontSize: '7.5pt', color: '#5A6680', marginTop: '1.5mm' }}>
            Rendimento do sistema solar = economia anual ÷ investimento. Isento de imposto e
            indexado à tarifa de energia, que só sobe.
          </div>
        </div>

        {/* Como calculamos / O que continua na sua conta */}
        <div className="pv-2col" style={{ marginTop: '1mm' }}>
          <div className="col">
            <div className="col-t">Como calculamos</div>
            <ul>
              {d.txt.comoCalculamos.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
          <div className="col destaque">
            <div className="col-t" style={{ color: '#0B1E4A' }}>
              O que continua na sua conta
            </div>
            <ul>
              {d.txt.continuaNaConta.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <div style={{ marginTop: '2.5mm', fontSize: '8pt', color: '#5A6680' }}>
              Conta estimada com solar: <b style={{ color: '#0B1E4A' }}>{d.txt.contaNovaRS}/mês</b>{' '}
              (taxa mínima + Fio B)
            </div>
          </div>
        </div>
      </div>
      <RodapeInterno d={d} pagina={4} />
    </div>
  )
}
