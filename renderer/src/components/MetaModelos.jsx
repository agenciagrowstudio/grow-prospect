import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, RefreshCw, Plus, Trash2, Reply, ExternalLink, Loader, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Modelos de mensagem da API oficial da Meta, sem sair do app.
 *
 * A Meta só deixa a empresa iniciar conversa com modelo aprovado. Aqui dá
 * para ver a situação de cada modelo (aprovado, em análise, rejeitado e o
 * motivo) e criar um novo, com a prévia no formato do WhatsApp. As regras
 * da Meta são conferidas no processo principal (whatsapp/meta-modelos.js)
 * antes de enviar; a tela só ajuda a não errar.
 */

const CATEGORIAS = [
  { id: 'MARKETING', nome: 'Marketing', dica: 'Abordagem, oferta, novidade. É a usada para prospectar.' },
  { id: 'UTILITY', nome: 'Utilidade', dica: 'Aviso sobre algo já combinado com o cliente (pedido, agendamento).' },
];
const IDIOMAS = [
  { id: 'pt_BR', nome: 'Português (Brasil)' },
  { id: 'en_US', nome: 'Inglês (EUA)' },
  { id: 'es', nome: 'Espanhol' },
];
const VAZIO = {
  nomeDigitado: '',
  categoria: 'MARKETING',
  idioma: 'pt_BR',
  cabecalho: '',
  corpo: '',
  exemplos: [],
  rodape: '',
  botoes: [],
};

// Mesmo formato do processo principal: minúsculas, sem acento, "_".
function nomeDoModelo(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 512);
}

function numerosDasVariaveis(texto) {
  return [...new Set([...String(texto || '').matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
}

function Previa({ m }) {
  const corpo = String(m.corpo || '').replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const ex = String(m.exemplos[Number(n) - 1] || '').trim();
    return ex || `{{${n}}}`;
  });
  return (
    <div className="mm-previa" aria-label="Prévia da mensagem">
      <div className="mm-balao">
        {m.cabecalho.trim() && <b className="mm-b-cab">{m.cabecalho}</b>}
        <p className="mm-b-corpo">{corpo || 'O texto da mensagem aparece aqui.'}</p>
        {m.rodape.trim() && <small className="mm-b-rod">{m.rodape}</small>}
        <span className="mm-b-hora">10:24</span>
      </div>
      {m.botoes.filter((b) => b.texto.trim()).map((b, i) => (
        <div key={i} className="mm-b-botao">
          {b.tipo === 'link' ? <ExternalLink size={14} strokeWidth={2} aria-hidden="true" /> : <Reply size={14} strokeWidth={2} aria-hidden="true" />}
          {b.texto}
        </div>
      ))}
    </div>
  );
}

export default function MetaModelos({ connectionId, onFechar, abaInicial = 'lista' }) {
  const api = typeof window !== 'undefined' ? window.whatsappAPI : null;
  const [aba, setAba] = useState(abaInicial);
  const [modelos, setModelos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erroLista, setErroLista] = useState('');
  const [m, setM] = useState(VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const carregar = useCallback(async () => {
    if (!api?.metaTemplatesAll) {
      setErroLista('Os modelos da Meta só aparecem no aplicativo de desktop.');
      return;
    }
    setCarregando(true);
    setErroLista('');
    try {
      const r = await api.metaTemplatesAll(connectionId);
      if (!r?.success) throw new Error(r?.error || 'Não foi possível ler os modelos.');
      setModelos(r.modelos || []);
    } catch (e) {
      setErroLista(e.message);
    } finally {
      setCarregando(false);
    }
  }, [api, connectionId]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onFechar]);

  const nome = nomeDoModelo(m.nomeDigitado);
  const vars = useMemo(() => numerosDasVariaveis(m.corpo), [m.corpo]);
  const muda = (campo) => (e) => setM((x) => ({ ...x, [campo]: e.target.value }));

  const insereVariavel = () => {
    const proxima = (vars[vars.length - 1] || 0) + 1;
    setM((x) => ({ ...x, corpo: `${x.corpo}${x.corpo && !x.corpo.endsWith(' ') ? ' ' : ''}{{${proxima}}}` }));
  };
  const mudaExemplo = (i, v) => setM((x) => {
    const exemplos = [...x.exemplos];
    exemplos[i] = v;
    return { ...x, exemplos };
  });
  const mudaBotao = (i, patch) => setM((x) => ({ ...x, botoes: x.botoes.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));

  const enviar = async () => {
    if (!api?.metaCreateTemplate) {
      setResultado({ ok: false, texto: 'Criar modelo só funciona no aplicativo de desktop.' });
      return;
    }
    setEnviando(true);
    setResultado(null);
    try {
      const r = await api.metaCreateTemplate(connectionId, {
        nome,
        categoria: m.categoria,
        idioma: m.idioma,
        cabecalho: m.cabecalho,
        corpo: m.corpo,
        rodape: m.rodape,
        exemplos: m.exemplos,
        botoes: m.botoes,
      });
      if (!r?.success) throw new Error(r?.error || 'A Meta recusou o modelo.');
      setResultado({ ok: true, texto: `"${nome}" enviado para análise. A Meta costuma responder em minutos, às vezes em até 24h.` });
      setM(VAZIO);
      setAba('lista');
      carregar();
    } catch (e) {
      setResultado({ ok: false, texto: e.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="overlay on" onClick={onFechar} style={{ display: 'grid' }}>
      <div className="modal mm-modal" role="dialog" aria-modal="true" aria-labelledby="mmTitulo" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head mm-head">
          <div>
            <div className="eyebrow">API oficial do WhatsApp</div>
            <h2 id="mmTitulo">Modelos da Meta</h2>
          </div>
          <button type="button" className="mm-fechar" onClick={onFechar} aria-label="Fechar"><X size={16} strokeWidth={2} /></button>
        </div>

        <div className="mm-abas" role="tablist">
          <button type="button" role="tab" aria-selected={aba === 'lista'} className={aba === 'lista' ? 'on' : ''} onClick={() => setAba('lista')}>
            Meus modelos {modelos.length ? `(${modelos.length})` : ''}
          </button>
          <button type="button" role="tab" aria-selected={aba === 'criar'} className={aba === 'criar' ? 'on' : ''} onClick={() => setAba('criar')}>
            <Plus size={14} strokeWidth={2} aria-hidden="true" /> Criar modelo
          </button>
        </div>

        {resultado && (
          <div className={`mm-resultado ${resultado.ok ? 'ok' : 'erro'}`} role="status">
            {resultado.ok ? <CheckCircle2 size={16} strokeWidth={2} /> : <AlertCircle size={16} strokeWidth={2} />}
            <span>{resultado.texto}</span>
          </div>
        )}

        {aba === 'lista' && (
          <div className="mm-corpo">
            <div className="mm-lista-topo">
              <span className="cfg-dica">Aprovado pode ser usado em campanha. Em análise, aguarde a Meta.</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={carregar} disabled={carregando}>
                {carregando ? <Loader size={14} className="cfg-girando" /> : <RefreshCw size={14} strokeWidth={2} />} Atualizar
              </button>
            </div>
            {erroLista && <div className="mm-resultado erro"><AlertCircle size={16} /> <span>{erroLista}</span></div>}
            {!erroLista && !carregando && !modelos.length && (
              <p className="mm-vazio">Nenhum modelo na conta ainda. Crie o primeiro na aba ao lado.</p>
            )}
            <div className="mm-lista">
              {modelos.map((t) => (
                <article key={`${t.nome}-${t.idioma}`} className="mm-item">
                  <div className="mm-item-topo">
                    <b>{t.nome}</b>
                    <span className={`mm-situacao mm-${t.situacao}`}>{t.rotuloSituacao}</span>
                  </div>
                  <span className="mm-item-meta">
                    {IDIOMAS.find((i) => i.id === t.idioma)?.nome || t.idioma} · {t.categoria === 'MARKETING' ? 'Marketing' : t.categoria === 'UTILITY' ? 'Utilidade' : t.categoria}
                    {t.variaveis ? ` · ${t.variaveis} variáve${t.variaveis === 1 ? 'l' : 'is'}` : ''}
                  </span>
                  <p className="mm-item-texto">{t.corpo}</p>
                  {t.motivo && <p className="mm-item-motivo">Motivo: {t.motivo}</p>}
                </article>
              ))}
            </div>
          </div>
        )}

        {aba === 'criar' && (
          <div className="mm-corpo mm-criar">
            <div className="mm-form">
              <div className="field">
                <label htmlFor="mmNome">Nome do modelo</label>
                <input id="mmNome" value={m.nomeDigitado} onChange={muda('nomeDigitado')} placeholder="Ex.: abordagem limpeza Orlando" autoComplete="off" />
                {nome && <span className="cfg-dica">Vai como: <code>{nome}</code></span>}
              </div>
              <div className="mm-linha">
                <div className="field">
                  <label htmlFor="mmCat">Categoria</label>
                  <select id="mmCat" value={m.categoria} onChange={muda('categoria')}>
                    {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  <span className="cfg-dica">{CATEGORIAS.find((c) => c.id === m.categoria)?.dica}</span>
                </div>
                <div className="field">
                  <label htmlFor="mmIdioma">Idioma</label>
                  <select id="mmIdioma" value={m.idioma} onChange={muda('idioma')}>
                    {IDIOMAS.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
                  </select>
                  <span className="cfg-dica">Para americanos, crie em inglês.</span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="mmCab">Cabeçalho (opcional)</label>
                <input id="mmCab" value={m.cabecalho} onChange={muda('cabecalho')} maxLength={60} placeholder="Ex.: Grow+ Marketing" />
              </div>
              <div className="field">
                <label htmlFor="mmCorpo">Texto da mensagem</label>
                <textarea id="mmCorpo" rows={5} value={m.corpo} onChange={muda('corpo')} maxLength={1024}
                  placeholder="Ex.: Oi {{1}}, vi que a {{2}} ainda não tem site. Posso te mostrar uma ideia rápida?" />
                <div className="mm-corpo-rodape">
                  <button type="button" className="btn btn-sm btn-ghost" onClick={insereVariavel}>
                    <Plus size={13} strokeWidth={2} /> Variável
                  </button>
                  <span className="cfg-dica">{m.corpo.length}/1024 · variável é o que muda por lead (nome, empresa)</span>
                </div>
              </div>
              {vars.length > 0 && (
                <div className="field">
                  <label>Exemplos (a Meta exige um para cada variável)</label>
                  <div className="mm-exemplos">
                    {vars.map((n) => (
                      <label key={n} className="mm-exemplo">
                        <span>{`{{${n}}}`}</span>
                        <input value={m.exemplos[n - 1] || ''} onChange={(e) => mudaExemplo(n - 1, e.target.value)} placeholder={n === 1 ? 'Maria' : 'Clean Co'} />
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="field">
                <label htmlFor="mmRod">Rodapé (opcional)</label>
                <input id="mmRod" value={m.rodape} onChange={muda('rodape')} maxLength={60} placeholder="Ex.: Responda SAIR para não receber mais" />
              </div>
              <div className="field">
                <label>Botões (opcional, até 3)</label>
                {m.botoes.map((b, i) => (
                  <div key={i} className="mm-botao-linha">
                    <select value={b.tipo} onChange={(e) => mudaBotao(i, { tipo: e.target.value })} aria-label={`Tipo do botão ${i + 1}`}>
                      <option value="resposta">Resposta rápida</option>
                      <option value="link">Link</option>
                    </select>
                    <input value={b.texto} maxLength={25} onChange={(e) => mudaBotao(i, { texto: e.target.value })} placeholder="Texto do botão" aria-label={`Texto do botão ${i + 1}`} />
                    {b.tipo === 'link' && (
                      <input value={b.url} onChange={(e) => mudaBotao(i, { url: e.target.value })} placeholder="https://..." aria-label={`Link do botão ${i + 1}`} />
                    )}
                    <button type="button" className="mm-icone" onClick={() => setM((x) => ({ ...x, botoes: x.botoes.filter((_, j) => j !== i) }))} aria-label={`Tirar botão ${i + 1}`}>
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                ))}
                {m.botoes.length < 3 && (
                  <button type="button" className="btn btn-sm btn-ghost mm-add" onClick={() => setM((x) => ({ ...x, botoes: [...x.botoes, { tipo: 'resposta', texto: '', url: '' }] }))}>
                    <Plus size={13} strokeWidth={2} /> Botão
                  </button>
                )}
              </div>
            </div>

            <aside className="mm-lado">
              <span className="mm-lado-titulo">Prévia</span>
              <Previa m={m} />
              <div className="mm-dicas">
                <b>Para não ser rejeitado</b>
                <ul>
                  <li>Abordagem e oferta vão em <b>Marketing</b>.</li>
                  <li>Não comece nem termine o texto com variável.</li>
                  <li>Exemplos realistas (um nome, uma empresa).</li>
                  <li>Sem pedir senha, cartão ou dado sensível.</li>
                </ul>
              </div>
            </aside>
          </div>
        )}

        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onFechar}>Fechar</button>
          <span style={{ flex: 1 }} />
          {aba === 'criar' && (
            <button type="button" className="btn btn-primary" onClick={enviar} disabled={enviando || !nome || !m.corpo.trim()}>
              {enviando ? <Loader size={15} className="cfg-girando" /> : null}
              {enviando ? 'Enviando…' : 'Enviar para aprovação'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
