import React from 'react';
import { Brain } from 'lucide-react';

/** Selo "IA": o lead foi analisado pela IA (leu o site, decidiu o público, sugeriu o serviço). */
export default function SeloIA({ ia }) {
  const dica = ia
    ? `Analisado pela IA${ia.leuSite ? ', com o site lido' : ''}${ia.motivo ? `: ${ia.motivo}` : ''}`
    : 'Analisado pela IA';
  return (
    <span className="selo-ia" title={dica} aria-label="Analisado pela IA">
      <Brain size={11} strokeWidth={2.2} aria-hidden="true" /> IA
    </span>
  );
}
