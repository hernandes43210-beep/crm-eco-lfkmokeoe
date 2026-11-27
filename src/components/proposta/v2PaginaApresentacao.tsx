import { CabecalhoInterno, RodapeInterno } from './v2Bits'
import type { DadosV2 } from '@/lib/proposalDadosV2'

interface PaginaApresentacaoProps {
  d: DadosV2
}

/** Página 2 — APRESENTAÇÃO (resumo em 30 segundos + trilha Sol→Casa→Rede + De dia/À noite). */
export function PaginaApresentacao({ d }: PaginaApresentacaoProps) {
  const primeiroNome = (d.clienteNome || 'Cliente').trim().split(/\s+/)[0]

  return (
    <div className="pv-page">
      <CabecalhoInterno d={d} pagina={2} />
      <div
        className="pv-pad"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4mm' }}
      >
        <div>
          <span className="pv-sec-tag">Apresentação</span>
          <div className="pv-sec-title" style={{ marginTop: '2mm' }}>
            Olá, {primeiroNome}! Aqui está o resumo em 30 segundos
          </div>
        </div>

        <p className="pv-corpo">
          Analisamos o seu consumo de <b>{d.consumoKwh || '—'} kWh/mês</b> em{' '}
          <b>{d.cidadeUf || 'sua região'}</b> e dimensionamos um sistema que gera{' '}
          <b>~{d.txt.geracaoTxt}</b> por mês. Na prática: a conta de luz de hoje (
          <b>{d.txt.contaHojeRS}</b>) passa a custar em torno de <b>{d.txt.contaNovaRS}</b> — só a
          taxa mínima e o Fio B. Você fica sabendo do investimento na página 4, com tudo incluso e
          sem surpresa.
        </p>

        {/* resumo em 4 KPIs */}
        <div className="pv-minis" style={{ marginTop: '1mm' }}>
          <div className="pv-mini">
            <div className="k">Potência instalada</div>
            <div className="v">{d.txt.potenciaTxt}</div>
          </div>
          <div className="pv-mini">
            <div className="k">Geração mensal</div>
            <div className="v">~{d.txt.geracaoTxt}</div>
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

        {/* trilha Sol → Painéis → Inversor → Casa → Rede */}
        <div className="pv-trilha" style={{ marginTop: '2mm' }}>
          {d.trilha.map((t) => (
            <div className="etapa" key={t.k}>
              <div className="etapa-ic" aria-hidden="true">
                {t.k === 'sol'
                  ? '☀'
                  : t.k === 'painel'
                    ? '▤'
                    : t.k === 'inversor'
                      ? '⌁'
                      : t.k === 'casa'
                        ? '⌂'
                        : '⚡'}
              </div>
              <div className="etapa-t">{t.t}</div>
              <div className="etapa-x">{t.x}</div>
            </div>
          ))}
        </div>

        {/* De dia / À noite */}
        <div className="pv-dia-noite" style={{ marginTop: '2mm' }}>
          <div className="col">
            <div className="col-t" style={{ color: '#B45309' }}>
              ☀ De dia
            </div>
            <div className="col-x">
              Os painéis produzem energia e a sua casa consome direto da sua própria usina. O que
              sobra vira crédito automaticamente.
            </div>
          </div>
          <div className="col">
            <div className="col-t" style={{ color: '#1D4ED8' }}>
              ☾ À noite
            </div>
            <div className="col-x">
              Os créditos de energia gerada durante o dia abastecem o consumo noturno. É assim que a
              conta continua baixa fora do sol.
            </div>
          </div>
        </div>
      </div>
      <RodapeInterno d={d} pagina={2} />
    </div>
  )
}
