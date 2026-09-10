import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Mapa de prévia do assistente de extração.
 *
 * Serve para conferir o lugar antes de gastar uma extração: o usuário escolhe
 * a cidade e vê para onde o app entendeu que deve olhar. Não é obrigatório para
 * extrair. Se a geocodificação falhar, o assistente segue funcionando e o mapa
 * apenas avisa em voz baixa.
 */

/**
 * Um registro proprio, pequeno, em vez de importar utils/paises: aquele e
 * modulo do processo principal e traz coisa que a interface nao usa. O que o
 * mapa precisa e so filtro do Nominatim, sufixo de busca e enquadramento.
 */
const PAISES_MAPA = {
  BR: { nominatim: 'br', sufixo: 'Brasil', centro: [-14.235, -51.925], zoom: 3.6, zoomEstado: 6, zoomCidade: 11 },
  US: { nominatim: 'us', sufixo: 'USA', centro: [39.8, -98.6], zoom: 3.4, zoomEstado: 6, zoomCidade: 11 },
};

function paisDoMapa(sigla) {
  return PAISES_MAPA[String(sigla || 'BR').toUpperCase()] || PAISES_MAPA.BR;
}

// O Leaflet usa imagens do pacote para o marcador padrão, e o bundler quebra
// esses caminhos. O resto do app resolve com divIcon, então seguimos igual.
const ICONE_ALVO = L.divIcon({
  className: '',
  html: '<div class="prv-pin"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const CHAVE_CACHE = 'grow_geocache';
const TETO_CACHE = 300;

function normalizaConsulta(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function leCache() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_CACHE) || '{}');
    return bruto && typeof bruto === 'object' ? bruto : {};
  } catch {
    return {};
  }
}

function gravaCache(chave, valor) {
  try {
    const cache = leCache();
    cache[chave] = valor;
    // O cache mora no localStorage, que tem cota apertada. Guardamos só
    // coordenada e rótulo, e cortamos as entradas mais antigas no teto.
    const chaves = Object.keys(cache);
    if (chaves.length > TETO_CACHE) {
      chaves.slice(0, chaves.length - TETO_CACHE).forEach((k) => delete cache[k]);
    }
    localStorage.setItem(CHAVE_CACHE, JSON.stringify(cache));
  } catch {
    // Cota cheia ou armazenamento bloqueado. O mapa funciona sem cache.
  }
}

/**
 * A política de uso do Nominatim pede no máximo uma consulta por segundo.
 * Adicionar três bairros em sequência dispararia três chamadas juntas, então
 * elas passam por esta fila, que espaça uma da outra.
 */
let ultimaChamada = 0;
let correnteFila = Promise.resolve();

function enfileira(tarefa) {
  const proxima = correnteFila.then(async () => {
    const espera = Math.max(0, 1100 - (Date.now() - ultimaChamada));
    if (espera > 0) await new Promise((ok) => setTimeout(ok, espera));
    ultimaChamada = Date.now();
    return tarefa();
  });
  // Um erro em uma tarefa não pode travar a fila para as seguintes.
  correnteFila = proxima.catch(() => {});
  return proxima;
}

async function geocodifica(consulta, sinal, codigoPais = 'br') {
  const base = normalizaConsulta(consulta);
  if (!base) return null;
  // O pais entra na chave: Springfield existe no Brasil e nos Estados
  // Unidos, e sem isso o cache de um responderia pelo outro.
  const chave = `${codigoPais}|${base}`;

  const cache = leCache();
  if (cache[chave]) return cache[chave];

  const resposta = await enfileira(() => fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=${codigoPais}&q=${encodeURIComponent(consulta)}`,
    { headers: { Accept: 'application/json' }, signal: sinal },
  ));

  if (!resposta.ok) throw new Error(`Serviço de mapas indisponível (${resposta.status}).`);
  const dados = await resposta.json();
  if (!Array.isArray(dados) || dados.length === 0) return null;

  const primeiro = dados[0];
  const lat = Number(primeiro.lat);
  const lng = Number(primeiro.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const achado = {
    lat,
    lng,
    rotulo: String(primeiro.display_name || '').split(',').slice(0, 3).join(',').trim(),
  };
  gravaCache(chave, achado);
  return achado;
}

export default function MapaPreviaLocal({ pais = 'BR', local, textoLivre, bairros = [] }) {
  const info = paisDoMapa(pais);
  const containerRef = useRef(null);
  const mapaRef = useRef(null);
  const camadaRef = useRef(null);
  const [situacao, setSituacao] = useState('vazio');
  const [rotulo, setRotulo] = useState('');

  // Monta o Leaflet uma vez. O modal só renderiza este componente quando a
  // etapa da localização está na tela, então não há mapa oculto rodando.
  useEffect(() => {
    if (!containerRef.current || mapaRef.current) return undefined;

    const mapa = L.map(containerRef.current, {
      center: info.centro,
      zoom: info.zoom,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: 'abc',
    }).addTo(mapa);

    camadaRef.current = L.layerGroup().addTo(mapa);
    mapaRef.current = mapa;

    // O container acabou de entrar no layout do modal; sem isto o Leaflet
    // calcula o tamanho errado e as tiles saem cortadas.
    const relogio = window.setTimeout(() => {
      if (mapaRef.current !== mapa) return;
      try { mapa.invalidateSize(); } catch {}
    }, 60);

    return () => {
      window.clearTimeout(relogio);
      try { mapa.remove(); } catch {}
      mapaRef.current = null;
      camadaRef.current = null;
    };
  }, []);

  // Reage à escolha do usuário: cidade, estado ou lista de bairros.
  useEffect(() => {
    const mapa = mapaRef.current;
    const camada = camadaRef.current;
    if (!mapa || !camada) return undefined;

    const nomeLocal = local ? local.n : (textoLivre || '').trim();
    if (!nomeLocal) {
      camada.clearLayers();
      setSituacao('vazio');
      setRotulo('');
      mapa.flyTo(info.centro, info.zoom, { duration: 0.6 });
      return undefined;
    }

    const contexto = local && !local.estado ? `${local.n}, ${local.uf}` : nomeLocal;
    const nomesBairros = bairros.filter((b) => String(b).trim());

    const alvos = nomesBairros.length > 0
      ? nomesBairros.map((b) => ({ consulta: `${b}, ${contexto}, ${info.sufixo}`, titulo: b }))
      : [{ consulta: `${nomeLocal}, ${info.sufixo}`, titulo: nomeLocal }];

    const controlador = new AbortController();
    let cancelado = false;
    setSituacao('buscando');

    // Espera o usuário parar de digitar antes de consultar o serviço externo.
    const relogio = window.setTimeout(async () => {
      try {
        const achados = [];
        for (const alvo of alvos) {
          const achado = await geocodifica(alvo.consulta, controlador.signal, info.nominatim);
          if (cancelado) return;
          if (achado) achados.push({ ...achado, titulo: alvo.titulo });
        }
        if (cancelado) return;

        camada.clearLayers();

        if (achados.length === 0) {
          setSituacao('nao-encontrado');
          setRotulo('');
          return;
        }

        achados.forEach((a) => {
          L.marker([a.lat, a.lng], { icon: ICONE_ALVO, title: a.titulo })
            .addTo(camada)
            .bindTooltip(a.titulo, { direction: 'top', offset: [0, -14] });
        });

        if (achados.length === 1) {
          // Bairro pede aproximação; cidade mostra o contorno; estado precisa
          // de distância para caber na tela.
          const zoom = nomesBairros.length > 0 ? 14 : (local?.estado ? info.zoomEstado : info.zoomCidade);
          mapa.flyTo([achados[0].lat, achados[0].lng], zoom, { duration: 0.9 });
        } else {
          const limites = L.latLngBounds(achados.map((a) => [a.lat, a.lng]));
          mapa.flyToBounds(limites, { padding: [28, 28], maxZoom: 13, duration: 0.9 });
        }

        setSituacao('ok');
        setRotulo(achados.length === 1 ? achados[0].rotulo : `${achados.length} bairros no mapa`);
      } catch (erro) {
        if (cancelado || erro?.name === 'AbortError') return;
        setSituacao('erro');
        setRotulo(erro?.message || 'Não foi possível carregar o mapa agora.');
      }
    }, 450);

    return () => {
      cancelado = true;
      controlador.abort();
      window.clearTimeout(relogio);
    };
  }, [pais, local, textoLivre, bairros.join('|')]);

  const mensagens = {
    vazio: pais === 'US' ? 'Escolha a cidade americana para ver no mapa.' : 'Escolha a cidade para ver no mapa.',
    buscando: 'Localizando no mapa...',
    ok: rotulo,
    'nao-encontrado': 'Não localizei esse lugar no mapa. A extração funciona mesmo assim.',
    erro: rotulo || 'Não foi possível carregar o mapa agora.',
  };

  return (
    <div className="prv-mapa-bloco">
      <div className="prv-mapa" ref={containerRef} role="img" aria-label="Prévia do local escolhido" />
      <div className={`prv-mapa-legenda prv-${situacao}`}>{mensagens[situacao]}</div>
    </div>
  );
}
