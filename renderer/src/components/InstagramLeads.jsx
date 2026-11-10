import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Megaphone, Link2, Loader, X, Copy, Check, SkipForward, RefreshCw, ExternalLink,
  Store, UserRound, MessageSquareText, Settings, Instagram,
} from 'lucide-react';
import Contagem from './Contagem';
import {
  normalizaUrlPost, custoEstimado, leadsDaExtracao, LIMITES_EXTRACAO, METAS_DIRECT,
  OFERTAS_DIRECT, mensagemDirect, linkDirect, filaDirect, directsHoje, registroDirect,
  LIMITES_BUSCA, custoBusca, postsDaBusca, anunciantesDaBusca, linkAnuncio,
} from '../instagramLeads';
import { readLocalArray } from '../leadData';

/**
 * Leads do Instagram: achar posts e anúncios por palavra, extrair quem comentou
 * e trabalhar a Fila do Direct (a mensagem fica pronta, você envia).
 */

const CHAVE_LOG = 'sigma_abordagem_log';
const CHAVE_CFG = 'prospector_direct_cfg';
const leJson = (chave, padrao) => {
  try { return { ...padrao, ...(JSON.parse(localStorage.getItem(chave) || 'null') || {}) }; } catch { return padrao; }
};
const dataCurta = (ms) => (ms ? new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '');
const dolar = (v) => `US$ ${v.toFixed(2).replace('.', ',')}`;
const mil = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',').replace(',0', '')} mil` : String(n));

function abre(url) {
  if (window.electronAPI?.openExternal) return window.electronAPI.openExternal(url);
  window.open(url, '_blank', 'noopener');
  return null;
}

function Avatar({ lead }) {
  const [falhou, setFalhou] = useState(false);
  const letra = String(lead.usuarioInstagram || lead.name || '?').replace(/^@/, '').charAt(0).toUpperCase();
  return (
    <span className="ig-av" aria-hidden="true">
      {lead.foto && !falhou ? <img src={lead.foto} alt="" referrerPolicy="no-referrer" onError={() => setFalhou(true)} /> : letra}
    </span>
  );
}

export default function InstagramLeads({ onNavigate, onNotificar }) {
  const api = window.electronAPI;
  const noPc = typeof api?.instagramExtrair === 'function';
  const [apify, setApify] = useState({ carregando: noPc, temToken: false });
  const [progresso, setProgresso] = useState('');
  const [ocupado, setOcupado] = useState('');

  // Buscador
  const [palavra, setPalavra] = useState('');
  const [tipo, setTipo] = useState('posts');
  const [pais, setPais] = useState('BR');
  const [qtdBusca, setQtdBusca] = useState(20);
  const [achados, setAchados] = useState(null);

  // Extração por link
  const [link, setLink] = useState('');
  const [limite, setLimite] = useState(200);
  const [comPerfis, setComPerfis] = useState(true);
  const [erroLink, setErroLink] = useState('');

  // Fila do Direct
  const [cfg, setCfg] = useState(() => leJson(CHAVE_CFG, { oferta: 'site', tema: '', meta: 20, soComercial: true, extracao: '' }));
  const [log, setLog] = useState(() => leJson(CHAVE_LOG, {}));
  const [leads, setLeads] = useState(() => readLocalArray('sigma_leads'));
  const [selecionado, setSelecionado] = useState(null);
  const [versoes, setVersoes] = useState({});
  const [editados, setEditados] = useState({});
  const [copiado, setCopiado] = useState('');
  const nomeAssina = leJson('sigma_abordagem_cfg', { nome: '' }).nome;

  useEffect(() => { try { localStorage.setItem(CHAVE_CFG, JSON.stringify(cfg)); } catch { /* sem espaço */ } }, [cfg]);
  useEffect(() => {
    const releLog = () => setLog(leJson(CHAVE_LOG, {}));
    const releLeads = () => setLeads(readLocalArray('sigma_leads'));
    window.addEventListener('sigma:abordagem-log', releLog);
    window.addEventListener('sigma:leads-updated', releLeads);
    window.addEventListener('storage', releLeads);
    return () => {
      window.removeEventListener('sigma:abordagem-log', releLog);
      window.removeEventListener('sigma:leads-updated', releLeads);
      window.removeEventListener('storage', releLeads);
    };
  }, []);
  useEffect(() => {
    if (!noPc) return undefined;
    api.apifyStatus().then((r) => setApify({ carregando: false, temToken: Boolean(r?.temToken), usuario: r?.usuario || '' }))
      .catch(() => setApify({ carregando: false, temToken: false }));
    return api.onInstagramProgresso?.((p) => setProgresso(p?.texto || ''));
  }, [api, noPc]);

  const gravaLog = (novo) => {
    setLog(novo);
    try { localStorage.setItem(CHAVE_LOG, JSON.stringify(novo)); } catch { /* sem espaço */ }
    window.dispatchEvent(new Event('sigma:abordagem-log'));
  };

  const extracoes = useMemo(() => readLocalArray('sigma_searches').filter((s) => s?.source === 'instagram')
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)), [leads]);

  /* ---------- Buscar ---------- */
  const buscar = async (e) => {
    e?.preventDefault();
    if (!noPc || ocupado) return;
    setOcupado('busca');
    setProgresso('');
    setAchados(null);
    const r = await api.instagramBuscar({ palavra, tipo, pais, limite: qtdBusca });
    setOcupado('');
    setProgresso('');
    if (!r?.success) {
      if (!r?.cancelada) onNotificar?.({ type: 'error', title: 'Busca no Instagram', message: r?.error || 'A busca não terminou.' });
      return;
    }
    setAchados(tipo === 'anuncios'
      ? { tipo, palavra, lista: anunciantesDaBusca(r.itens) }
      : { tipo, palavra, lista: postsDaBusca(r.itens) });
  };

  const usarPost = (url) => {
    setLink(url);
    setErroLink('');
    document.getElementById('igLink')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const postsDoAnunciante = (nome) => {
    setTipo('posts');
    setPalavra(nome);
    setAchados(null);
  };

  /* ---------- Extrair ---------- */
  const extrair = async (e) => {
    e?.preventDefault();
    if (!noPc || ocupado) return;
    const url = normalizaUrlPost(link);
    if (!url) { setErroLink('Cole o link de um post ou reel (instagram.com/p/... ou /reel/...).'); return; }
    setErroLink('');
    setOcupado('extracao');
    setProgresso('');
    const r = await api.instagramExtrair({ url, limite, comPerfis });
    setOcupado('');
    setProgresso('');
    if (!r?.success) {
      if (!r?.cancelada) onNotificar?.({ type: 'error', title: 'Extração do Instagram', message: r?.error || 'A extração não terminou.' });
      return;
    }
    const searchId = `insta_${Date.now()}`;
    const base = readLocalArray('sigma_leads');
    const { novos, repetidos } = leadsDaExtracao(r, base, { searchId, postUrl: url });
    const comerciais = novos.filter((l) => l.perfilComercial).length;
    if (novos.length) {
      localStorage.setItem('sigma_leads', JSON.stringify([...novos, ...base]));
      const buscas = readLocalArray('sigma_searches');
      localStorage.setItem('sigma_searches', JSON.stringify([...buscas, {
        id: searchId,
        query: url,
        label: `Instagram · comentários de ${url.replace('https://www.instagram.com/', '')}`,
        source: 'instagram',
        pais: 'BR',
        timestamp: Date.now(),
        encontrados: novos.length + repetidos,
        repetidos,
        comerciais,
        area: null,
      }]));
      window.dispatchEvent(new CustomEvent('sigma:leads-updated'));
      setLeads(readLocalArray('sigma_leads'));
      setCfg((c) => ({ ...c, extracao: searchId }));
    }
    setLink('');
    onNotificar?.({
      type: novos.length ? 'success' : 'info',
      title: 'Extração do Instagram concluída',
      message: novos.length
        ? `${novos.length} pessoa${novos.length === 1 ? '' : 's'} nova${novos.length === 1 ? '' : 's'} na base${comPerfis ? `, ${comerciais} com perfil comercial` : ''}${repetidos ? `. ${repetidos} já estava${repetidos === 1 ? '' : 'm'} na base` : ''}.`
        : (repetidos ? 'Todo mundo que comentou já estava na base.' : 'O post não tem comentários que dê para ler.'),
    });
  };

  const cancelar = () => api?.instagramExtrairCancelar?.();

  /* ---------- Fila do Direct ---------- */
  const fila = useMemo(() => filaDirect(leads, log, { soComercial: cfg.soComercial, searchId: cfg.extracao }), [leads, log, cfg.soComercial, cfg.extracao]);
  const feitosHoje = directsHoje(log);
  const restante = Math.max(0, cfg.meta - feitosHoje);
  const visiveis = fila.slice(0, restante);
  const atual = visiveis.find((l) => l.id === selecionado) || visiveis[0] || null;
  const textoDe = (lead) => (editados[lead.id] !== undefined
    ? editados[lead.id]
    : mensagemDirect(lead, { nome: nomeAssina, oferta: cfg.oferta, tema: cfg.tema }, versoes[lead.id] || 0));

  const copiaEAbre = async (lead) => {
    try { await navigator.clipboard.writeText(textoDe(lead)); setCopiado(lead.id); } catch { setCopiado(''); }
    abre(linkDirect(lead.usuarioInstagram));
  };
  const marca = (lead, status) => {
    const pos = visiveis.indexOf(lead);
    const proximo = visiveis[pos + 1] || visiveis[pos - 1] || null;
    gravaLog({ ...leJson(CHAVE_LOG, {}), [String(lead.id)]: registroDirect(lead, status, textoDe(lead), cfg) });
    setSelecionado(proximo?.id || null);
    setCopiado('');
  };

  const semToken = noPc && !apify.carregando && !apify.temToken;
  const custoAtual = tipo === 'anuncios' ? custoBusca('anuncios', qtdBusca) : custoBusca('posts', qtdBusca);

  return (
    <section className="cfg-view ig-view">
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 20 }}>Leads do Instagram</h1>
          <p className="cfg-tagline">
            Ache posts e anúncios do assunto que você vende, puxe quem comentou e aborde pelo Direct.
            A mensagem fica pronta; quem envia é você, para a conta não ser bloqueada.
          </p>
        </div>
      </div>

      {!noPc && (
        <div className="ea-aviso">A busca e a extração rodam no Prospector do computador. Aqui na web dá para trabalhar a Fila do Direct.</div>
      )}
      {semToken && (
        <div className="ea-aviso ig-aviso-token">
          Para buscar e extrair, cole o token da sua conta Apify em Configurações (é de lá que saem os extratores).
          <button type="button" className="btn btn-sm" onClick={() => onNavigate?.('settings')}><Settings size={14} strokeWidth={2} /> Abrir Configurações</button>
        </div>
      )}

      {noPc && (
        <div className="ig-grade">
          <form className="cfg-card ig-card" onSubmit={buscar}>
            <div className="cfg-card-head">
              <span className="cfg-icone ig-icone"><Search size={18} strokeWidth={2} /></span>
              <div>
                <h2>Buscar por assunto</h2>
                <p>Digite o que você vende, por exemplo "app de colorização", e veja quem posta ou anuncia sobre isso.</p>
              </div>
            </div>
            <div className="ig-tipos" role="radiogroup" aria-label="Onde buscar">
              <button type="button" role="radio" aria-checked={tipo === 'posts'} className={`ig-tipo${tipo === 'posts' ? ' on' : ''}`} onClick={() => setTipo('posts')}>
                <Instagram size={15} strokeWidth={2} /> Posts e reels
              </button>
              <button type="button" role="radio" aria-checked={tipo === 'anuncios'} className={`ig-tipo${tipo === 'anuncios' ? ' on' : ''}`} onClick={() => setTipo('anuncios')}>
                <Megaphone size={15} strokeWidth={2} /> Anúncios
              </button>
            </div>
            <div className="ig-linha-campos">
              <div className="field ig-cresce">
                <label htmlFor="igPalavra">Assunto</label>
                <input id="igPalavra" value={palavra} onChange={(e) => setPalavra(e.target.value)} placeholder="app de colorização" autoComplete="off" />
              </div>
              {tipo === 'anuncios' && (
                <div className="field">
                  <label htmlFor="igPais">País</label>
                  <select id="igPais" value={pais} onChange={(e) => setPais(e.target.value)}>
                    <option value="BR">Brasil</option>
                    <option value="US">EUA</option>
                  </select>
                </div>
              )}
              <div className="field">
                <label htmlFor="igQtdBusca">Resultados</label>
                <select id="igQtdBusca" value={qtdBusca} onChange={(e) => setQtdBusca(Number(e.target.value))}>
                  {LIMITES_BUSCA.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="ig-rodape">
              <span className="ig-custo">Custo no Apify: até {dolar(custoAtual)}</span>
              {ocupado === 'busca' ? (
                <button type="button" className="btn btn-ghost" onClick={cancelar}><X size={14} strokeWidth={2} /> Cancelar</button>
              ) : (
                <button type="submit" className="btn btn-primary" disabled={!!ocupado || semToken || palavra.trim().length < 3}>
                  <Search size={14} strokeWidth={2} /> Buscar
                </button>
              )}
            </div>
            {ocupado === 'busca' && <p className="ig-progresso"><Loader size={14} className="cfg-girando" /> {progresso || 'Começando...'}</p>}
          </form>

          <form className="cfg-card ig-card" onSubmit={extrair}>
            <div className="cfg-card-head">
              <span className="cfg-icone ig-icone"><Link2 size={18} strokeWidth={2} /></span>
              <div>
                <h2>Extrair quem comentou</h2>
                <p>Cole o link de um post ou reel. Quem comentou entra na Base de Leads e na Fila do Direct.</p>
              </div>
            </div>
            <div className={`field${erroLink ? ' invalid' : ''}`}>
              <label htmlFor="igLink">Link do post</label>
              <input id="igLink" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.instagram.com/p/..." autoComplete="off" spellCheck="false" />
              <span className="field-err">{erroLink}</span>
            </div>
            <div className="ig-linha-campos">
              <div className="field">
                <label htmlFor="igLimite">Até quantos comentários</label>
                <select id="igLimite" value={limite} onChange={(e) => setLimite(Number(e.target.value))}>
                  {LIMITES_EXTRACAO.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <label className={`ea-chave ig-chave${comPerfis ? ' on' : ''}`}>
                <input type="checkbox" checked={comPerfis} onChange={(e) => setComPerfis(e.target.checked)} />
                <span className="ea-chave-trilho" aria-hidden="true"><span /></span>
                Buscar o perfil de cada pessoa
              </label>
            </div>
            <p className="ig-ajuda">O perfil diz quem é comercial, a categoria, o site e o contato da bio. Sem ele, vem só o usuário e o comentário.</p>
            <div className="ig-rodape">
              <span className="ig-custo">Custo no Apify: até {dolar(custoEstimado(limite, comPerfis))}</span>
              {ocupado === 'extracao' ? (
                <button type="button" className="btn btn-ghost" onClick={cancelar}><X size={14} strokeWidth={2} /> Cancelar</button>
              ) : (
                <button type="submit" className="btn btn-primary" disabled={!!ocupado || semToken || !link.trim()}>
                  <Link2 size={14} strokeWidth={2} /> Extrair
                </button>
              )}
            </div>
            {ocupado === 'extracao' && <p className="ig-progresso"><Loader size={14} className="cfg-girando" /> {progresso || 'Começando...'}</p>}
          </form>
        </div>
      )}

      {achados && (
        <div className="cfg-card ig-achados">
          <div className="ig-achados-topo">
            <h2>{achados.lista.length} {achados.tipo === 'anuncios' ? `anunciante${achados.lista.length === 1 ? '' : 's'}` : `post${achados.lista.length === 1 ? '' : 's'}`} para "{achados.palavra}"</h2>
            <button type="button" className="cot-icone-btn" onClick={() => setAchados(null)} aria-label="Fechar resultados"><X size={15} strokeWidth={2} /></button>
          </div>
          {achados.tipo === 'anuncios' && (
            <p className="ig-ajuda">A Biblioteca de Anúncios não mostra os comentários dos anúncios. Quem anuncia já é um bom lead; para pegar quem comenta, busque os posts do anunciante.</p>
          )}
          {!achados.lista.length && <p className="ig-ajuda">Nada encontrado. Tente uma palavra mais curta ou outro jeito de dizer o mesmo assunto.</p>}
          <ul className="ig-lista-achados">
            {achados.tipo === 'posts' ? achados.lista.map((p) => (
              <li key={p.url}>
                <div className="ig-achado-txt">
                  <b>@{p.autor}{p.autorNome ? <span> · {p.autorNome}</span> : null}</b>
                  <span className="ig-legenda">{p.legenda || 'Sem legenda'}</span>
                  <span className="ig-meta">
                    <MessageSquareText size={13} strokeWidth={2} /> {mil(p.comentarios)} comentário{p.comentarios === 1 ? '' : 's'} · {mil(p.curtidas)} curtidas{p.quando ? ` · ${dataCurta(p.quando)}` : ''}{p.reel ? ' · reel' : ''}
                  </span>
                </div>
                <div className="ig-achado-acoes">
                  <button type="button" className="btn btn-sm" onClick={() => abre(p.url)}><ExternalLink size={13} strokeWidth={2} /> Ver</button>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => usarPost(p.url)} disabled={!p.comentarios}>Extrair comentários</button>
                </div>
              </li>
            )) : achados.lista.map((a) => (
              <li key={a.id}>
                <div className="ig-achado-txt">
                  <b>{a.nome}<span> · {a.anuncios} anúncio{a.anuncios === 1 ? '' : 's'} ativo{a.anuncios === 1 ? '' : 's'}</span></b>
                  {a.titulo && <span className="ig-titulo-anuncio">{a.titulo}</span>}
                  <span className="ig-legenda">{a.texto || 'Anúncio sem texto'}</span>
                  <span className="ig-meta">{a.inicio ? `Rodando desde ${dataCurta(a.inicio)}` : ''}{a.destino ? ` · leva para ${a.destino.replace(/^https?:\/\//, '').split('/')[0]}` : ''}</span>
                </div>
                <div className="ig-achado-acoes">
                  {a.anuncioId && <button type="button" className="btn btn-sm" onClick={() => abre(linkAnuncio(a.anuncioId))}><ExternalLink size={13} strokeWidth={2} /> Ver anúncio</button>}
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => postsDoAnunciante(a.nome)}>Buscar posts dele</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="cfg-card ig-direct">
        <div className="ig-direct-topo">
          <div className="cfg-card-head">
            <span className="cfg-icone ig-icone"><MessageSquareText size={18} strokeWidth={2} /></span>
            <div>
              <h2>Fila do Direct</h2>
              <p>Copie a mensagem, abra o Direct da pessoa, cole e envie. Depois marque Enviei.</p>
            </div>
          </div>
          <div className="ig-contador" aria-label={`${feitosHoje} de ${cfg.meta} hoje`}>
            <b><Contagem valor={feitosHoje} /><span className="ig-meta-dia">/{cfg.meta}</span></b>
            <span>hoje</span>
          </div>
        </div>

        <div className="ig-filtros">
          <div className="field">
            <label htmlFor="igOferta">O que oferecer</label>
            <select id="igOferta" value={cfg.oferta} onChange={(e) => setCfg((c) => ({ ...c, oferta: e.target.value }))}>
              {OFERTAS_DIRECT.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div className="field ig-cresce">
            <label htmlFor="igTema">Assunto do post (opcional)</label>
            <input id="igTema" value={cfg.tema} onChange={(e) => setCfg((c) => ({ ...c, tema: e.target.value }))} placeholder="colorização de fotos" autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="igExtracao">Extração</label>
            <select id="igExtracao" value={cfg.extracao} onChange={(e) => setCfg((c) => ({ ...c, extracao: e.target.value }))}>
              <option value="">Todas</option>
              {extracoes.map((x) => <option key={x.id} value={x.id}>{dataCurta(x.timestamp)} · {String(x.query || '').replace('https://www.instagram.com/', '')}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="igMeta">Meta por dia</label>
            <select id="igMeta" value={cfg.meta} onChange={(e) => setCfg((c) => ({ ...c, meta: Number(e.target.value) }))}>
              {METAS_DIRECT.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <label className={`ea-chave ig-chave${cfg.soComercial ? ' on' : ''}`}>
            <input type="checkbox" checked={cfg.soComercial} onChange={(e) => setCfg((c) => ({ ...c, soComercial: e.target.checked }))} />
            <span className="ea-chave-trilho" aria-hidden="true"><span /></span>
            Só perfil comercial
          </label>
        </div>

        {!nomeAssina && <p className="ig-ajuda ig-alerta">Preencha o nome de quem assina na Fila do dia (Ajustes) para a mensagem sair com o seu nome.</p>}

        {!visiveis.length ? (
          <div className="ig-vazio">
            <b>{restante === 0 ? 'Meta de hoje feita' : 'Ninguém na fila'}</b>
            <span>
              {restante === 0
                ? `Você mandou ${feitosHoje} Directs hoje. Amanhã a fila volta.`
                : fila.length === 0 && cfg.soComercial
                  ? 'Sem perfis comerciais pendentes. Desligue "Só perfil comercial" ou extraia outro post.'
                  : 'Extraia os comentários de um post para começar.'}
            </span>
          </div>
        ) : (
          <div className="ig-fila">
            <ul className="ig-fila-lista" aria-label="Pessoas na fila">
              {visiveis.map((l) => (
                <li key={l.id}>
                  <button type="button" className={`ig-pessoa${atual?.id === l.id ? ' on' : ''}`} onClick={() => { setSelecionado(l.id); setCopiado(''); }}>
                    <Avatar lead={l} />
                    <span className="ig-pessoa-txt">
                      <b>@{l.usuarioInstagram}</b>
                      <span>{l.name !== `@${l.usuarioInstagram}` ? l.name : l.category}</span>
                    </span>
                    {l.perfilComercial ? <Store size={14} strokeWidth={2} className="ig-selo-com" aria-label="Perfil comercial" /> : <UserRound size={14} strokeWidth={2} className="ig-selo-pes" aria-label="Perfil pessoal" />}
                  </button>
                </li>
              ))}
            </ul>

            {atual && (
              <div className="ig-detalhe">
                <div className="ig-detalhe-cab">
                  <Avatar lead={atual} />
                  <div>
                    <b>{atual.name}</b>
                    <span>@{atual.usuarioInstagram} · {atual.category}{atual.seguidores ? ` · ${mil(atual.seguidores)} seguidores` : ''}</span>
                  </div>
                  <button type="button" className="btn btn-sm" onClick={() => abre(atual.instagram)}><ExternalLink size={13} strokeWidth={2} /> Perfil</button>
                </div>
                {atual.bio && <p className="ig-bio">{atual.bio}</p>}
                {atual.comentarios?.length > 0 && (
                  <p className="ig-comentou"><span>Comentou:</span> "{atual.comentarios[0]}"</p>
                )}
                {(atual.website || atual.phone || atual.email) && (
                  <p className="ig-contatos">{[atual.website && 'tem site', atual.phone && `tel. ${atual.phone}`, atual.email].filter(Boolean).join(' · ')}</p>
                )}
                <textarea
                  className="ig-mensagem"
                  value={textoDe(atual)}
                  onChange={(e) => setEditados((m) => ({ ...m, [atual.id]: e.target.value }))}
                  rows={7}
                  aria-label="Mensagem do Direct"
                />
                <div className="ig-acoes">
                  <button type="button" className="btn btn-primary" onClick={() => copiaEAbre(atual)}>
                    {copiado === atual.id ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
                    {copiado === atual.id ? 'Copiada. Cole no Direct' : 'Copiar e abrir o Direct'}
                  </button>
                  <button type="button" className={`btn ig-enviei${copiado === atual.id ? ' pronto' : ''}`} onClick={() => marca(atual, 'enviada')}>
                    <Check size={14} strokeWidth={2} /> Enviei
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => marca(atual, 'pulada')}>
                    <SkipForward size={14} strokeWidth={2} /> Pular
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => {
                    setVersoes((v) => ({ ...v, [atual.id]: (v[atual.id] || 0) + 1 }));
                    setEditados((m) => { const { [atual.id]: _fora, ...resto } = m; return resto; });
                  }}>
                    <RefreshCw size={14} strokeWidth={2} /> Outra versão
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
