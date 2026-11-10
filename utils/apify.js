/**
 * Apify: extratores prontos do Instagram, rodando na conta Apify do usuário.
 *
 * - Comentários de um post ou anúncio (apify/instagram-comment-scraper): não
 *   usa login no Instagram, então não arrisca a conta da prospecção.
 * - Dados do perfil de quem comentou (apify/instagram-profile-scraper): perfil
 *   comercial, categoria, site, bio e contato público.
 *
 * O token fica cifrado no cofre do Windows (safeStorage) e nunca vai para a tela.
 */
const fs = require("fs");
const path = require("path");

const API = "https://api.apify.com/v2";
const ATOR_COMENTARIOS = "apify~instagram-comment-scraper";
const ATOR_PERFIS = "apify~instagram-profile-scraper";
const ATOR_POSTS = "apify~instagram-hashtag-scraper";
const ATOR_ANUNCIOS = "apify~facebook-ads-scraper";
const ESPERA_MAXIMA_MS = 15 * 60 * 1000;

function cofre() {
  try {
    const { safeStorage } = require("electron");
    return safeStorage && safeStorage.isEncryptionAvailable() ? safeStorage : null;
  } catch {
    return null;
  }
}

class ApifyConta {
  constructor(userDataPath) {
    this.arquivo = path.join(userDataPath, "apify.json");
    this.dados = this._le();
  }

  _le() {
    try {
      if (fs.existsSync(this.arquivo)) return JSON.parse(fs.readFileSync(this.arquivo, "utf-8")) || {};
    } catch { /* arquivo corrompido: começa sem token */ }
    return {};
  }

  _grava() {
    fs.mkdirSync(path.dirname(this.arquivo), { recursive: true });
    const tmp = `${this.arquivo}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.dados, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, this.arquivo);
  }

  token() {
    const c = cofre();
    if (this.dados.tokenCifrado && c) {
      try { return c.decryptString(Buffer.from(this.dados.tokenCifrado, "base64")); } catch { return ""; }
    }
    return this.dados.tokenPuro || "";
  }

  publico() {
    return { temToken: Boolean(this.token()), usuario: this.dados.usuario || "" };
  }

  salvar(token, usuario) {
    const limpo = String(token || "").trim();
    const c = cofre();
    this.dados = c
      ? { tokenCifrado: c.encryptString(limpo).toString("base64"), usuario }
      : { tokenPuro: limpo, usuario };
    this._grava();
  }

  remover() {
    this.dados = {};
    this._grava();
  }
}

async function chama(caminho, token, { metodo = "GET", corpo } = {}) {
  const res = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await res.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  if (!res.ok) {
    const msg = dados?.error?.message || `Erro ${res.status} no Apify`;
    if (res.status === 401) throw new Error("O token do Apify não vale mais. Cole um token novo em Configurações.");
    if (res.status === 402 || /credit|usage|limit/i.test(msg)) throw new Error("A conta do Apify ficou sem crédito para esta extração.");
    throw new Error(msg);
  }
  return dados;
}

/** Confere o token e devolve o usuário da conta Apify. */
async function confereToken(token) {
  const r = await chama("/users/me", String(token || "").trim());
  return { usuario: r?.data?.username || "" };
}

/**
 * Roda um extrator até o fim e devolve os itens.
 * @param {{ cancelado?: () => boolean, aoMudar?: (texto: string) => void }} opcoes
 */
async function rodaAtor(ator, entrada, token, { cancelado = () => false, aoMudar = () => {} } = {}) {
  const inicio = await chama(`/acts/${ator}/runs`, token, { metodo: "POST", corpo: entrada });
  const run = inicio?.data;
  if (!run?.id) throw new Error("O Apify não começou a extração.");
  const comecou = Date.now();
  let estado = run.status;
  let dataset = run.defaultDatasetId;
  while (!["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(estado)) {
    if (cancelado()) {
      await chama(`/actor-runs/${run.id}/abort`, token, { metodo: "POST" }).catch(() => {});
      throw Object.assign(new Error("Extração cancelada."), { cancelada: true });
    }
    if (Date.now() - comecou > ESPERA_MAXIMA_MS) throw new Error("O Apify demorou demais. Tente com menos comentários.");
    await new Promise((ok) => setTimeout(ok, 4000));
    const atual = await chama(`/actor-runs/${run.id}`, token);
    estado = atual?.data?.status;
    dataset = atual?.data?.defaultDatasetId || dataset;
    aoMudar(estado);
  }
  if (estado !== "SUCCEEDED") throw new Error(`A extração no Apify terminou com erro (${estado}).`);
  const itens = await chama(`/datasets/${dataset}/items?clean=true&format=json`, token);
  return Array.isArray(itens) ? itens : [];
}

/**
 * Comentários de um post e, se pedido, o perfil de cada pessoa.
 * @returns {Promise<{comentarios: object[], perfis: object[]}>}
 */
async function extraiComentarios({ url, limite, comPerfis }, token, opcoes = {}) {
  const aoMudar = opcoes.aoMudar || (() => {});
  aoMudar("Lendo os comentários do post...");
  const comentarios = await rodaAtor(ATOR_COMENTARIOS, { directUrls: [url], resultsLimit: limite, includeNestedComments: false }, token, {
    ...opcoes,
    aoMudar: () => aoMudar("Lendo os comentários do post..."),
  });
  if (!comPerfis || !comentarios.length) return { comentarios, perfis: [] };
  const usuarios = [...new Set(comentarios.map((c) => String(c.ownerUsername || c.owner?.username || "").trim()).filter(Boolean))];
  aoMudar(`Buscando o perfil de ${usuarios.length} pessoa${usuarios.length === 1 ? "" : "s"}...`);
  const perfis = await rodaAtor(ATOR_PERFIS, { usernames: usuarios }, token, {
    ...opcoes,
    aoMudar: () => aoMudar(`Buscando o perfil de ${usuarios.length} pessoa${usuarios.length === 1 ? "" : "s"}...`),
  });
  return { comentarios, perfis };
}

/** Endereço da Biblioteca de Anúncios da Meta: anúncios ativos que rodam no Instagram. */
function urlBibliotecaAnuncios(palavra, pais) {
  const q = encodeURIComponent(String(palavra || "").trim());
  const p = pais === "US" ? "US" : "BR";
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${p}&q=${q}&search_type=keyword_unordered&media_type=all&publisher_platforms[0]=instagram`;
}

/**
 * Buscador: posts e reels do Instagram por palavra, ou anúncios ativos da
 * Biblioteca de Anúncios da Meta.
 */
async function busca({ palavra, tipo, pais, limite }, token, opcoes = {}) {
  const aoMudar = opcoes.aoMudar || (() => {});
  const n = Math.max(5, Math.min(100, Math.round(Number(limite)) || 30));
  if (tipo === "anuncios") {
    aoMudar("Procurando anúncios na Biblioteca de Anúncios da Meta...");
    return rodaAtor(ATOR_ANUNCIOS, { startUrls: [{ url: urlBibliotecaAnuncios(palavra, pais) }], resultsLimit: n }, token, {
      ...opcoes, aoMudar: () => aoMudar("Procurando anúncios na Biblioteca de Anúncios da Meta..."),
    });
  }
  aoMudar("Procurando posts e reels no Instagram...");
  return rodaAtor(ATOR_POSTS, { hashtags: [String(palavra || "").trim()], keywordSearch: true, resultsType: "posts", resultsLimit: n }, token, {
    ...opcoes, aoMudar: () => aoMudar("Procurando posts e reels no Instagram..."),
  });
}

module.exports = { ApifyConta, confereToken, extraiComentarios, rodaAtor, busca, urlBibliotecaAnuncios };
