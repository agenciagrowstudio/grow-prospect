import L from 'leaflet';
import { poligonoDoLugar } from '../poligonos';

/**
 * Pinta de azul as áreas já extraídas numa camada do Leaflet. Raio vira
 * círculo na hora; cidade, bairro e estado começam como círculo e trocam pelo
 * contorno real assim que ele chega do OpenStreetMap.
 */
export const AZUL = '#0E6BEC';
// Cidade concluída: todos os leads dela já foram abordados.
export const VERDE = '#00A34D';

const RAIO_PROVISORIO_KM = { cidade: 4, bairro: 1.2, estado: 120 };

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function dataCurta(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function textoDaArea(a) {
  const partes = [a.rotulo, dataCurta(a.ts), `${a.leads} lead${a.leads === 1 ? '' : 's'}`].filter(Boolean);
  const p = a.progresso;
  const andamento = p && p.total
    ? `<br>${a.concluida ? '<b>Concluída:</b> ' : ''}${p.abordados} de ${p.total} abordados`
    : '';
  return `<b>${esc(a.nicho || 'Extração')}</b><br>${esc(partes.join(' · '))}${andamento}${a.aproximada ? '<br><i>área aproximada pelos leads</i>' : ''}`;
}

/**
 * @param {L.LayerGroup} camada
 * @param {object[]} areas de areasExtraidas
 * @param {{destaque?: string, vivo?: () => boolean, tracejado?: boolean, aoClicar?: (a) => void}} op
 */
export function desenhaAreas(camada, areas, op = {}) {
  camada.clearLayers();
  areas.forEach((a) => {
    const forte = op.destaque && a.id === op.destaque;
    const cor = a.concluida ? VERDE : AZUL;
    const estilo = {
      color: cor,
      weight: forte ? 2.5 : 1.5,
      opacity: forte ? 1 : 0.85,
      fillColor: cor,
      // Azul pouco transparente: a área feita salta aos olhos, os pinos continuam por cima.
      fillOpacity: forte ? 0.36 : 0.26,
    };
    const raio = a.raioKm || RAIO_PROVISORIO_KM[a.tipo] || 4;
    const circulo = L.circle([a.lat, a.lng], { ...estilo, radius: raio * 1000 });
    circulo.bindTooltip(textoDaArea(a), { sticky: true, className: 'area-dica' });
    if (op.aoClicar) circulo.on('click', () => op.aoClicar(a));
    circulo.addTo(camada);

    if (a.tipo === 'raio' || !a.local) return;
    poligonoDoLugar(a.local, a.lugar).then((geo) => {
      if (!geo || (op.vivo && !op.vivo()) || !camada.hasLayer(circulo)) return;
      const forma = L.geoJSON(geo, { style: () => estilo });
      forma.bindTooltip(textoDaArea(a), { sticky: true, className: 'area-dica' });
      if (op.aoClicar) forma.on('click', () => op.aoClicar(a));
      camada.removeLayer(circulo);
      forma.addTo(camada);
    });
  });
}
