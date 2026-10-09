import React from 'react';
import { ROTULO_PAIS } from '../localBusca';

/**
 * Bandeira pequena do Brasil ou dos EUA. Desenho simplificado (o Lucide não
 * tem bandeiras e emoji de bandeira não aparece no Windows).
 */
const LISTRAS = [0, 2, 4, 6, 8, 10, 12];

export default function Bandeira({ pais, className = '' }) {
  const nome = ROTULO_PAIS[pais] || pais;
  return (
    <span className={`bandeira ${className}`.trim()} role="img" aria-label={nome} title={nome}>
      {pais === 'US' ? (
        <svg viewBox="0 0 26 13" preserveAspectRatio="none" aria-hidden="true">
          <rect width="26" height="13" fill="#fff" />
          {LISTRAS.map((y) => <rect key={y} y={y} width="26" height="1" fill="#B22234" />)}
          <rect width="11" height="7" fill="#3C3B6E" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 14" preserveAspectRatio="none" aria-hidden="true">
          <rect width="20" height="14" fill="#009C3B" />
          <polygon points="10,1.6 18.4,7 10,12.4 1.6,7" fill="#FFDF00" />
          <circle cx="10" cy="7" r="3.2" fill="#002776" />
        </svg>
      )}
    </span>
  );
}
