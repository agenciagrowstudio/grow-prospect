/**
 * IA nos leads: só para os textos. Ela escreve o gancho da primeira mensagem
 * (um detalhe real do negócio), em português e em inglês.
 *
 * Quem é brasileiro não é mais decisão da IA: sai das regras, das avaliações
 * lidas na ficha do Google (quem avalia, em que língua, como o dono responde)
 * e do site lido aqui. O serviço a oferecer sai das regras da qualificação.
 *
 * O site é lido sem navegador: só o HTML, com tempo curto. Ele dá sinais para
 * as regras e assunto para o gancho.
 */
const { avaliaSinaisBrasileiros, extraiJson, NIVEL_ALTO, NIVEL_MEDIO } = require('./sinais-brasileiros');

const TEMPO_SITE_MS = 8000;
const SITES_EM_PARALELO = 4;
const LOTE_IA = 12;
// O Gemini grátis aceita poucas chamadas por minuto: espaço entre os lotes.
const ESPERA_ENTRE_LOTES_MS = 4500;
const TRECHO_SITE = 1400;

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function semTags(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MARCAS_PT = ['ção', 'ções', 'não', 'você', 'serviços', 'orçamento', 'atendimento', 'limpeza', 'nossa', 'nosso', 'qualidade', 'clientes', 'entre em contato'];

/** Lê o site e devolve o que interessa para saber quem é o negócio. */
async function lerSite(url, fetchImpl = fetch) {
  const endereco = /^https?:\/\//i.test(String(url || '')) ? String(url) : (url ? `https://${url}` : '');
  if (!endereco || /instagram\.com|facebook\.com|linktr\.ee|wa\.me/i.test(endereco)) return { ok: false };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TEMPO_SITE_MS);
  try {
    const res = await fetchImpl(endereco, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: 'text/html' },
    });
    if (!res.ok || !/html/i.test(res.headers.get('content-type') || 'text/html')) return { ok: false };
    const html = (await res.text()).slice(0, 400000);
    const lang = (html.match(/<html[^>]*\blang=["']?([a-z-]+)/i) || [])[1] || '';
    const titulo = semTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').slice(0, 140);
    const texto = semTags(html);
    const baixo = texto.toLowerCase();
    return {
      ok: true,
      lang: lang.toLowerCase(),
      titulo,
      trecho: texto.slice(0, TRECHO_SITE),
      falaPortugues: /falamos portugu[eê]s|we speak portuguese|atendemos em portugu[eê]s|portuguese[- ]speaking|brazilian[- ]owned|empresa brasileira/i.test(texto),
      whats55: /wa\.me\/55|api\.whatsapp\.com\/send\?phone=55|\+55[\s(]/i.test(html),
      marcasPt: MARCAS_PT.filter((m) => baixo.includes(m)).length,
    };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(t);
  }
}

/** Sinais do site somados aos das regras (nome, categoria, telefone...). */
function sinaisComSite(lead, site) {
  const regras = avaliaSinaisBrasileiros(lead);
  const sinais = [...regras.sinais];
  let pontos = regras.pontos;
  if (site?.ok) {
    if (site.lang.startsWith('pt')) { pontos += 40; sinais.push('site em português'); }
    if (site.falaPortugues) { pontos += 40; sinais.push('site diz que atende em português'); }
    if (site.whats55) { pontos += 25; sinais.push('WhatsApp +55 no site'); }
    if (!site.lang.startsWith('pt') && site.marcasPt >= 4) { pontos += 25; sinais.push('texto do site em português'); }
  }
  pontos = Math.min(100, pontos);
  return { pontos, sinais, nivel: pontos >= NIVEL_ALTO ? 'alto' : pontos >= NIVEL_MEDIO ? 'medio' : 'baixo' };
}

function montaPergunta(itens) {
  return {
    tarefa: [
      'Você escreve para a Grow+, agência de marketing que prospecta negócios locais (muitos de brasileiros nos EUA).',
      'Para cada negócio, escreva o gancho da primeira mensagem usando só os dados fornecidos, sem inventar:',
      'gancho: UMA frase curta e verdadeira, em português, citando um detalhe real do negócio tirado dos dados (site, avaliações de clientes, categoria, cidade). Ex.: "Vi que vocês fazem limpeza pós-obra em Framingham e Natick." ou "Vi que os clientes elogiam muito a pontualidade de vocês.".',
      'Se não houver detalhe concreto, gancho vazio. ganchoEn: a mesma frase em inglês. Não use travessão.',
    ].join(' '),
    formato: '{"resultados":[{"id":"...","gancho":"...","ganchoEn":"..."}]}',
    negocios: itens.map(({ id, lead, site, sinais }) => {
      const e = lead.company || lead;
      return {
        id,
        nome: e.name || '',
        categoria: e.category || '',
        cidade: e.city || '',
        estado: e.state || '',
        pais: e.pais || '',
        notaGoogle: e.rating || null,
        avaliacoes: e.reviewCount || e.reviews || 0,
        temSite: Boolean(e.website),
        temInstagram: Boolean(e.instagram),
        site: site?.ok ? { idioma: site.lang, titulo: site.titulo, trecho: site.trecho } : null,
        avaliacoesDeClientes: (e.avaliacoesLidas?.trechos || lead.avaliacoesLidas?.trechos || []).slice(0, 4),
      };
    }),
  };
}

function limpaTexto(t, max) {
  return String(t || '').replace(/\s+/g, ' ').replace(/[—–]/g, ',').trim().slice(0, max);
}

/**
 * @param {object[]} leads
 * @param {object} ai configuração da IA (a mesma do Lead Scoring)
 * @param {{onProgresso?: Function, deps?: object}} op
 * @returns {Promise<{id, sinalBr, ia}[]>}
 */
async function analisaLeadsComIA(leads, ai = {}, { onProgresso, deps = {} } = {}) {
  const { resolveProviderConfig, requestChatCompletion } = deps.analisador || require('./ai-sales-analyzer');
  const fetchImpl = deps.fetch || fetch;
  const config = resolveProviderConfig(ai);
  if (!config.apiKey) throw new Error('Configure a chave de IA em Configurações antes de analisar.');

  const total = leads.length;
  const itens = leads.map((lead, i) => ({ id: String(lead.id || i), lead, site: null, sinais: null }));

  // 1. Sites, poucos de cada vez.
  let lidos = 0;
  for (let i = 0; i < itens.length; i += SITES_EM_PARALELO) {
    const grupo = itens.slice(i, i + SITES_EM_PARALELO);
    await Promise.all(grupo.map(async (it) => {
      it.site = it.lead.website ? await lerSite(it.lead.website, fetchImpl) : { ok: false };
      it.sinais = sinaisComSite(it.lead, it.site);
      lidos += 1;
    }));
    onProgresso?.({ etapa: 'sites', atual: lidos, total });
  }

  // 2. IA em lotes.
  const decisoes = new Map();
  let feitos = 0;
  for (let i = 0; i < itens.length; i += LOTE_IA) {
    const lote = itens.slice(i, i + LOTE_IA);
    try {
      const resposta = await requestChatCompletion(config, montaPergunta(lote));
      const dados = extraiJson(resposta?.choices?.[0]?.message?.content);
      (Array.isArray(dados?.resultados) ? dados.resultados : []).forEach((r) => {
        if (r && r.id != null) decisoes.set(String(r.id), r);
      });
    } catch (e) {
      if (e?.status === 401 || e?.status === 403) throw new Error('A chave de IA foi recusada. Confira em Configurações.');
      // Outro erro (limite, rede): esse lote fica só com os sinais do site.
    }
    feitos += lote.length;
    onProgresso?.({ etapa: 'ia', atual: feitos, total });
    if (i + LOTE_IA < itens.length) await espera(ESPERA_ENTRE_LOTES_MS);
  }

  const agora = Date.now();
  return itens.map(({ id, sinais, site }) => {
    const d = decisoes.get(id);
    const ia = d ? {
      gancho: limpaTexto(d.gancho, 220),
      ganchoEn: limpaTexto(d.ganchoEn, 220),
      leuSite: Boolean(site?.ok),
      ts: agora,
    } : null;
    // O sinal brasileiro é das regras (com o site lido), nunca da IA.
    return { id, sinalBr: { pontos: sinais.pontos, nivel: sinais.nivel, sinais: sinais.sinais, fonte: 'regras' }, ia };
  });
}

module.exports = { analisaLeadsComIA, lerSite, sinaisComSite, montaPergunta };
