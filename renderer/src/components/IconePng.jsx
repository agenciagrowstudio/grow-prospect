import React from 'react';

/**
 * Ícone vindo de um PNG do usuário, pintável.
 *
 * Os PNGs novos são pretos de traço fino. Usá-los como máscara faz o desenho
 * herdar `color`, então o mesmo arquivo serve preto quando o lead tem o canal,
 * cinza claro quando não tem e branco sobre o selo vermelho. Só o "G" do
 * Google é colorido de verdade e entra como imagem comum.
 */
export default function IconePng({ src, size = 16, className = '', ...resto }) {
  return (
    <span
      className={`icone-png ${className}`}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
      }}
      {...resto}
    />
  );
}

export function ImagemPng({ src, size = 16, className = '' }) {
  return <img className={`imagem-png ${className}`} src={src} width={size} height={size} alt="" aria-hidden="true" draggable={false} />;
}
