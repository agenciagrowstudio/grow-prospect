import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, MapPin, Clock, ChevronDown, Repeat, Columns3 } from 'lucide-react';
import AvatarLead from './AvatarLead';
import IconeCanal from './IconeCanal';
import { readLocalArray, localDoLead } from '../leadData';
import { ETAPAS, CANAIS, CHAVE_ETAPAS, montaFunil, moveNoFunil, nomeDoCanal } from '../funil';
import { DIAS_FOLLOWUP } from '../followup';
import { useNotifications } from './NotificationCenter';

/**
 * Kanban do funil comercial. Atualiza sozinho com a Fila do dia (enviou,
 * follow-up, respondeu, sem interesse) e funciona igual no computador e na
 * web, porque tudo sai dos dados que sincronizam pela nuvem.
 */

const CHAVE_LOG = 'sigma_abordagem_log';
const leJson = (chave) => {
  try { return JSON.parse(localStorage.getItem(chave) || '{}') || {}; } catch { return {}; }
};
const DIA_MS = 86400000;

function haQuanto(ts) {
  if (!ts) return '';
  const dias = Math.floor((Date.now() - ts) / DIA_MS);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}

function MenuMover({ atual, onMover }) {
  const [pos, setPos] = useState(null);
  const botao = useRef(null);
  const menu = useRef(null);
  useEffect(() => {
    if (!pos) return undefined;
    const fora = (e) => { if (!menu.current?.contains(e.target) && !botao.current?.contains(e.target)) setPos(null); };
    const esc = (e) => { if (e.key === 'Escape') setPos(null); };
    // Fecha só se a tela rolou de verdade (o foco num item também dispara "scroll").
    const topoInicial = botao.current?.getBoundingClientRect().top;
    const rolou = () => {
      const agora = botao.current?.getBoundingClientRect().top;
      if (agora == null || Math.abs(agora - topoInicial) > 2) setPos(null);
    };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', rolou, true);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', rolou, true);
    };
  }, [pos]);
  const abre = (e) => {
    e.stopPropagation();
    if (pos) { setPos(null); return; }
    const r = botao.current.getBoundingClientRect();
    setPos({ left: Math.max(12, Math.min(r.right - 220, window.innerWidth - 232)), top: Math.min(r.bottom + 6, window.innerHeight - 300) });
  };
  return (
    <>
      <button ref={botao} type="button" className="kb-mover" onClick={abre} aria-haspopup="menu" aria-expanded={Boolean(pos)} title="Mover para outra coluna">
        Mover <ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
      </button>
      {pos && (
        <div ref={menu} className="msl-menu kb-menu" role="menu" style={{ left: pos.left, top: pos.top, width: 220 }}>
          {ETAPAS.filter((e) => !e.soAutomatica && e.id !== atual).map((e) => (
            <button key={e.id} type="button" role="menuitem" className="msl-item" onClick={() => { setPos(null); onMover(e.id); }}>
              <span className={`kb-ponto kb-${e.id}`} aria-hidden="true" />
              <span className="msl-item-txt"><b>{e.nome}</b><small>{e.dica}</small></span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function Card({ item, buscas, onMover, onArrasta }) {
  const { lead, entrada, canal, etapa } = item;
  const loc = localDoLead(lead, buscas);
  const fus = (entrada.followups || []).length;
  return (
    <article
      className="kb-card"
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(lead.id)); e.dataTransfer.effectAllowed = 'move'; onArrasta(String(lead.id)); }}
      onDragEnd={() => onArrasta('')}
    >
      <div className="kb-card-topo">
        <AvatarLead lead={lead} size={34} />
        <div className="kb-card-txt">
          <b title={lead.name}>{lead.name || entrada.nome || 'Lead'}</b>
          {loc.cidade && <span><MapPin size={11} strokeWidth={2} aria-hidden="true" />{loc.cidade}{loc.uf ? ` · ${loc.uf}` : ''}</span>}
        </div>
      </div>
      <div className="kb-card-meta">
        {canal ? (
          <span className="kb-canal" title={`Abordado por ${nomeDoCanal(canal)}`}><IconeCanal canal={canal} size={12} />{nomeDoCanal(canal)}</span>
        ) : <span className="kb-canal kb-canal-vazio">Canal não informado</span>}
        <span className="kb-quando" title={entrada.ts ? new Date(entrada.ts).toLocaleString('pt-BR') : ''}><Clock size={11} strokeWidth={2} aria-hidden="true" />{haQuanto(entrada.ts)}</span>
      </div>
      <div className="kb-card-rodape">
        {(etapa === 'abordados' || etapa === 'followup') ? (
          <span className="kb-fu" title="Follow-ups enviados"><Repeat size={11} strokeWidth={2} aria-hidden="true" />Follow-up {fus}/{DIAS_FOLLOWUP.length}</span>
        ) : <span />}
        <MenuMover atual={etapa} onMover={(para) => onMover(String(lead.id), para)} />
      </div>
    </article>
  );
}

export default function FunilKanban() {
  const { addNotification } = useNotifications();
  const [log, setLog] = useState(() => leJson(CHAVE_LOG));
  const [etapas, setEtapas] = useState(() => leJson(CHAVE_ETAPAS));
  const [busca, setBusca] = useState('');
  const [canal, setCanal] = useState('todos');
  const [arrastando, setArrastando] = useState('');
  const [alvo, setAlvo] = useState('');
  const leads = useMemo(() => readLocalArray('sigma_leads'), []);
  const buscas = useMemo(() => new Map(readLocalArray('sigma_searches').map((b) => [String(b?.id), b])), []);

  // A Fila (ou outro computador, pela nuvem) mudou o registro: o Kanban acompanha.
  useEffect(() => {
    const relê = () => { setLog(leJson(CHAVE_LOG)); setEtapas(leJson(CHAVE_ETAPAS)); };
    window.addEventListener('sigma:leads-updated', relê);
    window.addEventListener('focus', relê);
    const t = setInterval(relê, 5000);
    return () => { window.removeEventListener('sigma:leads-updated', relê); window.removeEventListener('focus', relê); clearInterval(t); };
  }, []);

  const funil = useMemo(() => montaFunil(leads, log, etapas), [leads, log, etapas]);
  const termo = busca.trim().toLowerCase();
  const filtra = (lista) => lista.filter((i) => (canal === 'todos' || i.canal === canal)
    && (!termo || `${i.lead.name || ''} ${localDoLead(i.lead, buscas).cidade}`.toLowerCase().includes(termo)));
  const total = Object.values(funil).reduce((s, l) => s + l.length, 0);

  const mover = (id, para) => {
    const r = moveNoFunil({ log, etapas, id, para });
    if (r.log === log && r.etapas === etapas) return;
    try {
      localStorage.setItem(CHAVE_LOG, JSON.stringify(r.log));
      localStorage.setItem(CHAVE_ETAPAS, JSON.stringify(r.etapas));
    } catch { /* sem espaço: vale nesta sessão */ }
    setLog(r.log);
    setEtapas(r.etapas);
    const nome = r.log[id]?.nome || leads.find((l) => String(l.id) === id)?.name || 'Lead';
    addNotification({ type: 'success', category: 'system', title: 'Card movido', message: `${nome}: ${ETAPAS.find((e) => e.id === para)?.nome}.` });
  };

  return (
    <section className="kb-view">
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 20 }}>Kanban</h1>
          <p className="cfg-tagline">
            Atualiza sozinho: quem recebe a primeira mensagem entra em Abordados, e follow-up, resposta e sem interesse
            movem o card. Reunião, proposta e fechado você arrasta. Igual no computador e na web.
          </p>
        </div>
      </div>

      <div className="kb-filtros">
        <label className="kb-busca">
          <Search size={15} strokeWidth={2} aria-hidden="true" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar empresa ou cidade..." />
        </label>
        <div className="kb-canais" role="group" aria-label="Filtrar por canal">
          <button type="button" className={`ea-chip${canal === 'todos' ? ' on' : ''}`} onClick={() => setCanal('todos')}>Todos os canais</button>
          {CANAIS.map((c) => (
            <button key={c.id} type="button" className={`ea-chip${canal === c.id ? ' on' : ''}`} onClick={() => setCanal(c.id)}>
              <IconeCanal canal={c.id} size={12} /> {c.nome}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div className="kb-vazio">
          <Columns3 size={28} strokeWidth={1.5} aria-hidden="true" />
          <b>Ninguém abordado ainda</b>
          <span>Quando você marcar "Enviei" na Fila do dia, ou mudar o estado de um lead na Base, ele aparece aqui.</span>
        </div>
      ) : (
        <div className="kb-colunas">
          {ETAPAS.map((etapa) => {
            const itens = filtra(funil[etapa.id]);
            const aceita = !etapa.soAutomatica && arrastando;
            return (
              <div
                key={etapa.id}
                className={`kb-coluna${aceita && alvo === etapa.id ? ' alvo' : ''}${etapa.soAutomatica && arrastando ? ' bloqueada' : ''}`}
                onDragOver={(e) => { if (!etapa.soAutomatica) { e.preventDefault(); setAlvo(etapa.id); } }}
                onDragLeave={() => setAlvo((a) => (a === etapa.id ? '' : a))}
                onDrop={(e) => {
                  e.preventDefault();
                  setAlvo('');
                  const id = e.dataTransfer.getData('text/plain');
                  if (id && !etapa.soAutomatica) mover(id, etapa.id);
                }}
              >
                <header className="kb-coluna-cab">
                  <span className={`kb-ponto kb-${etapa.id}`} aria-hidden="true" />
                  <b>{etapa.nome}</b>
                  <span className="kb-conta">{itens.length}</span>
                </header>
                <p className="kb-coluna-dica">{etapa.soAutomatica ? `${etapa.dica} (automático)` : etapa.dica}</p>
                <div className="kb-cards">
                  {itens.map((item) => (
                    <Card key={item.lead.id} item={item} buscas={buscas} onMover={mover} onArrasta={setArrastando} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
