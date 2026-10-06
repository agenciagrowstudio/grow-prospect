/**
 * Foto de destaque de uma cidade, para o banner da lista de leads.
 *
 * Vem da Wikipédia (a imagem principal do artigo da cidade), e não do Google
 * Imagens: as fotos do Google têm dono e copiá-las automaticamente fere os
 * termos de uso; as da Wikipédia são de uso livre e a API é aberta. Cidade do
 * Brasil busca na Wikipédia em português, dos EUA na em inglês.
 *
 * O resultado fica em cache por cidade, inclusive o "não achei", para não
 * consultar de novo a cada vez que a lista muda.
 */
const fs = require('fs');
const path = require('path');

const USER_AGENT = 'GrowMaisProspect/1.0 (grow-prospect)';
const LARGURA = 1200;

const ESTADOS_US = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

const ESTADOS_BR = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

/** Títulos prováveis do artigo, do mais exato para o mais solto. */
function titulosProvaveis(cidade, uf, sigla) {
  const c = String(cidade || '').trim();
  const u = String(uf || '').trim().toUpperCase();
  if (sigla === 'US') {
    const estado = ESTADOS_US[u] || u;
    return estado ? [`${c}, ${estado}`, c] : [c];
  }
  const estado = ESTADOS_BR[u];
  return estado ? [c, `${c} (${estado})`] : [c];
}

function pagina(json) {
  const paginas = Object.values(json?.query?.pages || {});
  return paginas.find((p) => !p.missing && !p.pageprops?.disambiguation && p.thumbnail?.source) || null;
}

async function buscaJson(fetchFn, url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetchFn(url, { signal: ctrl.signal, headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @returns {Promise<{ url: string, artigo: string, fonte: string } | null>}
 */
async function buscaImagemCidade({ cidade, uf, pais }, { fetchFn = fetch } = {}) {
  const sigla = String(pais || 'BR').toUpperCase() === 'US' ? 'US' : 'BR';
  const wiki = sigla === 'US' ? 'https://en.wikipedia.org' : 'https://pt.wikipedia.org';
  const base = `${wiki}/w/api.php?action=query&format=json&prop=pageimages|pageprops&piprop=thumbnail&pithumbsize=${LARGURA}&redirects=1`;

  for (const titulo of titulosProvaveis(cidade, uf, sigla)) {
    const p = pagina(await buscaJson(fetchFn, `${base}&titles=${encodeURIComponent(titulo)}`));
    if (p) return { url: p.thumbnail.source, artigo: p.title, fonte: 'Wikipédia' };
  }
  // Título não bateu: a busca da própria Wikipédia costuma acertar a cidade.
  const estado = sigla === 'US' ? ESTADOS_US[String(uf).toUpperCase()] : ESTADOS_BR[String(uf).toUpperCase()];
  const termo = [cidade, estado, sigla === 'US' ? 'city' : 'município'].filter(Boolean).join(' ');
  const p = pagina(await buscaJson(fetchFn, `${base}&generator=search&gsrlimit=1&gsrsearch=${encodeURIComponent(termo)}`));
  return p ? { url: p.thumbnail.source, artigo: p.title, fonte: 'Wikipédia' } : null;
}

function criaCacheEmArquivo(arquivo) {
  let dados = null;
  const ler = () => {
    if (dados) return dados;
    try {
      dados = fs.existsSync(arquivo) ? JSON.parse(fs.readFileSync(arquivo, 'utf-8')) : {};
    } catch {
      dados = {};
    }
    return dados;
  };
  return {
    get: (k) => ler()[k],
    set: (k, v) => {
      ler()[k] = v;
      try {
        fs.mkdirSync(path.dirname(arquivo), { recursive: true });
        fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2));
      } catch {
        /* cache é conveniência */
      }
    },
  };
}

/** Busca com cache; "não achei" também fica guardado por uma semana. */
async function imagemCidadeComCache(entrada, cache, opcoes = {}) {
  const chave = [entrada.pais, entrada.uf, entrada.cidade].map((v) => String(v || '').toLowerCase().trim()).join('|');
  const salvo = cache.get(chave);
  const semana = 7 * 24 * 60 * 60 * 1000;
  if (salvo && (salvo.url || Date.now() - salvo.em < semana)) return salvo.url ? salvo : null;
  const achado = await buscaImagemCidade(entrada, opcoes);
  cache.set(chave, { ...(achado || {}), em: Date.now() });
  return achado;
}

module.exports = { buscaImagemCidade, imagemCidadeComCache, criaCacheEmArquivo, titulosProvaveis };
