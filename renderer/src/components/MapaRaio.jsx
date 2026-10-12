import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MousePointerClick } from 'lucide-react';
import { desenhaAreas } from './camadaAreas';

/**
 * Prévia do "onde" da extração: o ponto escolhido e, com raio, o círculo que
 * a busca vai cobrir. Sem local escolhido, mostra Brasil e EUA juntos, que é
 * o alcance da prospecção.
 *
 * Clicar no mapa também escolhe o local: de longe escolhe a cidade, de perto
 * (zoom ZOOM_BAIRRO ou mais) escolhe o bairro.
 */

const VISTA_INICIAL = { centro: [8, -70], zoom: 2 };
const COR = '#0E6BEC';
export const ZOOM_BAIRRO = 13;

export default function MapaRaio({ local, raioKm, onClique, areas = [], contorno = null }) {
  const ref = useRef(null);
  const mapa = useRef(null);
  const camada = useRef(null);
  const camadaAreas = useRef(null);
  const cliqueRef = useRef(onClique);
  const [zoom, setZoom] = useState(VISTA_INICIAL.zoom);
  cliqueRef.current = onClique;

  useEffect(() => {
    if (!ref.current || mapa.current) return undefined;
    mapa.current = L.map(ref.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: true })
      .setView(VISTA_INICIAL.centro, VISTA_INICIAL.zoom);
    // Zoom à direita: a esquerda é da dica de clique.
    L.control.zoom({ position: 'topright' }).addTo(mapa.current);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(mapa.current);
    camadaAreas.current = L.layerGroup().addTo(mapa.current);
    camada.current = L.layerGroup().addTo(mapa.current);
    mapa.current.on('zoomend', () => setZoom(mapa.current.getZoom()));
    mapa.current.on('click', (e) => {
      cliqueRef.current?.(e.latlng.lat, e.latlng.lng, mapa.current.getZoom() >= ZOOM_BAIRRO ? 'bairro' : 'cidade');
    });
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
    if (contorno) {
      // A cidade inteira, tracejada: é exatamente o que a extração vai cobrir.
      const forma = L.geoJSON(contorno, {
        style: () => ({ color: '#111827', weight: 2, dashArray: '6 5', fillColor: '#111827', fillOpacity: 0.04 }),
        interactive: false,
      }).addTo(camada.current);
      L.circleMarker(ponto, { radius: 6, weight: 3, color: '#fff', fillColor: COR, fillOpacity: 1 }).addTo(camada.current);
      try { m.fitBounds(forma.getBounds(), { padding: [18, 18], maxZoom: 13 }); } catch { /* contorno vazio */ }
      return;
    }
    L.circleMarker(ponto, { radius: 7, weight: 3, color: '#fff', fillColor: COR, fillOpacity: 1 }).addTo(camada.current);
    if (raioKm) {
      const circulo = L.circle(ponto, {
        radius: raioKm * 1000, color: COR, weight: 2, fillColor: COR, fillOpacity: 0.1, dashArray: '6 6',
      }).addTo(camada.current);
      m.fitBounds(circulo.getBounds(), { padding: [16, 16] });
    } else {
      m.setView(ponto, local.tipo === 'estado' ? 6 : local.tipo === 'cidade' ? 11 : 13);
    }
  }, [local, raioKm, contorno]);

  // Já extraído para este nicho: pintado de azul, para escolher a próxima cidade fora dele.
  useEffect(() => {
    if (!camadaAreas.current) return undefined;
    let vivo = true;
    desenhaAreas(camadaAreas.current, areas, { vivo: () => vivo });
    return () => { vivo = false; };
  }, [areas]);

  return (
    <div className="mapa-raio">
      <div ref={ref} className="mapa-raio-tela" aria-label="Mapa: clique para escolher a cidade ou o bairro" />
      {onClique && (
        <span className="mapa-raio-dica">
          <MousePointerClick size={14} strokeWidth={2} aria-hidden="true" />
          {zoom >= ZOOM_BAIRRO ? 'Clique para escolher o bairro' : 'Clique para escolher a cidade'}
        </span>
      )}
    </div>
  );
}
