import React from 'react';
import { Star } from 'lucide-react';

/**
 * Selo da nota do Google.
 *
 * A nota estava como texto solto e exigia leitura para virar julgamento. Como
 * selo colorido, a qualidade do lead se lê de relance na lista inteira.
 *
 * O fundo é pastel e a tinta é escura, que é a regra do sistema para esse tipo
 * de selo. Fundo saturado fica reservado para estado que o usuário escolhe,
 * como o filtro do sinal brasileiro.
 */

const FAIXAS = [
  { minimo: 4.5, classe: 'boa' },
  { minimo: 4.0, classe: 'media' },
  { minimo: 0, classe: 'baixa' },
];

function numero(valor) {
  const n = Number(String(valor ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function SeloNota({ nota, avaliacoes, size = 'md' }) {
  const n = numero(nota);
  if (n === null) {
    return (
      <span className={`selo-nota selo-nota-sem selo-nota-${size}`} title="Sem avaliação no Google">
        sem nota
      </span>
    );
  }

  const faixa = FAIXAS.find((f) => n >= f.minimo) || FAIXAS[FAIXAS.length - 1];
  const total = Number(avaliacoes) || 0;

  return (
    <span
      className={`selo-nota selo-nota-${faixa.classe} selo-nota-${size}`}
      title={total ? `${n.toFixed(1)} de 5, em ${total} avaliações` : `${n.toFixed(1)} de 5`}
    >
      <Star size={size === 'sm' ? 11 : 12} strokeWidth={0} fill="currentColor" aria-hidden="true" />
      {n.toFixed(1).replace('.', ',')}
      {total > 0 && <small>{total}</small>}
    </span>
  );
}
