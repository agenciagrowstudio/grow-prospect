/**
 * Análise com IA dos leads, numa chamada só por lote:
 *
 * 1. Quem é: brasileiro ou americano, lendo o site (idioma, "falamos
 *    português", WhatsApp +55) junto com os dados do Google.
 * 2. O que oferecer: o serviço da Grow+ que mais faz sentido e o porquê.
 * 3. Um detalhe real do negócio para personalizar a primeira mensagem.
 *
 * O site é lido aqui, sem navegador: só o HTML, com tempo curto. Site que não
 * abre não impede a análise; a IA decide com o que houver.
 */
const { avaliaSinaisBrasileiros, extraiJson, NIVEL_ALTO, NIVEL_MEDIO } = require('./sinais-brasileiros');

const TEMPO_SITE_MS = 8000;
const SITES_EM_PARALELO = 4;
const LOTE_IA = 12;
// O Gemini grátis aceita poucas chamadas por minuto: espaço entre os lotes.
const ESPERA_ENTRE_LOTES_MS = 4500;
const TRECHO_SITE = 1400;

const SERVICOS = {
  site: 'Site: não tem site próprio ou o site é fraco (lento, não funciona no celular, sem botão de WhatsApp).',
  google: 'Google Negócio: nota baixa, poucas avaliações ou ficha incompleta.',
  redes: 'Gestão de redes: não tem Instagram ou está parado.',
  conteudo: 'Conteúdo: tem Instagram, mas precisa de posts, vídeos e constância.',
  sistema: 'Sistema: vive de agenda ou pedido (agendamento online, orçamento, reservas).',
};

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
      'Você ajuda a Grow+, agência de marketing que prospecta negócios locais (muitos de brasileiros nos EUA).',
      'Para cada negócio, responda três coisas usando só os dados fornecidos, sem inventar:',
      '1) brasileiro: o negócio é de brasileiros ou atende a comunidade brasileira? Considere nome, site em português, menção a português, WhatsApp +55, nomes brasileiros. Sem evidência, brasileiro=false com confiança baixa (até 0.4).',
      '2) servico: qual serviço da Grow+ oferecer primeiro (um dos ids de "servicos") e motivoServico curto (até 14 palavras).',
      '3) gancho: UMA frase curta e verdadeira, em português, citando um detalhe real do negócio tirado dos dados (ex.: "Vi que vocês fazem limpeza pós-obra em Framingham e Natick."). Se não houver detalhe concreto, gancho vazio. ganchoEn: a mesma frase em inglês.',
    ].join(' '),
    servicos: SERVICOS,
    formato: '{"resultados":[{"id":"...","brasileiro":true,"confianca":0.0,"motivo":"...","servico":"site","motivoServico":"...","gancho":"...","ganchoEn":"..."}]}',
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
        sinaisEncontrados: sinais.sinais,
        site: site?.ok ? { idioma: site.lang, titulo: site.titulo, trecho: site.trecho } : null,
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
    let { pontos, nivel } = sinais;
    const lista = [...sinais.sinais];
    let ia = null;
    if (d) {
      const confianca = Math.max(0, Math.min(1, Number(d.confianca) || 0));
      const brasileiro = d.brasileiro === true;
      if (brasileiro && confianca >= 0.6) pontos = Math.max(pontos, Math.round(50 + confianca * 40));
      if (!brasileiro && confianca >= 0.7) pontos = Math.min(pontos, 15);
      nivel = pontos >= NIVEL_ALTO ? 'alto' : pontos >= NIVEL_MEDIO ? 'medio' : 'baixo';
      if (d.motivo) lista.push(`IA: ${limpaTexto(d.motivo, 160)}`);
      ia = {
        publico: brasileiro ? 'brus' : 'us',
        confianca,
        motivo: limpaTexto(d.motivo, 200),
        servico: Object.prototype.hasOwnProperty.call(SERVICOS, d.servico) ? d.servico : null,
        motivoServico: limpaTexto(d.motivoServico, 140),
        gancho: limpaTexto(d.gancho, 220),
        ganchoEn: limpaTexto(d.ganchoEn, 220),
        leuSite: Boolean(site?.ok),
        ts: agora,
      };
    }
    return { id, sinalBr: { pontos, nivel, sinais: lista, fonte: d ? 'ia' : 'regras' }, ia };
  });
}

module.exports = { analisaLeadsComIA, lerSite, sinaisComSite, montaPergunta, SERVICOS };
