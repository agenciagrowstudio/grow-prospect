/**
 * Contorno das cidades (e bairros e estados) no OpenStreetMap, para pintar a
 * área extraída exatamente como ela é, não como um círculo.
 *
 * Fica guardado só neste computador: é grande, não muda e dá para baixar de
 * novo. O Nominatim pede no máximo uma consulta por segundo, por isso a fila.
 */

const CHAVE = 'prospector_poligonos';
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const ESPACO_MS = 1100;

let memoria = null;
function cache() {
  if (memoria) return memoria;
  try { memoria = JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}; } catch { memoria = {}; }
  return memoria;
}
function guarda(chave, valor) {
  const c = cache();
  c[chave] = valor;
  try { localStorage.setItem(CHAVE, JSON.stringify(c)); } catch {
    // Sem espaço: esvazia o cache e guarda só este.
    memoria = { [chave]: valor };
    try { localStorage.setItem(CHAVE, JSON.stringify(memoria)); } catch { /* fica na memória */ }
  }
}

let fila = Promise.resolve();
let ultima = 0;
function naFila(tarefa) {
  const vez = fila.then(async () => {
    const espera = ultima + ESPACO_MS - Date.now();
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    ultima = Date.now();
    return tarefa();
  });
  fila = vez.catch(() => {});
  return vez;
}

const ehArea = (g) => g && (g.type === 'Polygon' || g.type === 'MultiPolygon');

function consultaTexto(local) {
  const pais = local.pais === 'US' ? 'USA' : 'Brasil';
  if (local.tipo === 'estado') return `${local.nome}, ${pais}`;
  if (local.tipo === 'bairro') return [local.nome, local.cidade, local.uf, pais].filter(Boolean).join(', ');
  return [local.cidade || local.nome, local.uf, pais].filter(Boolean).join(', ');
}

/** "osm-relation-123" ou "rev-relation-123" vira "R123" para o lookup. */
function osmDaChave(chave = '') {
  const m = String(chave).match(/(?:osm|rev)-(node|way|relation)-(\d+)/);
  return m ? `${m[1][0].toUpperCase()}${m[2]}` : '';
}

/**
 * @param {{nome,cidade,uf,pais,tipo,chave}} local
 * @param {string} chaveCache chaveLugar do local
 * @returns {Promise<object|null>} GeoJSON (Polygon ou MultiPolygon) ou null
 */
export async function poligonoDoLugar(local, chaveCache) {
  if (!local || !chaveCache) return null;
  const c = cache();
  if (chaveCache in c) return c[chaveCache];
  return naFila(async () => {
    if (chaveCache in cache()) return cache()[chaveCache];
    try {
      const osm = osmDaChave(local.chave);
      const url = osm
        ? `${NOMINATIM}/lookup?format=json&polygon_geojson=1&polygon_threshold=0.0015&osm_ids=${osm}`
        : `${NOMINATIM}/search?format=json&polygon_geojson=1&polygon_threshold=0.0015&limit=3&countrycodes=br,us&q=${encodeURIComponent(consultaTexto(local))}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const lista = await res.json();
      const geo = (Array.isArray(lista) ? lista : []).map((r) => r.geojson).find(ehArea) || null;
      // Guarda até o "não achei", para não perguntar de novo a cada abertura.
      guarda(chaveCache, geo);
      return geo;
    } catch {
      return null; // sem internet: pinta o círculo e tenta de novo depois
    }
  });
}
