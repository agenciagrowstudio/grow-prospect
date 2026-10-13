import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, Loader, Play, Square, X, Monitor, ChevronRight } from 'lucide-react';
import { proximaExecucao } from '../extracaoAutomatica';

/**
 * Horário da extração automática no topo. O clique abre um painel para mudar
 * o horário, ligar e desligar, e rodar agora; o roteiro completo fica na tela
 * "Automática".
 */

function proximaTexto(cfg) {
  if (!cfg.ativo) return 'Desligada';
  const p = proximaExecucao(cfg);
  if (p.pendente) return 'Roda hoje, em instantes';
  const hoje = new Date();
  return p.quando.toDateString() === hoje.toDateString() ? `Próxima: hoje às ${cfg.hora}` : `Próxima: amanhã às ${cfg.hora}`;
}

export default function HorarioAutomatico({
  cfg, setCfg, estado, rodar, parar, windows, mudaHora, onAbrirTela, disponivel,
}) {
  const [aberto, setAberto] = useState(false);
  const [hora, setHora] = useState(cfg.hora);
  const ref = useRef(null);

  useEffect(() => { setHora(cfg.hora); }, [cfg.hora]);
  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    const esc = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  const rodando = estado.rodando;
  const sub = rodando ? `rodando · ${estado.novos} novos` : cfg.ativo ? 'automática' : 'desligada';

  return (
    <div className="hz" ref={ref}>
      <button
        type="button"
        className={`hz-gatilho${rodando ? ' rodando' : cfg.ativo ? ' ligada' : ''}`}
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        title={rodando ? 'Extração automática rodando' : `Extração automática: ${proximaTexto(cfg)}`}
      >
        <span className="hz-icone" aria-hidden="true">
          {rodando ? <Loader size={13} strokeWidth={2.2} className="cfg-girando" /> : <CalendarClock size={13} strokeWidth={2.2} />}
        </span>
        <span className="hz-txt">
          <b>{cfg.hora}</b>
          <span>{sub}</span>
        </span>
      </button>

      {aberto && (
        <div className="hz-painel" role="dialog" aria-label="Extração automática" onDoubleClick={(e) => e.stopPropagation()}>
          <header className="hz-cab">
            <span className="hz-cab-icone" aria-hidden="true"><CalendarClock size={18} strokeWidth={1.9} /></span>
            <div className="hz-cab-txt">
              <b>Extração automática</b>
              <span>{rodando ? (estado.atual ? `${estado.atual.nicho} em ${estado.atual.cidade}, ${estado.atual.uf}` : 'Preparando...') : proximaTexto(cfg)}</span>
            </div>
            <button type="button" className="cot-icone-btn" onClick={() => setAberto(false)} aria-label="Fechar"><X size={15} strokeWidth={2} /></button>
          </header>

          <div className="hz-corpo">
            <label className="hz-hora">
              <span>Horário</span>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                // Grava ao sair do campo ou no Enter, não a cada dígito (o Windows reagenda a cada troca).
                onBlur={() => mudaHora(hora)}
                onKeyDown={(e) => { if (e.key === 'Enter') mudaHora(hora); }}
              />
            </label>
            <label className={`ea-chave${cfg.ativo ? ' on' : ''}`}>
              <input type="checkbox" checked={cfg.ativo} onChange={(e) => setCfg((c) => ({ ...c, ativo: e.target.checked }))} />
              <span className="ea-chave-trilho" aria-hidden="true"><span /></span>
              {cfg.ativo ? 'Ligada' : 'Desligada'}
            </label>
          </div>

          <p className="hz-linha">Meta de {cfg.limite} leads novos por dia, pelas cidades com mais brasileiros primeiro.</p>
          {windows.suportado && (
            <p className="hz-linha hz-windows">
              <Monitor size={13} strokeWidth={2} aria-hidden="true" />
              {windows.existe ? `O Windows abre o app sozinho às ${windows.hora || cfg.hora}.` : 'O app precisa estar aberto no horário.'}
            </p>
          )}

          <footer className="hz-rodape">
            {rodando ? (
              <button type="button" className="btn btn-ghost" onClick={parar}><Square size={13} strokeWidth={2} /> Parar</button>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={() => { rodar(); setAberto(false); }} disabled={!disponivel}>
                <Play size={13} strokeWidth={2} /> Extrair agora
              </button>
            )}
            <button type="button" className="hz-link" onClick={() => { setAberto(false); onAbrirTela(); }}>
              Roteiro e cidades <ChevronRight size={14} strokeWidth={2} />
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
