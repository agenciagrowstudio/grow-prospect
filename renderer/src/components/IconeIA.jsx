import React from 'react';

/**
 * Ícone de IA da Grow+: quadrado com "IA" e três estrelas cheias, recriado
 * do desenho do usuário. (O que não se usa é a estrela da Lucide, só contorno
 * e roxa.) Herda a cor do texto, como os ícones da Lucide.
 */
export default function IconeIA({ size = 16, className = '', titulo }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={`icone-ia ${className}`.trim()}
      role={titulo ? 'img' : undefined}
      aria-hidden={titulo ? undefined : 'true'}
      aria-label={titulo}
    >
      {/* Quadrado, aberto no canto onde ficam as estrelas */}
      <path d="M13 9H7a4 4 0 0 0-4 4v10a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4v-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Letras "IA" */}
      <rect x="6.8" y="13.5" width="2.3" height="9" rx="0.4" fill="currentColor" />
      <path fillRule="evenodd" d="M10.6 22.5 13.4 13.5h1.8L18 22.5h-2.1l-.5-1.7h-2.2l-.5 1.7Zm3.1-3.5h1.2l-.6-2.1Z" fill="currentColor" />
      {/* Estrelas cheias: grande no canto, média à direita, pequena em cima */}
      <path d="M21 1.5Q22.6 7.4 28.5 9 22.6 10.6 21 16.5 19.4 10.6 13.5 9 19.4 7.4 21 1.5Z" fill="currentColor" />
      <path d="M28 11.9Q28.8 14.7 31.6 15.5 28.8 16.3 28 19.1 27.2 16.3 24.4 15.5 27.2 14.7 28 11.9Z" fill="currentColor" />
      <path d="M28 2.1Q28.5 4 30.4 4.5 28.5 5 28 6.9 27.5 5 25.6 4.5 27.5 4 28 2.1Z" fill="currentColor" />
    </svg>
  );
}
