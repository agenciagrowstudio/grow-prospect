import React, { useEffect, useRef, useState } from 'react';
import { Circle, Send, Reply, Ban, PhoneOff, SkipForward, Check, ChevronDown, ChevronLeft } from 'lucide-react';
import { STATUS_LEAD, nomeDoStatus } from '../statusLead';
import { CANAIS, nomeDoCanal } from '../funil';
import IconeCanal from './IconeCanal';

/**
 * Botão de estado do lead com menu das opções. Na linha da tabela mostra o
 * estado atual (e o canal, quando houve contato); na barra de seleção
 * (`rotulo`) aplica em vários de uma vez. "Mensagem enviada" e "Respondeu"
 * perguntam por onde foi o contato. O menu é fixo na tela para não ser cortado
 * pela rolagem da tabela.
 */
export const ICONE_STATUS = {
  novo: Circle, enviada: Send, respondeu: Reply, sem_interesse: Ban, sem_whatsapp: PhoneOff, pulada: SkipForward,
};
const PEDE_CANAL = new Set(['enviada', 'respondeu']);

export default function MenuStatusLead({ status = 'novo', canal = '', onEscolhe, rotulo = '' }) {
  const [aberto, setAberto] = useState(null);
  const [escolhido, setEscolhido] = useState('');
  const botao = useRef(null);
  const menu = useRef(null);

  const fechaMenu = () => { setAberto(null); setEscolhido(''); };

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => {
      if (menu.current?.contains(e.target) || botao.current?.contains(e.target)) return;
      fechaMenu();
    };
    const esc = (e) => { if (e.key === 'Escape') fechaMenu(); };
    // Fecha só se a tela rolou de verdade (o botão saiu do lugar): o foco num
    // item do menu também dispara "scroll" e fechava o menu no meio da escolha.
    const topoInicial = botao.current?.getBoundingClientRect().top;
    const rolou = () => {
      const agora = botao.current?.getBoundingClientRect().top;
      if (agora == null || Math.abs(agora - topoInicial) > 2) fechaMenu();
    };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', rolou, true);
    window.addEventListener('resize', fechaMenu);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', rolou, true);
      window.removeEventListener('resize', fechaMenu);
    };
  }, [aberto]);

  const abre = () => {
    if (aberto) { fechaMenu(); return; }
    const r = botao.current.getBoundingClientRect();
    const largura = 280;
    const alto = 330;
    const left = Math.max(12, Math.min(r.right - largura, window.innerWidth - largura - 12));
    const top = r.bottom + alto + 8 > window.innerHeight ? Math.max(12, r.top - alto - 6) : r.bottom + 6;
    setAberto({ left, top });
  };

  const escolhe = (id) => {
    if (PEDE_CANAL.has(id)) { setEscolhido(id); return; }
    fechaMenu();
    onEscolhe(id, '');
  };

  const Icone = ICONE_STATUS[status] || Circle;
  const mostraCanal = !rotulo && PEDE_CANAL.has(status) && canal;
  return (
    <>
      <button
        ref={botao}
        type="button"
        className={rotulo ? 'btn btn-sm' : `msl-gatilho msl-${status}`}
        onClick={abre}
        aria-haspopup="menu"
        aria-expanded={Boolean(aberto)}
        title={rotulo ? 'Mudar o estado dos selecionados' : `${nomeDoStatus(status)}${mostraCanal ? ` por ${nomeDoCanal(canal)}` : ''}. Clique para mudar`}
      >
        {rotulo ? <><Check size={14} strokeWidth={2} aria-hidden="true" /> {rotulo}</> : (
          <>
            <span className="msl-ic"><Icone size={12} strokeWidth={2.25} aria-hidden="true" /></span>
            {status !== 'novo' && <span className="msl-nome">{nomeDoStatus(status)}</span>}
            {mostraCanal && <span className="msl-canal"><IconeCanal canal={canal} size={12} /></span>}
            <ChevronDown size={12} strokeWidth={2} className="msl-seta" aria-hidden="true" />
          </>
        )}
      </button>
      {aberto && (
        <div ref={menu} className="msl-menu" role="menu" style={{ left: aberto.left, top: aberto.top }}>
          {escolhido ? (
            <>
              <button type="button" className="msl-voltar" onClick={() => setEscolhido('')}>
                <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" /> {nomeDoStatus(escolhido)}: por onde foi?
              </button>
              {CANAIS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="menuitem"
                  className={`msl-item${!rotulo && c.id === canal ? ' on' : ''}`}
                  onClick={() => { const s = escolhido; fechaMenu(); onEscolhe(s, c.id); }}
                >
                  <span className="msl-ic msl-ic-canal"><IconeCanal canal={c.id} size={13} /></span>
                  <span className="msl-item-txt"><b>{c.nome}</b></span>
                  {!rotulo && c.id === canal && <Check size={14} strokeWidth={2.25} className="msl-check" aria-hidden="true" />}
                </button>
              ))}
            </>
          ) : STATUS_LEAD.map((s) => {
            const I = ICONE_STATUS[s.id];
            const atual = !rotulo && s.id === status;
            return (
              <button
                key={s.id}
                type="button"
                role="menuitemradio"
                aria-checked={atual}
                className={`msl-item msl-${s.id}${atual ? ' on' : ''}`}
                onClick={() => escolhe(s.id)}
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
