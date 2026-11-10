import React, { useEffect, useRef, useState } from 'react';
import { Send, Loader, X, Play, ChevronRight, AlertTriangle } from 'lucide-react';
import { METAS, DIAS_FOLLOWUP_AUTO } from '../disparoAutomatico';
import Contagem from './Contagem';

/**
 * Disparo automático no topo: quantas saíram hoje e o painel para ligar,
 * escolher a meta e o horário de envio.
 */

export default function DisparoAutomatico({ cfg, setCfg, resumo, montando, aviso, alterna, montarAgora, whatsappConectado, onAbrirWhatsApp }) {
  const [aberto, setAberto] = useState(false);
  const [horas, setHoras] = useState({ inicio: cfg.inicio, fim: cfg.fim });
  useEffect(() => { setHoras({ inicio: cfg.inicio, fim: cfg.fim }); }, [cfg.inicio, cfg.fim]);
  const gravaHoras = () => setCfg((c) => ({ ...c, ...horas }));
  const ref = useRef(null);
  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    const esc = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  const saindo = resumo.pendentes > 0;
  const estado = !cfg.ativo ? 'desligado' : saindo ? 'enviando' : 'ligado';
  const sub = !cfg.ativo ? 'desligado' : saindo ? `enviando · ${resumo.pendentes} na fila` : `ligado · ${cfg.inicio}`;

  return (
    <div className="hz da" ref={ref}>
      <button
        type="button"
        className={`hz-gatilho da-gatilho da-${estado}`}
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        title="Disparo automático do WhatsApp"
      >
        <span className="hz-icone" aria-hidden="true">
          {montando ? <Loader size={13} strokeWidth={2.2} className="cfg-girando" /> : <Send size={13} strokeWidth={2.2} />}
        </span>
        <span className="hz-txt">
          <b><Contagem valor={resumo.enviadas} />/{cfg.meta}</b>
          <span>{sub}</span>
        </span>
      </button>

      {aberto && (
        <div className="hz-painel" role="dialog" aria-label="Disparo automático" onDoubleClick={(e) => e.stopPropagation()}>
          <header className="hz-cab">
            <span className="hz-cab-icone da-cab-icone" aria-hidden="true"><Send size={18} strokeWidth={1.9} /></span>
            <div className="hz-cab-txt">
              <b>Disparo automático</b>
              <span>Leads sem site, mornos ou quentes</span>
            </div>
            <button type="button" className="cot-icone-btn" onClick={() => setAberto(false)} aria-label="Fechar"><X size={15} strokeWidth={2} /></button>
          </header>

          <div className="da-numeros">
            <div><b><Contagem valor={resumo.enviadas} /></b><span>enviadas hoje</span></div>
            <div><b><Contagem valor={resumo.followups} /></b><span>follow-ups</span></div>
            <div><b><Contagem valor={resumo.respostas} /></b><span>responderam</span></div>
          </div>

          <div className="hz-corpo da-corpo">
            <div className="da-campo">
              <span>Meta por dia</span>
              <div className="da-metas" role="radiogroup" aria-label="Meta por dia">
                {METAS.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={cfg.meta === m} className={`da-meta${cfg.meta === m ? ' on' : ''}`} onClick={() => setCfg((c) => ({ ...c, meta: m }))}>{m}</button>
                ))}
              </div>
            </div>
            <label className={`ea-chave da-chave${cfg.ativo ? ' on' : ''}`}>
              <input type="checkbox" checked={cfg.ativo} onChange={(e) => alterna(e.target.checked)} />
              <span className="ea-chave-trilho" aria-hidden="true"><span /></span>
              {cfg.ativo ? 'Ligado' : 'Desligado'}
            </label>
          </div>

          <div className="da-horas">
            <label className="hz-hora da-hora">
              <span>Das</span>
              <input type="time" value={horas.inicio} onChange={(e) => setHoras((h) => ({ ...h, inicio: e.target.value }))} onBlur={gravaHoras} onKeyDown={(e) => { if (e.key === 'Enter') gravaHoras(); }} />
            </label>
            <label className="hz-hora da-hora">
              <span>Até</span>
              <input type="time" value={horas.fim} onChange={(e) => setHoras((h) => ({ ...h, fim: e.target.value }))} onBlur={gravaHoras} onKeyDown={(e) => { if (e.key === 'Enter') gravaHoras(); }} />
            </label>
          </div>

          <p className="hz-linha">
            {cfg.meta} mensagens no total por dia, espalhadas nesse horário. Primeiro os follow-ups de quem não respondeu
            ({DIAS_FOLLOWUP_AUTO.map((d) => `${d} dia${d === 1 ? '' : 's'}`).join(', ')} depois), o resto vira abordagem nova. Quem responde sai na hora.
          </p>
          {!whatsappConectado && (
            <p className="hz-linha da-alerta"><AlertTriangle size={13} strokeWidth={2} aria-hidden="true" /> WhatsApp do Prospector desconectado: nada sai até conectar.</p>
          )}
          {aviso && whatsappConectado && <p className="hz-linha da-alerta"><AlertTriangle size={13} strokeWidth={2} aria-hidden="true" /> {aviso}</p>}

          <footer className="hz-rodape">
            <button type="button" className="btn btn-ghost" onClick={() => { montarAgora(); }} disabled={montando || !cfg.ativo}>
              <Play size={13} strokeWidth={2} /> {montando ? 'Montando...' : 'Montar agora'}
            </button>
            <button type="button" className="hz-link da-link" onClick={() => { setAberto(false); onAbrirWhatsApp(); }}>
              Ver campanhas <ChevronRight size={14} strokeWidth={2} />
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
