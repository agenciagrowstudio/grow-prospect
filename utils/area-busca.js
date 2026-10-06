/**
 * Busca por raio: um ponto (lat, lng) e uma distância em km.
 *
 * O Google Maps não tem parâmetro de raio. O que ele tem é a área visível do
 * mapa: abrindo a busca centrada no ponto, com o zoom certo, os resultados
 * vêm de dentro daquela janela. Depois, o que caiu fora do círculo é
 * descartado pela distância real.
 */

const RAIO_TERRA_KM = 6371;
// Metade da largura da janela do navegador do scraper (1366 px).
const MEIA_LARGURA_PX = 683;

function distanciaKm(a, b) {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
}

/**
 * Zoom do Google Maps em que a metade da janela cobre o raio. Arredonda para
 * baixo: melhor a janela um pouco maior que o círculo do que menor.
 */
function zoomParaRaio(lat, raioKm) {
  const metrosPorPixelNoZoom0 = 156543.03392 * Math.cos((lat * Math.PI) / 180);
  const z = Math.log2((metrosPorPixelNoZoom0 * MEIA_LARGURA_PX) / (raioKm * 1000));
  return Math.max(3, Math.min(17, Math.floor(z)));
}

function urlBuscaNaArea(consulta, area) {
  const zoom = zoomParaRaio(area.lat, area.raioKm);
  return `https://www.google.com/maps/search/${encodeURIComponent(consulta)}/@${area.lat},${area.lng},${zoom}z`;
}

/**
 * Separa o que está dentro do raio. Lead sem coordenada fica (é empresa que
 * atende por região e o Google não diz onde), mas é contado à parte.
 * Folga de 15%: a coordenada do Google não é exata ao metro.
 */
function filtraPorRaio(itens, area, folga = 1.15) {
  const limite = area.raioKm * folga;
  const dentro = [];
  let fora = 0;
  let semCoordenada = 0;
  for (const item of itens) {
    const lat = Number(item.latitude);
    const lng = Number(item.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0) || item.latitude === '') {
      semCoordenada++;
      dentro.push(item);
      continue;
    }
    const km = distanciaKm(area, { lat, lng });
    if (km <= limite) dentro.push({ ...item, distanciaKm: Math.round(km * 10) / 10 });
    else fora++;
  }
  return { dentro, fora, semCoordenada };
}

/** Valida o que vem da tela: ponto real e raio entre 1 e 100 km. */
function areaValida(area) {
  const lat = Number(area?.lat);
  const lng = Number(area?.lng);
  const raioKm = Number(area?.raioKm);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (!Number.isFinite(raioKm) || raioKm < 1 || raioKm > 100) return null;
  return { lat, lng, raioKm };
}

module.exports = { distanciaKm, zoomParaRaio, urlBuscaNaArea, filtraPorRaio, areaValida };
