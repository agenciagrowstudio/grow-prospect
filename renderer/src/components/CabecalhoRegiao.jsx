import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Flame, Thermometer, Snowflake, MapPin } from 'lucide-react';

/**
 * Banner da lista: foto da cidade, nome, quantos leads e quantos estão
 * quentes, mornos e frios no recorte atual.
 *
 * A foto vem da Wikipédia (ver utils/imagem-cidade.js). Sem foto, o fundo
 * vira o mapa da região com os leads pintados pela temperatura, que também
 * dá contexto de relance.
 */

const COR = { quente: '#C32824', morno: '#FF8500', frio: '#0E6BEC' };

function MapaDeFundo({ pontos }) {
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
    const ordem = { frio: 0, morno: 1, quente: 2 };
    [...pontos].sort((a, b) => ordem[a.temp] - ordem[b.temp]).forEach((p) => {
      L.circleMarker([p.lat, p.lng], {
        radius: 3.5, weight: 1, color: '#ffffff', fillColor: COR[p.temp], fillOpacity: 0.95,
      }).addTo(camada.current);
    });
    mapa.current.fitBounds(L.latLngBounds(pontos.map((p) => [p.lat, p.lng])), { padding: [12, 12], maxZoom: 13 });
  }, [pontos]);

  return <div ref={ref} className="cr-fundo-mapa" aria-hidden="true" />;
}

function useImagemCidade(cidade, uf, pais) {
  const [imagem, setImagem] = useState(null);
  useEffect(() => {
    let vivo = true;
    setImagem(null);
    if (!cidade || !window.electronAPI?.imagemCidade) return undefined;
    window.electronAPI.imagemCidade(cidade, uf, pais).then((r) => {
      if (vivo && r?.success && r.imagem?.url) setImagem(r.imagem);
    }).catch(() => {});
    return () => { vivo = false; };
  }, [cidade, uf, pais]);
  return imagem;
}

export default function CabecalhoRegiao({ titulo, uf, pais, subtitulo, total, resumo, pontos }) {
  const imagem = useImagemCidade(titulo, uf, pais);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => setFalhou(false), [imagem?.url]);
  const comFoto = imagem?.url && !falhou;

  return (
    <div className={`cr-banner${comFoto ? ' com-foto' : ''}`}>
      {comFoto ? (
        <img className="cr-foto" src={imagem.url} alt="" referrerPolicy="no-referrer" onError={() => setFalhou(true)} />
      ) : (
        <MapaDeFundo pontos={pontos} />
      )}
      <div className="cr-veu" aria-hidden="true" />

      <div className="cr-conteudo">
        <span className="cr-rotulo"><MapPin size={11} strokeWidth={2} aria-hidden="true" /> {subtitulo}</span>
        <h2 className="cr-titulo">{titulo || 'Todos os leads'}</h2>
        <span className="cr-total">{total} lead{total === 1 ? '' : 's'} no recorte</span>
      </div>

      <div className="cr-temps">
        <span className="cr-temp cr-temp-quente" title="Quentes: abordar agora">
          <Flame size={12} strokeWidth={2} aria-hidden="true" /> {resumo.quente}
        </span>
        <span className="cr-temp cr-temp-morno" title="Mornos: nutrir">
          <Thermometer size={12} strokeWidth={2} aria-hidden="true" /> {resumo.morno}
        </span>
        <span className="cr-temp cr-temp-frio" title="Frios: baixa prioridade">
          <Snowflake size={12} strokeWidth={2} aria-hidden="true" /> {resumo.frio}
        </span>
      </div>

      {comFoto && <span className="cr-credito" title={imagem.artigo}>Foto: {imagem.fonte}</span>}
    </div>
  );
}
