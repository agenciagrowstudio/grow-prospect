import React, { useEffect, useMemo, useState } from 'react';
import { pedirMapa } from '../pedidoMapa';
import {
  Send, MessagesSquare, Percent, Target, ClipboardList, MessageCircle, Mail, Megaphone, Filter, Reply,
} from 'lucide-react';
import { readLocalArray } from '../leadData';
import { chaveDoDia } from '../abordagem';
import { resumoResultados } from '../resultados';
import Bandeira from './Bandeira';

/**
 * Painel de Análises: resultados da prospecção (a Visão Geral cuida da base).
 * O que foi enviado em cada canal, quem respondeu e o que funciona melhor
 * por público e por oferta.
 */

const ICONE_CANAL = { fila: ClipboardList, wa: Megaphone, email: Mail };

function lerJson(chave, padrao) {
  try { return JSON.parse(localStorage.getItem(chave) || 'null') || padrao; } catch { return padrao; }
}

function Barras({ itens, rotulo, cor }) {
  const maior = Math.max(1, ...itens.map((i) => i.enviadas));
  return (
    <ul className="rs-barras">
      {itens.map((i) => (
        <li key={i.id}>
          <div className="rs-barras-topo">
            <span className="rs-barras-nome">{rotulo(i)}</span>
            <span className="rs-barras-num"><b>{i.taxa}%</b> · {i.respostas} de {i.enviadas}</span>
          </div>
          <div className="rs-barra" aria-hidden="true">
            <span className="rs-barra-env" style={{ width: `${(i.enviadas / maior) * 100}%`, background: cor ? cor(i) : undefined }} />
            <span className="rs-barra-resp" style={{ width: `${(i.respostas / maior) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard({ onNavigate }) {
  const [campanhasWa, setCampanhasWa] = useState([]);
  const [campanhasEmail, setCampanhasEmail] = useState([]);
  const leads = useMemo(() => readLocalArray('sigma_leads'), []);
  const log = useMemo(() => lerJson('sigma_abordagem_log', {}), []);
  const meta = useMemo(() => Number(lerJson('sigma_abordagem_cfg', {}).limite) || 20, []);

  useEffect(() => {
    let vivo = true;
    window.campaignAPI?.getAll?.().then((r) => { if (vivo) setCampanhasWa(r?.campaigns || []); }).catch(() => {});
    window.emailAPI?.list?.().then((r) => { if (vivo && r?.success) setCampanhasEmail(r.campanhas || []); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  const r = useMemo(
    () => resumoResultados({ log, leads, campanhasWa, campanhasEmail, dias: 30 }),
    [log, leads, campanhasWa, campanhasEmail],
  );
  const filaHoje = Object.values(log).filter((e) => e?.status === 'enviada' && e.dia === chaveDoDia()).length;
  const maiorDia = Math.max(1, ...r.serie.map((s) => s.enviadas));
  // Pelo maior valor: campanhas podem ter leads que não estão na base.
  const maiorFunil = Math.max(1, ...r.funil.map((f) => f.valor));
  const abreFila = () => {
    pedirMapa({ abrirFila: true });
    onNavigate?.('scraper');
  };

  return (
    <section className="settings-open-design-view rs-view">
      <div className="page-head rs-topo">
        <div>
          <h1>Resultados</h1>
          <p>O que foi enviado em cada canal, quem respondeu e o que funciona melhor. A Visão Geral mostra a base de leads.</p>
        </div>
        <button type="button" className="btn btn-primary rs-cta" onClick={abreFila}>
          <ClipboardList size={15} strokeWidth={2} /> Abrir Fila do dia
        </button>
      </div>

      <div className="rs-kpis">
        <article className="rs-kpi">
          <span className="rs-kpi-icone rs-azul"><Send size={16} strokeWidth={2} /></span>
          <span className="rs-kpi-rotulo">Abordagens enviadas</span>
          <b>{r.enviadas}</b>
          <small>{r.enviadasHoje} hoje</small>
        </article>
        <article className="rs-kpi">
          <span className="rs-kpi-icone rs-verde"><MessagesSquare size={16} strokeWidth={2} /></span>
          <span className="rs-kpi-rotulo">Responderam</span>
          <b>{r.respostas}</b>
          <small>em todos os canais</small>
        </article>
        <article className="rs-kpi">
          <span className="rs-kpi-icone rs-roxo"><Percent size={16} strokeWidth={2} /></span>
          <span className="rs-kpi-rotulo">Taxa de resposta</span>
          <b>{r.taxa}%</b>
          <small>{r.taxa >= 10 ? 'acima de 10%, bom sinal' : 'a média de primeira mensagem fica entre 5% e 15%'}</small>
        </article>
        <article className="rs-kpi">
          <span className="rs-kpi-icone rs-amarelo"><Target size={16} strokeWidth={2} /></span>
          <span className="rs-kpi-rotulo">Meta de hoje (Fila)</span>
          <b>{filaHoje}<em> / {meta}</em></b>
          <div className="rs-kpi-barra" aria-hidden="true"><i style={{ width: `${Math.min(100, (filaHoje / meta) * 100)}%` }} /></div>
        </article>
      </div>

      {r.enviadas === 0 ? (
        <div className="cfg-card rs-vazio">
          <MessageCircle size={30} strokeWidth={1.5} aria-hidden="true" />
          <b>Nenhuma abordagem ainda</b>
          <span>
            Os resultados aparecem aqui conforme você envia mensagens pela Fila do dia, por campanhas de WhatsApp ou por e-mail.
            Marque quem respondeu para acompanhar a taxa de resposta.
          </span>
          <button type="button" className="btn btn-primary rs-cta" onClick={abreFila}>
            <ClipboardList size={15} strokeWidth={2} /> Começar pela Fila do dia
          </button>
        </div>
      ) : (
        <>
          <div className="rs-linha rs-linha-2">
            <article className="cfg-card rs-card">
              <header className="rs-card-topo">
                <h2>Abordagens nos últimos 30 dias</h2>
                <div className="rs-legenda">
                  <span><i className="rs-l-env" /> Enviadas</span>
                  <span><i className="rs-l-resp" /> Responderam</span>
                </div>
              </header>
              <div className="rs-grafico" role="img" aria-label={`${r.serie.reduce((n, s) => n + s.enviadas, 0)} abordagens nos últimos 30 dias`}>
                {r.serie.map((s, i) => (
                  <div key={s.dia} className="rs-coluna" title={`${new Date(s.ts).toLocaleDateString('pt-BR')}: ${s.enviadas} enviadas, ${s.respostas} responderam`}>
                    <div className="rs-coluna-area">
                      <span className="rs-col-env" style={{ height: `${(s.enviadas / maiorDia) * 100}%` }} />
                      <span className="rs-col-resp" style={{ height: `${(s.respostas / maiorDia) * 100}%` }} />
                    </div>
                    <span className="rs-coluna-dia">{i % 5 === 4 || i === r.serie.length - 1 ? new Date(s.ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}</span>
                  </div>
                ))}
              </div>
              <p className="rs-nota">Fila do dia e campanhas de WhatsApp. O e-mail entra nos totais, mas não guarda a data de cada envio.</p>
            </article>

            <article className="cfg-card rs-card">
              <header className="rs-card-topo"><h2><Filter size={15} strokeWidth={2} /> Funil</h2></header>
              <ol className="rs-funil">
                {r.funil.map((f, i) => (
                  <li key={f.id}>
                    <div className="rs-funil-topo">
                      <span>{f.nome}</span>
                      <b>{f.valor}</b>
                    </div>
                    <div className="rs-funil-barra"><span className={`rs-f${i}`} style={{ width: `${Math.max(2, (f.valor / maiorFunil) * 100)}%` }} /></div>
                  </li>
                ))}
              </ol>
            </article>
          </div>

          <div className="rs-linha rs-linha-3">
            <article className="cfg-card rs-card">
              <header className="rs-card-topo"><h2>Por canal</h2></header>
              <ul className="rs-canais">
                {r.canais.map((c) => {
                  const Icone = ICONE_CANAL[c.id];
                  return (
                    <li key={c.id} className={c.enviadas ? '' : 'rs-apagado'}>
                      <span className={`rs-canal-icone rs-canal-${c.id}`}><Icone size={15} strokeWidth={2} /></span>
                      <span className="rs-canal-nome">{c.nome}</span>
                      <span className="rs-canal-num"><b>{c.taxa}%</b><small>{c.respostas} de {c.enviadas}</small></span>
                    </li>
                  );
                })}
              </ul>
            </article>

            <article className="cfg-card rs-card">
              <header className="rs-card-topo"><h2>Por público</h2><span className="rs-fonte">Fila do dia</span></header>
              {r.porPublico.length
                ? <Barras itens={r.porPublico} rotulo={(p) => <><Bandeira pais={p.pais} /> {p.nome}</>} />
                : <p className="rs-nota">Aparece quando houver abordagens pela Fila do dia.</p>}
            </article>

            <article className="cfg-card rs-card">
              <header className="rs-card-topo"><h2>Por oferta</h2><span className="rs-fonte">Fila do dia</span></header>
              {r.porOferta.length
                ? <Barras itens={r.porOferta} rotulo={(o) => <><i className={`rs-ponto rs-svc-${o.id}`} /> {o.nome}</>} cor={(o) => `var(--svc-${o.id}, var(--pal-azul))`} />
                : <p className="rs-nota">Aparece quando houver abordagens pela Fila do dia.</p>}
            </article>
          </div>

          <article className="cfg-card rs-card">
            <header className="rs-card-topo"><h2><Reply size={15} strokeWidth={2} /> Últimos que responderam</h2></header>
            {r.ultimasRespostas.length ? (
              <ul className="rs-respostas">
                {r.ultimasRespostas.map((u) => (
                  <li key={`${u.canal}-${u.id}`}>
                    <span className={`rs-canal-icone rs-canal-${u.canal}`}>{u.canal === 'fila' ? <ClipboardList size={14} strokeWidth={2} /> : <Megaphone size={14} strokeWidth={2} />}</span>
                    <b>{u.nome}</b>
                    <span>{u.canal === 'fila' ? 'Fila do dia' : 'Campanha de WhatsApp'}</span>
                    <time>{u.ts ? new Date(u.ts).toLocaleDateString('pt-BR') : ''}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rs-nota">Ninguém respondeu ainda. Na Fila do dia, aba Já abordados, marque quem respondeu.</p>
            )}
          </article>
        </>
      )}
    </section>
  );
}
