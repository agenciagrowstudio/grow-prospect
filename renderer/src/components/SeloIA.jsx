import React from 'react';
import IconeIA from './IconeIA';

/** Selo "IA": a IA escreveu o texto (gancho) da mensagem deste lead. */
export default function SeloIA({ ia }) {
  const dica = ia?.gancho
    ? `Texto escrito pela IA${ia.leuSite ? ', com o site lido' : ''}: ${ia.gancho}`
    : 'A IA leu este lead e não achou um detalhe para a mensagem';
  return (
    <span className="selo-ia" title={dica} aria-label="Texto escrito pela IA">
      <IconeIA size={15} />
    </span>
  );
}
