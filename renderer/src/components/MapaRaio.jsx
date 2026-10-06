import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Prévia do "onde" da extração: o ponto escolhido e, com raio, o círculo que
 * a busca vai cobrir. Sem local escolhido, mostra Brasil e EUA juntos, que é
 * o alcance da prospecção.
 */

const VISTA_INICIAL = { centro: [8, -70], zoom: 2 };
const COR = '#0E6BEC';

export default function MapaRaio({ local, raioKm }) {
  const ref = useRef(null);
  const mapa = useRef(null);
  const camada = useRef(null);

  useEffect(() => {
    if (!ref.current || mapa.current) return undefined;
    mapa.current = L.map(ref.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false })
      .setView(VISTA_INICIAL.centro, VISTA_INICIAL.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(mapa.current);
    camada.current = L.layerGroup().addTo(mapa.current);
    // O modal abre com animação; sem isto o Leaflet mede o tamanho errado.
    const t = setTimeout(() => mapa.current?.invalidateSize(), 250);
    return () => {
      clearTimeout(t);
      mapa.current?.remove();
      mapa.current = null;
    };
  }, []);

  useEffect(() => {
    const m = mapa.current;
    if (!m || !camada.current) return;
    camada.current.clearLayers();
    if (!local) {
      m.setView(VISTA_INICIAL.centro, VISTA_INICIAL.zoom);
      return;
    }
    const ponto = [local.lat, local.lng];
    L.circleMarker(ponto, { radius: 7, weight: 3, color: '#fff', fillColor: COR, fillOpacity: 1 }).addTo(camada.current);
    if (raioKm) {
      const circulo = L.circle(ponto, {
        radius: raioKm * 1000, color: COR, weight: 2, fillColor: COR, fillOpacity: 0.1, dashArray: '6 6',
      }).addTo(camada.current);
      m.fitBounds(circulo.getBounds(), { padding: [16, 16] });
    } else {
      m.setView(ponto, local.tipo === 'estado' ? 6 : local.tipo === 'cidade' ? 11 : 13);
    }
  }, [local, raioKm]);

  return <div ref={ref} className="mapa-raio" aria-label="Prévia do local da busca" />;
}
