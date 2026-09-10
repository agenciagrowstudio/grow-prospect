import React, { useState } from 'react';
import { iconeDoNicho } from '../iconesNicho';

/**
 * Retrato do lead na lista.
 *
 * Usa a foto que veio do Google Maps quando existe, e cai no ícone do nicho
 * quando não existe ou quando a imagem falha. A queda importa mais do que
 * parece: as URLs de foto do Google expiram, e sem o `onError` a lista ficaria
 * cheia de quadrados quebrados meses depois da extração.
 *
 * Nada é baixado para o disco. A imagem é carregada direto do endereço que a
 * ficha do Maps trouxe, então ela só aparece com internet.
 */
export default function AvatarLead({ lead, size = 44, className = '' }) {
  const [falhou, setFalhou] = useState(false);

  const foto = !falhou
    ? (lead?.photos?.thumbnail || lead?.photos?.main || lead?.thumbnail || '')
    : '';
  const categoria = lead?.category || lead?.cat || '';
  const { Icone, tom } = iconeDoNicho(categoria);

  const estilo = { width: size, height: size, borderRadius: Math.round(size * 0.27) };

  if (foto) {
    return (
      <span className={`av-lead ${className}`} style={estilo}>
        <img
          src={foto}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFalhou(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`av-lead av-lead-icone ${className}`}
      style={{ ...estilo, background: tom }}
      title={categoria || 'Sem categoria'}
    >
      <Icone size={Math.round(size * 0.45)} strokeWidth={1.5} aria-hidden="true" />
    </span>
  );
}
