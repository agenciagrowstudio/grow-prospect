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

/**
 * Quantos leads de cada extração já foram abordados na Fila do dia. Só conta
 * quem tem telefone (os outros não entram na Fila). Qualquer marcação vale:
 * enviada, respondeu, sem WhatsApp ou pulada.
 * @returns {Record<string, {total: number, abordados: number}>}
 */
export function progressoPorBusca(leads = [], log = {}) {
  const m = {};
  leads.forEach((l) => {
    const k = String(l?.searchId || '');
    if (!k || !(l.whatsapp || l.phone || l.tel)) return;
    if (!m[k]) m[k] = { total: 0, abordados: 0 };
    m[k].total += 1;
    if (log && log[String(l.id)]) m[k].abordados += 1;
  });
  return m;
}

/** Cidade concluída: todo lead com telefone já passou pela Fila. */
export const estaConcluida = (p) => Boolean(p && p.total > 0 && p.abordados >= p.total);

/** Todas as áreas extraídas, da mais nova para a mais antiga. */
export function areasExtraidas(buscas = [], leads = [], log = null) {
  const porBusca = new Map();
  leads.forEach((l) => {
    const k = String(l?.searchId || '');
    if (!porBusca.has(k)) porBusca.set(k, []);
    porBusca.get(k).push(l);
  });
  const progresso = log ? progressoPorBusca(leads, log) : {};
  return buscas
    .map((b) => {
      const a = areaDaBusca(b, porBusca.get(String(b?.id)) || []);
      if (!a) return null;
      const p = progresso[a.id] || { total: 0, abordados: 0 };
      return { ...a, progresso: p, concluida: estaConcluida(p) };
    })
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

// Dados do Google que mudam com o tempo (ou que versões antigas não pegavam,
// como o número de avaliações): o resultado novo atualiza o lead que já existe.
const CAMPOS_ATUALIZAVEIS = ['rating', 'reviews', 'reviewCount', 'totalReviews', 'phone', 'website', 'photos', 'openingHours'];

/**
 * Atualiza na base os leads que reapareceram, sem mexer no que é do usuário
 * (id, extração de origem, marcação de público, análise).
 * @returns {{base: object[], atualizados: number}}
 */
export function atualizaExistentes(base = [], resultado = []) {
  const porId = new Map(resultado.map((l) => [identidadeLead(l), l]));
  let atualizados = 0;
  const nova = base.map((l) => {
    const veio = porId.get(identidadeLead(l));
    if (!veio) return l;
    const mudou = {};
    CAMPOS_ATUALIZAVEIS.forEach((c) => {
      const v = veio[c];
      const vazio = v === undefined || v === null || v === '' || v === 0 || v === '0';
      if (!vazio && JSON.stringify(v) !== JSON.stringify(l[c])) mudou[c] = v;
    });
    if (!Object.keys(mudou).length) return l;
    atualizados += 1;
    return { ...l, ...mudou };
  });
  return { base: nova, atualizados };
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
