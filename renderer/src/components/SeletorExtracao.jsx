import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, Layers, Eraser, Search, Loader, MapPin, Trash2 } from 'lucide-react';
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

export default function SeletorExtracao({ buscas, valor, onEscolher, leadsPorBusca, progresso, totalLeads, emAndamento, onApagar }) {
  const [aberto, setAberto] = useState(false);
  // Extração esperando a confirmação de apagar (id).
  const [apagando, setApagando] = useState(null);
  const [filtro, setFiltro] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    const esc = (e) => { if (e.key === 'Escape') { if (apagando) setApagando(null); else setAberto(false); } };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto, apagando]);

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
              const qtd = leadsPorBusca.get(id) || 0;
              if (apagando === id) {
                return (
                  <div key={id} className="sx-item sx-confirma" role="alertdialog" aria-label="Confirmar apagar extração">
                    <span className="sx-item-icone sx-icone-perigo" aria-hidden="true"><Trash2 size={14} strokeWidth={2} /></span>
                    <span className="sx-item-txt">
                      <b>Apagar esta extração?</b>
                      <small>{qtd ? `Os ${qtd} leads dela saem da base e do mapa.` : 'Ela não tem leads; só sai da lista e do mapa.'}</small>
                    </span>
                    <button type="button" className="sx-btn" onClick={() => setApagando(null)}>Cancelar</button>
                    <button
                      type="button"
                      className="sx-btn sx-btn-perigo"
                      onClick={() => { onApagar?.(id); setApagando(null); }}
                      autoFocus
                    >
                      Apagar
                    </button>
                  </div>
                );
              }
              return (
                <div key={id} className={`sx-item-linha${on ? ' on' : ''}`}>
                <button type="button" role="option" aria-selected={on} className={`sx-item${on ? ' on' : ''}`} onClick={() => escolhe(id)}>
                  <span className="sx-item-icone" aria-hidden="true"><MapPin size={14} strokeWidth={2} /></span>
                  <span className="sx-item-txt">
                    <b>{p.nicho}</b>
                    <small>
                      <Bandeira pais={String(b.pais || 'BR').toUpperCase() === 'US' ? 'US' : 'BR'} />
                      {[p.onde, quando(b.timestamp)].filter(Boolean).join(' · ')}
                    </small>
                  </span>
                  {(() => {
                    const a = progresso?.get(id);
                    const p = a?.progresso;
                    if (a?.concluida) return <span className="sx-qtd sx-concluida" title="Todos os leads com WhatsApp já foram abordados">Concluída</span>;
                    if (p?.total) return <span className="sx-qtd" title={`${p.abordados} de ${p.total} abordados na Fila do dia`}>{p.abordados}/{p.total}</span>;
                    return <span className="sx-qtd">{leadsPorBusca.get(id) || 0}</span>;
                  })()}
                  {on && <Check size={15} strokeWidth={2.4} className="sx-check" aria-hidden="true" />}
                </button>
                {onApagar && (
                  <button
                    type="button"
                    className="sx-apagar"
                    onClick={() => setApagando(id)}
                    title="Apagar esta extração"
                    aria-label={`Apagar a extração ${p.nicho} ${p.onde}`}
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                )}
                </div>
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
