import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ExternalLink, Check, SkipForward, PhoneOff, RefreshCw, Flame, Thermometer, Snowflake, Undo2, MessagesSquare,
  SlidersHorizontal, Copy, RotateCcw, Inbox, PartyPopper, Send,
} from 'lucide-react';
import { gerarAbordagem, linkWhatsApp, chaveDoDia, ANGULOS, idiomaDoLead } from '../abordagem';
import { digitosWhatsApp } from '../telefone';
import { localDoEndereco } from '../leadData';
import Bandeira from './Bandeira';

/**
 * Fila do dia: leads qualificados com a primeira mensagem já escrita.
 *
 * Nada é enviado por aqui. O botão abre a conversa no WhatsApp (Web ou
 * aplicativo do computador) com o texto já na caixa; quem aperta enviar é o
 * usuário, no WhatsApp de verdade. Para o WhatsApp isso é uso normal, e é o
 * jeito de menor risco de banimento. O app só prepara, guarda o que já foi
 * abordado e conta a meta do dia.
 *
 * Layout em lista e detalhe: a fila à esquerda, um lead por vez à direita.
 * Depois de marcar um lead, o próximo da fila abre sozinho.
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

// Cidade e estado vêm do endereço quando o lead não os guarda soltos.
function leadParaTexto(lead) {
  const doEndereco = localDoEndereco(lead.address);
  return { ...lead, city: lead.city || doEndereco.cidade, uf: lead.uf || lead.state || doEndereco.uf };
}

function Temperatura({ q }) {
  const Icone = ICONE_TEMP[q.temperatura.id];
  return (
    <span className={`cl-temp cl-temp-${q.temperatura.id}`}>
      <Icone size={11} strokeWidth={2} aria-hidden="true" /> {q.temperatura.rotulo} {q.nota}
    </span>
  );
}

export default function FilaAbordagem({ leads, qualificacoes, tituloBusca, onFechar }) {
  const [cfg, setCfg] = useState(() => lerJson(CHAVE_CFG, { nome: '', empresa: 'Grow+', limite: 20, oferta: 'qualquer', abrirEm: 'web' }));
  const [log, setLog] = useState(() => lerJson(CHAVE_LOG, {}));
  const [versoes, setVersoes] = useState({});
  const [editados, setEditados] = useState({});
  const [jaAbordados, setJaAbordados] = useState({});
  const [aviso, setAviso] = useState('');
  const [aba, setAba] = useState('fila');
  const [selecionado, setSelecionado] = useState(null);
  const [abertos, setAbertos] = useState({});
  // Ajustes começam abertos só enquanto falta o nome de quem assina.
  const [ajustesAbertos, setAjustesAbertos] = useState(() => !lerJson(CHAVE_CFG, { nome: '' }).nome);
  const hoje = chaveDoDia();

  useEffect(() => gravaJson(CHAVE_CFG, cfg), [cfg]);
  useEffect(() => gravaJson(CHAVE_LOG, log), [log]);
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onFechar]);
  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(''), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

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
  const fila = candidatos.filter(({ chave }) => !jaAbordados[chave]).slice(0, restante);
  const enviadas = Object.entries(log)
    .filter(([, e]) => e.status === 'enviada' || e.status === 'respondeu')
    .sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0));
  const responderam = enviadas.filter(([, e]) => e.status === 'respondeu').length;

  // O selecionado some da fila quando é marcado: abre o próximo, na mesma posição.
  const atual = fila.find((f) => f.chave === selecionado) || fila[0] || null;
  const posicao = atual ? fila.indexOf(atual) : -1;

  const gerado = (item) => gerarAbordagem(leadParaTexto(item.lead), item.q, cfg, versoes[item.chave] || 0);
  const textoDe = (item) => (editados[item.chave] !== undefined ? editados[item.chave] : gerado(item).texto);

  const marca = (item, status) => {
    const proximo = fila[posicao + 1] || fila[posicao - 1] || null;
    setLog((atualLog) => ({
      ...atualLog,
      [item.chave]: {
        status,
        dia: hoje,
        ts: Date.now(),
        nome: item.lead.name || '',
        texto: status === 'enviada' ? textoDe(item) : '',
        angulo: gerado(item).angulo,
      },
    }));
    setSelecionado(proximo?.chave || null);
    if (status === 'enviada') setAviso(`${item.lead.name || 'Lead'} marcado como enviado.`);
  };

  const desfaz = (chave) => setLog((atualLog) => {
    const { [chave]: _tirado, ...resto } = atualLog;
    return resto;
  });

  const abre = async (item) => {
    const numero = digitosWhatsApp(item.q.canais.whatsapp, item.lead.pais);
    const url = linkWhatsApp(numero, textoDe(item), cfg.abrirEm);
    setAviso('');
    setAbertos((a) => ({ ...a, [item.chave]: true }));
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

  const outraVersao = (chave) => {
    setEditados((x) => { const { [chave]: _x, ...r } = x; return r; });
    setVersoes((v) => ({ ...v, [chave]: (v[chave] || 0) + 1 }));
  };
  const restaura = (chave) => setEditados((x) => { const { [chave]: _x, ...r } = x; return r; });

  const muda = (campo) => (e) => setCfg((c) => ({ ...c, [campo]: campo === 'limite' ? Number(e.target.value) : e.target.value }));
  const progresso = Math.min(100, (enviadasHoje / cfg.limite) * 100);

  const detalhe = atual && (() => {
    const { lead, q, chave } = atual;
    const g = gerado(atual);
    const texto = textoDe(atual);
    const editado = editados[chave] !== undefined;
    const servico = q.servicos.find((s) => s.id === g.angulo);
    const ingles = idiomaDoLead(lead) === 'en';
    const local = [lead.city || localDoEndereco(lead.address).cidade, lead.uf || lead.state || localDoEndereco(lead.address).uf].filter(Boolean).join(', ');
    const jaAbriu = abertos[chave];
    return (
      <section className="fa-detalhe" aria-label={`Mensagem para ${lead.name}`}>
        <header className="fa-det-topo">
          <div className="fa-det-quem">
            <h3>{lead.name || 'Empresa'}</h3>
            <span>
              <Bandeira pais={String(lead.pais || 'BR').toUpperCase() === 'US' ? 'US' : 'BR'} />
              {[lead.category, local].filter(Boolean).join(' · ')}
            </span>
          </div>
          <Temperatura q={q} />
        </header>

        <div className="fa-chips">
          <span className="fa-chip fa-chip-oferta">Oferecer: <b>{ANGULOS.find((a) => a.id === g.angulo)?.nome || 'Abordagem geral'}</b></span>
          {servico?.motivo && <span className="fa-chip">{servico.motivo}</span>}
          {ingles && <span className="fa-chip">Em inglês</span>}
        </div>

        <div className="fa-msg">
          <div className="fa-msg-topo">
            <span className="fa-rotulo">Mensagem</span>
            <span className="fa-versao">{editado ? 'Editada por você' : `Versão ${g.versao + 1} de ${g.total}`}</span>
            <span className="fa-espaco" />
            {editado && (
              <button type="button" className="fa-mini" onClick={() => restaura(chave)}>
                <RotateCcw size={13} strokeWidth={2} aria-hidden="true" /> Desfazer edição
              </button>
            )}
            <button type="button" className="fa-mini" onClick={() => outraVersao(chave)}>
              <RefreshCw size={13} strokeWidth={2} aria-hidden="true" /> Outra versão
            </button>
            <button type="button" className="fa-mini" onClick={() => copia(atual)}>
              <Copy size={13} strokeWidth={2} aria-hidden="true" /> Copiar
            </button>
          </div>
          <div className="fa-balao-fundo">
            <textarea
              className="fa-balao"
              value={texto}
              onChange={(e) => setEditados((x) => ({ ...x, [chave]: e.target.value }))}
              aria-label={`Mensagem para ${lead.name}`}
              spellCheck
            />
            <span className="fa-contagem">{texto.length} caracteres</span>
          </div>
        </div>

        <div className="fa-passos">
          <button type="button" className={`btn fa-abrir${jaAbriu ? ' feito' : ''}`} onClick={() => abre(atual)}>
            <ExternalLink size={16} strokeWidth={2} aria-hidden="true" />
            {jaAbriu ? 'Abrir de novo' : 'Abrir no WhatsApp'}
          </button>
          <button type="button" className={`btn fa-enviei${jaAbriu ? ' pronto' : ''}`} onClick={() => marca(atual, 'enviada')}>
            <Check size={16} strokeWidth={2.25} aria-hidden="true" /> Enviei
          </button>
          <span className="fa-espaco" />
          <button type="button" className="fa-mini" onClick={() => marca(atual, 'sem_whatsapp')} title="O número não tem WhatsApp">
            <PhoneOff size={13} strokeWidth={2} aria-hidden="true" /> Sem WhatsApp
          </button>
          <button type="button" className="fa-mini" onClick={() => marca(atual, 'pulada')} title="Tira da fila sem abordar">
            <SkipForward size={13} strokeWidth={2} aria-hidden="true" /> Pular
          </button>
        </div>
        <p className="fa-dica">
          {jaAbriu
            ? 'Enviou no WhatsApp? Clique em Enviei para contar na meta e ir para o próximo.'
            : 'O WhatsApp abre com o texto na caixa. Você confere e aperta enviar lá.'}
        </p>
      </section>
    );
  })();

  // Vai direto no body: dentro da tela do mapa, os controles do mapa ficavam por cima.
  return createPortal(
    <div className="overlay on" onClick={onFechar} style={{ display: 'grid' }}>
      <div className="modal fa-modal" role="dialog" aria-modal="true" aria-labelledby="faTitulo" onClick={(e) => e.stopPropagation()}>
        <header className="fa-head">
          <div className="fa-titulo">
            <div className="eyebrow">Abordagem manual</div>
            <h2 id="faTitulo">Fila do dia</h2>
            <p className="fa-sub">{tituloBusca ? `${tituloBusca} · ` : ''}Você abre, confere e envia no WhatsApp. O app só prepara.</p>
          </div>
          <div className="fa-meta" role="status" aria-label={`${enviadasHoje} de ${cfg.limite} mensagens enviadas hoje`}>
            <div className="fa-meta-num"><b>{enviadasHoje}</b><span>/ {cfg.limite}</span></div>
            <div className="fa-meta-lado">
              <span>enviadas hoje</span>
              <div className="fa-barra" aria-hidden="true"><span style={{ width: `${progresso}%` }} /></div>
            </div>
          </div>
          <button
            type="button"
            className={`fa-icone${ajustesAbertos ? ' on' : ''}`}
            onClick={() => setAjustesAbertos((v) => !v)}
            aria-expanded={ajustesAbertos}
            title="Ajustes da fila"
          >
            <SlidersHorizontal size={16} strokeWidth={2} />
          </button>
          <button type="button" className="fa-icone" onClick={onFechar} aria-label="Fechar"><X size={16} strokeWidth={2} /></button>
        </header>

        {ajustesAbertos && (
          <div className="fa-ajustes">
            <label>Seu nome
              <input value={cfg.nome} onChange={muda('nome')} placeholder="Ex.: Matheus" autoComplete="off" />
            </label>
            <label>Sua empresa
              <input value={cfg.empresa} onChange={muda('empresa')} placeholder="Grow+" autoComplete="off" />
            </label>
            <label>Meta por dia
              <select value={cfg.limite} onChange={muda('limite')}>{LIMITES.map((n) => <option key={n} value={n}>{n} mensagens</option>)}</select>
            </label>
            <label>Oferecer
              <select value={cfg.oferta} onChange={muda('oferta')}>
                <option value="qualquer">O melhor de cada lead</option>
                {ANGULOS.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </label>
            <label>Abrir em
              <select value={cfg.abrirEm} onChange={muda('abrirEm')}>
                <option value="web">WhatsApp Web</option>
                <option value="app">Aplicativo do WhatsApp</option>
              </select>
            </label>
          </div>
        )}

        <div className="fa-abas" role="tablist">
          <button type="button" role="tab" aria-selected={aba === 'fila'} className={aba === 'fila' ? 'on' : ''} onClick={() => setAba('fila')}>
            <Send size={14} strokeWidth={2} aria-hidden="true" /> Para enviar <span className="fa-conta">{fila.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={aba === 'enviadas'} className={aba === 'enviadas' ? 'on' : ''} onClick={() => setAba('enviadas')}>
            <MessagesSquare size={14} strokeWidth={2} aria-hidden="true" /> Já abordados <span className="fa-conta">{enviadas.length}</span>
          </button>
          <span className="fa-espaco" />
          {!cfg.nome && <span className="fa-alerta">Preencha seu nome nos ajustes para assinar a mensagem.</span>}
        </div>

        {aba === 'fila' && (fila.length === 0 ? (
          <div className="fa-vazio">
            {restante === 0 ? <PartyPopper size={28} strokeWidth={1.5} aria-hidden="true" /> : <Inbox size={28} strokeWidth={1.5} aria-hidden="true" />}
            <b>{restante === 0 ? `Meta de ${cfg.limite} cumprida hoje` : 'Ninguém na fila'}</b>
            <span>
              {restante === 0
                ? 'Para continuar, aumente a meta nos ajustes ou volte amanhã.'
                : 'Nenhum lead desta busca tem WhatsApp e algo para oferecer. Troque a busca ou o que oferecer.'}
            </span>
          </div>
        ) : (
          <div className="fa-corpo">
            <ol className="fa-lista" aria-label="Leads da fila">
              {fila.map((item, i) => {
                const { lead, q, chave } = item;
                const ativo = atual?.chave === chave;
                return (
                  <li key={chave}>
                    <button type="button" className={`fa-linha${ativo ? ' on' : ''}`} onClick={() => setSelecionado(chave)} aria-current={ativo}>
                      <span className="fa-ordem">{abertos[chave] ? <Check size={12} strokeWidth={2.5} /> : i + 1}</span>
                      <span className="fa-linha-txt">
                        <b>{lead.name || 'Empresa'}</b>
                        <span>{[lead.city || localDoEndereco(lead.address).cidade, ANGULOS.find((a) => a.id === gerado(item).angulo)?.nome].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span className={`fa-ponto fa-ponto-${q.temperatura.id}`} title={`${q.temperatura.rotulo} ${q.nota}`} />
                    </button>
                  </li>
                );
              })}
            </ol>
            {detalhe}
          </div>
        ))}

        {aba === 'enviadas' && (enviadas.length === 0 ? (
          <div className="fa-vazio">
            <MessagesSquare size={28} strokeWidth={1.5} aria-hidden="true" />
            <b>Ninguém abordado ainda</b>
            <span>Quem você marcar como enviado aparece aqui, para anotar quem respondeu.</span>
          </div>
        ) : (
          <div className="fa-historico">
            <p className="fa-hist-resumo"><b>{enviadas.length}</b> abordados · <b>{responderam}</b> responderam</p>
            {enviadas.map(([chave, e]) => (
              <article key={chave} className="fa-hist-item">
                <div className="fa-hist-topo">
                  <div className="fa-linha-txt">
                    <b>{e.nome || chave}</b>
                    <span>{new Date(e.ts).toLocaleDateString('pt-BR')} · {ANGULOS.find((a) => a.id === e.angulo)?.nome || 'Abordagem geral'}</span>
                  </div>
                  <span className={`mm-situacao ${e.status === 'respondeu' ? 'mm-aprovado' : 'mm-analise'}`}>{e.status === 'respondeu' ? 'Respondeu' : 'Aguardando'}</span>
                </div>
                {e.texto && <p className="fa-hist-texto">{e.texto}</p>}
                <div className="fa-hist-acoes">
                  {e.status === 'enviada' ? (
                    <button type="button" className="fa-mini fa-mini-forte" onClick={() => setLog((a) => ({ ...a, [chave]: { ...e, status: 'respondeu' } }))}>
                      <MessagesSquare size={13} strokeWidth={2} aria-hidden="true" /> Respondeu
                    </button>
                  ) : (
                    <button type="button" className="fa-mini" onClick={() => setLog((a) => ({ ...a, [chave]: { ...e, status: 'enviada' } }))}>Ainda não respondeu</button>
                  )}
                  <button type="button" className="fa-mini" onClick={() => desfaz(chave)}>
                    <Undo2 size={13} strokeWidth={2} aria-hidden="true" /> Voltar para a fila
                  </button>
                </div>
              </article>
            ))}
          </div>
        ))}

        {aviso && <div className="fa-toast" role="status">{aviso}</div>}
      </div>
    </div>,
    document.body,
  );
}
