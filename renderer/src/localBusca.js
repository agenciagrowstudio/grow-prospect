/**
 * O "onde" da extração: entende o que o usuário digitou ou colou.
 *
 * - Texto (cidade, bairro, endereço): sugestões do Brasil e dos EUA juntas,
 *   primeiro da lista local (instantânea), depois do OpenStreetMap.
 * - Coordenadas ("28.53, -81.37") ou link do Google Maps: vira um ponto.
 *
 * O país sai do lugar escolhido. Não existe mais seletor de país: era ele que
 * fazia uma busca em Orlando acontecer "no Brasil" quando ninguém trocava.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

/** Ponto colado: coordenadas soltas ou link do Google Maps. */
export function lerLocalColado(texto = '') {
  let t = String(texto || '').trim();
  try { t = decodeURIComponent(t); } catch { /* texto comum */ }
  const padroes = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, // lugar exato num link de lugar
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),\d/, // centro do mapa num link
    /[?&](?:q|ll|query)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, // ?q=lat,lng
    /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/, // "28.53, -81.37"
  ];
  for (const re of padroes) {
    const m = t.match(re);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)) return { lat, lng };
  }
  return null;
}

/** País de uma coordenada, pelos retângulos de Brasil e EUA (com Alasca e Havaí). */
export function paisDaCoordenada(lat, lng) {
  if (lat >= -34 && lat <= 5.5 && lng >= -74 && lng <= -34) return 'BR';
  const continental = lat >= 24 && lat <= 49.5 && lng >= -125 && lng <= -66;
  const alasca = lat >= 51 && lat <= 72 && lng >= -170 && lng <= -129;
  const havai = lat >= 18.5 && lat <= 22.5 && lng >= -161 && lng <= -154;
  return continental || alasca || havai ? 'US' : null;
}

/** Palpite de país só pelo texto: ", FL", "Massachusetts", "USA"... */
export function paisDoTexto(texto = '') {
  const t = String(texto);
  if (/\b(usa|eua|estados unidos|united states)\b/i.test(t)) return 'US';
  if (/,\s*[A-Z]{2}(\s+\d{5})?\s*$/.test(t) && !/,\s*(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\s*$/.test(t)) return 'US';
  return 'BR';
}

function siglaUf(endereco = {}) {
  const iso = endereco['ISO3166-2-lvl4'] || '';
  return iso.includes('-') ? iso.split('-')[1] : '';
}

function tipoDo(r) {
  const t = r.addresstype || r.type || '';
  if (['state'].includes(t)) return 'estado';
  if (['city', 'town', 'municipality', 'village'].includes(t)) return 'cidade';
  if (['suburb', 'neighbourhood', 'quarter', 'city_district', 'borough'].includes(t)) return 'bairro';
  return 'lugar';
}

const cache = new Map();

/** Sugestões do OpenStreetMap, só Brasil e EUA. */
export async function buscaLocais(texto, { signal } = {}) {
  const q = String(texto || '').trim();
  if (q.length < 3) return [];
  if (cache.has(q)) return cache.get(q);
  const url = `${NOMINATIM}?format=json&addressdetails=1&limit=6&countrycodes=br,us&accept-language=pt-BR&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const dados = await res.json();
  const lista = dados.map((r) => {
    const a = r.address || {};
    const pais = String(a.country_code || '').toUpperCase() === 'US' ? 'US' : 'BR';
    const cidade = a.city || a.town || a.municipality || a.village || '';
    const tipo = tipoDo(r);
    const nome = tipo === 'cidade' ? cidade || r.name : r.name || cidade;
    const uf = siglaUf(a);
    const detalhe = [tipo === 'cidade' ? '' : cidade, uf].filter(Boolean).join(', ');
    return {
      nome,
      detalhe,
      cidade: cidade || (tipo === 'estado' ? '' : nome),
      uf,
      pais,
      tipo,
      lat: Number(r.lat),
      lng: Number(r.lon),
      chave: `osm-${r.osm_type}-${r.osm_id}`,
    };
  }).filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng));
  cache.set(q, lista);
  return lista;
}

export const ROTULO_TIPO = { cidade: 'Cidade', estado: 'Estado', bairro: 'Bairro', lugar: 'Endereço', ponto: 'Ponto' };
export const ROTULO_PAIS = { BR: 'Brasil', US: 'EUA' };
