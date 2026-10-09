import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ExternalLink, Check, SkipForward, PhoneOff, RefreshCw, Flame, Thermometer, Snowflake, Undo2, MessagesSquare,
} from 'lucide-react';
import { gerarAbordagem, linkWhatsApp, chaveDoDia, ANGULOS, idiomaDoLead } from '../abordagem';
import { digitosWhatsApp } from '../telefone';
import { localDoEndereco } from '../leadData';

/**
 * Fila do dia: leads qualificados com a primeira mensagem já escrita.
 *
 * Nada é enviado por aqui. O botão abre a conversa no WhatsApp (Web ou
 * aplicativo do computador) com o texto já na caixa; quem aperta enviar é o
 * usuário, no WhatsApp de verdade. Para o WhatsApp isso é uso normal, e é o
 * jeito de menor risco de banimento. O app só prepara, guarda o que já foi
 * abordado e conta a meta do dia.
 */

const CHAVE_CFG = 'sigma_abordagem_cfg';
const CHAVE_LOG = 'sigma_abordagem_log';
const LIMITES = [10, 15, 20, 25, 30];
const ICONE_TEMP = { quente: Flame, morno: Thermometer, frio: Snowflake };

function lerJson(chave, padrao) {
  try {
    return { ...padrao, ...(JSON.parse(localStorage.getItem(chave) || 'null') || {}) };
  } catch {
    return padrao;
  }
}
function gravaJson(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem espaço: a fila segue na tela */ }
}

export default function FilaAbordagem({ leads, qualificacoes, tituloBusca, onFechar }) {
  const [cfg, setCfg] = useState(() => lerJson(CHAVE_CFG, { nome: '', empresa: 'Grow+', limite: 20, oferta: 'qualquer', abrirEm: 'web' }));
  const [log, setLog] = useState(() => lerJson(CHAVE_LOG, {}));
  const [versoes, setVersoes] = useState({});
  const [editados, setEditados] = useState({});
  const [jaAbordados, setJaAbordados] = useState({});
  const [aviso, setAviso] = useState('');
  const [aba, setAba] = useState('fila');
  const hoje = chaveDoDia();

  useEffect(() => gravaJson(CHAVE_CFG, cfg), [cfg]);
  useEffect(() => gravaJson(CHAVE_LOG, log), [log]);
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onFechar]);

  // Candidatos: têm WhatsApp, ainda não foram tratados, e têm o que oferecer.
  const candidatos = useMemo(() => leads
    .map((lead) => ({ lead, q: qualificacoes.get(lead), chave: String(lead.id) }))
    .filter(({ lead, q, chave }) => {
      if (!q?.canais?.whatsapp || !digitosWhatsApp(q.canais.whatsapp, lead.pais)) return false;
      if (log[chave]) return false;
      if (cfg.oferta !== 'qualquer' && !q.servicos.some((s) => s.id === cfg.oferta)) return false;
      return true;
    })
    .sort((a, b) => b.q.nota - a.q.nota), [leads, qualificacoes, log, cfg.oferta]);

  // Quem já recebeu abordagem em campanha de WhatsApp ou e-mail sai da fila.
  useEffect(() => {
    if (!window.emailAPI?.jaAbordados || !candidatos.length) return undefined;
    let vivo = true;
    const base = candidatos.slice(0, 80);
    window.emailAPI.jaAbordados(base.map((c) => c.q.canais.whatsapp), base.map((c) => c.q.canais.email).filter(Boolean)).then((r) => {
      if (!vivo || !r?.success) return;
      const mapa = {};
      base.forEach(({ chave, q }) => {
        const hit = r.porTelefone?.[q.canais.whatsapp] || (q.canais.email && r.porEmail?.[String(q.canais.email).toLowerCase()]);
        if (hit) mapa[chave] = hit;
      });
      setJaAbordados(mapa);
    }).catch(() => {});
    return () => { vivo = false; };
  }, [candidatos]);

  const enviadasHoje = Object.values(log).filter((e) => e.status === 'enviada' && e.dia === hoje).length;
  const restante = Math.max(0, cfg.limite - enviadasHoje);
  const fila = candidatos.filter(({ chave }) => !jaAbordados[chave]).slice(0, Math.max(restante, 0) || cfg.limite);
  const enviadas = Object.entries(log)
    .filter(([, e]) => e.status === 'enviada' || e.status === 'respondeu')
    .sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0));

  const textoDe = ({ lead, q, chave }) => {
    if (editados[chave] !== undefined) return editados[chave];
    return gerarAbordagem({ ...lead, city: lead.city || localDoEndereco(lead.address).cidade }, q, cfg, versoes[chave] || 0).texto;
  };

  const marca = (item, status) => {
    setLog((atual) => ({
      ...atual,
      [item.chave]: {
        status,
        dia: hoje,
        ts: Date.now(),
        nome: item.lead.name || '',
        texto: status === 'enviada' ? textoDe(item) : '',
        angulo: item.q.servicos[0]?.id || '',
      },
    }));
  };

  const desfaz = (chave) => setLog((atual) => {
    const { [chave]: _tirado, ...resto } = atual;
    return resto;
  });

  const abre = async (item) => {
    const numero = digitosWhatsApp(item.q.canais.whatsapp, item.lead.pais);
    const url = linkWhatsApp(numero, textoDe(item), cfg.abrirEm);
    setAviso('');
    if (window.electronAPI?.openExternal) {
      const r = await window.electronAPI.openExternal(url);
      if (r && r.success === false) {
        setAviso(cfg.abrirEm === 'app'
          ? 'Não consegui abrir o aplicativo do WhatsApp. Confira se ele está instalado ou troque para WhatsApp Web.'
          : 'Não consegui abrir o navegador.');
      }
    } else {
      window.open(url, '_blank', 'noopener');
    }
  };

  const copia = async (item) => {
    try {
      await navigator.clipboard.writeText(textoDe(item));
      setAviso('Texto copiado.');
    } catch {
      setAviso('Não consegui copiar. Selecione o texto e use Ctrl+C.');
    }
  };

  const muda = (campo) => (e) => setCfg((c) => ({ ...c, [campo]: campo === 'limite' ? Number(e.target.value) : e.target.value }));

  // Vai direto no body: dentro da tela do mapa, os controles do mapa ficavam por cima.
  return createPortal(
    <div className="overlay on" onClick={onFechar} style={{ display: 'grid' }}>
      <div className="modal fa-modal" role="dialog" aria-modal="true" aria-labelledby="faTitulo" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head fa-head">
          <div>
            <div className="eyebrow">Abordagem manual</div>
            <h2 id="faTitulo">Fila do dia</h2>
            <p className="fa-sub">{tituloBusca ? `${tituloBusca} · ` : ''}Você abre, lê e aperta enviar no WhatsApp. O app só prepara.</p>
          </div>
          <button type="button" className="mm-fechar" onClick={onFechar} aria-label="Fechar"><X size={16} strokeWidth={2} /></button>
        </div>

        <div className="fa-meta">
          <div className="fa-contador" role="status">
            <b>{enviadasHoje}</b><span>de {cfg.limite} hoje</span>
            <div className="fa-barra" aria-hidden="true"><span style={{ width: `${Math.min(100, (enviadasHoje / cfg.limite) * 100)}%` }} /></div>
          </div>
          <div className="fa-config">
            <label>Meta por dia
              <select value={cfg.limite} onChange={muda('limite')}>{LIMITES.map((n) => <option key={n} value={n}>{n}</option>)}</select>
            </label>
            <label>Oferecer
              <select value={cfg.oferta} onChange={muda('oferta')}>
                <option value="qualquer">O melhor de cada lead</option>
                {ANGULOS.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </label>
            <label>Abrir em
              <select value={cfg.abrirEm} onChange={muda('abrirEm')}>
                <option value="web">WhatsApp Web (navegador)</option>
                <option value="app">Aplicativo do WhatsApp</option>
              </select>
            </label>
            <label>Seu nome
              <input value={cfg.nome} onChange={muda('nome')} placeholder="Ex.: Alex" autoComplete="off" />
            </label>
            <label>Sua empresa
              <input value={cfg.empresa} onChange={muda('empresa')} placeholder="Grow+" autoComplete="off" />
            </label>
          </div>
        </div>

        <div className="mm-abas" role="tablist">
          <button type="button" role="tab" aria-selected={aba === 'fila'} className={aba === 'fila' ? 'on' : ''} onClick={() => setAba('fila')}>
            Para enviar ({fila.length})
          </button>
          <button type="button" role="tab" aria-selected={aba === 'enviadas'} className={aba === 'enviadas' ? 'on' : ''} onClick={() => setAba('enviadas')}>
            Já abordados ({enviadas.length})
          </button>
        </div>

        {aviso && <div className="mm-resultado ok" role="status"><span>{aviso}</span></div>}

        <div className="fa-corpo">
          {aba === 'fila' && (
            <>
              {fila.length === 0 && (
                <p className="mm-vazio">
                  {restante === 0 && candidatos.length
                    ? `Meta de ${cfg.limite} cumprida hoje. Para continuar, aumente a meta ou volte amanhã.`
                    : 'Nenhum lead com WhatsApp e algo para oferecer nesta busca. Troque a busca ou o que oferecer.'}
                </p>
              )}
              {fila.map((item, i) => {
                const { lead, q, chave } = item;
                const Icone = ICONE_TEMP[q.temperatura.id];
                const g = gerarAbordagem(lead, q, cfg, versoes[chave] || 0);
                return (
                  <article key={chave} className="fa-item">
                    <header className="fa-item-topo">
                      <span className="fa-ordem">{i + 1}</span>
                      <div className="fa-quem">
                        <b>{lead.name || 'Empresa'}</b>
                        <span>{[lead.category, lead.city || localDoEndereco(lead.address).cidade].filter(Boolean).join(' · ')}</span>
                      </div>
                      <span className={`cl-temp cl-temp-${q.temperatura.id}`}><Icone size={11} strokeWidth={2} aria-hidden="true" /> {q.temperatura.rotulo} {q.nota}</span>
                    </header>
                    <div className="fa-motivo">
                      Oferecer: <b>{ANGULOS.find((a) => a.id === g.angulo)?.nome || 'Abordagem geral'}</b>
                      {q.servicos.find((s) => s.id === g.angulo)?.motivo ? ` · ${q.servicos.find((s) => s.id === g.angulo).motivo}` : ''}
                      {idiomaDoLead(lead) === 'en' ? ' · em inglês' : ''}
                    </div>
                    <textarea
                      className="fa-texto"
                      rows={4}
                      value={textoDe(item)}
                      onChange={(e) => setEditados((x) => ({ ...x, [chave]: e.target.value }))}
                      aria-label={`Mensagem para ${lead.name}`}
                    />
                    <div className="fa-acoes">
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => abre(item)}>
                        <ExternalLink size={14} strokeWidth={2} /> Abrir no WhatsApp
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => marca(item, 'enviada')}>
                        <Check size={14} strokeWidth={2} /> Enviei
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => { setEditados((x) => { const { [chave]: _x, ...r } = x; return r; }); setVersoes((v) => ({ ...v, [chave]: (v[chave] || 0) + 1 })); }}
                        title={`Versão ${g.versao + 1} de ${g.total}`}
                      >
                        <RefreshCw size={14} strokeWidth={2} /> Outra versão
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => copia(item)}>Copiar</button>
                      <span className="fa-espaco" />
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => marca(item, 'sem_whatsapp')} title="O número não tem WhatsApp">
                        <PhoneOff size={14} strokeWidth={2} /> Sem WhatsApp
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => marca(item, 'pulada')}>
                        <SkipForward size={14} strokeWidth={2} /> Pular
                      </button>
                    </div>
                  </article>
                );
              })}
            </>
          )}

          {aba === 'enviadas' && (
            <>
              {enviadas.length === 0 && <p className="mm-vazio">Ninguém abordado por aqui ainda.</p>}
              {enviadas.map(([chave, e]) => (
                <article key={chave} className="fa-item fa-item-feito">
                  <header className="fa-item-topo">
                    <div className="fa-quem">
                      <b>{e.nome || chave}</b>
                      <span>{new Date(e.ts).toLocaleDateString('pt-BR')} · {ANGULOS.find((a) => a.id === e.angulo)?.nome || 'Abordagem geral'}</span>
                    </div>
                    <span className={`mm-situacao ${e.status === 'respondeu' ? 'mm-aprovado' : 'mm-analise'}`}>{e.status === 'respondeu' ? 'Respondeu' : 'Enviada'}</span>
                  </header>
                  {e.texto && <p className="fa-feito-texto">{e.texto}</p>}
                  <div className="fa-acoes">
                    {e.status === 'enviada' ? (
                      <button type="button" className="btn btn-sm" onClick={() => setLog((a) => ({ ...a, [chave]: { ...e, status: 'respondeu' } }))}>
                        <MessagesSquare size={14} strokeWidth={2} /> Respondeu
                      </button>
                    ) : (
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setLog((a) => ({ ...a, [chave]: { ...e, status: 'enviada' } }))}>Não respondeu</button>
                    )}
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => desfaz(chave)}>
                      <Undo2 size={14} strokeWidth={2} /> Voltar para a fila
                    </button>
                  </div>
                </article>
              ))}
            </>
          )}
        </div>

        <div className="modal-foot">
          <span className="cfg-dica">Primeira mensagem sem link e sem imagem. Leia e ajuste antes de enviar. Se alguém bloquear, pare por hoje.</span>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn btn-ghost" onClick={onFechar}>Fechar</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
