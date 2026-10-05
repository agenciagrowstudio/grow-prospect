/**
 * Extração de e-mail do site do lead.
 *
 * Funções puras: o scraper entrega o HTML, o texto e os links da página, e
 * aqui se decide o que é e-mail de verdade, qual é o melhor e quais páginas
 * de contato vale abrir. Separado do navegador para poder ser testado.
 */

const REGEX_EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}/gi;
const EMAIL_INTEIRO = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$/i;

// Coisa que parece e-mail mas é arquivo, rastreador ou exemplo.
const LIXO = /\.(png|jpe?g|gif|webp|svg|avif|css|js)$|@\d+x\.|sentry|wixpress|example\.|exemplo\.|domain\.com|seudominio|yourdomain|email\.com$|@sentry|@2x/i;
const NAO_RESPONDE = /^(no-?reply|nao-?responda|donotreply|mailer-daemon|postmaster|bounce|privacy|privacidade|dpo|lgpd|abuse|webmaster)@/i;
const COMERCIAL = /^(contato|contact|comercial|vendas|sales|info|informacoes|atendimento|hello|ola|oi|office|orcamento|orcamentos|reservas|agendamento|sac|faleconosco|marketing)@/i;

/** E-mail que o Cloudflare esconde em data-cfemail: o 1º byte é a chave do XOR. */
function decodificaCfemail(hex) {
  const h = String(hex || '');
  if (!/^[0-9a-f]+$/i.test(h) || h.length < 4) return '';
  const chave = parseInt(h.slice(0, 2), 16);
  let saida = '';
  for (let i = 2; i < h.length; i += 2) {
    saida += String.fromCharCode(parseInt(h.slice(i, i + 2), 16) ^ chave);
  }
  return saida;
}

/** "contato [at] loja [dot] com" e parecidos. */
function desofusca(texto) {
  return String(texto || '')
    .replace(/\s*(\[at\]|\(at\)|\{at\}|\[arroba\]|\(arroba\))\s*/gi, '@')
    .replace(/\s*(\[dot\]|\(dot\)|\{dot\}|\[ponto\]|\(ponto\))\s*/gi, '.');
}

/** Todos os candidatos de uma página: mailto, texto, Cloudflare e ofuscados. */
function extraiEmails({ html = '', texto = '' } = {}) {
  const achados = new Set();
  const adiciona = (e) => {
    const limpo = decodeURIComponent(String(e || '').replace(/^mailto:/i, '').split('?')[0])
      .trim()
      .replace(/^[.\-_]+|[.\-_]+$/g, '')
      .toLowerCase();
    if (limpo.includes('@')) achados.add(limpo);
  };
  for (const m of html.matchAll(/mailto:([^"'?\s>]+)/gi)) {
    try { adiciona(m[1]); } catch { /* mailto malformado */ }
  }
  for (const m of html.matchAll(/data-cfemail="([0-9a-f]+)"/gi)) adiciona(decodificaCfemail(m[1]));
  for (const m of html.matchAll(/\/cdn-cgi\/l\/email-protection#([0-9a-f]+)/gi)) adiciona(decodificaCfemail(m[1]));
  for (const m of desofusca(texto).matchAll(REGEX_EMAIL)) adiciona(m[0]);
  return [...achados].filter((e) => EMAIL_INTEIRO.test(e) && !LIXO.test(e));
}

function dominioDe(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Ordena do melhor para o pior: do próprio domínio do site, depois endereço
 * comercial (contato@, info@), depois o resto. "noreply" e afins saem.
 */
function ordenaEmails(emails, siteUrl) {
  const dominio = dominioDe(siteUrl);
  const raiz = dominio.split('.').slice(-3).join('.');
  const nota = (e) => {
    const dom = e.split('@')[1] || '';
    let n = 0;
    if (dominio && (dom === dominio || dom.endsWith(`.${dominio}`) || dominio.endsWith(dom) || dom === raiz)) n += 10;
    if (COMERCIAL.test(e)) n += 3;
    return n;
  };
  return [...new Set(emails)]
    .filter((e) => !NAO_RESPONDE.test(e))
    .sort((a, b) => nota(b) - nota(a) || a.length - b.length);
}

/** Achou e-mail do próprio domínio? Então não precisa abrir mais páginas. */
function temEmailDoDominio(emails, siteUrl) {
  const dominio = dominioDe(siteUrl);
  return !!dominio && emails.some((e) => {
    const dom = e.split('@')[1] || '';
    return dom === dominio || dominio.endsWith(dom);
  });
}

const PAGINA_CONTATO = /contat|contact|fale|sobre|about|quem-somos|quemsomos|atendimento|empresa|impressum|reach-us|get-in-touch/i;

/** Até `limite` links do mesmo site com cara de página de contato ou "sobre". */
function linksDeContato(links, siteUrl, limite = 2) {
  const dominio = dominioDe(siteUrl);
  const vistos = new Set();
  const saida = [];
  for (const l of links || []) {
    let url;
    try {
      url = new URL(l.href, siteUrl);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol) || dominioDe(url.href) !== dominio) continue;
    url.hash = '';
    const chave = url.href.replace(/\/$/, '');
    if (vistos.has(chave) || chave === String(siteUrl).replace(/\/$/, '')) continue;
    if (!PAGINA_CONTATO.test(`${url.pathname} ${l.texto || ''}`)) continue;
    vistos.add(chave);
    saida.push(url.href);
  }
  // "contato" antes de "sobre": é onde o e-mail costuma estar.
  saida.sort((a, b) => Number(/sobre|about|empresa|quem/i.test(a)) - Number(/sobre|about|empresa|quem/i.test(b)));
  return saida.slice(0, limite);
}

/** Primeiro e-mail válido de um campo que pode trazer vários ("a@x.com, b@y.com"). */
function primeiroEmail(campo) {
  const m = String(campo || '').match(/[^\s,;<>]+@[^\s,;<>]+\.[a-z]{2,}/i);
  return m ? m[0].toLowerCase() : '';
}

module.exports = {
  extraiEmails, ordenaEmails, linksDeContato, temEmailDoDominio, primeiroEmail, decodificaCfemail, desofusca,
};
