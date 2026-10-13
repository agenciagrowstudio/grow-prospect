import React from 'react';
import IconeIA from './IconeIA';

/** Selo "IA": o lead foi analisado pela IA (leu o site, decidiu o público, sugeriu o serviço). */
export default function SeloIA({ ia }) {
  const dica = ia
    ? `Analisado pela IA${ia.leuSite ? ', com o site lido' : ''}${ia.motivo ? `: ${ia.motivo}` : ''}`
    : 'Analisado pela IA';
  return (
    <span className="selo-ia" title={dica} aria-label="Analisado pela IA">
      <IconeIA size={15} />
    </span>
  );
}
