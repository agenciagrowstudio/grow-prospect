/**
 * Cobertura: o que já foi extraído, para mapear a região aos poucos sem
 * repetir. Cada extração vira uma área (cidade, bairro, estado ou raio) com o
 * nicho buscado. A tela pinta essas áreas de azul e avisa antes de extrair de
 * novo o mesmo nicho no mesmo lugar.
 *
 * Tudo sai de sigma_searches, que já sincroniza pela nuvem: não existe uma
 * lista separada para manter em dia.
 */

const RAIO_TERRA_KM = 6371;

export function norm(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

/** "House cleaning" e "house  cleaning" são o mesmo nicho. */
export const chaveNicho = (nicho) => norm(nicho);

/** Mesmo lugar = mesmo país, estado e nome (bairro leva a cidade junto). */
export function chaveLugar(local) {
  if (!local) return '';
  const pais = String(local.pais || 'BR').toUpperCase();
  const uf = String(local.uf || '').toUpperCase();
  if (local.tipo === 'estado') return `${pais}|${uf}|estado`;
  const cidade = norm(local.cidade || local.nome);
  if (local.tipo === 'bairro') return `${pais}|${uf}|${cidade}|${norm(local.nome)}`;
  return `${pais}|${uf}|${cidade}`;
}

export function distanciaKm(a, b) {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
}

function coordenada(lead) {
  const lat = Number(lead?.latitude);
  const lng = Number(lead?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
}

/**
 * Extração antiga não guardava onde foi: a área sai dos próprios leads
 * (centro deles e a distância que cobre 90% deles).
 */
function areaPelosLeads(leads) {
  const pontos = leads.map(coordenada).filter(Boolean);
  if (pontos.length < 2) return null;
  const centro = {
    lat: pontos.reduce((s, p) => s + p.lat, 0) / pontos.length,
    lng: pontos.reduce((s, p) => s + p.lng, 0) / pontos.length,
  };
  const dists = pontos.map((p) => distanciaKm(centro, p)).sort((a, b) => a - b);
  const p90 = dists[Math.min(dists.length - 1, Math.floor(dists.length * 0.9))];
  return { ...centro, raioKm: Math.max(1, Math.round(p90 * 10) / 10) };
}

/** Partes do rótulo antigo "nicho · onde · EUA". */
function partesDoRotulo(busca) {
  const partes = String(busca?.label || '').split(' · ').filter(Boolean);
  return { nicho: partes[0] || busca?.query || '', onde: partes[1] || '' };
}

/**
 * @param {object} busca registro de sigma_searches
 * @param {object[]} leadsDaBusca leads com esse searchId
 */
export function areaDaBusca(busca, leadsDaBusca = []) {
  if (!busca) return null;
  const rotulo = partesDoRotulo(busca);
  const base = {
    id: String(busca.id),
    nicho: busca.nicho || rotulo.nicho,
    ts: Number(busca.timestamp || busca.ts || 0),
    leads: leadsDaBusca.length,
    pais: String(busca.pais || busca.area?.pais || 'BR').toUpperCase(),
  };
  const a = busca.area;
  if (a && Number.isFinite(Number(a.lat)) && Number.isFinite(Number(a.lng))) {
    const tipo = a.raioKm ? 'raio' : (a.tipo || 'cidade');
    return {
      ...base,
      tipo,
      lat: Number(a.lat),
      lng: Number(a.lng),
      raioKm: a.raioKm ? Number(a.raioKm) : null,
      lugar: tipo === 'raio' ? '' : chaveLugar(a),
      local: a,
      rotulo: a.rotulo || rotulo.onde,
      aproximada: false,
    };
  }
  const pelosLeads = areaPelosLeads(leadsDaBusca);
  if (!pelosLeads) return null;
  return {
    ...base,
    tipo: 'raio',
    ...pelosLeads,
    lugar: '',
    local: null,
    rotulo: rotulo.onde,
    aproximada: true,
  };
}

/** Todas as áreas extraídas, da mais nova para a mais antiga. */
export function areasExtraidas(buscas = [], leads = []) {
  const porBusca = new Map();
  leads.forEach((l) => {
    const k = String(l?.searchId || '');
    if (!porBusca.has(k)) porBusca.set(k, []);
    porBusca.get(k).push(l);
  });
  return buscas
    .map((b) => areaDaBusca(b, porBusca.get(String(b?.id)) || []))
    .filter(Boolean)
    .sort((x, y) => y.ts - x.ts);
}

/**
 * Já foi extraído este nicho neste lugar? Cidade, bairro e estado comparam
 * pelo nome; raio, se o círculo novo cabe dentro de um já feito.
 * @returns {object|null} a área que já cobre
 */
export function jaExtraida(areas, nicho, local, raioKm = null) {
  const n = chaveNicho(nicho);
  if (!n || !local) return null;
  const doNicho = areas.filter((a) => chaveNicho(a.nicho) === n);
  if (!raioKm) {
    const lugar = chaveLugar(local);
    return doNicho.find((a) => a.lugar && a.lugar === lugar) || null;
  }
  if (!Number.isFinite(Number(local.lat))) return null;
  const centro = { lat: Number(local.lat), lng: Number(local.lng) };
  return doNicho.find((a) => a.tipo === 'raio' && a.raioKm
    && distanciaKm(centro, a) + Number(raioKm) <= a.raioKm * 1.05) || null;
}

/** Identidade do lead para não guardar o mesmo negócio duas vezes. */
export function identidadeLead(lead) {
  if (lead?.placeId) return `p:${lead.placeId}`;
  return `n:${norm(lead?.name)}|${norm(lead?.address)}`;
}

/** Separa o que é novo do que já estava na base. */
export function separaNovos(resultado = [], base = []) {
  const vistos = new Set(base.map(identidadeLead));
  const novos = [];
  let repetidos = 0;
  resultado.forEach((l) => {
    const k = identidadeLead(l);
    if (vistos.has(k)) { repetidos += 1; return; }
    vistos.add(k);
    novos.push(l);
  });
  return { novos, repetidos };
}
