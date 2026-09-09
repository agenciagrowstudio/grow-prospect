import React from 'react';
import {
  dedupeLeads,
  getExtractionSearches,
  getSearchLeadCount,
  normalizeLeadCollection,
  readLocalArray,
  searchTimestamp,
} from '../leadData';

/**
 * Lê as extrações reais e devolve {ts, count} por extração.
 * Fica aqui para as três telas usarem exatamente a mesma origem de dado.
 */
export function lerExtracoes() {
  const leads = dedupeLeads(normalizeLeadCollection(readLocalArray('sigma_leads')));
  const buscas = getExtractionSearches(readLocalArray('sigma_searches'));
  return buscas
    .map((busca) => ({ ts: searchTimestamp(busca), count: getSearchLeadCount(leads, busca.id) }))
    .filter((e) => e.ts > 0);
}

/** Monta a série diária dos últimos N dias a partir das extrações. */
export function construirSerie(extracoes = [], dias = 30) {
  const fim = new Date();
  fim.setHours(23, 59, 59, 999);

  const balde = new Map();
  for (let i = dias - 1; i >= 0; i -= 1) {
    const d = new Date(fim);
    d.setDate(d.getDate() - i);
    balde.set(d.toISOString().slice(0, 10), 0);
  }

  extracoes.forEach((e) => {
    const chave = new Date(e.ts).toISOString().slice(0, 10);
    if (balde.has(chave)) balde.set(chave, balde.get(chave) + e.count);
  });

  return [...balde.entries()].map(([iso, valor]) => {
    const d = new Date(`${iso}T12:00:00`);
    return {
      iso,
      valor,
      rotulo: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      rotuloLongo: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }),
    };
  });
}

/**
 * Variação entre a metade recente e a anterior da série.
 * Devolve null quando não há base de comparação: é melhor não mostrar nada
 * do que exibir um percentual que não significa coisa alguma.
 */
export function variacaoSerie(serie = []) {
  if (serie.length < 4) return null;
  const meio = Math.floor(serie.length / 2);
  const soma = (arr) => arr.reduce((t, p) => t + p.valor, 0);
  const recente = soma(serie.slice(meio));
  const anterior = soma(serie.slice(0, meio));
  if (!anterior) return recente > 0 ? 100 : null;
  return Math.round(((recente - anterior) / anterior) * 100);
}

export function totalSerie(serie = []) {
  return serie.reduce((t, p) => t + p.valor, 0);
}

/**
 * Gráfico de área em SVG puro, sem biblioteca.
 * A curva é suavizada por bezier com ponto de controle no meio de cada
 * segmento. A grade é só horizontal e tracejada: linha vertical competiria
 * com a própria série, que é o que o olho precisa seguir.
 */
export default function GraficoArea({ pontos = [], foco, onFoco, id = 'gr' }) {
  const L = 720;
  const A = 190;
  const padL = 38;
  const padR = 12;
  const padT = 14;
  const padB = 26;

  // Arredonda o topo para múltiplo de 4, senão os cinco rótulos do eixo
  // colidem quando o máximo é pequeno (saía 1, 1, 1, 0, 0).
  const pico = Math.max(0, ...pontos.map((p) => p.valor));
  const max = Math.max(4, Math.ceil(pico / 4) * 4);

  const passoX = pontos.length > 1 ? (L - padL - padR) / (pontos.length - 1) : 0;
  const xy = pontos.map((p, i) => ({
    ...p,
    x: padL + i * passoX,
    y: padT + (A - padT - padB) * (1 - p.valor / max),
  }));

  const caminho = xy.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const ant = xy[i - 1];
    const meio = (ant.x + p.x) / 2;
    return `${d} C ${meio} ${ant.y}, ${meio} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const area = xy.length
    ? `${caminho} L ${xy[xy.length - 1].x} ${A - padB} L ${xy[0].x} ${A - padB} Z`
    : '';

  const linhas = [0, 0.25, 0.5, 0.75, 1];
  const alvo = foco != null && xy[foco] ? xy[foco] : null;
  const salto = Math.max(1, Math.ceil(xy.length / 6));

  function aoMover(ev) {
    if (!onFoco) return;
    const box = ev.currentTarget.getBoundingClientRect();
    const rel = ((ev.clientX - box.left) / box.width) * L;
    let melhor = 0;
    let dist = Infinity;
    xy.forEach((p, i) => {
      const d = Math.abs(p.x - rel);
      if (d < dist) { dist = d; melhor = i; }
    });
    onFoco(melhor);
  }

  return (
    <div className="gr-wrap">
      <svg
        viewBox={`0 0 ${L} ${A}`}
        className="gr-svg"
        role="img"
        aria-label="Leads captados por dia"
        onMouseMove={aoMover}
        onMouseLeave={() => onFoco && onFoco(null)}
      >
        <defs>
          <linearGradient id={`${id}Fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {linhas.map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={L - padR}
              y1={padT + (A - padT - padB) * t}
              y2={padT + (A - padT - padB) * t}
              className="gr-grade"
            />
            <text x={padL - 8} y={padT + (A - padT - padB) * t + 4} className="gr-rotulo-y">
              {Math.round(max * (1 - t))}
            </text>
          </g>
        ))}

        {area ? <path d={area} fill={`url(#${id}Fill)`} /> : null}
        {caminho ? <path d={caminho} className="gr-linha" /> : null}

        {alvo ? (
          <g>
            <line x1={alvo.x} x2={alvo.x} y1={padT} y2={A - padB} className="gr-cruz" />
            <circle cx={alvo.x} cy={alvo.y} r="5" className="gr-ponto" />
          </g>
        ) : null}
      </svg>

      <div className="gr-eixo-x">
        {xy.map((p, i) => (i % salto === 0
          ? <span key={p.iso} style={{ left: `${(p.x / L) * 100}%` }}>{p.rotulo}</span>
          : null))}
      </div>

      {alvo ? (
        <div className="gr-tooltip" style={{ left: `${(alvo.x / L) * 100}%` }}>
          <b>{alvo.rotuloLongo}</b>
          <span><i /> Leads captados <em>{alvo.valor}</em></span>
        </div>
      ) : null}
    </div>
  );
}
