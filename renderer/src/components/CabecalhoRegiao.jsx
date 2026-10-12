import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Thermometer, Snowflake, MapPin, CircleHelp, X } from 'lucide-react';
import IconePng from './IconePng';
import Bandeira from './Bandeira';
import { ICONES } from '../assets/icones';
import { PUBLICOS_RESULTADO } from '../resultados';

/**
 * Banner da lista: foto da cidade, nome, quantos leads e quantos estão
 * quentes, mornos e frios no recorte atual.
 *
 * A foto vem da Wikipédia (ver utils/imagem-cidade.js). Sem foto, o fundo
 * vira o mapa da região com os leads pintados pela temperatura, que também
 * dá contexto de relance.
 */

const COR = { quente: '#C32824', morno: '#FF9D00', frio: '#0E6BEC' };

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

const IconeQuente = () => <IconePng src={ICONES.quente} size={13} />;
const IconeMorno = () => <Thermometer size={12} strokeWidth={2} aria-hidden="true" />;
const IconeFrio = () => <Snowflake size={12} strokeWidth={2} aria-hidden="true" />;
const TEMPERATURAS = [
  { id: 'quente', nome: 'Quentes', dica: 'abordar agora', Icone: IconeQuente },
  { id: 'morno', nome: 'Mornos', dica: 'nutrir', Icone: IconeMorno },
  { id: 'frio', nome: 'Frios', dica: 'baixa prioridade', Icone: IconeFrio },
];

export default function CabecalhoRegiao({
  titulo, cidadeFoto, uf, pais, subtitulo, total, resumo, publicos = {}, pontos,
  filtroTemp = '', filtroPublico = '', onFiltroTemp, onFiltroPublico,
}) {
  // Chips de público só onde há leads dos EUA: no Brasil todo mundo é brasileiro.
  const chipsPublico = PUBLICOS_RESULTADO.filter((p) => p.id !== 'br' && publicos[p.id]);
  const filtrando = Boolean(filtroTemp || filtroPublico);
  // Foto só quando o recorte é uma cidade; "Várias cidades" fica com o mapa.
  const imagem = useImagemCidade(cidadeFoto ?? titulo, uf, pais);
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
        <span className="cr-total">
          {total} lead{total === 1 ? '' : 's'} {filtrando ? 'no filtro' : 'no recorte'}
          {filtrando && (
            <button
              type="button"
              className="cr-limpar"
              onClick={() => { if (filtroTemp) onFiltroTemp?.(filtroTemp); if (filtroPublico) onFiltroPublico?.(filtroPublico); }}
            >
              <X size={11} strokeWidth={2.4} aria-hidden="true" /> Ver todos
            </button>
          )}
        </span>
      </div>

      <div className={`cr-temps${filtrando ? ' filtrando' : ''}`} role="group" aria-label="Filtrar a lista">
        {TEMPERATURAS.map(({ id, nome, dica, Icone }) => (
          <button
            key={id}
            type="button"
            className={`cr-temp cr-temp-${id}${filtroTemp === id ? ' on' : ''}`}
            title={filtroTemp === id ? `Mostrando só ${nome.toLowerCase()}. Clique para ver todos` : `${nome}: ${dica}. Clique para ver só eles`}
            aria-pressed={filtroTemp === id}
            disabled={!resumo[id] && filtroTemp !== id}
            onClick={() => onFiltroTemp?.(id)}
          >
            <Icone /> {resumo[id]}
          </button>
        ))}
        {chipsPublico.length > 0 && <span className="cr-sep" aria-hidden="true" />}
        {chipsPublico.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`cr-temp cr-pub cr-pub-${p.id}${filtroPublico === p.id ? ' on' : ''}`}
            title={filtroPublico === p.id ? `Mostrando só ${p.nome.toLowerCase()}. Clique para ver todos` : `${p.nome}. Clique para ver só eles`}
            aria-pressed={filtroPublico === p.id}
            onClick={() => onFiltroPublico?.(p.id)}
          >
            {p.bandeira ? <Bandeira pais={p.bandeira} /> : <CircleHelp size={12} strokeWidth={2.2} aria-hidden="true" />}
            {publicos[p.id]}
          </button>
        ))}
      </div>

      {comFoto && <span className="cr-credito" title={imagem.artigo}>Foto: {imagem.fonte}</span>}
    </div>
  );
}
