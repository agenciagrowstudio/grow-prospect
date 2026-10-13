import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Check, Copy, Lock, MessagesSquare, Ban, Clock, Inbox, Pencil } from 'lucide-react';
import { linkWhatsApp, partesWhatsApp, chaveDoDia } from '../abordagem';
import { digitosWhatsApp } from '../telefone';
import { localDoEndereco } from '../leadData';
import CardLead from './CardLead';
import DivisorFila from './DivisorFila';
import { qualificaLead } from '../qualificacaoLead';
import { proximoFollowup, tempoAte, marcaFollowup, textoFollowup, ETAPAS_FOLLOWUP, DIAS_FOLLOWUP } from '../followup';

/**
 * Aba Follow-ups da Fila do dia: quem recebeu a primeira mensagem e não
 * respondeu. O botão só libera no prazo da etapa (2, 5 e 10 dias) e nunca
 * antes de 24h da mensagem anterior. Fica fora da meta diária.
 */

const TAG_ESTILO = { negrito: 'strong', italico: 'em', riscado: 's' };
function TextoWhatsApp({ texto }) {
  return partesWhatsApp(texto).map((p, i) => {
    const Tag = TAG_ESTILO[p.estilo];
    // eslint-disable-next-line react/no-array-index-key
    return Tag ? <Tag key={i}>{p.texto}</Tag> : <React.Fragment key={i}>{p.texto}</React.Fragment>;
  });
}

async function abreLink(url) {
  if (window.electronAPI?.openExternal) return window.electronAPI.openExternal(url);
  if (url.startsWith('whatsapp:')) { window.location.href = url; return { success: true }; }
  window.open(url, '_blank', 'noopener');
  return { success: true };
}

export default function FollowupsFila({ log, setLog, leads, modoLink, onAviso }) {
  // O contador anda sozinho.
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const [selecionado, setSelecionado] = useState(null);
  const [editados, setEditados] = useState({});
  const [editando, setEditando] = useState(false);

  const porId = useMemo(() => new Map((leads || []).map((l) => [String(l.id), l])), [leads]);
  const itens = useMemo(() => Object.entries(log)
    .map(([chave, e]) => {
      const p = proximoFollowup(e, agora);
      if (!p) return null;
      const lead = porId.get(chave) || null;
      const numero = lead ? digitosWhatsApp(lead.whatsapp || lead.phone || lead.tel, lead.pais) : '';
      return { chave, e, p, lead, numero };
    })
    .filter(Boolean)
    .sort((a, b) => a.p.liberaEm - b.p.liberaEm), [log, agora, porId]);

  const liberados = itens.filter((i) => i.p.liberado);
  const travados = itens.filter((i) => !i.p.liberado);
  const atual = itens.find((i) => i.chave === selecionado) || liberados[0] || itens[0] || null;
  const hoje = chaveDoDia();
  const feitosHoje = Object.values(log).reduce(
    (n, e) => n + (e.followups || []).filter((f) => chaveDoDia(new Date(f.ts)) === hoje).length, 0,
  );

  const chaveEdicao = (i) => `${i.chave}|${i.p.n}`;
  const textoDe = (i) => editados[chaveEdicao(i)] ?? textoFollowup({ nome: i.e.contato }, i.p.n, i.e.idioma || 'pt');

  const atualiza = (chave, mudanca) => setLog((l) => ({ ...l, [chave]: { ...l[chave], ...mudanca } }));
  const proximoDepois = (item) => {
    const resto = liberados.filter((i) => i.chave !== item.chave);
    setSelecionado(resto[0]?.chave || null);
    setEditando(false);
  };

  const abre = async (item) => {
    const r = await abreLink(linkWhatsApp(item.numero, textoDe(item), modoLink));
    if (r && r.success === false) onAviso?.('Não consegui abrir o WhatsApp.');
  };
  const enviei = (item) => {
    setLog((l) => ({ ...l, [item.chave]: marcaFollowup(l[item.chave], textoDe(item)) }));
    onAviso?.(item.p.n === DIAS_FOLLOWUP.length
      ? `Último follow-up para ${item.e.nome || 'o lead'} registrado. Ele sai da sequência.`
      : `Follow-up ${item.p.n} de ${DIAS_FOLLOWUP.length} registrado para ${item.e.nome || 'o lead'}.`);
    proximoDepois(item);
  };
  const copia = async (item) => {
    try { await navigator.clipboard.writeText(textoDe(item)); onAviso?.('Texto copiado.'); } catch { onAviso?.('Não consegui copiar.'); }
  };
  const encerra = (item, status) => {
    atualiza(item.chave, { status });
    onAviso?.(status === 'respondeu' ? `${item.e.nome || 'Lead'} respondeu: saiu dos follow-ups.` : `${item.e.nome || 'Lead'} marcado sem interesse.`);
    proximoDepois(item);
  };

  if (!itens.length) {
    return (
      <div className="fa-vazio">
        <Inbox size={28} strokeWidth={1.5} aria-hidden="true" />
        <b>Nenhum follow-up pendente</b>
        <span>Quem recebeu a primeira mensagem e não respondeu aparece aqui: follow-up em 2, 5 e 10 dias, nunca antes de 24h da mensagem anterior.</span>
      </div>
    );
  }

  const linha = (i) => {
    const local = i.lead ? (i.lead.city || localDoEndereco(i.lead.address).cidade) : '';
    return (
      <li key={i.chave}>
        <button type="button" className={`fa-linha${atual?.chave === i.chave ? ' on' : ''}${i.p.liberado ? '' : ' fu-travado'}`} onClick={() => { setSelecionado(i.chave); setEditando(false); }}>
          <span className={`fa-ordem fu-etapa${i.p.liberado ? ' liberado' : ''}`} title={ETAPAS_FOLLOWUP[i.p.n - 1]}>{i.p.liberado ? i.p.n : <Lock size={11} strokeWidth={2.4} />}</span>
          <span className="fa-linha-txt">
            <b>{i.e.nome || 'Empresa'}</b>
            <span>{[local, `${i.p.n}/${DIAS_FOLLOWUP.length}`, i.p.liberado ? 'liberado' : tempoAte(i.p.liberaEm, agora)].filter(Boolean).join(' · ')}</span>
          </span>
        </button>
      </li>
    );
  };

  const texto = atual ? textoDe(atual) : '';
  return (
    <div className="fa-corpo">
      <div className="fa-coluna-lista">
        <div className="fu-resumo">
          <span><b>{liberados.length} liberado{liberados.length === 1 ? '' : 's'}</b> · {travados.length} aguardando</span>
          <small>{feitosHoje} follow-up{feitosHoje === 1 ? '' : 's'} hoje · extra, fora da meta</small>
        </div>
        <ol className="fa-lista" aria-label="Follow-ups">
          {liberados.map(linha)}
          {travados.length > 0 && <li className="fu-separador">Aguardando o prazo</li>}
          {travados.map(linha)}
        </ol>
      </div>
      <DivisorFila />

      {atual && (
        <section className="fa-detalhe" aria-label={`Follow-up para ${atual.e.nome}`}>
          {atual.lead && (
            <CardLead
              lead={atual.lead}
              qualificacao={qualificaLead(atual.lead)}
              local={[atual.lead.city || localDoEndereco(atual.lead.address).cidade, atual.lead.state || localDoEndereco(atual.lead.address).uf].filter(Boolean).join(' · ')}
              estatico
              onWhatsApp={() => { if (atual.p.liberado) abre(atual); }}
            />
          )}
          <header className="fa-det-topo fu-det-topo">
            <div className="fa-det-quem">
              {!atual.lead && <h3>{atual.e.nome || 'Empresa'}</h3>}
              <span>Primeira mensagem em {new Date(atual.e.ts).toLocaleDateString('pt-BR')}{atual.e.followups?.length ? ` · ${atual.e.followups.length} follow-up${atual.e.followups.length === 1 ? '' : 's'} enviado${atual.e.followups.length === 1 ? '' : 's'}` : ''}</span>
            </div>
            <span className="fu-etapa-chip">Follow-up {atual.p.n} de {DIAS_FOLLOWUP.length} · {ETAPAS_FOLLOWUP[atual.p.n - 1]}</span>
          </header>

          {!atual.p.liberado && (
            <div className="fu-trava" role="status">
              <Clock size={15} strokeWidth={2} aria-hidden="true" />
              <span><b>Travado até {new Date(atual.p.liberaEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</b> ({tempoAte(atual.p.liberaEm, agora)}). Cobrar antes disso aumenta o risco de denúncia e bloqueio.</span>
            </div>
          )}

          <label className="fu-nome">
            Nome do cliente (opcional)
            <input
              value={atual.e.contato || ''}
              onChange={(ev) => atualiza(atual.chave, { contato: ev.target.value })}
              placeholder="Ex.: Nayara"
              autoComplete="off"
            />
          </label>

          <div className="fa-msg">
            <div className="fa-msg-topo">
              <span className="fa-rotulo">Mensagem</span>
              <span className="fa-espaco" />
              <button type="button" className={`fa-mini${editando ? ' fa-mini-forte' : ''}`} onMouseDown={(ev) => ev.preventDefault()} onClick={() => setEditando((v) => !v)}>
                <Pencil size={13} strokeWidth={2} aria-hidden="true" /> {editando ? 'Ver como fica' : 'Editar'}
              </button>
              <button type="button" className="fa-mini" onClick={() => copia(atual)}>
                <Copy size={13} strokeWidth={2} aria-hidden="true" /> Copiar
              </button>
            </div>
            <div className="fa-balao-fundo">
              {editando ? (
                <textarea
                  className="fa-balao"
                  value={texto}
                  onChange={(ev) => setEditados((x) => ({ ...x, [chaveEdicao(atual)]: ev.target.value }))}
                  onBlur={() => setEditando(false)}
                  aria-label="Mensagem do follow-up"
                  autoFocus
                />
              ) : (
                <div className="fa-balao fa-previa" role="button" tabIndex={0} onClick={() => setEditando(true)} onKeyDown={(ev) => { if (ev.key === 'Enter') setEditando(true); }}>
                  <TextoWhatsApp texto={texto} />
                </div>
              )}
            </div>
          </div>

          <div className="fa-passos">
            <button type="button" className="btn fa-abrir" onClick={() => abre(atual)} disabled={!atual.p.liberado || !atual.numero} title={atual.numero ? undefined : 'Lead sem telefone na base'}>
              {atual.p.liberado ? <ExternalLink size={16} strokeWidth={2} aria-hidden="true" /> : <Lock size={16} strokeWidth={2} aria-hidden="true" />}
              {atual.p.liberado ? 'Abrir no WhatsApp' : tempoAte(atual.p.liberaEm, agora)}
            </button>
            <button type="button" className="btn fa-enviei" onClick={() => enviei(atual)} disabled={!atual.p.liberado}>
              <Check size={16} strokeWidth={2.25} aria-hidden="true" /> Enviei
            </button>
            <span className="fa-espaco" />
            <button type="button" className="fa-mini fa-mini-forte" onClick={() => encerra(atual, 'respondeu')}>
              <MessagesSquare size={13} strokeWidth={2} aria-hidden="true" /> Respondeu
            </button>
            <button type="button" className="fa-mini" onClick={() => encerra(atual, 'sem_interesse')} title="Para a sequência deste lead">
              <Ban size={13} strokeWidth={2} aria-hidden="true" /> Sem interesse
            </button>
          </div>
          <p className="fa-dica">
            {atual.p.liberado
              ? 'O WhatsApp abre com o texto na caixa. Envie lá e clique em Enviei: o próximo follow-up deste lead fica travado até o prazo.'
              : 'Dá para preparar o texto agora. O envio libera sozinho quando o prazo chegar.'}
          </p>
        </section>
      )}
    </div>
  );
}
