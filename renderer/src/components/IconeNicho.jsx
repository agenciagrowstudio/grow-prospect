import React from 'react';
import { iconeDoNicho } from '../iconesNicho';

/**
 * Selo com o ícone do nicho, para listas de categoria.
 *
 * Substitui o ponto colorido, que era só decoração: todos os pontos tinham a
 * mesma cor e não diziam nada. O ícone diz.
 */
export default function IconeNicho({ categoria, size = 26, className = '' }) {
  const { Icone, tom } = iconeDoNicho(categoria);
  return (
    <span
      className={`nicho-chip ${className}`}
      style={{ background: tom, width: size, height: size }}
      title={categoria || 'Sem categoria'}
      aria-hidden="true"
    >
      <Icone size={Math.round(size * 0.55)} strokeWidth={1.5} />
    </span>
  );
}
