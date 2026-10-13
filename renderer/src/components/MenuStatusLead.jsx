import React, { useEffect, useRef, useState } from 'react';
import { Circle, Send, Reply, Ban, PhoneOff, SkipForward, Check, ChevronDown } from 'lucide-react';
import { STATUS_LEAD, nomeDoStatus } from '../statusLead';

/**
 * Botão de estado do lead com menu das opções. Na linha da tabela mostra o
 * estado atual; na barra de seleção (`rotulo`) aplica em vários de uma vez.
 * O menu é fixo na tela para não ser cortado pela rolagem da tabela.
 */
export const ICONE_STATUS = {
  novo: Circle, enviada: Send, respondeu: Reply, sem_interesse: Ban, sem_whatsapp: PhoneOff, pulada: SkipForward,
};

export default function MenuStatusLead({ status = 'novo', onEscolhe, rotulo = '' }) {
  const [aberto, setAberto] = useState(null);
  const botao = useRef(null);
  const menu = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => {
      if (menu.current?.contains(e.target) || botao.current?.contains(e.target)) return;
      setAberto(null);
    };
    const fecha = (e) => { if (e.type !== 'keydown' || e.key === 'Escape') setAberto(null); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', fecha);
    window.addEventListener('scroll', fecha, true);
    window.addEventListener('resize', fecha);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', fecha);
      window.removeEventListener('scroll', fecha, true);
      window.removeEventListener('resize', fecha);
    };
  }, [aberto]);

  const abre = () => {
    if (aberto) { setAberto(null); return; }
    const r = botao.current.getBoundingClientRect();
    const largura = 280;
    const alto = 330;
    const left = Math.max(12, Math.min(r.right - largura, window.innerWidth - largura - 12));
    const top = r.bottom + alto + 8 > window.innerHeight ? Math.max(12, r.top - alto - 6) : r.bottom + 6;
    setAberto({ left, top });
  };

  const Icone = ICONE_STATUS[status] || Circle;
  return (
    <>
      <button
        ref={botao}
        type="button"
        className={rotulo ? 'btn btn-sm' : `msl-gatilho msl-${status}`}
        onClick={abre}
        aria-haspopup="menu"
        aria-expanded={Boolean(aberto)}
        title={rotulo ? 'Mudar o estado dos selecionados' : `${nomeDoStatus(status)}. Clique para mudar`}
      >
        {rotulo ? <><Check size={14} strokeWidth={2} aria-hidden="true" /> {rotulo}</> : (
          <>
            <span className="msl-ic"><Icone size={12} strokeWidth={2.25} aria-hidden="true" /></span>
            {status !== 'novo' && <span className="msl-nome">{nomeDoStatus(status)}</span>}
            <ChevronDown size={12} strokeWidth={2} className="msl-seta" aria-hidden="true" />
          </>
        )}
      </button>
      {aberto && (
        <div ref={menu} className="msl-menu" role="menu" style={{ left: aberto.left, top: aberto.top }}>
          {STATUS_LEAD.map((s) => {
            const I = ICONE_STATUS[s.id];
            const atual = !rotulo && s.id === status;
            return (
              <button
                key={s.id}
                type="button"
                role="menuitemradio"
                aria-checked={atual}
                className={`msl-item msl-${s.id}${atual ? ' on' : ''}`}
                onClick={() => { setAberto(null); onEscolhe(s.id); }}
              >
                <span className="msl-ic"><I size={13} strokeWidth={2.25} aria-hidden="true" /></span>
                <span className="msl-item-txt"><b>{s.nome}</b><small>{s.dica}</small></span>
                {atual && <Check size={14} strokeWidth={2.25} className="msl-check" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
