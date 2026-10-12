import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, Layers, Eraser, Search, Loader, MapPin } from 'lucide-react';
import Bandeira from './Bandeira';

/**
 * Seletor das extrações da tela do mapa. Mostra nicho, lugar, data e quantos
 * leads cada uma trouxe, no lugar do select nativo que cortava o texto.
 * "Limpar mapa" esconde tudo para começar a próxima do zero.
 */
export const MAPA_LIMPO = '__limpo';

function partes(busca) {
  const p = String(busca?.label || '').split(' · ').filter(Boolean);
  return {
    nicho: busca?.nicho || p[0] || busca?.query || 'Extração',
    onde: busca?.area?.rotulo || p[1] || '',
  };
}

function quando(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const hoje = new Date();
  const dia = (x) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (dia(d) === dia(hoje)) return `hoje, ${hora}`;
  const ontem = new Date(hoje.getTime() - 86400000);
  if (dia(d) === dia(ontem)) return `ontem, ${hora}`;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function SeletorExtracao({ buscas, valor, onEscolher, leadsPorBusca, totalLeads, emAndamento }) {
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    const esc = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  const lista = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    return buscas.filter((b) => !f || `${b.label || ''} ${b.query || ''}`.toLowerCase().includes(f));
  }, [buscas, filtro]);

  const atual = buscas.find((b) => String(b.id) === valor);
  const escolhe = (id) => { onEscolher(id); setAberto(false); setFiltro(''); };

  let titulo;
  let sub;
  if (emAndamento && valor === emAndamento.id) {
    titulo = 'Extraindo agora';
    sub = emAndamento.rotulo || '';
  } else if (valor === MAPA_LIMPO) {
    titulo = 'Mapa limpo';
    sub = 'Escolha uma extração para ver os leads';
  } else if (atual) {
    const p = partes(atual);
    titulo = p.nicho;
    sub = [p.onde, `${leadsPorBusca.get(String(atual.id)) || 0} leads`].filter(Boolean).join(' · ');
  } else {
    titulo = 'Todas as extrações';
    sub = `${totalLeads} leads de ${buscas.length} extraç${buscas.length === 1 ? 'ão' : 'ões'}`;
  }

  return (
    <div className="sx" ref={ref}>
      <div className="sx-linha">
        <button type="button" className="sx-gatilho" aria-haspopup="listbox" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
          <span className="sx-icone" aria-hidden="true">
            {emAndamento && valor === emAndamento.id ? <Loader size={15} strokeWidth={2} className="cfg-girando" /> : <Layers size={15} strokeWidth={2} />}
          </span>
          <span className="sx-txt">
            <b>{titulo}</b>
            {sub && <small>{sub}</small>}
          </span>
          <ChevronDown size={15} strokeWidth={2} className="sx-seta" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="sx-limpar"
          title="Limpar o mapa e a lista"
          aria-label="Limpar o mapa e a lista"
          disabled={valor === MAPA_LIMPO}
          onClick={() => escolhe(MAPA_LIMPO)}
        >
          <Eraser size={15} strokeWidth={2} />
        </button>
      </div>

      {aberto && (
        <div className="sx-painel" role="listbox" aria-label="Extrações">
          {buscas.length > 6 && (
            <label className="sx-busca">
              <Search size={14} strokeWidth={2} aria-hidden="true" />
              <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Procurar extração" autoFocus />
            </label>
          )}
          <button type="button" role="option" aria-selected={valor === ''} className={`sx-item${valor === '' ? ' on' : ''}`} onClick={() => escolhe('')}>
            <span className="sx-item-icone sx-todas" aria-hidden="true"><Layers size={14} strokeWidth={2} /></span>
            <span className="sx-item-txt"><b>Todas as extrações</b><small>{totalLeads} leads</small></span>
            {valor === '' && <Check size={15} strokeWidth={2.4} className="sx-check" aria-hidden="true" />}
          </button>
          <div className="sx-lista">
            {lista.map((b) => {
              const id = String(b.id);
              const p = partes(b);
              const on = valor === id;
              return (
                <button key={id} type="button" role="option" aria-selected={on} className={`sx-item${on ? ' on' : ''}`} onClick={() => escolhe(id)}>
                  <span className="sx-item-icone" aria-hidden="true"><MapPin size={14} strokeWidth={2} /></span>
                  <span className="sx-item-txt">
                    <b>{p.nicho}</b>
                    <small>
                      <Bandeira pais={String(b.pais || 'BR').toUpperCase() === 'US' ? 'US' : 'BR'} />
                      {[p.onde, quando(b.timestamp)].filter(Boolean).join(' · ')}
                    </small>
                  </span>
                  <span className="sx-qtd">{leadsPorBusca.get(id) || 0}</span>
                  {on && <Check size={15} strokeWidth={2.4} className="sx-check" aria-hidden="true" />}
                </button>
              );
            })}
            {!lista.length && <span className="sx-vazio">Nenhuma extração com esse nome.</span>}
          </div>
          <button type="button" className="sx-rodape" onClick={() => escolhe(MAPA_LIMPO)} disabled={valor === MAPA_LIMPO}>
            <Eraser size={14} strokeWidth={2} aria-hidden="true" /> Limpar mapa
          </button>
        </div>
      )}
    </div>
  );
}
