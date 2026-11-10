/**
 * Leads do Instagram: quem comentou num post ou anúncio vira lead da base, e a
 * Fila do Direct prepara a mensagem de cada um. O envio é sempre feito pela
 * pessoa, no Direct de verdade: Direct automático derruba a conta.
 *
 * Regras puras (testadas). A tela é `components/InstagramLeads.jsx`.
 */
import { chaveDoDia } from './abordagem.js';

export const LIMITES_EXTRACAO = [50, 100, 200, 500];
export const METAS_DIRECT = [20, 30];
// Preço por item dos extratores do Apify no plano grátis (US$).
const PRECO_ITEM = 0.0026;

/** Link de post, reel ou anúncio no formato que o extrator aceita (sem ?igsh=...). */
export function normalizaUrlPost(texto = '') {
  const t = String(texto || '').trim();
  let u;
  try { u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`); } catch { return null; }
  const host = u.hostname.toLowerCase().replace(/^m\./, 'www.');
  if (host !== 'instagram.com' && host !== 'www.instagram.com') return null;
  const m = u.pathname.match(/^\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]{5,})\/?/i);
  if (!m) return null;
  const tipo = m[1].toLowerCase() === 'reels' ? 'reel' : m[1].toLowerCase();
  return `https://www.instagram.com/${tipo}/${m[2]}/`;
}

/** Custo estimado no Apify, em dólar. */
export function custoEstimado(limite, comPerfis) {
  return Math.round(Number(limite || 0) * PRECO_ITEM * (comPerfis ? 2 : 1) * 100) / 100;
}

const usuarioDe = (c) => String(c?.ownerUsername || c?.owner?.username || '').trim().replace(/^@/, '').toLowerCase();

/**
 * Pessoas que comentaram, sem repetir, com os comentários de cada uma.
 * @returns {{usuario: string, foto: string, comentarios: string[], quando: number}[]}
 */
export function pessoasDosComentarios(comentarios = []) {
  const mapa = new Map();
  (comentarios || []).forEach((c) => {
    const usuario = usuarioDe(c);
    if (!/^[\w.]{1,30}$/.test(usuario)) return;
    const atual = mapa.get(usuario) || { usuario, foto: '', comentarios: [], quando: 0 };
    const texto = String(c.text || '').replace(/\s+/g, ' ').trim();
    if (texto && atual.comentarios.length < 3) atual.comentarios.push(texto.slice(0, 300));
    atual.foto = atual.foto || String(c.ownerProfilePicUrl || c.owner?.profile_pic_url || '');
    const ts = Date.parse(c.timestamp || '') || 0;
    atual.quando = Math.max(atual.quando, ts);
    mapa.set(usuario, atual);
  });
  return [...mapa.values()];
}

const RE_EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
// Telefone na bio: +55 27 99999-0000, (27) 99999-0000, +1 (508) 555-0100...
const RE_TELEFONE = /(\+?\(?\d[\d\s().-]{8,}\d)/;

function telefoneDe(perfil) {
  const direto = perfil?.businessPhoneNumber || perfil?.publicPhoneNumber || perfil?.contactPhoneNumber || '';
  const codigo = perfil?.publicPhoneCountryCode || perfil?.businessPhoneCountryCode || '';
  if (String(direto).replace(/\D/g, '').length >= 8) {
    const d = String(direto).trim();
    return codigo && !d.startsWith('+') ? `+${String(codigo).replace(/\D/g, '')} ${d}` : d;
  }
  const bio = String(perfil?.biography || '');
  const m = bio.match(RE_TELEFONE);
  return m && m[1].replace(/\D/g, '').length >= 10 ? m[1].trim() : '';
}

/** País pelo telefone: +1 é EUA; o resto fica Brasil (o público da Grow+). */
function paisDoTelefone(tel) {
  const t = String(tel || '').trim();
  return /^\+?1[\s(]/.test(t) || /^\+1\d{10}$/.test(t.replace(/[^\d+]/g, '')) ? 'US' : 'BR';
}

/** Primeiro nome, se o nome do perfil parece de gente ("Ana Souza"), senão vazio. */
export function primeiroNome(nomeCompleto = '') {
  // Sem nome no perfil o lead fica com o @: adivinhar o nome pelo usuário erra.
  if (String(nomeCompleto || '').trim().startsWith('@')) return '';
  const limpo = String(nomeCompleto || '').replace(/[^\p{L}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim();
  const primeiro = limpo.split(' ')[0] || '';
  if (primeiro.length < 2 || primeiro.length > 14) return '';
  // Nome de empresa tem palavra de negócio ou vem todo em maiúsculas.
  if (/\b(studio|loja|store|clinic|cl[ií]nica|oficial|company|cleaning|services?|design|bar|restaurante|igreja|church|ltda|inc|llc)\b/i.test(limpo)) return '';
  if (primeiro === primeiro.toUpperCase() && primeiro.length > 3) return '';
  return primeiro[0].toUpperCase() + primeiro.slice(1).toLowerCase();
}

/**
 * Lead da base a partir de quem comentou (e do perfil, quando buscado).
 * @param {object} pessoa saída de pessoasDosComentarios
 * @param {object|null} perfil item do extrator de perfis
 * @param {{searchId: string, postUrl: string}} origem
 */
export function leadDaPessoa(pessoa, perfil, { searchId, postUrl }) {
  const p = perfil || {};
  const tel = telefoneDe(p);
  const email = String(p.businessEmail || p.publicEmail || p.email || (String(p.biography || '').match(RE_EMAIL) || [''])[0] || '').trim();
  const site = String(p.externalUrl || '').trim();
  const comercial = Boolean(p.isBusinessAccount || p.businessCategoryName);
  return {
    id: `ig_${pessoa.usuario}`,
    name: String(p.fullName || '').trim() || `@${pessoa.usuario}`,
    instagram: `https://www.instagram.com/${pessoa.usuario}/`,
    usuarioInstagram: pessoa.usuario,
    phone: tel,
    email,
    website: site,
    category: String(p.businessCategoryName || '').trim() || (comercial ? 'Perfil comercial' : 'Perfil pessoal'),
    address: String(p.businessAddress?.street_address || p.businessAddress?.city_name || '').trim(),
    bio: String(p.biography || '').slice(0, 400),
    seguidores: Number(p.followersCount) || 0,
    perfilComercial: comercial,
    privado: Boolean(p.private),
    foto: String(p.profilePicUrl || pessoa.foto || ''),
    comentarios: pessoa.comentarios,
    comentouEm: pessoa.quando || null,
    postOrigem: postUrl,
    source: 'instagram',
    searchId,
    pais: paisDoTelefone(tel),
    perfilBuscado: Boolean(perfil),
  };
}

/**
 * Junta comentários e perfis e tira quem já está na base.
 * @returns {{novos: object[], repetidos: number}}
 */
export function leadsDaExtracao({ comentarios = [], perfis = [] }, base = [], origem) {
  const perfisPorUsuario = new Map((perfis || []).map((p) => [String(p.username || '').toLowerCase(), p]));
  const naBase = new Set((base || []).map((l) => {
    if (l.usuarioInstagram) return String(l.usuarioInstagram).toLowerCase();
    const m = String(l.instagram || '').match(/instagram\.com\/([\w.]+)/i);
    return m ? m[1].toLowerCase() : (String(l.instagram || '').replace(/^@/, '').toLowerCase() || null);
  }).filter(Boolean));
  const pessoas = pessoasDosComentarios(comentarios);
  const novos = [];
  let repetidos = 0;
  pessoas.forEach((pessoa) => {
    if (naBase.has(pessoa.usuario)) { repetidos += 1; return; }
    novos.push(leadDaPessoa(pessoa, perfisPorUsuario.get(pessoa.usuario) || null, origem));
  });
  return { novos, repetidos };
}

/* ------------------------------------------------------------------ */
/* Buscador                                                             */
/* ------------------------------------------------------------------ */

export const LIMITES_BUSCA = [20, 50];

export function custoBusca(tipo, limite) {
  return Math.round(Number(limite || 0) * (tipo === 'anuncios' ? 0.0058 : 0.0026) * 100) / 100;
}

/** Posts e reels achados, com mais comentários primeiro (é de lá que saem as pessoas). */
export function postsDaBusca(itens = []) {
  const vistos = new Set();
  return (itens || [])
    .map((p) => ({
      url: normalizaUrlPost(p.url || (p.shortCode ? `https://www.instagram.com/p/${p.shortCode}/` : '')),
      autor: String(p.ownerUsername || '').trim(),
      autorNome: String(p.ownerFullName || '').trim(),
      legenda: String(p.caption || '').replace(/\s+/g, ' ').trim().slice(0, 280),
      comentarios: Number(p.commentsCount) || 0,
      curtidas: Number(p.likesCount) || 0,
      quando: Date.parse(p.timestamp || '') || 0,
      reel: p.productType === 'clips' || p.type === 'Video',
      fechado: Boolean(p.isCommentsDisabled),
    }))
    .filter((p) => p.url && !p.fechado && !vistos.has(p.url) && vistos.add(p.url))
    .sort((a, b) => b.comentarios - a.comentarios);
}

/**
 * Anúncios achados, agrupados por anunciante: quantos anúncios ativos, o texto
 * mais recente e o link para ver na Biblioteca de Anúncios.
 */
export function anunciantesDaBusca(itens = []) {
  const mapa = new Map();
  (itens || []).forEach((a) => {
    const s = a.snapshot || {};
    const id = String(a.pageID || a.pageId || s.pageId || a.pageName || '');
    if (!id) return;
    const inicio = Date.parse(a.startDateFormatted || '') || (Number(a.startDate) * 1000) || 0;
    const atual = mapa.get(id) || {
      id,
      nome: String(a.pageName || s.pageName || '').trim(),
      anuncios: 0,
      texto: '',
      titulo: '',
      destino: '',
      inicio: 0,
      anuncioId: '',
      paginaFacebook: String(s.pageProfileUri || ''),
    };
    atual.anuncios += 1;
    if (inicio >= atual.inicio) {
      atual.inicio = inicio;
      atual.texto = String(s.body?.text || '').replace(/\s+/g, ' ').trim().slice(0, 320);
      atual.titulo = String(s.title || '').trim();
      atual.destino = String(s.linkUrl || '').trim();
      atual.anuncioId = String(a.adArchiveID || a.adArchiveId || '');
    }
    mapa.set(id, atual);
  });
  return [...mapa.values()].sort((a, b) => (b.anuncios - a.anuncios) || (b.inicio - a.inicio));
}

/** Link do anúncio na Biblioteca de Anúncios da Meta. */
export const linkAnuncio = (anuncioId) => `https://www.facebook.com/ads/library/?id=${encodeURIComponent(anuncioId)}`;

/* ------------------------------------------------------------------ */
/* Fila do Direct                                                       */
/* ------------------------------------------------------------------ */

export const OFERTAS_DIRECT = [
  { id: 'site', nome: 'Site' },
  { id: 'agendamento', nome: 'Sistema de agendamento' },
  { id: 'bio', nome: 'Link na bio' },
  { id: 'conteudo', nome: 'Conteúdo para redes' },
  { id: 'midia', nome: 'Mídia indoor' },
];

// Curtas, como Direct de gente: apresenta, diz por que chamou e termina com pergunta.
const TEXTOS = {
  site: [
    ({ oi, eu, tema }) => `${oi} Tudo bem? ${eu}, da Grow+.\n\nVi seu comentário${tema ? ` sobre ${tema}` : ''} e dei uma olhada no seu perfil. Você já tem um site para o seu trabalho ou hoje tudo acontece só por aqui no Instagram?`,
    ({ oi, eu }) => `${oi} ${eu} aqui, da Grow+.\n\nA gente faz sites para quem trabalha pelo Instagram e quer ser achado também no Google. Posso te mostrar um exemplo rápido?`,
  ],
  agendamento: [
    ({ oi, eu }) => `${oi} Tudo bem? ${eu}, da Grow+.\n\nVi que você atende com horário marcado. Hoje seus agendamentos chegam pelo Direct e pelo WhatsApp, ou você já usa algum sistema?`,
    ({ oi, eu }) => `${oi} ${eu} aqui, da Grow+.\n\nA gente monta um link de agendamento em que o cliente escolhe o horário sozinho, sem ficar no vai e volta de mensagem. Faz sentido para você?`,
  ],
  bio: [
    ({ oi, eu }) => `${oi} Tudo bem? ${eu}, da Grow+.\n\nDei uma olhada no seu perfil. Já pensou em ter uma página própria no link da bio, com seus serviços, fotos e botão para o WhatsApp?`,
    ({ oi, eu }) => `${oi} ${eu} aqui, da Grow+.\n\nA gente cria um mini site para o link da bio, com a sua cara e tudo o que o cliente precisa num lugar só. Posso te mandar um exemplo?`,
  ],
  conteudo: [
    ({ oi, eu }) => `${oi} Tudo bem? ${eu}, da Grow+.\n\nCurti o seu perfil. Hoje é você mesmo que cria os posts ou alguém te ajuda com o conteúdo?`,
    ({ oi, eu }) => `${oi} ${eu} aqui, da Grow+.\n\nA gente cuida do conteúdo do Instagram para quem não tem tempo de postar com constância. Quer que eu te conte como funciona?`,
  ],
  midia: [
    ({ oi, eu }) => `${oi} Tudo bem? ${eu}, da Grow+.\n\nA gente instala telas com avisos, cardápio e anúncios em ambientes como o seu. Você já pensou em usar uma TV para falar com quem está aí dentro?`,
    ({ oi, eu }) => `${oi} ${eu} aqui, da Grow+.\n\nTrabalhamos com mídia indoor: uma tela com seus avisos e promoções rodando o dia todo. Posso te mostrar como fica?`,
  ],
};

function hash(texto) {
  let h = 0;
  for (const c of String(texto)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * Mensagem do Direct para um lead. versao troca o texto (botão "outra versão").
 * @param {{nome?: string, oferta?: string, tema?: string}} cfg nome = quem assina
 */
export function mensagemDirect(lead = {}, cfg = {}, versao = 0) {
  const banco = TEXTOS[cfg.oferta] || TEXTOS.site;
  const indice = (hash(lead.id || lead.name) + Math.max(0, versao)) % banco.length;
  const nome = primeiroNome(lead.name);
  const eu = String(cfg.nome || '').trim() || 'Aqui é da Grow+';
  return banco[indice]({
    oi: nome ? `Oi, ${nome}!` : 'Oi!',
    eu: cfg.nome ? `${eu} aqui` : eu,
    tema: String(cfg.tema || '').trim(),
  }).replace(`${eu} aqui aqui`, `${eu} aqui`);
}

/** Link que abre a conversa do Direct com a pessoa. */
export const linkDirect = (usuario) => `https://ig.me/m/${String(usuario || '').replace(/^@/, '')}`;

/**
 * Fila do Direct: leads do Instagram ainda não tratados, perfil comercial
 * primeiro, depois quem comentou mais recente.
 */
export function filaDirect(leads = [], log = {}, { soComercial = false, searchId = '' } = {}) {
  return (leads || [])
    .filter((l) => l?.source === 'instagram' && l.usuarioInstagram && !log[String(l.id)])
    .filter((l) => !soComercial || l.perfilComercial)
    .filter((l) => !searchId || l.searchId === searchId)
    .sort((a, b) => (Number(b.perfilComercial) - Number(a.perfilComercial)) || ((b.comentouEm || 0) - (a.comentouEm || 0)));
}

/** Directs enviados hoje (contam para a meta do Direct, separada da do WhatsApp). */
export function directsHoje(log = {}, agora = new Date()) {
  const hoje = chaveDoDia(agora);
  return Object.values(log).filter((e) => e?.canal === 'instagram' && e.status === 'enviada' && e.dia === hoje).length;
}

/** Registro da Fila para um Direct marcado (enviado, pulado...). */
export function registroDirect(lead, status, texto, cfg = {}, agora = Date.now()) {
  return {
    status,
    dia: chaveDoDia(new Date(agora)),
    ts: agora,
    nome: lead.name || '',
    texto: status === 'enviada' ? texto : '',
    angulo: cfg.oferta || 'site',
    canal: 'instagram',
    origem: 'instagram',
  };
}
