import React from 'react';

/**
 * Símbolo da marca Grow+.
 *
 * O azul aqui é fixo em #0781f8 de propósito: é ativo de marca, não token de
 * interface. O acento da UI pode mudar sem que a marca mude junto.
 */
export default function LogoGrow({ size = 26, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size * (88.49 / 98.96)}
      viewBox="0 0 98.96 88.49"
      role="img"
      aria-label="Grow+"
      focusable="false"
    >
      <path
        fill="#0781f8"
        d="M0,88.38v-13.46l.09-.24c15.57-15.23,31.12-30.52,46.66-45.83-12.63.19-25.27.34-37.92.46l-.08-.07C7.03,19.9,5.33,10.56,3.65,1.2c-.02-.14.07-.22.21-.22C35.49.65,67.14.33,98.79,0c.09,0,.15.06.17.15-1.08,29.36-2.16,58.75-3.24,88.16,0,.1-.06.16-.16.18h-28.18c-.1-.06-.15-.08-.15-.08.36-12.35.75-24.71,1.19-37.07-12.65,12.39-25.3,24.77-37.96,37.14H.07s-.07-.1-.07-.1Z"
      />
    </svg>
  );
}
