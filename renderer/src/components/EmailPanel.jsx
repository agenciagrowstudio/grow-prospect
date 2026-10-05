import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Mail, Send, Pause, Play, Trash2, Check, X, Loader, Eye, EyeOff, Plus, Inbox,
} from 'lucide-react';
import { readLocalArray } from '../leadData';

/**
 * Tela de E-mail: conta Gmail (senha de app) e campanhas por público.
 *
 * Três públicos, cada um com o próprio texto: brasileiros no Brasil e
 * brasileiros nos EUA recebem em português, americanos recebem em inglês.
 */

const PUBLICOS = [
  { id: 'br', nome: 'Brasileiros no Brasil', curto: 'BR no Brasil', idioma: 'Português' },
  { id: 'brus', nome: 'Brasileiros nos EUA', curto: 'BR nos EUA', idioma: 'Português' },
  { id: 'us', nome: 'Americanos nos EUA', curto: 'Americanos', idioma: 'Inglês' },
];

// Mesma regra de email/publico.js. Mudou lá, muda aqui.
function publicoDoLead(lead) {
  const pais = String(lead?.pais || 'BR').toUpperCase();
  if (pais === 'BR') return 'br';
  return lead?.sinalBr?.nivel === 'alto' ? 'brus' : 'us';
}

const MODELOS_PADRAO = {
  br: {
    assunto: 'Uma ideia para a {{nome}}',
    corpo: 'Olá, equipe da {{nome}}!\n\nVi vocês no Google e notei uma oportunidade de trazer mais clientes pela internet.\n\nPosso mandar uma ideia rápida, sem compromisso?\n\nAbraço,',
    followUps: [
      'Oi! Só passando para saber se você viu minha mensagem acima. Faz sentido conversarmos?',
      'Última mensagem por aqui, prometo. Se não for o momento, sem problema. Se mudar de ideia, é só responder.',
    ],
  },
  brus: {
    assunto: 'Uma ideia para a {{nome}}',
    corpo: 'Oi, pessoal da {{nome}}!\n\nVi que vocês atendem a comunidade brasileira aí nos EUA. Eu ajudo negócios brasileiros nos EUA a conseguirem mais clientes pela internet.\n\nPosso mandar uma ideia rápida, sem compromisso?\n\nAbraço,',
    followUps: [
      'Oi! Só confirmando se minha mensagem chegou. Faz sentido conversarmos?',
      'Última mensagem por aqui. Se não for o momento, tudo certo. Se mudar de ideia, é só responder.',
    ],
  },
  us: {
    assunto: 'Quick idea for {{nome}}',
    corpo: 'Hi {{nome}} team,\n\nI came across your business on Google and noticed a few quick wins that could bring you more customers online.\n\nWould you be open to a short idea, no strings attached?\n\nBest,',
    followUps: [
      'Just bumping this up in case it got buried. Worth a quick chat?',
      "Last note from me. If the timing isn't right, no worries. Just reply if that changes.",
    ],
  },
};

const STATUS = {
  ready: 'Rascunho',
  running: 'Enviando',
  paused: 'Pausada',
  completed: 'Concluída',
};
const ESPERA = {
  fora_do_horario: 'Fora do horário',
  limite_24h: 'Limite de 24h',
  aguardando_follow_up: 'Aguardando follow-up',
};

function rotuloStatus(c) {
  if (c.status === 'running' && ESPERA[c.motivoEspera]) return ESPERA[c.motivoEspera];
  return STATUS[c.status] || c.status;
}

function lerLeadsComEmail() {
  return readLocalArray('sigma_leads')
    .filter((l) => /\S+@\S+\.\S+/.test(String(l?.email || '')))
    // O scraper grava até três e-mails, do melhor para o pior; vale o primeiro.
    .map((l, i) => ({
      ...l,
      email: String(l.email).split(/[\s,;]+/).find((e) => e.includes('@')) || l.email,
      _chave: String(l.id ?? `${l.name}-${i}`),
      _publico: publicoDoLead(l),
    }));
}

export default function EmailPanel() {
  const api = typeof window !== 'undefined' ? window.emailAPI : null;
  const [conta, setConta] = useState(null);
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [usados, setUsados] = useState(0);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState('');
  const [campanhas, setCampanhas] = useState([]);
  const [criando, setCriando] = useState(false);

  const carregar = useCallback(async () => {
    if (!api) return;
    const [s, l] = await Promise.all([api.getSettings(), api.list()]);
    if (s?.success) {
      setConta(s.settings);
      setUsados(s.usados24h || 0);
    }
    if (l?.success) setCampanhas(l.campanhas || []);
  }, [api]);

  useEffect(() => {
    carregar();
    if (!api?.onProgress) return undefined;
    return api.onProgress(() => carregar());
  }, [api, carregar]);

  const acao = async (nome, fn, okMsg) => {
    setOcupado(nome);
    setAviso(null);
    try {
      const r = await fn();
      if (r && r.success === false) throw new Error(r.error);
      if (okMsg) setAviso({ ok: true, texto: okMsg });
      await carregar();
      return r;
    } catch (e) {
      setAviso({ ok: false, texto: e?.message || 'Falhou.' });
      return null;
    } finally {
      setOcupado('');
    }
  };

  const salvarConta = () => acao('salvar', async () => {
    const r = await api.saveSettings({ ...conta, senha });
    if (r?.success) setSenha('');
    return r;
  }, 'Conta salva.');

  const testarConta = () => acao('testar', async () => {
    const salvo = await api.saveSettings({ ...conta, senha });
    if (!salvo?.success) return salvo;
    setSenha('');
    return api.test();
  }, 'Conexão com o Gmail ok: envio e leitura de respostas funcionando.');

  if (!api) {
    return (
      <section className="cfg-view email-view">
        <div className="cfg-card"><p>O módulo de e-mail só funciona no aplicativo desktop.</p></div>
      </section>
    );
  }

  const set = (campo) => (e) => setConta((c) => ({ ...c, [campo]: e.target.value }));

  return (
    <section className="settings-open-design-view cfg-view email-view">
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 20 }}>E-mail</h1>
          <p className="cfg-tagline">
            Abordagem por e-mail pelo seu Gmail, com texto em português para brasileiros e em inglês para americanos.
          </p>
        </div>
      </div>

      {aviso && (
        <div className={`cfg-resultado ${aviso.ok ? 'ok' : 'erro'}`}>
          {aviso.ok ? <Check size={15} strokeWidth={2} /> : <X size={15} strokeWidth={2} />}
          <span>{aviso.texto}</span>
        </div>
      )}

      {conta && (
        <div className="cfg-card">
          <div className="cfg-card-head">
            <span className="cfg-icone"><Mail size={18} strokeWidth={1.5} /></span>
            <div>
              <h2>Conta Gmail</h2>
              <p>
                Use uma senha de app, não a senha normal. No Google: Conta, Segurança, ative a
                verificação em duas etapas e depois gere uma "Senha de app". A senha fica cifrada nesta máquina.
              </p>
            </div>
          </div>

          <div className="email-grade">
            <div className="field">
              <label htmlFor="emUser">E-mail do Gmail</label>
              <input id="emUser" type="email" autoComplete="off" value={conta.user || ''} onChange={set('user')} placeholder="voce@gmail.com" />
            </div>
            <div className="field">
              <label htmlFor="emNome">Nome do remetente</label>
              <input id="emNome" autoComplete="off" value={conta.fromName || ''} onChange={set('fromName')} placeholder="Alex | Grow+" />
            </div>
            <div className="field">
              <label htmlFor="emSenha">Senha de app</label>
              <div className="cfg-chave">
                <input
                  id="emSenha"
                  type={verSenha ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck="false"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder={conta.temSenha ? 'guardada (deixe vazio para manter)' : 'xxxx xxxx xxxx xxxx'}
                />
                <button type="button" className="cfg-olho" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? 'Esconder a senha' : 'Mostrar a senha'}>
                  {verSenha ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                </button>
              </div>
            </div>
            <div className="field">
              <label htmlFor="emEnd">Endereço comercial (vai no rodapé)</label>
              <input id="emEnd" autoComplete="off" value={conta.endereco || ''} onChange={set('endereco')} placeholder="Rua, número, cidade, estado" />
              <span className="cfg-dica">Obrigatório pela lei anti-spam dos EUA (CAN-SPAM). Pode ser endereço comercial ou caixa postal.</span>
            </div>
            <div className="field">
              <label htmlFor="emLim">Limite a cada 24h</label>
              <select id="emLim" value={conta.limite24h} onChange={(e) => setConta((c) => ({ ...c, limite24h: Number(e.target.value) }))}>
                {[20, 40, 80, 150, 300, 450].map((n) => <option key={n} value={n}>{n} e-mails</option>)}
              </select>
              <span className="cfg-dica">Usados nas últimas 24h: {usados}. Conta nova: comece com 20 a 40 e suba aos poucos.</span>
            </div>
            <div className="field">
              <label>Horário de envio (dias úteis)</label>
              <div className="email-horario">
                <input type="time" value={conta.horarioInicio || '08:00'} onChange={set('horarioInicio')} aria-label="Início" />
                <span>até</span>
                <input type="time" value={conta.horarioFim || '18:00'} onChange={set('horarioFim')} aria-label="Fim" />
              </div>
              <span className="cfg-dica">No relógio deste computador. Para os EUA, lembre da diferença de fuso.</span>
            </div>
          </div>

          <div className="cfg-acoes">
            <button type="button" className="btn btn-primary" onClick={salvarConta} disabled={!!ocupado}>Salvar</button>
            <button type="button" className="btn btn-ghost" onClick={testarConta} disabled={!!ocupado || !conta.user}>
              {ocupado === 'testar' ? <Loader size={15} strokeWidth={1.5} className="cfg-girando" /> : null}
              {ocupado === 'testar' ? 'Testando…' : 'Testar conexão'}
            </button>
          </div>
        </div>
      )}

      <div className="cfg-card">
        <div className="cfg-card-head email-cab">
          <span className="cfg-icone"><Send size={18} strokeWidth={1.5} /></span>
          <div style={{ flex: 1 }}>
            <h2>Campanhas</h2>
            <p>Um envio por vez, com intervalo variado. Quem responde, pede para sair ou tem o e-mail devolvido sai da fila sozinho.</p>
          </div>
          <div className="cfg-acoes">
            <button type="button" className="btn btn-ghost" onClick={() => acao('respostas', () => api.checkReplies(), 'Caixa de entrada verificada.')} disabled={!!ocupado}>
              {ocupado === 'respostas' ? <Loader size={15} strokeWidth={1.5} className="cfg-girando" /> : <Inbox size={15} strokeWidth={1.5} />}
              Verificar respostas
            </button>
            {!criando && (
              <button type="button" className="btn btn-primary" onClick={() => setCriando(true)}>
                <Plus size={15} strokeWidth={2} /> Nova campanha
              </button>
            )}
          </div>
        </div>

        {criando && (
          <NovaCampanha
            onCancelar={() => setCriando(false)}
            onCriar={async (dados) => {
              const r = await acao('criar', () => api.create(dados), 'Campanha criada. Confira e clique em Iniciar.');
              if (r?.success) setCriando(false);
            }}
            ocupado={ocupado === 'criar'}
          />
        )}

        {!campanhas.length && !criando && (
          <p className="email-vazio">Nenhuma campanha ainda. Os leads com e-mail da Base de Leads aparecem ao criar uma.</p>
        )}

        <div className="email-lista">
          {campanhas.map((c) => (
            <div key={c.id} className="email-camp">
              <div className="email-camp-topo">
                <div>
                  <b>{c.nome}</b>
                  <span className={`email-status st-${c.status}`}>{rotuloStatus(c)}</span>
                </div>
                <div className="cfg-acoes">
                  {c.status === 'running' ? (
                    <button type="button" className="btn btn-ghost btn-compact" onClick={() => acao('p' + c.id, () => api.pause(c.id))}>
                      <Pause size={14} strokeWidth={1.5} /> Pausar
                    </button>
                  ) : c.status !== 'completed' ? (
                    <button type="button" className="btn btn-primary btn-compact" onClick={() => acao('i' + c.id, () => api.start(c.id), 'Campanha iniciada.')}>
                      <Play size={14} strokeWidth={1.5} /> Iniciar
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact"
                    aria-label="Excluir campanha"
                    onClick={() => {
                      if (window.confirm(`Excluir a campanha "${c.nome}"? O histórico dela some.`)) acao('x' + c.id, () => api.remove(c.id));
                    }}
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <div className="email-barra" aria-hidden="true">
                <span style={{ width: `${c.total ? (c.enviados / c.total) * 100 : 0}%` }} />
              </div>
              <div className="email-numeros">
                <span>{c.enviados}/{c.total} enviados</span>
                <span className="n-resp">{c.respondidos} responderam</span>
                {c.followUp?.ativo && <span>{c.followUps} follow-ups</span>}
                {c.descadastrados > 0 && <span className="n-alerta">{c.descadastrados} pediram para sair</span>}
                {c.voltaram > 0 && <span className="n-alerta">{c.voltaram} voltaram</span>}
                {c.falhas > 0 && <span className="n-erro">{c.falhas} falharam</span>}
              </div>
              <div className="email-publicos">
                {PUBLICOS.filter((p) => c.porPublico?.[p.id]).map((p) => (
                  <span key={p.id} className={`email-pub pub-${p.id}`}>{p.curto}: {c.porPublico[p.id]}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NovaCampanha({ onCancelar, onCriar, ocupado }) {
  const leads = useMemo(() => lerLeadsComEmail(), []);
  const [nome, setNome] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState(() => new Set());
  const [modelos, setModelos] = useState(MODELOS_PADRAO);
  const [aba, setAba] = useState('br');
  const [followUpAtivo, setFollowUpAtivo] = useState(false);
  const [dias, setDias] = useState([3, 7]);
  const [intervaloS, setIntervaloS] = useState(90);
  const [abordados, setAbordados] = useState({});

  // Quem já recebeu e-mail ou WhatsApp em outra campanha, para não abordar de novo sem querer.
  useEffect(() => {
    if (!leads.length || !window.emailAPI?.jaAbordados) return;
    window.emailAPI.jaAbordados(leads.map((l) => l.phone).filter(Boolean), leads.map((l) => l.email)).then((r) => {
      if (!r?.success) return;
      const mapa = {};
      for (const l of leads) {
        const hit = r.porEmail[String(l.email).toLowerCase()] || (l.phone && r.porTelefone[l.phone]);
        if (hit) mapa[l._chave] = hit;
      }
      setAbordados(mapa);
    });
  }, [leads]);

  const contagem = useMemo(() => {
    const n = { todos: leads.length, br: 0, brus: 0, us: 0 };
    leads.forEach((l) => { n[l._publico] += 1; });
    return n;
  }, [leads]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return leads.filter((l) => (filtro === 'todos' || l._publico === filtro)
      && (!q || `${l.name} ${l.email} ${l.category || ''}`.toLowerCase().includes(q)));
  }, [leads, filtro, busca]);

  const escolhidos = leads.filter((l) => selecionados.has(l._chave));
  const escolhidosJaAbordados = escolhidos.filter((l) => abordados[l._chave]);
  const tirarAbordados = () => setSelecionados((prev) => {
    const prox = new Set(prev);
    escolhidosJaAbordados.forEach((l) => prox.delete(l._chave));
    return prox;
  });
  const publicosEscolhidos = PUBLICOS.filter((p) => escolhidos.some((l) => l._publico === p.id));
  const abaAtual = publicosEscolhidos.some((p) => p.id === aba) ? aba : publicosEscolhidos[0]?.id || 'br';
  const modelo = modelos[abaAtual];

  const alterna = (chave) => setSelecionados((prev) => {
    const prox = new Set(prev);
    if (prox.has(chave)) prox.delete(chave); else prox.add(chave);
    return prox;
  });
  const todosVisiveis = visiveis.length > 0 && visiveis.every((l) => selecionados.has(l._chave));
  const alternaVisiveis = () => setSelecionados((prev) => {
    const prox = new Set(prev);
    visiveis.forEach((l) => (todosVisiveis ? prox.delete(l._chave) : prox.add(l._chave)));
    return prox;
  });

  const mudaModelo = (campo, valor, indice) => setModelos((m) => {
    const atual = { ...m[abaAtual] };
    if (campo === 'followUps') {
      atual.followUps = [...atual.followUps];
      atual.followUps[indice] = valor;
    } else {
      atual[campo] = valor;
    }
    return { ...m, [abaAtual]: atual };
  });

  const criar = () => onCriar({
    nome: nome.trim() || `E-mail ${new Date().toLocaleDateString('pt-BR')}`,
    leads: escolhidos.map((l) => ({
      id: l._chave, name: l.name, email: l.email, category: l.category, website: l.website,
      address: l.address, pais: l.pais, sinalBr: l.sinalBr, publico: l._publico,
    })),
    modelos,
    followUpAtivo,
    followUpDias: dias,
    intervaloS,
  });

  return (
    <div className="email-nova">
      <div className="field">
        <label htmlFor="emCampNome">Nome da campanha</label>
        <input id="emCampNome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Restaurantes Orlando, outubro" />
      </div>

      <div className="field">
        <label>Leads com e-mail ({selecionados.size} escolhidos)</label>
        {!leads.length ? (
          <p className="email-vazio">Nenhum lead com e-mail na Base de Leads. Extraia ou importe leads primeiro.</p>
        ) : (
          <>
            <div className="email-filtros">
              <div className="cfg-provedores">
                {[{ id: 'todos', curto: 'Todos' }, ...PUBLICOS].map((p) => (
                  <button key={p.id} type="button" className={`cfg-provedor${filtro === p.id ? ' on' : ''}`} aria-pressed={filtro === p.id} onClick={() => setFiltro(p.id)}>
                    {p.curto} ({contagem[p.id]})
                  </button>
                ))}
              </div>
              <input className="email-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, e-mail ou categoria" aria-label="Buscar leads" />
            </div>
            <div className="email-leads">
              <label className="email-lead email-lead-todos">
                <input type="checkbox" checked={todosVisiveis} onChange={alternaVisiveis} />
                <span>Selecionar os {visiveis.length} listados</span>
              </label>
              {visiveis.slice(0, 300).map((l) => (
                <label key={l._chave} className="email-lead">
                  <input type="checkbox" checked={selecionados.has(l._chave)} onChange={() => alterna(l._chave)} />
                  <span className="email-lead-nome">{l.name}</span>
                  <span className="email-lead-mail">{l.email}</span>
                  <span className="email-lead-selos">
                    {abordados[l._chave] && (
                      <span
                        className={`email-abordado${abordados[l._chave].bloqueado ? ' bloqueado' : ''}`}
                        title={abordados[l._chave].campanha ? `${abordados[l._chave].canal === 'email' ? 'E-mail' : 'WhatsApp'} em "${abordados[l._chave].campanha}", ${new Date(abordados[l._chave].quando).toLocaleDateString('pt-BR')}` : ''}
                      >
                        {abordados[l._chave].bloqueado ? 'Pediu para sair' : abordados[l._chave].respondeu ? 'Já respondeu' : 'Já abordado'}
                      </span>
                    )}
                    <span className={`email-pub pub-${l._publico}`}>{PUBLICOS.find((p) => p.id === l._publico)?.curto}</span>
                  </span>
                </label>
              ))}
              {visiveis.length > 300 && <p className="email-vazio">Mostrando 300 de {visiveis.length}. Use a busca, ou "Selecionar" para pegar todos.</p>}
            </div>
            {escolhidosJaAbordados.length > 0 && (
              <div className="ja-abordados">
                <span>
                  <b>{escolhidosJaAbordados.length}</b> dos escolhidos já {escolhidosJaAbordados.length === 1 ? 'foi abordado' : 'foram abordados'} em outra campanha.
                  Quem pediu para sair nunca recebe, mesmo se ficar na lista.
                </span>
                <button type="button" className="btn btn-sm" onClick={tirarAbordados}>Tirar da seleção</button>
              </div>
            )}
            <span className="cfg-dica">
              Lead dos EUA só entra como brasileiro com sinal brasileiro alto. Rode a qualificação na Base de Leads para melhorar a separação.
            </span>
          </>
        )}
      </div>

      {publicosEscolhidos.length > 0 && (
        <div className="field">
          <label>Mensagem por público</label>
          <div className="cfg-provedores">
            {publicosEscolhidos.map((p) => (
              <button key={p.id} type="button" className={`cfg-provedor${abaAtual === p.id ? ' on' : ''}`} aria-pressed={abaAtual === p.id} onClick={() => setAba(p.id)}>
                {p.nome} · {p.idioma}
              </button>
            ))}
          </div>
          <div className="email-modelo">
            <div className="field">
              <label htmlFor="emAssunto">Assunto</label>
              <input id="emAssunto" value={modelo.assunto} onChange={(e) => mudaModelo('assunto', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="emCorpo">Mensagem de abordagem</label>
              <textarea id="emCorpo" rows={7} value={modelo.corpo} onChange={(e) => mudaModelo('corpo', e.target.value)} />
              <span className="cfg-dica">
                Variáveis: {'{{nome}}'}, {'{{categoria}}'}, {'{{site}}'}. Variação de texto: {'{Oi|Olá}'}. A assinatura com
                endereço e a opção de descadastro entram sozinhas no final.
              </span>
            </div>
            {followUpAtivo && [0, 1].map((i) => (
              <div className="field" key={i}>
                <label htmlFor={`emFu${i}`}>{i + 1}º follow-up ({dias[i]} dias sem resposta){i === 1 ? ', opcional' : ''}</label>
                <textarea id={`emFu${i}`} rows={3} value={modelo.followUps[i] || ''} onChange={(e) => mudaModelo('followUps', e.target.value, i)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="email-grade">
        <div className="field">
          <label className="email-check">
            <input type="checkbox" checked={followUpAtivo} onChange={(e) => setFollowUpAtivo(e.target.checked)} />
            <span>Follow-up para quem não responder</span>
          </label>
          <span className="cfg-dica">Sai como resposta na mesma conversa. Desligado, vai só a abordagem.</span>
          {followUpAtivo && (
            <div className="email-horario">
              {[0, 1].map((i) => (
                <select key={i} value={dias[i]} aria-label={`Dias até o ${i + 1}º follow-up`} onChange={(e) => setDias((d) => d.map((v, j) => (j === i ? Number(e.target.value) : v)))}>
                  {[2, 3, 4, 5, 7, 10, 14].map((d) => <option key={d} value={d}>{i + 1}º após {d} dias</option>)}
                </select>
              ))}
            </div>
          )}
        </div>
        <div className="field">
          <label htmlFor="emIntervalo">Intervalo entre e-mails</label>
          <select id="emIntervalo" value={intervaloS} onChange={(e) => setIntervaloS(Number(e.target.value))}>
            {[60, 90, 120, 180, 300].map((s) => <option key={s} value={s}>{s >= 120 ? `${s / 60} minutos` : `${s} segundos`} (com variação)</option>)}
          </select>
        </div>
      </div>

      <div className="cfg-acoes">
        <button type="button" className="btn btn-primary" onClick={criar} disabled={ocupado || !selecionados.size}>
          {ocupado ? <Loader size={15} strokeWidth={1.5} className="cfg-girando" /> : null}
          Criar campanha com {selecionados.size} lead{selecionados.size === 1 ? '' : 's'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
