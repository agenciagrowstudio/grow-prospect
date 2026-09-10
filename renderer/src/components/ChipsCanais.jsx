import React from 'react';
import { MessageCircle, Globe, Instagram, Facebook, Mail, Phone } from 'lucide-react';

/**
 * Chips dos canais de contato que o lead tem.
 *
 * Para prospecção essa é a informação que decide a ordem de trabalho: um lead
 * com WhatsApp vale mais tempo hoje do que um que só tem endereço. Antes isso
 * estava espalhado em colunas da tabela e não aparecia no card nenhum.
 *
 * A ordem da lista é a ordem de utilidade, não alfabética: WhatsApp primeiro,
 * endereço de rua por último.
 */

const CANAIS = [
  { id: 'whatsapp', rotulo: 'WhatsApp', Icone: MessageCircle, tem: (l) => Boolean(l.whatsapp || l.phone || l.tel) },
  { id: 'site', rotulo: 'Site', Icone: Globe, tem: (l) => Boolean(l.website || l.site) },
  { id: 'instagram', rotulo: 'Instagram', Icone: Instagram, tem: (l) => Boolean(l.instagram || l.ig) },
  { id: 'facebook', rotulo: 'Facebook', Icone: Facebook, tem: (l) => Boolean(l.facebook || l.fb) },
  { id: 'email', rotulo: 'E-mail', Icone: Mail, tem: (l) => Boolean(l.email || l.mail) },
];

export default function ChipsCanais({ lead, limite = 3, className = '' }) {
  if (!lead) return null;

  const presentes = CANAIS.filter((c) => c.tem(lead));
  if (presentes.length === 0) {
    return (
      <span className={`chips-canais ${className}`}>
        <span className="chip-canal chip-canal-vazio" title="Nenhum canal de contato encontrado">
          <Phone size={11} strokeWidth={1.5} aria-hidden="true" />
          sem contato
        </span>
      </span>
    );
  }

  const mostrados = presentes.slice(0, limite);
  const escondidos = presentes.slice(limite);

  return (
    <span className={`chips-canais ${className}`}>
      {mostrados.map(({ id, rotulo, Icone }) => (
        <span key={id} className="chip-canal" title={rotulo}>
          <Icone size={11} strokeWidth={1.5} aria-hidden="true" />
          {rotulo}
        </span>
      ))}
      {escondidos.length > 0 && (
        <span className="chip-canal chip-canal-mais" title={escondidos.map((c) => c.rotulo).join(', ')}>
          +{escondidos.length}
        </span>
      )}
    </span>
  );
}
