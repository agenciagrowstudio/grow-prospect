/**
 * Sugere os bairros de uma cidade a partir do OpenStreetMap, de graça.
 *
 * Existe porque o Google Maps devolve no máximo uns 120 resultados por busca.
 * Uma busca por bairro, somada e sem repetição, cobre a cidade inteira.
 *
 * Como: o Nominatim acha o retângulo da cidade, o app espalha uma grade de
 * pontos sobre ele e pergunta o bairro de cada ponto. A grade cobre a cidade
 * por igual, o que importa mais que ter a lista completa de bairros. O Overpass
 * listaria tudo, mas os servidores públicos dele vivem ocupados; o Nominatim
 * responde.
 *
 * Política de uso do Nominatim: no máximo 1 pedido por segundo e User-Agent
 * identificado. Por isso a grade é sequencial e o resultado fica em cache.
 */
const fs = require('fs');
const path = require('path');

const USER_AGENT = 'GrowMaisProspect/1.0 (grow-prospect)';
const BASE = 'https://nominatim.openstreetmap.org';
const LADO_GRADE = 5;
const INTERVALO_MS = 1100;

/** Escolhe o resultado que é a cidade, e não uma rua ou loja com o mesmo nome. */
function escolheCidade(resultados = []) {
  const comArea = resultados.filter((r) => Array.isArray(r.boundingbox));
  const tipos = ['city', 'town', 'municipality', 'village', 'administrative'];
  return comArea.find((r) => r.class === 'boundary' || tipos.includes(r.type))
    || comArea.find((r) => r.class === 'place')
    || comArea[0]
    || null;
}

/** Pontos no centro de cada célula de uma grade lado x lado sobre o retângulo. */
function gradeDePontos(boundingbox, lado = LADO_GRADE) {
  const [sul, norte, oeste, leste] = boundingbox.map(Number);
  const pontos = [];
  for (let i = 0; i < lado; i++) {
    for (let j = 0; j < lado; j++) {
      pontos.push({
        lat: sul + ((i + 0.5) / lado) * (norte - sul),
        lon: oeste + ((j + 0.5) / lado) * (leste - oeste),
      });
    }
  }
  return pontos;
}

function semAcento(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Nome do bairro de um resultado de geocodificação reversa, ou null quando o
 * ponto caiu fora da cidade (o retângulo pega pedaço de cidade vizinha e mar).
 * Nos EUA muito endereço não tem bairro; o ZIP code faz o papel e o Maps
 * entende "dentist 32801".
 */
function bairroDoPonto(reverso, nomeCidade, sigla) {
  const a = reverso?.address;
  if (!a) return null;
  const cidadeDoPonto = a.city || a.town || a.municipality || a.village || '';
  if (nomeCidade && semAcento(cidadeDoPonto) !== semAcento(nomeCidade)) return null;
  const nome = a.suburb || a.neighbourhood || a.quarter || a.city_district || a.borough
    || (sigla === 'US' && a.postcode ? String(a.postcode).slice(0, 5) : null);
  // Aeroporto e parque aparecem como "bairro" no mapa, mas não têm comércio.
  if (!nome || /airport|aeroporto|national park|parque nacional/i.test(nome)) return null;
  return String(nome).trim();
}

function caminhoCache() {
  try {
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'bairros-cache.json');
  } catch {
    return null;
  }
}

function lerCache() {
  const p = caminhoCache();
  try {
    return p && fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : {};
  } catch {
    return {};
  }
}

function gravarCache(cache) {
  const p = caminhoCache();
  if (!p) return;
  try {
    fs.writeFileSync(p, JSON.stringify(cache, null, 2));
  } catch {
    /* cache é conveniência */
  }
}

async function buscaJson(fetchFn, url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetchFn(url, { signal: ctrl.signal, headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'pt-BR,en' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string} cidade ex.: "Rio de Janeiro, RJ" ou "Orlando, FL"
 * @param {{ sigla: string, codigoNominatim: string }} pais
 * @returns {Promise<{ bairros: string[], cidadeEncontrada: string, doCache?: boolean }>}
 */
async function sugereBairros(cidade, pais, opcoes = {}) {
  const { fetchFn = fetch, espera = (ms) => new Promise((r) => setTimeout(r, ms)), onProgresso = () => {}, lado = LADO_GRADE } = opcoes;
  const q = String(cidade || '').trim();
  if (!q) throw new Error('Informe a cidade primeiro.');

  const chave = `${pais.sigla}|${semAcento(q)}|${lado}`;
  const cache = opcoes.semCache ? {} : lerCache();
  if (cache[chave]?.bairros?.length) return { ...cache[chave], doCache: true };

  const resultados = await buscaJson(fetchFn, `${BASE}/search?format=json&addressdetails=1&limit=5&countrycodes=${encodeURIComponent(pais.codigoNominatim)}&q=${encodeURIComponent(q)}`);
  const cidadeOsm = escolheCidade(resultados);
  if (!cidadeOsm) throw new Error('Não achei essa cidade no mapa. Confira o nome.');
  const a = cidadeOsm.address || {};
  const nomeCidade = a.city || a.town || a.municipality || a.village || cidadeOsm.name || '';

  const pontos = gradeDePontos(cidadeOsm.boundingbox, lado);
  const contagem = new Map();
  let falhas = 0;
  for (let i = 0; i < pontos.length; i++) {
    await espera(INTERVALO_MS);
    onProgresso(i + 1, pontos.length);
    try {
      const r = await buscaJson(fetchFn, `${BASE}/reverse?format=json&zoom=16&addressdetails=1&lat=${pontos[i].lat}&lon=${pontos[i].lon}`);
      const nome = bairroDoPonto(r, nomeCidade, pais.sigla);
      if (nome) contagem.set(nome, (contagem.get(nome) || 0) + 1);
    } catch {
      falhas++;
      if (falhas >= 5 && contagem.size === 0) throw new Error('O serviço de mapas não respondeu. Tente de novo em instantes.');
    }
  }

  // Bairro que apareceu em mais pontos é maior: vai primeiro.
  const bairros = [...contagem.entries()]
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'pt-BR'))
    .map(([nome]) => nome);
  const resultado = { bairros, cidadeEncontrada: cidadeOsm.display_name || q };
  if (bairros.length) {
    cache[chave] = { ...resultado, em: Date.now() };
    gravarCache(cache);
  }
  return resultado;
}

module.exports = { sugereBairros, escolheCidade, gradeDePontos, bairroDoPonto };
