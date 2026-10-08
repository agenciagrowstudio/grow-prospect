import React from 'react';
import marca from '../assets/icones/marca.png';

/**
 * Símbolo do Prospector 2.0 no topo do menu.
 *
 * É o mesmo desenho do ícone do app (alvo com três pessoas), para a marca de
 * dentro bater com a do atalho e da barra de tarefas. A imagem é a versão de
 * 128 px de assets/icon.png; trocou o ícone, gere esta de novo.
 */
export default function LogoGrow({ size = 26, className = '' }) {
  return (
    <img
      className={className}
      src={marca}
      width={size}
      height={size}
      alt="Prospector 2.0"
      draggable={false}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}
