/**
 * Nuvem do Prospector: login, empresa (código tipo número de série) e
 * sincronização dos dados entre computadores, pelo Supabase da Grow+.
 *
 * Só fetch, sem biblioteca. O banco protege os dados por empresa (RLS): cada
 * login só lê e grava as empresas de que é membro, e só vira membro quem tem o
 * código. A chave publicável abaixo é pública por natureza.
 *
 * Sincronização em três vias: para cada chave guarda a última versão
 * sincronizada (base). Na hora de sincronizar compara base, local e nuvem:
 * o que só mudou de um lado vale; novo dos dois lados entra; apagado de um lado
 * sai, a não ser que o outro lado tenha editado. Lista com id e objeto são
 * mesclados item a item; o resto vale inteiro.
 */

export const NUVEM_URL = 'https://jknvracqgdilmayfrlkq.supabase.co';
export const NUVEM_CHAVE = 'sb_publishable_bvN3ifHfcUjG2xSTNm_glA_KxPF7UHm';

// Dados do trabalho. Preferências de tela, sessões e chaves secretas
// (WhatsApp, Gmail, IA) ficam em cada computador.
export const CHAVES_SINCRONIZADAS = [
  'sigma_leads',
  'sigma_searches',
  'sigma_groups',
  'sigma_analysis',
  'sigma_history',
  'sigma_abordagem_log',
  'sigma_abordagem_cfg',
  'sigma_quick_snippets',
];

const CHAVE_SESSAO = 'prospector_nuvem_sessao';
const CHAVE_EMPRESA = 'prospector_nuvem_empresa';
const PREFIXO_BASE = 'prospector_nuvem_base:';
const CHAVE_ULTIMA = 'prospector_nuvem_ultima';
// Logo da empresa guardada no aparelho para aparecer no login, antes de entrar.
const CHAVE_LOGO_LEMBRADA = 'prospector_lembrar_logo';

/* ------------------------------------------------------------------ */
/* Mescla em três vias (pura, testada)                                  */
/* ------------------------------------------------------------------ */

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const idDe = (item) => (ehObjeto(item) && (item.id !== undefined && item.id !== null) ? String(item.id) : null);
const listaComId = (v) => Array.isArray(v) && v.length > 0 && v.every((item) => idDe(item) !== null);

function mesclaMapa(base, local, remoto) {
  const chaves = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remoto)]);
  const out = {};
  chaves.forEach((k) => {
    const temB = k in base;
    const temL = k in local;
    const temR = k in remoto;
    const mudouL = temL !== temB || (temL && !igual(local[k], base[k]));
    const mudouR = temR !== temB || (temR && !igual(remoto[k], base[k]));
    let valor;
    let fica;
    if (mudouL && !mudouR) { fica = temL; valor = local[k]; }
    else if (mudouR && !mudouL) { fica = temR; valor = remoto[k]; }
    else if (!mudouL && !mudouR) { fica = temL; valor = local[k]; }
    // Os dois mudaram: edição vence exclusão; duas edições, vale a deste computador.
    else if (temL) { fica = true; valor = local[k]; }
    else { fica = temR; valor = remoto[k]; }
    if (fica) out[k] = valor;
  });
  return out;
}

function porId(lista) {
  const m = {};
  (lista || []).forEach((item) => { const id = idDe(item); if (id !== null) m[id] = item; });
  return m;
}

/**
 * @param {*} base última versão sincronizada (undefined na primeira vez)
 * @param {*} local versão deste computador (undefined se não existe)
 * @param {*} remoto versão da nuvem (undefined se não existe)
 */
export function mesclar3(base, local, remoto) {
  if (local === undefined) return remoto;
  if (remoto === undefined) return local;
  if (igual(local, remoto)) return local;
  const b = base === undefined ? (Array.isArray(local) ? [] : {}) : base;

  const lista = (v) => Array.isArray(v) && (v.length === 0 || listaComId(v));
  if (lista(local) && lista(remoto)) {
    const m = mesclaMapa(Array.isArray(b) ? porId(b) : {}, porId(local), porId(remoto));
    // Ordem: a deste computador, depois o que só existe na nuvem.
    const vistos = new Set();
    const out = [];
    [...local, ...remoto].forEach((item) => {
      const id = idDe(item);
      if (id !== null && !vistos.has(id) && id in m) { vistos.add(id); out.push(m[id]); }
    });
    return out;
  }
  if (ehObjeto(local) && ehObjeto(remoto)) return mesclaMapa(ehObjeto(b) ? b : {}, local, remoto);
  // Valor inteiro: vale o lado que mudou; os dois mudaram, vale o deste computador.
  if (igual(local, b)) return remoto;
  return local;
}

/* ------------------------------------------------------------------ */
/* Armazenamento local                                                  */
/* ------------------------------------------------------------------ */

const armazem = () => (typeof window !== 'undefined' ? window.localStorage : null);
function lerJson(chave) {
  try { const t = armazem()?.getItem(chave); return t == null ? undefined : JSON.parse(t); } catch { return undefined; }
}
function gravarJson(chave, valor) {
  try { armazem()?.setItem(chave, JSON.stringify(valor)); } catch { /* sem espaço */ }
}

export const lerSessao = () => lerJson(CHAVE_SESSAO) || null;
export const lerEmpresa = () => lerJson(CHAVE_EMPRESA) || null;
export const ultimaSincronizacao = () => lerJson(CHAVE_ULTIMA) || null;

export function lerLogoLembrada() {
  try { return armazem()?.getItem(CHAVE_LOGO_LEMBRADA) || ''; } catch { return ''; }
}
/** Guarda (ou apaga) a logo para o login, só se o e-mail também estiver lembrado. */
export function lembrarLogo(logo) {
  try {
    const a = armazem();
    if (!a) return;
    if (logo && a.getItem('prospector_lembrar_email')) a.setItem(CHAVE_LOGO_LEMBRADA, logo);
    else if (!logo) a.removeItem(CHAVE_LOGO_LEMBRADA);
  } catch { /* sem espaço: o login mostra a logo do Prospector */ }
}

function guardaEmpresa(e) {
  const empresa = { id: e.id, nome: e.nome, codigo: e.codigo, logo: e.logo || null };
  gravarJson(CHAVE_EMPRESA, empresa);
  lembrarLogo(empresa.logo);
  return empresa;
}

/* ------------------------------------------------------------------ */
/* Supabase por fetch                                                   */
/* ------------------------------------------------------------------ */

async function chamar(caminho, { metodo = 'GET', corpo, token, cabecalhos = {} } = {}) {
  const res = await fetch(`${NUVEM_URL}${caminho}`, {
    method: metodo,
    headers: {
      apikey: NUVEM_CHAVE,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...cabecalhos,
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await res.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  if (!res.ok) {
    const msg = dados?.msg || dados?.message || dados?.error_description || dados?.error || `Erro ${res.status}`;
    const erro = new Error(traduzErro(String(msg)));
    erro.status = res.status;
    throw erro;
  }
  return dados;
}

function traduzErro(msg) {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(msg)) return 'Confirme o e-mail pelo link que chegou na sua caixa de entrada e tente de novo.';
  if (/user already registered/i.test(msg)) return 'Este e-mail já tem conta. Use Entrar.';
  if (/password should be at least/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/rate limit/i.test(msg)) return 'Muitas tentativas. Espere um pouco e tente de novo.';
  if (/failed to fetch|network/i.test(msg)) return 'Sem conexão com a internet.';
  if (/jwt|token is expired|invalid claim|refresh token/i.test(msg)) return 'Sua sessão expirou. Clique em Desconectar e entre de novo.';
  return msg;
}

function guardaSessao(r) {
  const sessao = {
    access_token: r.access_token,
    refresh_token: r.refresh_token,
    expira_em: Date.now() + (Number(r.expires_in) || 3600) * 1000,
    usuario: { id: r.user?.id, email: r.user?.email },
  };
  gravarJson(CHAVE_SESSAO, sessao);
  return sessao;
}

// O link do e-mail de confirmação volta para a versão web, que já entra logada.
export const URL_WEB = 'https://prospector.growmaisoficial.com';

export async function criarConta(email, senha) {
  const r = await chamar(`/auth/v1/signup?redirect_to=${encodeURIComponent(URL_WEB)}`, {
    metodo: 'POST',
    corpo: { email: String(email).trim(), password: senha },
  });
  // Com confirmação de e-mail ligada, não vem sessão: a pessoa confirma e depois entra.
  if (r?.access_token) return { sessao: guardaSessao(r), precisaConfirmar: false };
  return { sessao: null, precisaConfirmar: true };
}

export async function entrar(email, senha) {
  const r = await chamar('/auth/v1/token?grant_type=password', { metodo: 'POST', corpo: { email: String(email).trim(), password: senha } });
  return guardaSessao(r);
}

/**
 * Volta do link de confirmação: o Supabase devolve a sessão no endereço
 * (#access_token=...&refresh_token=...) ou o erro (#error_description=...).
 * @returns {Promise<null | {ok: true, email: string} | {ok: false, erro: string}>}
 */
export async function sessaoDoLinkDeConfirmacao() {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  if (!/(^|&)(access_token|error_description)=/.test(hash)) return null;
  const p = new URLSearchParams(hash);
  const limpa = () => window.history.replaceState(null, '', `${window.location.pathname}#overview`);
  if (p.get('error_description')) {
    limpa();
    const msg = p.get('error_description').replace(/\+/g, ' ');
    return { ok: false, erro: /expired|invalid/i.test(msg) ? 'O link de confirmação expirou ou já foi usado. Entre com e-mail e senha; se pedir confirmação de novo, crie a conta outra vez para receber um link novo.' : msg };
  }
  const token = p.get('access_token');
  const usuario = await chamar('/auth/v1/user', { token });
  guardaSessao({
    access_token: token,
    refresh_token: p.get('refresh_token'),
    expires_in: p.get('expires_in'),
    user: usuario,
  });
  limpa();
  return { ok: true, email: usuario?.email || '' };
}

async function tokenValido() {
  const s = lerSessao();
  if (!s) throw new Error('Entre com seu login.');
  if (Date.now() < s.expira_em - 60000) return s.access_token;
  const r = await chamar('/auth/v1/token?grant_type=refresh_token', { metodo: 'POST', corpo: { refresh_token: s.refresh_token } });
  return guardaSessao(r).access_token;
}

export async function sair() {
  const s = lerSessao();
  try { if (s) await chamar('/auth/v1/logout', { metodo: 'POST', token: s.access_token }); } catch { /* sai mesmo sem rede */ }
  const a = armazem();
  if (!a) return;
  [CHAVE_SESSAO, CHAVE_EMPRESA, CHAVE_ULTIMA, ...CHAVES_SINCRONIZADAS.map((c) => PREFIXO_BASE + c)].forEach((c) => a.removeItem(c));
}

async function rpc(nome, args) {
  const token = await tokenValido();
  const r = await chamar(`/rest/v1/rpc/${nome}`, { metodo: 'POST', corpo: args, token });
  const empresa = Array.isArray(r) ? r[0] : r;
  if (!empresa?.id) throw new Error('Não foi possível conectar à empresa.');
  return guardaEmpresa(empresa);
}

export const criarEmpresa = (nome) => rpc('prospector_criar_empresa', { p_nome: nome });
export const entrarEmpresa = (codigo) => rpc('prospector_entrar_empresa', { p_codigo: codigo });

/** Empresa já ligada a este login (útil depois de entrar em outro computador). */
export async function empresasDoLogin() {
  const token = await tokenValido();
  return chamar('/rest/v1/prospector_empresas?select=id,nome,codigo,logo&order=criado_em', { token });
}
export function usarEmpresa(empresa) {
  return guardaEmpresa(empresa);
}

/** Troca a logo da empresa (data URL já reduzida) ou remove com null. */
export async function definirLogo(logo) {
  const empresa = lerEmpresa();
  if (!empresa) throw new Error('Conecte a empresa primeiro.');
  const token = await tokenValido();
  await chamar('/rest/v1/rpc/prospector_definir_logo', { metodo: 'POST', corpo: { p_empresa: empresa.id, p_logo: logo }, token });
  return guardaEmpresa({ ...empresa, logo });
}

/* ------------------------------------------------------------------ */
/* Sincronização                                                        */
/* ------------------------------------------------------------------ */

let rodando = null;

/**
 * Sincroniza todas as chaves. Retorna as chaves que mudaram neste computador
 * (para a tela recarregar).
 */
export function sincronizar() {
  if (rodando) return rodando;
  rodando = (async () => {
    const empresa = lerEmpresa();
    const sessao = lerSessao();
    if (!empresa || !sessao) return { mudouAqui: [], enviadas: 0 };
    const token = await tokenValido();
    const filtro = `empresa_id=eq.${empresa.id}`;
    const linhas = await chamar(`/rest/v1/prospector_dados?${filtro}&select=chave,valor,atualizado_em`, { token });
    try {
      const [atual] = await chamar(`/rest/v1/prospector_empresas?id=eq.${empresa.id}&select=id,nome,codigo,logo`, { token }) || [];
      if (atual && (atual.logo !== (empresa.logo || null) || atual.nome !== empresa.nome)) {
        guardaEmpresa(atual);
        window.dispatchEvent(new CustomEvent('prospector:empresa', { detail: atual }));
      }
    } catch { /* sem a logo nova, segue com a guardada */ }
    const remotas = new Map((linhas || []).map((l) => [l.chave, l]));
    const mudouAqui = [];
    let enviadas = 0;

    for (const chave of CHAVES_SINCRONIZADAS) {
      const local = lerJson(chave);
      const linha = remotas.get(chave);
      const remoto = linha ? linha.valor : undefined;
      const base = lerJson(PREFIXO_BASE + chave);
      const final = mesclar3(base, local, remoto);
      if (final === undefined) continue;

      if (!igual(final, local)) {
        gravarJson(chave, final);
        mudouAqui.push(chave);
      }
      if (!igual(final, remoto)) {
        const corpo = { empresa_id: empresa.id, chave, valor: final, atualizado_por: sessao.usuario.id };
        if (linha) {
          // Só grava se ninguém mexeu desde a leitura; se mexeu, fica para a próxima rodada.
          const r = await chamar(
            `/rest/v1/prospector_dados?${filtro}&chave=eq.${chave}&atualizado_em=eq.${encodeURIComponent(linha.atualizado_em)}`,
            { metodo: 'PATCH', corpo: { valor: final, atualizado_por: sessao.usuario.id }, token, cabecalhos: { Prefer: 'return=representation' } },
          );
          if (!Array.isArray(r) || r.length === 0) continue;
        } else {
          await chamar('/rest/v1/prospector_dados', { metodo: 'POST', corpo, token, cabecalhos: { Prefer: 'return=minimal' } });
        }
        enviadas += 1;
      }
      gravarJson(PREFIXO_BASE + chave, final);
    }
    gravarJson(CHAVE_ULTIMA, Date.now());
    return { mudouAqui, enviadas };
  })().finally(() => { rodando = null; });
  return rodando;
}

/**
 * Liga a sincronização automática: ao abrir, a cada minuto, ao voltar para a
 * janela e alguns segundos depois de cada mudança nos dados.
 * @param {(r: {mudouAqui: string[]}) => void} aoMudar chamada quando chega dado novo
 */
export function iniciarSincronizacao(aoMudar) {
  if (typeof window === 'undefined' || window.__prospectorNuvem) return () => {};
  window.__prospectorNuvem = true;
  let espera = null;
  const roda = () => {
    if (!lerEmpresa() || !lerSessao()) return;
    sincronizar()
      .then((r) => {
        if (r.mudouAqui.length) aoMudar?.(r);
        window.dispatchEvent(new CustomEvent('prospector:nuvem', { detail: { ok: true, ...r } }));
      })
      .catch((e) => window.dispatchEvent(new CustomEvent('prospector:nuvem', { detail: { ok: false, erro: e.message } })));
  };
  const agenda = (ms) => { clearTimeout(espera); espera = setTimeout(roda, ms); };

  // Mudança local em dado sincronizado: sobe alguns segundos depois.
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = function setItemComNuvem(chave, valor) {
    original.call(this, chave, valor);
    if (this === window.localStorage && CHAVES_SINCRONIZADAS.includes(chave) && !rodando) agenda(4000);
  };

  const foco = () => agenda(500);
  window.addEventListener('focus', foco);
  window.addEventListener('prospector:nuvem-agora', roda);
  const relogio = setInterval(roda, 60000);
  agenda(1500);
  return () => {
    Storage.prototype.setItem = original;
    window.removeEventListener('focus', foco);
    window.removeEventListener('prospector:nuvem-agora', roda);
    clearInterval(relogio);
    window.__prospectorNuvem = false;
  };
}

/**
 * Links de download do app para Windows. Ficam no banco (não no código, que é
 * público) e só quem é membro de uma empresa consegue ler.
 * @returns {Promise<{id: string, rotulo: string, url: string, versao: string|null}[]>}
 */
export async function linksDeDownload() {
  if (!lerSessao()) return [];
  const token = await tokenValido();
  const lista = await chamar('/rest/v1/prospector_downloads?select=id,rotulo,url,versao&order=id', { token });
  return Array.isArray(lista) ? lista : [];
}
