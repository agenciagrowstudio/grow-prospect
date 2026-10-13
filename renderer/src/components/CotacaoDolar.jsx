import React, { useEffect, useRef, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, RefreshCw, X } from 'lucide-react';
import {
  buscaCotacao, cotacaoGuardada, calculaRecebimento, numeroDigitado, taxaGuardada, guardaTaxa, reais, dolares,
} from '../cotacao';

/**
 * Cotação do dólar no topo e calculadora de quanto se recebe em reais,
 * descontando a taxa da forma de recebimento (Wise, PayPal, banco).
 */
const ATUALIZA_MS = 5 * 60 * 1000;
const ATALHOS = [500, 1000, 2000, 5000];
const TAXAS = [
  { nome: 'Sem taxa', pct: 0 },
  { nome: 'Wise', pct: 1 },
  { nome: 'Nomad', pct: 2, dica: 'Spread a partir de 1% mais o IOF da conversão. Confira o valor exato no app da Nomad.' },
  { nome: 'Banco', pct: 4 },
  { nome: 'PayPal', pct: 5 },
];

const fmtCotacao = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CotacaoDolar() {
  const [cot, setCot] = useState(() => cotacaoGuardada());
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState('1000');
  const [taxa, setTaxa] = useState(() => taxaGuardada());
  const ref = useRef(null);

  const atualiza = async () => {
    setCarregando(true);
    try { setCot(await buscaCotacao()); setErro(''); } catch (e) { setErro(e.message); } finally { setCarregando(false); }
  };
  useEffect(() => {
    atualiza();
    const t = setInterval(atualiza, ATUALIZA_MS);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { guardaTaxa(taxa); }, [taxa]);
  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    const esc = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  const sobe = cot?.variacao > 0;
  const desce = cot?.variacao < 0;
  const conta = cot ? calculaRecebimento(numeroDigitado(valor), cot.compra, taxa) : null;
  const hora = cot ? new Date(cot.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="cot" ref={ref}>
      <button type="button" className="cot-gatilho" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} title="Cotação do dólar e calculadora">
        <span className="cot-icone" aria-hidden="true"><DollarSign size={14} strokeWidth={2.2} /></span>
        <span className="cot-txt">
          <b>{cot ? `R$ ${fmtCotacao(cot.compra)}` : erro ? 'Dólar' : '...'}</b>
          <span className={sobe ? 'sobe' : desce ? 'desce' : ''}>
            {cot && cot.variacao != null
              ? `${sobe ? '+' : ''}${cot.variacao.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% hoje`
              : cot ? 'US$ 1' : 'cotação'}
          </span>
        </span>
      </button>

      {aberto && (
        <div className="cot-painel" role="dialog" aria-label="Cotação do dólar" onDoubleClick={(e) => e.stopPropagation()}>
          <header className="cot-cab">
            <span className="cot-cab-icone" aria-hidden="true"><DollarSign size={18} strokeWidth={2} /></span>
            <div className="cot-cab-txt">
              <b>Dólar em reais</b>
              <span>{cot ? `${cot.fonte} · ${hora}${cot.antiga ? ' (última guardada)' : ''}` : erro}</span>
            </div>
            <button type="button" className="cot-icone-btn" onClick={atualiza} disabled={carregando} title="Atualizar cotação" aria-label="Atualizar cotação">
              <RefreshCw size={14} strokeWidth={2} className={carregando ? 'cfg-girando' : ''} />
            </button>
            <button type="button" className="cot-icone-btn" onClick={() => setAberto(false)} aria-label="Fechar"><X size={15} strokeWidth={2} /></button>
          </header>

          {cot && (
            <section className="cot-hero">
              <div>
                <span className="cot-rotulo">Compra</span>
                <b>R$ {fmtCotacao(cot.compra)}</b>
              </div>
              <div>
                <span className="cot-rotulo">Venda</span>
                <b>R$ {fmtCotacao(cot.venda)}</b>
              </div>
              {cot.variacao != null && (
                <span className={`cot-var ${sobe ? 'sobe' : desce ? 'desce' : ''}`}>
                  {sobe ? <TrendingUp size={13} strokeWidth={2} /> : desce ? <TrendingDown size={13} strokeWidth={2} /> : null}
                  {`${sobe ? '+' : ''}${cot.variacao.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`}
                </span>
              )}
            </section>
          )}

          <section className="cot-calc">
            <label className="cot-campo">
              <span>Vou receber (US$)</span>
              <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="Ex.: 1.500" autoFocus />
            </label>
            <div className="cot-atalhos">
              {ATALHOS.map((v) => (
                <button key={v} type="button" className={`cot-chip${numeroDigitado(valor) === v ? ' on' : ''}`} onClick={() => setValor(String(v))}>{dolares(v)}</button>
              ))}
            </div>
            <div className="cot-campo">
              <span>Taxa da forma de recebimento</span>
              <div className="cot-taxas">
                {TAXAS.map((t) => (
                  <button key={t.nome} type="button" className={`cot-chip${taxa === t.pct ? ' on' : ''}`} onClick={() => setTaxa(t.pct)} title={t.dica || `${t.nome}: taxa aproximada`}>
                    {t.nome}{t.pct ? ` ${t.pct}%` : ''}
                  </button>
                ))}
                <label className="cot-taxa-livre">
                  <input
                    value={String(taxa).replace('.', ',')}
                    onChange={(e) => setTaxa(Math.min(30, numeroDigitado(e.target.value)))}
                    inputMode="decimal"
                    aria-label="Taxa em porcentagem"
                  />
                  %
                </label>
              </div>
            </div>
          </section>

          {conta && (
            <section className="cot-resultado">
              <div className="cot-linha"><span>{dolares(numeroDigitado(valor))} × R$ {fmtCotacao(cot.compra)}</span><b>{reais(conta.bruto)}</b></div>
              {taxa > 0 && <div className="cot-linha cot-desconto"><span>Taxa de {String(taxa).replace('.', ',')}%</span><b>- {reais(conta.desconto)}</b></div>}
              <div className="cot-total"><span>Você recebe</span><b>{reais(conta.liquido)}</b></div>
              <p className="cot-dica">Conta pela cotação de compra, que é o que o banco paga pelo dólar. O valor final depende da hora da conversão.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
