import React from 'react';
import { CalendarCheck, Store, Megaphone, Clapperboard, Lightbulb } from 'lucide-react';
import IconePng from './IconePng';
import { ICONES } from '../assets/icones';

/**
 * Ícones dos serviços que a Grow+ oferece. Os mesmos da extração (card do
 * lead) e das oportunidades da análise, para o serviço ter uma cara só.
 */
const IconeSiteServico = ({ size }) => <IconePng src={ICONES.site} size={size + 3} />;

export const ICONE_SERVICO = {
  site: IconeSiteServico,
  sistema: CalendarCheck,
  google: Store,
  redes: Megaphone,
  conteudo: Clapperboard,
  outro: Lightbulb,
};

// Ordem importa: "botão de WhatsApp no site" é site, "conteúdo no Instagram" é conteúdo.
const REGRAS = [
  ['sistema', /sistema|agenda|agendamento|pedido|reserva|booking/i],
  ['conteudo', /conte[uú]do|post|v[ií]deo|reels|content/i],
  ['google', /google|avalia|reputa|review/i],
  ['redes', /rede|instagram|social|tr[aá]fego|an[uú]ncio|pixel|ads\b|facebook|tiktok/i],
  ['site', /site|https|velocidade|m[oó]ve|celular|responsiv|cta|landing|website|seo|bot[aã]o|whatsapp/i],
];

/** Serviço (id) que resolve a oportunidade escrita pela análise. */
export function servicoDaOportunidade(texto) {
  const t = String(texto || '');
  const achado = REGRAS.find(([, re]) => re.test(t));
  return achado ? achado[0] : 'outro';
}

/** Chip de oportunidade com o ícone e a cor do serviço. */
export function ChipOportunidade({ texto, className = 'sc-opp' }) {
  const id = servicoDaOportunidade(texto);
  const Icone = ICONE_SERVICO[id];
  return (
    <span className={`${className} cl-servico-${id}`} title={texto}>
      <span className="cl-ic sc-opp-ic" aria-hidden="true"><Icone size={11} strokeWidth={2.2} /></span>
      <span className="sc-opp-txt">{texto}</span>
    </span>
  );
}
