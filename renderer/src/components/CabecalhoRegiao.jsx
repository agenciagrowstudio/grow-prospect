import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Flame, Thermometer, Snowflake } from 'lucide-react';

/**
 * Cabeçalho da lista: mini mapa da região, nome da cidade e quantos leads
 * estão quentes, mornos e frios no recorte atual.
 *
 * O mini mapa não é para navegar (o mapa grande ao lado faz isso). Ele dá
 * contexto de relance: onde estão os leads e onde se concentram os quentes.
 */

const COR = { quente: '#C32824', morno: '#FF8500', frio: '#0E6BEC' };

function MiniMapa({ pontos }) {
  const ref = useRef(null);
  const mapa = useRef(null);
  const camada = useRef(null);

  useEffect(() => {
    if (!ref.current || mapa.current) return undefined;
    mapa.current = L.map(ref.current, {
      zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(mapa.current);
    camada.current = L.layerGroup().addTo(mapa.current);
    return () => {
      mapa.current?.remove();
      mapa.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapa.current || !camada.current) return;
    camada.current.clearLayers();
    if (!pontos.length) {
      mapa.current.setView([0, 0], 1);
      return;
    }
    // Frios embaixo, quentes por cima: o que importa fica visível.
    const ordem = { frio: 0, morno: 1, quente: 2 };
    [...pontos].sort((a, b) => ordem[a.temp] - ordem[b.temp]).forEach((p) => {
      L.circleMarker([p.lat, p.lng], {
        radius: 3.5, weight: 1, color: '#ffffff', fillColor: COR[p.temp], fillOpacity: 0.95,
      }).addTo(camada.current);
    });
    mapa.current.fitBounds(L.latLngBounds(pontos.map((p) => [p.lat, p.lng])), { padding: [8, 8], maxZoom: 13 });
  }, [pontos]);

  return <div ref={ref} className="cr-mapa" aria-hidden="true" />;
}

export default function CabecalhoRegiao({ titulo, subtitulo, total, resumo, pontos }) {
  return (
    <div className="cr-cabecalho">
      <MiniMapa pontos={pontos} />
      <div className="cr-texto">
        <h2 className="cr-titulo">{titulo || 'Todos os leads'}</h2>
        <span className="cr-sub">{subtitulo} · {total} lead{total === 1 ? '' : 's'}</span>
        <div className="cr-temps">
          <span className="cr-temp cr-temp-quente" title="Quentes: abordar agora">
            <Flame size={12} strokeWidth={2} aria-hidden="true" /> {resumo.quente} <small>quentes</small>
          </span>
          <span className="cr-temp cr-temp-morno" title="Mornos: nutrir">
            <Thermometer size={12} strokeWidth={2} aria-hidden="true" /> {resumo.morno} <small>mornos</small>
          </span>
          <span className="cr-temp cr-temp-frio" title="Frios: baixa prioridade">
            <Snowflake size={12} strokeWidth={2} aria-hidden="true" /> {resumo.frio} <small>frios</small>
          </span>
        </div>
      </div>
    </div>
  );
}
