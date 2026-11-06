/**
 * Página 2 — APRESENTAÇÃO + carta + resumo em 30 segundos + fluxo do sol
 * (espelha pagina2 de proposalPdf.ts).
 */
import type { DadosV2 } from '@/lib/proposalDadosV2'
import { CabecalhoInterno, RodapeInterno } from './v2Bits'

export function PaginaApresentacao({ d }: { d: DadosV2 }) {
  return (
    <section className="pv-page">
      <CabecalhoInterno d={d} />
      <div className="pv-page-inner pv-pad">
        <div style={{ marginTop: '6mm' }}>
          <span className="pv-sec-tag">Apresentação</span>
          <h2 className="pv-sec-title" style={{ marginTop: '3mm' }}>
            Olá, {d.primeiroNome}.
            <br />
            <span
              style={{
                color: '#ffd23f',
                background: '#0b1f4d',
                padding: '0 2mm',
                borderRadius: '1.5mm',
              }}
            >
              Esta proposta foi feita para você.
            </span>
          </h2>
        </div>

        <div className="pv-card" style={{ marginTop: '5mm', fontSize: '9pt', lineHeight: 1.65 }}>
          <p>
            Obrigado pela confiança em conversar com a Ecosolar Energy. Analisamos o seu consumo
            médio de <strong>{d.consumoKwh || '—'} kWh por mês</strong> — hoje cerca de{' '}
            <strong>{d.contaHojeRS}</strong> na conta de luz — e dimensionamos um sistema de energia
            solar de <strong>{d.kwpFmt} kWp</strong> para que a maior parte dessa energia seja
            produzida no seu próprio telhado, com equipamentos de marcas reconhecidas e instalação
            feita pela nossa equipe.
          </p>
          <p style={{ marginTop: '2.5mm' }}>
            Nas próximas páginas explicamos, sem termos complicados, como o sistema funciona, por
            que escolhemos esse tamanho, o que está incluso, quanto você vai economizar e o passo a
            passo da obra. Se surgir qualquer dúvida, é só chamar no WhatsApp — explicamos quantas
            vezes for preciso.
          </p>
        </div>

        <div style={{ marginTop: '5mm' }}>
          <div
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 800,
              fontSize: '9pt',
              color: '#1d4290',
              letterSpacing: '1.2px',
            }}
          >
            RESUMO EM 30 SEGUNDOS
          </div>
          <div className="pv-grid4" style={{ marginTop: '3mm' }}>
            <div className="pv-resumo">
              <div className="k">Conta hoje</div>
              <div className="v">{d.contaHojeRS}</div>
              <div className="n">{d.consumoKwh || '—'} kWh/mês</div>
            </div>
            <div className="pv-resumo">
              <div className="k">Geração do sistema</div>
              <div className="v">~{Math.round(d.calc.geracaoMensalKwh)} kWh</div>
              <div className="n">cobre {d.calc.coberturaPct}% do consumo</div>
            </div>
            <div className="pv-resumo hl">
              <div className="k">Economia</div>
              <div className="v">{d.economiaMensalRS}/mês</div>
              <div className="n">dinheiro que deixa de ir para a conta de luz</div>
            </div>
            <div className="pv-resumo">
              <div className="k">Retorno</div>
              <div className="v">{d.paybackCurtoTxt.replace('≈ ', '')}</div>
              <div className="n">depois disso, é lucro</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '6mm' }}>
          <div
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 800,
              fontSize: '9pt',
              color: '#1d4290',
              letterSpacing: '1.2px',
            }}
          >
            DO SOL ATÉ A SUA CONTA DE LUZ
          </div>
          <div className="pv-fluxo" style={{ marginTop: '3mm' }}>
            <div className="pv-fluxo-item">
              <div className="ico">☀️</div>
              <div className="t">Sol</div>
              <div className="d">Luz gratuita, todos os dias</div>
            </div>
            <div className="pv-fluxo-arrow">→</div>
            <div className="pv-fluxo-item">
              <div className="ico">🔆</div>
              <div className="t">Painéis</div>
              <div className="d">Transformam a luz em energia</div>
            </div>
            <div className="pv-fluxo-arrow">→</div>
            <div className="pv-fluxo-item">
              <div className="ico">⚡</div>
              <div className="t">Inversor</div>
              <div className="d">Deixa a energia pronta para uso</div>
            </div>
            <div className="pv-fluxo-arrow">→</div>
            <div className="pv-fluxo-item">
              <div className="ico">🏠</div>
              <div className="t">Sua casa</div>
              <div className="d">Usa na hora o que precisa</div>
            </div>
            <div className="pv-fluxo-arrow">→</div>
            <div className="pv-fluxo-item">
              <div className="ico">🔌</div>
              <div className="t">Rede</div>
              <div className="d">Guarda a sobra como crédito</div>
            </div>
          </div>
          <div
            style={{
              textAlign: 'center',
              fontSize: '7.4pt',
              color: '#11845b',
              fontWeight: 800,
              marginTop: '1.5mm',
            }}
          >
            ⇠ seta verde: a rede devolve a sobra como crédito em kWh ⇠
          </div>
        </div>

        <div className="pv-grid2" style={{ marginTop: '5mm' }}>
          <div className="pv-periodo dia">
            <strong>☀ De dia:</strong> Os painéis produzem energia e a casa usa primeiro o que está
            sendo gerado. O que sobra vai para a rede da {d.concessionaria} e vira crédito em kWh na
            sua conta.
          </div>
          <div className="pv-periodo noite">
            <strong>🌙 À noite e em dias nublados:</strong> A casa puxa energia da rede normalmente
            e os créditos acumulados abatem esse consumo. Os créditos valem por até 60 meses. Você
            nunca fica sem luz.
          </div>
        </div>
      </div>
      <RodapeInterno pagina={2} />
    </section>
  )
}
