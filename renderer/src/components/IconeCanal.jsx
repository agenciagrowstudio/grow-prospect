import React from 'react';
import { Mail, Phone, Handshake } from 'lucide-react';
import IconePng from './IconePng';
import { ICONES } from '../assets/icones';
import { nomeDoCanal } from '../funil';

/** Ícone do canal da abordagem: os de marca (WhatsApp, Instagram) com o logo oficial, como no card do lead. */
export default function IconeCanal({ canal, size = 14 }) {
  if (canal === 'whatsapp') return <IconePng src={ICONES.whatsapp} size={size + 2} aria-label={nomeDoCanal(canal)} />;
  if (canal === 'instagram') return <IconePng src={ICONES.instagram} size={size + 2} aria-label={nomeDoCanal(canal)} />;
  const Icone = { email: Mail, ligacao: Phone, pessoalmente: Handshake }[canal];
  return Icone ? <Icone size={size} strokeWidth={1.9} aria-label={nomeDoCanal(canal)} /> : null;
}
